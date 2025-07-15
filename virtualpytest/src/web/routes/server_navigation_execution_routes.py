"""
Server Navigation Execution Routes

This module provides API endpoints for navigation execution using the standardized
NavigationExecutor class. These endpoints can be used by:
- Frontend components (via fetch calls)
- Python scripts (via direct API calls)
- External integrations

The endpoints use the same NavigationExecutor that can be used directly in Python code.
"""

from flask import Blueprint, request, jsonify
from src.lib.navigation.navigation_execution import NavigationExecutor
from src.utils.app_utils import get_team_id

# Create blueprint
server_navigation_execution_bp = Blueprint('navigation_execution', __name__, url_prefix='/server/navigation')


@server_navigation_execution_bp.route('/execute/<tree_id>/<node_id>', methods=['POST'])
def execute_navigation(tree_id, node_id):
    """
    Execute navigation using standardized NavigationExecutor
    
    Expected JSON payload:
    {
        "host": {"host_name": "...", "device_model": "...", ...},
        "device_id": "optional_device_id",
        "team_id": "optional_team_id",
        "current_node_id": "optional_current_node",
        "image_source_url": "optional_image_source"
    }
    """
    try:
        print(f"[@route:navigation_execution:execute_navigation] Executing navigation to {node_id} in tree {tree_id}")
        
        data = request.get_json() or {}
        host = data.get('host')
        device_id = data.get('device_id')
        team_id = data.get('team_id') or get_team_id()
        current_node_id = data.get('current_node_id')
        image_source_url = data.get('image_source_url')
        
        # Validate required parameters
        if not host or not host.get('host_name'):
            return jsonify({
                'success': False,
                'error': 'Host configuration with host_name is required'
            }), 400
        
        # Use the standardized NavigationExecutor (same as Python direct calls)
        executor = NavigationExecutor(host, device_id, team_id)
        result = executor.execute_navigation(tree_id, node_id, current_node_id, image_source_url)
        
        print(f"[@route:navigation_execution:execute_navigation] Navigation result: success={result.get('success')}")
        
        return jsonify(result)
        
    except Exception as e:
        print(f"[@route:navigation_execution:execute_navigation] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Navigation execution error: {str(e)}'
        }), 500


@server_navigation_execution_bp.route('/preview/<tree_id>/<node_id>', methods=['GET'])
def get_navigation_preview_with_executor(tree_id, node_id):
    """
    Get navigation preview using NavigationExecutor (alternative to pathfinding preview)
    
    Query parameters:
    - current_node_id: optional current node for pathfinding
    - host_name: required host name for executor initialization
    - device_id: optional device ID
    - team_id: optional team ID
    """
    try:
        print(f"[@route:navigation_execution:get_navigation_preview_with_executor] Getting preview for navigation to {node_id} in tree {tree_id}")
        
        current_node_id = request.args.get('current_node_id')
        host_name = request.args.get('host_name')
        device_id = request.args.get('device_id')
        team_id = request.args.get('team_id') or get_team_id()
        
        # Validate required parameters
        if not host_name:
            return jsonify({
                'success': False,
                'error': 'host_name query parameter is required'
            }), 400
        
        # Create minimal host configuration for preview
        host = {'host_name': host_name}
        
        # Use the standardized NavigationExecutor (same as Python direct calls)
        executor = NavigationExecutor(host, device_id, team_id)
        result = executor.get_navigation_preview(tree_id, node_id, current_node_id)
        
        print(f"[@route:navigation_execution:get_navigation_preview_with_executor] Preview result: success={result.get('success')}")
        
        return jsonify(result)
        
    except Exception as e:
        print(f"[@route:navigation_execution:get_navigation_preview_with_executor] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Navigation preview error: {str(e)}'
        }), 500


@server_navigation_execution_bp.route('/batch-execute', methods=['POST'])
def batch_execute_navigation():
    """
    Execute multiple navigation operations in sequence
    
    Expected JSON payload:
    {
        "host": {"host_name": "...", "device_model": "...", ...},
        "device_id": "optional_device_id",
        "team_id": "optional_team_id",
        "navigations": [
            {
                "tree_id": "tree1",
                "target_node_id": "node1",
                "current_node_id": "optional_current"
            },
            {
                "tree_id": "tree2", 
                "target_node_id": "node2"
            }
        ]
    }
    """
    try:
        print(f"[@route:navigation_execution:batch_execute_navigation] Starting batch navigation execution")
        
        data = request.get_json() or {}
        host = data.get('host')
        device_id = data.get('device_id')
        team_id = data.get('team_id') or get_team_id()
        navigations = data.get('navigations', [])
        
        # Validate required parameters
        if not host or not host.get('host_name'):
            return jsonify({
                'success': False,
                'error': 'Host configuration with host_name is required'
            }), 400
        
        if not navigations:
            return jsonify({
                'success': False,
                'error': 'navigations array is required'
            }), 400
        
        # Use the standardized NavigationExecutor (same as Python direct calls)
        executor = NavigationExecutor(host, device_id, team_id)
        
        results = []
        successful_navigations = 0
        
        for i, navigation in enumerate(navigations):
            tree_id = navigation.get('tree_id')
            target_node_id = navigation.get('target_node_id')
            current_node_id = navigation.get('current_node_id')
            
            if not tree_id or not target_node_id:
                result = {
                    'success': False,
                    'error': 'tree_id and target_node_id are required for each navigation',
                    'navigation_index': i
                }
            else:
                print(f"[@route:navigation_execution:batch_execute_navigation] Executing navigation {i+1}/{len(navigations)}: {tree_id} -> {target_node_id}")
                
                result = executor.execute_navigation(tree_id, target_node_id, current_node_id)
                result['navigation_index'] = i
                
                if result.get('success'):
                    successful_navigations += 1
            
            results.append(result)
            
            # If navigation failed and we want to stop on first failure
            if not result.get('success'):
                print(f"[@route:navigation_execution:batch_execute_navigation] Navigation {i+1} failed, continuing with next...")
        
        overall_success = successful_navigations == len(navigations)
        
        print(f"[@route:navigation_execution:batch_execute_navigation] Batch completed: {successful_navigations}/{len(navigations)} successful")
        
        return jsonify({
            'success': overall_success,
            'total_navigations': len(navigations),
            'successful_navigations': successful_navigations,
            'failed_navigations': len(navigations) - successful_navigations,
            'results': results,
            'message': f'Batch navigation completed: {successful_navigations}/{len(navigations)} successful'
        })
        
    except Exception as e:
        print(f"[@route:navigation_execution:batch_execute_navigation] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Batch navigation execution error: {str(e)}'
        }), 500 
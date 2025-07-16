"""
Validation Routes - Reuses NavigationExecutor API for sequential edge testing
"""

from typing import List
from flask import Blueprint, request, jsonify

from src.web.cache.navigation_cache import get_cached_graph
from src.utils.app_utils import get_team_id

# Create blueprint
server_validation_bp = Blueprint('server_validation', __name__, url_prefix='/server/validation')

@server_validation_bp.route('/preview/<tree_id>', methods=['GET'])
def get_validation_preview(tree_id: str):
    """
    Get validation preview - shows which edges will be validated
    """
    try:
        team_id = get_team_id()
        
        # Get cached graph
        G = get_cached_graph(tree_id, team_id)
        if not G:
            return jsonify({
                'success': False,
                'error': 'Navigation graph not found'
            }), 400
        
        # Get all edges from graph
        edges = []
        for i, (from_node, to_node, edge_data) in enumerate(G.edges(data=True)):
            from_info = G.nodes[from_node]
            to_info = G.nodes[to_node]
            
            edge_info = {
                'step_number': i + 1,
                'from_node': from_node,
                'to_node': to_node,
                'from_name': from_info.get('label', from_node),
                'to_name': to_info.get('label', to_node),
                'selected': True,
                'actions': edge_data.get('actions', []),
                'has_verifications': bool(to_info.get('verifications', []))
            }
            edges.append(edge_info)
        
        if not edges:
            return jsonify({
                'success': False,
                'error': 'No edges found for validation'
            }), 400
        
        return jsonify({
            'success': True,
            'tree_id': tree_id,
            'total_edges': len(edges),
            'edges': edges
        })
        
    except Exception as e:
        print(f"[@route:get_validation_preview] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to get validation preview: {str(e)}'
        }), 500

@server_validation_bp.route('/run/<tree_id>', methods=['POST'])
def run_validation(tree_id: str):
    """
    Run validation by calling NavigationExecutor for each target node sequentially
    """
    try:
        data = request.get_json() or {}
        
        # Get host and device information
        host = data.get('host')
        device_id = data.get('device_id')
        edges_to_validate = data.get('edges_to_validate', [])
        
        if not host:
            return jsonify({
                'success': False,
                'error': 'Host configuration is required'
            }), 400
        
        if not edges_to_validate:
            return jsonify({
                'success': False,
                'error': 'No edges provided for validation'
            }), 400
        
        print(f"[@route:run_validation] Validating {len(edges_to_validate)} edges")
        
        # Execute validation by calling navigation execute endpoint for each target
        results = []
        successful_count = 0
        failed_count = 0
        current_node_id = None  # Start from entry point
        
        for i, edge in enumerate(edges_to_validate):
            to_node = edge['to_node']
            
            print(f"[@route:run_validation] Step {i+1}/{len(edges_to_validate)}: Navigating to {to_node}")
            
            # Call the same NavigationExecutor API that goto uses
            execute_url = f"/server/navigation/execute/{tree_id}/{to_node}"
            execute_payload = {
                'host': host,
                'device_id': device_id,
                'current_node_id': current_node_id
            }
            
            # Make internal request to navigation execute endpoint
            from flask import current_app
            with current_app.test_client() as client:
                response = client.post(execute_url, json=execute_payload)
                result = response.get_json()
            
            success = result.get('success', False)
            if success:
                successful_count += 1
                # Update current position for next navigation
                current_node_id = result.get('final_position_node_id', to_node)
            else:
                failed_count += 1
                # Still try to update position if we have it
                if result.get('final_position_node_id'):
                    current_node_id = result['final_position_node_id']
            
            # Build result entry in expected format
            result_entry = {
                'from_node': edge['from_node'],
                'to_node': edge['to_node'],
                'from_name': edge['from_name'],
                'to_name': edge['to_name'],
                'success': success,
                'skipped': False,
                'step_number': i + 1,
                'total_steps': len(edges_to_validate),
                'error_message': result.get('error') if not success else None,
                'execution_time': result.get('execution_time', 0),
                'transitions_executed': result.get('transitions_executed', 0),
                'total_transitions': result.get('total_transitions', 0),
                'actions_executed': result.get('actions_executed', 0),
                'total_actions': result.get('total_actions', 0),
                'verification_results': result.get('verification_results', [])
            }
            
            results.append(result_entry)
        
        # Calculate overall health
        total_tested = successful_count + failed_count
        health_percentage = (successful_count / total_tested * 100) if total_tested > 0 else 0
        
        if health_percentage >= 90:
            overall_health = 'excellent'
        elif health_percentage >= 75:
            overall_health = 'good'
        elif health_percentage >= 50:
            overall_health = 'fair'
        else:
            overall_health = 'poor'
        
        print(f"[@route:run_validation] Validation completed: {successful_count}/{total_tested} successful ({health_percentage:.1f}%)")
        
        return jsonify({
            'success': True,
            'tree_id': tree_id,
            'summary': {
                'totalTested': total_tested,
                'successful': successful_count,
                'failed': failed_count,
                'skipped': len(skipped_edges),
                'overallHealth': overall_health,
                'healthPercentage': health_percentage
            },
            'results': results
        })
        
    except Exception as e:
        print(f"[@route:run_validation] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Validation failed: {str(e)}'
        }), 500

"""
Simple Validation Routes

Clean validation system that reuses the same NavigationExecutor that goto uses.
Each edge transition is executed using NavigationExecutor which handles node verification automatically.
"""

from typing import Dict, List, Optional, Any
from flask import Blueprint, request, jsonify

# Import pathfinding utilities for edge ordering
from src.lib.navigation.navigation_pathfinding import find_optimal_edge_validation_sequence
from src.web.cache.navigation_cache import get_cached_graph
from src.utils.app_utils import get_team_id

# Import navigation executor (same as goto)
from src.lib.navigation.navigation_execution import NavigationExecutor

# Create blueprint
server_validation_bp = Blueprint('server_validation', __name__)

@server_validation_bp.route('/preview/<tree_id>', methods=['GET'])
def get_validation_preview(tree_id: str):
    """
    Get validation preview - shows which edges will be validated and in what order
    """
    try:
        team_id = get_team_id()
        
        # Get optimal validation sequence
        validation_sequence = find_optimal_edge_validation_sequence(tree_id, team_id)
        
        if not validation_sequence:
            return jsonify({
                'success': False,
                'error': 'No edges found for validation'
            }), 400
        
        # Get cached graph for node information
        G = get_cached_graph(tree_id, team_id)
        if not G:
            return jsonify({
                'success': False,
                'error': 'Navigation graph not found'
            }), 400
        
        # Build preview response
        preview = {
            'success': True,
            'tree_id': tree_id,
            'total_edges': len(validation_sequence),
            'edges': []
        }
        
        for i, edge_data in enumerate(validation_sequence):
            edge_info = {
                'step_number': i + 1,
                'from_node': edge_data['from_node'],
                'to_node': edge_data['to_node'],
                'from_name': edge_data['from_name'],
                'to_name': edge_data['to_name'],
                'selected': True,  # All edges selected by default
                'actions': edge_data.get('actions', []),
                'has_verifications': bool(edge_data.get('target_node_verifications', []))
            }
            preview['edges'].append(edge_info)
        
        return jsonify(preview)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to get validation preview: {str(e)}'
        }), 500

@server_validation_bp.route('/run/<tree_id>', methods=['POST'])
def run_validation(tree_id: str):
    """
    Run validation by executing each edge transition using NavigationExecutor
    """
    try:
        data = request.get_json() or {}
        team_id = get_team_id()
        
        # Get host and device information
        host = data.get('host')
        device_id = data.get('device_id')
        skipped_edges = data.get('skipped_edges', [])
        
        if not host:
            return jsonify({
                'success': False,
                'error': 'Host configuration is required'
            }), 400
        
        # Get optimal validation sequence
        validation_sequence = find_optimal_edge_validation_sequence(tree_id, team_id)
        
        if not validation_sequence:
            return jsonify({
                'success': False,
                'error': 'No edges found for validation'
            }), 400
        
        # Filter out skipped edges
        edges_to_validate = [
            edge for edge in validation_sequence
            if f"{edge['from_node']}-{edge['to_node']}" not in skipped_edges
        ]
        
        print(f"[@route:run_validation] Validating {len(edges_to_validate)} edges (skipped {len(skipped_edges)})")
        
        # Initialize NavigationExecutor
        executor = NavigationExecutor(host, device_id, team_id)
        
        # Execute each edge transition
        results = []
        successful_count = 0
        failed_count = 0
        
        for i, edge_data in enumerate(edges_to_validate):
            from_node = edge_data['from_node']
            to_node = edge_data['to_node']
            
            print(f"[@route:run_validation] Step {i+1}/{len(edges_to_validate)}: Validating {from_node} → {to_node}")
            
            # Execute navigation to the target node using NavigationExecutor
            # This will handle both the transition actions AND node verification
            result = executor.execute_navigation(
                tree_id=tree_id,
                target_node_id=to_node,
                current_node_id=from_node
            )
            
            # Process result
            success = result.get('success', False)
            if success:
                successful_count += 1
            else:
                failed_count += 1
            
            # Build result entry
            result_entry = {
                'from_node': from_node,
                'to_node': to_node,
                'from_name': edge_data['from_name'],
                'to_name': edge_data['to_name'],
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
            
            # If this transition failed, we might not be able to continue
            # But we'll try to continue from where we actually ended up
            if not success and result.get('final_position_node_id'):
                print(f"[@route:run_validation] Transition failed, but continuing from {result['final_position_node_id']}")
        
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
        
        # Build response
        response = {
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
        }
        
        print(f"[@route:run_validation] Validation completed: {successful_count}/{total_tested} successful ({health_percentage:.1f}%)")
        
        return jsonify(response)
        
    except Exception as e:
        print(f"[@route:run_validation] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Validation failed: {str(e)}'
        }), 500

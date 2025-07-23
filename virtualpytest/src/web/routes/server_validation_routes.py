"""
Validation Routes - Reuses NavigationExecutor API for sequential edge testing
"""

from typing import List
from flask import Blueprint, request, jsonify

from src.web.cache.navigation_cache import get_cached_graph
from src.utils.app_utils import get_team_id
from src.lib.navigation.navigation_execution import NavigationExecutor

# Create blueprint
server_validation_bp = Blueprint('server_validation', __name__, url_prefix='/server/validation')

@server_validation_bp.route('/preview/<tree_id>', methods=['GET'])
def get_validation_preview(tree_id: str):
    """
    Get validation preview - shows which edges will be validated using optimal depth-first sequence
    """
    try:
        team_id = get_team_id()
        
        # Use optimal edge validation sequence instead of simple graph iteration
        from src.lib.navigation.navigation_pathfinding import find_optimal_edge_validation_sequence
        
        validation_sequence = find_optimal_edge_validation_sequence(tree_id, team_id)
        
        if not validation_sequence:
            return jsonify({
                'success': False,
                'error': 'No validation sequence found'
            }), 400
        
        # Convert validation sequence to preview format
        edges = []
        for validation_step in validation_sequence:
            edge_info = {
                'step_number': validation_step['step_number'],
                'from_node': validation_step['from_node_id'],
                'to_node': validation_step['to_node_id'],
                'from_name': validation_step['from_node_label'],
                'to_name': validation_step['to_node_label'],
                'selected': True,
                'actions': validation_step.get('actions', []),
                'has_verifications': validation_step.get('total_verifications', 0) > 0,
                'step_type': validation_step.get('step_type', 'unknown')
            }
            edges.append(edge_info)
        
        return jsonify({
            'success': True,
            'tree_id': tree_id,
            'total_edges': len(edges),
            'edges': edges,
            'algorithm': 'depth_first_traversal'
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
    Run validation by calling NavigationExecutor directly for each target node sequentially
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
        
        # Get team_id
        team_id = get_team_id()
        
        # Initialize NavigationExecutor once for all validations
        executor = NavigationExecutor(host, device_id, team_id)
        
        # Execute validation by calling NavigationExecutor directly for each target
        results = []
        successful_count = 0
        failed_count = 0
        current_node_id = None  # Start from entry point
        
        for i, edge in enumerate(edges_to_validate):
            to_node = edge['to_node']
            
            print(f"[@route:run_validation] Step {i+1}/{len(edges_to_validate)}: Navigating to {to_node}")
            
            # Call NavigationExecutor directly - no HTTP overhead
            result = executor.execute_navigation(
                tree_id=tree_id,
                target_node_id=to_node,
                current_node_id=current_node_id
            )
            
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
        
        # Generate HTML report (same as validation script)
        report_url = ""
        try:
            from src.utils.report_utils import generate_validation_report
            from src.utils.cloudflare_utils import upload_script_report
            from datetime import datetime
            
            # Prepare report data (same format as validation script)
            execution_timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
            total_execution_time = sum(result.get('execution_time', 0) for result in results)
            
            # Calculate verification statistics
            total_verifications = sum(len(result.get('verification_results', [])) for result in results)
            passed_verifications = sum(
                sum(1 for v in result.get('verification_results', []) if v.get('success', False)) 
                for result in results
            )
            
            report_data = {
                'script_name': 'validation (web interface)',
                'device_info': {
                    'device_name': host.get('device_name', 'Unknown Device'),
                    'device_model': host.get('device_model', 'Unknown Model'),
                    'device_id': device_id or 'web_interface'
                },
                'host_info': {
                    'host_name': host.get('host_name', 'Unknown Host')
                },
                'execution_time': int(total_execution_time * 1000),  # Convert to ms
                'success': successful_count == total_tested,
                'step_results': [
                    {
                        'step_number': result['step_number'],
                        'success': result['success'],
                        'screenshot_path': None,  # Web interface doesn't capture screenshots
                        'message': f"{result['from_name']} → {result['to_name']}",
                        'execution_time_ms': int(result.get('execution_time', 0) * 1000),
                        'start_time': 'N/A',
                        'end_time': 'N/A',
                        'from_node': result['from_name'],
                        'to_node': result['to_name'],
                        'actions': [],  # Actions not detailed in web interface
                        'verifications': [],  # Verifications not detailed in web interface
                        'verification_results': result.get('verification_results', [])
                    }
                    for result in results
                ],
                'screenshots': {
                    'initial': None,
                    'steps': [],
                    'final': None
                },
                'error_msg': '',
                'timestamp': execution_timestamp,
                'userinterface_name': f'tree_{tree_id}',
                'total_steps': len(results),
                'passed_steps': successful_count,
                'failed_steps': failed_count,
                'total_verifications': total_verifications,
                'passed_verifications': passed_verifications,
                'failed_verifications': total_verifications - passed_verifications
            }
            
            html_content = generate_validation_report(report_data)
            
            # Upload report to R2
            upload_result = upload_script_report(
                html_content=html_content,
                device_model=host.get('device_model', 'web_interface'),
                script_name="validation",
                timestamp=execution_timestamp
            )
            
            if upload_result['success']:
                report_url = upload_result['report_url']
                print(f"[@route:run_validation] Report uploaded: {report_url}")
            else:
                print(f"[@route:run_validation] Report upload failed: {upload_result.get('error', 'Unknown error')}")
                
        except Exception as e:
            print(f"[@route:run_validation] Report generation failed: {str(e)}")
        
        return jsonify({
            'success': True,
            'tree_id': tree_id,
            'summary': {
                'totalTested': total_tested,
                'successful': successful_count,
                'failed': failed_count,
                'skipped': 0,  # No skipping logic exists
                'overallHealth': overall_health,
                'healthPercentage': health_percentage
            },
            'results': results,
            'report_url': report_url  # Add report URL to response
        })
        
    except Exception as e:
        print(f"[@route:run_validation] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Validation failed: {str(e)}'
        }), 500

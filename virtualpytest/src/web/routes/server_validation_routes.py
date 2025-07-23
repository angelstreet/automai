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

@server_validation_bp.route('/status/<task_id>', methods=['GET'])
def get_validation_status(task_id):
    """Get status of an async validation task"""
    try:
        from src.utils.task_manager import task_manager
        task = task_manager.get_task(task_id)
        
        if not task:
            return jsonify({
                'success': False,
                'error': 'Task not found'
            }), 404
        
        return jsonify({
            'success': True,
            'task': task
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@server_validation_bp.route('/run/<tree_id>', methods=['POST'])
def run_validation(tree_id: str):
    """Run validation asynchronously with progress tracking"""
    try:
        print(f"[@route:run_validation] Starting async validation for tree: {tree_id}")
        
        data = request.get_json() or {}
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
        
        print(f"[@route:run_validation] Host: {host.get('host_name')}, Device: {device_id}")
        print(f"[@route:run_validation] Validating {len(edges_to_validate)} edges")
        
        # Create task for async validation
        from src.utils.task_manager import task_manager
        task_id = task_manager.create_task('validation', {
            'tree_id': tree_id,
            'host': host,
            'device_id': device_id,
            'edges_to_validate': edges_to_validate
        })
        
        # Initialize progress
        initial_progress = {
            'currentStep': 0,
            'totalSteps': len(edges_to_validate),
            'steps': [
                {
                    'stepNumber': i + 1,
                    'fromName': edge.get('from_name', 'Unknown'),
                    'toName': edge.get('to_name', 'Unknown'),
                    'status': 'pending'
                }
                for i, edge in enumerate(edges_to_validate)
            ]
        }
        task_manager.update_task_progress(task_id, initial_progress)
        
        # Execute validation in background thread
        import threading
        def execute_async():
            try:
                print(f"[@route:run_validation] Starting background validation for task {task_id}")
                
                # Get team_id and initialize NavigationExecutor
                team_id = get_team_id()
                executor = NavigationExecutor(host, device_id, team_id)
                
                results = []
                successful_count = 0
                failed_count = 0
                current_node_id = None  # Start from entry point
                
                # Execute each edge validation with progress updates
                for i, edge in enumerate(edges_to_validate):
                    to_node = edge['to_node']
                    
                    print(f"[@route:run_validation] Step {i+1}/{len(edges_to_validate)}: Navigating to {to_node}")
                    
                    # Update progress - mark current step as running
                    progress = task_manager.get_task(task_id)['progress'].copy()
                    progress['currentStep'] = i + 1
                    progress['steps'][i]['status'] = 'running'
                    task_manager.update_task_progress(task_id, progress)
                    
                    # Call NavigationExecutor directly
                    result = executor.execute_navigation(
                        tree_id=tree_id,
                        target_node_id=to_node,
                        current_node_id=current_node_id
                    )
                    
                    success = result.get('success', False)
                    if success:
                        successful_count += 1
                        current_node_id = result.get('final_position_node_id', to_node)
                    else:
                        failed_count += 1
                        if result.get('final_position_node_id'):
                            current_node_id = result['final_position_node_id']
                    
                    # Build result entry
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
                    
                    # Update progress - mark step as completed
                    progress = task_manager.get_task(task_id)['progress'].copy()
                    progress['steps'][i]['status'] = 'success' if success else 'failed'
                    progress['steps'][i]['executionTime'] = result.get('execution_time', 0)
                    task_manager.update_task_progress(task_id, progress)
                    
                    if success:
                        print(f"✅ [@route:run_validation] Step {i+1} completed successfully")
                    else:
                        print(f"❌ [@route:run_validation] Step {i+1} failed: {result.get('error', 'Unknown error')}")
                
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
                
                # Generate HTML report using shared function
                report_url = ""
                try:
                    from src.utils.report_utils import generate_and_upload_script_report
                    from datetime import datetime
                    
                    execution_timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
                    total_execution_time = int(sum(result.get('execution_time', 0) for result in results) * 1000)
                    
                    # Prepare step results for report
                    step_results = [
                        {
                            'step_number': result['step_number'],
                            'success': result['success'],
                            'screenshot_path': None,
                            'message': f"{result['from_name']} → {result['to_name']}",
                            'execution_time_ms': int(result.get('execution_time', 0) * 1000),
                            'start_time': 'N/A',
                            'end_time': 'N/A',
                            'from_node': result['from_name'],
                            'to_node': result['to_name'],
                            'actions': [],
                            'verifications': [],
                            'verification_results': result.get('verification_results', [])
                        }
                        for result in results
                    ]
                    
                    # Use shared report generation function
                    report_url = generate_and_upload_script_report(
                        script_name='validation (web interface)',
                        device_info={
                            'device_name': host.get('device_name', 'Unknown Device'),
                            'device_model': host.get('device_model', 'Unknown Model'),
                            'device_id': device_id or 'web_interface'
                        },
                        host_info={
                            'host_name': host.get('host_name', 'Unknown Host')
                        },
                        execution_time=total_execution_time,
                        success=successful_count == total_tested,
                        step_results=step_results,
                        screenshot_paths=None,
                        error_message='',
                        userinterface_name=f'tree_{tree_id}',
                        stdout='',
                        stderr='',
                        exit_code=0,
                        parameters=''
                    )
                    
                except Exception as e:
                    print(f"[@route:run_validation] Report generation failed: {str(e)}")
                
                # Complete task with results
                final_result = {
                    'success': True,
                    'tree_id': tree_id,
                    'summary': {
                        'totalTested': total_tested,
                        'successful': successful_count,
                        'failed': failed_count,
                        'skipped': 0,
                        'overallHealth': overall_health,
                        'healthPercentage': health_percentage
                    },
                    'results': results,
                    'report_url': report_url
                }
                
                # Update final progress with report URL
                final_progress = task_manager.get_task(task_id)['progress'].copy()
                final_progress['reportUrl'] = report_url
                task_manager.update_task_progress(task_id, final_progress)
                
                task_manager.complete_task(task_id, final_result)
                
            except Exception as e:
                print(f"[@route:run_validation] Background validation error for task {task_id}: {e}")
                task_manager.complete_task(task_id, {}, error=str(e))
        
        threading.Thread(target=execute_async, daemon=True).start()
        
        return jsonify({
            'success': True,
            'task_id': task_id,
            'status': 'started',
            'message': f'Validation started for tree {tree_id}'
        }), 202
        
    except Exception as e:
        print(f"[@route:run_validation] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Validation failed: {str(e)}'
        }), 500

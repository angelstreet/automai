"""
Host Navigation Routes - Execute navigation on host device
"""
from flask import Blueprint, request, jsonify
from src.utils.host_utils import get_host
import time

host_navigation_bp = Blueprint('host_navigation', __name__, url_prefix='/host')

@host_navigation_bp.route('/navigation/execute', methods=['POST'])
def execute_navigation():
    """Execute navigation transitions on host device"""
    try:
        data = request.get_json()
        navigation_data = data.get('navigation_data', {})
        
        if not navigation_data:
            return jsonify({
                'success': False,
                'error': 'navigation_data is required'
            }), 400
        
        tree_id = navigation_data.get('tree_id')
        target_node_id = navigation_data.get('target_node_id')
        transitions = navigation_data.get('transitions', [])
        
        print(f"[@route:host_navigation:execute] Executing navigation to {target_node_id} in tree {tree_id}")
        print(f"[@route:host_navigation:execute] Processing {len(transitions)} transitions")
        
        if not transitions:
            return jsonify({
                'success': False,
                'error': 'No transitions provided'
            }), 400
        
        # Get host device
        host = get_host()
        if not host:
            return jsonify({
                'success': False,
                'error': 'Host device not available'
            }), 500
        
        device = host.get_device()
        if not device:
            return jsonify({
                'success': False,
                'error': 'Device not available'
            }), 500
        
        # Get remote controller for action execution
        remote_controller = device.get_controller('remote')
        if not remote_controller:
            return jsonify({
                'success': False,
                'error': 'Remote controller not available'
            }), 500
        
        # Execute all transitions in batch
        start_time = time.time()
        transitions_executed = 0
        actions_executed = 0
        total_actions = sum(len(t.get('actions', [])) for t in transitions)
        transitions_details = []
        action_results = []
        
        print(f"[@route:host_navigation:execute] Starting batch execution of {total_actions} actions across {len(transitions)} transitions")
        
        for i, transition in enumerate(transitions):
            transition_start_time = time.time()
            transition_success = True
            transition_actions_executed = 0
            
            print(f"[@route:host_navigation:execute] Executing transition {i+1}/{len(transitions)}: {transition.get('from_node_label', '')} → {transition.get('to_node_label', '')}")
            
            # Execute main actions
            actions = transition.get('actions', [])
            for j, action in enumerate(actions):
                print(f"[@route:host_navigation:execute]   Action {j+1}/{len(actions)}: {action.get('label', action.get('command', 'Unknown'))}")
                
                try:
                    # Execute action using remote controller
                    action_result = remote_controller.execute_command(
                        command=action.get('command'),
                        params=action.get('params', {})
                    )
                    
                    if action_result.get('success'):
                        transition_actions_executed += 1
                        actions_executed += 1
                        print(f"[@route:host_navigation:execute]   ✓ Action {j+1} completed successfully")
                        
                        # Add to action results
                        action_results.append({
                            'transition_number': i + 1,
                            'action_number': j + 1,
                            'action': action,
                            'success': True,
                            'message': action_result.get('message', 'Success')
                        })
                        
                        # Wait after action if specified
                        if action.get('waitTime', 0) > 0:
                            wait_time_seconds = action.get('waitTime', 0) / 1000.0
                            print(f"[@route:host_navigation:execute]   Waiting {wait_time_seconds}s after action")
                            time.sleep(wait_time_seconds)
                    else:
                        print(f"[@route:host_navigation:execute]   ✗ Action {j+1} failed: {action_result.get('error', 'Unknown error')}")
                        transition_success = False
                        
                        # Add to action results
                        action_results.append({
                            'transition_number': i + 1,
                            'action_number': j + 1,
                            'action': action,
                            'success': False,
                            'error': action_result.get('error', 'Unknown error')
                        })
                        break
                        
                except Exception as e:
                    print(f"[@route:host_navigation:execute]   ✗ Action {j+1} exception: {str(e)}")
                    transition_success = False
                    
                    # Add to action results
                    action_results.append({
                        'transition_number': i + 1,
                        'action_number': j + 1,
                        'action': action,
                        'success': False,
                        'error': str(e)
                    })
                    break
            
            # If main actions failed, try retry actions
            if not transition_success:
                retry_actions = transition.get('retryActions', [])
                if retry_actions:
                    print(f"[@route:host_navigation:execute] 🔄 Main actions failed, trying {len(retry_actions)} retry actions")
                    
                    retry_success = True
                    for j, retry_action in enumerate(retry_actions):
                        print(f"[@route:host_navigation:execute]   Retry Action {j+1}/{len(retry_actions)}: {retry_action.get('label', retry_action.get('command', 'Unknown'))}")
                        
                        try:
                            action_result = remote_controller.execute_command(
                                command=retry_action.get('command'),
                                params=retry_action.get('params', {})
                            )
                            
                            if action_result.get('success'):
                                print(f"[@route:host_navigation:execute]   ✓ Retry Action {j+1} completed successfully")
                                
                                # Add to action results
                                action_results.append({
                                    'transition_number': i + 1,
                                    'action_number': f"retry_{j+1}",
                                    'action': retry_action,
                                    'success': True,
                                    'message': action_result.get('message', 'Success')
                                })
                                
                                # Wait after retry action if specified
                                if retry_action.get('waitTime', 0) > 0:
                                    wait_time_seconds = retry_action.get('waitTime', 0) / 1000.0
                                    time.sleep(wait_time_seconds)
                            else:
                                print(f"[@route:host_navigation:execute]   ✗ Retry Action {j+1} failed: {action_result.get('error', 'Unknown error')}")
                                retry_success = False
                                
                                # Add to action results
                                action_results.append({
                                    'transition_number': i + 1,
                                    'action_number': f"retry_{j+1}",
                                    'action': retry_action,
                                    'success': False,
                                    'error': action_result.get('error', 'Unknown error')
                                })
                                break
                                
                        except Exception as e:
                            print(f"[@route:host_navigation:execute]   ✗ Retry Action {j+1} exception: {str(e)}")
                            retry_success = False
                            
                            # Add to action results
                            action_results.append({
                                'transition_number': i + 1,
                                'action_number': f"retry_{j+1}",
                                'action': retry_action,
                                'success': False,
                                'error': str(e)
                            })
                            break
                    
                    if retry_success:
                        print(f"[@route:host_navigation:execute] ✅ Retry actions completed successfully!")
                        transition_success = True
                        actions_executed += len(retry_actions)
            
            # Final wait for transition if specified
            if transition_success and transition.get('finalWaitTime', 0) > 0:
                final_wait_seconds = transition.get('finalWaitTime', 0) / 1000.0
                print(f"[@route:host_navigation:execute] Final wait for transition: {final_wait_seconds}s")
                time.sleep(final_wait_seconds)
            
            transition_execution_time = time.time() - transition_start_time
            
            # Record transition details
            transition_detail = {
                'transition_number': i + 1,
                'from_node_id': transition.get('from_node_id'),
                'to_node_id': transition.get('to_node_id'),
                'from_node_label': transition.get('from_node_label', ''),
                'to_node_label': transition.get('to_node_label', ''),
                'actions_executed': transition_actions_executed,
                'total_actions': len(actions),
                'success': transition_success,
                'execution_time': transition_execution_time
            }
            
            transitions_details.append(transition_detail)
            
            if transition_success:
                transitions_executed += 1
                print(f"[@route:host_navigation:execute] ✓ Transition {i+1} completed successfully")
            else:
                print(f"[@route:host_navigation:execute] ✗ Transition {i+1} failed")
                # Continue with remaining transitions even if one fails
        
        execution_time = time.time() - start_time
        overall_success = transitions_executed == len(transitions)
        
        print(f"[@route:host_navigation:execute] Batch execution completed in {execution_time:.2f}s")
        print(f"[@route:host_navigation:execute] Results: {transitions_executed}/{len(transitions)} transitions, {actions_executed}/{total_actions} actions")
        
        return jsonify({
            'success': overall_success,
            'transitions_executed': transitions_executed,
            'total_transitions': len(transitions),
            'actions_executed': actions_executed,
            'total_actions': total_actions,
            'execution_time': execution_time,
            'transitions_details': transitions_details,
            'action_results': action_results,
            'message': f"Executed {transitions_executed}/{len(transitions)} transitions successfully" if overall_success else f"Failed: only {transitions_executed}/{len(transitions)} transitions completed"
        })
        
    except Exception as e:
        print(f"[@route:host_navigation:execute] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Navigation execution error: {str(e)}'
        }), 500 
"""
Navigation API Routes

This module contains the API endpoints for:
- Navigation trees management
- Navigation nodes and edges management
- Navigation execution on devices
"""

from flask import Blueprint, request, jsonify, current_app
from datetime import datetime
import uuid
import requests
import time

# Import proxy utilities
from src.web.utils.routeUtils import proxy_to_host, proxy_to_host_with_params

# Import from specific database modules (direct imports)
from src.lib.supabase.navigation_trees_db import (
    get_all_trees as get_all_navigation_trees_util,
    get_tree as get_navigation_tree,
    save_tree as create_navigation_tree_util,
    update_tree as update_navigation_tree,
    delete_tree as delete_navigation_tree,
    check_navigation_tree_name_exists,
    get_root_tree_for_interface,
)
from src.lib.supabase.userinterface_db import (
    get_all_userinterfaces, 
    get_userinterface
)
from src.utils.app_utils import check_supabase, get_team_id

# Create blueprint with abstract server navigation prefix
navigation_bp = Blueprint('navigation', __name__, url_prefix='/server/navigation')

# =====================================================
# NAVIGATION SCREENSHOT ENDPOINTS (HOST)
# =====================================================

@navigation_bp.route('/saveNavigationScreenshot', methods=['POST'])
def save_navigation_screenshot():
    """Proxy save navigation screenshot request to host (host handles R2 upload and database save)"""
    try:
        print("[@route:server_navigation:save_screenshot] Proxying save navigation screenshot request to host")
        
        # Extract request data - following server_av_routes.py pattern
        request_data = request.get_json() or {}
        host = request_data.get('host')
        device_id = request_data.get('device_id', 'device1')

        # Validate host - following server_av_routes.py pattern
        if not host:
            return jsonify({'success': False, 'error': 'Host required'}), 400

        print(f"[@route:server_navigation:save_screenshot] Host: {host.get('host_name')}, Device: {device_id}")

        # Add device_id to query params for host route - following server_av_routes.py pattern
        query_params = {'device_id': device_id}

        # Proxy to host navigation save-screenshot endpoint using proxy_to_host_with_params
        response_data, status_code = proxy_to_host_with_params(
            '/host/navigation/saveScreenshot',
            'POST',
            request_data,
            query_params
        )
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        print(f"[@route:server_navigation:save_screenshot] ERROR: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# =====================================================
# NAVIGATION EXECUTION ENDPOINTS (HOST)
# =====================================================

@navigation_bp.route('/goto', methods=['POST'])
def goto_navigation_node():
    """Navigate to a specific node using abstract navigation controller."""
    try:
        data = request.get_json()
        target_node = data.get('target_node')
        
        print(f"[@route:goto_navigation_node] Navigating to node: {target_node}")
        
        if not target_node:
            return jsonify({
                'success': False,
                'error': 'target_node is required'
            }), 400
        
        # Get the host device object with instantiated controllers
        host_device = getattr(current_app, 'my_host_device', None)
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device not initialized'
            }), 500
        
        # Get the abstract navigation controller
        navigation_controller = host_device.get('controller_objects', {}).get('navigation')
        if not navigation_controller:
            # Fallback to remote controller for basic navigation
            remote_controller = host_device.get('controller_objects', {}).get('remote')
            if not remote_controller:
                return jsonify({
                    'success': False,
                    'error': 'Navigation controller not available'
                }), 400
            
            # Use remote controller for basic navigation
            print(f"[@route:goto_navigation_node] Using remote controller for navigation to: {target_node}")
            result = remote_controller.navigate_to_node(target_node)
        else:
            # Use dedicated navigation controller
            print(f"[@route:goto_navigation_node] Using navigation controller for navigation to: {target_node}")
            result = navigation_controller.goto_node(target_node)
        
        print(f"[@route:goto_navigation_node] Navigation completed successfully")
        return jsonify({
            'success': True,
            'result': result,
            'message': f'Successfully navigated to node: {target_node}'
        })
        
    except Exception as e:
        print(f"[@route:goto_navigation_node] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Navigation error: {str(e)}'
        }), 500

@navigation_bp.route('/preview/<tree_id>/<target_node_id>', methods=['GET'])
def get_navigation_preview(tree_id, target_node_id):
    """Get navigation preview (path from current/root to target node)"""
    try:
        current_node_id = request.args.get('current_node_id')
        
        print(f"[@route:get_navigation_preview] Getting preview for tree: {tree_id}, target: {target_node_id}, current: {current_node_id}")
        
        # Import navigation modules
        from src.navigation.navigation_pathfinding import find_shortest_path
        
        # Get team ID for security
        team_id = get_team_id()
        
        # Find path from current to target node
        path_result = find_shortest_path(tree_id, current_node_id, target_node_id, team_id)
        
        if not path_result.get('success', False):
            return jsonify({
                'success': False,
                'error': path_result.get('error', 'Failed to find navigation path'),
                'tree_id': tree_id,
                'target_node_id': target_node_id,
                'steps': [],
                'total_steps': 0
            }), 400
        
        transitions = path_result.get('transitions', [])
        
        # Convert transitions to steps format expected by frontend
        steps = []
        for i, transition in enumerate(transitions):
            step = {
                'step_number': i + 1,
                'action': f"Navigate from {transition.get('from_node_label', 'Unknown')} to {transition.get('to_node_label', 'Unknown')}",
                'from_node_label': transition.get('from_node_label', 'Unknown'),
                'to_node_label': transition.get('to_node_label', 'Unknown'),
                'from_node_id': transition.get('from_node_id', ''),
                'to_node_id': transition.get('to_node_id', '')
            }
            steps.append(step)
        
        result = {
            'success': True,
            'tree_id': tree_id,
            'target_node_id': target_node_id,
            'steps': steps,
            'total_steps': len(steps)
        }
        
        print(f"[@route:get_navigation_preview] Preview generated: {len(steps)} steps")
        return jsonify(result)
        
    except Exception as e:
        print(f"[@route:get_navigation_preview] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'tree_id': tree_id,
            'target_node_id': target_node_id,
            'steps': [],
            'total_steps': 0
        }), 500

@navigation_bp.route('/navigate/<tree_id>/<target_node_id>', methods=['POST'])
def execute_navigation_to_node(tree_id, target_node_id):
    """Execute navigation to target node"""
    try:
        data = request.get_json() or {}
        current_node_id = data.get('current_node_id')
        execute_flag = data.get('execute', True)
        
        print(f"[@route:execute_navigation_to_node] Executing navigation to node")
        print(f"[@route:execute_navigation_to_node] Tree: {tree_id}, Target: {target_node_id}, Current: {current_node_id}, Execute: {execute_flag}")
        
        # Import navigation modules
        from src.navigation.navigation_pathfinding import find_shortest_path
        
        # Get team ID for security
        team_id = get_team_id()
        
        # Find path from current to target node
        path_result = find_shortest_path(tree_id, current_node_id, target_node_id, team_id)
        
        if not path_result.get('success', False):
            return jsonify({
                'success': False,
                'error': path_result.get('error', 'Failed to find navigation path'),
                'steps_executed': 0,
                'total_steps': 0,
                'execution_time': 0,
                'target_node_id': target_node_id
            }), 400
        
        transitions = path_result.get('transitions', [])
        
        if not execute_flag:
            # Return path without executing
            return jsonify({
                'success': True,
                'steps_executed': 0,
                'total_steps': len(transitions),
                'execution_time': 0,
                'target_node_id': target_node_id,
                'current_node_id': current_node_id
            })
        
        # Execute the navigation path
        executed_transitions = 0
        total_actions = 0
        executed_actions = 0
        start_time = time.time()
        
        for i, transition in enumerate(transitions):
            actions = transition.get('actions', [])
            total_actions += len(actions)
            
            print(f"[@route:execute_navigation_to_node] Executing transition {i+1}/{len(transitions)}: {transition.get('from_node_label', 'Unknown')} -> {transition.get('to_node_label', 'Unknown')}")
            
            # Execute each action in the transition
            transition_success = True
            
            for action in actions:
                try:
                    # Import and use remote controller
                    from src.controllers import get_controller_for_device
                    
                    # Get device info from host registry
                    host_device = getattr(current_app, 'my_host_device', None)
                    if not host_device:
                        raise Exception("No host device found")
                    
                    # Get remote controller
                    remote_controller = get_controller_for_device(host_device, 'remote')
                    if not remote_controller:
                        raise Exception("Remote controller not available")
                    
                    # Execute the action
                    action_result = remote_controller.execute_action(action)
                    
                    if action_result.get('success', False):
                        executed_actions += 1
                        print(f"[@route:execute_navigation_to_node] Action executed: {action.get('command', 'unknown')}")
                    else:
                        transition_success = False
                        print(f"[@route:execute_navigation_to_node] Action failed: {action_result.get('error', 'Action failed')}")
                        break
                        
                except Exception as e:
                    transition_success = False
                    print(f"[@route:execute_navigation_to_node] Action execution error: {e}")
                    break
            
            if transition_success:
                executed_transitions += 1
            else:
                # Stop execution on first failure
                print(f"[@route:execute_navigation_to_node] Stopping execution due to transition failure")
                break
        
        execution_time = time.time() - start_time
        overall_success = executed_transitions == len(transitions)
        
        result = {
            'success': overall_success,
            'steps_executed': executed_transitions,
            'total_steps': len(transitions),
            'execution_time': execution_time,
            'target_node_id': target_node_id,
            'current_node_id': current_node_id
        }
        
        if not overall_success:
            result['error'] = f"Navigation failed at step {executed_transitions + 1}"
        
        print(f"[@route:execute_navigation_to_node] Navigation completed: {executed_transitions}/{len(transitions)} steps, {executed_actions}/{total_actions} actions")
        
        return jsonify(result)
        
    except Exception as e:
        print(f"[@route:execute_navigation_to_node] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'steps_executed': 0,
            'total_steps': 0,
            'execution_time': 0,
            'target_node_id': target_node_id
        }), 500


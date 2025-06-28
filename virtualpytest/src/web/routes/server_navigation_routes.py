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
from src.web.utils.routeUtils import proxy_to_host

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
# NAVIGATION TREES ENDPOINTS
# =====================================================

@navigation_bp.route('/getAllTrees', methods=['GET'])
def get_all_navigation_trees():
    """Get all navigation trees for a team"""
    # Check if Supabase is available
    error_response = check_supabase()
    if error_response:
        return error_response
    
    team_id = get_team_id()
    
    try:
        # Use utility function instead of direct Supabase client access
        trees = get_all_navigation_trees_util(team_id)
        
        if trees:
            return jsonify({
                'success': True,
                'data': trees,
                'count': len(trees)
            })
        else:
            return jsonify({
                'success': True,
                'data': [],
                'count': 0
            })
            
    except Exception as e:
        print(f"[@api:navigation:get_all_trees] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to retrieve navigation trees: {str(e)}'
        }), 500

@navigation_bp.route('/getTree/<tree_id>', methods=['GET'])
def get_navigation_tree_by_id(tree_id):
    """Get a specific navigation tree by ID"""
    # Check if Supabase is available
    error_response = check_supabase()
    if error_response:
        return error_response
    
    team_id = get_team_id()
    
    try:
        # Use utility function to get navigation tree by ID and team ID
        tree = get_navigation_tree(tree_id, team_id)
        
        if tree:
            return jsonify({
                'success': True,
                'data': tree
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Navigation tree not found'
            }), 404
            
    except Exception as e:
        print(f"[@api:navigation:get_tree] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to retrieve navigation tree: {str(e)}'
        }), 500

@navigation_bp.route('/createTree', methods=['POST'])
def create_navigation_tree_route():
    """Create a new navigation tree"""
    # Check if Supabase is available
    error_response = check_supabase()
    if error_response:
        return error_response
    
    team_id = get_team_id()
    
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        # Validate required fields
        required_fields = ['name']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        # Prepare navigation tree data
        tree_data = {
            'name': data['name'],
            'description': data.get('description', ''),
            'metadata': data.get('tree_data', {}),  # Store tree_data in metadata column
            'userinterface_id': data.get('userinterface_id')
        }
        
        # Add is_root if it exists in the request data
        if 'is_root' in data:
            tree_data['is_root'] = data['is_root']
        elif data.get('tree_data', {}).get('is_root') is not None:
            tree_data['is_root'] = data['tree_data']['is_root']
        
        # Use utility function to create navigation tree
        created_tree = create_navigation_tree_util(tree_data, team_id)
        
        if created_tree:
            print(f"[@api:navigation:create_tree] Successfully created navigation tree: {created_tree['id']}")
            return jsonify({
                'success': True,
                'data': created_tree,
                'message': 'Navigation tree created successfully'
            }), 201
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to create navigation tree'
            }), 500
            
    except Exception as e:
        print(f"[@api:navigation:create_tree] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to create navigation tree: {str(e)}'
        }), 500

@navigation_bp.route('/updateTree/<tree_id>', methods=['PUT'])
def update_navigation_tree_route(tree_id):
    """Update an existing navigation tree"""
    # Check if Supabase is available
    error_response = check_supabase()
    if error_response:
        return error_response
    
    team_id = get_team_id()
    
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        # Prepare update data
        update_data = {}
        
        # Add fields that can be updated
        updatable_fields = ['name', 'description']
        for field in updatable_fields:
            if field in data:
                update_data[field] = data[field]
                
        # Special handling for tree_data to store in metadata
        if 'tree_data' in data:
            update_data['metadata'] = data['tree_data']
        
        # Use utility function to update navigation tree
        updated_tree = update_navigation_tree(tree_id, update_data, team_id)
        
        if updated_tree:
            print(f"[@api:navigation:update_tree] Successfully updated navigation tree: {tree_id}")
            return jsonify({
                'success': True,
                'data': updated_tree,
                'message': 'Navigation tree updated successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Navigation tree not found or no changes made'
            }), 404
            
    except Exception as e:
        print(f"[@api:navigation:update_tree] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to update navigation tree: {str(e)}'
        }), 500

@navigation_bp.route('/deleteTree/<tree_id>', methods=['DELETE'])
def delete_navigation_tree_route(tree_id):
    """Delete a navigation tree"""
    # Check if Supabase is available
    error_response = check_supabase()
    if error_response:
        return error_response
    
    team_id = get_team_id()
    
    try:
        # Use utility function to delete navigation tree
        success = delete_navigation_tree(tree_id, team_id)
        
        if success:
            print(f"[@api:navigation:delete_tree] Successfully deleted navigation tree: {tree_id}")
            return jsonify({
                'success': True,
                'message': 'Navigation tree deleted successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Navigation tree not found'
            }), 404
            
    except Exception as e:
        print(f"[@api:navigation:delete_tree] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to delete navigation tree: {str(e)}'
        }), 500

@navigation_bp.route('/trees/byName/<tree_name>', methods=['GET'])
def get_navigation_tree_by_name(tree_name):
    """Get a navigation tree by name"""
    # Check if Supabase is available
    error_response = check_supabase()
    if error_response:
        return error_response
    
    team_id = get_team_id()
    
    try:
        # First check if the name exists by getting all trees and filtering
        all_trees = get_all_navigation_trees_util(team_id)
        name_exists = any(tree['name'] == tree_name for tree in all_trees)
        
        if not name_exists:
            # Return a proper 404 with helpful message
            print(f"[@api:navigation:get_tree_by_name] Tree not found with name: {tree_name}")
            return jsonify({
                'success': False,
                'error': f'Navigation tree with name "{tree_name}" not found',
                'code': 'NOT_FOUND'
            }), 404
        
        # Get all trees and find the one with matching name
        all_trees = get_all_navigation_trees_util(team_id)
        tree = next((tree for tree in all_trees if tree['name'] == tree_name), None)
        
        if tree:
            print(f"[@api:navigation:get_tree_by_name] Found tree: {tree['id']} with name: {tree_name}")
            return jsonify({
                'success': True,
                'data': tree
            })
        else:
            # This should not happen since we checked name_exists above
            print(f"[@api:navigation:get_tree_by_name] Tree not found with name: {tree_name}")
            return jsonify({
                'success': False,
                'error': f'Navigation tree with name "{tree_name}" not found',
                'code': 'NOT_FOUND'
            }), 404
            
    except Exception as e:
        print(f"[@api:navigation:get_tree_by_name] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to retrieve navigation tree: {str(e)}'
        }), 500

@navigation_bp.route('/trees/byIdAndTeam/<tree_id>/<team_id>', methods=['GET'])
def get_navigation_tree_by_id_and_team(tree_id, team_id):
    """Get a navigation tree by ID and team ID"""
    # Check if Supabase is available
    error_response = check_supabase()
    if error_response:
        return error_response
    
    try:
        # Use utility function to get navigation tree by ID and team ID to respect RLS policy
        tree = get_navigation_tree(tree_id, team_id)
        
        if tree:
            print(f"[@api:navigation:get_tree_by_id_and_team] Found tree: {tree['id']} for team: {team_id}")
            return jsonify({
                'success': True,
                'data': tree
            })
        else:
            print(f"[@api:navigation:get_tree_by_id_and_team] Tree not found with ID: {tree_id} for team: {team_id}")
            return jsonify({
                'success': False,
                'error': 'Tree not found'
            }), 404
    except Exception as e:
        print(f"[@api:navigation:get_tree_by_id_and_team] ERROR: Failed to fetch tree: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@navigation_bp.route('/trees/<tree_id>/complete', methods=['GET'])
def get_complete_navigation_tree(tree_id):
    """Get a complete navigation tree with nodes and edges from metadata (single tree architecture)"""
    error_response = check_supabase()
    if error_response:
        return error_response
    
    team_id = get_team_id()
    print(f"[@api:navigation:get_complete_tree] Requested tree: {tree_id} with team_id: {team_id}")
    
    try:
        # Get the tree info first
        tree_info = get_navigation_tree(tree_id, team_id)
        
        if not tree_info:
            # Return simple 404 response like userinterface routes
            return jsonify({
                'success': False,
                'error': 'Navigation tree not found'
            }), 404
        
        # Get tree data directly from metadata (no conversion needed since it's already in ReactFlow format)
        tree_data = tree_info.get('metadata', {})
        
        # Ensure we have the basic structure
        if not isinstance(tree_data, dict):
            tree_data = {'nodes': [], 'edges': []}
        if 'nodes' not in tree_data:
            tree_data['nodes'] = []
        if 'edges' not in tree_data:
            tree_data['edges'] = []
        
        # Fetch userInterface information if the tree has a userinterface_id
        userinterface = None
        userinterface_id = tree_info.get('userinterface_id')
        if userinterface_id:
            print(f"[@api:navigation:get_complete_tree] Fetching userInterface: {userinterface_id}")
            userinterface = get_userinterface(userinterface_id, team_id)
            if userinterface:
                print(f"[@api:navigation:get_complete_tree] Found userInterface: {userinterface['name']} with models: {userinterface.get('models', [])}")
            else:
                print(f"[@api:navigation:get_complete_tree] UserInterface not found: {userinterface_id}")
        else:
            print(f"[@api:navigation:get_complete_tree] No userinterface_id found for tree: {tree_id}")
        
        response_data = {
            'success': True,
            'tree_info': tree_info,
            'tree_data': tree_data,
            'userinterface': userinterface
        }
        
        print(f"[@api:navigation:get_complete_tree] Returning tree with {len(tree_data.get('nodes', []))} nodes and {len(tree_data.get('edges', []))} edges")
        return jsonify(response_data)
        
    except Exception as e:
        print(f"[@api:navigation:get_complete_tree] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@navigation_bp.route('/trees/<tree_id>/complete', methods=['PUT'])
def save_complete_navigation_tree(tree_id):
    """Save complete navigation tree data to metadata (single tree architecture)"""
    error_response = check_supabase()
    if error_response:
        return error_response
    
    team_id = get_team_id()
    
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        # Get the tree data (ReactFlow format with nodes and edges)
        tree_data = data.get('tree_data', {})
        nodes = tree_data.get('nodes', [])
        edges = tree_data.get('edges', [])
        
        print(f"[@api:navigation:save_complete_tree] Saving tree {tree_id} with {len(nodes)} nodes and {len(edges)} edges")
        
        # Save to metadata field directly (ReactFlow format)
        metadata_update_success = update_navigation_tree(tree_id, {'metadata': tree_data}, team_id)
        
        if not metadata_update_success:
            return jsonify({
                'success': False,
                'error': 'Failed to update tree metadata'
            }), 500
        
        print(f"[@api:navigation:save_complete_tree] Successfully saved tree {tree_id}")
        return jsonify({
            'success': True,
            'message': 'Navigation tree saved successfully'
        })
        
    except Exception as e:
        print(f"[@api:navigation:save_complete_tree] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to save navigation tree: {str(e)}'
        }), 500

# =====================================================
# HELPER ENDPOINTS
# =====================================================

@navigation_bp.route('/userinterfaces', methods=['GET'])
def available_userinterfaces():
    """Get all available user interfaces for creating navigation trees"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        userinterfaces = get_all_userinterfaces(team_id)
        return jsonify(userinterfaces)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@navigation_bp.route('/userinterfaces/<interface_id>', methods=['GET'])
def get_userinterface_with_root(interface_id):
    """Get a specific user interface with its root navigation tree"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        # Get the user interface
        userinterface = get_userinterface(interface_id, team_id)
        if not userinterface:
            return jsonify({'error': 'User interface not found'}), 404
            
        # Get the root navigation tree for this user interface using the proper utility
        root_tree = get_root_tree_for_interface(interface_id, team_id)
        
        if root_tree:
            print(f"[@api:navigation_routes:get_userinterface_with_root] Found root tree for userinterface {interface_id}: {root_tree['id']}")
            
            # Note: Advanced node/edge processing would need additional functions
            # For now, return the basic tree structure
            # TODO: Add node/edge processing functions to supabase_utils if needed
            root_tree['nodes'] = []
            root_tree['edges'] = []
            
            print(f"[@api:navigation_routes:get_userinterface_with_root] Returning basic tree structure for {root_tree['id']}")
        else:
            print(f"[@api:navigation_routes:get_userinterface_with_root] No root tree found for userinterface {interface_id}")
        
        return jsonify({
            **userinterface,
            'root_tree': root_tree
        }), 200
    except Exception as e:
        print(f"[@api:navigation_routes:get_userinterface_with_root] ERROR: Failed to fetch userinterface: {str(e)}")
        return jsonify({'error': str(e)}), 500

# =====================================================
# NAVIGATION SCREENSHOT ENDPOINTS (HOST)
# =====================================================

@navigation_bp.route('/saveuscreenshot', methods=['POST'])
def save_navigation_screenshot():
    """Proxy save navigation screenshot request to host (host handles R2 upload and database save)"""
    try:
        print("[@route:server_navigation:save_screenshot] Proxying save navigation screenshot request to host")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host navigation save-screenshot endpoint
        response_data, status_code = proxy_to_host('/host/navigation/save-screenshot', 'POST', request_data)
        
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

@navigation_bp.route('/execute/<tree_id>/<node_id>', methods=['POST'])
def execute_navigation_host(tree_id, node_id):
    """Execute navigation to a specific node on host device (legacy endpoint)"""
    # Redirect to the new endpoint
    return execute_navigation_to_node(tree_id, node_id)
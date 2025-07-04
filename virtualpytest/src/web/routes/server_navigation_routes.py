"""
Navigation API Routes

This module contains the API endpoints for:
- Navigation trees management
- Navigation nodes and edges management
- Navigation execution on devices (navigate to node functionality)

NOTE: Navigation pathfinding and preview routes are in server_pathfinding_routes.py
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
# NAVIGATION EXECUTION ENDPOINTS (HOST)
# =====================================================

@navigation_bp.route('/navigate/<tree_id>/<node_id>', methods=['POST'])
def navigate_to_node(tree_id, node_id):
    """Navigate to a specific node in a navigation tree using pathfinding and execution"""
    try:
        print(f"[@route:navigate_to_node] Request to navigate to node {node_id} in tree {tree_id}")
        
        # Get team_id from request or use default
        team_id = get_team_id()
        data = request.get_json() or {}
        current_node_id = data.get('current_node_id')
        
        # Use proxy pattern to send navigation request to host
        try:
            from src.web.utils.routeUtils import proxy_to_host
            
            # Prepare navigation data for host
            navigation_request = {
                'tree_id': tree_id,
                'target_node_id': node_id,
                'team_id': team_id,
                'current_node_id': current_node_id
            }
            
            # Proxy to host navigation execution
            result, status_code = proxy_to_host('/host/navigation/execute', 'POST', navigation_request, timeout=120)
            
            # Add navigation metadata
            if isinstance(result, dict):
                result.update({
                    'tree_id': tree_id,
                    'team_id': team_id,
                    'navigation_type': 'execute'
                })
            
            return jsonify(result), status_code
            
        except Exception as e:
            print(f"[@route:navigate_to_node] Navigation proxy error: {e}")
            return jsonify({
                'success': False,
                'error': f'Navigation execution error: {str(e)}',
                'error_code': 'NAVIGATION_ERROR'
            }), 500
        
    except Exception as e:
        print(f"[@route:navigate_to_node] Error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'error_code': 'API_ERROR'
        }), 500

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
        

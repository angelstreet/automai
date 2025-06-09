"""
Navigation Config Routes

API endpoints for managing navigation tree configurations stored as JSON files.
Uses simple userinterface name mapping: {userinterface_name}.json
"""

from flask import Blueprint, request, jsonify
from navigationLockManager import NavigationLockManager
from navigationConfigManager import (
    list_available_navigation_trees,
    load_navigation_tree_from_config,
    save_navigation_tree_to_config,
    validate_navigation_tree_structure
)
from navigationGitManager import (
    pull_latest_navigation_config,
    commit_and_push_navigation_config
)

# Create blueprint
navigation_config_bp = Blueprint('navigation_config', __name__, url_prefix='/api/navigation/config')

# Initialize lock manager
lock_manager = NavigationLockManager()


@navigation_config_bp.route('/trees', methods=['GET'])
def get_navigation_trees():
    """
    List all available navigation trees with lock status
    
    Returns:
        JSON response with list of trees and their lock status
    """
    try:
        print("[@route:navigation_config:list_navigation_trees] Listing available navigation trees")
        
        # Pull latest changes from git
        pull_latest_navigation_config()
        
        # Get list of available trees
        tree_names = list_available_navigation_trees()
        
        # Add lock information for each tree
        trees_with_locks = []
        for userinterface_name in tree_names:
            lock_info = lock_manager.get_lock_info(userinterface_name)
            trees_with_locks.append({
                'name': userinterface_name,
                'is_locked': lock_info is not None,
                'lock_info': lock_info
            })
        
        print(f"[@route:navigation_config:list_navigation_trees] Found {len(trees_with_locks)} navigation trees")
        
        return jsonify({
            'success': True,
            'trees': trees_with_locks,
            'total_count': len(trees_with_locks)
        })
        
    except Exception as e:
        print(f"[@route:navigation_config:list_navigation_trees] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@navigation_config_bp.route('/trees/<userinterface_name>', methods=['GET'])
def get_navigation_tree(userinterface_name):
    """
    Load a specific navigation tree by userinterface name
    
    Args:
        userinterface_name: The userinterface name (e.g., 'horizon_mobile_android')
        
    Returns:
        JSON response with tree data and lock status
    """
    try:
        print(f"[@route:navigation_config:get_navigation_tree] Loading navigation tree: {userinterface_name}")
        
        # Pull latest changes from git
        pull_latest_navigation_config()
        
        # Load tree data
        tree_data = load_navigation_tree_from_config(userinterface_name)
        
        if tree_data is None:
            return jsonify({
                'success': False,
                'error': f'Navigation tree not found: {userinterface_name}'
            }), 404
        
        # Get lock information
        lock_info = lock_manager.get_lock_info(userinterface_name)
        
        print(f"[@route:navigation_config:get_navigation_tree] Successfully loaded tree: {userinterface_name}")
        
        return jsonify({
            'success': True,
            'tree_data': tree_data,
            'tree_name': userinterface_name,
            'is_locked': lock_info is not None,
            'lock_info': lock_info
        })
        
    except Exception as e:
        print(f"[@route:navigation_config:get_navigation_tree] Error loading tree {userinterface_name}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@navigation_config_bp.route('/trees/<userinterface_name>/lock', methods=['POST'])
def lock_navigation_tree(userinterface_name):
    """
    Lock a navigation tree for editing
    
    Args:
        userinterface_name: The userinterface name to lock
        
    Returns:
        JSON response with lock status
    """
    try:
        print(f"[@route:navigation_config:lock_navigation_tree] Locking tree: {userinterface_name}")
        
        # Get session ID from request
        session_id = request.json.get('session_id') if request.json else None
        if not session_id:
            return jsonify({
                'success': False,
                'error': 'Session ID is required'
            }), 400
        
        # Attempt to acquire lock
        success = lock_manager.acquire_lock(userinterface_name, session_id)
        
        if success:
            lock_info = lock_manager.get_lock_info(userinterface_name)
            print(f"[@route:navigation_config:lock_navigation_tree] Successfully locked tree: {userinterface_name}")
            
            return jsonify({
                'success': True,
                'message': f'Tree {userinterface_name} locked successfully',
                'lock_info': lock_info
            })
        else:
            existing_lock = lock_manager.get_lock_info(userinterface_name)
            print(f"[@route:navigation_config:lock_navigation_tree] Failed to lock tree {userinterface_name} - already locked")
            
            return jsonify({
                'success': False,
                'error': f'Tree {userinterface_name} is already locked',
                'existing_lock': existing_lock
            }), 409
        
    except Exception as e:
        print(f"[@route:navigation_config:lock_navigation_tree] Error locking tree {userinterface_name}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@navigation_config_bp.route('/trees/<userinterface_name>/unlock', methods=['POST'])
def unlock_navigation_tree(userinterface_name):
    """
    Unlock a navigation tree
    
    Args:
        userinterface_name: The userinterface name to unlock
        
    Returns:
        JSON response with unlock status
    """
    try:
        print(f"[@route:navigation_config:unlock_navigation_tree] Unlocking tree: {userinterface_name}")
        
        # Get session ID from request
        session_id = request.json.get('session_id') if request.json else None
        if not session_id:
            return jsonify({
                'success': False,
                'error': 'Session ID is required'
            }), 400
        
        # Attempt to release lock
        success = lock_manager.release_lock(userinterface_name, session_id)
        
        if success:
            print(f"[@route:navigation_config:unlock_navigation_tree] Successfully unlocked tree: {userinterface_name}")
            
            return jsonify({
                'success': True,
                'message': f'Tree {userinterface_name} unlocked successfully'
            })
        else:
            print(f"[@route:navigation_config:unlock_navigation_tree] Failed to unlock tree {userinterface_name}")
            
            return jsonify({
                'success': False,
                'error': f'Failed to unlock tree {userinterface_name}. You may not own the lock.'
            }), 403
        
    except Exception as e:
        print(f"[@route:navigation_config:unlock_navigation_tree] Error unlocking tree {userinterface_name}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@navigation_config_bp.route('/trees/<userinterface_name>', methods=['PUT'])
def save_navigation_tree(userinterface_name):
    """
    Save a navigation tree (requires lock)
    
    Args:
        userinterface_name: The userinterface name to save
        
    Returns:
        JSON response with save status
    """
    try:
        print(f"[@route:navigation_config:save_navigation_tree] Saving tree: {userinterface_name}")
        
        # Get request data
        if not request.json:
            return jsonify({
                'success': False,
                'error': 'Request body is required'
            }), 400
        
        session_id = request.json.get('session_id')
        tree_data = request.json.get('tree_data')
        commit_message = request.json.get('commit_message', f'Update navigation tree: {userinterface_name}')
        
        if not session_id:
            return jsonify({
                'success': False,
                'error': 'Session ID is required'
            }), 400
        
        if not tree_data:
            return jsonify({
                'success': False,
                'error': 'Tree data is required'
            }), 400
        
        # Check if user has lock
        lock_info = lock_manager.get_lock_info(userinterface_name)
        if not lock_info or lock_info['session_id'] != session_id:
            return jsonify({
                'success': False,
                'error': f'You must have a lock on tree {userinterface_name} to save it'
            }), 403
        
        # Validate tree structure
        if not validate_navigation_tree_structure(tree_data):
            return jsonify({
                'success': False,
                'error': 'Invalid tree data structure'
            }), 400
        
        # Save to config file
        success = save_navigation_tree_to_config(userinterface_name, tree_data)
        
        if not success:
            return jsonify({
                'success': False,
                'error': 'Failed to save tree to config file'
            }), 500
        
        # Commit and push to git
        git_success = commit_and_push_navigation_config(commit_message)
        
        if not git_success:
            print(f"[@route:navigation_config:save_navigation_tree] Warning: Git commit/push failed for tree {userinterface_name}")
            # Don't fail the save operation, just warn
        
        print(f"[@route:navigation_config:save_navigation_tree] Successfully saved tree: {userinterface_name}")
        
        return jsonify({
            'success': True,
            'message': f'Tree {userinterface_name} saved successfully',
            'git_committed': git_success
        })
        
    except Exception as e:
        print(f"[@route:navigation_config:save_navigation_tree] Error saving tree {userinterface_name}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500 
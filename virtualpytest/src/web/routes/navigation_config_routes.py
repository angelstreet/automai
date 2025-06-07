"""
Navigation Config Routes

API endpoints for managing navigation trees as JSON config files.
Includes lock management to prevent editing conflicts.
"""

from flask import Blueprint, request, jsonify
import uuid
from datetime import datetime

# Import our navigation utilities using absolute imports
from navigationLockManager import (
    lock_navigation_tree,
    unlock_navigation_tree,
    is_navigation_tree_locked,
    get_navigation_tree_lock_info,
    get_all_locked_navigation_trees,
    cleanup_expired_navigation_locks
)

from navigationConfigManager import (
    load_navigation_tree_from_config,
    save_navigation_tree_to_config,
    list_available_navigation_trees,
    delete_navigation_tree_config,
    backup_navigation_tree_config,
    validate_navigation_tree_structure
)

from navigationGitManager import (
    perform_navigation_git_operations,
    pull_latest_navigation_config,
    check_navigation_git_status
)

# Create blueprint
navigation_config_bp = Blueprint('navigation_config', __name__)

# =====================================================
# NAVIGATION TREE LISTING AND READING
# =====================================================

@navigation_config_bp.route('/api/navigation/config/trees', methods=['GET'])
def list_navigation_trees():
    """List all available navigation trees in config directory."""
    try:
        print(f"[@route:navigation_config:list_navigation_trees] Listing available navigation trees")
        
        # Pull latest changes first
        pull_result = pull_latest_navigation_config()
        if not pull_result['success']:
            print(f"[@route:navigation_config:list_navigation_trees] Warning: Git pull failed: {pull_result.get('error')}")
        
        # Get list of available trees
        tree_names = list_available_navigation_trees()
        
        # Get lock information for each tree
        trees_with_lock_info = []
        for tree_name in tree_names:
            lock_info = get_navigation_tree_lock_info(tree_name)
            trees_with_lock_info.append({
                'name': tree_name,
                'is_locked': lock_info is not None,
                'lock_info': lock_info
            })
        
        print(f"[@route:navigation_config:list_navigation_trees] Found {len(tree_names)} navigation trees")
        
        return jsonify({
            'success': True,
            'trees': trees_with_lock_info,
            'total_count': len(tree_names)
        })
        
    except Exception as e:
        print(f"[@route:navigation_config:list_navigation_trees] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to list navigation trees: {str(e)}'
        }), 500


@navigation_config_bp.route('/api/navigation/config/trees/<tree_name>', methods=['GET'])
def get_navigation_tree(tree_name):
    """Get a specific navigation tree from config file. Reading is always allowed."""
    try:
        print(f"[@route:navigation_config:get_navigation_tree] Loading navigation tree: {tree_name}")
        
        # Pull latest changes first
        pull_result = pull_latest_navigation_config()
        if not pull_result['success']:
            print(f"[@route:navigation_config:get_navigation_tree] Warning: Git pull failed: {pull_result.get('error')}")
        
        # Load tree data (reading is always allowed, regardless of lock)
        tree_data = load_navigation_tree_from_config(tree_name)
        
        if tree_data is None:
            return jsonify({
                'success': False,
                'error': f'Navigation tree not found: {tree_name}'
            }), 404
        
        # Get lock information
        lock_info = get_navigation_tree_lock_info(tree_name)
        
        print(f"[@route:navigation_config:get_navigation_tree] Successfully loaded tree: {tree_name}")
        
        return jsonify({
            'success': True,
            'tree_name': tree_name,
            'tree_data': tree_data,
            'is_locked': lock_info is not None,
            'lock_info': lock_info
        })
        
    except Exception as e:
        print(f"[@route:navigation_config:get_navigation_tree] Error loading tree {tree_name}: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to load navigation tree: {str(e)}'
        }), 500


# =====================================================
# NAVIGATION TREE LOCKING
# =====================================================

@navigation_config_bp.route('/api/navigation/config/trees/<tree_name>/lock', methods=['POST'])
def lock_tree(tree_name):
    """Lock a navigation tree for editing."""
    try:
        data = request.get_json() or {}
        session_id = data.get('session_id', str(uuid.uuid4()))
        
        print(f"[@route:navigation_config:lock_tree] Attempting to lock tree: {tree_name} for session: {session_id}")
        
        # Attempt to lock the tree
        lock_success = lock_navigation_tree(tree_name, session_id)
        
        if lock_success:
            return jsonify({
                'success': True,
                'message': f'Navigation tree locked successfully: {tree_name}',
                'tree_name': tree_name,
                'session_id': session_id,
                'locked_at': datetime.now().isoformat()
            })
        else:
            # Get current lock info
            lock_info = get_navigation_tree_lock_info(tree_name)
            return jsonify({
                'success': False,
                'error': f'Navigation tree is already locked by another session',
                'tree_name': tree_name,
                'current_lock': lock_info
            }), 409  # Conflict
        
    except Exception as e:
        print(f"[@route:navigation_config:lock_tree] Error locking tree {tree_name}: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to lock navigation tree: {str(e)}'
        }), 500


@navigation_config_bp.route('/api/navigation/config/trees/<tree_name>/unlock', methods=['POST'])
def unlock_tree(tree_name):
    """Unlock a navigation tree."""
    try:
        data = request.get_json() or {}
        session_id = data.get('session_id')
        
        print(f"[@route:navigation_config:unlock_tree] Attempting to unlock tree: {tree_name}")
        
        # Attempt to unlock the tree
        unlock_success = unlock_navigation_tree(tree_name, session_id)
        
        if unlock_success:
            return jsonify({
                'success': True,
                'message': f'Navigation tree unlocked successfully: {tree_name}',
                'tree_name': tree_name
            })
        else:
            return jsonify({
                'success': False,
                'error': f'Failed to unlock navigation tree (not locked by this session)',
                'tree_name': tree_name
            }), 403  # Forbidden
        
    except Exception as e:
        print(f"[@route:navigation_config:unlock_tree] Error unlocking tree {tree_name}: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to unlock navigation tree: {str(e)}'
        }), 500


# =====================================================
# NAVIGATION TREE SAVING (REQUIRES LOCK)
# =====================================================

@navigation_config_bp.route('/api/navigation/config/trees/<tree_name>', methods=['PUT'])
def save_navigation_tree(tree_name):
    """Save a navigation tree to config file. Requires the tree to be locked by the same session."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        session_id = data.get('session_id')
        tree_data = data.get('tree_data')
        
        if not tree_data:
            return jsonify({
                'success': False,
                'error': 'No tree data provided'
            }), 400
        
        print(f"[@route:navigation_config:save_navigation_tree] Attempting to save tree: {tree_name}")
        
        # Check if tree is locked
        if not is_navigation_tree_locked(tree_name):
            return jsonify({
                'success': False,
                'error': 'Navigation tree must be locked before saving'
            }), 403
        
        # Check if locked by this session
        lock_info = get_navigation_tree_lock_info(tree_name)
        if lock_info and lock_info.get('locked_by') != session_id:
            return jsonify({
                'success': False,
                'error': 'Navigation tree is locked by another session',
                'current_lock': lock_info
            }), 403
        
        # Validate tree data structure
        if not validate_navigation_tree_structure(tree_data):
            return jsonify({
                'success': False,
                'error': 'Invalid navigation tree structure (must have nodes and edges arrays)'
            }), 400
        
        # Create backup before saving
        backup_path = backup_navigation_tree_config(tree_name, "pre_save")
        if backup_path:
            print(f"[@route:navigation_config:save_navigation_tree] Created backup: {backup_path}")
        
        # Save tree to config file
        save_success = save_navigation_tree_to_config(tree_name, tree_data)
        
        if not save_success:
            return jsonify({
                'success': False,
                'error': 'Failed to save navigation tree to config file'
            }), 500
        
        # Perform git operations
        git_result = perform_navigation_git_operations(tree_name, "save")
        
        print(f"[@route:navigation_config:save_navigation_tree] Successfully saved tree: {tree_name}")
        
        return jsonify({
            'success': True,
            'message': f'Navigation tree saved successfully: {tree_name}',
            'tree_name': tree_name,
            'git_result': git_result,
            'backup_created': backup_path is not None
        })
        
    except Exception as e:
        print(f"[@route:navigation_config:save_navigation_tree] Error saving tree {tree_name}: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to save navigation tree: {str(e)}'
        }), 500


# =====================================================
# LOCK MANAGEMENT AND STATUS
# =====================================================

@navigation_config_bp.route('/api/navigation/config/locks', methods=['GET'])
def get_all_locks():
    """Get all currently locked navigation trees."""
    try:
        print(f"[@route:navigation_config:get_all_locks] Getting all navigation tree locks")
        
        # Clean up expired locks first
        cleaned_count = cleanup_expired_navigation_locks()
        
        # Get all locked trees
        locked_trees = get_all_locked_navigation_trees()
        
        return jsonify({
            'success': True,
            'locked_trees': locked_trees,
            'total_locked': len(locked_trees),
            'expired_cleaned': cleaned_count
        })
        
    except Exception as e:
        print(f"[@route:navigation_config:get_all_locks] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to get lock information: {str(e)}'
        }), 500


@navigation_config_bp.route('/api/navigation/config/locks/cleanup', methods=['POST'])
def cleanup_locks():
    """Manually clean up expired navigation tree locks."""
    try:
        data = request.get_json() or {}
        timeout_seconds = data.get('timeout_seconds', 1800)  # Default 30 minutes
        
        print(f"[@route:navigation_config:cleanup_locks] Cleaning up locks older than {timeout_seconds} seconds")
        
        cleaned_count = cleanup_expired_navigation_locks(timeout_seconds)
        
        return jsonify({
            'success': True,
            'message': f'Cleaned up {cleaned_count} expired locks',
            'cleaned_count': cleaned_count
        })
        
    except Exception as e:
        print(f"[@route:navigation_config:cleanup_locks] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to cleanup locks: {str(e)}'
        }), 500


# =====================================================
# GIT STATUS AND OPERATIONS
# =====================================================

@navigation_config_bp.route('/api/navigation/config/git/status', methods=['GET'])
def get_git_status():
    """Get git status for navigation config directory."""
    try:
        print(f"[@route:navigation_config:get_git_status] Checking git status for navigation config")
        
        git_status = check_navigation_git_status()
        
        return jsonify({
            'success': True,
            'git_status': git_status
        })
        
    except Exception as e:
        print(f"[@route:navigation_config:get_git_status] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to get git status: {str(e)}'
        }), 500


@navigation_config_bp.route('/api/navigation/config/git/pull', methods=['POST'])
def pull_config():
    """Pull latest navigation config changes from git."""
    try:
        print(f"[@route:navigation_config:pull_config] Pulling latest navigation config changes")
        
        pull_result = pull_latest_navigation_config()
        
        return jsonify({
            'success': pull_result['success'],
            'message': pull_result.get('message'),
            'error': pull_result.get('error'),
            'output': pull_result.get('output')
        })
        
    except Exception as e:
        print(f"[@route:navigation_config:pull_config] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to pull config: {str(e)}'
        }), 500 
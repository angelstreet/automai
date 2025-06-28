"""
Navigation Trees API Routes with History Support
"""

from flask import Blueprint, request, jsonify
from src.lib.supabase.navigation_trees_db import (
    save_navigation_tree, get_navigation_tree, get_navigation_trees,
    get_tree_history, restore_tree_version, delete_navigation_tree,
    get_all_trees as get_all_navigation_trees_util
)
from src.lib.supabase.userinterface_db import get_all_userinterfaces
from src.utils.app_utils import DEFAULT_TEAM_ID, DEFAULT_USER_ID, check_supabase, get_team_id

# Debug: Print the DEFAULT_USER_ID value when module loads
print(f'[@route:navigation_trees] DEFAULT_USER_ID loaded: {DEFAULT_USER_ID}')

server_navigation_trees_bp = Blueprint('server_navigation_trees', __name__, url_prefix='/server')

# UserInterface Endpoints
# ========================================

@server_navigation_trees_bp.route('/getAllUserInterfaces', methods=['GET'])
def get_all_user_interfaces():
    """List all userinterfaces for a team"""
    try:
        team_id = request.args.get('team_id', DEFAULT_TEAM_ID)
        
        print(f'[@route:navigation_trees:list_userinterfaces] Listing userinterfaces for team: {team_id}')
        
        userinterfaces = get_all_userinterfaces(team_id)
        
        return jsonify({
            'success': True,
            'userinterfaces': userinterfaces,
            'count': len(userinterfaces)
        })
    
    except Exception as e:
        print(f'[@route:navigation_trees:list_userinterfaces] ERROR: {e}')
        return jsonify({
            'success': False,
            'message': f'Server error: {str(e)}',
            'userinterfaces': []
        }), 500

# Lock Management Endpoints
# ========================================

@server_navigation_trees_bp.route('/navigationTrees/lockStatus', methods=['GET'])
def check_lock_status():
    """Check lock status for a navigation tree by userinterface_id"""
    try:
        userinterface_id = request.args.get('userinterface_id')
        
        if not userinterface_id:
            return jsonify({
                'success': False,
                'message': 'Missing required parameter: userinterface_id'
            }), 400
        
        # For now, always return not locked (implement actual locking later)
        return jsonify({
            'success': True,
            'lock': None
        })
    
    except Exception as e:
        print(f'[@route:navigation_trees:check_lock_status] ERROR: {e}')
        return jsonify({
            'success': False,
            'message': f'Server error: {str(e)}'
        }), 500

@server_navigation_trees_bp.route('/navigationTrees/lockAcquire', methods=['POST'])
def acquire_lock():
    """Acquire lock for a navigation tree by userinterface_id"""
    try:
        data = request.get_json()
        
        userinterface_id = data.get('userinterface_id')
        session_id = data.get('session_id')
        user_id = data.get('user_id')
        
        if not userinterface_id or not session_id or not user_id:
            return jsonify({
                'success': False,
                'message': 'Missing required parameters: userinterface_id, session_id, user_id'
            }), 400
        
        # For now, always grant lock (implement actual locking later)
        lock_data = {
            'locked_by': user_id,
            'session_id': session_id,
            'locked_at': 'now',
            'userinterface_id': userinterface_id
        }
        
        return jsonify({
            'success': True,
            'message': 'Lock acquired successfully',
            'lock': lock_data
        })
    
    except Exception as e:
        print(f'[@route:navigation_trees:acquire_lock] ERROR: {e}')
        return jsonify({
            'success': False,
            'message': f'Server error: {str(e)}'
        }), 500

@server_navigation_trees_bp.route('/navigationTrees/lockRelease', methods=['POST'])
def release_lock():
    """Release lock for a navigation tree by userinterface_id"""
    try:
        data = request.get_json()
        
        userinterface_id = data.get('userinterface_id')
        session_id = data.get('session_id')
        user_id = data.get('user_id')
        
        if not userinterface_id or not session_id or not user_id:
            return jsonify({
                'success': False,
                'message': 'Missing required parameters: userinterface_id, session_id, user_id'
            }), 400
        
        # For now, always succeed (implement actual locking later)
        return jsonify({
            'success': True,
            'message': 'Lock released successfully'
        })
    
    except Exception as e:
        print(f'[@route:navigation_trees:release_lock] ERROR: {e}')
        return jsonify({
            'success': False,
            'message': f'Server error: {str(e)}'
        }), 500

# Tree CRUD Endpoints
# ========================================

@server_navigation_trees_bp.route('/navigationTrees/saveTree', methods=['POST'])
def save_tree():
    """Save navigation tree with history"""
    try:
        data = request.get_json()
        
        # Extract required fields
        name = data.get('name')
        userinterface_id = data.get('userinterface_id')
        tree_data = data.get('tree_data', {})
        
        if not name or not userinterface_id:
            return jsonify({
                'success': False,
                'message': 'Missing required fields: name, userinterface_id'
            }), 400
        
        # Optional fields
        team_id = data.get('team_id', DEFAULT_TEAM_ID)
        description = data.get('description')
        creator_id = DEFAULT_USER_ID  # Always use hardcoded default user ID
        modification_type = data.get('modification_type', 'update')
        changes_summary = data.get('changes_summary')
        
        print(f'[@route:navigation_trees:save_tree] Saving tree: {name}')
        print(f'[@route:navigation_trees:save_tree] Parameters:')
        print(f'  - userinterface_id: {userinterface_id} (type: {type(userinterface_id)})')
        print(f'  - team_id: {team_id} (type: {type(team_id)})')
        print(f'  - creator_id: {creator_id} (type: {type(creator_id)})')
        
        success, message, tree_record = save_navigation_tree(
            name=name,
            userinterface_id=userinterface_id,
            team_id=team_id,
            tree_data=tree_data,
            description=description,
            creator_id=creator_id,
            modification_type=modification_type,
            changes_summary=changes_summary
        )
        
        if success:
            return jsonify({
                'success': True,
                'message': message,
                'tree': tree_record
            })
        else:
            return jsonify({
                'success': False,
                'message': message
            }), 500
    
    except Exception as e:
        print(f'[@route:navigation_trees:save_tree] ERROR: {e}')
        return jsonify({
            'success': False,
            'message': f'Server error: {str(e)}'
        }), 500

@server_navigation_trees_bp.route('/navigationTrees/getTree/<tree_id>', methods=['GET'])
def get_tree(tree_id):
    """Get navigation tree by ID"""
    try:
        team_id = request.args.get('team_id', DEFAULT_TEAM_ID)
        
        print(f'[@route:navigation_trees:get_tree] Fetching tree: {tree_id}')
        
        success, message, tree = get_navigation_tree(tree_id, team_id)
        
        if success:
            return jsonify({
                'success': True,
                'tree': tree
            })
        else:
            return jsonify({
                'success': False,
                'message': message
            }), 404 if 'not found' in message.lower() else 500
    
    except Exception as e:
        print(f'[@route:navigation_trees:get_tree] ERROR: {e}')
        return jsonify({
            'success': False,
            'message': f'Server error: {str(e)}'
        }), 500

@server_navigation_trees_bp.route('/navigationTrees/getTreeByName/<tree_name>', methods=['GET'])
def get_tree_by_name(tree_name):
    """Get navigation tree by name - optimized for fastest lookup"""
    try:
        # Check if Supabase is available
        error_response = check_supabase()
        if error_response:
            return error_response
        
        team_id = get_team_id()
        
        print(f'[@route:navigation_trees:get_tree_by_name] Fetching tree by name: {tree_name}')
        
        # Get all trees and find the one with matching name
        all_trees = get_all_navigation_trees_util(team_id)
        tree = next((tree for tree in all_trees if tree['name'] == tree_name), None)
        
        if tree:
            print(f'[@route:navigation_trees:get_tree_by_name] Found tree: {tree["id"]} with name: {tree_name}')
            return jsonify({
                'success': True,
                'tree': tree
            })
        else:
            print(f'[@route:navigation_trees:get_tree_by_name] Tree not found with name: {tree_name}')
            return jsonify({
                'success': False,
                'message': f'Navigation tree with name "{tree_name}" not found',
                'code': 'NOT_FOUND'
            }), 404
            
    except Exception as e:
        print(f'[@route:navigation_trees:get_tree_by_name] ERROR: {e}')
        return jsonify({
            'success': False,
            'message': f'Server error: {str(e)}'
        }), 500

@server_navigation_trees_bp.route('/navigationTrees/getAllTrees', methods=['GET'])
def get_all_trees():
    """List navigation trees for a team"""
    try:
        team_id = request.args.get('team_id', DEFAULT_TEAM_ID)
        userinterface_id = request.args.get('userinterface_id')
        
        print(f'[@route:navigation_trees:list_trees] Listing trees for team: {team_id}')
        
        success, message, trees = get_navigation_trees(team_id, userinterface_id)
        
        if success:
            return jsonify({
                'success': True,
                'trees': trees,
                'count': len(trees)
            })
        else:
            return jsonify({
                'success': False,
                'message': message,
                'trees': []
            }), 500
    
    except Exception as e:
        print(f'[@route:navigation_trees:list_trees] ERROR: {e}')
        return jsonify({
            'success': False,
            'message': f'Server error: {str(e)}',
            'trees': []
        }), 500

@server_navigation_trees_bp.route('/navigationTrees/getHistory/<tree_id>', methods=['GET'])
def get_history(tree_id):
    """Get history for a navigation tree"""
    try:
        team_id = request.args.get('team_id', DEFAULT_TEAM_ID)
        limit = int(request.args.get('limit', 50))
        
        print(f'[@route:navigation_trees:get_history] Fetching history for tree: {tree_id}')
        
        success, message, history = get_tree_history(tree_id, team_id, limit)
        
        if success:
            return jsonify({
                'success': True,
                'history': history,
                'count': len(history)
            })
        else:
            return jsonify({
                'success': False,
                'message': message,
                'history': []
            }), 500
    
    except Exception as e:
        print(f'[@route:navigation_trees:get_history] ERROR: {e}')
        return jsonify({
            'success': False,
            'message': f'Server error: {str(e)}',
            'history': []
        }), 500

@server_navigation_trees_bp.route('/navigationTrees/restoreVersion', methods=['POST'])
def restore_version():
    """Restore navigation tree to specific version"""
    try:
        data = request.get_json()
        
        tree_id = data.get('tree_id')
        version_number = data.get('version_number')
        
        if not tree_id or version_number is None:
            return jsonify({
                'success': False,
                'message': 'Missing required fields: tree_id, version_number'
            }), 400
        
        team_id = data.get('team_id', DEFAULT_TEAM_ID)
        restored_by = data.get('restored_by')
        
        print(f'[@route:navigation_trees:restore_version] Restoring tree {tree_id} to version {version_number}')
        
        success, message, restored_tree = restore_tree_version(
            tree_id, version_number, team_id, restored_by
        )
        
        if success:
            return jsonify({
                'success': True,
                'message': message,
                'tree': restored_tree
            })
        else:
            return jsonify({
                'success': False,
                'message': message
            }), 404 if 'not found' in message.lower() else 500
    
    except Exception as e:
        print(f'[@route:navigation_trees:restore_version] ERROR: {e}')
        return jsonify({
            'success': False,
            'message': f'Server error: {str(e)}'
        }), 500

@server_navigation_trees_bp.route('/navigationTrees/deleteTree/<tree_id>', methods=['DELETE'])
def delete_tree(tree_id):
    """Delete navigation tree"""
    try:
        team_id = request.args.get('team_id', DEFAULT_TEAM_ID)
        deleted_by = request.args.get('deleted_by')
        
        print(f'[@route:navigation_trees:delete_tree] Deleting tree: {tree_id}')
        
        success, message = delete_navigation_tree(tree_id, team_id, deleted_by)
        
        if success:
            return jsonify({
                'success': True,
                'message': message
            })
        else:
            return jsonify({
                'success': False,
                'message': message
            }), 404 if 'not found' in message.lower() else 500
    
    except Exception as e:
        print(f'[@route:navigation_trees:delete_tree] ERROR: {e}')
        return jsonify({
            'success': False,
            'message': f'Server error: {str(e)}'
        }), 500

# Health check endpoint
@server_navigation_trees_bp.route('/navigationTrees/healthCheck', methods=['GET'])
def health_check():
    """Health check for navigation trees service"""
    return jsonify({
        'success': True,
        'service': 'navigation_trees',
        'status': 'healthy'
    }) 
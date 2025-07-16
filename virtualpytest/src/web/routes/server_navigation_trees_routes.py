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
        userinterface_id = data.get('userinterface_id')
        tree_data = data.get('tree_data', {})
        
        if not userinterface_id:
            return jsonify({
                'success': False,
                'message': 'Missing required field: userinterface_id'
            }), 400
        
        # Optional fields
        team_id = data.get('team_id', DEFAULT_TEAM_ID)
        description = data.get('description')
        creator_id = DEFAULT_USER_ID  # Always use hardcoded default user ID
        modification_type = data.get('modification_type', 'update')
        changes_summary = data.get('changes_summary')
        
        print(f'[@route:navigation_trees:save_tree] Saving tree for userinterface_id: {userinterface_id}')
        print(f'[@route:navigation_trees:save_tree] Parameters:')
        print(f'  - userinterface_id: {userinterface_id} (type: {type(userinterface_id)})')
        print(f'  - team_id: {team_id} (type: {type(team_id)})')
        print(f'  - creator_id: {creator_id} (type: {type(creator_id)})')
        
        success, message, tree_record = save_navigation_tree(
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

@server_navigation_trees_bp.route('/navigationTrees/getTreeByUserInterfaceId/<userinterface_id>', methods=['GET'])
def get_tree_by_userinterface_id(userinterface_id):
    """Get navigation tree by userinterface_id - optimized for fastest lookup"""
    try:
        # Check if Supabase is available
        error_response = check_supabase()
        if error_response:
            return error_response
        
        team_id = get_team_id()
        
        print(f'[@route:navigation_trees:get_tree_by_userinterface_id] Fetching tree by userinterface_id: {userinterface_id}')
        
        # Use the existing function to get trees filtered by userinterface_id
        success, message, trees = get_navigation_trees(team_id, userinterface_id)
        
        if success and trees:
            # Get the raw tree from database (this also populates the cache with resolved objects)
            raw_tree = trees[0]
            tree_id = raw_tree['id']
            tree_name = raw_tree['name']
            
            print(f'[@route:navigation_trees:get_tree_by_userinterface_id] Found tree: {tree_id} for userinterface_id: {userinterface_id}')
            
            # Now get the RESOLVED tree data from cache (with resolved verification objects)
            try:
                from src.web.cache.navigation_cache import get_cached_tree_data
                
                # Try to get resolved tree data from cache
                resolved_tree_data = get_cached_tree_data(tree_id, team_id)
                if not resolved_tree_data:
                    # Fallback: try by tree name
                    resolved_tree_data = get_cached_tree_data(tree_name, team_id)
                if not resolved_tree_data:
                    # Fallback: try by userinterface_id name
                    from src.lib.supabase.userinterface_db import get_userinterface
                    userinterface = get_userinterface(userinterface_id, team_id)
                    if userinterface and userinterface.get('name'):
                        userinterface_name = userinterface['name']
                        resolved_tree_data = get_cached_tree_data(userinterface_name, team_id)
                
                if resolved_tree_data:
                    # Get all metrics in one bulk query
                    from src.lib.supabase.execution_results_db import get_tree_metrics
                    
                    # Collect all node and edge IDs
                    node_ids = [node['id'] for node in resolved_tree_data['nodes']]
                    edge_ids = [edge['id'] for edge in resolved_tree_data['edges']]
                    
                    # Single bulk query for all metrics
                    all_metrics = get_tree_metrics(team_id, node_ids, edge_ids)
                    
                    # Attach metrics to nodes in memory
                    nodes_with_metrics = []
                    for node in resolved_tree_data['nodes']:
                        node_metrics = all_metrics['nodes'].get(node['id'], {'volume': 0, 'success_rate': 0.0, 'avg_execution_time': 0})
                        nodes_with_metrics.append({
                            **node,
                            'data': {
                                **node.get('data', {}),
                                'metrics': node_metrics
                            }
                        })
                    
                    # Attach metrics to edges in memory
                    edges_with_metrics = []
                    for edge in resolved_tree_data['edges']:
                        edge_metrics = all_metrics['edges'].get(edge['id'], {'volume': 0, 'success_rate': 0.0, 'avg_execution_time': 0})
                        edges_with_metrics.append({
                            **edge,
                            'data': {
                                **edge.get('data', {}),
                                'metrics': edge_metrics
                            }
                        })
                    
                    # Return tree with resolved data (verification objects, action objects) and metrics
                    resolved_tree = {
                        **raw_tree,  # Keep database metadata (id, name, created_at, etc.)
                        'metadata': {
                            'nodes': nodes_with_metrics,  # Resolved nodes with verification objects and metrics
                            'edges': edges_with_metrics   # Resolved edges with action objects and metrics
                        }
                    }
                    
                    print(f'[@route:navigation_trees:get_tree_by_userinterface_id] ✅ Returning RESOLVED tree data with {len(resolved_tree_data["nodes"])} nodes and {len(resolved_tree_data["edges"])} edges')
                    
                    return jsonify({
                        'success': True,
                        'tree': resolved_tree
                    })
                else:
                    print(f'[@route:navigation_trees:get_tree_by_userinterface_id] ⚠️ Cache miss - returning raw tree data')
                    # Fallback to raw tree if cache is not available
                    return jsonify({
                        'success': True,
                        'tree': raw_tree
                    })
                    
            except Exception as cache_error:
                print(f'[@route:navigation_trees:get_tree_by_userinterface_id] ⚠️ Cache error: {cache_error} - returning raw tree data')
                # Fallback to raw tree if cache fails
            return jsonify({
                'success': True,
                    'tree': raw_tree
            })
        else:
            print(f'[@route:navigation_trees:get_tree_by_userinterface_id] Tree not found for userinterface_id: {userinterface_id}')
            return jsonify({
                'success': False,
                'message': f'Navigation tree with userinterface_id "{userinterface_id}" not found',
                'code': 'NOT_FOUND'
            }), 404
            
    except Exception as e:
        print(f'[@route:navigation_trees:get_tree_by_userinterface_id] ERROR: {e}')
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
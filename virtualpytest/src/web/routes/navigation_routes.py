"""
Navigation API Routes

This module contains the API endpoints for:
- Navigation trees management
- Navigation nodes and edges management
"""

from flask import Blueprint, request, jsonify
import sys
import os
from datetime import datetime
import uuid

# Add parent directory to path for imports
src_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, src_dir)

# Import from web utils directory
web_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
web_utils_path = os.path.join(web_dir, 'utils')
sys.path.insert(0, web_utils_path)

from navigation_utils import (
    get_all_navigation_trees, get_navigation_tree, create_navigation_tree, 
    update_navigation_tree, delete_navigation_tree, check_navigation_tree_name_exists,
    get_navigation_nodes_and_edges, convert_nodes_and_edges_to_reactflow, convert_reactflow_to_nodes_and_edges,
    save_navigation_nodes_and_edges
)
from userinterface_utils import get_all_userinterfaces, get_userinterface
from .utils import check_supabase, get_team_id

# Create blueprint
navigation_bp = Blueprint('navigation', __name__, url_prefix='/api/navigation')

# =====================================================
# NAVIGATION TREES ENDPOINTS
# =====================================================

@navigation_bp.route('/trees', methods=['GET'])
def get_navigation_trees():
    """Get all navigation trees for a team"""
    # Check if Supabase is available
    error_response = check_supabase()
    if error_response:
        return error_response
    
    from app import supabase_client, DEFAULT_TEAM_ID
    
    try:
        # Get team_id from query params or use default
        team_id = request.args.get('team_id', DEFAULT_TEAM_ID)
        
        # Query navigation trees for the team
        result = supabase_client.table('navigation_trees').select('*').eq('team_id', team_id).execute()
        
        if result.data:
            return jsonify({
                'success': True,
                'data': result.data,
                'count': len(result.data)
            })
        else:
            return jsonify({
                'success': True,
                'data': [],
                'count': 0
            })
            
    except Exception as e:
        print(f"[@api:navigation:get_trees] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to retrieve navigation trees: {str(e)}'
        }), 500

@navigation_bp.route('/trees/<tree_id>', methods=['GET'])
def get_navigation_tree_by_id(tree_id):
    """Get a specific navigation tree by ID"""
    # Check if Supabase is available
    error_response = check_supabase()
    if error_response:
        return error_response
    
    from app import supabase_client, DEFAULT_TEAM_ID
    
    try:
        # Get team_id from query params or use default
        team_id = request.args.get('team_id', DEFAULT_TEAM_ID)
        
        # Query specific navigation tree
        result = supabase_client.table('navigation_trees').select('*').eq('id', tree_id).eq('team_id', team_id).single().execute()
        
        if result.data:
            return jsonify({
                'success': True,
                'data': result.data
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

@navigation_bp.route('/trees', methods=['POST'])
def create_navigation_tree_route():
    """Create a new navigation tree"""
    # Check if Supabase is available
    error_response = check_supabase()
    if error_response:
        return error_response
    
    from app import supabase_client, DEFAULT_TEAM_ID, DEFAULT_USER_ID
    
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        # Validate required fields
        required_fields = ['name', 'tree_data']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        # Prepare navigation tree data
        tree_data = {
            'id': str(uuid.uuid4()),
            'name': data['name'],
            'description': data.get('description', ''),
            'metadata': data['tree_data'],  # Store tree_data in metadata column
            'team_id': data.get('team_id', DEFAULT_TEAM_ID),
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }
        
        # Insert into database
        result = supabase_client.table('navigation_trees').insert(tree_data).execute()
        
        if result.data:
            print(f"[@api:navigation:create_tree] Successfully created navigation tree: {tree_data['id']}")
            return jsonify({
                'success': True,
                'data': result.data[0],
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

@navigation_bp.route('/trees/<tree_id>', methods=['PUT'])
def update_navigation_tree_route(tree_id):
    """Update an existing navigation tree"""
    # Check if Supabase is available
    error_response = check_supabase()
    if error_response:
        return error_response
    
    from app import supabase_client, DEFAULT_TEAM_ID
    
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        # Get team_id from data or use default
        team_id = data.get('team_id', DEFAULT_TEAM_ID)
        
        # Prepare update data
        update_data = {
            'updated_at': datetime.utcnow().isoformat()
        }
        
        # Add fields that can be updated
        updatable_fields = ['name', 'description', 'metadata']
        for field in updatable_fields:
            if field in data:
                update_data[field] = data[field]
                
        # Special handling for tree_data to store in metadata
        if 'tree_data' in data:
            update_data['metadata'] = data['tree_data']
        
        # Update in database
        result = supabase_client.table('navigation_trees').update(update_data).eq('id', tree_id).eq('team_id', team_id).execute()
        
        if result.data:
            print(f"[@api:navigation:update_tree] Successfully updated navigation tree: {tree_id}")
            return jsonify({
                'success': True,
                'data': result.data[0],
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

@navigation_bp.route('/trees/<tree_id>', methods=['DELETE'])
def delete_navigation_tree_route(tree_id):
    """Delete a navigation tree"""
    # Check if Supabase is available
    error_response = check_supabase()
    if error_response:
        return error_response
    
    from app import supabase_client, DEFAULT_TEAM_ID
    
    try:
        # Get team_id from query params or use default
        team_id = request.args.get('team_id', DEFAULT_TEAM_ID)
        
        # Delete from database
        result = supabase_client.table('navigation_trees').delete().eq('id', tree_id).eq('team_id', team_id).execute()
        
        if result.data:
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

@navigation_bp.route('/trees/by-name/<tree_name>', methods=['GET'])
def get_navigation_tree_by_name(tree_name):
    """Get a navigation tree by name"""
    # Check if Supabase is available
    error_response = check_supabase()
    if error_response:
        return error_response
    
    from app import supabase_client, DEFAULT_TEAM_ID
    
    try:
        # Get team_id from query params or use default
        team_id = request.args.get('team_id', DEFAULT_TEAM_ID)
        
        # Query navigation tree by name, but don't use .single() to avoid the error
        result = supabase_client.table('navigation_trees').select('*').eq('name', tree_name).eq('team_id', team_id).execute()
        
        # Check if any data was returned
        if result.data and len(result.data) > 0:
            print(f"[@api:navigation:get_tree_by_name] Found tree: {result.data[0]['id']} with name: {tree_name}")
            return jsonify({
                'success': True,
                'data': result.data[0]  # Return the first matching tree
            })
        else:
            # Return a proper 404 with helpful message
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

@navigation_bp.route('/trees/by-id-and-team/<tree_id>/<team_id>', methods=['GET'])
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
    """Get a complete navigation tree with nodes and edges from database"""
    error_response = check_supabase()
    if error_response:
        return error_response
    
    team_id = get_team_id()
    
    try:
        # Get the tree info first
        tree_info = get_navigation_tree(tree_id, team_id)
        
        if not tree_info:
            return jsonify({
                'success': False,
                'error': 'Navigation tree not found'
            }), 404
        
        # Get nodes and edges from database
        nodes, edges = get_navigation_nodes_and_edges(tree_id, team_id)
        
        print(f"[@api:navigation:get_complete_tree] Retrieved {len(nodes)} nodes and {len(edges)} edges from database")
        
        # Convert to ReactFlow format
        reactflow_data = convert_nodes_and_edges_to_reactflow(nodes, edges)
        
        # Get existing metadata (ReactFlow format) from tree
        existing_metadata = tree_info.get('metadata', {})
        
        # If we have database nodes/edges, use them; otherwise use metadata
        if nodes or edges:
            print(f"[@api:navigation:get_complete_tree] Using database nodes and edges")
            tree_data = reactflow_data
        else:
            print(f"[@api:navigation:get_complete_tree] Using metadata ReactFlow data")
            tree_data = existing_metadata
        
        # Ensure we have the basic structure
        if not isinstance(tree_data, dict):
            tree_data = {'nodes': [], 'edges': []}
        if 'nodes' not in tree_data:
            tree_data['nodes'] = []
        if 'edges' not in tree_data:
            tree_data['edges'] = []
        
        response_data = {
            'success': True,
            'tree_info': tree_info,
            'tree_data': tree_data
        }
        
        print(f"[@api:navigation:get_complete_tree] Returning tree with {len(tree_data.get('nodes', []))} nodes and {len(tree_data.get('edges', []))} edges")
        return jsonify(response_data)
        
    except Exception as e:
        print(f"[@api:navigation:get_complete_tree] Error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@navigation_bp.route('/trees/<tree_id>/complete', methods=['PUT'])
def save_complete_navigation_tree(tree_id):
    """Save complete navigation tree data to both metadata and database tables"""
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
        
        # First, save to metadata field for fast loading
        metadata_update_success = update_navigation_tree(tree_id, {'metadata': tree_data}, team_id)
        
        if not metadata_update_success:
            return jsonify({
                'success': False,
                'error': 'Failed to update tree metadata'
            }), 500
        
        # Convert ReactFlow data to database format and save to tables
        db_nodes, db_edges = convert_reactflow_to_nodes_and_edges(tree_data, tree_id)
        
        # Save to database tables
        db_save_success = save_navigation_nodes_and_edges(tree_id, db_nodes, db_edges)
        
        if not db_save_success:
            print(f"[@api:navigation:save_complete_tree] Warning: Failed to save to database tables, but metadata was saved")
        
        print(f"[@api:navigation:save_complete_tree] Successfully saved tree {tree_id}")
        return jsonify({
            'success': True,
            'message': 'Navigation tree saved successfully',
            'metadata_saved': metadata_update_success,
            'database_saved': db_save_success
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
            return jsonify({'error': 'User interface not found or access denied'}), 404
            
        # Get the root navigation tree for this user interface
        from app import supabase_client
        root_tree_result = supabase_client.table('navigation_trees').select('*').eq('userinterface_id', interface_id).eq('is_root', True).eq('team_id', team_id).limit(1).execute()
        root_tree = None
        if root_tree_result.data and len(root_tree_result.data) > 0:
            root_tree = root_tree_result.data[0]
            print(f"[@api:navigation_routes:get_userinterface_with_root] Found root tree for userinterface {interface_id}: {root_tree['id']}")
        else:
            print(f"[@api:navigation_routes:get_userinterface_with_root] No root tree found for userinterface {interface_id}")
        
        return jsonify({
            **userinterface,
            'root_tree': root_tree
        }), 200
    except Exception as e:
        print(f"[@api:navigation_routes:get_userinterface_with_root] ERROR: Failed to fetch userinterface: {str(e)}")
        return jsonify({'error': str(e)}), 500 
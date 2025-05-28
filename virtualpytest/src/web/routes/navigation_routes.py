"""
Navigation API Routes

This module contains the API endpoints for:
- Navigation trees management
- Navigation screens management  
- Navigation links management
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
    get_navigation_screens, create_navigation_screen, update_navigation_screen, delete_navigation_screen,
    get_navigation_links, create_navigation_link, update_navigation_link, delete_navigation_link,
    get_tree_with_screens_and_links
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
def get_navigation_tree(tree_id):
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
def create_navigation_tree():
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
            'device_type': data.get('device_type', 'generic'),
            'tree_data': data['tree_data'],  # This should contain nodes and edges
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
def update_navigation_tree(tree_id):
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
        updatable_fields = ['name', 'description', 'device_type', 'tree_data']
        for field in updatable_fields:
            if field in data:
                update_data[field] = data[field]
        
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
def delete_navigation_tree(tree_id):
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
        
        # Query navigation tree by name
        result = supabase_client.table('navigation_trees').select('*').eq('name', tree_name).eq('team_id', team_id).single().execute()
        
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
        print(f"[@api:navigation:get_tree_by_name] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to retrieve navigation tree: {str(e)}'
        }), 500

@navigation_bp.route('/trees/device-types', methods=['GET'])
def get_device_types():
    """Get all available device types for navigation trees"""
    try:
        # Return common device types used in navigation trees
        device_types = [
            'android_phone',
            'firetv', 
            'appletv',
            'stb_eos',
            'linux',
            'windows',
            'stb',
            'generic'
        ]
        
        return jsonify({
            'success': True,
            'data': device_types
        })
        
    except Exception as e:
        print(f"[@api:navigation:get_device_types] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to retrieve device types: {str(e)}'
        }), 500

# =====================================================
# NAVIGATION SCREENS ENDPOINTS
# =====================================================

@navigation_bp.route('/trees/<tree_id>/screens', methods=['GET', 'POST'])
def navigation_screens(tree_id):
    """Navigation screens management endpoint"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        # Verify tree exists and belongs to team
        tree = get_navigation_tree(tree_id, team_id)
        if not tree:
            return jsonify({'error': 'Navigation tree not found or access denied'}), 404
            
        if request.method == 'GET':
            level = request.args.get('level', type=int)
            screens = get_navigation_screens(tree_id, level)
            return jsonify(screens)
            
        elif request.method == 'POST':
            screen_data = request.json
            
            # Validate required fields
            if not screen_data.get('screen_name'):
                return jsonify({'error': 'Screen name is required'}), 400
            
            # Create the navigation screen
            created_screen = create_navigation_screen(screen_data, tree_id, tree['userinterface_id'])
            if created_screen:
                return jsonify({'status': 'success', 'screen': created_screen}), 201
            else:
                return jsonify({'error': 'Failed to create navigation screen'}), 500
                
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@navigation_bp.route('/screens/<screen_id>', methods=['GET', 'PUT', 'DELETE'])
def navigation_screen(screen_id):
    """Individual navigation screen management endpoint"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        if request.method == 'GET':
            # Get screen and verify access through tree ownership
            screens = get_navigation_screens(None)  # This will need to be modified to get single screen
            screen = next((s for s in screens if s['id'] == screen_id), None)
            if screen:
                # Verify tree belongs to team
                tree = get_navigation_tree(screen['tree_id'], team_id)
                if tree:
                    return jsonify(screen)
                else:
                    return jsonify({'error': 'Access denied'}), 403
            else:
                return jsonify({'error': 'Navigation screen not found'}), 404
                
        elif request.method == 'PUT':
            screen_data = request.json
            
            # Validate required fields
            if not screen_data.get('screen_name'):
                return jsonify({'error': 'Screen name is required'}), 400
            
            # Update the navigation screen
            updated_screen = update_navigation_screen(screen_id, screen_data)
            if updated_screen:
                return jsonify({'status': 'success', 'screen': updated_screen})
            else:
                return jsonify({'error': 'Navigation screen not found or failed to update'}), 404
                
        elif request.method == 'DELETE':
            success = delete_navigation_screen(screen_id)
            if success:
                return jsonify({'status': 'success'})
            else:
                return jsonify({'error': 'Navigation screen not found or failed to delete'}), 404
                
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# =====================================================
# NAVIGATION LINKS ENDPOINTS
# =====================================================

@navigation_bp.route('/trees/<tree_id>/links', methods=['GET', 'POST'])
def navigation_links(tree_id):
    """Navigation links management endpoint"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        # Verify tree exists and belongs to team
        tree = get_navigation_tree(tree_id, team_id)
        if not tree:
            return jsonify({'error': 'Navigation tree not found or access denied'}), 404
            
        if request.method == 'GET':
            links = get_navigation_links(tree_id)
            return jsonify(links)
            
        elif request.method == 'POST':
            link_data = request.json
            
            # Validate required fields
            if not link_data.get('source_screen_id'):
                return jsonify({'error': 'Source screen ID is required'}), 400
                
            if not link_data.get('target_screen_id'):
                return jsonify({'error': 'Target screen ID is required'}), 400
                
            if not link_data.get('link_type'):
                return jsonify({'error': 'Link type is required'}), 400
            
            # Validate link type
            if link_data['link_type'] not in ['sibling', 'parent_child']:
                return jsonify({'error': 'Link type must be either "sibling" or "parent_child"'}), 400
            
            # Validate that at least one navigation key is provided
            if not link_data.get('go_key') and not link_data.get('comeback_key'):
                return jsonify({'error': 'At least one navigation key (go_key or comeback_key) must be provided'}), 400
            
            # Create the navigation link
            created_link = create_navigation_link(link_data, tree_id, tree['userinterface_id'])
            if created_link:
                return jsonify({'status': 'success', 'link': created_link}), 201
            else:
                return jsonify({'error': 'Failed to create navigation link'}), 500
                
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@navigation_bp.route('/links/<link_id>', methods=['GET', 'PUT', 'DELETE'])
def navigation_link(link_id):
    """Individual navigation link management endpoint"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        if request.method == 'GET':
            # Get all links and find the specific one (this could be optimized)
            # For now, we'll need to get the tree_id first
            return jsonify({'error': 'Get single link not implemented yet'}), 501
                
        elif request.method == 'PUT':
            link_data = request.json
            
            # Validate required fields
            if not link_data.get('source_screen_id'):
                return jsonify({'error': 'Source screen ID is required'}), 400
                
            if not link_data.get('target_screen_id'):
                return jsonify({'error': 'Target screen ID is required'}), 400
                
            if not link_data.get('link_type'):
                return jsonify({'error': 'Link type is required'}), 400
            
            # Validate link type
            if link_data['link_type'] not in ['sibling', 'parent_child']:
                return jsonify({'error': 'Link type must be either "sibling" or "parent_child"'}), 400
            
            # Validate that at least one navigation key is provided
            if not link_data.get('go_key') and not link_data.get('comeback_key'):
                return jsonify({'error': 'At least one navigation key (go_key or comeback_key) must be provided'}), 400
            
            # Update the navigation link
            updated_link = update_navigation_link(link_id, link_data)
            if updated_link:
                return jsonify({'status': 'success', 'link': updated_link})
            else:
                return jsonify({'error': 'Navigation link not found or failed to update'}), 404
                
        elif request.method == 'DELETE':
            success = delete_navigation_link(link_id)
            if success:
                return jsonify({'status': 'success'})
            else:
                return jsonify({'error': 'Navigation link not found or failed to delete'}), 404
                
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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
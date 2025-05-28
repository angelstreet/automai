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
navigation_bp = Blueprint('navigation', __name__)

# =====================================================
# NAVIGATION TREES ENDPOINTS
# =====================================================

@navigation_bp.route('/api/navigation/trees', methods=['GET', 'POST'])
def navigation_trees():
    """Navigation trees management endpoint"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        if request.method == 'GET':
            trees = get_all_navigation_trees(team_id)
            return jsonify(trees)
            
        elif request.method == 'POST':
            tree_data = request.json
            
            # Validate required fields
            if not tree_data.get('name'):
                return jsonify({'error': 'Name is required'}), 400
                
            if not tree_data.get('userinterface_id'):
                return jsonify({'error': 'User interface ID is required'}), 400
            
            # Validate that the user interface exists and belongs to the team
            userinterface = get_userinterface(tree_data['userinterface_id'], team_id)
            if not userinterface:
                return jsonify({'error': 'User interface not found or access denied'}), 404
            
            # Check for duplicate names within the same user interface
            if check_navigation_tree_name_exists(tree_data['name'], tree_data['userinterface_id']):
                return jsonify({'error': 'A navigation tree with this name already exists for this user interface'}), 400
            
            # Create the navigation tree
            created_tree = create_navigation_tree(tree_data, team_id)
            if created_tree:
                return jsonify({'status': 'success', 'tree': created_tree}), 201
            else:
                return jsonify({'error': 'Failed to create navigation tree'}), 500
                
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@navigation_bp.route('/api/navigation/trees/<tree_id>', methods=['GET', 'PUT', 'DELETE'])
def navigation_tree(tree_id):
    """Individual navigation tree management endpoint"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        if request.method == 'GET':
            # Check if we want the complete tree with screens and links
            include_details = request.args.get('include_details', 'false').lower() == 'true'
            level = request.args.get('level', type=int)
            
            if include_details:
                tree_data = get_tree_with_screens_and_links(tree_id, team_id, level)
                if tree_data:
                    return jsonify(tree_data)
                else:
                    return jsonify({'error': 'Navigation tree not found'}), 404
            else:
                tree = get_navigation_tree(tree_id, team_id)
                if tree:
                    return jsonify(tree)
                else:
                    return jsonify({'error': 'Navigation tree not found'}), 404
                    
        elif request.method == 'PUT':
            tree_data = request.json
            
            # Validate required fields
            if not tree_data.get('name'):
                return jsonify({'error': 'Name is required'}), 400
                
            if not tree_data.get('userinterface_id'):
                return jsonify({'error': 'User interface ID is required'}), 400
            
            # Validate that the user interface exists and belongs to the team
            userinterface = get_userinterface(tree_data['userinterface_id'], team_id)
            if not userinterface:
                return jsonify({'error': 'User interface not found or access denied'}), 404
            
            # Check for duplicate names (excluding current tree)
            if check_navigation_tree_name_exists(tree_data['name'], tree_data['userinterface_id'], tree_id):
                return jsonify({'error': 'A navigation tree with this name already exists for this user interface'}), 400
            
            # Update the navigation tree
            updated_tree = update_navigation_tree(tree_id, tree_data, team_id)
            if updated_tree:
                return jsonify({'status': 'success', 'tree': updated_tree})
            else:
                return jsonify({'error': 'Navigation tree not found or failed to update'}), 404
                
        elif request.method == 'DELETE':
            success = delete_navigation_tree(tree_id, team_id)
            if success:
                return jsonify({'status': 'success'})
            else:
                return jsonify({'error': 'Navigation tree not found or failed to delete'}), 404
                
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# =====================================================
# NAVIGATION SCREENS ENDPOINTS
# =====================================================

@navigation_bp.route('/api/navigation/trees/<tree_id>/screens', methods=['GET', 'POST'])
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

@navigation_bp.route('/api/navigation/screens/<screen_id>', methods=['GET', 'PUT', 'DELETE'])
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

@navigation_bp.route('/api/navigation/trees/<tree_id>/links', methods=['GET', 'POST'])
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

@navigation_bp.route('/api/navigation/links/<link_id>', methods=['GET', 'PUT', 'DELETE'])
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

@navigation_bp.route('/api/navigation/userinterfaces', methods=['GET'])
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
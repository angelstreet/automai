"""
User Interface Management Routes

This module contains the user interface management API endpoints for:
- User interfaces management
- Device compatibility management
"""

from flask import Blueprint, request, jsonify

# Import database functions from src/lib/supabase (uses absolute import)
from src.lib.supabase.userinterface_db import (
    get_all_userinterfaces, 
    get_userinterface, 
    get_userinterface_by_name,
    create_userinterface, 
    delete_userinterface,
    update_userinterface,
    check_userinterface_name_exists
)
from src.lib.supabase.navigation_trees_db import (
    get_root_tree_for_interface
)

from src.utils.app_utils import check_supabase, get_team_id

# Create blueprint
server_userinterface_bp = Blueprint('server_userinterface', __name__, url_prefix='/server/userinterface')

# =====================================================
# USER INTERFACES ENDPOINTS
# =====================================================

@server_userinterface_bp.route('/getAllUserInterfaces', methods=['GET'])
def get_userinterfaces():
    """Get all user interfaces for the team"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        interfaces = get_all_userinterfaces(team_id)
        # Enrich interfaces with root tree information
        enriched_interfaces = []
        for interface in interfaces:
            interface_id = interface.get('id')
            if interface_id:
                # Fetch root tree for this interface
                root_tree = get_root_tree_for_interface(interface_id, team_id)
                if root_tree:
                    interface['root_tree'] = root_tree
            enriched_interfaces.append(interface)
        return jsonify(enriched_interfaces)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@server_userinterface_bp.route('/createUserInterface', methods=['POST'])
def create_userinterface_route():
    """Create a new user interface"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        interface_data = request.json
        
        # Validate required fields
        if not interface_data.get('name'):
            return jsonify({'error': 'Name is required'}), 400
        
        if not interface_data.get('models') or len(interface_data.get('models', [])) == 0:
            return jsonify({'error': 'At least one model must be selected'}), 400
        
        # Check for duplicate names
        if check_userinterface_name_exists(interface_data['name'], team_id):
            return jsonify({'error': 'A user interface with this name already exists'}), 400
        
        # Create the user interface
        created_interface = create_userinterface(interface_data, team_id)
        if created_interface:
            return jsonify({'status': 'success', 'userinterface': created_interface}), 201
        else:
            return jsonify({'error': 'Failed to create user interface'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@server_userinterface_bp.route('/getUserInterface/<interface_id>', methods=['GET'])
def get_userinterface_route(interface_id):
    """Get a specific user interface by ID"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        interface = get_userinterface(interface_id, team_id)
        if interface:
            # Enrich with root tree information
            root_tree = get_root_tree_for_interface(interface_id, team_id)
            if root_tree:
                interface['root_tree'] = root_tree
            return jsonify(interface)
        else:
            return jsonify({'error': 'User interface not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@server_userinterface_bp.route('/getUserInterfaceByName/<interface_name>', methods=['GET'])
def get_userinterface_by_name_route(interface_name):
    """Get a specific user interface by name (for navigation editor)"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        interface = get_userinterface_by_name(interface_name, team_id)
        if interface:
            return jsonify(interface)
        else:
            return jsonify({'error': 'User interface not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@server_userinterface_bp.route('/updateUserInterface/<interface_id>', methods=['PUT'])
def update_userinterface_route(interface_id):
    """Update a specific user interface"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        interface_data = request.json
        
        # Validate required fields
        if not interface_data.get('name'):
            return jsonify({'error': 'Name is required'}), 400
        
        if not interface_data.get('models') or len(interface_data.get('models', [])) == 0:
            return jsonify({'error': 'At least one model must be selected'}), 400
        
        # Check for duplicate names (excluding current interface)
        if check_userinterface_name_exists(interface_data['name'], team_id, interface_id):
            return jsonify({'error': 'A user interface with this name already exists'}), 400
        
        # Update the user interface
        updated_interface = update_userinterface(interface_id, interface_data, team_id)
        if updated_interface:
            return jsonify({'status': 'success', 'userinterface': updated_interface})
        else:
            return jsonify({'error': 'User interface not found or failed to update'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@server_userinterface_bp.route('/deleteUserInterface/<interface_id>', methods=['DELETE'])
def delete_userinterface_route(interface_id):
    """Delete a specific user interface"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        success = delete_userinterface(interface_id, team_id)
        if success:
            return jsonify({'status': 'success'})
        else:
            return jsonify({'error': 'User interface not found or failed to delete'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500 
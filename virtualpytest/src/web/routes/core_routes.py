"""
Core API Routes

This module contains the core API endpoints for:
- Health check
- Test cases management
- Trees management
- Campaigns management
- User interfaces management
"""

from flask import Blueprint, request, jsonify

# Import utility functions
import sys
import os

# Add parent directory to path for imports
src_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, src_dir)  # Insert at beginning to prioritize over local utils

from utils.supabase_utils import (
    get_all_test_cases, get_test_case, save_test_case, delete_test_case,
    get_all_trees, get_tree, save_tree, delete_tree,
    get_all_campaigns, get_campaign, save_campaign, delete_campaign
)

# Import from web utils directory (go up one level from routes to web, then into utils)
web_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
web_utils_path = os.path.join(web_dir, 'utils')
sys.path.insert(0, web_utils_path)
from userinterface_utils import (
    get_all_userinterfaces, get_userinterface, create_userinterface, 
    update_userinterface, delete_userinterface, check_userinterface_name_exists
)
from .utils import check_supabase, get_team_id

# Create blueprint
core_bp = Blueprint('core', __name__)

# Helper functions (these should be imported from a shared module)
def get_user_id():
    """Get user_id from request headers or use default for demo"""
    from app import DEFAULT_USER_ID
    return request.headers.get('X-User-ID', DEFAULT_USER_ID)

# =====================================================
# HEALTH CHECK ENDPOINT
# =====================================================

@core_bp.route('/api/health')
def health():
    """Health check endpoint"""
    from app import supabase_client
    supabase_status = "connected" if supabase_client else "disconnected"
    return jsonify({
        'status': 'ok',
        'supabase': supabase_status,
        'team_id': get_team_id()
    })

# =====================================================
# TEST CASES ENDPOINTS
# =====================================================

@core_bp.route('/api/testcases', methods=['GET', 'POST'])
def testcases():
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    user_id = get_user_id()
    
    try:
        if request.method == 'GET':
            test_cases = get_all_test_cases(team_id)
            return jsonify(test_cases)
        elif request.method == 'POST':
            test_case = request.json
            save_test_case(test_case, team_id, user_id)
            return jsonify({'status': 'success', 'test_id': test_case['test_id']})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@core_bp.route('/api/testcases/<test_id>', methods=['GET', 'PUT', 'DELETE'])
def testcase(test_id):
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    user_id = get_user_id()
    
    try:
        if request.method == 'GET':
            test_case = get_test_case(test_id, team_id)
            return jsonify(test_case if test_case else {})
        elif request.method == 'PUT':
            test_case = request.json
            test_case['test_id'] = test_id
            save_test_case(test_case, team_id, user_id)
            return jsonify({'status': 'success'})
        elif request.method == 'DELETE':
            success = delete_test_case(test_id, team_id)
            if success:
                return jsonify({'status': 'success'})
            else:
                return jsonify({'error': 'Test case not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# =====================================================
# TREES ENDPOINTS
# =====================================================

@core_bp.route('/api/trees', methods=['GET', 'POST'])
def trees():
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    user_id = get_user_id()
    
    try:
        if request.method == 'GET':
            trees = get_all_trees(team_id)
            return jsonify(trees)
        elif request.method == 'POST':
            tree = request.json
            save_tree(tree, team_id, user_id)
            return jsonify({'status': 'success', 'tree_id': tree['tree_id']})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@core_bp.route('/api/trees/<tree_id>', methods=['GET', 'PUT', 'DELETE'])
def tree(tree_id):
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    user_id = get_user_id()
    
    try:
        if request.method == 'GET':
            tree = get_tree(tree_id, team_id)
            return jsonify(tree if tree else {})
        elif request.method == 'PUT':
            tree = request.json
            tree['tree_id'] = tree_id
            save_tree(tree, team_id, user_id)
            return jsonify({'status': 'success'})
        elif request.method == 'DELETE':
            success = delete_tree(tree_id, team_id)
            if success:
                return jsonify({'status': 'success'})
            else:
                return jsonify({'error': 'Tree not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# =====================================================
# CAMPAIGNS ENDPOINTS
# =====================================================

@core_bp.route('/api/campaigns', methods=['GET', 'POST'])
def campaigns():
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    user_id = get_user_id()
    
    try:
        if request.method == 'GET':
            campaigns = get_all_campaigns(team_id)
            return jsonify(campaigns)
        elif request.method == 'POST':
            campaign = request.json
            save_campaign(campaign, team_id, user_id)
            return jsonify({'status': 'success', 'campaign_id': campaign['campaign_id']})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@core_bp.route('/api/campaigns/<campaign_id>', methods=['GET', 'PUT', 'DELETE'])
def campaign(campaign_id):
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    user_id = get_user_id()
    
    try:
        if request.method == 'GET':
            campaign = get_campaign(campaign_id, team_id)
            return jsonify(campaign if campaign else {})
        elif request.method == 'PUT':
            campaign = request.json
            campaign['campaign_id'] = campaign_id
            save_campaign(campaign, team_id, user_id)
            return jsonify({'status': 'success'})
        elif request.method == 'DELETE':
            success = delete_campaign(campaign_id, team_id)
            if success:
                return jsonify({'status': 'success'})
            else:
                return jsonify({'error': 'Campaign not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# =====================================================
# USER INTERFACES ENDPOINTS
# =====================================================

@core_bp.route('/api/userinterfaces', methods=['GET', 'POST'])
def userinterfaces():
    """User Interfaces management endpoint"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        if request.method == 'GET':
            interfaces = get_all_userinterfaces(team_id)
            return jsonify(interfaces)
        elif request.method == 'POST':
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

@core_bp.route('/api/userinterfaces/<interface_id>', methods=['GET', 'PUT', 'DELETE'])
def userinterface(interface_id):
    """Individual user interface management endpoint"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        if request.method == 'GET':
            interface = get_userinterface(interface_id, team_id)
            if interface:
                return jsonify(interface)
            else:
                return jsonify({'error': 'User interface not found'}), 404
                
        elif request.method == 'PUT':
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
                
        elif request.method == 'DELETE':
            success = delete_userinterface(interface_id, team_id)
            if success:
                return jsonify({'status': 'success'})
            else:
                return jsonify({'error': 'User interface not found or failed to delete'}), 404
                
    except Exception as e:
        return jsonify({'error': str(e)}), 500 
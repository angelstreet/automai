"""
Device Management Routes

This module contains the device management API endpoints for:
- Devices management
- Controllers management
- Environment profiles management
"""

from flask import Blueprint, request, jsonify

# Import utility functions
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.supabase_utils import (
    get_all_devices, get_device, save_device, delete_device,
    get_all_controllers, get_controller, save_controller, delete_controller,
    get_all_environment_profiles, get_environment_profile, save_environment_profile, delete_environment_profile
)
from .utils import check_supabase, get_team_id

# Create blueprint
device_bp = Blueprint('device', __name__)

# Helper functions
def get_user_id():
    """Get user_id from request headers or use default for demo"""
    from app import DEFAULT_USER_ID
    return request.headers.get('X-User-ID', DEFAULT_USER_ID)

# =====================================================
# DEVICE MANAGEMENT ENDPOINTS
# =====================================================

@device_bp.route('/api/devices', methods=['GET', 'POST'])
def devices():
    """Device management endpoint"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    user_id = get_user_id()
    
    try:
        if request.method == 'GET':
            devices = get_all_devices(team_id)
            return jsonify(devices)
        elif request.method == 'POST':
            device = request.json
            save_device(device, team_id, user_id)
            return jsonify({'status': 'success', 'device_id': device.get('id')})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@device_bp.route('/api/devices/<device_id>', methods=['GET', 'PUT', 'DELETE'])
def device(device_id):
    """Individual device management endpoint"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    user_id = get_user_id()
    
    try:
        if request.method == 'GET':
            device = get_device(device_id, team_id)
            return jsonify(device if device else {})
        elif request.method == 'PUT':
            device = request.json
            device['id'] = device_id
            save_device(device, team_id, user_id)
            return jsonify({'status': 'success'})
        elif request.method == 'DELETE':
            success = delete_device(device_id, team_id)
            if success:
                return jsonify({'status': 'success'})
            else:
                return jsonify({'error': 'Device not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# =====================================================
# CONTROLLER MANAGEMENT ENDPOINTS
# =====================================================

@device_bp.route('/api/controllers', methods=['GET', 'POST'])
def controllers():
    """Controller management endpoint"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    user_id = get_user_id()
    
    try:
        if request.method == 'GET':
            controllers = get_all_controllers(team_id)
            return jsonify(controllers)
        elif request.method == 'POST':
            controller = request.json
            save_controller(controller, team_id, user_id)
            return jsonify({'status': 'success', 'controller_id': controller.get('id')})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@device_bp.route('/api/controllers/<controller_id>', methods=['GET', 'PUT', 'DELETE'])
def controller(controller_id):
    """Individual controller management endpoint"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    user_id = get_user_id()
    
    try:
        if request.method == 'GET':
            controller = get_controller(controller_id, team_id)
            return jsonify(controller if controller else {})
        elif request.method == 'PUT':
            controller = request.json
            controller['id'] = controller_id
            save_controller(controller, team_id, user_id)
            return jsonify({'status': 'success'})
        elif request.method == 'DELETE':
            success = delete_controller(controller_id, team_id)
            if success:
                return jsonify({'status': 'success'})
            else:
                return jsonify({'error': 'Controller not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# =====================================================
# ENVIRONMENT PROFILES ENDPOINTS
# =====================================================

@device_bp.route('/api/environment-profiles', methods=['GET', 'POST'])
def environment_profiles():
    """Environment profile management endpoint"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    user_id = get_user_id()
    
    try:
        if request.method == 'GET':
            profiles = get_all_environment_profiles(team_id)
            return jsonify(profiles)
        elif request.method == 'POST':
            profile = request.json
            save_environment_profile(profile, team_id, user_id)
            return jsonify({'status': 'success', 'profile_id': profile.get('id')})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@device_bp.route('/api/environment-profiles/<profile_id>', methods=['GET', 'PUT', 'DELETE'])
def environment_profile(profile_id):
    """Individual environment profile management endpoint"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    user_id = get_user_id()
    
    try:
        if request.method == 'GET':
            profile = get_environment_profile(profile_id, team_id)
            return jsonify(profile if profile else {})
        elif request.method == 'PUT':
            profile = request.json
            profile['id'] = profile_id
            save_environment_profile(profile, team_id, user_id)
            return jsonify({'status': 'success'})
        elif request.method == 'DELETE':
            success = delete_environment_profile(profile_id, team_id)
            if success:
                return jsonify({'status': 'success'})
            else:
                return jsonify({'error': 'Environment profile not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500 
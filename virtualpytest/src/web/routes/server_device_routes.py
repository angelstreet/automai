"""
Device Management Routes

This module contains the device management API endpoints for:
- Devices management
- Controllers management
- Environment profiles management
"""

from flask import Blueprint, request, jsonify

# Import database functions from src/lib/supabase (uses absolute import)
from src.lib.supabase.devices_db import (
    get_all_devices, get_device, save_device as create_device, 
    delete_device
)

from src.utils.app_utils import check_supabase, get_team_id

# =====================================================
# HELPER FUNCTIONS
# =====================================================

def check_device_name_exists(name, team_id, exclude_device_id=None):
    """Check if a device name already exists for the team"""
    try:
        devices = get_all_devices(team_id)
        for device in devices:
            if device.get('name') == name:
                if exclude_device_id and device.get('id') == exclude_device_id:
                    continue
                return True
        return False
    except Exception:
        return False

def update_device(device_id, device_data, team_id):
    """Update an existing device"""
    try:
        # Get the existing device
        existing_device = get_device(device_id, team_id)
        if not existing_device:
            return None
            
        # Update the device data
        updated_data = {**existing_device, **device_data}
        updated_data['id'] = device_id
        
        # Save the updated device
        return create_device(updated_data, team_id)
    except Exception:
        return None

# Create blueprint
server_device_bp = Blueprint('server_device', __name__, url_prefix='/server/devices')

# =====================================================
# DEVICE ENDPOINTS
# =====================================================

@server_device_bp.route('/getAllDevices', methods=['GET'])
def get_devices():
    """Get all devices for the team"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        devices = get_all_devices(team_id)
        return jsonify(devices)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@server_device_bp.route('/createDevice', methods=['POST'])
def create_device_endpoint():
    """Create a new device"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        device_data = request.json
        
        # Validate required fields
        if not device_data.get('name'):
            return jsonify({'error': 'Name is required'}), 400
        
        # Check for duplicate names
        if check_device_name_exists(device_data['name'], team_id):
            return jsonify({'error': 'A device with this name already exists'}), 400
        
        # Create the device
        created_device = create_device(device_data, team_id)
        if created_device:
            return jsonify({'status': 'success', 'device': created_device}), 201
        else:
            return jsonify({'error': 'Failed to create device'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@server_device_bp.route('/getDevice/<device_id>', methods=['GET'])
def get_device_endpoint(device_id):
    """Get a specific device by ID"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        device = get_device(device_id, team_id)
        if device:
            return jsonify(device)
        else:
            return jsonify({'error': 'Device not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@server_device_bp.route('/updateDevice/<device_id>', methods=['PUT'])
def update_device_endpoint(device_id):
    """Update a specific device"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        device_data = request.json
        
        # Validate required fields
        if not device_data.get('name'):
            return jsonify({'error': 'Name is required'}), 400
        
        # Check for duplicate names (excluding current device)
        if check_device_name_exists(device_data['name'], team_id, device_id):
            return jsonify({'error': 'A device with this name already exists'}), 400
        
        # Update the device
        updated_device = update_device(device_id, device_data, team_id)
        if updated_device:
            return jsonify({'status': 'success', 'device': updated_device})
        else:
            return jsonify({'error': 'Device not found or failed to update'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@server_device_bp.route('/deleteDevice/<device_id>', methods=['DELETE'])
def delete_device_endpoint(device_id):
    """Delete a specific device"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        success = delete_device(device_id, team_id)
        if success:
            return jsonify({'status': 'success'})
        else:
            return jsonify({'error': 'Device not found or failed to delete'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500 
"""
Device Management Routes

This module contains the device management API endpoints for:
- Devices management
- Controllers management
- Environment profiles management
"""

from flask import Blueprint, request, jsonify

from device_utils import (
    get_all_devices, get_device, create_device, 
    update_device, delete_device, check_device_name_exists
)

from .utils import check_supabase, get_team_id

# Create blueprint
device_bp = Blueprint('device', __name__, url_prefix='/api')

# =====================================================
# DEVICE ENDPOINTS
# =====================================================

@device_bp.route('/devices', methods=['GET', 'POST'])
def devices():
    """Device management endpoint"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        if request.method == 'GET':
            devices = get_all_devices(team_id)
            return jsonify(devices)
        elif request.method == 'POST':
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

@device_bp.route('/devices/<device_id>', methods=['GET', 'PUT', 'DELETE'])
def device(device_id):
    """Individual device management endpoint"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        if request.method == 'GET':
            device = get_device(device_id, team_id)
            if device:
                return jsonify(device)
            else:
                return jsonify({'error': 'Device not found'}), 404
                
        elif request.method == 'PUT':
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
                
        elif request.method == 'DELETE':
            success = delete_device(device_id, team_id)
            if success:
                return jsonify({'status': 'success'})
            else:
                return jsonify({'error': 'Device not found or failed to delete'}), 404
                
    except Exception as e:
        return jsonify({'error': str(e)}), 500 
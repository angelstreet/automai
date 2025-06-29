"""
Host Verification Routes

This module contains the host-side verification API endpoints that:
- List available verification references
- Provide status information for verification system
"""

import os
import json
from flask import Blueprint, request, jsonify, current_app
from src.utils.host_utils import get_controller, get_device_by_id

# Create blueprint
verification_host_bp = Blueprint('verification_host', __name__, url_prefix='/host/verification')

# =====================================================
# HOST-SIDE VERIFICATION ENDPOINTS
# =====================================================

@verification_host_bp.route('/getStatus', methods=['GET'])
def verification_status():
    """Get verification system status."""
    try:
        # Get device_id from query params (defaults to device1)
        device_id = request.args.get('device_id', 'device1')
        
        print(f"[@route:verification_status] Getting verification system status for device: {device_id}")
        
        # Get device info
        device = get_device_by_id(device_id)
        if not device:
            return jsonify({
                'success': False,
                'error': f'Device {device_id} not found'
            }), 404
        
        # Check available controllers for this device
        available_controllers = []
        
        # Check AV controller
        av_controller = get_controller(device_id, 'av')
        if av_controller:
            available_controllers.append('av')
        
        # Check remote controller
        remote_controller = get_controller(device_id, 'remote')
        if remote_controller:
            available_controllers.append('remote')
        
        # Check verification controllers
        for verification_type in ['verification_image', 'verification_text', 'verification_adb']:
            controller = get_controller(device_id, verification_type)
            if controller:
                available_controllers.append(verification_type)
        
        print(f"[@route:verification_status] Available controllers for device {device_id}: {available_controllers}")
        
        return jsonify({
            'success': True,
            'status': 'ready',
            'controllers_available': available_controllers,
            'message': 'Verification system is ready',
            'host_connected': True,
            'device_id': device_id,
            'device_model': device.model,
            'device_name': device.name
        })
        
    except Exception as e:
        print(f"[@route:verification_status] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Verification status error: {str(e)}'
        }), 500

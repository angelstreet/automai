"""
Host Verification Routes

This module contains the host-side verification API endpoints that:
- List available verification references
- Provide status information for verification system
"""

import os
import json
from flask import Blueprint, request, jsonify, current_app
from src.utils.host_utils import get_local_controller

# Create blueprint
verification_host_bp = Blueprint('verification_host', __name__, url_prefix='/host/verification')

# =====================================================
# HOST-SIDE VERIFICATION ENDPOINTS
# =====================================================

# REMOVED: getAllReferences route - not needed on host side
# Host doesn't need to list references, it receives them for processing

@verification_host_bp.route('/getStatus', methods=['GET'])
def verification_status():
    """Get verification system status."""
    try:
        print(f"[@route:verification_status] Getting verification system status")
        
        # Get host device info
        host_device = getattr(current_app, 'my_host_device', None)
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device object not initialized'
            }), 404
        
        # Check available controllers
        available_controllers = []
        
        # Check AV controller
        av_controller = get_local_controller('av')
        if av_controller:
            available_controllers.append('av')
        
        # Check remote controller
        remote_controller = get_local_controller('remote')
        if remote_controller:
            available_controllers.append('remote')
        
        print(f"[@route:verification_status] Available controllers: {available_controllers}")
        
        return jsonify({
            'success': True,
            'status': 'ready',
            'controllers_available': available_controllers,
            'message': 'Verification system is ready',
            'host_connected': True,
            'device_model': host_device.get('device_model', 'unknown'),
            'host_id': host_device.get('client_id', 'unknown'),
            'host_name': host_device.get('host_name', 'unknown')
        })
        
    except Exception as e:
        print(f"[@route:verification_status] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Verification status error: {str(e)}'
        }), 500

# ADB verification has been removed - use remote controller instead 
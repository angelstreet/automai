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

@verification_host_bp.route('/getAllReferences', methods=['GET'])
def list_references():
    """Get list of available references from local storage."""
    try:
        print(f"[@route:list_references] Getting available references")
        
        # Get host device info
        host_device = getattr(current_app, 'my_host_device', None)
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device object not initialized'
            }), 404
        
        print(f"[@route:list_references] Using host device: {host_device.get('host_name')} - {host_device.get('device_name')}")
        
        # Get device model to build resource path
        model = host_device.get('device_model', 'default')
        resource_dir = f'../resources/{model}'
        
        references = {
            'image': [],
            'text': []
        }
        
        # Scan for image references
        if os.path.exists(resource_dir):
            for filename in os.listdir(resource_dir):
                if filename.endswith(('.png', '.jpg', '.jpeg')):
                    name = os.path.splitext(filename)[0]
                    references['image'].append({
                        'name': name,
                        'filename': filename,
                        'type': 'image',
                        'path': f'{resource_dir}/{filename}'
                    })
                elif filename.endswith('.txt'):
                    name = os.path.splitext(filename)[0]
                    references['text'].append({
                        'name': name,
                        'filename': filename,
                        'type': 'text',
                        'path': f'{resource_dir}/{filename}'
                    })
        
        print(f"[@route:list_references] Found {len(references['image'])} image and {len(references['text'])} text references")
        
        return jsonify({
            'success': True,
            'references': references,
            'model': model,
            'resource_directory': resource_dir
        })
        
    except Exception as e:
        print(f"[@route:list_references] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Reference listing error: {str(e)}'
        }), 500

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
        
        print(f"[@route:verification_status] Using host device: {host_device.get('host_name')} - {host_device.get('device_name')}")
        
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
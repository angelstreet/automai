"""
Navigation Host Routes

This module contains the host-side navigation endpoints for:
- Navigation screenshot saving (moved from AV domain)
- Navigation execution on devices
"""

from flask import Blueprint, request, jsonify, current_app
import os
import shutil
from src.utils.host_utils import get_local_controller

# Create blueprint with host navigation prefix
navigation_bp = Blueprint('navigation', __name__, url_prefix='/host/navigation')

@navigation_bp.route('/save-screenshot', methods=['POST'])
def save_navigation_screenshot():
    """Take screenshot and save locally for navigation documentation"""
    try:
        # ✅ USE OWN STORED HOST_DEVICE OBJECT
        host_device = getattr(current_app, 'my_host_device', None)
        
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device object not initialized. Host may need to re-register.'
            }), 404
        
        # Get controller object directly from own stored host_device
        av_controller = get_local_controller('av')
        
        if not av_controller:
            return jsonify({
                'success': False,
                'error': 'No AV controller object found in own host_device',
                'available_controllers': list(host_device.get('controller_objects', {}).keys())
            }), 404
        
        print(f"[@route:host_navigation:save_screenshot] Using AV controller: {type(av_controller).__name__}")
        
        # Get request data for required filename parameter
        request_data = request.get_json() or {}
        filename = request_data.get('filename')
        
        if not filename:
            return jsonify({
                'success': False,
                'error': 'Filename is required for saving screenshot'
            }), 400
        
        print(f"[@route:host_navigation:save_screenshot] Saving navigation screenshot with filename: {filename}")
        
        # Save screenshot using controller (returns local path)
        local_screenshot_path = av_controller.save_screenshot(filename)
        
        if not local_screenshot_path:
            return jsonify({
                'success': False,
                'error': 'Failed to take screenshot'
            }), 500
        
        print(f"[@route:host_navigation:save_screenshot] Screenshot saved locally at: {local_screenshot_path}")
        
        return jsonify({
            'success': True,
            'screenshot_path': local_screenshot_path  # Return local path for server to upload to R2
        })
            
    except Exception as e:
        print(f"[@route:host_navigation:save_screenshot] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500 
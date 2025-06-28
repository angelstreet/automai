"""
Navigation Host Routes

This module contains the host-side navigation endpoints for:
- Navigation screenshot saving (moved from AV domain)
- Navigation execution on devices
"""

from flask import Blueprint, request, jsonify, current_app
import os
import shutil
from src.utils.host_utils import get_controller, get_device_by_id

# Create blueprint with host navigation prefix
navigation_bp = Blueprint('navigation', __name__, url_prefix='/host/navigation')

@navigation_bp.route('/saveScreenshot', methods=['POST'])
def save_navigation_screenshot():
    """Take screenshot and upload to R2 for navigation documentation"""
    try:
        # Get request data for device_id and other parameters
        request_data = request.get_json() or {}
        device_id = request_data.get('device_id', 'device1')
        
        print(f"[@route:host_navigation:save_screenshot] Saving navigation screenshot for device: {device_id}")
        
        # Get AV controller for the specified device
        av_controller = get_controller(device_id, 'av')
        
        if not av_controller:
            device = get_device_by_id(device_id)
            if not device:
                return jsonify({
                    'success': False,
                    'error': f'Device {device_id} not found'
                }), 404
            
            return jsonify({
                'success': False,
                'error': f'No AV controller found for device {device_id}',
                'available_capabilities': device.get_capabilities()
            }), 404
        
        print(f"[@route:host_navigation:save_screenshot] Using AV controller: {type(av_controller).__name__}")
        
        # Get other parameters from request data
        filename = request_data.get('filename')
        device_model = request_data.get('device_model', 'android_mobile')
        
        if not filename:
            return jsonify({
                'success': False,
                'error': 'Filename is required for saving screenshot'
            }), 400
        
        print(f"[@route:host_navigation:save_screenshot] Saving navigation screenshot with filename: {filename}")
        print(f"[@route:host_navigation:save_screenshot] Using device model: {device_model}")
        
        # Save screenshot using controller (returns local path)
        local_screenshot_path = av_controller.save_screenshot(filename)
        
        if not local_screenshot_path:
            return jsonify({
                'success': False,
                'error': 'Failed to take screenshot'
            }), 500
        
        print(f"[@route:host_navigation:save_screenshot] Screenshot saved locally at: {local_screenshot_path}")
        
        # Check if local screenshot file exists
        if not os.path.exists(local_screenshot_path):
            return jsonify({
                'success': False,
                'error': f'Screenshot file not found: {local_screenshot_path}'
            }), 500
        
        # Upload to R2 using navigation upload function
        try:
            from src.utils.cloudflare_utils import upload_navigation_screenshot
            
            # Create the target filename for R2 (use filename with .jpg extension)
            r2_filename = f"{filename}.jpg"
            
            print(f"[@route:host_navigation:save_screenshot] Uploading navigation screenshot to R2: {r2_filename}")
            print(f"[@route:host_navigation:save_screenshot] Source file: {local_screenshot_path}")
            print(f"[@route:host_navigation:save_screenshot] Target path: navigation/{device_model}/{r2_filename}")
            
            # Upload to R2 using the navigation upload function (uploads to navigation/ folder)
            upload_result = upload_navigation_screenshot(local_screenshot_path, device_model, r2_filename)
            
            if not upload_result.get('success'):
                print(f"[@route:host_navigation:save_screenshot] R2 upload failed: {upload_result.get('error')}")
                return jsonify({
                    'success': False,
                    'error': f'Failed to upload to R2: {upload_result.get("error")}'
                }), 500
            
            r2_url = upload_result.get('url')
            print(f"[@route:host_navigation:save_screenshot] Successfully uploaded navigation screenshot to R2: {r2_url}")
            
            # Navigation screenshots are stored in the tree nodes, no database save needed
            print(f"[@route:host_navigation:save_screenshot] Screenshot uploaded to R2 successfully, no database save required")
            
            return jsonify({
                'success': True,
                'screenshot_url': r2_url,  # R2 URL for permanent storage
                'screenshot_path': local_screenshot_path, 
                'device_id': device_id
            })
            
        except Exception as upload_error:
            print(f"[@route:host_navigation:save_screenshot] Upload error: {str(upload_error)}")
            return jsonify({
                'success': False,
                'error': f'Upload to R2 failed: {str(upload_error)}'
            }), 500
            
    except Exception as e:
        print(f"[@route:host_navigation:save_screenshot] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500 
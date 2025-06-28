"""
Host Verification Image Routes

Host-side image verification endpoints that execute using instantiated image verification controllers.
"""

from flask import Blueprint, request, jsonify
from src.utils.host_utils import get_controller, get_device_by_id, get_host
from src.utils.build_url_utils import buildHostImageUrl
import os

# Create blueprint
verification_image_host_bp = Blueprint('verification_image_host', __name__, url_prefix='/host/verification/image')

@verification_image_host_bp.route('/cropImage', methods=['POST'])
def crop_area():
    """Crop area from image for verification"""
    try:
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        
        print(f"[@route:host_crop_area] Host cropping request for device: {device_id}")
        
        # Get image verification controller and device info
        image_controller = get_controller(device_id, 'verification_image')
        device = get_device_by_id(device_id)
        
        if not image_controller:
            if not device:
                return jsonify({
                    'success': False,
                    'error': f'Device {device_id} not found'
                }), 404
            
            return jsonify({
                'success': False,
                'error': f'No image verification controller found for device {device_id}',
                'available_capabilities': device.get_capabilities()
            }), 404
        
        # Controller handles everything
        result = image_controller.crop_image(data)
        
        # Build image URL for frontend preview using host instance
        if result.get('success') and result.get('image_cropped_path'):
            host = get_host()
            result['image_cropped_url'] = buildHostImageUrl(host.to_dict(), result['image_cropped_path'])
            print(f"[@route:host_crop_area] Built image cropped URL: {result['image_cropped_url']}")
        
        # Add device info to response
        if device:
            result['device_model'] = device.model
            result['device_name'] = device.name
        
        return jsonify(result)
        
    except Exception as e:
        print(f"[@route:host_crop_area] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Host cropping error: {str(e)}'
        }), 500

@verification_image_host_bp.route('/processImage', methods=['POST'])
def process_area():
    """Process image for verification"""
    try:
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        
        print(f"[@route:host_process_area] Host processing request for device: {device_id}")
        
        # Get image verification controller and device info
        image_controller = get_controller(device_id, 'verification_image')
        device = get_device_by_id(device_id)
        
        if not image_controller:
            if not device:
                return jsonify({
                    'success': False,
                    'error': f'Device {device_id} not found'
                }), 404
            
            return jsonify({
                'success': False,
                'error': f'No image verification controller found for device {device_id}',
                'available_capabilities': device.get_capabilities()
            }), 404
        
        result = image_controller.process_image(data)
        
        # Build image URL for frontend preview using host instance
        if result.get('success') and result.get('image_filtered_path'):
            host = get_host()
            result['image_filtered_url'] = buildHostImageUrl(host.to_dict(), result['image_filtered_path'])
            print(f"[@route:host_process_area] Built image filtered URL: {result['image_filtered_url']}")
        
        # Add device info to response
        if device:
            result['device_model'] = device.model
            result['device_name'] = device.name
        
        return jsonify(result)
        
    except Exception as e:
        print(f"[@route:host_process_area] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Host processing error: {str(e)}'
        }), 500

@verification_image_host_bp.route('/saveImage', methods=['POST'])
def save_resource():
    """Save image verification reference"""
    try:
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        
        print(f"[@route:host_save_resource] Save image reference request for device: {device_id}")
        
        # Get image verification controller and device info
        image_controller = get_controller(device_id, 'verification_image')
        device = get_device_by_id(device_id)
        
        if not image_controller:
            if not device:
                return jsonify({
                    'success': False,
                    'error': f'Device {device_id} not found'
                }), 404
            
            return jsonify({
                'success': False,
                'error': f'No image verification controller found for device {device_id}',
                'available_capabilities': device.get_capabilities()
            }), 404
        
        result = image_controller.save_image(data)
        
        # Add device info to response
        if device:
            result['device_model'] = device.model
            result['device_name'] = device.name
        
        return jsonify(result)
        
    except Exception as e:
        print(f"[@route:host_save_resource] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Image save error: {str(e)}'
        }), 500

@verification_image_host_bp.route('/execute', methods=['POST'])
def execute_image_verification():
    """Execute single image verification on host"""
    try:
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        
        print(f"[@route:host_verification_image:execute] Executing image verification for device: {device_id}")
        
        # Get image verification controller and device info
        image_controller = get_controller(device_id, 'verification_image')
        device = get_device_by_id(device_id)
        
        if not image_controller:
            if not device:
                return jsonify({
                    'success': False,
                    'error': f'Device {device_id} not found'
                }), 404
            
            return jsonify({
                'success': False,
                'error': f'No image verification controller found for device {device_id}',
                'available_capabilities': device.get_capabilities()
            }), 404
        
        verification = data.get('verification')
        
        # Execute verification using controller
        verification_result = image_controller.execute_verification({
            'command': verification.get('command', 'waitForImageToAppear'),
            'params': {
                'image_path': verification.get('params', {}).get('image_path', ''),
                'threshold': verification.get('params', {}).get('threshold', 0.8),
                'timeout': verification.get('params', {}).get('timeout', 10.0),
                'area': verification.get('params', {}).get('area'),
                'image_filter': verification.get('params', {}).get('image_filter', 'none'),
                'model': device.device_model  # Pass device model for R2 reference resolution
            }
        })
        
        print(f"[@route:host_verification_image:execute] Verification result: {verification_result}")
        
        # Build response with proper URLs
        result = {
            'success': verification_result.get('success', False),
            'message': verification_result.get('message', 'Unknown result'),
            'verification_type': 'image',
            'resultType': 'PASS' if verification_result.get('success') else 'FAIL',
            'threshold': verification_result.get('threshold', 0.0),
            'details': verification_result.get('details', {}),
            'sourceImageUrl': verification_result.get('sourceImageUrl'),
            'referenceImageUrl': verification_result.get('referenceImageUrl'),
            'resultOverlayUrl': verification_result.get('resultOverlayUrl')
        }
        
        print(f"[@route:host_verification_image:execute] Final result: {result}")
        
        return jsonify(result)
        
    except Exception as e:
        print(f"[@route:host_verification_image:execute] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Image verification execution error: {str(e)}'
        }), 500 
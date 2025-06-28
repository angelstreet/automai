"""
Host Verification Image Routes

Host-side image verification endpoints that execute using instantiated image verification controllers.
"""

from flask import Blueprint, request, jsonify
from src.utils.host_utils import get_controller, get_device_by_id
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
        
        # Build image URL for frontend preview
        if result.get('success') and result.get('image_cropped_path'):
            result['image_cropped_url'] = buildHostImageUrl(data.get('host', {}), result['image_cropped_path'])
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
        
        # Build image URL for frontend preview
        if result.get('success') and result.get('image_filtered_path'):
            result['image_filtered_url'] = buildHostImageUrl(data.get('host', {}), result['image_filtered_path'])
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
        result = image_controller.execute_verification(verification)
        
        # Build URLs for images in verification result
        if result.get('screenshot_path'):
            result['source_image_url'] = buildHostImageUrl(data.get('host', {}), result['screenshot_path'])
            print(f"[@route:host_verification_image:execute] Built source image URL: {result['source_image_url']}")
        
        # Build reference image URL from image_path parameter
        if verification and verification.get('params', {}).get('image_path'):
            reference_path = os.path.join(image_controller.captures_path, verification['params']['image_path'])
            if os.path.exists(reference_path):
                result['reference_image_url'] = buildHostImageUrl(data.get('host', {}), reference_path)
                print(f"[@route:host_verification_image:execute] Built reference image URL: {result['reference_image_url']}")
            else:
                print(f"[@route:host_verification_image:execute] Reference image not found: {reference_path}")
        
        # Build response
        response = {
            'success': True,
            'verification_result': result
        }
        
        if device:
            response['device_model'] = device.model
            response['device_name'] = device.name
        
        return jsonify(response)
        
    except Exception as e:
        print(f"[@route:host_verification_image:execute] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Image verification execution error: {str(e)}'
        }), 500 
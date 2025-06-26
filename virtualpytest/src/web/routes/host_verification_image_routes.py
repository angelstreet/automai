"""
Host Verification Image Routes

Host-side image verification endpoints that execute using instantiated image verification controllers.
"""

from flask import Blueprint, request, jsonify
from src.utils.host_utils import get_controller, get_device_by_id

# Create blueprint
verification_image_host_bp = Blueprint('verification_image_host', __name__, url_prefix='/host/verification/image')

@verification_image_host_bp.route('/crop-image', methods=['POST'])
def crop_area():
    """Crop area from image for verification"""
    try:
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        
        print(f"[@route:host_crop_area] Host cropping request for device: {device_id}")
        
        # Get image verification controller for the specified device
        image_controller = get_controller(device_id, 'verification_image')
        
        if not image_controller:
            device = get_device_by_id(device_id)
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
        result = image_controller.crop_image_for_verification(data)
        return jsonify(result)
        
    except Exception as e:
        print(f"[@route:host_crop_area] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Host cropping error: {str(e)}'
        }), 500

@verification_image_host_bp.route('/process-image', methods=['POST'])
def process_area():
    """Process image for verification"""
    try:
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        
        print(f"[@route:host_process_area] Host processing request for device: {device_id}")
        
        image_controller = get_controller(device_id, 'verification_image')
        
        if not image_controller:
            device = get_device_by_id(device_id)
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
        
        result = image_controller.process_image_for_verification(data)
        return jsonify(result)
        
    except Exception as e:
        print(f"[@route:host_process_area] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Host processing error: {str(e)}'
        }), 500

@verification_image_host_bp.route('/save-image-reference', methods=['POST'])
def save_resource():
    """Save image verification reference"""
    try:
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        
        print(f"[@route:host_save_resource] Save image reference request for device: {device_id}")
        
        image_controller = get_controller(device_id, 'verification_image')
        
        if not image_controller:
            device = get_device_by_id(device_id)
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
        
        result = image_controller.save_image_reference(data)
        return jsonify(result)
        
    except Exception as e:
        print(f"[@route:host_save_resource] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'R2 save error: {str(e)}'
        }), 500

@verification_image_host_bp.route('/execute', methods=['POST'])
def execute_image_verification():
    """Execute single image verification on host"""
    try:
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        
        print(f"[@route:host_verification_image:execute] Executing image verification for device: {device_id}")
        
        image_controller = get_controller(device_id, 'verification_image')
        
        if not image_controller:
            device = get_device_by_id(device_id)
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
        
        return jsonify({
            'success': True,
            'verification_result': result
        })
        
    except Exception as e:
        print(f"[@route:host_verification_image:execute] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Image verification execution error: {str(e)}'
        }), 500 
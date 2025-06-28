"""
Host Verification Text Routes

Host-side text verification endpoints that execute using instantiated text verification controllers.
"""

from flask import Blueprint, request, jsonify
from src.utils.host_utils import get_controller, get_device_by_id
from src.utils.build_url_utils import buildHostImageUrl

# Create blueprint
verification_text_host_bp = Blueprint('verification_text_host', __name__, url_prefix='/host/verification/text')

@verification_text_host_bp.route('/detectText', methods=['POST'])
def detect_text():
    """Auto-detect text elements in the current screen"""
    try:
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        
        print(f"[@route:host_detect_text] Text detection request for device: {device_id}")
        
        # Get text verification controller for the specified device
        text_controller = get_controller(device_id, 'verification_text')
        
        if not text_controller:
            device = get_device_by_id(device_id)
            if not device:
                return jsonify({
                    'success': False,
                    'error': f'Device {device_id} not found'
                }), 404
            
            return jsonify({
                'success': False,
                'error': f'No text verification controller found for device {device_id}',
                'available_capabilities': device.get_capabilities()
            }), 404
        
        # Get device info for response
        device = get_device_by_id(device_id)
        
        # Get text detection result
        result = text_controller.detect_text(data)
        
        # If successful, create a text detected image URL like image cropping does
        if result.get('success') and result.get('image_textdetected_path'):
            # Build proper URL for the text detected image
            image_textdetected_url = buildHostImageUrl(data.get('host', {}), result['image_textdetected_path'])
            result['image_textdetected_url'] = image_textdetected_url
            
            print(f"[@route:host_detect_text] Built text detected image URL: {image_textdetected_url}")
        
        # Add device_model to response for server route (following established pattern)
        if device:
            result['device_model'] = device.model
            result['device_name'] = device.name
        
        return jsonify(result)
        
    except Exception as e:
        print(f"[@route:host_detect_text] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Text detection error: {str(e)}'
        }), 500

@verification_text_host_bp.route('/saveText', methods=['POST'])
def save_text():
    """Save text verification reference"""
    try:
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        
        print(f"[@route:host_save_text] Save text request for device: {device_id}")
        
        text_controller = get_controller(device_id, 'verification_text')
        
        if not text_controller:
            device = get_device_by_id(device_id)
            if not device:
                return jsonify({
                    'success': False,
                    'error': f'Device {device_id} not found'
                }), 404
            
            return jsonify({
                'success': False,
                'error': f'No text verification controller found for device {device_id}',
                'available_capabilities': device.get_capabilities()
            }), 404
        
        # Get device info for response
        device = get_device_by_id(device_id)
        
        result = text_controller.save_text(data)
        
        # Add device_model to response for server route (following established pattern)
        if device:
            result['device_model'] = device.model
            result['device_name'] = device.name
        
        return jsonify(result)
        
    except Exception as e:
        print(f"[@route:host_save_text] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Text save error: {str(e)}'
        }), 500

@verification_text_host_bp.route('/execute', methods=['POST'])
def execute_text_verification():
    """Execute single text verification on host"""
    try:
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        
        print(f"[@route:host_verification_text:execute] Executing text verification for device: {device_id}")
        
        text_controller = get_controller(device_id, 'verification_text')
        
        if not text_controller:
            device = get_device_by_id(device_id)
            if not device:
                return jsonify({
                    'success': False,
                    'error': f'Device {device_id} not found'
                }), 404
            
            return jsonify({
                'success': False,
                'error': f'No text verification controller found for device {device_id}',
                'available_capabilities': device.get_capabilities()
            }), 404
        
        # Get device info for response
        device = get_device_by_id(device_id)
        
        verification = data.get('verification')
        result = text_controller.execute_verification(verification)
        
        # Add device_model to response for server route (following established pattern)
        response = {
            'success': True,
            'verification_result': result
        }
        
        if device:
            response['device_model'] = device.model
            response['device_name'] = device.name
        
        return jsonify(response)
        
    except Exception as e:
        print(f"[@route:host_verification_text:execute] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Text verification execution error: {str(e)}'
        }), 500 
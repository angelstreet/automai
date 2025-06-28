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
        
        # Get text verification controller and device info
        text_controller = get_controller(device_id, 'verification_text')
        device = get_device_by_id(device_id)
        
        if not text_controller:
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
        
        # Get text detection result
        result = text_controller.detect_text(data)
        
        # Build URL for text detected image
        if result.get('success') and result.get('image_textdetected_path'):
            result['image_textdetected_url'] = buildHostImageUrl(data.get('host', {}), result['image_textdetected_path'])
            print(f"[@route:host_detect_text] Built text detected image URL: {result['image_textdetected_url']}")
        
        # Add device info to response
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
        
        # Get text verification controller and device info
        text_controller = get_controller(device_id, 'verification_text')
        device = get_device_by_id(device_id)
        
        if not text_controller:
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
        
        result = text_controller.save_text(data)
        
        # Add device info to response
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
        
        # Get text verification controller and device info
        text_controller = get_controller(device_id, 'verification_text')
        device = get_device_by_id(device_id)
        
        if not text_controller:
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
        
        verification = data.get('verification')
        result = text_controller.execute_verification(verification)
        
        # Build URLs for images in verification result
        if result.get('screenshot_path'):
            result['source_image_url'] = buildHostImageUrl(data.get('host', {}), result['screenshot_path'])
            print(f"[@route:host_verification_text:execute] Built source image URL: {result['source_image_url']}")
        
        # Populate extracted text fields for the frontend
        if result.get('extracted_info'):
            extracted_info = result['extracted_info']
            result['extracted_text'] = extracted_info.get('extracted_text', '')
            result['searched_text'] = extracted_info.get('target_text', verification.get('params', {}).get('text', ''))
        
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
        print(f"[@route:host_verification_text:execute] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Text verification execution error: {str(e)}'
        }), 500 
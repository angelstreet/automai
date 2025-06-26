"""
Host Verification Text Routes

Host-side text verification endpoints that execute using instantiated text verification controllers.
"""

from flask import Blueprint, request, jsonify
from src.utils.host_utils import get_controller, get_device_by_id

# Create blueprint
verification_text_host_bp = Blueprint('verification_text_host', __name__, url_prefix='/host/verification/text')

@verification_text_host_bp.route('/auto-detect-text', methods=['POST'])
def text_auto_detect():
    """Auto-detect text elements in the current screen"""
    try:
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        
        print(f"[@route:host_text_auto_detect] Text auto-detection request for device: {device_id}")
        
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
        
        # Controller handles everything
        result = text_controller.auto_detect_text(data)
        return jsonify(result)
        
    except Exception as e:
        print(f"[@route:host_text_auto_detect] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Text auto-detection error: {str(e)}'
        }), 500

@verification_text_host_bp.route('/save-text-reference', methods=['POST'])
def save_text_resource():
    """Save text verification reference"""
    try:
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        
        print(f"[@route:host_save_text_resource] Save text reference request for device: {device_id}")
        
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
        
        result = text_controller.save_text_reference_from_request(data)
        return jsonify(result)
        
    except Exception as e:
        print(f"[@route:host_save_text_resource] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Text reference save error: {str(e)}'
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
        
        verification = data.get('verification')
        result = text_controller.execute_verification(verification)
        
        return jsonify({
            'success': True,
            'verification_result': result
        })
        
    except Exception as e:
        print(f"[@route:host_verification_text:execute] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Text verification execution error: {str(e)}'
        }), 500 
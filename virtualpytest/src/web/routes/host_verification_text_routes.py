"""
Host Verification Text Routes

Host-side text verification endpoints that execute using instantiated text verification controllers.
"""

from flask import Blueprint, request, jsonify
from src.utils.host_utils import get_controller, get_device_by_id, get_host
from src.utils.build_url_utils import buildHostImageUrl
import os

# Create blueprint
verification_text_host_bp = Blueprint('verification_text_host', __name__, url_prefix='/host/verification/text')

def get_verification_controller(device_id: str, controller_type: str, check_device: bool = False):
    """
    Helper function to get verification controller and handle common validation.
    
    Args:
        device_id: ID of the device
        controller_type: Type of controller ('verification_image' or 'verification_text')
        check_device: Whether to also validate device existence
        
    Returns:
        Tuple of (controller, device, error_response) where error_response is None if successful
    """
    controller = get_controller(device_id, controller_type)
    device = None
    
    if not controller:
        error_response = jsonify({
            'success': False,
            'error': f'No {controller_type} controller found for device {device_id}'
        }), 404
        return None, None, error_response
    
    if check_device:
        device = get_device_by_id(device_id)
        if not device:
            error_response = jsonify({
                'success': False,
                'error': f'Device {device_id} not found'
            }), 404
            return None, None, error_response
    
    return controller, device, None

@verification_text_host_bp.route('/detectText', methods=['POST'])
def detect_text():
    """Auto-detect text elements in the current screen"""
    try:
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        
        print(f"[@route:host_detect_text] Text detection request for device: {device_id}")
        
        # Get text verification controller using helper
        text_controller, _, error_response = get_verification_controller(device_id, 'verification_text')
        if error_response:
            return error_response
        
        # Get text detection result
        result = text_controller.detect_text(data)
        
        # Build URL for text detected image using host instance
        if result.get('success') and result.get('image_textdetected_path'):
            host = get_host()
            result['image_textdetected_url'] = buildHostImageUrl(host.to_dict(), result['image_textdetected_path'])
            print(f"[@route:host_detect_text] Built text detected image URL: {result['image_textdetected_url']}")
        
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
        
        # Get text verification controller using helper
        text_controller, _, error_response = get_verification_controller(device_id, 'verification_text')
        if error_response:
            return error_response
        
        result = text_controller.save_text(data)
        
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
        
        # Get text verification controller using helper
        text_controller, _, error_response = get_verification_controller(device_id, 'verification_text')
        if error_response:
            return error_response
        
        verification = data.get('verification')
        result = text_controller.execute_verification(verification)
        
        # Get host instance for URL building
        host = get_host()
        
        # Build URLs from file paths if verification generated images
        if result.get('success') and 'source_image_path' in result.get('details', {}):
            from src.utils.build_url_utils import buildVerificationResultUrl
            
            # Get host info for URL building
            host = get_host()
            host_info = host.to_dict() if host else None
            
            details = result.get('details', {})
            
            # Build URL for the source image
            if details.get('source_image_path'):
                filename = os.path.basename(details['source_image_path'])
                result['sourceUrl'] = buildVerificationResultUrl(host_info, filename, device_id)
                print(f"[@route:host_verification_text:execute] Built source URL: {result['sourceUrl']}")
        
        # Build clean response with frontend-expected properties
        response = {
            'success': result.get('success', False),
            'message': result.get('message', 'Unknown result'),
            'verification_type': 'text',
            'resultType': 'PASS' if result.get('success') else 'FAIL',
            'matchingResult': result.get('matching_result', 0.0),  # OCR confidence
            'userThreshold': result.get('user_threshold', 0.8),    # User's threshold
            'imageFilter': result.get('image_filter', 'none'),     # Applied filter
            'extractedText': result.get('extractedText', ''),      # Frontend-expected property name
            'searchedText': result.get('searchedText', ''),        # Frontend-expected property name
            'sourceUrl': result.get('sourceUrl')                   # Frontend-expected property name
        }
        
        return jsonify(response)
        
    except Exception as e:
        print(f"[@route:host_verification_text:execute] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Text verification execution error: {str(e)}'
        }), 500 
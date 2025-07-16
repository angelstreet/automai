"""
Host Verification Appium Routes

Host-side appium verification endpoints that execute using instantiated appium verification controllers.
"""

from flask import Blueprint, request, jsonify
from src.utils.host_utils import get_controller, get_device_by_id

# Create blueprint
host_verification_appium_bp = Blueprint('host_verification_appium', __name__, url_prefix='/host/verification/appium')

def get_verification_controller(device_id: str, controller_type: str, check_device: bool = False):
    """
    Helper function to get verification controller and handle common validation.
    
    Args:
        device_id: ID of the device
        controller_type: Type of controller ('verification_appium')
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

@host_verification_appium_bp.route('/execute', methods=['POST'])
def execute_appium_verification():
    """Execute single Appium verification on host"""
    try:
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        
        print(f"[@route:host_verification_appium:execute] Executing Appium verification for device: {device_id}")
        
        # Get Appium verification controller
        appium_controller, _, error_response = get_verification_controller(device_id, 'verification_appium')
        if error_response:
            return error_response
        
        verification = data.get('verification')
        if not verification:
            return jsonify({
                'success': False,
                'error': 'verification is required'
            }), 400
        
        # Execute verification using controller abstraction
        result = appium_controller.execute_verification(verification)
        
        # Build clean response with frontend-expected properties
        response = {
            'success': result.get('success', False),
            'message': result.get('message', 'Unknown result'),
            'verification_type': 'appium',
            'resultType': 'PASS' if result.get('success') else 'FAIL',
            'matchingResult': result.get('matching_result', 0.0),
            'userThreshold': result.get('user_threshold', 0.8),
            'imageFilter': result.get('image_filter', 'none'),
            'extractedText': result.get('extractedText', ''),
            'searchedText': result.get('searchedText', ''),
            'platform': result.get('platform', '')
        }
        
        return jsonify(response)
        
    except Exception as e:
        print(f"[@route:host_verification_appium:execute] Appium verification execution error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Appium verification execution error: {str(e)}'
        }), 500 
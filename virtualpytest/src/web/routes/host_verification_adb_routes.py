"""
Verification ADB Host Routes

This module contains the host-side ADB verification API endpoints that:
- Handle ADB element verification directly using ADB controller
- Support waitForElementToAppear and waitForElementToDisappear
- Execute ADB verification operations
"""

from flask import Blueprint, request, jsonify, current_app
import os
import json
from src.utils.host_utils import get_controller, get_device_by_id

# Create blueprint
host_verification_adb_bp = Blueprint('host_verification_adb', __name__, url_prefix='/host/verification/adb')

def get_verification_controller(device_id: str, controller_type: str, check_device: bool = False):
    """
    Helper function to get verification controller and handle common validation.
    
    Args:
        device_id: ID of the device
        controller_type: Type of controller ('verification_adb', 'verification_image', 'verification_text')
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

# =====================================================
# HOST-SIDE ADB VERIFICATION ENDPOINTS
# =====================================================

@host_verification_adb_bp.route('/execute', methods=['POST'])
def execute_adb_verification():
    """Execute single ADB verification on host"""
    try:
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        
        print(f"[@route:host_verification_adb:execute] Executing ADB verification for device: {device_id}")
        
        # Get ADB verification controller using helper
        adb_controller, _, error_response = get_verification_controller(device_id, 'verification_adb')
        if error_response:
            return error_response
        
        verification = data.get('verification')
        if not verification:
            return jsonify({
                'success': False,
                'error': 'verification is required'
            }), 400
        
        # Execute verification using controller - let controller handle everything
        result = adb_controller.execute_verification(verification)
        
        # Build clean response with frontend-expected properties (consistent with image/text)
        response = {
            'success': result.get('success', False),
            'message': result.get('message', 'Unknown result'),
            'verification_type': 'adb',
            'resultType': 'PASS' if result.get('success') else 'FAIL',
            'matchingResult': result.get('matching_result', 0.0),  # Binary for ADB (1.0 or 0.0)
            'userThreshold': result.get('user_threshold', 0.8),    # Default for consistency
            'imageFilter': result.get('image_filter', 'none'),     # Not applicable for ADB
            'extractedText': result.get('extractedText', ''),      # What was found
            'searchedText': result.get('searchedText', '')         # What was searched for
            # No URLs for ADB verification
            # Removed details object
        }
        
        print(f"[@route:host_verification_adb:execute] Final result: {response}")
        
        return jsonify(response)
        
    except Exception as e:
        print(f"[@route:host_verification_adb:execute] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'ADB verification execution error: {str(e)}'
        }), 500

@host_verification_adb_bp.route('/waitForElementToAppear', methods=['POST'])
def wait_for_element_to_appear():
    """Execute ADB waitForElementToAppear verification"""
    try:
        print("[@route:host_verification_adb:waitForElementToAppear] Executing ADB waitForElementToAppear")
        
        # Get request data
        data = request.get_json() or {}
        search_term = data.get('search_term')
        timeout = data.get('timeout', 0.0)
        device_id = data.get('device_id', 'device1')
        
        # Validate required parameters
        if not search_term:
            return jsonify({
                'success': False,
                'error': 'search_term is required'
            }), 400
        
        # Get ADB verification controller using helper
        adb_controller, _, error_response = get_verification_controller(device_id, 'verification_adb')
        if error_response:
            return error_response
        
        # Execute verification using unified method
        verification_config = {
            'command': 'waitForElementToAppear',
            'params': {
                'search_term': search_term,
                'timeout': timeout
            }
        }
        
        result = adb_controller.execute_verification(verification_config)
        
        # Build clean response with frontend-expected properties
        response = {
            'success': result.get('success', False),
            'message': result.get('message', 'Unknown result'),
            'verification_type': 'adb',
            'resultType': 'PASS' if result.get('success') else 'FAIL',
            'matchingResult': result.get('matching_result', 0.0),
            'userThreshold': result.get('user_threshold', 0.8),
            'imageFilter': result.get('image_filter', 'none'),
            'extractedText': result.get('extractedText', ''),
            'searchedText': result.get('searchedText', ''),
            'command': 'waitForElementToAppear',
            'device_id': device_id
        }
        
        return jsonify(response)
        
    except Exception as e:
        print(f"[@route:host_verification_adb:waitForElementToAppear] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'ADB waitForElementToAppear error: {str(e)}'
        }), 500

@host_verification_adb_bp.route('/waitForElementToDisappear', methods=['POST'])
def wait_for_element_to_disappear():
    """Execute ADB waitForElementToDisappear verification"""
    try:
        print("[@route:host_verification_adb:waitForElementToDisappear] Executing ADB waitForElementToDisappear")
        
        # Get request data
        data = request.get_json() or {}
        search_term = data.get('search_term')
        timeout = data.get('timeout', 0.0)
        device_id = data.get('device_id', 'device1')
        
        # Validate required parameters
        if not search_term:
            return jsonify({
                'success': False,
                'error': 'search_term is required'
            }), 400
        
        # Get ADB verification controller using helper
        adb_controller, _, error_response = get_verification_controller(device_id, 'verification_adb')
        if error_response:
            return error_response
        
        # Execute verification using unified method
        verification_config = {
            'command': 'waitForElementToDisappear',
            'params': {
                'search_term': search_term,
                'timeout': timeout
            }
        }
        
        result = adb_controller.execute_verification(verification_config)
        
        # Build clean response with frontend-expected properties
        response = {
            'success': result.get('success', False),
            'message': result.get('message', 'Unknown result'),
            'verification_type': 'adb',
            'resultType': 'PASS' if result.get('success') else 'FAIL',
            'matchingResult': result.get('matching_result', 0.0),
            'userThreshold': result.get('user_threshold', 0.8),
            'imageFilter': result.get('image_filter', 'none'),
            'extractedText': result.get('extractedText', ''),
            'searchedText': result.get('searchedText', ''),
            'command': 'waitForElementToDisappear',
            'device_id': device_id
        }
        
        return jsonify(response)
        
    except Exception as e:
        print(f"[@route:host_verification_adb:waitForElementToDisappear] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'ADB waitForElementToDisappear error: {str(e)}'
        }), 500 
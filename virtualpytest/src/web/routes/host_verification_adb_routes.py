"""
Host Verification ADB Routes

This module contains the host-side ADB verification endpoints that:
- Execute ADB element detection using local controllers
- Handle ADB wait operations
- Manage ADB verification operations
"""

from flask import Blueprint, request, jsonify, current_app
from src.utils.host_utils import get_local_controller

# Create blueprint
verification_adb_host_bp = Blueprint('verification_adb_host', __name__, url_prefix='/host/verification/adb')

# =====================================================
# HOST-SIDE ADB VERIFICATION ENDPOINTS
# =====================================================

@verification_adb_host_bp.route('/get-element-lists', methods=['POST'])
def adb_element_lists():
    """Get ADB element lists using the local ADB controller."""
    try:
        data = request.get_json()
        search_term = data.get('search_term', '')
        model = data.get('model', 'default')
        
        print(f"[@route:adb_element_lists] Getting ADB element lists for model: {model}")
        if search_term:
            print(f"[@route:adb_element_lists] With search term: '{search_term}'")
        
        # Get local ADB controller
        adb_controller = get_local_controller('adb')
        if not adb_controller:
            return jsonify({
                'success': False,
                'error': 'ADB controller not available'
            }), 503
        
        print(f"[@route:adb_element_lists] Using local ADB controller")
        
        # Get element lists from ADB controller
        if search_term:
            elements = adb_controller.get_element_lists(search_term=search_term)
        else:
            elements = adb_controller.get_element_lists()
        
        total_elements = len(elements) if elements else 0
        print(f"[@route:adb_element_lists] Found {total_elements} elements")
        
        return jsonify({
            'success': True,
            'data': {
                'elements': elements,
                'total_elements': total_elements,
                'search_term': search_term
            }
        })
        
    except Exception as e:
        print(f"[@route:adb_element_lists] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'ADB element lists error: {str(e)}'
        }), 500

@verification_adb_host_bp.route('/wait-element-appear', methods=['POST'])
def adb_wait_element_appear():
    """Wait for ADB element to appear using the local ADB controller."""
    try:
        data = request.get_json()
        search_term = data.get('search_term', '')
        timeout = data.get('timeout', 10.0)
        model = data.get('model', 'default')
        
        print(f"[@route:adb_wait_element_appear] Waiting for element to appear: '{search_term}' (timeout: {timeout}s)")
        
        # Validate required parameters
        if not search_term:
            return jsonify({
                'success': False,
                'error': 'search_term is required'
            }), 400
        
        # Get local ADB controller
        adb_controller = get_local_controller('adb')
        if not adb_controller:
            return jsonify({
                'success': False,
                'error': 'ADB controller not available'
            }), 503
        
        print(f"[@route:adb_wait_element_appear] Using local ADB controller")
        
        # Wait for element to appear
        result = adb_controller.wait_for_element_appear(search_term, timeout=timeout)
        
        if result:
            print(f"[@route:adb_wait_element_appear] Element appeared: '{search_term}'")
            return jsonify({
                'success': True,
                'message': f'Element appeared: {search_term}',
                'search_term': search_term,
                'timeout': timeout
            })
        else:
            print(f"[@route:adb_wait_element_appear] Element did not appear: '{search_term}'")
            return jsonify({
                'success': False,
                'message': f'Element did not appear within {timeout}s: {search_term}',
                'search_term': search_term,
                'timeout': timeout
            })
        
    except Exception as e:
        print(f"[@route:adb_wait_element_appear] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'ADB wait element appear error: {str(e)}'
        }), 500

@verification_adb_host_bp.route('/wait-element-disappear', methods=['POST'])
def adb_wait_element_disappear():
    """Wait for ADB element to disappear using the local ADB controller."""
    try:
        data = request.get_json()
        search_term = data.get('search_term', '')
        timeout = data.get('timeout', 10.0)
        model = data.get('model', 'default')
        
        print(f"[@route:adb_wait_element_disappear] Waiting for element to disappear: '{search_term}' (timeout: {timeout}s)")
        
        # Validate required parameters
        if not search_term:
            return jsonify({
                'success': False,
                'error': 'search_term is required'
            }), 400
        
        # Get local ADB controller
        adb_controller = get_local_controller('adb')
        if not adb_controller:
            return jsonify({
                'success': False,
                'error': 'ADB controller not available'
            }), 503
        
        print(f"[@route:adb_wait_element_disappear] Using local ADB controller")
        
        # Wait for element to disappear
        result = adb_controller.wait_for_element_disappear(search_term, timeout=timeout)
        
        if result:
            print(f"[@route:adb_wait_element_disappear] Element disappeared: '{search_term}'")
            return jsonify({
                'success': True,
                'message': f'Element disappeared: {search_term}',
                'search_term': search_term,
                'timeout': timeout
            })
        else:
            print(f"[@route:adb_wait_element_disappear] Element still present: '{search_term}'")
            return jsonify({
                'success': False,
                'message': f'Element still present after {timeout}s: {search_term}',
                'search_term': search_term,
                'timeout': timeout
            })
        
    except Exception as e:
        print(f"[@route:adb_wait_element_disappear] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'ADB wait element disappear error: {str(e)}'
        }), 500

# =====================================================
# HOST-SIDE ADB VERIFICATION EXECUTION
# =====================================================

def execute_adb_verification_host(verification, source_path, model, verification_index, results_dir):
    """Execute ADB verification using existing ADB utilities."""
    try:
        params = verification.get('params', {})
        command = verification.get('command', '')
        
        # Get element selector from inputValue (where client stores it)
        element_selector = verification.get('inputValue', '') or params.get('text', '')
        timeout = params.get('timeout', 10.0)
        
        print(f"[@route:execute_adb_verification_host] Command: {command}")
        print(f"[@route:execute_adb_verification_host] Element selector: '{element_selector}'")
        print(f"[@route:execute_adb_verification_host] Timeout: {timeout}s")
        print(f"[@route:execute_adb_verification_host] Available params: {list(params.keys())}")
        print(f"[@route:execute_adb_verification_host] Verification keys: {list(verification.keys())}")
        
        if not element_selector:
            return {
                'success': False,
                'error': 'No element selector specified for ADB verification',
                'verification_type': 'adb'
            }
        
        # Import ADB controller
        from controllers.verification.adb import ADBVerificationController
        
        # Get device ID from model
        device_id = get_device_id_from_model(model)
        if not device_id:
            return {
                'success': False,
                'error': f'No ADB device configured for model: {model}',
                'verification_type': 'adb'
            }
        
        # Initialize ADB controller (no SSH connection needed for local operations)
        adb_controller = ADBVerificationController(device_id, model)
        
        # Execute verification based on command
        if command == 'adb_element_appear':
            success, message, result_data = adb_controller.waitForElementToAppear(element_selector, timeout)
        elif command == 'adb_element_disappear':
            success, message, result_data = adb_controller.waitForElementToDisappear(element_selector, timeout)
        else:
            return {
                'success': False,
                'error': f'Unknown ADB command: {command}',
                'verification_type': 'adb'
            }
        
        # Build comprehensive result
        result = {
            'success': success,
            'message': message,
            'verification_type': 'adb',
            'command': command,
            'element_selector': element_selector,
            'timeout': timeout,
            'device_id': device_id,
            'model': model
        }
        
        # Add result data if available
        if result_data:
            result.update({
                'search_term': result_data.get('search_term'),
                'wait_time': result_data.get('wait_time'),
                'total_matches': result_data.get('total_matches', 0),
                'matches': result_data.get('matches', []),
                'successful_term': result_data.get('successful_term'),
                'attempted_terms': result_data.get('attempted_terms', []),
                'search_details': result_data.get('search_details', {}),
                'timeout_reached': result_data.get('timeout_reached', False),
                'infrastructure_error': result_data.get('infrastructure_error', False)
            })
            
            # Add specific data for disappear verification
            if command == 'adb_element_disappear':
                result.update({
                    'element_still_present': result_data.get('element_still_present', False),
                    'still_present_elements': result_data.get('still_present_elements', []),
                    'total_still_present': result_data.get('total_still_present', 0)
                })
        
        print(f"[@route:execute_adb_verification_host] Verification completed: {success}")
        if success:
            print(f"[@route:execute_adb_verification_host] Success message: {message}")
        else:
            print(f"[@route:execute_adb_verification_host] Failure message: {message}")
            
        return result
        
    except Exception as e:
        print(f"[@route:execute_adb_verification_host] Error: {str(e)}")
        return {
            'success': False,
            'error': f'ADB verification error: {str(e)}',
            'verification_type': 'adb'
        }

def get_device_id_from_model(model):
    """
    Get ADB device ID from model name.
    This should be configured based on your setup.
    """
    # TODO: Configure this mapping based on your actual device setup
    device_mapping = {
        'android_mobile': '192.168.1.100:5555',  # Example mapping
        'android_tablet': '192.168.1.101:5555',
        'default': '192.168.1.100:5555'
    }
    
    device_id = device_mapping.get(model, device_mapping.get('default'))
    print(f"[@route:get_device_id_from_model] Model '{model}' mapped to device: {device_id}")
    return device_id 
"""
Verification ADB Host Routes

This module contains the host-side ADB verification API endpoints that:
- Handle ADB UI element detection
- Execute ADB verification tests
- Wait for elements to appear/disappear
"""

from flask import Blueprint, request, jsonify
import os

# Create blueprint
verification_adb_host_bp = Blueprint('verification_adb_host', __name__)

# =====================================================
# HOST-SIDE ADB VERIFICATION ENDPOINTS
# =====================================================

@verification_adb_host_bp.route('/stream/adb-element-lists', methods=['POST'])
def host_adb_element_lists():
    """Get ADB UI element lists using existing ADB controller."""
    try:
        data = request.get_json()
        model = data.get('model', 'default')
        search_term = data.get('search_term', '')
        
        print(f"[@route:host_adb_element_lists] Getting ADB element lists for model: {model}")
        if search_term:
            print(f"[@route:host_adb_element_lists] With search term: '{search_term}'")
        
        # Import ADB controller
        from controllers.verification.adb import ADBVerificationController
        from utils.sshUtils import SSHConnection
        
        # Create SSH connection (localhost since we're on the host)
        ssh_connection = SSHConnection()
        ssh_connection.connect('localhost', 22, 'root', password='your_password')  # Adjust credentials as needed
        
        # Get device ID from model (you may need to adjust this mapping)
        device_id = get_device_id_from_model(model)
        if not device_id:
            return jsonify({
                'success': False,
                'error': f'No ADB device configured for model: {model}'
            }), 400
        
        # Initialize ADB controller
        adb_controller = ADBVerificationController(ssh_connection, device_id, model)
        
        if search_term:
            # Use smart search functionality
            success, result_data, error = adb_controller.getElementListsWithSmartSearch(search_term)
        else:
            # Get all elements
            success, elements, error = adb_controller.getElementLists()
            result_data = {
                'total_elements': len(elements),
                'elements': elements,
                'device_info': {
                    'device_id': device_id,
                    'device_name': model
                }
            }
        
        if success:
            print(f"[@route:host_adb_element_lists] Success: {result_data.get('total_elements', 0)} elements")
            return jsonify({
                'success': True,
                'data': result_data
            })
        else:
            print(f"[@route:host_adb_element_lists] Failed: {error}")
            return jsonify({
                'success': False,
                'error': error
            }), 500
            
    except Exception as e:
        print(f"[@route:host_adb_element_lists] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'ADB element lists error: {str(e)}'
        }), 500

@verification_adb_host_bp.route('/stream/adb-wait-element-appear', methods=['POST'])
def host_adb_wait_element_appear():
    """Wait for ADB element to appear using existing ADB controller."""
    try:
        data = request.get_json()
        search_term = data.get('search_term', '')
        timeout = data.get('timeout', 10.0)
        model = data.get('model', 'default')
        
        print(f"[@route:host_adb_wait_element_appear] Waiting for element: '{search_term}' (timeout: {timeout}s)")
        
        if not search_term:
            return jsonify({
                'success': False,
                'error': 'search_term is required'
            }), 400
        
        # Import ADB controller
        from controllers.verification.adb import ADBVerificationController
        from utils.sshUtils import SSHConnection
        
        # Create SSH connection (localhost since we're on the host)
        ssh_connection = SSHConnection()
        ssh_connection.connect('localhost', 22, 'root', password='your_password')  # Adjust credentials as needed
        
        # Get device ID from model
        device_id = get_device_id_from_model(model)
        if not device_id:
            return jsonify({
                'success': False,
                'error': f'No ADB device configured for model: {model}'
            }), 400
        
        # Initialize ADB controller
        adb_controller = ADBVerificationController(ssh_connection, device_id, model)
        
        # Wait for element to appear
        success, message, result_data = adb_controller.waitForElementToAppear(search_term, timeout)
        
        if success:
            print(f"[@route:host_adb_wait_element_appear] Success: {message}")
            return jsonify({
                'success': True,
                'message': message,
                'data': result_data
            })
        else:
            print(f"[@route:host_adb_wait_element_appear] Failed: {message}")
            return jsonify({
                'success': False,
                'message': message,
                'data': result_data
            }), 200  # Return 200 but success=False for timeout/not found
            
    except Exception as e:
        print(f"[@route:host_adb_wait_element_appear] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'ADB wait element appear error: {str(e)}'
        }), 500

@verification_adb_host_bp.route('/stream/adb-wait-element-disappear', methods=['POST'])
def host_adb_wait_element_disappear():
    """Wait for ADB element to disappear using existing ADB controller."""
    try:
        data = request.get_json()
        search_term = data.get('search_term', '')
        timeout = data.get('timeout', 10.0)
        model = data.get('model', 'default')
        
        print(f"[@route:host_adb_wait_element_disappear] Waiting for element to disappear: '{search_term}' (timeout: {timeout}s)")
        
        if not search_term:
            return jsonify({
                'success': False,
                'error': 'search_term is required'
            }), 400
        
        # Import ADB controller
        from controllers.verification.adb import ADBVerificationController
        from utils.sshUtils import SSHConnection
        
        # Create SSH connection (localhost since we're on the host)
        ssh_connection = SSHConnection()
        ssh_connection.connect('localhost', 22, 'root', password='your_password')  # Adjust credentials as needed
        
        # Get device ID from model
        device_id = get_device_id_from_model(model)
        if not device_id:
            return jsonify({
                'success': False,
                'error': f'No ADB device configured for model: {model}'
            }), 400
        
        # Initialize ADB controller
        adb_controller = ADBVerificationController(ssh_connection, device_id, model)
        
        # Wait for element to disappear
        success, message, result_data = adb_controller.waitForElementToDisappear(search_term, timeout)
        
        if success:
            print(f"[@route:host_adb_wait_element_disappear] Success: {message}")
            return jsonify({
                'success': True,
                'message': message,
                'data': result_data
            })
        else:
            print(f"[@route:host_adb_wait_element_disappear] Failed: {message}")
            return jsonify({
                'success': False,
                'message': message,
                'data': result_data
            }), 200  # Return 200 but success=False for timeout/still present
            
    except Exception as e:
        print(f"[@route:host_adb_wait_element_disappear] Error: {str(e)}")
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
        from utils.sshUtils import SSHConnection
        
        # Create SSH connection (localhost since we're on the host)
        ssh_connection = SSHConnection()
        ssh_connection.connect('localhost', 22, 'root', password='your_password')  # Adjust credentials as needed
        
        # Get device ID from model
        device_id = get_device_id_from_model(model)
        if not device_id:
            return {
                'success': False,
                'error': f'No ADB device configured for model: {model}',
                'verification_type': 'adb'
            }
        
        # Initialize ADB controller
        adb_controller = ADBVerificationController(ssh_connection, device_id, model)
        
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
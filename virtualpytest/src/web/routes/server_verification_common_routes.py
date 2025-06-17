"""
Verification Common Routes

This module contains the common verification API endpoints that:
- Handle verification execution coordination
- Manage reference lists and status
- Provide shared verification utilities
"""

from flask import Blueprint, request, jsonify
import requests
import json

# Create blueprint
verification_common_bp = Blueprint('verification_common', __name__, url_prefix='/server/verification')

def get_host_from_request():
    """
    Get host information from request data.
    Frontend can provide:
    - GET: host_name in query params (simple)
    - POST: full host object in body (efficient - has host_url)
    
    Returns:
        Tuple of (host_info, error_message)
    """
    try:
        if request.method == 'GET':
            host_name = request.args.get('host_name')
            if not host_name:
                return None, 'host_name parameter required'
            # Simple host info for buildHostUrl
            return {'host_name': host_name}, None
        else:
            data = request.get_json() or {}
            host_object = data.get('host')
            
            if not host_object:
                return None, 'host object required in request body'
                
            # Full host object with host_url - most efficient
            return host_object, None
                
    except Exception as e:
        return None, f'Error getting host from request: {str(e)}'

def proxy_to_host(endpoint, method='GET', data=None):
    """
    Proxy a request to the specified host's verification endpoint using buildHostUrl
    
    Args:
        endpoint: The host endpoint to call (e.g., '/host/verification/references')
        method: HTTP method ('GET', 'POST', etc.)
        data: Request data for POST requests (should include host info)
    
    Returns:
        Tuple of (response_data, status_code)
    """
    try:
        # Get host information from request
        host_info, error = get_host_from_request()
        if not host_info:
            return {
                'success': False,
                'error': error or 'Host information required'
            }, 400
        
        # Use buildHostUrl to construct the proper URL
        from src.utils.app_utils import buildHostUrl
        full_url = buildHostUrl(host_info, endpoint)
        
        if not full_url:
            return {
                'success': False,
                'error': 'Failed to build host URL'
            }, 500
        
        print(f"[@route:server_verification:proxy] Proxying {method} {full_url}")
        
        # Prepare request parameters
        kwargs = {
            'timeout': 30,
            'verify': False  # For self-signed certificates
        }
        
        if data:
            kwargs['json'] = data
            kwargs['headers'] = {'Content-Type': 'application/json'}
        
        # Make the request to the host
        if method.upper() == 'GET':
            response = requests.get(full_url, **kwargs)
        elif method.upper() == 'POST':
            response = requests.post(full_url, **kwargs)
        else:
            return {
                'success': False,
                'error': f'Unsupported HTTP method: {method}'
            }, 400
        
        # Return the host's response
        try:
            response_data = response.json()
        except json.JSONDecodeError:
            response_data = {
                'success': False,
                'error': 'Invalid JSON response from host',
                'raw_response': response.text[:500]  # First 500 chars for debugging
            }
        
        return response_data, response.status_code
        
    except requests.exceptions.Timeout:
        return {
            'success': False,
            'error': 'Request to host timed out'
        }, 504
    except requests.exceptions.ConnectionError:
        return {
            'success': False,
            'error': 'Could not connect to host'
        }, 503
    except Exception as e:
        return {
            'success': False,
            'error': f'Proxy error: {str(e)}'
        }, 500

# =====================================================
# COMMON VERIFICATION ENDPOINTS
# =====================================================

@verification_common_bp.route('/actions', methods=['GET', 'POST'])
def get_verification_actions():
    """Get available verification actions for all verification controllers."""
    try:
        # Define available verifications following the same pattern as remote actions
        verifications = {
            'image': [
                {
                    'id': 'wait_for_image_appear',
                    'label': 'Wait for Image to Appear',
                    'command': 'waitForImageToAppear',
                    'params': {
                        'image_path': '',
                        'timeout': 10.0,
                        'threshold': 0.8,
                        'area': None
                    },
                    'description': 'Wait for specific image to appear on screen',
                    'requiresInput': True,
                    'inputLabel': 'Image Path',
                    'inputPlaceholder': 'button.png'
                },
                {
                    'id': 'wait_for_image_disappear',
                    'label': 'Wait for Image to Disappear',
                    'command': 'waitForImageToDisappear',
                    'params': {
                        'image_path': '',
                        'timeout': 10.0,
                        'threshold': 0.8,
                        'area': None
                    },
                    'description': 'Wait for specific image to disappear from screen',
                    'requiresInput': True,
                    'inputLabel': 'Image Path',
                    'inputPlaceholder': 'loading.png'
                }
            ],
            'text': [
                {
                    'id': 'wait_for_text_appear',
                    'label': 'Wait for Text to Appear',
                    'command': 'waitForTextToAppear',
                    'params': {
                        'text': '',
                        'timeout': 10.0,
                        'case_sensitive': False,
                        'area': None
                    },
                    'description': 'Wait for specific text to appear on screen',
                    'requiresInput': True,
                    'inputLabel': 'Text',
                    'inputPlaceholder': 'Welcome'
                },
                {
                    'id': 'wait_for_text_disappear',
                    'label': 'Wait for Text to Disappear',
                    'command': 'waitForTextToDisappear',
                    'params': {
                        'text': '',
                        'timeout': 10.0,
                        'case_sensitive': False,
                        'area': None
                    },
                    'description': 'Wait for specific text to disappear from screen',
                    'requiresInput': True,
                    'inputLabel': 'Text',
                    'inputPlaceholder': 'Loading...'
                }
            ],
            'adb': [
                {
                    'id': 'wait_for_element_appear',
                    'label': 'Wait for Element to Appear',
                    'command': 'adb_element_appear',
                    'params': {
                        'timeout': 10.0
                    },
                    'description': 'Wait for UI element to appear using ADB (case-insensitive search across all attributes)',
                    'requiresInput': True,
                    'inputLabel': 'Search Term',
                    'inputPlaceholder': 'HOME'
                },
                {
                    'id': 'wait_for_element_disappear',
                    'label': 'Wait for Element to Disappear',
                    'command': 'adb_element_disappear',
                    'params': {
                        'timeout': 10.0
                    },
                    'description': 'Wait for UI element to disappear using ADB (case-insensitive search across all attributes)',
                    'requiresInput': True,
                    'inputLabel': 'Search Term',
                    'inputPlaceholder': 'loading'
                }
            ]
        }
        
        return jsonify({
            'success': True,
            'controller_type': 'verification',
            'verifications': verifications
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error getting verification actions: {str(e)}'
        }), 500

@verification_common_bp.route('/reference/list', methods=['GET'])
def list_references_v2():
    """Proxy reference list request to selected host (new endpoint structure)"""
    try:
        print("[@route:server_verification:reference/list] Proxying reference list request")
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/verification/references', 'GET')
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@verification_common_bp.route('/reference-list', methods=['GET'])
def list_references():
    """Proxy reference list request to selected host"""
    try:
        print("[@route:server_verification:reference_list] Proxying reference list request")
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/verification/references', 'GET')
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@verification_common_bp.route('/reference-actions', methods=['POST'])
def reference_actions():
    """Proxy reference actions request to selected host"""
    try:
        print("[@route:server_verification:reference_actions] Proxying reference actions request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/verification/reference-actions', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@verification_common_bp.route('/status', methods=['GET'])
def verification_status():
    """Proxy verification status request to selected host"""
    try:
        print("[@route:server_verification:status] Proxying verification status request")
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/verification/status', 'GET')
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# =====================================================
# VERIFICATION CONTROLLER MANAGEMENT
# =====================================================

# REMOVED: All device control and locking endpoints have been removed from verification routes
# Device locking and control is now handled exclusively by server_control_routes.py

# The following endpoints have been REMOVED from verification routes:
# - /server/verification/take-control (REMOVED - use server_control_routes.py)
# - /server/verification/release-control (REMOVED - use server_control_routes.py)
# - /server/verification/lock-device (REMOVED - use server_control_routes.py)
# - /server/verification/unlock-device (REMOVED - use server_control_routes.py)
# - /server/verification/device-lock-status/<d> (REMOVED - use server_control_routes.py)

# For device control, use the main server control endpoints:
# - /server/control/take-control (POST) - Main device control with locking
# - /server/control/release-control (POST) - Release device control and unlock 
"""
Server Remote Routes

Server-side remote control proxy endpoints that forward requests to host remote controllers.
"""

from flask import Blueprint, request, jsonify
import requests
import json

# Create blueprint 
remote_bp = Blueprint('server_remote', __name__, url_prefix='/server/remote')

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
                # Fallback to host_name in request body for compatibility
                host_name = data.get('host_name')
                if host_name:
                    return {'host_name': host_name}, None
                return None, 'host object or host_name required in request body'
                
            # Full host object with host_url - most efficient
            return host_object, None
                
    except Exception as e:
        return None, f'Error getting host from request: {str(e)}'

def proxy_to_host(endpoint, method='GET', data=None):
    """
    Proxy a request to the specified host's remote endpoint using buildHostUrl
    
    Args:
        endpoint: The host endpoint to call (e.g., '/host/remote/take-screenshot')
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
        
        print(f"[@route:server_remote:proxy] Proxying {method} {full_url}")
        
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
# REMOTE CONTROL PROXY ENDPOINTS  
# =====================================================

@remote_bp.route('/take-screenshot', methods=['POST'])
def take_screenshot():
    """Proxy screenshot request to host remote controller."""
    try:
        print(f"[@route:server_remote:take_screenshot] Proxying screenshot request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/remote/take-screenshot', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        print(f"[@route:server_remote:take_screenshot] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Screenshot error: {str(e)}'
        }), 500

@remote_bp.route('/screenshot-and-dump', methods=['POST'])
def screenshot_and_dump():
    """Proxy screenshot and UI dump request to host remote controller."""
    try:
        print(f"[@route:server_remote:screenshot_and_dump] Proxying screenshot and dump request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/remote/screenshot-and-dump', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        print(f"[@route:server_remote:screenshot_and_dump] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Screenshot and dump error: {str(e)}'
        }), 500

@remote_bp.route('/get-apps', methods=['POST'])
def get_apps():
    """Proxy get apps request to host remote controller."""
    try:
        print(f"[@route:server_remote:get_apps] Proxying get apps request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/remote/get-apps', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        print(f"[@route:server_remote:get_apps] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Get apps error: {str(e)}'
        }), 500

@remote_bp.route('/click-element', methods=['POST'])
def click_element():
    """Proxy click element request to host remote controller."""
    try:
        print(f"[@route:server_remote:click_element] Proxying click element request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/remote/click-element', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        print(f"[@route:server_remote:click_element] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Element click error: {str(e)}'
        }), 500

@remote_bp.route('/tap-element', methods=['POST'])
def tap_element():
    """Proxy tap coordinates request to host remote controller."""
    try:
        print(f"[@route:server_remote:tap_element] Proxying tap element request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/remote/tap-element', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        print(f"[@route:server_remote:tap_element] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Coordinate tap error: {str(e)}'
        }), 500

@remote_bp.route('/execute-command', methods=['POST'])
def execute_command():
    """Proxy command execution request to host remote controller."""
    try:
        print(f"[@route:server_remote:execute_command] Proxying execute command request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/remote/execute-command', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        print(f"[@route:server_remote:execute_command] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Command execution error: {str(e)}'
        }), 500

# get-status endpoint removed - not needed

# NOTE: Navigation actions (navigate, click, swipe, key-press) are typically
# handled by navigation/pathfinding routes or direct controller calls.
# 
# If additional specific remote control endpoints are needed, they should be added here
# using the abstract remote controller pattern:
#
# @remote_bp.route('/navigate', methods=['POST'])
# def navigate():
#     """Navigate using abstract remote controller."""
#     try:
#         host_device = getattr(current_app, 'my_host_device', None)
#         if not host_device:
#             return jsonify({'success': False, 'error': 'Host device not initialized'}), 500
#         
#         remote_controller = host_device.get('controller_objects', {}).get('remote')
#         if not remote_controller:
#             return jsonify({'success': False, 'error': 'Remote controller not available'}), 400
#         
#         data = request.get_json()
#         result = remote_controller.navigate(data.get('direction'))
#         return jsonify({'success': True, 'result': result})
#     except Exception as e:
#         return jsonify({'success': False, 'error': str(e)}), 500

# DELETED: All device-specific /android-tv/* and /android-mobile/* endpoints
# - /config endpoints: Configuration happens at registration
# - /defaults endpoints: Controllers are pre-configured
# 
# Controllers are instantiated and configured during host registration.
# Routes should use the abstract controller methods only. 
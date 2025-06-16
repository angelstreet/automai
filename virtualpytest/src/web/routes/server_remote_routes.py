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
                return None, 'host object required in request body'
                
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
# REMOTE CONTROLLER ENDPOINTS
# =====================================================

@remote_bp.route('/take-screenshot', methods=['POST'])
def take_screenshot():
    """Proxy take screenshot request to selected host"""
    try:
        print("[@route:server_remote:take_screenshot] Proxying take screenshot request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/remote/take-screenshot', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@remote_bp.route('/screenshot-and-dump', methods=['POST'])
def screenshot_and_dump():
    """Proxy screenshot and dump request to selected host"""
    try:
        print("[@route:server_remote:screenshot_and_dump] Proxying screenshot and dump request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/remote/screenshot-and-dump', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@remote_bp.route('/get-apps', methods=['POST'])
def get_apps():
    """Proxy get apps request to selected host"""
    try:
        print("[@route:server_remote:get_apps] Proxying get apps request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/remote/get-apps', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@remote_bp.route('/click-element', methods=['POST'])
def click_element():
    """Proxy click element request to selected host"""
    try:
        print("[@route:server_remote:click_element] Proxying click element request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Extract host info and remove it from the data to be sent to host
        host_info, error = get_host_from_request()
        if not host_info:
            return jsonify({
                'success': False,
                'error': error or 'Host information required'
            }), 400
        
        # Remove host from request data before sending to host (host doesn't need its own info)
        host_request_data = {k: v for k, v in request_data.items() if k != 'host'}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/remote/click-element', 'POST', host_request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@remote_bp.route('/tap-coordinates', methods=['POST'])
def tap_coordinates():
    """Handle tap coordinates for mobile devices - centralized mobile control"""
    try:
        print("[@route:server_remote:tap_coordinates] Proxying tap coordinates request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Extract host info and remove it from the data to be sent to host
        host_info, error = get_host_from_request()
        if not host_info:
            return jsonify({
                'success': False,
                'error': error or 'Host information required'
            }), 400
        
        # Remove host from request data before sending to host (host doesn't need its own info)
        host_request_data = {k: v for k, v in request_data.items() if k != 'host'}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/remote/tap-coordinates', 'POST', host_request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@remote_bp.route('/stream-tap', methods=['POST'])
def stream_tap():
    """Handle stream tap with device coordinate conversion - mobile control integration"""
    try:
        data = request.get_json()
        host = data.get('host')
        stream_x = data.get('stream_x')
        stream_y = data.get('stream_y')
        stream_width = data.get('stream_width')
        stream_height = data.get('stream_height')
        device_width = data.get('device_width')
        device_height = data.get('device_height')
        
        if not all([host, stream_x is not None, stream_y is not None, 
                   stream_width, stream_height, device_width, device_height]):
            return jsonify({
                'success': False,
                'error': 'Missing required parameters for stream tap conversion'
            }), 400
            
        # Convert stream coordinates to device coordinates
        device_x = int((stream_x / stream_width) * device_width)
        device_y = int((stream_y / stream_height) * device_height)
        
        print(f"[@route:server_remote] Converting stream tap ({stream_x}, {stream_y}) to device coordinates ({device_x}, {device_y})")
        
        # Use the centralized tap coordinates handler
        return tap_coordinates_internal(host, device_x, device_y)
        
    except Exception as e:
        print(f"[@route:server_remote] Error in stream_tap: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500

def tap_coordinates_internal(host, x, y):
    """Internal helper for tap coordinate handling"""
    try:
        # Use the proxy system to forward to host
        from src.utils.app_utils import buildHostUrl
        full_url = buildHostUrl(host, '/host/remote/tap-coordinates')
        
        if not full_url:
            return jsonify({
                'success': False,
                'error': 'Failed to build host URL'
            }), 500
        
        print(f"[@route:server_remote] Internal tap proxying to {full_url}: ({x}, {y})")
        
        import requests
        response = requests.post(
            full_url,
            json={'x': x, 'y': y},
            timeout=30,
            verify=False,
            headers={'Content-Type': 'application/json'}
        )
        
        try:
            result = response.json()
        except:
            result = {'success': False, 'error': 'Invalid response from host'}
        
        return jsonify(result), response.status_code
            
    except Exception as e:
        print(f"[@route:server_remote] Error in tap_coordinates_internal: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500

@remote_bp.route('/execute-command', methods=['POST'])
def execute_command():
    """Proxy execute command request to selected host"""
    try:
        print("[@route:server_remote:execute_command] Proxying execute command request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Extract host info and remove it from the data to be sent to host
        host_info, error = get_host_from_request()
        if not host_info:
            return jsonify({
                'success': False,
                'error': error or 'Host information required'
            }), 400
        
        # Remove host from request data before sending to host (host doesn't need its own info)
        host_request_data = {k: v for k, v in request_data.items() if k != 'host'}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/remote/execute-command', 'POST', host_request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@remote_bp.route('/dump-ui', methods=['POST'])
def dump_ui():
    """Dump UI elements without screenshot - for HDMI stream usage"""
    try:
        print("[@route:server_remote:dump_ui] Proxying dump UI request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/remote/dump-ui', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
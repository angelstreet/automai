"""
Server Remote Routes

Server-side remote control proxy endpoints that forward requests to host remote controllers.
"""

from flask import Blueprint, request, jsonify
from src.web.utils.routeUtils import proxy_to_host, get_host_from_request
import requests

# Create blueprint 
remote_bp = Blueprint('server_remote', __name__, url_prefix='/server/remote')

# =====================================================
# REMOTE CONTROLLER ENDPOINTS
# =====================================================

@remote_bp.route('/takeScreenshot', methods=['POST'])
def take_screenshot():
    """Proxy take screenshot request to selected host"""
    try:
        print("[@route:server_remote:take_screenshot] Proxying take screenshot request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/remote/takeScreenshot', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@remote_bp.route('/screenshotAndDump', methods=['POST'])
def screenshot_and_dump():
    """Proxy screenshot and dump request to selected host"""
    try:
        print("[@route:server_remote:screenshot_and_dump] Proxying screenshot and dump request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/remote/screenshotAndDump', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@remote_bp.route('/getApps', methods=['POST'])
def get_apps():
    """Proxy get apps request to selected host"""
    try:
        print("[@route:server_remote:get_apps] Proxying get apps request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/remote/getApps', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@remote_bp.route('/clickElement', methods=['POST'])
def click_element():
    """Proxy click element request to selected host (for Appium controllers)"""
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
        response_data, status_code = proxy_to_host('/host/remote/clickElement', 'POST', host_request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@remote_bp.route('/tapCoordinates', methods=['POST'])
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
        response_data, status_code = proxy_to_host('/host/remote/tapCoordinates', 'POST', host_request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@remote_bp.route('/streamTap', methods=['POST'])
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
        # Use the centralized API URL builder to forward to host
        from src.utils.build_url_utils import buildHostUrl
        full_url = buildHostUrl(host, '/host/remote/tapCoordinates')
        
        if not full_url:
            return jsonify({
                'success': False,
                'error': 'Failed to build host URL'
            }), 500
        
        print(f"[@route:server_remote] Internal tap proxying to {full_url}: ({x}, {y})")
        
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

@remote_bp.route('/executeCommand', methods=['POST'])
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
        response_data, status_code = proxy_to_host('/host/remote/executeCommand', 'POST', host_request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@remote_bp.route('/dumpUi', methods=['POST'])
def dump_ui():
    """Dump UI elements without screenshot - for HDMI stream usage"""
    try:
        print("[@route:server_remote:dump_ui] Proxying dump UI request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/remote/dumpUi', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
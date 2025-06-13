"""
Server Audio/Video Routes

This module contains the server-side audio/video API endpoints that proxy requests
to the selected host's AV controller endpoints.

These endpoints run on the server and forward requests to the appropriate host.
"""

from flask import Blueprint, request, jsonify
import requests
import json

# Create blueprint
av_bp = Blueprint('server_av', __name__, url_prefix='/server/av')

def get_selected_host_url():
    """Get the base URL for the currently selected host"""
    # TODO: Implement logic to get selected host from session/context
    # For now, this is a placeholder that should be implemented based on your host selection logic
    # This should return something like: "https://sunri-pi1:8443"
    
    # Example implementation - you'll need to adapt this to your actual host selection mechanism
    try:
        # This could come from session, request headers, or global state
        # Replace this with your actual host selection logic
        selected_host = "sunri-pi1:8443"  # Placeholder
        return f"https://{selected_host}"
    except Exception as e:
        print(f"[@route:server_av] Error getting selected host URL: {e}")
        return None

def proxy_to_host(endpoint, method='GET', data=None):
    """
    Proxy a request to the selected host's AV endpoint
    
    Args:
        endpoint: The host endpoint to call (e.g., '/host/av/get-stream-url')
        method: HTTP method ('GET', 'POST', etc.)
        data: Request data for POST requests
    
    Returns:
        Tuple of (response_data, status_code)
    """
    try:
        host_url = get_selected_host_url()
        if not host_url:
            return {
                'success': False,
                'error': 'No host selected or host URL unavailable'
            }, 500
        
        full_url = f"{host_url}{endpoint}"
        print(f"[@route:server_av:proxy] Proxying {method} {full_url}")
        
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

@av_bp.route('/restart-stream', methods=['POST'])
def restart_stream():
    """Proxy restart stream request to selected host"""
    try:
        print("[@route:server_av:restart_stream] Proxying restart stream request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/av/restart-stream', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@av_bp.route('/get-stream-url', methods=['GET'])
def get_stream_url():
    """Proxy get stream URL request to selected host"""
    try:
        print("[@route:server_av:get_stream_url] Proxying get stream URL request")
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/av/get-stream-url', 'GET')
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@av_bp.route('/status', methods=['GET'])
def get_status():
    """Proxy get status request to selected host"""
    try:
        print("[@route:server_av:status] Proxying get status request")
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/av/status', 'GET')
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@av_bp.route('/screenshot', methods=['POST'])
def take_screenshot():
    """Proxy take screenshot request to selected host"""
    try:
        print("[@route:server_av:screenshot] Proxying take screenshot request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/av/screenshot', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@av_bp.route('/start-capture', methods=['POST'])
def start_video_capture():
    """Proxy start video capture request to selected host"""
    try:
        print("[@route:server_av:start_capture] Proxying start video capture request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/av/start-capture', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@av_bp.route('/stop-capture', methods=['POST'])
def stop_video_capture():
    """Proxy stop video capture request to selected host"""
    try:
        print("[@route:server_av:stop_capture] Proxying stop video capture request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/av/stop-capture', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@av_bp.route('/take-control', methods=['POST'])
def take_control():
    """Proxy take control request to selected host"""
    try:
        print("[@route:server_av:take_control] Proxying take control request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/av/take-control', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@av_bp.route('/connect', methods=['POST'])
def connect():
    """Proxy connect request to selected host"""
    try:
        print("[@route:server_av:connect] Proxying connect request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/av/connect', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@av_bp.route('/disconnect', methods=['POST'])
def disconnect():
    """Proxy disconnect request to selected host"""
    try:
        print("[@route:server_av:disconnect] Proxying disconnect request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/av/disconnect', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500 
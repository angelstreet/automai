"""
Server Audio/Video Routes

This module contains the server-side audio/video API endpoints that proxy requests
to the selected host's AV controller endpoints.

These endpoints run on the server and forward requests to the appropriate host.
"""

from flask import Blueprint, request, jsonify, Response
import requests
from src.web.utils.routeUtils import proxy_to_host, proxy_to_host_with_params, get_host_from_request

# Create blueprint
av_bp = Blueprint('server_av', __name__, url_prefix='/server/av')

@av_bp.route('/restart-stream', methods=['POST'])
def restart_stream():
    """Proxy restart stream request to selected host with device_id"""
    try:
        print("[@route:server_av:restart_stream] Proxying restart stream request")
        
        # Extract request data
        request_data = request.get_json() or {}
        host = request_data.get('host')
        device_id = request_data.get('device_id', 'device1')

        # Validate host
        if not host:
            return jsonify({'success': False, 'error': 'Host required'}), 400

        print(f"[@route:server_av:restart_stream] Host: {host.get('host_name')}, Device: {device_id}")

        # Add device_id to query params for host route
        query_params = {'device_id': device_id}

        # Proxy to host with device_id
        response_data, status_code = proxy_to_host_with_params(
            '/host/av/restart-stream',
            'POST',
            request_data,
            query_params
        )

        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@av_bp.route('/get-stream-url', methods=['GET', 'POST'])
def get_stream_url():
    """Proxy get stream URL request to selected host with device_id"""
    try:
        print("[@route:server_av:get_stream_url] Proxying get stream URL request")
        
        # Extract request data
        if request.method == 'POST':
            request_data = request.get_json() or {}
            device_id = request_data.get('device_id', 'device1')
        else:
            device_id = request.args.get('device_id', 'device1')
            request_data = {}

        print(f"[@route:server_av:get_stream_url] Device: {device_id}")

        # Add device_id to query params for host route
        query_params = {'device_id': device_id}

        # Proxy to host with device_id
        response_data, status_code = proxy_to_host_with_params(
            '/host/av/get-stream-url',
            'GET',
            request_data,
            query_params
        )
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@av_bp.route('/proxy-image', methods=['GET'])
def proxy_image():
    """
    Proxy HTTP image URLs through HTTPS to solve mixed content issues.
    Only proxies HTTP URLs - returns HTTPS/data URLs directly.
    """
    try:
        # Get image URL from query parameters
        image_url = request.args.get('url')
        if not image_url:
            return jsonify({
                'success': False,
                'error': 'Missing url parameter'
            }), 400
        
        print(f"[@route:server_av:proxy_image] Processing image URL: {image_url}")
        
        # Handle data URLs (base64) - return as is
        if image_url.startswith('data:'):
            print("[@route:server_av:proxy_image] Data URL detected, redirecting directly")
            return Response(
                image_url,
                content_type='text/plain',
                headers={'Access-Control-Allow-Origin': '*'}
            )
        
        # Handle HTTPS URLs - return as is (no proxy needed)
        if image_url.startswith('https:'):
            print("[@route:server_av:proxy_image] HTTPS URL detected, redirecting directly")
            return Response(
                '',
                status=302,
                headers={
                    'Location': image_url,
                    'Access-Control-Allow-Origin': '*'
                }
            )
        
        # Handle HTTP URLs - proxy through HTTPS
        if image_url.startswith('http:'):
            print(f"[@route:server_av:proxy_image] HTTP URL detected, proxying: {image_url}")
            
            try:
                # Fetch image from HTTP source
                response = requests.get(image_url, stream=True, timeout=30, verify=False)
                response.raise_for_status()
                
                print(f"[@route:server_av:proxy_image] Successfully fetched image from {image_url}")
                
                # Determine content type
                content_type = response.headers.get('Content-Type', 'image/jpeg')
                
                # Stream the image content
                def generate():
                    for chunk in response.iter_content(chunk_size=8192):
                        if chunk:
                            yield chunk
                
                return Response(
                    generate(),
                    content_type=content_type,
                    headers={
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET',
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Content-Length': response.headers.get('Content-Length'),
                        'Cache-Control': 'no-cache, no-store, must-revalidate'
                    }
                )
                
            except requests.exceptions.RequestException as e:
                print(f"[@route:server_av:proxy_image] Request failed: {e}")
                return jsonify({
                    'success': False,
                    'error': f'Failed to fetch image: {str(e)}'
                }), 502
        
        # Unknown URL format
        return jsonify({
            'success': False,
            'error': f'Unsupported URL format: {image_url}'
        }), 400
            
    except Exception as e:
        print(f"[@route:server_av:proxy_image] Proxy error: {e}")
        import traceback
        print(f"[@route:server_av:proxy_image] Traceback: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': f'Image proxy error: {str(e)}'
        }), 500

@av_bp.route('/proxy-image', methods=['OPTIONS'])
def proxy_image_options():
    """Handle CORS preflight requests for image proxy"""
    return Response(
        '',
        headers={
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400'
        }
    )

@av_bp.route('/get-status', methods=['GET', 'POST'])
def get_status():
    """Proxy get status request to selected host with device_id"""
    try:
        print("[@route:server_av:get_status] Proxying get status request")
        
        # Extract request data
        if request.method == 'POST':
            request_data = request.get_json() or {}
            device_id = request_data.get('device_id', 'device1')
            host = request_data.get('host')
        else:
            device_id = request.args.get('device_id', 'device1')
            request_data = {}
            host = None

        print(f"[@route:server_av:get_status] Device: {device_id}")

        # Add device_id to query params for host route
        query_params = {'device_id': device_id}

        # Proxy to host with device_id
        response_data, status_code = proxy_to_host_with_params(
            '/host/av/status',
            'GET',
            request_data,
            query_params
        )
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@av_bp.route('/take-screenshot', methods=['POST'])
def take_screenshot():
    """Proxy take screenshot request to selected host with device_id"""
    try:
        print("[@route:server_av:take_screenshot] Proxying take screenshot request")
        
        # Extract request data
        request_data = request.get_json() or {}
        host = request_data.get('host')
        device_id = request_data.get('device_id', 'device1')

        # Validate host
        if not host:
            return jsonify({'success': False, 'error': 'Host required'}), 400

        print(f"[@route:server_av:take_screenshot] Host: {host.get('host_name')}, Device: {device_id}")

        # Add device_id to query params for host route
        query_params = {'device_id': device_id}

        # Proxy to host with device_id
        response_data, status_code = proxy_to_host_with_params(
            '/host/av/take-screenshot',
            'POST',
            request_data,
            query_params
        )
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@av_bp.route('/save-screenshot', methods=['POST'])
def save_screenshot():
    """Proxy save screenshot request to selected host with device_id"""
    try:
        print("[@route:server_av:save_screenshot] Proxying save screenshot request")
        
        # Extract request data
        request_data = request.get_json() or {}
        host = request_data.get('host')
        device_id = request_data.get('device_id', 'device1')

        # Validate host
        if not host:
            return jsonify({'success': False, 'error': 'Host required'}), 400

        print(f"[@route:server_av:save_screenshot] Host: {host.get('host_name')}, Device: {device_id}")

        # Add device_id to query params for host route
        query_params = {'device_id': device_id}

        # Proxy to host with device_id
        response_data, status_code = proxy_to_host_with_params(
            '/host/av/save-screenshot',
            'POST',
            request_data,
            query_params
        )
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@av_bp.route('/start-capture', methods=['POST'])
def start_video_capture():
    """Proxy start video capture request to selected host with device_id"""
    try:
        print("[@route:server_av:start_capture] Proxying start video capture request")
        
        # Extract request data
        request_data = request.get_json() or {}
        host = request_data.get('host')
        device_id = request_data.get('device_id', 'device1')

        # Validate host
        if not host:
            return jsonify({'success': False, 'error': 'Host required'}), 400

        print(f"[@route:server_av:start_capture] Host: {host.get('host_name')}, Device: {device_id}")

        # Add device_id to query params for host route
        query_params = {'device_id': device_id}

        # Proxy to host with device_id
        response_data, status_code = proxy_to_host_with_params(
            '/host/av/start-capture',
            'POST',
            request_data,
            query_params
        )
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@av_bp.route('/stop-capture', methods=['POST'])
def stop_video_capture():
    """Proxy stop video capture request to selected host with device_id"""
    try:
        print("[@route:server_av:stop_capture] Proxying stop video capture request")
        
        # Extract request data
        request_data = request.get_json() or {}
        host = request_data.get('host')
        device_id = request_data.get('device_id', 'device1')

        # Validate host
        if not host:
            return jsonify({'success': False, 'error': 'Host required'}), 400

        print(f"[@route:server_av:stop_capture] Host: {host.get('host_name')}, Device: {device_id}")

        # Add device_id to query params for host route
        query_params = {'device_id': device_id}

        # Proxy to host with device_id
        response_data, status_code = proxy_to_host_with_params(
            '/host/av/stop-capture',
            'POST',
            request_data,
            query_params
        )
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@av_bp.route('/take-control', methods=['POST'])
def take_control():
    """Proxy take control request to selected host with device_id"""
    try:
        print("[@route:server_av:take_control] Proxying take control request")
        
        # Extract request data
        request_data = request.get_json() or {}
        host = request_data.get('host')
        device_id = request_data.get('device_id', 'device1')

        # Validate host
        if not host:
            return jsonify({'success': False, 'error': 'Host required'}), 400

        print(f"[@route:server_av:take_control] Host: {host.get('host_name')}, Device: {device_id}")

        # Add device_id to query params for host route
        query_params = {'device_id': device_id}

        # Proxy to host with device_id
        response_data, status_code = proxy_to_host_with_params(
            '/host/av/take-control',
            'POST',
            request_data,
            query_params
        )
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@av_bp.route('/connect', methods=['POST'])
def connect():
    """Proxy connect request to selected host with device_id"""
    try:
        print("[@route:server_av:connect] Proxying connect request")
        
        # Extract request data
        request_data = request.get_json() or {}
        host = request_data.get('host')
        device_id = request_data.get('device_id', 'device1')

        # Validate host
        if not host:
            return jsonify({'success': False, 'error': 'Host required'}), 400

        print(f"[@route:server_av:connect] Host: {host.get('host_name')}, Device: {device_id}")

        # Add device_id to query params for host route
        query_params = {'device_id': device_id}

        # Proxy to host with device_id
        response_data, status_code = proxy_to_host_with_params(
            '/host/av/connect',
            'POST',
            request_data,
            query_params
        )
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@av_bp.route('/disconnect', methods=['POST'])
def disconnect():
    """Proxy disconnect request to selected host with device_id"""
    try:
        print("[@route:server_av:disconnect] Proxying disconnect request")
        
        # Extract request data
        request_data = request.get_json() or {}
        host = request_data.get('host')
        device_id = request_data.get('device_id', 'device1')

        # Validate host
        if not host:
            return jsonify({'success': False, 'error': 'Host required'}), 400

        print(f"[@route:server_av:disconnect] Host: {host.get('host_name')}, Device: {device_id}")

        # Add device_id to query params for host route
        query_params = {'device_id': device_id}

        # Proxy to host with device_id
        response_data, status_code = proxy_to_host_with_params(
            '/host/av/disconnect',
            'POST',
            request_data,
            query_params
        )
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500 
"""
Server Audio/Video Routes

This module contains the server-side audio/video API endpoints that proxy requests
to the selected host's AV controller endpoints.

These endpoints run on the server and forward requests to the appropriate host.
"""

from flask import Blueprint, request, jsonify, Response
import requests
from src.web.utils.routeUtils import proxy_to_host, get_host_from_request

# Create blueprint
av_bp = Blueprint('server_av', __name__, url_prefix='/server/av')

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

@av_bp.route('/get-stream-url', methods=['GET', 'POST'])
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

@av_bp.route('/get-status', methods=['GET'])
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

@av_bp.route('/take-screenshot', methods=['POST'])
def take_screenshot():
    """Proxy take screenshot request to selected host (temporary nginx storage)"""
    try:
        print("[@route:server_av:take_screenshot] Proxying take screenshot request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/av/take-screenshot', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@av_bp.route('/save-screenshot', methods=['POST'])
def save_screenshot():
    """Proxy save screenshot request to selected host (uploads to R2)"""
    try:
        print("[@route:server_av:save_screenshot] Proxying save screenshot request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/av/save-screenshot', 'POST', request_data)
        
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
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
server_av_bp = Blueprint('server_av', __name__, url_prefix='/server/av')

@server_av_bp.route('/restartStream', methods=['POST'])
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
            '/host/av/restartStream',
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

@server_av_bp.route('/getStreamUrl', methods=['GET', 'POST'])
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
            '/host/av/getStreamUrl',
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

@server_av_bp.route('/proxyImage', methods=['GET'])
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

@server_av_bp.route('/proxyImage', methods=['OPTIONS'])
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

@server_av_bp.route('/proxyMonitoringImage/<filename>', methods=['GET'])
def proxy_monitoring_image(filename):
    """
    Proxy monitoring image and JSON requests to the selected host.
    Used for AI monitoring frame display and metadata.
    """
    try:
        # Get host and device_id from query parameters
        host_ip = request.args.get('host_ip')
        host_port = request.args.get('host_port', '5000')
        device_id = request.args.get('device_id', 'device1')
        
        if not host_ip:
            return jsonify({
                'success': False,
                'error': 'host_ip parameter required'
            }), 400
        
        print(f"[@route:server_av:proxy_monitoring_image] Proxying monitoring file: {filename} from {host_ip}:{host_port}")
        
        # Determine if this is a JSON file or image file
        is_json = filename.endswith('.json')
        
        if is_json:
            # For JSON files, serve directly from the capture folder using existing image serving endpoint
            file_url = f"http://{host_ip}:{host_port}/host/av/images/screenshot/{filename}?device_id={device_id}"
        else:
            # For images, use the existing image serving endpoint
            file_url = f"http://{host_ip}:{host_port}/host/av/images/screenshot/{filename}?device_id={device_id}"
        
        try:
            # Fetch file from host
            import requests
            response = requests.get(file_url, stream=True, timeout=30, verify=False)
            response.raise_for_status()
            
            print(f"[@route:server_av:proxy_monitoring_image] Successfully fetched file: {filename}")
            
            # Determine content type
            if is_json:
                content_type = 'application/json'
            else:
                content_type = response.headers.get('Content-Type', 'image/jpeg')
            
            # Stream the file content
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
            print(f"[@route:server_av:proxy_monitoring_image] Request failed: {e}")
            return jsonify({
                'success': False,
                'error': f'Failed to fetch monitoring file: {str(e)}'
            }), 502
            
    except Exception as e:
        print(f"[@route:server_av:proxy_monitoring_image] Proxy error: {e}")
        return jsonify({
            'success': False,
            'error': f'Monitoring file proxy error: {str(e)}'
        }), 500

@server_av_bp.route('/proxyStream', methods=['GET'])
def proxy_stream():
    """
    Proxy HTTP HLS streams through HTTPS to solve mixed content issues.
    Handles both m3u8 manifests and TS segments.
    Only proxies HTTP URLs - returns HTTPS URLs directly.
    """
    try:
        # Get stream URL from query parameters
        stream_url = request.args.get('url')
        if not stream_url:
            return jsonify({
                'success': False,
                'error': 'Missing url parameter'
            }), 400
        
        print(f"[@route:server_av:proxy_stream] Processing stream URL: {stream_url}")
        
        # Handle data URLs - return as is (unlikely for streams but consistent)
        if stream_url.startswith('data:'):
            print("[@route:server_av:proxy_stream] Data URL detected, redirecting directly")
            return Response(
                stream_url,
                content_type='text/plain',
                headers={'Access-Control-Allow-Origin': '*'}
            )
        
        # Handle HTTPS URLs - redirect directly (no proxy needed)
        if stream_url.startswith('https:'):
            print("[@route:server_av:proxy_stream] HTTPS URL detected, redirecting directly")
            return Response(
                '',
                status=302,
                headers={
                    'Location': stream_url,
                    'Access-Control-Allow-Origin': '*'
                }
            )
        
        # Handle HTTP URLs - proxy through HTTPS
        if stream_url.startswith('http:'):
            print(f"[@route:server_av:proxy_stream] HTTP stream URL detected, proxying: {stream_url}")
            
            try:
                # Fetch stream from HTTP source
                response = requests.get(stream_url, stream=True, timeout=30, verify=False)
                response.raise_for_status()
                
                print(f"[@route:server_av:proxy_stream] Successfully fetched stream from {stream_url}")
                
                # Determine content type (m3u8 manifest or TS segment)
                content_type = response.headers.get('Content-Type')
                if not content_type:
                    # Default based on file extension
                    if stream_url.endswith('.m3u8'):
                        content_type = 'application/vnd.apple.mpegurl'
                    elif stream_url.endswith('.ts'):
                        content_type = 'video/mp2t'
                    else:
                        content_type = 'application/vnd.apple.mpegurl'
                
                # Handle M3U8 playlist rewriting
                if stream_url.endswith('.m3u8'):
                    print(f"[@route:server_av:proxy_stream] M3U8 playlist detected, rewriting segment URLs")
                    
                    # Read the entire M3U8 content
                    m3u8_content = response.text
                    print(f"[@route:server_av:proxy_stream] Original M3U8 content: {m3u8_content[:500]}...")
                    
                    # Rewrite segment URLs to use our proxy
                    lines = m3u8_content.split('\n')
                    rewritten_lines = []
                    
                    for line in lines:
                        line = line.strip()
                        if line and not line.startswith('#'):
                            # This is a segment URL - rewrite it
                            if line.endswith('.ts'):
                                # Build the full URL for the segment
                                base_url = stream_url.rsplit('/', 1)[0]  # Remove filename, keep path
                                segment_full_url = f"{base_url}/{line}"
                                # Create proxy URL for this segment
                                proxy_segment_url = f"/server/av/proxy-stream?url={requests.utils.quote(segment_full_url, safe='')}"
                                print(f"[@route:server_av:proxy_stream] Rewriting segment: {line} -> {proxy_segment_url}")
                                rewritten_lines.append(proxy_segment_url)
                            else:
                                rewritten_lines.append(line)
                        else:
                            rewritten_lines.append(line)
                    
                    rewritten_content = '\n'.join(rewritten_lines)
                    print(f"[@route:server_av:proxy_stream] Rewritten M3U8 content: {rewritten_content[:500]}...")
                    
                    return Response(
                        rewritten_content,
                        content_type=content_type,
                        headers={
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Methods': 'GET',
                            'Access-Control-Allow-Headers': 'Content-Type',
                            'Cache-Control': 'no-cache, no-store, must-revalidate'
                        }
                    )
                
                # Stream the content (for TS segments)
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
                print(f"[@route:server_av:proxy_stream] Request failed: {e}")
                return jsonify({
                    'success': False,
                    'error': f'Failed to fetch stream: {str(e)}'
                }), 502
        
        # Unknown URL format
        return jsonify({
            'success': False,
            'error': f'Unsupported URL format: {stream_url}'
        }), 400
            
    except Exception as e:
        print(f"[@route:server_av:proxy_stream] Proxy error: {e}")
        import traceback
        print(f"[@route:server_av:proxy_stream] Traceback: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': f'Stream proxy error: {str(e)}'
        }), 500

@server_av_bp.route('/proxyStream', methods=['OPTIONS'])
def proxy_stream_options():
    """Handle CORS preflight requests for stream proxy"""
    return Response(
        '',
        headers={
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400'
        }
    )

@server_av_bp.route('/getStatus', methods=['GET', 'POST'])
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

@server_av_bp.route('/takeScreenshot', methods=['POST'])
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
            '/host/av/takeScreenshot',
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

@server_av_bp.route('/saveScreenshot', methods=['POST'])
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
            '/host/av/saveScreenshot',
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

@server_av_bp.route('/startCapture', methods=['POST'])
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
            '/host/av/startCapture',
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

@server_av_bp.route('/stopCapture', methods=['POST'])
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
            '/host/av/stopCapture',
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

@server_av_bp.route('/takeControl', methods=['POST'])
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
            '/host/av/takeControl',
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

@server_av_bp.route('/connect', methods=['POST'])
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

@server_av_bp.route('/disconnect', methods=['POST'])
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

@server_av_bp.route('/listCaptures', methods=['POST'])
def list_captures():
    """Proxy list captures request to selected host with device_id"""
    try:
        print("[@route:server_av:list_captures] Proxying list captures request")
        
        # Extract request data
        request_data = request.get_json() or {}
        host = request_data.get('host')
        device_id = request_data.get('device_id', 'device1')

        # Validate host
        if not host:
            return jsonify({'success': False, 'error': 'Host required'}), 400

        print(f"[@route:server_av:list_captures] Host: {host.get('host_name')}, Device: {device_id}")

        # Add device_id to query params for host route
        query_params = {'device_id': device_id}

        # Proxy to host with device_id
        response_data, status_code = proxy_to_host_with_params(
            '/host/av/listCaptures',
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
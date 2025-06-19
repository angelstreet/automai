"""
Stream Proxy Routes - Proxy HTTP streams through HTTPS to solve mixed content issues
"""

from flask import Blueprint, Response, request, current_app
import requests
from src.utils.app_utils import get_host_by_name

server_stream_proxy_routes = Blueprint('server_stream_proxy_routes', __name__)

@server_stream_proxy_routes.route('/server/stream-proxy/<host_name>/<path:stream_path>', methods=['GET'])
def proxy_stream(host_name, stream_path):
    """
    Proxy HTTP stream content through HTTPS to solve mixed content issues.
    
    Args:
        host_name: Name of the host to proxy stream from
        stream_path: Path to the stream resource (e.g., 'output.m3u8', 'segment_123.ts')
    """
    try:
        # Get host info from registry
        host_info = get_host_by_name(host_name)
        if not host_info:
            print(f"[@route:stream_proxy] Host not found: {host_name}")
            return "Host not found", 404
        
        # Build the original HTTP URL
        host_base_url = host_info.get('host_url')
        if not host_base_url:
            print(f"[@route:stream_proxy] Host missing host_url: {host_name}")
            return "Host URL not available", 500
        
        # Construct the target URL
        target_url = f"{host_base_url}/host/stream/{stream_path}"
        
        # Forward query parameters
        if request.query_string:
            target_url += f"?{request.query_string.decode()}"
        
        # Make request to the HTTP stream
        try:
            response = requests.get(target_url, stream=True, timeout=30)
            response.raise_for_status()
            
            # Determine content type
            content_type = response.headers.get('Content-Type', 'application/octet-stream')
            
            # For HLS playlists, we need to modify the content to use proxy URLs
            if stream_path.endswith('.m3u8'):
                content = response.text
                
                # Replace segment URLs with proxy URLs
                lines = content.split('\n')
                modified_lines = []
                
                for line in lines:
                    if line.strip() and not line.startswith('#') and not line.startswith('http'):
                        # This is a segment filename, convert to proxy URL
                        proxy_segment_url = f"/server/stream-proxy/{host_name}/{line.strip()}"
                        modified_lines.append(proxy_segment_url)
                    else:
                        modified_lines.append(line)
                
                modified_content = '\n'.join(modified_lines)
                
                print(f"[@route:stream_proxy] Modified HLS playlist with {len([l for l in lines if l.strip() and not l.startswith('#')])} segments")
                
                return Response(
                    modified_content,
                    content_type='application/vnd.apple.mpegurl',
                    headers={
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET',
                        'Access-Control-Allow-Headers': 'Content-Type',
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    }
                )
            else:
                # For other content (segments, etc.), stream directly
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
                        'Accept-Ranges': response.headers.get('Accept-Ranges', 'bytes')
                    }
                )
                
        except requests.exceptions.RequestException as e:
            print(f"[@route:stream_proxy] Request failed: {e}")
            return f"Failed to fetch stream: {str(e)}", 502
            
    except Exception as e:
        print(f"[@route:stream_proxy] Proxy error: {e}")
        import traceback
        print(f"[@route:stream_proxy] Traceback: {traceback.format_exc()}")
        return f"Proxy error: {str(e)}", 500

@server_stream_proxy_routes.route('/server/stream-proxy/<host_name>/<path:stream_path>', methods=['OPTIONS'])
def proxy_stream_options(host_name, stream_path):
    """Handle CORS preflight requests"""
    return Response(
        '',
        headers={
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400'
        }
    ) 
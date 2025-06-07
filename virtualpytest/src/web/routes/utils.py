"""
Shared Route Utilities

This module contains common helper functions used across route modules.
"""

from flask import jsonify, request, current_app
import requests

def check_supabase():
    """Helper function to check if Supabase is available"""
    supabase_client = getattr(current_app, 'supabase_client', None)
    if supabase_client is None:
        return jsonify({'error': 'Supabase not available'}), 503
    return None

def check_controllers_available():
    """Helper function to check if controllers are available"""
    controllers_available = getattr(current_app, 'controllers_available', False)
    if not controllers_available:
        return jsonify({'error': 'VirtualPyTest controllers not available'}), 503
    return None

def get_team_id():
    """Get team_id from request headers or use default for demo"""
    default_team_id = getattr(current_app, 'default_team_id', 'default-team-id')
    return request.headers.get('X-Team-ID', default_team_id)

def get_user_id():
    """Get user_id from request headers or use default for demo"""
    default_user_id = getattr(current_app, 'default_user_id', 'default-user-id')
    return request.headers.get('X-User-ID', default_user_id)

# =====================================================
# HOST MANAGEMENT UTILITIES
# =====================================================

def get_connected_hosts():
    """Get all connected hosts from the registration system"""
    return getattr(current_app, '_connected_clients', {})

def get_host_by_id(host_id):
    """Get a specific host by ID"""
    connected_hosts = get_connected_hosts()
    return connected_hosts.get(host_id)

def get_host_by_model(device_model):
    """Get the first available host with the specified device model"""
    connected_hosts = get_connected_hosts()
    for host_id, host_info in connected_hosts.items():
        if host_info.get('device_model') == device_model:
            return host_info
    return None

def get_primary_host():
    """Get the first available host (fallback when no specific host is needed)"""
    connected_hosts = get_connected_hosts()
    if connected_hosts:
        return next(iter(connected_hosts.values()))
    return None

def build_host_url(host_info, endpoint, use_https=True):
    """
    Build a URL for a host endpoint
    
    Args:
        host_info: Host information dict from registration system
        endpoint: The endpoint path (e.g., '/stream/verification-status')
        use_https: Whether to use HTTPS (default: True)
    
    Returns:
        Complete URL string
    """
    if not host_info:
        raise ValueError("Host information is required")
    
    # Get host IP and port from registration info
    host_ip = host_info.get('local_ip')
    host_port = host_info.get('client_port', '5119')
    
    if not host_ip:
        raise ValueError("Host IP not found in registration info")
    
    # Build protocol
    protocol = 'https' if use_https else 'http'
    
    # Clean endpoint (remove leading slash if present)
    clean_endpoint = endpoint.lstrip('/')
    
    # Build complete URL
    url = f"{protocol}://{host_ip}:{host_port}/{clean_endpoint}"
    
    return url

def build_host_nginx_url(host_info, path):
    """
    Build a URL for host nginx endpoint (for media/files)
    
    Args:
        host_info: Host information dict from registration system  
        path: The file path (e.g., '/stream/captures/image.jpg')
    
    Returns:
        Complete nginx URL string
    """
    if not host_info:
        raise ValueError("Host information is required")
    
    # Get host IP - nginx typically runs on port 444
    host_ip = host_info.get('local_ip')
    nginx_port = '444'  # Standard nginx port for this application
    
    if not host_ip:
        raise ValueError("Host IP not found in registration info")
    
    # Clean path (remove leading slash if present)
    clean_path = path.lstrip('/')
    
    # Build complete nginx URL (always HTTPS for nginx)
    url = f"https://{host_ip}:{nginx_port}/{clean_path}"
    
    return url

def make_host_request(endpoint, method='GET', host_id=None, device_model=None, use_https=True, **kwargs):
    """
    Make a request to a host endpoint with automatic host discovery
    
    Args:
        endpoint: The endpoint path (e.g., '/stream/verification-status')
        method: HTTP method ('GET', 'POST', etc.)
        host_id: Specific host ID to use (optional)
        device_model: Device model to find host for (optional)
        use_https: Whether to use HTTPS (default: True)
        **kwargs: Additional arguments passed to requests.request()
    
    Returns:
        requests.Response object
    """
    # Find the appropriate host
    if host_id:
        host_info = get_host_by_id(host_id)
        if not host_info:
            raise ValueError(f"Host with ID {host_id} not found")
    elif device_model:
        host_info = get_host_by_model(device_model)
        if not host_info:
            raise ValueError(f"No host found with device model {device_model}")
    else:
        host_info = get_primary_host()
        if not host_info:
            raise ValueError("No hosts available")
    
    # Build URL
    url = build_host_url(host_info, endpoint, use_https)
    
    # Add default timeout if not specified
    if 'timeout' not in kwargs:
        kwargs['timeout'] = 30
    
    # Add SSL verification disable for self-signed certificates
    if use_https and 'verify' not in kwargs:
        kwargs['verify'] = False
    
    # Make the request
    print(f"[@utils:make_host_request] Making {method} request to {url}")
    response = requests.request(method, url, **kwargs)
    print(f"[@utils:make_host_request] Response: {response.status_code}")
    
    return response 
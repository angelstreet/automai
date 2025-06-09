"""
Shared Route Utilities

This module contains common helper functions used across route modules.
"""

from flask import jsonify, request, current_app
import requests
import urllib.parse

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
        return jsonify({'error': ' Controllers not available'}), 503
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

def get_connected_clients():
    """Alias for get_connected_hosts - for backward compatibility"""
    return get_connected_hosts()

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
    
    # Get connection info from registration data
    connection = host_info.get('connection', {})
    flask_url = connection.get('flask_url')
    
    if not flask_url:
        # Fallback to legacy fields if connection info not available
        host_ip = host_info.get('local_ip')
        # Use proper naming: host_port for server-to-host communication
        host_port = host_info.get('host_port') or host_info.get('client_port', '5119')  # Fallback for backward compatibility
        
        if not host_ip:
            raise ValueError("Host connection information not found in registration info")
        
        # Build protocol
        protocol = 'https' if use_https else 'http'
        base_url = f"{protocol}://{host_ip}:{host_port}"
    else:
        # Parse the flask_url to get the base URL
        # flask_url format: "http://77.56.53.130:5119"
        parsed = urllib.parse.urlparse(flask_url)
        
        # Use the protocol from use_https parameter, but keep the host and port from flask_url
        protocol = 'https' if use_https else 'http'
        base_url = f"{protocol}://{parsed.hostname}:{parsed.port}"
    
    # Clean endpoint (remove leading slash if present)
    clean_endpoint = endpoint.lstrip('/')
    
    # Build complete URL
    url = f"{base_url}/{clean_endpoint}"
    
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
    
    # Get connection info from registration data
    connection = host_info.get('connection', {})
    nginx_url = connection.get('nginx_url')
    
    if nginx_url:
        # Use the nginx_url directly from connection info
        # nginx_url format: "https://77.56.53.130:444"
        base_url = nginx_url
    else:
        # Fallback: try to get host IP from flask_url or legacy fields
        flask_url = connection.get('flask_url')
        if flask_url:
            parsed = urllib.parse.urlparse(flask_url)
            host_ip = parsed.hostname
        else:
            host_ip = host_info.get('local_ip')
        
        if not host_ip:
            raise ValueError("Host IP not found in registration info")
        
        # Build nginx URL with standard port 444
        base_url = f"https://{host_ip}:444"
    
    # Clean path (remove leading slash if present)
    clean_path = path.lstrip('/')
    
    # Build complete nginx URL
    url = f"{base_url}/{clean_path}"
    
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

def build_device_from_host_info(host_id, host_info):
    """
    Build a complete device object from host registry information.
    This ensures consistent device data structure across all endpoints.
    
    Args:
        host_id: The registry key for the host
        host_info: Host information from the registry
    
    Returns:
        Complete device object with all necessary fields
    """
    # Extract host connection info
    host_ip = host_info.get('host_ip') or host_info.get('local_ip')  # Backward compatibility
    host_port = host_info.get('host_port') or host_info.get('client_port')  # Backward compatibility
    host_name = host_info.get('host_name') or host_info.get('name')  # Backward compatibility
    
    # Extract device info from structured format or backward compatibility
    device_info = host_info.get('device', {})
    if device_info:
        # New structured format - device data already built during registration
        device_id = device_info.get('device_id')
        device_name = device_info.get('device_name')
        device_model = device_info.get('device_model')
        device_ip = device_info.get('device_ip')
        device_port = device_info.get('device_port')
        controller_configs = device_info.get('controller_configs', {})
    else:
        # Backward compatibility - create device info from old format
        device_model = host_info.get('device_model', 'unknown')
        device_id = f"{host_id}_device_{device_model}"
        device_name = f"{device_model.replace('_', ' ').title()}"
        device_ip = host_ip
        device_port = '5555'  # Default ADB port
        controller_configs = {}
    
    return {
        # Device information
        'id': device_id,  # Keep 'id' for NavigationEditor compatibility
        'device_id': device_id,
        'name': device_name,  # Keep 'name' for NavigationEditor compatibility
        'device_name': device_name,
        'model': device_model,  # Keep 'model' for NavigationEditor compatibility
        'device_model': device_model,
        'device_ip': device_ip,
        'device_port': device_port,
        'controller_configs': controller_configs,
        'description': f"Device: {device_name} controlled by host: {host_name}",
        
        # Host reference information
        'host_id': host_id,
        'host_name': host_name,
        'host_ip': host_ip,
        'host_port': host_port,
        'connection': {
            'flask_url': f"http://{host_ip}:{host_port}",
            'nginx_url': f"https://{host_ip}:444"
        },
        'host_connection': {
            'flask_url': f"http://{host_ip}:{host_port}",
            'nginx_url': f"https://{host_ip}:444"
        },
        
        # Status and metadata
        'status': 'online',
        'last_seen': host_info.get('last_seen'),
        'registered_at': host_info.get('registered_at'),
        'capabilities': host_info.get('capabilities', []),
        'system_stats': host_info.get('system_stats', {})
    } 
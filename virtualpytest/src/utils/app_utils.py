import sys
import os
import time
import subprocess
import psutil
import hashlib
import platform
from flask import Flask, current_app, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
import requests

def load_environment_variables(mode='server', calling_script_dir=None):
    """Load environment variables from mode-specific .env file"""
    env_file = f'.env.{mode}'
    
    # If calling_script_dir is provided, use it; otherwise use current working directory
    if calling_script_dir:
        env_path = os.path.join(calling_script_dir, env_file)
    else:
        env_path = os.path.join(os.getcwd(), env_file)
    
    if os.path.exists(env_path):
        load_dotenv(env_path)
        print(f"✅ Loaded environment from: {env_path}")
    else:
        print(f"⚠️ Environment file not found: {env_path}")
    
    return env_path

def kill_process_on_port(port):
    """Simple port cleanup - kill any process using the specified port"""
    try:
        print(f"🔍 Checking for processes using port {port}...")
        
        # Skip if running under Flask reloader to avoid conflicts
        if os.environ.get('WERKZEUG_RUN_MAIN') == 'true':
            print(f"🔄 Flask reloader detected, skipping port cleanup")
            return
        
        # Find and kill processes using the port
        for proc in psutil.process_iter(['pid', 'name']):
            try:
                for conn in proc.connections():
                    if hasattr(conn, 'laddr') and conn.laddr and conn.laddr.port == port:
                        pid = proc.info['pid']
                        if pid != os.getpid():  # Don't kill ourselves
                            print(f"🎯 Killing process PID {pid} using port {port}")
                            psutil.Process(pid).terminate()
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue
                
        print(f"✅ Port {port} cleanup completed")
        
    except Exception as e:
        print(f"❌ Error during port cleanup: {e}")

def setup_flask_app(app_name="VirtualPyTest"):
    """Setup and configure Flask application with CORS"""
    app = Flask(app_name)

    # Configure CORS for development
    CORS(app, 
         origins="*",
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         allow_headers=["Content-Type", "Authorization", "Accept"],
         supports_credentials=False
    )

    # Initialize app context variables
    with app.app_context():
        app._connected_clients = {}
        app._health_check_threads = {}

    return app

def validate_core_environment(mode='server'):
    """Validate only essential environment variables for startup"""
    print(f"🔍 Validating core {mode.upper()} environment variables...")
    
    if mode == 'server':
        required_vars = {
            'SERVER_IP': 'Server IP address',
            'SERVER_PORT': 'Server port number'
        }
    elif mode == 'host':
        required_vars = {
            'SERVER_IP': 'Server IP address',
            'SERVER_PORT': 'Server port number', 
            'HOST_NAME': 'Host identifier name',
            'HOST_IP': 'Host IP address'
        }
    else:
        print(f"⚠️ Unknown mode: {mode}")
        return False
    
    missing_vars = []
    for var_name, description in required_vars.items():
        value = os.getenv(var_name)
        if not value:
            missing_vars.append(f"{var_name} ({description})")
        else:
            display_value = '***' if 'TOKEN' in var_name else value
            print(f"  ✅ {var_name}: {display_value}")
    
    if missing_vars:
        print(f"❌ Missing required core variables:")
        for var in missing_vars:
            print(f"   - {var}")
        return False
    
    print(f"✅ Core {mode} environment variables validated")
    return True

# Lazy loading functions - only load when needed
def lazy_load_controllers():
    """Lazy load controllers when first needed"""
    try:
        from controllers import ControllerFactory, CONTROLLER_REGISTRY, create_device_controllers
        from controllers.base_controller import (
            RemoteControllerInterface, 
            AVControllerInterface, 
            VerificationControllerInterface,
            PowerControllerInterface
        )
        print("✅ Controllers loaded successfully (lazy loaded)")
        return True
    except Exception as e:
        print(f"⚠️ Controllers not available: {e}")
        return False

def lazy_load_adb_utils():
    """Lazy load ADB utilities when first needed"""
    try:
        import adb_utils
        print("✅ ADB utilities loaded successfully (lazy loaded)")
        return adb_utils
    except Exception as e:
        print(f"⚠️ ADB utilities not available: {e}")
        return None

def lazy_load_navigation():
    """Lazy load navigation utilities when first needed"""
    try:
        import navigation_utils
        import navigation_cache
        print("✅ Navigation utilities loaded successfully (lazy loaded)")
        return {'utils': navigation_utils, 'cache': navigation_cache}
    except Exception as e:
        print(f"⚠️ Navigation utilities not available: {e}")
        return None

def lazy_load_device_models():
    """Lazy load device model utilities when first needed"""
    try:
        import devicemodel_utils
        print("✅ Device model utilities loaded successfully (lazy loaded)")
        return devicemodel_utils
    except Exception as e:
        print(f"⚠️ Device model utilities not available: {e}")
        return None

def lazy_load_supabase():
    """Lazy load Supabase client when first needed"""
    try:
        from src.utils.supabase_utils import get_supabase_client
        client = get_supabase_client()
        if client:
            print("✅ Supabase client loaded successfully (lazy loaded)")
        return client
    except Exception as e:
        print(f"⚠️ Supabase client not available: {e}")
        return None

def check_supabase():
    """Helper function to check if Supabase is available (lazy loaded)"""
    try:
        from flask import jsonify
        supabase_client = lazy_load_supabase()
        if supabase_client is None:
            return jsonify({'error': 'Supabase not available'}), 503
        return None
    except Exception:
        from flask import jsonify
        return jsonify({'error': 'Supabase not available'}), 503

def generate_stable_host_id(host_name, host_ip):
    """Generate a stable host ID based on host name and IP"""
    stable_id_string = f"{host_name}-{host_ip}"
    return hashlib.md5(stable_id_string.encode()).hexdigest()

def initialize_global_sessions():
    """Initialize global session storage for controllers"""
    return {
        'android_tv_session': {'controller': None, 'connected': False},
        'ir_remote_session': {'controller': None, 'connected': False},
        'bluetooth_remote_session': {'controller': None, 'connected': False},
        'android_mobile_controller': None
    }

# Server-specific utilities (merged from server_utils.py)
connected_clients = {}
health_check_threads = {}

def initialize_server_globals():
    """Initialize server-specific global variables"""
    global connected_clients, health_check_threads
    connected_clients = {}
    health_check_threads = {}
    print("🖥️ Server mode: Ready to accept host registrations")


def add_connected_client(client_id, client_info):
    """Add a client to the connected clients registry"""
    connected_clients[client_id] = client_info
    print(f"📝 Added client {client_id[:8]}... to registry")

def remove_connected_client(client_id):
    """Remove a client from the connected clients registry"""
    if client_id in connected_clients:
        del connected_clients[client_id]
        print(f"🗑️ Removed client {client_id[:8]}... from registry")

def cleanup_server_resources():
    """Cleanup server resources on shutdown"""
    print(f"🧹 Cleaning up server resources...")
    
    # Stop health check threads
    for client_id, thread in health_check_threads.items():
        if thread and thread.is_alive():
            print(f"🛑 Stopping health check thread for client {client_id[:8]}...")
    
    # Clear registries
    connected_clients.clear()
    health_check_threads.clear()
    print(f"✅ Server cleanup completed")

# Constants
DEFAULT_TEAM_ID = "7fdeb4bb-3639-4ec3-959f-b54769a219ce"
DEFAULT_USER_ID = "eb6cfd93-44ab-4783-bd0c-129b734640f3"

# =====================================================
# URL BUILDER FUNCTIONS (Used by Routes)
# =====================================================

def build_server_url(endpoint: str) -> str:
    """Build a URL for server endpoints using environment configuration"""
    server_host = os.getenv('SERVER_HOST', '127.0.0.1')
    server_port = os.getenv('SERVER_PORT', '5119')
    protocol = os.getenv('SERVER_PROTOCOL', 'http')
    
    # Clean endpoint
    clean_endpoint = endpoint.lstrip('/')
    
    return f"{protocol}://{server_host}:{server_port}/{clean_endpoint}"

def build_host_url(host_info: dict, endpoint: str) -> str:
    """
    Build a URL for host endpoints using pre-built connection data from registry
    
    Args:
        host_info: Host information from the registry containing connection data
        endpoint: The endpoint path to append
    
    Returns:
        Complete URL to the host endpoint
    """
    # Use pre-built flask_url from host connection data
    connection = host_info.get('connection', {})
    flask_url = connection.get('flask_url')
    
    if not flask_url:
        # Fallback to manual building if connection data is missing (legacy support)
        host_ip = host_info.get('host_ip')
        host_port = host_info.get('host_port_external') or host_info.get('host_port') or '6119'
        flask_url = f"http://{host_ip}:{host_port}"
        print(f"⚠️ [build_host_url] No flask_url in connection data, using fallback: {flask_url}")
    
    # Clean endpoint
    clean_endpoint = endpoint.lstrip('/')
    
    return f"{flask_url}/{clean_endpoint}"

def build_host_nginx_url(host_info: dict, path: str) -> str:
    """
    Build a URL for host nginx endpoints using pre-built connection data from registry
    
    Args:
        host_info: Host information from the registry containing connection data
        path: The path to append
    
    Returns:
        Complete nginx URL to the host resource
    """
    # Use pre-built nginx_url from host connection data
    connection = host_info.get('connection', {})
    nginx_url = connection.get('nginx_url')
    
    if not nginx_url:
        # Fallback to manual building if connection data is missing (legacy support)
        host_ip = host_info.get('host_ip')
        host_port_web = host_info.get('host_port_web') or '444'
        nginx_url = f"https://{host_ip}:{host_port_web}"
        print(f"⚠️ [build_host_nginx_url] No nginx_url in connection data, using fallback: {nginx_url}")
    
    # Clean path
    clean_path = path.lstrip('/')
    
    return f"{nginx_url}/{clean_path}"

def build_host_connection_info(host_ip: str, host_port_external: str, host_port_web: str) -> dict:
    """
    Build standardized connection information for a host
    
    Args:
        host_ip: The host IP address
        host_port_external: The external port for server communication
        host_port_web: The web port for HTTPS/nginx
    
    Returns:
        Dictionary with flask_url and nginx_url
    """
    return {
        'flask_url': f"http://{host_ip}:{host_port_external}",
        'nginx_url': f"https://{host_ip}:{host_port_web}"
    }

def get_host_system_stats():
    """Get basic system statistics for host registration"""
    try:
        return {
            'cpu_percent': psutil.cpu_percent(interval=1),
            'memory_percent': psutil.virtual_memory().percent,
            'disk_percent': psutil.disk_usage('/').percent,
            'platform': platform.system(),
            'architecture': platform.machine(),
            'python_version': platform.python_version()
        }
    except Exception as e:
        print(f"⚠️ Error getting system stats: {e}")
        return {
            'cpu_percent': 0,
            'memory_percent': 0,
            'disk_percent': 0,
            'platform': 'unknown',
            'architecture': 'unknown',
            'python_version': 'unknown'
        }

# =====================================================
# HOST REGISTRY FUNCTIONS (Single Source of Truth)
# =====================================================

def get_host_registry():
    """Get the host registry from Flask app context"""
    return getattr(current_app, '_connected_clients', {})

def get_host_by_id(host_id):
    """Get a specific host by ID from the registry"""
    host_registry = get_host_registry()
    return host_registry.get(host_id)

def get_host_by_model(device_model):
    """Get the first available host with the specified device model"""
    host_registry = get_host_registry()
    for host_id, host_info in host_registry.items():
        if host_info.get('model') == device_model or host_info.get('device_model') == device_model:
            return host_info
    return None

def get_primary_host():
    """Get the first available host (fallback when no specific host is needed)"""
    host_registry = get_host_registry()
    if host_registry:
        return next(iter(host_registry.values()))
    return None

# =====================================================
# URL BUILDING FUNCTIONS (Single Source of Truth)
# =====================================================

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
    
    # Build URL using the URL builder
    url = build_host_url(host_info, endpoint)
    
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

# =====================================================
# FLASK-SPECIFIC HELPER FUNCTIONS
# =====================================================

def check_controllers_available():
    """Helper function to check if controllers are available (lazy loaded)"""
    try:
        controllers_available = lazy_load_controllers()
        if not controllers_available:
            return jsonify({'error': 'Controllers not available'}), 503
        return None
    except Exception:
        return jsonify({'error': 'Controllers not available'}), 503

def get_team_id():
    """Get team_id from request headers or use default for demo"""
    default_team_id = getattr(current_app, 'default_team_id', 'default-team-id')
    return request.headers.get('X-Team-ID', default_team_id)

def get_user_id():
    """Get user_id from request headers or use default for demo"""
    default_user_id = getattr(current_app, 'default_user_id', 'default-user-id')
    return request.headers.get('X-User-ID', default_user_id)

# =====================================================

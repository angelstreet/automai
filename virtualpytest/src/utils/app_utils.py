import sys
import os
import time
import subprocess
import psutil

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
            'SERVER_URL': 'Server base URL',
            'SERVER_PORT': 'Server port number'
        }
    elif mode == 'host':
        required_vars = {
            'SERVER_URL': 'Server base URL',
            'HOST_URL': 'Host base URL',
            'HOST_NAME': 'Host identifier name',
            'HOST_PORT': 'Host port number'
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
        from src.controllers import ControllerFactory, CONTROLLER_REGISTRY, create_device_controllers
        from src.controllers.base_controller import (
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

def check_supabase():
    """Helper function to check if Supabase is available"""
    try:
        from flask import jsonify
        from src.utils.supabase_utils import get_supabase_client
        supabase_client = get_supabase_client()
        if supabase_client is None:
            return jsonify({'error': 'Supabase not available'}), 503
        return None
    except Exception:
        from flask import jsonify
        return jsonify({'error': 'Supabase not available'}), 503



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


def add_host(host_name, host_info):
    """Add a host to the connected hosts registry"""
    connected_clients[host_name] = host_info
    print(f"📝 Added host {host_name} to registry")

def remove_host(host_name):
    """Remove a host from the connected hosts registry"""
    if host_name in connected_clients:
        del connected_clients[host_name]
        print(f"🗑️ Removed host {host_name} from registry")

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
# URL BUILDER FUNCTIONS (Clean, Simplified API)
# =====================================================

def buildServerUrl(endpoint: str) -> str:
    """
    Build a URL for server endpoints using environment configuration
    
    Args:
        endpoint: The endpoint path to append
        
    Returns:
        Complete URL to the server endpoint
    """
    server_url = os.getenv('SERVER_URL', 'http://localhost:5109')
    
    # Clean endpoint
    clean_endpoint = endpoint.lstrip('/')
    
    return f"{server_url}/{clean_endpoint}"

def buildHostUrl(endpoint: str) -> str:
    """
    Build a URL for host Flask/API endpoints using environment configuration
    
    Args:
        endpoint: The endpoint path to append
        
    Returns:
        Complete URL to the host endpoint
    """
    host_url = os.getenv('HOST_URL', 'http://localhost:6109')
    
    # Clean endpoint
    clean_endpoint = endpoint.lstrip('/')
    
    return f"{host_url}/{clean_endpoint}"

def buildHostWebUrl(host_info: dict, path: str) -> str:
    """
    Build a URL for host web/nginx endpoints (HTTPS)
    
    Args:
        host_info: Host information from the registry containing connection data
        path: The path to append
        
    Returns:
        Complete HTTPS URL to the host web resource
    """
    # Use pre-built nginx_url from host connection data
    connection = host_info.get('connection', {})
    nginx_url = connection.get('nginx_url')
    
    if not nginx_url:
        # Build manually if connection data is missing
        host_ip = host_info.get('host_ip')
        host_port_web = host_info.get('host_port_web') or '444'
        nginx_url = f"https://{host_ip}:{host_port_web}"
    
    # Clean path
    clean_path = path.lstrip('/')
    
    return f"{nginx_url}/{clean_path}"

# =====================================================
# HOST REGISTRY FUNCTIONS (Single Source of Truth)
# =====================================================

def get_host_registry():
    """Get the host registry from Flask app context"""
    return getattr(current_app, '_connected_clients', {})

def get_host_by_name(host_name):
    """Get a specific host by name from the registry"""
    host_registry = get_host_registry()
    return host_registry.get(host_name)

def get_host_by_model(device_model):
    """Get the first available host with the specified device model"""
    host_registry = get_host_registry()
    for host_id, host_info in host_registry.items():
        if host_info.get('model') == device_model or host_info.get('device_model') == device_model:
            return host_info
    return None



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
    default_team_id = getattr(current_app, 'default_team_id', DEFAULT_TEAM_ID)
    return request.headers.get('X-Team-ID', default_team_id)

def get_user_id():
    """Get user_id from request headers or use default for demo"""
    default_user_id = getattr(current_app, 'default_user_id', 'default-user-id')
    return request.headers.get('X-User-ID', default_user_id)

# =====================================================

import sys
import os
import time
import subprocess
import psutil
import hashlib
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

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
def lazy_load_supabase():
    """Lazy load Supabase connection when first needed"""
    try:
        from supabase_utils import get_supabase_client
        supabase_client = get_supabase_client()
        if supabase_client:
            print("✅ Supabase connected successfully (lazy loaded)")
            return supabase_client
        else:
            raise Exception("Supabase client not initialized")
    except Exception as e:
        print(f"⚠️ Supabase connection failed: {e}")
        return None

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

def get_connected_clients():
    """Get the dictionary of connected clients"""
    return connected_clients

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
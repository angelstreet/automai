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

def setup_supabase_connection():
    """Setup Supabase connection"""
    try:
        from supabase_utils import get_supabase_client
        supabase_client = get_supabase_client()
        if supabase_client:
            print("✅ Supabase connected successfully")
            return supabase_client
        else:
            raise Exception("Supabase client not initialized")
    except Exception as e:
        print(f"⚠️ Supabase connection failed: {e}")
        return None

def setup_controllers():
    """Setup VirtualPyTest controller system"""
    try:
        from controllers import ControllerFactory, CONTROLLER_REGISTRY, create_device_controllers
        from controllers.base_controller import (
            RemoteControllerInterface, 
            AVControllerInterface, 
            VerificationControllerInterface,
            PowerControllerInterface
        )
        print("✅ VirtualPyTest controllers loaded")
        return True
    except Exception as e:
        print(f"❌ CRITICAL: Controllers not available: {e}")
        return False

def validate_environment_variables(mode='server'):
    """Simple environment variable validation"""
    print(f"🔍 Validating {mode.upper()} environment variables...")
    
    if mode == 'server':
        required_vars = {
            'SERVER_IP': 'Server IP address',
            'SERVER_PORT': 'Server port number',
            'GITHUB_TOKEN': 'GitHub authentication token'
        }
    elif mode == 'host':
        required_vars = {
            'SERVER_IP': 'Server IP address',
            'SERVER_PORT': 'Server port number', 
            'HOST_NAME': 'Host identifier name',
            'HOST_IP': 'Host IP address',
            'GITHUB_TOKEN': 'GitHub authentication token'
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
        print(f"❌ Missing required variables:")
        for var in missing_vars:
            print(f"   - {var}")
        return False
    
    print(f"✅ All required {mode} environment variables are set")
    return True

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

def validate_all_dependencies():
    """Validate all required dependencies before starting server"""
    print("🔍 Validating all dependencies...")
    
    missing_dependencies = []
    
    # Check Supabase utilities
    try:
        from supabase_utils import get_supabase_client
        print("  ✅ supabase_utils available")
    except ImportError as e:
        missing_dependencies.append(f"supabase_utils: {e}")
    
    # Check routes module
    try:
        from routes import register_routes
        print("  ✅ routes module available")
    except ImportError as e:
        missing_dependencies.append(f"routes: {e}")
    
    # Check navigation_utils (exists in navigation directory)
    try:
        import navigation_utils
        print("  ✅ navigation_utils available")
    except ImportError as e:
        missing_dependencies.append(f"navigation_utils: {e}")
    
    # Check navigation_cache (exists in web/cache directory)
    try:
        import navigation_cache
        print("  ✅ navigation_cache available")
    except ImportError as e:
        missing_dependencies.append(f"navigation_cache: {e}")
    
    # Check devicemodel_utils (exists in models directory)
    try:
        import devicemodel_utils
        print("  ✅ devicemodel_utils available")
    except ImportError as e:
        missing_dependencies.append(f"devicemodel_utils: {e}")
    
    # Check adb_utils (exists in web/utils directory)
    try:
        import adb_utils
        print("  ✅ adb_utils available")
    except ImportError as e:
        missing_dependencies.append(f"adb_utils: {e}")
    
    # Check controllers
    try:
        from controllers import ControllerFactory, CONTROLLER_REGISTRY, create_device_controllers
        from controllers.base_controller import (
            RemoteControllerInterface, 
            AVControllerInterface, 
            VerificationControllerInterface,
            PowerControllerInterface
        )
        print("  ✅ controllers available")
    except ImportError as e:
        missing_dependencies.append(f"controllers: {e}")
    
    if missing_dependencies:
        print("❌ CRITICAL: Missing required dependencies:")
        for dep in missing_dependencies:
            print(f"   - {dep}")
        print("\n💡 Please ensure all required modules are available before starting the server")
        return False
    
    print("✅ All dependencies validated successfully")
    return True 
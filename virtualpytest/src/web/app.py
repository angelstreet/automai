import sys
import os
from uuid import uuid4
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import time
import subprocess
import argparse
import psutil
import signal
import atexit
import hashlib
import threading

# Add argument parsing for server/host mode
parser = argparse.ArgumentParser(description='VirtualPyTest Flask Server')
parser.add_argument('--server', action='store_true', help='Run in server mode (default)')
parser.add_argument('--host', action='store_true', help='Run in host mode (connects to server)')
args = parser.parse_args()

# Determine server mode - default to server if no flags specified
if args.host:
    SERVER_MODE = 'host'
elif args.server or (not args.host and not args.server):
    SERVER_MODE = 'server'
else:
    SERVER_MODE = 'server'  # fallback

print(f"Starting in {SERVER_MODE.upper()} mode")

def kill_process_on_port(port):
    """Kill any process using the specified port"""
    try:
        print(f"🔍 [PORT] Checking for processes using port {port}...")
        
        # Find processes using the port
        for proc in psutil.process_iter(['pid', 'name', 'connections']):
            try:
                connections = proc.info['connections']
                if connections:
                    for conn in connections:
                        if hasattr(conn, 'laddr') and conn.laddr and conn.laddr.port == port:
                            pid = proc.info['pid']
                            name = proc.info['name']
                            print(f"🎯 [PORT] Found process using port {port}: PID {pid} ({name})")
                            
                            # Kill the process
                            try:
                                process = psutil.Process(pid)
                                process.terminate()  # Try graceful termination first
                                
                                # Wait up to 3 seconds for graceful termination
                                try:
                                    process.wait(timeout=3)
                                    print(f"✅ [PORT] Successfully terminated process PID {pid}")
                                except psutil.TimeoutExpired:
                                    # Force kill if graceful termination failed
                                    print(f"⚠️ [PORT] Graceful termination failed, force killing PID {pid}")
                                    process.kill()
                                    process.wait(timeout=1)
                                    print(f"💀 [PORT] Force killed process PID {pid}")
                                    
                            except psutil.NoSuchProcess:
                                print(f"ℹ️ [PORT] Process PID {pid} already terminated")
                            except psutil.AccessDenied:
                                print(f"❌ [PORT] Access denied when trying to kill PID {pid}")
                            except Exception as kill_error:
                                print(f"❌ [PORT] Error killing process PID {pid}: {kill_error}")
                                
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                # Process might have disappeared or we don't have access
                continue
            except Exception as proc_error:
                # Skip processes we can't inspect
                continue
                
        print(f"✅ [PORT] Port {port} cleanup completed")
        
    except Exception as e:
        print(f"❌ [PORT] Error during port cleanup: {e}")

def cleanup_ports_for_mode():
    """Clean up ports based on the current mode"""
    if SERVER_MODE == 'server':
        # Server mode uses port 5009
        kill_process_on_port(5009)
    elif SERVER_MODE == 'host':
        # Host mode uses port 5119
        kill_process_on_port(5119)
        
        # Also check if we need to clean up any server processes
        # that might be running from previous sessions
        server_port = int(os.getenv('SERVER_PORT', '5009'))
        if server_port != 5119:  # Don't double-clean the same port
            kill_process_on_port(server_port)

# Clean up ports before starting
print(f"\n🧹 [STARTUP] Cleaning up ports for {SERVER_MODE.upper()} mode...")
cleanup_ports_for_mode()

# Load environment variables
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env.local')
load_dotenv(env_path)

# Debug: Log environment variable loading
print(f"Loading environment variables from: {env_path}")
print(f"File exists: {os.path.exists(env_path)}")

# Environment validation and logging
print("=" * 60)
print("🔍 ENVIRONMENT VARIABLES ANALYSIS")
print("=" * 60)

print("Environment variables loaded:")
print(f"  SERVER_URL: {os.getenv('SERVER_URL', 'NOT SET')}")
print(f"  SERVER_PORT: {os.getenv('SERVER_PORT', 'NOT SET')}")
print(f"  GITHUB_TOKEN: {'SET' if os.getenv('GITHUB_TOKEN') else 'NOT SET'}")

# Host mode specific environment variables with validation
if SERVER_MODE == 'host':
    print("\n🏠 HOST MODE ENVIRONMENT VALIDATION:")
    print("-" * 40)
    
    # Required environment variables for host mode
    required_host_vars = {
        'SERVER_URL': os.getenv('SERVER_URL'),
        'SERVER_PORT': os.getenv('SERVER_PORT'),
        'HOST_NAME': os.getenv('HOST_NAME'),
        'HOST_IP': os.getenv('HOST_IP'),
        'HOST_PORT': os.getenv('HOST_PORT'),
        'HOST_NGINX_PORT': os.getenv('HOST_NGINX_PORT'),
        'GITHUB_TOKEN': os.getenv('GITHUB_TOKEN')
    }
    
    missing_vars = []
    empty_vars = []
    
    for var_name, var_value in required_host_vars.items():
        status = "✅ SET" if var_value else "❌ NOT SET"
        display_value = var_value if var_name != 'GITHUB_TOKEN' else ('***' if var_value else 'NOT SET')
        print(f"  {var_name}: {display_value} ({status})")
        
        if not var_value:
            missing_vars.append(var_name)
        elif var_value.strip() == '':
            empty_vars.append(var_name)
    
    print("\n🔍 HOST MODE VALIDATION SUMMARY:")
    if missing_vars:
        print(f"❌ Missing required variables: {', '.join(missing_vars)}")
    if empty_vars:
        print(f"⚠️  Empty variables: {', '.join(empty_vars)}")
    
    if not missing_vars and not empty_vars:
        print("✅ All required host environment variables are set!")
    else:
        print("\n💡 To fix this, set the missing environment variables:")
        print("   Example:")
        for var in missing_vars + empty_vars:
            if var == 'SERVER_URL':
                print(f"   export {var}=77.56.53.130")
            elif var == 'SERVER_PORT':
                print(f"   export {var}=5009")
            elif var == 'HOST_NAME':
                print(f"   export {var}=sunri-pi1")
            elif var == 'HOST_IP':
                print(f"   export {var}=77.56.53.130")
            elif var == 'HOST_PORT':
                print(f"   export {var}=5119")
            elif var == 'HOST_NGINX_PORT':
                print(f"   export {var}=444")
            elif var == 'GITHUB_TOKEN':
                print(f"   export {var}=your_github_token")
        print(f"\n   Then run: python3 app.py --host")
        
        # Don't exit, but warn that registration will likely fail
        print("\n⚠️  WARNING: Host registration will likely fail with missing variables!")

elif SERVER_MODE == 'server':
    print("\n🖥️  SERVER MODE ENVIRONMENT VALIDATION:")
    print("-" * 40)
    
    # Required environment variables for server mode
    required_server_vars = {
        'SERVER_URL': os.getenv('SERVER_URL'),
        'SERVER_PORT': os.getenv('SERVER_PORT'),
        'GITHUB_TOKEN': os.getenv('GITHUB_TOKEN')
    }
    
    missing_vars = []
    
    for var_name, var_value in required_server_vars.items():
        status = "✅ SET" if var_value else "❌ NOT SET"
        display_value = var_value if var_name != 'GITHUB_TOKEN' else ('***' if var_value else 'NOT SET')
        print(f"  {var_name}: {display_value} ({status})")
        
        if not var_value:
            missing_vars.append(var_name)
    
    if missing_vars:
        print(f"\n⚠️  Missing server variables: {', '.join(missing_vars)}")
    else:
        print("\n✅ All required server environment variables are set!")

print("=" * 60)

# Add the parent directory to the path to allow imports
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, parent_dir)  # Insert at beginning to prioritize over local utils

# Add controllers directory to path
controllers_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'controllers')
sys.path.append(controllers_path)

try:
    from utils.supabase_utils import get_supabase_client
    # Import from local web utils directory - add the web utils path specifically
    web_utils_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'utils')
    sys.path.insert(0, web_utils_path)
    # Note: userinterface_utils functions are available but table creation is not needed
    # as the table now exists in the database
    
    # Test the connection by checking if supabase client is available
    supabase_client = get_supabase_client()
    if supabase_client:
        print("Supabase connected successfully!")
    else:
        raise Exception("Supabase client not initialized")
except Exception as e:
    print(f"Warning: Supabase connection failed: {e}")
    print("Starting Flask app without Supabase connection...")
    supabase_client = None

# Import VirtualPyTest controller system
try:
    from controllers import ControllerFactory, CONTROLLER_REGISTRY, create_device_controllers
    from controllers.base_controllers import (
        RemoteControllerInterface, 
        AVControllerInterface, 
        VerificationControllerInterface,
        PowerControllerInterface
    )
    print("VirtualPyTest controller system imported successfully!")
    controllers_available = True
except Exception as e:
    print(f"Warning: VirtualPyTest controllers not available: {e}")
    controllers_available = False

app = Flask(__name__)

# Configure CORS to allow all origins for development
CORS(app, 
     origins="*",  # Allow all origins
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization", "Accept"],
     supports_credentials=False  # Set to False when using origins="*"
)

# Initialize Flask app context variables for client registry
with app.app_context():
    app._connected_clients = {}
    app._health_check_threads = {}

# For demo purposes, using a default team_id
# In production, this should come from authentication/session
DEFAULT_TEAM_ID = "7fdeb4bb-3639-4ec3-959f-b54769a219ce"  # Hardcoded team ID
DEFAULT_USER_ID = "eb6cfd93-44ab-4783-bd0c-129b734640f3"   # Hardcoded user ID

# Global session storage for Android TV remote
android_tv_session = {
    'controller': None,
    'connected': False,
    'connection_details': {}
}

# Global session storage for IR remote
ir_remote_session = {
    'controller': None,
    'connected': False,
    'connection_details': {}
}

# Global session storage for Bluetooth remote
bluetooth_remote_session = {
    'controller': None,
    'connected': False,
    'connection_details': {}
}

# Global session storage for Android Mobile
android_mobile_controller = None

# Global client registry for server mode
connected_clients = {}
health_check_threads = {}

# Client registration state for client mode
client_registration_state = {
    'registered': False,
    'client_id': None,
    'server_url': None
}

# Ping thread for client mode
ping_thread = None
ping_stop_event = threading.Event()

# Register all route blueprints
from routes import register_routes
register_routes(app)

def get_host_system_stats():
    """Get current system statistics for host registration"""
    try:
        # CPU usage percentage
        cpu_percent = psutil.cpu_percent(interval=1)
        
        # Memory usage
        memory = psutil.virtual_memory()
        memory_percent = memory.percent
        memory_used_gb = memory.used / (1024**3)
        memory_total_gb = memory.total / (1024**3)
        
        # Disk usage (root partition)
        disk = psutil.disk_usage('/')
        disk_percent = (disk.used / disk.total) * 100
        disk_used_gb = disk.used / (1024**3)
        disk_total_gb = disk.total / (1024**3)
        
        return {
            'cpu': {
                'percent': round(cpu_percent, 1)
            },
            'memory': {
                'percent': round(memory_percent, 1),
                'used_gb': round(memory_used_gb, 2),
                'total_gb': round(memory_total_gb, 2)
            },
            'disk': {
                'percent': round(disk_percent, 1),
                'used_gb': round(disk_used_gb, 2),
                'total_gb': round(disk_total_gb, 2)
            },
            'timestamp': time.time()
        }
    except Exception as e:
        print(f"⚠️ [HOST] Error getting system stats: {e}")
        return {
            'cpu': {'percent': 0},
            'memory': {'percent': 0, 'used_gb': 0, 'total_gb': 0},
            'disk': {'percent': 0, 'used_gb': 0, 'total_gb': 0},
            'timestamp': time.time(),
            'error': str(e)
        }

# Host auto-registration logic
def register_host_with_server():
    """Register this host with the server"""
    if SERVER_MODE != 'host':
        return
    
    print("\n🔗 STARTING HOST REGISTRATION")
    print("=" * 50)
    
    # Get environment variables with validation
    server_url = os.getenv('SERVER_URL')
    server_port = os.getenv('SERVER_PORT', '5009')
    host_name = os.getenv('HOST_NAME')
    host_ip = os.getenv('HOST_IP')
    host_port = os.getenv('HOST_PORT', '5119')
    host_nginx_port = os.getenv('HOST_NGINX_PORT', '444')
    
    print(f"🔍 [HOST] Registration Debug Info:")
    print(f"   SERVER_URL env: '{server_url}'")
    print(f"   SERVER_PORT env: '{server_port}'")
    print(f"   HOST_NAME env: '{host_name}'")
    print(f"   HOST_IP env: '{host_ip}'")
    print(f"   HOST_PORT env: '{host_port}'")
    print(f"   HOST_NGINX_PORT env: '{host_nginx_port}'")
    
    # Validate critical environment variables
    validation_errors = []
    
    if not server_url:
        validation_errors.append("SERVER_URL is required but not set")
    
    if not host_name:
        validation_errors.append("HOST_NAME is required but not set")
        
    if not host_ip:
        validation_errors.append("HOST_IP is required but not set")
    
    if validation_errors:
        print(f"\n⚠️ [HOST] Environment Variable Issues:")
        for error in validation_errors:
            print(f"   - {error}")
        
        # Check if we have critical missing vars
        critical_missing = [error for error in validation_errors if any(x in error for x in ["SERVER_URL", "HOST_NAME", "HOST_IP"])]
        if critical_missing:
            print(f"\n❌ [HOST] Cannot proceed with registration due to critical missing variables:")
            for error in critical_missing:
                print(f"   - {error}")
            print(f"\n💡 [HOST] Set the missing variables and try again:")
            if not server_url:
                print(f"   export SERVER_URL=77.56.53.130")
            if not host_name:
                print(f"   export HOST_NAME=sunri-pi1")
            if not host_ip:
                print(f"   export HOST_IP=77.56.53.130")
            return
        else:
            print(f"\n⚠️ [HOST] Proceeding with warnings (using defaults where possible)")
    
    # Construct full server URL with port
    if '://' in server_url:
        # URL format: http://server-ip or http://server-ip:port
        if ':' in server_url.split('://')[-1] and server_url.split('://')[-1].count(':') >= 1:
            # URL already has port
            full_server_url = server_url
        else:
            # URL without port, add it
            full_server_url = f"{server_url}:{server_port}"
    else:
        # IP format: server-ip
        full_server_url = f"http://{server_url}:{server_port}"
    
    print(f"\n🌐 [HOST] Full server URL: {full_server_url}")
    
    try:
        import socket
        import requests
        
        # Generate a stable host ID based on host name and IP
        # This ensures the same host gets the same ID on reconnection
        stable_id_string = f"{host_name}-{host_ip}"
        stable_host_id = hashlib.md5(stable_id_string.encode()).hexdigest()
        
        host_info = {
            'client_id': stable_host_id,  # Keep as client_id for API compatibility
            'public_ip': host_ip,
            'local_ip': host_ip,
            'client_port': host_port,  # Keep as client_port for API compatibility
            'name': host_name,
            'device_model': 'android_mobile',  # Default device model
            'controller_types': ['remote', 'av', 'verification'],
            'capabilities': ['stream', 'capture', 'verification'],
            'status': 'online',
            'system_stats': get_host_system_stats(),
            'nginx_port': host_nginx_port  # Additional field for nginx port
        }
        
        print(f"\n📤 [HOST] Sending registration request to: {full_server_url}/api/system/register")
        print(f"📦 [HOST] Host info payload:")
        for key, value in host_info.items():
            if key != 'system_stats':
                print(f"     {key}: '{value}' (type: {type(value).__name__})")
        
        # Test server connectivity first
        try:
            health_response = requests.get(f"{full_server_url}/api/system/health", timeout=5)
            print(f"\n🏥 [HOST] Server health check: {health_response.status_code}")
            if health_response.status_code == 200:
                health_data = health_response.json()
                print(f"     Server health data: {health_data}")
            else:
                print(f"     Server health response: {health_response.text}")
        except Exception as health_error:
            print(f"\n⚠️ [HOST] Server health check failed: {health_error}")
            print(f"   This might indicate the server is not running or not accessible")
        
        # Send registration request
        response = requests.post(
            f"{full_server_url}/api/system/register", 
            json=host_info, 
            timeout=10,
            headers={'Content-Type': 'application/json'}
        )
        
        print(f"\n📨 [HOST] Registration response:")
        print(f"   Status Code: {response.status_code}")
        print(f"   Headers: {dict(response.headers)}")
        print(f"   Response Text: {response.text}")
        
        if response.status_code == 200:
            client_registration_state['registered'] = True
            client_registration_state['client_id'] = host_info['client_id']
            client_registration_state['server_url'] = full_server_url
            print(f"\n✅ [HOST] Successfully registered with server!")
            print(f"   Server: {full_server_url}")
            print(f"   Host ID: {host_info['client_id']}")
            print(f"   Host Name: {host_name}")
            
            # Start periodic ping thread
            start_ping_thread()
        else:
            print(f"\n❌ [HOST] Registration failed with status: {response.status_code}")
            try:
                error_response = response.json()
                print(f"   Error details: {error_response}")
            except Exception as json_error:
                print(f"   Could not parse error response as JSON: {json_error}")
                print(f"   Raw response: {response.text}")
            
    except requests.exceptions.ConnectionError as conn_error:
        print(f"\n❌ [HOST] Connection error: {conn_error}")
        print(f"   Could not connect to server at: {full_server_url}")
        print(f"   Make sure the server is running: python3 app.py --server")
    except requests.exceptions.Timeout as timeout_error:
        print(f"\n❌ [HOST] Timeout error: {timeout_error}")
        print(f"   Server did not respond within 10 seconds")
    except Exception as e:
        print(f"\n❌ [HOST] Unexpected error during registration: {e}")
        import traceback
        print(f"   Full traceback:")
        traceback.print_exc()
    
    print("=" * 50)

def unregister_from_server():
    """Unregister this host from the server"""
    if SERVER_MODE != 'host' or not client_registration_state['registered']:
        return
    
    try:
        import requests
        
        server_url = client_registration_state['server_url']
        client_id = client_registration_state['client_id']
        
        if not server_url or not client_id:
            print(f"⚠️ [HOST] Cannot unregister: missing server URL or host ID")
            return
        
        print(f"\n🔌 [HOST] Unregistering from server...")
        print(f"   Server: {server_url}")
        print(f"   Host ID: {client_id[:8]}...")
        
        unregister_data = {
            'client_id': client_id
        }
        
        response = requests.post(
            f"{server_url}/api/system/unregister",
            json=unregister_data,
            timeout=5,
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            print(f"✅ [HOST] Successfully unregistered from server")
            client_registration_state['registered'] = False
            client_registration_state['client_id'] = None
            client_registration_state['server_url'] = None
        else:
            print(f"⚠️ [HOST] Unregistration failed with status: {response.status_code}")
            try:
                error_response = response.json()
                print(f"   Error details: {error_response}")
            except Exception:
                print(f"   Raw response: {response.text}")
                
    except requests.exceptions.ConnectionError:
        print(f"⚠️ [HOST] Could not connect to server for unregistration (server may be down)")
    except requests.exceptions.Timeout:
        print(f"⚠️ [HOST] Unregistration request timed out")
    except Exception as e:
        print(f"❌ [HOST] Unexpected error during unregistration: {e}")

def signal_handler(signum, frame):
    """Handle shutdown signals"""
    print(f"\n🛑 [HOST] Received signal {signum}, shutting down gracefully...")
    stop_ping_thread()
    unregister_from_server()
    sys.exit(0)

def cleanup_on_exit():
    """Cleanup function called on normal exit"""
    if SERVER_MODE == 'host':
        print(f"\n🧹 [HOST] Performing cleanup on exit...")
        stop_ping_thread()
        unregister_from_server()

def start_ping_thread():
    """Start periodic ping thread for client mode"""
    global ping_thread, ping_stop_event
    
    if SERVER_MODE != 'client' or not client_registration_state['registered']:
        return
    
    def ping_worker():
        """Worker function that sends periodic pings to server"""
        ping_interval = 30  # seconds
        
        while not ping_stop_event.is_set():
            try:
                if not client_registration_state['registered']:
                    print(f"⚠️ [PING] Client not registered, stopping ping thread")
                    break
                
                server_url = client_registration_state['server_url']
                client_id = client_registration_state['client_id']
                
                if not server_url or not client_id:
                    print(f"⚠️ [PING] Missing server URL or client ID, stopping ping thread")
                    break
                
                # Prepare ping data
                ping_data = {
                    'client_id': client_id,
                    'system_stats': get_host_system_stats(),
                    'timestamp': time.time()
                }
                
                # Send ping to server
                import requests
                response = requests.post(
                    f"{server_url}/api/system/ping",
                    json=ping_data,
                    timeout=10,
                    headers={'Content-Type': 'application/json'}
                )
                
                if response.status_code == 200:
                    ping_response = response.json()
                    print(f"💓 [PING] Ping successful - server time: {ping_response.get('server_time', 'unknown')}")
                elif response.status_code == 404:
                    # Server doesn't know about us, need to re-register
                    ping_response = response.json()
                    if ping_response.get('status') == 'not_registered':
                        print(f"🔄 [PING] Server requests re-registration, attempting to register...")
                        register_host_with_server()
                    else:
                        print(f"⚠️ [PING] Ping failed with 404: {ping_response}")
                else:
                    print(f"⚠️ [PING] Ping failed with status {response.status_code}: {response.text}")
                    
            except requests.exceptions.ConnectionError:
                print(f"⚠️ [PING] Could not connect to server (server may be down)")
            except requests.exceptions.Timeout:
                print(f"⚠️ [PING] Ping request timed out")
            except Exception as e:
                print(f"❌ [PING] Unexpected error during ping: {e}")
            
            # Wait for next ping or stop event
            ping_stop_event.wait(ping_interval)
    
    # Start ping thread
    if ping_thread is None or not ping_thread.is_alive():
        ping_stop_event.clear()
        ping_thread = threading.Thread(target=ping_worker, daemon=True, name="client-ping")
        ping_thread.start()
        print(f"🏥 [PING] Started periodic ping thread (interval: 30s)")

def stop_ping_thread():
    """Stop the periodic ping thread"""
    global ping_thread, ping_stop_event
    
    if ping_thread and ping_thread.is_alive():
        print(f"🛑 [PING] Stopping ping thread...")
        ping_stop_event.set()
        ping_thread.join(timeout=5)
        if ping_thread.is_alive():
            print(f"⚠️ [PING] Ping thread did not stop gracefully")
        else:
            print(f"✅ [PING] Ping thread stopped successfully")
        ping_thread = None

# Register cleanup handlers for host mode
if SERVER_MODE == 'host':
    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)   # Ctrl+C
    signal.signal(signal.SIGTERM, signal_handler)  # Termination signal
    
    # Register exit handler for normal exit
    atexit.register(cleanup_on_exit)

# Initialize based on mode
if SERVER_MODE == 'server':
    print("🖥️  Server mode: Ready to accept host registrations")
elif SERVER_MODE == 'host':
    print("🏠 Host mode: Attempting to register with server...")
    # Register with server on startup
    register_host_with_server()

if __name__ == '__main__':
    # Use different ports for server and host
    # Server: 5009 (with port forwarding from 5119 to 5009)
    # Host: 5119 (actual host port)
    port = 5009 if SERVER_MODE == 'server' else 5119
    print(f"Starting Flask app on port {port} in {SERVER_MODE.upper()} mode")
    app.run(host='0.0.0.0', port=port, debug=True) 
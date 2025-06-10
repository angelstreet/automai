import os
import sys

# CRITICAL: Set up import paths FIRST, before any other imports that might need them
# Import the shared path setup function
current_dir = os.path.dirname(os.path.abspath(__file__))  # /src/web/utils
sys.path.insert(0, current_dir)  # Add utils dir temporarily to import pathUtils

try:
    from pathUtils import log_path_setup
    
    # Set up all paths using the shared function
    log_path_setup("hostUtils")
except Exception as e:
    print(f"⚠️ [hostUtils] ERROR importing pathUtils: {e}")
    # Fallback: set up paths manually
    web_dir = os.path.dirname(current_dir)                   # /src/web
    src_dir = os.path.dirname(web_dir)                       # /src
    parent_dir = os.path.dirname(src_dir)                    # /
    
    fallback_paths = [
        os.path.join(src_dir, 'utils'),               # /src/utils (for adbUtils)
        src_dir,                                      # /src
        os.path.join(parent_dir, 'controllers'),      # /controllers
    ]
    
    for path in fallback_paths:
        if os.path.exists(path) and path not in sys.path:
            sys.path.insert(0, path)
            print(f"⚠️ [hostUtils] FALLBACK: Added to sys.path: {path}")

# Now proceed with other imports that need the paths
import time
import threading
import signal
import atexit
import requests
import uuid
import psutil
import platform
from typing import Dict, Any
from appUtils import get_host_system_stats, generate_stable_host_id

# Disable SSL warnings for self-signed certificates
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Client registration state for host mode
client_registration_state = {
    'registered': False,
    'client_id': None,
    'urls': {}  # Store all URLs built once during registration
}

# Ping thread for host mode
ping_thread = None
ping_stop_event = threading.Event()

# Global storage for host device object (used when Flask app context is not available)
global_host_device = None

# Import centralized URL building from routes utils
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)
from routes.utils import build_server_url

def register_host_with_server():
    """Register this host with the server
    
    Port Architecture:
    - SERVER_PORT (5009): Where the main Flask server runs and serves API endpoints to frontend
    - HOST_PORT_INTERNAL: Where Flask app runs locally on host (e.g., 5119)
    - HOST_PORT_EXTERNAL: Port server uses to communicate with host (e.g., 5119 or forwarded port)
    - HOST_PORT_WEB: HTTPS port for nginx/images (e.g., 444)
    
    The server will use HOST_PORT_EXTERNAL (host_port) for all server-to-host communication.
    """
    print("\n🔗 STARTING HOST REGISTRATION")
    print("=" * 50)
    
    # Get environment variables with validation
    server_ip = os.getenv('SERVER_IP')  # Changed from SERVER_URL to SERVER_IP
    server_port = os.getenv('SERVER_PORT', '5009')
    server_protocol = os.getenv('SERVER_PROTOCOL', 'http')  # Default to http
    host_name = os.getenv('HOST_NAME')
    host_ip = os.getenv('HOST_IP')
    host_protocol = os.getenv('HOST_PROTOCOL', 'http')  # Default to http
    host_port_internal = os.getenv('HOST_PORT_INTERNAL', '5119')  # Flask app port
    host_port_external = os.getenv('HOST_PORT_EXTERNAL', '5119')  # Server communication port - should match internal if no port forwarding
    HOST_PORT_WEB = os.getenv('HOST_PORT_WEB', '444')
    
    # Get device information from environment variables
    device_name = os.getenv('DEVICE_NAME')  # Optional - will be generated if not provided
    device_model = os.getenv('DEVICE_MODEL', 'android_mobile')  # Default to android_mobile if not specified
    device_ip = os.getenv('DEVICE_IP', host_ip)  # Default to host IP if not specified
    device_port = os.getenv('DEVICE_PORT', '5555')  # Default ADB port
    
    print(f"🔍 [HOST] Registration Debug Info:")
    print(f"   SERVER_IP env: '{server_ip}'")  # Changed from SERVER_URL
    print(f"   SERVER_PORT env: '{server_port}'")
    print(f"   SERVER_PROTOCOL env: '{server_protocol}'")
    print(f"   HOST_NAME env: '{host_name}'")
    print(f"   HOST_IP env: '{host_ip}'")
    print(f"   HOST_PROTOCOL env: '{host_protocol}'")
    print(f"   HOST_PORT_INTERNAL env: '{host_port_internal}'")
    print(f"   HOST_PORT_EXTERNAL env: '{host_port_external}'")
    print(f"   HOST_PORT_WEB env: '{HOST_PORT_WEB}'")
    print(f"   DEVICE_NAME env: '{device_name}'")
    print(f"   DEVICE_MODEL env: '{device_model}'")
    print(f"   DEVICE_IP env: '{device_ip}'")
    print(f"   DEVICE_PORT env: '{device_port}'")
    
    # Validate critical environment variables
    validation_errors = []
    
    if not server_ip:  # Changed from server_url
        validation_errors.append("SERVER_IP is required but not set")
    
    if not host_name:
        validation_errors.append("HOST_NAME is required but not set")
        
    if not host_ip:
        validation_errors.append("HOST_IP is required but not set")
    
    if not device_model:
        validation_errors.append("DEVICE_MODEL is required but not set")
    
    if validation_errors:
        print(f"\n⚠️ [HOST] Environment Variable Issues:")
        for error in validation_errors:
            print(f"   - {error}")
        
        # Check if we have critical missing vars
        critical_missing = [error for error in validation_errors if any(x in error for x in ["SERVER_IP", "HOST_NAME", "HOST_IP", "DEVICE_MODEL"])]
        if critical_missing:
            print(f"\n❌ [HOST] Cannot proceed with registration due to critical missing variables:")
            for error in critical_missing:
                print(f"   - {error}")
            print(f"\n💡 [HOST] Set the missing variables and try again:")
            if not server_ip:  # Changed from server_url
                print(f"   export SERVER_IP=192.168.1.67")
            if not host_name:
                print(f"   export HOST_NAME=sunri-pi1")
            if not host_ip:
                print(f"   export HOST_IP=192.168.1.67")
            if not device_model:
                print(f"   export DEVICE_MODEL=android_mobile")
            return
        else:
            print(f"\n⚠️ [HOST] Proceeding with warnings (using defaults where possible)")
    
    # Use centralized server URL building instead of manual construction
    registration_url = build_server_url('/server/system/register')
    print(f"\n🌐 [HOST] Registration URL: {registration_url}")
    
    # ✅ BUILD ALL REQUIRED URLs ONCE (centralized approach)
    server_base_url = build_server_url('')  # Get base URL without endpoint
    urls = {
        'registration': registration_url,
        'ping': build_server_url('/server/system/ping'),
        'unregister': build_server_url('/server/system/unregister'),
        'health': build_server_url('/server/system/health')
    }
    
    print(f"🔗 [HOST] Built all server URLs:")
    for name, url in urls.items():
        print(f"   {name}: {url}")
    
    try:
        import socket
        
        # Generate a stable host ID based on host name and IP
        # This ensures the same host gets the same ID on reconnection
        stable_host_id = generate_stable_host_id(host_name, host_ip)
        
        # Generate device_id dynamically based on host_id and device_model
        device_id = f"{stable_host_id}_device_{device_model}"
        print(f"🔧 [HOST] Generated device_id: {device_id}")
        
        # Generate device_name if not provided in environment
        if not device_name:
            device_name = f"{device_model.replace('_', ' ').title()}"
            print(f"🔧 [HOST] Generated device_name: {device_name}")
        else:
            print(f"📋 [HOST] Using device_name from environment: {device_name}")
        
        host_info = {
            'client_id': stable_host_id,  # Keep as client_id for API compatibility
            'public_ip': host_ip,
            'local_ip': host_ip,
            'protocol': host_protocol,  # HOST protocol (http or https)
            'host_port': host_port_external,  # HOST_PORT - server uses this to communicate with host
            'internal_port': host_port_internal,  # INTERNAL port - where Flask app actually runs
            'https_port': HOST_PORT_WEB,  # HTTPS port - for nginx/images (port forwarding)
            'name': host_name,
            'device_model': device_model,  # Now from environment variable
            'device_id': device_id,  # From environment or generated
            'device_name': device_name,  # From environment or generated
            'device_ip': device_ip,  # From environment or defaults to host_ip
            'device_port': device_port,  # From environment or defaults to 5555
            'controller_types': ['remote', 'av', 'verification'],
            'capabilities': ['stream', 'capture', 'verification'],
            'status': 'online',
            'system_stats': get_host_system_stats(),
            # Legacy fields for backward compatibility
            'client_port': host_port_external,  # Deprecated: use host_port instead
            'nginx_port': HOST_PORT_WEB
        }
        
        print(f"\n📤 [HOST] Sending registration request to: {registration_url}")
        print(f"📦 [HOST] Host info payload:")
        for key, value in host_info.items():
            if key != 'system_stats':
                print(f"     {key}: '{value}' (type: {type(value).__name__})")
        
        # Test server connectivity first
        try:
            health_response = requests.get(registration_url, timeout=5, verify=False)
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
            registration_url, 
            json=host_info, 
            timeout=10,
            headers={'Content-Type': 'application/json'},
            verify=False
        )
        
        print(f"\n📨 [HOST] Registration response:")
        print(f"   Status Code: {response.status_code}")
        print(f"   Headers: {dict(response.headers)}")
        print(f"   Response Text: {response.text}")
        
        if response.status_code == 200:
            # Parse the registration response
            try:
                registration_response = response.json()
                print(f"📦 [HOST] Registration response data: {registration_response}")
                
                # Store basic registration state with centralized URLs
                client_registration_state['registered'] = True
                client_registration_state['client_id'] = host_info['client_id']
                client_registration_state['urls'] = urls  # ✅ Store all URLs built once
                
                # ✅ DIRECTLY STORE THE HOST_DEVICE OBJECT FROM SERVER RESPONSE
                host_device_object = registration_response.get('host_device')
                if host_device_object:
                    # ✅ INSTANTIATE CONTROLLERS LOCALLY using controller_configs from server
                    controller_configs = host_device_object.get('controller_configs', {})
                    if controller_configs:
                        print(f"✅ [HOST] Instantiating controllers locally using configs from server:")
                        print(f"   Available configs: {list(controller_configs.keys())}")
                        
                        try:
                            # Controllers should be importable since paths are now set up correctly
                            from controllers import ControllerFactory
                            
                            controller_objects = {}
                            
                            # Instantiate AV controller
                            if 'av' in controller_configs:
                                av_config = controller_configs['av']
                                av_params = av_config['parameters']
                                
                                print(f"   Creating AV controller: {av_config['implementation']}")
                                av_controller = ControllerFactory.create_av_controller(
                                    capture_type=av_config['implementation'],
                                    device_name=host_device_object.get('device_name'),
                                    video_device='/dev/video0',
                                    output_path='/var/www/html/stream/',
                                    host_ip=av_params.get('host_ip'),
                                    host_port=av_params.get('host_port'),
                                    host_connection=host_device_object.get('connection', {}),
                                    service_name=av_params.get('service_name', 'hdmi-stream')
                                )
                                controller_objects['av'] = av_controller
                                print(f"   ✅ AV controller created successfully")
                            
                            # Instantiate Remote controller
                            if 'remote' in controller_configs:
                                remote_config = controller_configs['remote']
                                remote_params = remote_config['parameters']
                                
                                print(f"   Creating Remote controller: {remote_config['implementation']}")
                                remote_controller = ControllerFactory.create_remote_controller(
                                    device_type=remote_config['implementation'],
                                    device_name=host_device_object.get('device_name'),
                                    device_ip=remote_params.get('device_ip'),
                                    device_port=remote_params.get('device_port'),
                                    adb_port=remote_params.get('device_port')
                                )
                                controller_objects['remote'] = remote_controller
                                print(f"   ✅ Remote controller created successfully")
                            
                            # Instantiate Verification controller
                            if 'verification' in controller_configs:
                                verification_config = controller_configs['verification']
                                verification_params = verification_config['parameters']
                                
                                print(f"   Creating Verification controller: {verification_config['implementation']}")
                                
                                # For ADB verification, construct device_id from device_ip and device_port
                                if verification_config['implementation'] == 'adb':
                                    device_id = f"{verification_params.get('device_ip')}:{verification_params.get('device_port')}"
                                    verification_controller = ControllerFactory.create_verification_controller(
                                        verification_type=verification_config['implementation'],
                                        device_name=host_device_object.get('device_name'),
                                        device_id=device_id,
                                        av_controller=controller_objects.get('av'),
                                        connection_timeout=verification_params.get('connection_timeout', 10)
                                    )
                                else:
                                    # For other verification types, pass parameters as-is
                                    verification_controller = ControllerFactory.create_verification_controller(
                                        verification_type=verification_config['implementation'],
                                        device_name=host_device_object.get('device_name'),
                                        av_controller=controller_objects.get('av'),
                                        **verification_params
                                    )
                                
                                controller_objects['verification'] = verification_controller
                                print(f"   ✅ Verification controller created successfully")
                            
                            # Instantiate Power controller
                            if 'power' in controller_configs:
                                power_config = controller_configs['power']
                                power_params = power_config['parameters']
                                
                                print(f"   Creating Power controller: {power_config['implementation']}")
                                power_controller = ControllerFactory.create_power_controller(
                                    power_type=power_config['implementation'],
                                    device_name=host_device_object.get('device_name'),
                                    hub_location=power_params.get('hub_location'),
                                    port_number=power_params.get('port_number')
                                )
                                controller_objects['power'] = power_controller
                                print(f"   ✅ Power controller created successfully")
                            
                            # Add the instantiated controllers to the host_device object
                            host_device_object['controller_objects'] = controller_objects
                            print(f"   ✅ All controllers instantiated locally: {list(controller_objects.keys())}")
                            
                        except Exception as controller_error:
                            print(f"   ⚠️ Error instantiating controllers locally: {controller_error}")
                            import traceback
                            traceback.print_exc()
                            # Continue without controllers - host will still be registered
                            host_device_object['controller_objects'] = {}
                    else:
                        print(f"   ⚠️ No controller_configs received from server")
                        host_device_object['controller_objects'] = {}
                    
                    # Store in Flask app context
                    try:
                        from flask import current_app
                        current_app.my_host_device = host_device_object
                        print(f"✅ [HOST] Stored host_device object in Flask app context:")
                        print(f"   Host: {host_device_object.get('host_name')}")
                        print(f"   Device: {host_device_object.get('device_name')} ({host_device_object.get('device_model')})")
                        print(f"   Controllers: {list(host_device_object.get('controller_objects', {}).keys())}")
                    except RuntimeError:
                        # Flask app context not available during registration - this is expected
                        print(f"⚠️ [HOST] Flask app context not available during registration")
                        print(f"   Host device will be available when Flask routes are accessed")
                        global global_host_device
                        global_host_device = host_device_object
                else:
                    print(f"⚠️ [HOST] No host_device object in registration response")
                
                print(f"\n✅ [HOST] Successfully registered with server!")
                print(f"   Server: {registration_url}")
                print(f"   Host ID: {host_info['client_id']}")
                print(f"   Host Name: {host_name}")
                
                # Start periodic ping thread
                start_ping_thread()
                
            except Exception as parse_error:
                print(f"⚠️ [HOST] Error parsing registration response: {parse_error}")
                print(f"   Raw response: {response.text}")
                # Still mark as registered for basic functionality
                client_registration_state['registered'] = True
                client_registration_state['client_id'] = host_info['client_id']
                client_registration_state['urls'] = urls  # ✅ Store all URLs built once
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
        print(f"   Could not connect to server at: {registration_url}")
        print(f"   Make sure the server is running: python3 app_server.py")
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
    if not client_registration_state['registered']:
        return
    
    try:
        unregister_url = client_registration_state['urls'].get('unregister')
        client_id = client_registration_state['client_id']
        
        if not unregister_url or not client_id:
            print(f"⚠️ [HOST] Cannot unregister: missing unregister URL or host ID")
            return
        
        print(f"\n🔌 [HOST] Unregistering from server...")
        print(f"   Unregister URL: {unregister_url}")
        print(f"   Host ID: {client_id[:8]}...")
        
        unregister_data = {
            'client_id': client_id
        }
        
        response = requests.post(
            unregister_url,
            json=unregister_data,
            timeout=5,
            headers={'Content-Type': 'application/json'},
            verify=False
        )
        
        if response.status_code == 200:
            print(f"✅ [HOST] Successfully unregistered from server")
            client_registration_state['registered'] = False
            client_registration_state['client_id'] = None
            client_registration_state['urls'] = {}
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

def start_ping_thread():
    """Start periodic ping thread for host mode"""
    global ping_thread, ping_stop_event
    
    if not client_registration_state['registered']:
        return
    
    def ping_worker():
        """Worker function that sends periodic pings to server"""
        ping_interval = 30  # seconds
        
        while not ping_stop_event.is_set():
            try:
                if not client_registration_state['registered']:
                    print(f"⚠️ [PING] Host not registered, stopping ping thread")
                    break
                
                ping_url = client_registration_state['urls'].get('ping')
                client_id = client_registration_state['client_id']
                
                if not ping_url or not client_id:
                    print(f"⚠️ [PING] Missing ping URL or client ID, stopping ping thread")
                    break
                
                # Prepare ping data
                ping_data = {
                    'client_id': client_id,
                    'system_stats': get_host_system_stats(),
                    'timestamp': time.time()
                }
                
                # Send ping to server
                response = requests.post(
                    ping_url,
                    json=ping_data,
                    timeout=10,
                    headers={'Content-Type': 'application/json'},
                    verify=False
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
        ping_thread = threading.Thread(target=ping_worker, daemon=True, name="host-ping")
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

def signal_handler(signum, frame):
    """Handle shutdown signals for host"""
    print(f"\n🛑 [HOST] Received signal {signum}, shutting down gracefully...")
    stop_ping_thread()
    unregister_from_server()
    import sys
    sys.exit(0)

def cleanup_on_exit():
    """Cleanup function called on normal exit for host"""
    print(f"\n🧹 [HOST] Performing cleanup on exit...")
    stop_ping_thread()
    unregister_from_server()

def setup_host_signal_handlers():
    """Setup signal handlers for graceful shutdown in host mode"""
    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)   # Ctrl+C
    signal.signal(signal.SIGTERM, signal_handler)  # Termination signal
    
    # Register exit handler for normal exit
    atexit.register(cleanup_on_exit) 
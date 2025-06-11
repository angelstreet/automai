import os
import sys

# CRITICAL: Set up import paths FIRST, before any other imports
print(f"[@hostUtils:__init__] Setting up import paths for hostUtils...")
current_dir = os.path.dirname(os.path.abspath(__file__))  # /src/web/utils
web_dir = os.path.dirname(current_dir)                    # /src/web
src_dir = os.path.dirname(web_dir)                        # /src
parent_dir = os.path.dirname(src_dir)                     # /

# Add paths to sys.path for the entire application
paths_to_add = [
    os.path.join(web_dir, 'utils'),               # /src/web/utils
    os.path.join(web_dir, 'cache'),               # /src/web/cache
    os.path.join(web_dir, 'services'),            # /src/web/services
    os.path.join(src_dir, 'utils'),               # /src/utils  
    src_dir,                                      # /src
    os.path.join(parent_dir, 'controllers'),      # /controllers
]

for path in paths_to_add:
    if path not in sys.path:
        sys.path.insert(0, path)
        print(f"[@hostUtils:__init__] Added to sys.path: {path}")

print(f"[@hostUtils:__init__] Import paths setup completed")

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
from src.controllers.system.system_info import get_host_system_stats

# Disable SSL warnings for self-signed certificates
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Client registration state for host mode
client_registration_state = {
    'registered': False,
    'host_name': None,
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
from app_utils import buildServerUrl

def register_host_with_server():
    """Register this host with the server"""
    global client_registration_state, global_host_device
    
    print("=" * 50)
    print("🔗 [HOST] Starting registration with server...")
    
    try:
        # Get environment configuration
        server_host = os.getenv('SERVER_HOST', 'localhost')
        server_port = os.getenv('SERVER_PORT', '5119')
        
        # Get host information from environment - ALL ports included
        host_name = os.getenv('HOST_NAME', 'default-host')
        host_ip = os.getenv('HOST_IP', '127.0.0.1')
        host_port_internal = os.getenv('HOST_PORT_INTERNAL', '6119')  # Where Flask actually runs
        host_port_external = os.getenv('HOST_PORT_EXTERNAL', host_port_internal)  # For server communication (may be port-forwarded)
        host_port_web = os.getenv('HOST_PORT_WEB', '444')  # HTTPS/nginx port
        
        # Get device model info
        device_model = os.getenv('DEVICE_MODEL', os.getenv('HOST_DEVICE_MODEL', platform.system().lower()))
        device_name = os.getenv('DEVICE_NAME', os.getenv('HOST_DEVICE_NAME', f"{device_model.replace('_', ' ').title()}"))
        device_ip = os.getenv('DEVICE_IP', os.getenv('HOST_DEVICE_IP', host_ip))  # Default to host IP if not specified
        device_port = os.getenv('DEVICE_PORT', os.getenv('HOST_DEVICE_PORT', '5555'))  # Default ADB port
        
        print(f"   Server: {server_host}:{server_port}")
        print(f"   Host Name: {host_name}")
        print(f"   Host IP: {host_ip}")
        print(f"   Host Ports: Internal={host_port_internal}, External={host_port_external}, Web={host_port_web}")
        print(f"   Device Name: {device_name}")
        print(f"   Device Model: {device_model}")
        print(f"   Device IP: {device_ip}")
        print(f"   Device Port: {device_port}")
        
        # Create registration payload with complete device information
        host_info = {
            'host_name': host_name,
            'host_ip': host_ip,
            'host_port_internal': int(host_port_internal),
            'host_port_external': int(host_port_external),
            'host_port_web': int(host_port_web),
            'device_name': device_name,           # Send actual device name
            'device_model': device_model,         # Dynamic device model detection
            'device_ip': device_ip,               # Send actual device IP
            'device_port': device_port,           # Send actual device port
            'system_stats': get_host_system_stats(),
        }
        
        # Build server URLs
        server_base_url = f"http://{server_host}:{server_port}"
        registration_url = f"{server_base_url}/server/system/register"
        
        # Store URLs for later use
        urls = {
            'server_base': server_base_url,
            'register': registration_url,
            'unregister': f"{server_base_url}/server/system/unregister",
            'ping': f"{server_base_url}/server/system/ping",
            'health': f"{server_base_url}/server/system/health"
        }
        
        print(f"\n📡 [HOST] Sending registration request...")
        print(f"   URL: {registration_url}")
        print(f"   Payload: {host_info}")
        
        # Send registration request
        response = requests.post(
            registration_url,
            json=host_info,
            timeout=10,
            headers={'Content-Type': 'application/json'},
            verify=False
        )
        
        print(f"\n📨 [HOST] Registration response received:")
        print(f"   Status Code: {response.status_code}")
        print(f"   Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            try:
                response_data = response.json()
                print(f"   Response: {response_data}")
                
                # Mark as registered
                client_registration_state['registered'] = True
                client_registration_state['host_name'] = host_name    # ✅ Store host_name as primary identifier
                client_registration_state['urls'] = urls
                
                # Store global host device object
                global_host_device = response_data.get('host_data', {})
                
                print(f"\n✅ [HOST] Registration successful!")
                print(f"   Host Name: {host_name}")
                
                # Start periodic ping thread
                start_ping_thread()
                
            except Exception as parse_error:
                print(f"⚠️ [HOST] Error parsing registration response: {parse_error}")
                print(f"   Raw response: {response.text}")
                # Still mark as registered for basic functionality
                client_registration_state['registered'] = True
                client_registration_state['host_name'] = host_name    # ✅ Store host_name as primary identifier
                client_registration_state['urls'] = urls
                start_ping_thread()
        else:
            print(f"\n❌ [HOST] Registration failed with status: {response.status_code}")
            try:
                error_response = response.json()
                print(f"   Error details: {error_response}")
            except Exception as json_error:
                print(f"   Could not parse error response as JSON: {json_error}")
                print(f"   Raw response: {response.text}")
        
    except Exception as e:
        print(f"\n❌ [HOST] Unexpected error during registration: {e}")
        print(f"   Full traceback:")
        import traceback
        traceback.print_exc()

def send_ping_to_server():
    """Send a health ping to the server"""
    if not client_registration_state['registered']:
        return
    
    try:
        ping_url = client_registration_state['urls'].get('ping')
        host_name = client_registration_state.get('host_name')
        
        if not ping_url or not host_name:
            print(f"⚠️ [HOST] Cannot ping: missing ping URL or host identifier")
            return
        
        ping_data = {
            'host_name': host_name,                 # ✅ Primary identifier
            'system_stats': get_host_system_stats(),
            'status': 'online'
        }
        
        response = requests.post(
            ping_url,
            json=ping_data,
            timeout=5,
            headers={'Content-Type': 'application/json'},
            verify=False
        )
        
        if response.status_code == 200:
            ping_response = response.json()
            if ping_response.get('status') == 'success':
                print(f"💓 [HOST] Ping successful - host: {host_name}")
            elif ping_response.get('status') == 'not_registered':
                print(f"📍 [HOST] Server says we're not registered - re-registering...")
                client_registration_state['registered'] = False
                register_host_with_server()
            else:
                print(f"⚠️ [HOST] Ping response: {ping_response}")
        else:
            print(f"⚠️ [HOST] Ping failed with status: {response.status_code}")
            if response.status_code == 404:
                print(f"📍 [HOST] Server doesn't recognize us - re-registering...")
                client_registration_state['registered'] = False
                register_host_with_server()
            
    except requests.exceptions.ConnectionError:
        print(f"⚠️ [HOST] Could not connect to server for ping")
    except requests.exceptions.Timeout:
        print(f"⚠️ [HOST] Ping request timed out")
    except Exception as e:
        print(f"❌ [HOST] Unexpected error during ping: {e}")

def unregister_from_server():
    """Unregister this host from the server"""
    if not client_registration_state['registered']:
        return
    
    try:
        unregister_url = client_registration_state['urls'].get('unregister')
        host_name = client_registration_state.get('host_name')
        
        if not unregister_url:
            print(f"⚠️ [HOST] Cannot unregister: missing unregister URL")
            return
        
        print(f"\n🔌 [HOST] Unregistering from server...")
        print(f"   Unregister URL: {unregister_url}")
        print(f"   Host Name: {host_name}")
        
        unregister_data = {
            'host_name': host_name,     # ✅ Primary identifier
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
            client_registration_state['host_name'] = None
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
                host_name = client_registration_state.get('host_name')
                
                if not ping_url or not host_name:
                    print(f"⚠️ [PING] Missing ping URL or host name, stopping ping thread")
                    break
                
                # Prepare ping data
                ping_data = {
                    'host_name': host_name,
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
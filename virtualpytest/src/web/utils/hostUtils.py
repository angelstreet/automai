import os
import time
import threading
import signal
import atexit
import requests
from appUtils import get_host_system_stats, generate_stable_host_id

# Client registration state for host mode
client_registration_state = {
    'registered': False,
    'client_id': None,
    'server_url': None
}

# Ping thread for host mode
ping_thread = None
ping_stop_event = threading.Event()

def register_host_with_server():
    """Register this host with the server"""
    print("\n🔗 STARTING HOST REGISTRATION")
    print("=" * 50)
    
    # Get environment variables with validation
    server_ip = os.getenv('SERVER_IP')  # Changed from SERVER_URL to SERVER_IP
    server_port = os.getenv('SERVER_PORT', '5009')
    host_name = os.getenv('HOST_NAME')
    host_ip = os.getenv('HOST_IP')
    host_port = os.getenv('HOST_PORT', '5119')
    host_nginx_port = os.getenv('HOST_NGINX_PORT', '444')
    
    print(f"🔍 [HOST] Registration Debug Info:")
    print(f"   SERVER_IP env: '{server_ip}'")  # Changed from SERVER_URL
    print(f"   SERVER_PORT env: '{server_port}'")
    print(f"   HOST_NAME env: '{host_name}'")
    print(f"   HOST_IP env: '{host_ip}'")
    print(f"   HOST_PORT env: '{host_port}'")
    print(f"   HOST_NGINX_PORT env: '{host_nginx_port}'")
    
    # Validate critical environment variables
    validation_errors = []
    
    if not server_ip:  # Changed from server_url
        validation_errors.append("SERVER_IP is required but not set")
    
    if not host_name:
        validation_errors.append("HOST_NAME is required but not set")
        
    if not host_ip:
        validation_errors.append("HOST_IP is required but not set")
    
    if validation_errors:
        print(f"\n⚠️ [HOST] Environment Variable Issues:")
        for error in validation_errors:
            print(f"   - {error}")
        
        # Check if we have critical missing vars
        critical_missing = [error for error in validation_errors if any(x in error for x in ["SERVER_IP", "HOST_NAME", "HOST_IP"])]
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
            return
        else:
            print(f"\n⚠️ [HOST] Proceeding with warnings (using defaults where possible)")
    
    # Construct full server URL with IP and port
    full_server_url = f"http://{server_ip}:{server_port}"
    
    print(f"\n🌐 [HOST] Full server URL: {full_server_url}")
    
    try:
        import socket
        
        # Generate a stable host ID based on host name and IP
        # This ensures the same host gets the same ID on reconnection
        stable_host_id = generate_stable_host_id(host_name, host_ip)
        
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
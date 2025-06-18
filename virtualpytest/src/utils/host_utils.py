import os
import sys
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

# Global storage for host object (used when Flask app context is not available)
global_host_object = None

# Global storage for local controller objects (host manages its own controllers)
local_controller_objects = {}

# Import centralized URL building from utils
from src.utils.app_utils import buildServerUrl

def register_host_with_server():
    """Register this host with the server"""
    global client_registration_state, global_host_object
    
    print("=" * 50)
    print("🔗 [HOST] Starting registration with server...")
    
    try:
        # Get host information from environment
        host_name = os.getenv('HOST_NAME', 'default-host')
        host_url = os.getenv('HOST_URL', 'http://localhost:6109')
        host_port = os.getenv('HOST_PORT', '6109')
        
        # Get device model info
        device_model = os.getenv('DEVICE_MODEL', os.getenv('HOST_DEVICE_MODEL', platform.system().lower()))
        device_name = os.getenv('DEVICE_NAME', os.getenv('HOST_DEVICE_NAME', f"{device_model.replace('_', ' ').title()}"))
        device_ip = os.getenv('DEVICE_IP', os.getenv('HOST_DEVICE_IP', '127.0.0.1'))
        device_port = os.getenv('DEVICE_PORT', os.getenv('HOST_DEVICE_PORT', '5555'))  # Default ADB port
        
        print(f"   Host Name: {host_name}")
        print(f"   Host URL: {host_url}")
        print(f"   Host Port: {host_port}")
        print(f"   Device Name: {device_name}")
        print(f"   Device Model: {device_model}")
        print(f"   Device IP: {device_ip}")
        print(f"   Device Port: {device_port}")
        
        # Create registration payload with complete device information
        host_info = {
            'host_name': host_name,
            'host_url': host_url,
            'host_port': int(host_port),
            'device_name': device_name,           # Send actual device name
            'device_model': device_model,         # Dynamic device model detection
            'device_ip': device_ip,               # Send actual device IP
            'device_port': device_port,           # Send actual device port
            'system_stats': get_host_system_stats()
        }
        
        # Build server URLs using standardized host URL builder system
        registration_url = buildServerUrl('/server/system/register')
        
        # Store URLs for later use - all built with the standardized system
        urls = {
            'register': registration_url,
            'unregister': buildServerUrl('/server/system/unregister'),
            'ping': buildServerUrl('/server/system/ping'),
            'health': buildServerUrl('/server/system/health')
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
                
                # Store global host object from server response (includes all server-added data)
                global_host_object = response_data.get('host_data', {})
                
                print(f"\n✅ [HOST] Registration successful!")
                print(f"   Host Name: {host_name}")
                print(f"   Server returned host object with keys: {list(global_host_object.keys())}")
                
                # Create local controllers using the device model and add them to the host object
                print(f"\n🎮 [HOST] Creating local controllers for device model: {device_model}")
                created_controllers = create_local_controllers_from_model(
                    device_model, 
                    device_name, 
                    device_ip, 
                    device_port,
                    os.getenv('DEFAULT_TEAM_ID', '7fdeb4bb-3639-4ec3-959f-b54769a219ce')  # Use team_id from env
                )
                print(f"   Created controllers: {list(created_controllers.keys())}")
                
                # Add controller objects to the global host object (local host management)
                global_host_object['local_controller_objects'] = created_controllers
                print(f"   Added controller objects to host object")
                
                # Extract verification types and actions from created controllers
                print(f"\n🔍 [HOST] Extracting verification types and actions from controllers...")
                available_verification_types = {}
                available_actions = {}

                for controller_type, controller_obj in created_controllers.items():
                    try:
                        # Extract verification types if controller has the method
                        if hasattr(controller_obj, 'get_available_verifications'):
                            verifications = controller_obj.get_available_verifications()
                            if verifications:
                                # Handle both old dict format and new list format for backward compatibility
                                if isinstance(verifications, list):
                                    # New format: flat array of verifications
                                    available_verification_types[controller_type] = verifications
                                    print(f"   ✅ {controller_type}: {len(verifications)} verifications")
                                elif isinstance(verifications, dict):
                                    # Old format: convert dict structure to flat array
                                    verification_list = []
                                    for category, category_verifications in verifications.items():
                                        if isinstance(category_verifications, dict):
                                            # Convert nested dict to verification objects
                                            for ver_id, ver_data in category_verifications.items():
                                                verification_obj = {
                                                    'command': ver_id,
                                                    'params': ver_data.get('parameters', ver_data.get('params', {}))
                                                }
                                                verification_list.append(verification_obj)
                                        elif isinstance(category_verifications, list):
                                            # Already in correct format
                                            verification_list.extend(category_verifications)
                                    
                                    available_verification_types[controller_type] = verification_list
                                    print(f"   ✅ {controller_type}: {len(verification_list)} verifications (converted from old format)")
                        
                        # Extract available actions if controller has the method  
                        if hasattr(controller_obj, 'get_available_actions'):
                            actions = controller_obj.get_available_actions()
                            if actions:
                                available_actions[controller_type] = actions
                                print(f"   ✅ {controller_type}: {len(actions)} actions")
                                
                    except Exception as e:
                        print(f"   ⚠️ {controller_type}: Error extracting capabilities - {e}")

                print(f"   Total verification types: {sum(len(v) for v in available_verification_types.values())}")
                print(f"   Total actions: {sum(len(a) for a in available_actions.values())}")
                
                # Store verification types and actions in global host object for frontend access
                global_host_object['available_verification_types'] = available_verification_types
                global_host_object['available_actions'] = available_actions
                print(f"   Added verification types and actions to host object")
                
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

def query_device_model_configuration(device_model, team_id):
    """
    Query the database to get controller configuration for the device model.
    Uses dedicated database utilities instead of direct database queries.
    
    Args:
        device_model: Device model string (e.g., 'android_mobile')
        team_id: Team ID for database query
        
    Returns:
        dict: Controller configuration from database or None if not found
    """
    try:
        from src.lib.supabase.device_models_db import get_all_device_models
        
        print(f"[@utils:host_utils:query_device_model_configuration] Querying database for model: {device_model}")
        
        # Use existing database utilities to get device models
        device_models = get_all_device_models(team_id)
        
        # Find the device model by name
        for model in device_models:
            if model['name'] == device_model:
                controllers_config = model.get('controllers', {})
                
                print(f"[@utils:host_utils:query_device_model_configuration] Found configuration for {device_model}:")
                print(f"   Controllers: {controllers_config}")
                print(f"   Types: {model.get('types', [])}")
                
                return controllers_config
        
        print(f"[@utils:host_utils:query_device_model_configuration] No configuration found for model: {device_model}")
        return None
            
    except Exception as e:
        print(f"[@utils:host_utils:query_device_model_configuration] ERROR querying database: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def create_local_controllers_from_model(device_model, device_name, device_ip, device_port, team_id):
    """
    Create controller objects locally based on device model configuration from database.
    
    Args:
        device_model: Device model (e.g., 'android_mobile', 'android_tv')
        device_name: Name of the device
        device_ip: Device IP address
        device_port: Device port
        team_id: Team ID for database query
        
    Returns:
        dict: Dictionary of created controller objects
    """
    print(f"[@utils:host_utils:create_local_controllers_from_model] Creating controllers for {device_model}: {device_name}")
    
    controller_objects = {}
    
    try:
        from src.controllers import ControllerFactory
        
        # STEP 1: Query database for controller configuration using dedicated DB utilities
        controllers_config = query_device_model_configuration(device_model, team_id)
        
        if not controllers_config:
            print(f"[@utils:host_utils:create_local_controllers_from_model] No database configuration found, using defaults")
            # Fallback to basic configuration
            controllers_config = {
                "av": "hdmi_stream",
                "remote": device_model if device_model in ['android_mobile', 'android_tv'] else "",
                "verification": "ocr",
                "power": "usb"
            }
        
        print(f"[@utils:host_utils:create_local_controllers_from_model] Using controller configuration: {controllers_config}")
        
        # STEP 2: Create controllers based on database configuration
        av_controller = None
        
        # Create AV controller if configured
        if controllers_config.get('av'):
            av_type = controllers_config['av']
            print(f"[@utils:host_utils:create_local_controllers_from_model] Creating AV controller: {av_type}")
            av_controller = ControllerFactory.create_av_controller(
                capture_type=av_type,
                device_name=device_name,
                video_device='/dev/video0',
                resolution='1920x1080',
                fps=30,
                stream_path='/stream/video',
                service_name='stream'
            )
            controller_objects['av'] = av_controller
            print(f"[@utils:host_utils:create_local_controllers_from_model] AV controller created: {type(av_controller).__name__}")
        
        # Create remote controller if configured
        if controllers_config.get('remote') and controllers_config['remote'].strip():
            remote_type = controllers_config['remote']
            print(f"[@utils:host_utils:create_local_controllers_from_model] Creating remote controller: {remote_type}")
            remote_controller = ControllerFactory.create_remote_controller(
                device_type=remote_type,
                device_name=device_name,
                device_ip=device_ip,
                device_port=device_port,
                connection_timeout=10
            )
            controller_objects['remote'] = remote_controller
            print(f"[@utils:host_utils:create_local_controllers_from_model] Remote controller created: {type(remote_controller).__name__}")
        
        # Create verification controller if configured
        if controllers_config.get('verification') and controllers_config['verification'].strip():
            verification_type = controllers_config['verification']
            print(f"[@utils:host_utils:create_local_controllers_from_model] Creating verification controller: {verification_type}")
            verification_controller = ControllerFactory.create_verification_controller(
                verification_type=verification_type,
                device_name=device_name,
                av_controller=av_controller
            )
            controller_objects['verification'] = verification_controller
            print(f"[@utils:host_utils:create_local_controllers_from_model] Verification controller created: {type(verification_controller).__name__}")
        
        # Create power controller if configured
        if controllers_config.get('power') and controllers_config['power'].strip():
            power_type = controllers_config['power']
            print(f"[@utils:host_utils:create_local_controllers_from_model] Creating power controller: {power_type}")
            power_controller = ControllerFactory.create_power_controller(
                power_type=power_type,
                device_name=device_name,
                hub_location='1-1',
                port_number='1'
            )
            controller_objects['power'] = power_controller
            print(f"[@utils:host_utils:create_local_controllers_from_model] Power controller created: {type(power_controller).__name__}")
        
        # Create network controller if configured
        if controllers_config.get('network') and controllers_config['network'].strip():
            network_type = controllers_config['network']
            print(f"[@utils:host_utils:create_local_controllers_from_model] Creating network controller: {network_type}")
            # Note: Network controller creation would need to be implemented in ControllerFactory
            print(f"[@utils:host_utils:create_local_controllers_from_model] Network controller type {network_type} - implementation needed")
        
        print(f"[@utils:host_utils:create_local_controllers_from_model] Successfully created {len(controller_objects)} controllers: {list(controller_objects.keys())}")
        
        # Store controllers globally for access by routes
        global local_controller_objects
        local_controller_objects = controller_objects
        
        return controller_objects
        
    except Exception as e:
        print(f"[@utils:host_utils:create_local_controllers_from_model] ERROR creating controllers: {str(e)}")
        import traceback
        traceback.print_exc()
        return {}

def get_local_controller(controller_type):
    """
    Get a local controller by type.
    
    Args:
        controller_type: Type of controller ('remote', 'av', 'verification', 'power')
        
    Returns:
        Controller object or None if not found
    """
    global local_controller_objects
    return local_controller_objects.get(controller_type)

def get_all_local_controllers():
    """
    Get all local controller objects.
    
    Returns:
        dict: Dictionary of all controller objects
    """
    global local_controller_objects
    return local_controller_objects.copy()

def clear_local_controllers():
    """
    Clear all local controller objects.
    """
    global local_controller_objects
    print("[@utils:host_utils:clear_local_controllers] Clearing all local controllers")
    local_controller_objects = {} 
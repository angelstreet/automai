"""
Host Utilities

Clean host registration and management using the new Host/Device/Controller architecture.
"""

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
from typing import Dict, Any, Optional

from ..controllers.system.system_info import get_host_system_stats
from ..controllers.controller_manager import get_host, reset_host
from ..utils.app_utils import buildServerUrl

# Disable SSL warnings for self-signed certificates
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Client registration state for host mode
client_registration_state = {
    'registered': False,
    'host_name': None,
    'urls': {}
}

# Ping thread for host mode
ping_thread = None
ping_stop_event = threading.Event()


def register_host_with_server():
    """Register this host with the server using new architecture."""
    global client_registration_state
    
    print("=" * 50)
    print("🔗 [HOST] Starting registration with server...")
    
    try:
        # Get host with all devices and controllers
        host = get_host()
        
        print(f"   Host Name: {host.host_name}")
        print(f"   Host URL: {host.host_ip}:{host.host_port}")
        print(f"   Configured Devices: {host.get_device_count()}")
        
        # Display device information
        for device in host.get_devices():
            print(f"     - {device.name} ({device.model}) [{device.device_id}]")
            capabilities = device.get_capabilities()
            if capabilities:
                print(f"       Capabilities: {', '.join(capabilities)}")
        
        # Get system stats
        system_stats = get_host_system_stats()
        
        # Create registration payload
        registration_data = {
            'host_name': host.host_name,
            'host_url': f"http://{host.host_ip}:{host.host_port}",
            'host_port': host.host_port,
            'host_ip': host.host_ip,
            'device_count': host.get_device_count(),
            'devices': [device.to_dict() for device in host.get_devices()],
            'capabilities': host.get_all_capabilities(),
            'system_stats': system_stats
        }
        
        # Build server URLs
        registration_url = buildServerUrl('/server/system/register')
        
        print(f"\n📡 [HOST] Sending registration to: {registration_url}")
        
        # Send registration request
        response = requests.post(
            registration_url,
            json=registration_data,
            timeout=30,
            verify=False
        )
        
        if response.status_code == 200:
            print("✅ [HOST] Registration successful!")
            
            # Update registration state
            client_registration_state.update({
                'registered': True,
                'host_name': host.host_name,
                'urls': {
                    'register': registration_url,
                    'ping': buildServerUrl('/server/system/ping'),
                    'unregister': buildServerUrl('/server/system/unregister')
                }
            })
            
            print(f"   Registered as: {host.host_name}")
            print(f"   Devices: {host.get_device_count()}")
            print(f"   Total capabilities: {len(host.get_all_capabilities())}")
            
        else:
            print(f"❌ [HOST] Registration failed: {response.status_code}")
            print(f"   Response: {response.text}")
        
    except Exception as e:
        print(f"❌ [HOST] Registration error: {str(e)}")
        import traceback
        traceback.print_exc()


def send_ping_to_server():
    """Send ping to server to maintain registration."""
    if not client_registration_state.get('registered'):
        return
    
    try:
        host = get_host()
        
        ping_data = {
            'host_name': host.host_name,
            'timestamp': time.time(),
            'system_stats': get_host_system_stats(),
            'device_count': host.get_device_count()
        }
        
        ping_url = client_registration_state['urls'].get('ping')
        if ping_url:
            response = requests.post(ping_url, json=ping_data, timeout=10, verify=False)
            
            if response.status_code == 200:
                print(f"📡 [HOST] Ping sent successfully at {time.strftime('%H:%M:%S')}")
            else:
                print(f"⚠️ [HOST] Ping failed: {response.status_code}")
                
    except Exception as e:
        print(f"❌ [HOST] Ping error: {str(e)}")


def unregister_from_server():
    """Unregister this host from the server."""
    global client_registration_state
    
    if not client_registration_state.get('registered'):
        return
    
    try:
        host = get_host()
        
        unregister_data = {
            'host_name': host.host_name,
            'timestamp': time.time()
        }
        
        unregister_url = client_registration_state['urls'].get('unregister')
        if unregister_url:
            response = requests.post(unregister_url, json=unregister_data, timeout=10, verify=False)
            
            if response.status_code == 200:
                print("✅ [HOST] Unregistered successfully")
            else:
                print(f"⚠️ [HOST] Unregister failed: {response.status_code}")
        
        # Reset registration state
        client_registration_state.update({
            'registered': False,
            'host_name': None,
            'urls': {}
        })
        
    except Exception as e:
        print(f"❌ [HOST] Unregister error: {str(e)}")


def start_ping_thread():
    """Start the ping thread."""
    global ping_thread, ping_stop_event
    
    if ping_thread and ping_thread.is_alive():
        return
    
    ping_stop_event.clear()
    
    def ping_worker():
        while not ping_stop_event.is_set():
            send_ping_to_server()
            # Wait 30 seconds or until stop event
            ping_stop_event.wait(30)
    
    ping_thread = threading.Thread(target=ping_worker, daemon=True)
    ping_thread.start()
    print("🔄 [HOST] Ping thread started")


def stop_ping_thread():
    """Stop the ping thread."""
    global ping_thread, ping_stop_event
    
    if ping_thread and ping_thread.is_alive():
        ping_stop_event.set()
        ping_thread.join(timeout=5)
        print("⏹️ [HOST] Ping thread stopped")


def signal_handler(signum, frame):
    """Handle shutdown signals."""
    print(f"\n🛑 [HOST] Received signal {signum}, shutting down gracefully...")
    cleanup_on_exit()
    sys.exit(0)


def cleanup_on_exit():
    """Cleanup function called on exit."""
    print("🧹 [HOST] Cleaning up...")
    stop_ping_thread()
    unregister_from_server()
    reset_host()  # Reset the global host instance


def setup_host_signal_handlers():
    """Setup signal handlers for graceful shutdown."""
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    atexit.register(cleanup_on_exit) 


# New clean controller access functions
def get_host_instance():
    """Get the host instance."""
    return get_host()


def get_device_by_id(device_id: str):
    """Get a device by its ID."""
    host = get_host()
    return host.get_device(device_id)


def get_controller(device_id: str, controller_type: str):
    """
    Get a controller from a specific device with proper abstraction.
    
    Args:
        device_id: Device identifier
        controller_type: Abstract controller type ('av', 'remote', 'verification') 
                        OR specific verification type ('verification_image', 'verification_adb', 'verification_text')
    
    Returns:
        Controller instance or None if not found
    """
    host = get_host()
    
    # Handle specific verification controller types
    if controller_type.startswith('verification_'):
        verification_impl = controller_type.replace('verification_', '')
        device = host.get_device(device_id)
        
        if not device:
            print(f"[@host_utils:get_controller] Device {device_id} not found")
            return None
        
        # Look for specific verification controller implementation
        verification_controllers = device.get_controllers('verification')
        for controller in verification_controllers:
            # Check if this controller matches the requested implementation
            if hasattr(controller, 'verification_type') and controller.verification_type == verification_impl:
                print(f"[@host_utils:get_controller] Found {verification_impl} verification controller for device {device_id}")
                return controller
        
        print(f"[@host_utils:get_controller] No {verification_impl} verification controller found for device {device_id}")
        return None
    
    # Handle abstract controller types (av, remote, verification)
    return host.get_controller(device_id, controller_type)


def list_available_devices():
    """List all available devices."""
    host = get_host()
    return [
        {
            'device_id': device.device_id,
            'name': device.name,
            'model': device.model,
            'capabilities': device.get_capabilities()
        }
        for device in host.get_devices()
    ]


def get_device_capabilities(device_id: str):
    """Get capabilities for a specific device."""
    device = get_device_by_id(device_id)
    if device:
        return device.get_capabilities()
    return []


def has_device_capability(device_id: str, capability: str):
    """Check if a device has a specific capability."""
    capabilities = get_device_capabilities(device_id)
    return capability in capabilities


# ✅ PHASE 6 CLEANUP: Removed deprecated function
# - get_local_controller() - REMOVED (use get_controller() instead) 
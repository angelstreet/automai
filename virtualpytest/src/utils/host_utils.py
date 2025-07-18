"""
Host Utilities

Host registration, storage, and management using the new Host/Device/Controller architecture.
Focused on host-related functionality only.
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
from typing import Dict, Any, Optional, List
from datetime import datetime

from .system_info_utils import get_host_system_stats
from ..controllers.controller_manager import get_host
from .build_url_utils import buildServerUrl

# Disable SSL warnings for self-signed certificates
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# =====================================================
# HOST STORAGE AND MANAGEMENT
# =====================================================

class HostManager:
    """Host storage and management (no locking - use lock_utils for that)"""
    
    def __init__(self):
        # Thread-safe storage for hosts
        self._hosts: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.RLock()
    
    def register_host(self, host_name: str, host_data: Dict[str, Any]) -> bool:
        """Register or update a host"""
        with self._lock:
            try:
                # Ensure required fields
                if not host_name or not host_data.get('host_url'):
                    return False
                
                # Add metadata
                current_time = time.time()
                host_data['last_seen'] = current_time
                host_data['status'] = 'online'
                
                # If updating existing host, preserve registration time
                if host_name in self._hosts:
                    existing_host = self._hosts[host_name]
                    host_data['registered_at'] = existing_host.get('registered_at', datetime.now().isoformat())
                    host_data['reconnected_at'] = datetime.now().isoformat()
                    print(f"🔄 [HostManager] Updating existing host: {host_name}")
                else:
                    host_data['registered_at'] = datetime.now().isoformat()
                    print(f"✅ [HostManager] Registering new host: {host_name}")
                
                self._hosts[host_name] = host_data
                return True
                
            except Exception as e:
                print(f"❌ [HostManager] Error registering host {host_name}: {e}")
                return False
    
    def unregister_host(self, host_name: str) -> bool:
        """Unregister a host"""
        with self._lock:
            try:
                if host_name in self._hosts:
                    del self._hosts[host_name]
                    print(f"🔌 [HostManager] Unregistered host: {host_name}")
                    return True
                return False
            except Exception as e:
                print(f"❌ [HostManager] Error unregistering host {host_name}: {e}")
                return False
    
    def get_host(self, host_name: str) -> Optional[Dict[str, Any]]:
        """Get a specific host by name"""
        with self._lock:
            return self._hosts.get(host_name)
    
    def get_all_hosts(self) -> List[Dict[str, Any]]:
        """Get all registered hosts"""
        with self._lock:
            return list(self._hosts.values())
    
    def get_hosts_by_model(self, models: List[str]) -> List[Dict[str, Any]]:
        """Get hosts that have devices with specified models"""
        with self._lock:
            filtered_hosts = []
            for host_data in self._hosts.values():
                devices = host_data.get('devices', [])
                if any(device.get('device_model') in models for device in devices):
                    filtered_hosts.append(host_data)
            return filtered_hosts
    
    def update_host_ping(self, host_name: str, ping_data: Dict[str, Any]) -> bool:
        """Update host with ping data"""
        with self._lock:
            try:
                if host_name not in self._hosts:
                    return False
                
                host_data = self._hosts[host_name]
                current_time = time.time()
                host_data['last_seen'] = current_time
                host_data['status'] = 'online'
                
                # Update system stats if provided
                if 'system_stats' in ping_data:
                    host_data['system_stats'] = ping_data['system_stats']
                
                # Update device-level data if provided
                if 'devices' in ping_data:
                    for updated_device in ping_data['devices']:
                        device_id = updated_device.get('device_id')
                        if device_id:
                            # Find and update corresponding device
                            for existing_device in host_data.get('devices', []):
                                if existing_device.get('device_id') == device_id:
                                    # Update device-level verification and action types
                                    if 'available_verification_types' in updated_device:
                                        existing_device['available_verification_types'] = updated_device['available_verification_types']
                                    if 'available_action_types' in updated_device:
                                        existing_device['available_action_types'] = updated_device['available_action_types']
                                    break
                
                # Update other provided fields
                for field in ['host_ip', 'host_port_external']:
                    if field in ping_data:
                        host_data[field] = ping_data[field]
                
                return True
                
            except Exception as e:
                print(f"❌ [HostManager] Error updating host ping for {host_name}: {e}")
                return False
    
    def cleanup_stale_hosts(self, timeout_seconds: int = 120) -> int:
        """Remove hosts that haven't been seen for a while"""
        with self._lock:
            current_time = time.time()
            stale_hosts = []
            
            for host_name, host_data in self._hosts.items():
                if current_time - host_data.get('last_seen', 0) > timeout_seconds:
                    stale_hosts.append(host_name)
            
            for host_name in stale_hosts:
                del self._hosts[host_name]
                print(f"⚠️ [HostManager] Removed stale host: {host_name}")
            
            return len(stale_hosts)

# Global instance
_host_manager = HostManager()

def get_host_manager() -> HostManager:
    """Get the global host manager instance"""
    global _host_manager
    if _host_manager is None:
        _host_manager = get_host()
    return _host_manager

# =====================================================
# HOST REGISTRATION AND CLIENT COMMUNICATION
# =====================================================

# Client registration state for host mode
client_registration_state = {
    'registered': False,
    'host_name': None,
    'urls': {},
    'ping_failures': 0,
    'last_ping_time': 0  # To prevent duplicate pings
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
            print(f"     - {device.device_name} ({device.device_model}) [{device.device_id}]")
            capabilities = device.get_capabilities()
            if capabilities:
                print(f"       Capabilities: {', '.join(capabilities)}")
        
        # Get system stats
        system_stats = get_host_system_stats()
        
        # Get HOST_URL from environment variable instead of constructing it
        host_url = os.getenv('HOST_URL', f"http://{host.host_ip}:{host.host_port}")
        print(f"   Registration URL: {host_url} (from HOST_URL env var)")
        
        # Create registration payload
        registration_data = {
            'host_name': host.host_name,
            'host_url': host_url,  # Use environment variable directly
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
                },
                'ping_failures': 0,
                'last_ping_time': 0
            })
            
            print(f"   Registered as: {host.host_name}")
            print(f"   Devices: {host.get_device_count()}")
            print(f"   Total capabilities: {len(host.get_all_capabilities())}")
            
            return True
            
        else:
            print(f"❌ [HOST] Registration failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
        
    except Exception as e:
        print(f"❌ [HOST] Registration error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def send_ping_to_server():
    """Send ping to server to maintain registration."""
    global client_registration_state
    
    if not client_registration_state.get('registered'):
        return
    
    # Prevent duplicate pings within 5 seconds
    current_time = time.time()
    if current_time - client_registration_state.get('last_ping_time', 0) < 5:
        return
    
    client_registration_state['last_ping_time'] = current_time
    
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
                # Reset failure counter on success
                client_registration_state['ping_failures'] = 0
                print(f"📡 [HOST] Ping sent successfully at {time.strftime('%H:%M:%S')}")
            else:
                # Count failure
                client_registration_state['ping_failures'] += 1
                failure_count = client_registration_state['ping_failures']
                print(f"⚠️ [HOST] Ping failed ({failure_count}/3): {response.status_code}")
                
                # After 3 failures, try to reconnect
                if failure_count >= 3:
                    print("🔄 [HOST] 3 ping failures - attempting reconnection...")
                    try_reconnect()
                
    except Exception as e:
        # Count failure for network errors too
        client_registration_state['ping_failures'] += 1
        failure_count = client_registration_state['ping_failures']
        print(f"⚠️ [HOST] Ping failed ({failure_count}/3): {str(e)}")
        
        # After 3 failures, try to reconnect
        if failure_count >= 3:
            print("🔄 [HOST] 3 ping failures - attempting reconnection...")
            try_reconnect()


def try_reconnect():
    """Simple reconnection: try 10 times with 20s delay"""
    global client_registration_state
    
    # Mark as unregistered to stop normal pings
    client_registration_state['registered'] = False
    
    for attempt in range(1, 11):  # 1 to 10
        print(f"🔍 [HOST] Reconnection attempt {attempt}/10")
        
        if register_host_with_server():
            print("✅ [HOST] Reconnection successful!")
            return
        
        if attempt < 10:  # Don't wait after last attempt
            print("⏳ [HOST] Waiting 20 seconds before next attempt...")
            time.sleep(20)
    
    print("❌ [HOST] Failed to reconnect after 10 attempts")


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
            'urls': {},
            'ping_failures': 0,
            'last_ping_time': 0
        })
        
    except Exception as e:
        print(f"❌ [HOST] Unregister error: {str(e)}")


def start_ping_thread():
    """Start the ping thread."""
    global ping_thread, ping_stop_event
    
    # Stop existing thread if running
    if ping_thread and ping_thread.is_alive():
        print("🔄 [HOST] Stopping existing ping thread...")
        ping_stop_event.set()
        ping_thread.join(timeout=2)
    
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
    # Host instance will be cleaned up automatically when process exits


def setup_host_signal_handlers():
    """Setup signal handlers for graceful shutdown."""
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    atexit.register(cleanup_on_exit) 


# =====================================================
# CLEAN CONTROLLER ACCESS FUNCTIONS
# =====================================================

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
        device_id: Device identifier (can be None for host_vnc operations)
        controller_type: Abstract controller type ('av', 'remote', 'verification', 'web', 'desktop') 
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
    
    # Handle abstract controller types (av, remote, verification, web, desktop)
    return host.get_controller(device_id, controller_type)


def list_available_devices():
    """List all available devices."""
    host = get_host()
    return [
        {
            'device_id': device.device_id,
            'name': device.device_name,
            'model': device.device_model,
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

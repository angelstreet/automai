"""
System routes for client registration and health management
Handles server/client communication and registry
"""

from flask import Blueprint, request, jsonify, current_app
import threading
import time
import requests
import os
import psutil
from datetime import datetime
import json
from typing import TypedDict, Optional, List, Any

# Import using consistent src. prefix (project root is already in sys.path from app startup)
from src.controllers.controller_config_factory import create_controller_configs_from_device_info

# Import URL builders from app_utils following the pattern like useRegistration
from src.utils.app_utils import (
    get_host_registry
)

system_bp = Blueprint('system', __name__, url_prefix='/server/system')



def get_health_check_threads():
    """Get health check threads from app context"""
    return getattr(current_app, '_health_check_threads', {})

def set_health_check_threads(threads):
    """Set health check threads in app context"""
    current_app._health_check_threads = threads



@system_bp.route('/register', methods=['POST'])
def register_host():
    """Host registers with server"""
    try:
        host_info = request.get_json()
        
        print(f"[@route:register_host] Host registration request received:")
        print(f"   Host info keys: {list(host_info.keys()) if host_info else 'None'}")
        print(f"   Host name: {host_info.get('host_name', 'Not provided')}")
        print(f"   Host URL: {host_info.get('host_url', 'Not provided')}")
        print(f"   Device model: {host_info.get('device_model', 'Not provided')}")
        print(f"   Verification types: {len(host_info.get('available_verification_types', {}))} controller types")
        print(f"   Available action types: {len(host_info.get('available_action_types', {}))} controller types")
        
        # Check for required fields
        required_fields = ['host_url', 'host_name', 'devices']
        missing_fields = []
        for field in required_fields:
            if field not in host_info or not host_info[field]:
                missing_fields.append(field)
        
        if missing_fields:
            error_msg = f'Missing required fields: {", ".join(missing_fields)}'
            print(f"❌ [SERVER] Registration failed: {error_msg}")
            print(f"   Required fields: {required_fields}")
            print(f"   Received fields: {list(host_info.keys()) if host_info else 'None'}")
            return jsonify({'error': error_msg}), 400
        
        # Extract port from host_url or use provided port
        host_port = host_info.get('host_port', '6109')
        devices = host_info.get('devices', [])
        
        print(f"[@route:register_host] Host configuration:")
        print(f"   Host URL: {host_info['host_url']}")
        print(f"   Host Port: {host_port}")
        print(f"   Devices: {len(devices)} devices")
        
        # Process each device and build combined capabilities
        all_capabilities = set()
        all_controller_types = set()
        devices_with_controllers = []
        
        for device in devices:
            print(f"[@route:register_host] Processing device: {device['device_name']} ({device['device_model']})")
            
            # Build controller configs for this device
            controller_configs = create_controller_configs_from_device_info(device)
            
            # Use the capabilities sent by the host (no redundant server-side detection)
            # Extract controller types and class names from the actual controller configs
            device_capabilities = [config['type'] for config in controller_configs]
            device_controller_types = [config['class'].__name__ for config in controller_configs]
            
            # Add device with its controller info
            device_with_controllers = {
                **device,
                'controller_configs': controller_configs,
                'capabilities': device_capabilities,
                'controller_types': device_controller_types
            }
            devices_with_controllers.append(device_with_controllers)
            
            # Collect all capabilities and controller types
            all_capabilities.update(device_capabilities)
            all_controller_types.update(device_controller_types)
        
        print(f"[@route:register_host] Combined capabilities: {list(all_capabilities)}")
        print(f"[@route:register_host] Combined controller types: {list(all_controller_types)}")
        
        # Create host object with multi-device support
        host_object: Host = {
            # === PRIMARY IDENTIFICATION ===
            'host_name': host_info['host_name'],
            'description': f"Host: {host_info['host_name']} with {len(devices)} device(s)",
            
            # === NETWORK CONFIGURATION ===
            'host_url': host_info['host_url'],
            'host_port': int(host_port),
            
            # === MULTI-DEVICE CONFIGURATION ===
            'devices': devices_with_controllers,
            'device_count': len(devices),
            
            # === STATUS AND METADATA ===
            'status': 'online',
            'last_seen': time.time(),
            'registered_at': datetime.now().isoformat(),
            'system_stats': host_info.get('system_stats', get_system_stats()),
            
            # === HOST CAPABILITIES (COMBINED FROM ALL DEVICES) ===
            'capabilities': list(all_capabilities),
            'controller_types': list(all_controller_types),
            'available_verification_types': host_info.get('available_verification_types', {}),
            'available_action_types': host_info.get('available_action_types', {}),
            
            # === DEVICE LOCK MANAGEMENT ===
            'isLocked': False,
            'lockedBy': None,
            'lockedAt': None,
        }
        
        # Store host by host_name (primary key)
        connected_hosts = get_host_registry()
        
        # Check if host is already registered (by host_name)
        existing_host = connected_hosts.get(host_info['host_name'])
        
        if existing_host:
            # Update existing host
            print(f"🔄 [SERVER] Updating existing host registration:")
            print(f"   Host Name: {host_info['host_name']}")
            print(f"   Devices: {len(devices)} device(s)")
            
            # Keep original registration time but update all other info
            host_object['registered_at'] = existing_host.get('registered_at', host_object['registered_at'])
            host_object['reconnected_at'] = datetime.now().isoformat()
            
            # Update with new data
            connected_hosts[host_info['host_name']] = host_object
            set_health_check_threads(get_health_check_threads())
            
            print(f"✅ [SERVER] Host registration updated successfully")
        else:
            # New host registration
            connected_hosts[host_info['host_name']] = host_object
            set_health_check_threads(get_health_check_threads())
            
            print(f"✅ [SERVER] New host registered successfully:")
            print(f"   Host Name: {host_info['host_name']}")
            print(f"   Host URL: {host_info['host_url']}")
            print(f"   Devices: {len(devices)} device(s)")
        
        response_data = host_object
        
        return jsonify({
            'status': 'success',
            'message': 'Host registered successfully',
            'host_name': host_info['host_name'],
            'host_data': response_data
        }), 200
        
    except Exception as e:
        error_msg = f"Server error during registration: {str(e)}"
        print(f"❌ [SERVER] {error_msg}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': error_msg}), 500

@system_bp.route('/unregister', methods=['POST'])
def unregister_host():
    """Host unregisters from server"""
    try:
        data = request.get_json()
        
        host_name = data.get('host_name')
        
        if not host_name:
            return jsonify({'error': 'Missing host_name'}), 400
        
        connected_hosts = get_host_registry()
        
        # Find host by host_name
        if host_name in connected_hosts:
            host_to_remove = connected_hosts[host_name]
            
            # Remove host
            del connected_hosts[host_name]
            set_health_check_threads(get_health_check_threads())
            
            print(f"🔌 Host unregistered: {host_name}")
            
            return jsonify({
                'status': 'success',
                'message': 'Host unregistered successfully'
            }), 200
        else:
            error_msg = f'Host not found with host_name: {host_name}'
            return jsonify({'error': error_msg}), 404
            
    except Exception as e:
        print(f"❌ Error unregistering host: {e}")
        return jsonify({'error': str(e)}), 500

@system_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for clients"""
    system_stats = get_system_stats()
    
    return jsonify({
        'status': 'healthy',
        'timestamp': time.time(),
        'mode': os.getenv('SERVER_MODE', 'server'),
        'system_stats': system_stats
    }), 200

@system_bp.route('/getAllHosts', methods=['GET'])
def getAllHosts():
    """Return all registered hosts - single REST endpoint for host listing"""
    try:
        connected_hosts = get_host_registry()
        
        # Clean up stale hosts (not seen for more than 2 minutes)
        current_time = time.time()
        stale_hosts = []
        
        for host_name, host_info in connected_hosts.items():
            if current_time - host_info.get('last_seen', 0) > 120:  # 2 minutes
                stale_hosts.append(host_name)
        
        # Remove stale hosts
        for host_name in stale_hosts:
            if host_name in connected_hosts:
                del connected_hosts[host_name]
                set_health_check_threads(get_health_check_threads())
        
        # Return complete stored objects exactly as-is - no manual processing
        # Filter to only online hosts for active use
        hosts = [
            {k: v for k, v in host_info.items() if k != 'controller_objects'}
            for host_name, host_info in connected_hosts.items()
            if host_info.get('status') == 'online'
        ]
        
        print(f"🖥️ [HOSTS] Returning {len(hosts)} online hosts")
        for host in hosts:
            device_count = host.get('device_count', 0)
            print(f"   Host: {host['host_name']} - {device_count} device(s)")
        
        return jsonify({
            'success': True,
            'hosts': hosts
        }), 200
        
    except Exception as e:
        print(f"❌ [HOSTS] Error listing hosts: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@system_bp.route('/environment-profiles', methods=['GET'])
def get_environment_profiles():
    """Get available environment profiles for test execution"""
    try:
        # TODO: Implement actual environment profiles from database
        # For now, return some default profiles
        profiles = [
            {
                'id': 'default',
                'name': 'Default Environment',
                'description': 'Standard test environment',
                'config': {
                    'timeout': 30000,
                    'retry_count': 3,
                    'screenshot_on_failure': True
                }
            },
            {
                'id': 'performance',
                'name': 'Performance Testing',
                'description': 'Environment optimized for performance tests',
                'config': {
                    'timeout': 60000,
                    'retry_count': 1,
                    'screenshot_on_failure': False
                }
            },
            {
                'id': 'debug',
                'name': 'Debug Environment',
                'description': 'Environment with extended timeouts for debugging',
                'config': {
                    'timeout': 120000,
                    'retry_count': 5,
                    'screenshot_on_failure': True,
                    'verbose_logging': True
                }
            }
        ]
        
        return jsonify({
            'success': True,
            'profiles': profiles
        }), 200
        
    except Exception as e:
        print(f"❌ Error getting environment profiles: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@system_bp.route('/ping', methods=['POST'])
def client_ping():
    """Client sends periodic health ping to server"""
    try:
        ping_data = request.get_json()
        
        if not ping_data:
            return jsonify({'error': 'No ping data received'}), 400
        
        host_name = ping_data.get('host_name')
        
        if not host_name:
            return jsonify({'error': 'Missing host_name in ping'}), 400
        
        connected_hosts = get_host_registry()
        
        # Find host by host_name
        if host_name not in connected_hosts:
            # Host not registered, ask them to register
            print(f"📍 [PING] Unknown host {host_name} sending registration request")
            return jsonify({
                'status': 'not_registered',
                'message': 'Host not registered, please register first',
                'action': 'register'
            }), 404
        
        # Update host information
        host_to_update = connected_hosts[host_name]
        current_time = time.time()
        host_to_update['last_seen'] = current_time
        host_to_update['status'] = 'online'
        
        # Update system stats if provided
        if 'system_stats' in ping_data:
            host_to_update['system_stats'] = ping_data['system_stats']
        
        # Update verification types and actions if provided
        if 'available_verification_types' in ping_data:
            host_to_update['available_verification_types'] = ping_data['available_verification_types']
        
        if 'available_action_types' in ping_data:
            host_to_update['available_action_types'] = ping_data['available_action_types']
        
        # Update any other provided fields
        for field in ['host_ip', 'host_port_external']:
            if field in ping_data:
                host_to_update[field] = ping_data[field]
        
        set_health_check_threads(get_health_check_threads())
        
        print(f"💓 [PING] Host {host_name} ping received - status updated")
        
        return jsonify({
            'status': 'success',
            'message': 'Ping received successfully',
            'server_time': current_time
        }), 200
        
    except Exception as e:
        print(f"❌ [PING] Error processing host ping: {e}")
        return jsonify({'error': str(e)}), 500

def start_health_check(client_id, client_ip, client_port):
    """Start health check thread for a client"""
    from flask import current_app
    
    # Get the Flask app instance before starting the thread
    try:
        app = current_app._get_current_object()
    except RuntimeError:
        print(f"⚠️ [HEALTH] Could not get current app context for client {client_id}")
        return
    
    def health_worker(app_instance):
        consecutive_failures = 0
        max_failures = 3
        
        while True:
            try:
                # Use app context for each iteration
                with app_instance.app_context():
                    connected_clients = getattr(app_instance, '_connected_clients', {})
                    if client_id not in connected_clients:
                        print(f"🔌 [HEALTH] Health check stopped for {client_id} (client removed)")
                        break
                    
                    try:
                        # Always use centralized API URL builder from registry data
                        host_info = connected_clients[client_id]
                        from src.utils.buildUrlUtils import buildHostUrl
                        health_url = buildHostUrl(host_info, "/server/system/health")
                        
                        response = requests.get(health_url, timeout=5)
                        if response.status_code == 200:
                            # Update last seen timestamp
                            connected_clients[client_id]['last_seen'] = time.time()
                            connected_clients[client_id]['status'] = 'online'
                            
                            # Update system stats if available in response
                            try:
                                health_data = response.json()
                                if 'system_stats' in health_data:
                                    connected_clients[client_id]['system_stats'] = health_data['system_stats']
                                    print(f"💓 [HEALTH] Client {client_id[:8]}... health check OK - CPU: {health_data['system_stats']['cpu']['percent']}%, RAM: {health_data['system_stats']['memory']['percent']}%, Disk: {health_data['system_stats']['disk']['percent']}%")
                                else:
                                    print(f"💓 [HEALTH] Client {client_id[:8]}... health check OK")
                            except Exception as json_error:
                                print(f"💓 [HEALTH] Client {client_id[:8]}... health check OK (no stats)")
                            
                    except Exception as e:
                        consecutive_failures += 1
                        print(f"⚠️ [HEALTH] Health check failed for {client_id[:8]}...: {e}")
                    
                    # Remove client after max failures
                    if consecutive_failures >= max_failures:
                        print(f"❌ [HEALTH] Removing client {client_id[:8]}... after {max_failures} failed health checks")
                        # Remove client using app context
                        remove_client_with_app(client_id, app_instance)
                        break
                        
            except Exception as context_error:
                print(f"❌ [HEALTH] App context error for client {client_id[:8]}...: {context_error}")
                break
            
            time.sleep(30)  # Check every 30 seconds
    
    # Start health check thread
    health_check_threads = get_health_check_threads()
    if client_id not in health_check_threads:
        thread = threading.Thread(target=health_worker, args=(app,), daemon=True, name=f"health-{client_id[:8]}")
        thread.start()
        health_check_threads[client_id] = thread
        set_health_check_threads(health_check_threads)
        print(f"🏥 [HEALTH] Started health check thread for client {client_id[:8]}...")

def get_system_stats():
    """Get current system statistics (CPU, RAM, Disk)"""
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
        print(f"⚠️ [SYSTEM] Error getting system stats: {e}")
        return {
            'cpu': {'percent': 0},
            'memory': {'percent': 0, 'used_gb': 0, 'total_gb': 0},
            'disk': {'percent': 0, 'used_gb': 0, 'total_gb': 0},
            'timestamp': time.time(),
            'error': str(e)
        } 

# Define Host type matching Host_Types.ts
class Host(TypedDict):
    # === PRIMARY IDENTIFICATION ===
    host_name: str
    description: Optional[str]
    
    # === NETWORK CONFIGURATION ===
    host_url: str
    host_port: int
    
    # === MULTI-DEVICE CONFIGURATION ===
    devices: List[Any]  # Array of device configurations
    device_count: int
    
    # === STATUS AND METADATA ===
    status: str  # 'online' | 'offline' | 'unreachable' | 'maintenance'
    last_seen: float
    registered_at: str
    system_stats: Any  # SystemStats type
    
    # === HOST CAPABILITIES (COMBINED FROM ALL DEVICES) ===
    capabilities: List[str]
    controller_types: Optional[List[str]]
    available_verification_types: Any
    available_action_types: Any
    
    # === DEVICE LOCK MANAGEMENT ===
    isLocked: bool
    lockedBy: Optional[str]
    lockedAt: Optional[float]

@system_bp.route('/server/system/getAvailableActions', methods=['POST'])
def get_available_actions():
    """Get available actions for a specific host."""
    try:
        data = request.get_json()
        host = data.get('host')
        
        if not host:
            return jsonify({'success': False, 'error': 'Host data is required'}), 400
        
        host_name = host.get('host_name')
        if not host_name:
            return jsonify({'success': False, 'error': 'Host name is required'}), 400
        
        print(f"[@route:server_system_routes:get_available_actions] Getting available actions for host: {host_name}")
        
        # Get host from connected hosts registry
        connected_hosts = get_host_registry()
        host_data = connected_hosts.get(host_name)
        if not host_data:
            print(f"[@route:server_system_routes:get_available_actions] Host {host_name} not found in connected hosts")
            return jsonify({'success': False, 'error': f'Host {host_name} not found'}), 404
        
        # Get available actions from host data
        available_action_types = host_data.get('available_action_types', {})
        
        if not available_action_types:
            print(f"[@route:server_system_routes:get_available_actions] No actions available for host {host_name}")
            return jsonify({'success': True, 'actions': []})
        
        # Transform actions to the expected format for the frontend
        transformed_actions = []
        
        for category, actions_list in available_action_types.items():
            if isinstance(actions_list, list):
                for action in actions_list:
                    if isinstance(action, dict):
                        # Action is already in the correct format
                        transformed_action = {
                            'id': action.get('id', ''),
                            'label': action.get('label', ''),
                            'command': action.get('command', ''),
                            'params': action.get('params', {}),
                            'description': action.get('description', ''),
                            'category': category,
                            'requiresInput': action.get('requiresInput', False)
                        }
                        
                        # Add input fields if required
                        if action.get('requiresInput', False):
                            transformed_action['inputLabel'] = action.get('inputLabel', 'Input')
                            transformed_action['inputPlaceholder'] = action.get('inputPlaceholder', '')
                        
                        transformed_actions.append(transformed_action)
        
        print(f"[@route:server_system_routes:get_available_actions] Returning {len(transformed_actions)} actions for host {host_name}")
        
        return jsonify({
            'success': True,
            'actions': transformed_actions
        })
        
    except Exception as e:
        print(f"[@route:server_system_routes:get_available_actions] Error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


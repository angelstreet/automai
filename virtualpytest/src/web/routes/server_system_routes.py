"""
System routes for client registration and health management
Handles server/client communication and registry
"""

from flask import Blueprint, request, jsonify, current_app
import threading
import time
import requests
import os
import logging
import tempfile
import psutil
from datetime import datetime
from collections import deque
import json

# Import using consistent src. prefix (project root is already in sys.path from app startup)
from src.controllers.controller_config_factory import (
    create_controller_configs_from_device_info,
    get_device_capabilities_from_model,
    get_controller_types_from_model
)
print("[@system_routes] Successfully imported controller_config_factory")

system_bp = Blueprint('system', __name__, url_prefix='/server/system')

# In-memory log storage for debug purposes
_debug_logs = deque(maxlen=10000)  # Keep last 10000 log entries

class DebugLogHandler(logging.Handler):
    """Custom log handler to capture logs for debug modal"""
    
    def emit(self, record):
        try:
            log_entry = {
                'timestamp': datetime.fromtimestamp(record.created).isoformat(),
                'level': record.levelname,
                'message': self.format(record),
                'source': record.name
            }
            _debug_logs.append(log_entry)
        except Exception:
            pass  # Ignore errors in logging handler

# Set up debug logging
debug_handler = DebugLogHandler()
debug_handler.setLevel(logging.DEBUG)
formatter = logging.Formatter('%(name)s - %(message)s')
debug_handler.setFormatter(formatter)

# Add handler to root logger to capture all logs
root_logger = logging.getLogger()
root_logger.addHandler(debug_handler)
root_logger.setLevel(logging.DEBUG)

# Also add handler to Flask app logger
flask_logger = logging.getLogger('werkzeug')
flask_logger.addHandler(debug_handler)

def get_connected_clients():
    """Get connected clients from app context"""
    return getattr(current_app, '_connected_clients', {})

def get_health_check_threads():
    """Get health check threads from app context"""
    return getattr(current_app, '_health_check_threads', {})

def set_connected_clients(clients):
    """Set connected clients in app context"""
    current_app._connected_clients = clients

def set_health_check_threads(threads):
    """Set health check threads in app context"""
    current_app._health_check_threads = threads

@system_bp.route('/logs', methods=['GET'])
def get_logs():
    """Get server logs for debug modal"""
    try:
        lines = request.args.get('lines', 1000, type=int)
        level_filter = request.args.get('level', 'all').upper()
        
        # Convert deque to list and get last N entries
        all_logs = list(_debug_logs)
        
        # Filter by level if specified
        if level_filter != 'ALL':
            filtered_logs = [log for log in all_logs if log['level'] == level_filter]
        else:
            filtered_logs = all_logs
        
        # Get last N lines
        recent_logs = filtered_logs[-lines:] if lines > 0 else filtered_logs
        
        return jsonify({
            'success': True,
            'logs': recent_logs,
            'total_logs': len(all_logs),
            'filtered_logs': len(recent_logs)
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@system_bp.route('/logs/clear', methods=['POST'])
def clear_logs():
    """Clear server logs"""
    try:
        _debug_logs.clear()
        
        # Add a log entry about clearing
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'level': 'INFO',
            'message': 'Debug logs cleared via API',
            'source': 'system'
        }
        _debug_logs.append(log_entry)
        
        return jsonify({
            'success': True,
            'message': 'Logs cleared successfully'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@system_bp.route('/register', methods=['POST'])
def register_client():
    """Host registers with server"""
    try:
        host_info = request.get_json()
        
        print(f"[@route:register_client] Host registration request received:")
        print(f"   Host info keys: {list(host_info.keys()) if host_info else 'None'}")
        print(f"   Host name: {host_info.get('host_name', 'Not provided')}")
        print(f"   Host IP: {host_info.get('host_ip', 'Not provided')}")
        print(f"   Device model: {host_info.get('device_model', 'Not provided')}")
        
        # Check for required fields
        required_fields = ['host_ip', 'device_model', 'host_name']
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
        
        # Validate field values
        validation_errors = []
        
        if not host_info.get('host_ip'):
            validation_errors.append('host_ip cannot be empty')
        
        if not host_info.get('device_model'):
            validation_errors.append('device_model cannot be empty')
        
        if not host_info.get('host_name'):
            validation_errors.append('host_name cannot be empty')
        
        if validation_errors:
            error_msg = f'Validation errors: {"; ".join(validation_errors)}'
            print(f"❌ [SERVER] Registration failed: {error_msg}")
            return jsonify({'error': error_msg}), 400
        
        # Extract and set port defaults - complete port structure
        host_port_internal = host_info.get('host_port_internal', '6119')
        host_port_external = host_info.get('host_port_external', host_port_internal)
        host_port_web = host_info.get('host_port_web', '444')
        
        print(f"[@route:register_client] Port configuration:")
        print(f"   Internal Port: {host_port_internal} (Flask app)")
        print(f"   External Port: {host_port_external} (Server access)")
        print(f"   Web Port: {host_port_web} (HTTPS/nginx)")
        
        # Set device defaults if not provided - simplified approach
        device_name = host_info.get('device_name')
        if not device_name:
            # Generate device_name if not provided
            device_name = f"{host_info['device_model'].replace('_', ' ').title()}"
        
        device_ip = host_info.get('device_ip', host_info['host_ip'])  # Default to host IP
        device_port = host_info.get('device_port', '5555')  # Default ADB port
        
        print(f"[@route:register_client] Device information:")
        print(f"   Device Name: {device_name} ({'from host' if host_info.get('device_name') else 'generated'})")
        print(f"   Device Model: {host_info['device_model']}")
        print(f"   Device IP: {device_ip}")
        print(f"   Device Port: {device_port}")
        
        # Build complete controller configs using factory
        print(f"[@route:register_client] Building controller configs using factory...")
        controller_configs = create_controller_configs_from_device_info(
            device_model=host_info['device_model'],
            device_ip=device_ip,
            device_port=device_port,
            host_ip=host_info['host_ip'],
            host_port=host_port_external
        )
        
        # Get capabilities and controller types from factory
        capabilities = get_device_capabilities_from_model(host_info['device_model'])
        controller_types = get_controller_types_from_model(host_info['device_model'])
        
        print(f"[@route:register_client] Factory built:")
        print(f"   Controller configs: {list(controller_configs.keys()) if controller_configs else 'None'}")
        print(f"   Capabilities: {capabilities}")
        print(f"   Controller types: {controller_types}")
        
        # Instantiate controller objects from configs
        print(f"[@route:register_client] Instantiating controller objects...")
        controller_objects = {}
        
        # Build connection information early so it can be passed to controllers
        host_connection = {
            'flask_url': f"http://{host_info['host_ip']}:{host_port_external}",  # Use external port for server access
            'nginx_url': f"https://{host_info['host_ip']}:{host_port_web}"      # Use web port for HTTPS
        }
        
        try:
            from src.controllers import ControllerFactory
            
            # STEP 1: Create AV controller FIRST (required by verification controllers)
            av_controller = None
            if 'av' in controller_configs:
                av_config = controller_configs['av']
                av_params = av_config['parameters']
                
                print(f"[@route:register_client] Creating AV controller: {av_config['implementation']}")
                av_controller = ControllerFactory.create_av_controller(
                    capture_type=av_config['implementation'],
                    device_name=device_name,
                    video_device='/dev/video0',
                    output_path='/var/www/html/stream/',
                    host_ip=av_params.get('host_ip'),
                    host_port=av_params.get('host_port'),
                    host_connection=host_connection  # Pass host connection info
                )
                controller_objects['av'] = av_controller
                print(f"[@route:register_client] AV controller created successfully with connection: {host_connection['nginx_url']}")
            
            # STEP 2: Create Remote controller (independent)
            if 'remote' in controller_configs:
                remote_config = controller_configs['remote']
                remote_params = remote_config['parameters']
                
                print(f"[@route:register_client] Creating Remote controller: {remote_config['implementation']}")
                remote_controller = ControllerFactory.create_remote_controller(
                    device_type=remote_config['implementation'],
                    device_name=device_name,
                    device_ip=remote_params.get('device_ip'),
                    device_port=remote_params.get('device_port'),
                    adb_port=remote_params.get('device_port')
                )
                controller_objects['remote'] = remote_controller
                print(f"[@route:register_client] Remote controller created successfully")
            
            # STEP 3: Create Verification controller (AFTER AV controller, pass av_controller if needed)
            if 'verification' in controller_configs:
                verification_config = controller_configs['verification']
                verification_params = verification_config['parameters']
                
                print(f"[@route:register_client] Creating Verification controller: {verification_config['implementation']}")
                
                # For ADB verification, construct device_id from device_ip and device_port
                if verification_config['implementation'] == 'adb':
                    verification_device_id = f"{verification_params.get('device_ip')}:{verification_params.get('device_port')}"
                    verification_controller = ControllerFactory.create_verification_controller(
                        verification_type=verification_config['implementation'],
                        device_name=device_name,
                        device_id=verification_device_id,
                        connection_timeout=verification_params.get('connection_timeout', 10)
                    )
                else:
                    # For text/image verification controllers, they need the AV controller
                    if verification_config['implementation'] in ['ocr', 'text', 'image']:
                        if not av_controller:
                            raise ValueError(f"AV controller is required for {verification_config['implementation']} verification but was not created")
                        
                        verification_controller = ControllerFactory.create_verification_controller(
                            verification_type=verification_config['implementation'],
                            av_controller=av_controller,  # Pass AV controller for screenshot capture
                            device_name=device_name,
                            **verification_params
                        )
                    else:
                        # For other verification types, pass parameters as-is
                        verification_controller = ControllerFactory.create_verification_controller(
                            verification_type=verification_config['implementation'],
                            device_name=device_name,
                            **verification_params
                        )
                
                controller_objects['verification'] = verification_controller
                print(f"[@route:register_client] Verification controller created successfully")
            
            # STEP 4: Create Power controller (independent)
            if 'power' in controller_configs:
                power_config = controller_configs['power']
                power_params = power_config['parameters']
                
                print(f"[@route:register_client] Creating Power controller: {power_config['implementation']}")
                power_controller = ControllerFactory.create_power_controller(
                    power_type=power_config['implementation'],
                    device_name=device_name,
                    hub_location=power_params.get('hub_location'),
                    port_number=power_params.get('port_number')
                )
                controller_objects['power'] = power_controller
                print(f"[@route:register_client] Power controller created successfully")
            
            print(f"[@route:register_client] All controller objects instantiated: {list(controller_objects.keys())}")
            
        except Exception as e:
            error_msg = f"Failed to instantiate controllers: {str(e)}"
            print(f"❌ [SERVER] Registration failed: {error_msg}")
            import traceback
            traceback.print_exc()
            return jsonify({
                'status': 'error',
                'error': error_msg,
                'details': 'Controller instantiation failed during host registration'
            }), 500
        
        # Use actual controller names directly - no mapping needed
        capabilities = list(controller_objects.keys())
        
        print(f"[@route:register_client] Actual instantiated controllers:")
        print(f"   Controllers: {list(controller_objects.keys())}")
        
        # Create a single, clean host object
        host_object = {
            # === PRIMARY HOST IDENTIFICATION ===
            'host_name': host_info['host_name'],           # Primary key
            'host_ip': host_info['host_ip'],
            
            # === COMPLETE PORT STRUCTURE ===
            'host_port_internal': host_port_internal,     # Where Flask actually runs
            'host_port_external': host_port_external,     # For server communication
            'host_port_web': host_port_web,               # HTTPS/nginx port
            
            # === DEVICE INFORMATION ===  
            'name': device_name,                          # Device display name
            'model': host_info['device_model'],           # Device model
            'device_ip': device_ip,
            'device_port': device_port,
            
            # === CONNECTION INFORMATION ===
            'connection': host_connection,
            
            # === STATUS AND METADATA ===
            'status': 'online',
            'registered_at': datetime.now().isoformat(),
            'last_seen': time.time(),
            'capabilities': capabilities,
            'system_stats': host_info.get('system_stats', get_system_stats()),
            'description': f"Device: {device_name} controlled by host: {host_info['host_name']}",
            
            # === CONTROLLER INFORMATION ===
            'controller_configs': controller_configs,     # Complete configs from factory
            'controller_objects': controller_objects,     # Instantiated controllers (internal use)
            
            # === DEVICE LOCK MANAGEMENT ===
            'isLocked': False,
            'lockedBy': None,
            'lockedAt': None,
        }
        
        # Store host by host_name (primary key)
        connected_clients = get_connected_clients()
        
        # Check if host is already registered (by host_name)
        existing_host = connected_clients.get(host_info['host_name'])
        
        if existing_host:
            # Update existing host
            print(f"🔄 [SERVER] Updating existing host registration:")
            print(f"   Host Name: {host_info['host_name']}")
            print(f"   Device: {device_name} ({host_info['device_model']})")
            
            # Keep original registration time but update all other info
            host_object['registered_at'] = existing_host.get('registered_at', host_object['registered_at'])
            host_object['reconnected_at'] = datetime.now().isoformat()
            
            # Update with new data
            connected_clients[host_info['host_name']] = host_object
            set_connected_clients(connected_clients)
            
            print(f"✅ [SERVER] Host registration updated successfully")
        else:
            # New host registration
            connected_clients[host_info['host_name']] = host_object
            set_connected_clients(connected_clients)
            
            print(f"✅ [SERVER] New host registered successfully:")
            print(f"   Host Name: {host_info['host_name']}")
            print(f"   Host Address: {host_info['host_ip']}:{host_port_external}")
            print(f"   Device: {device_name} ({host_info['device_model']})")
            print(f"   Device Address: {device_ip}:{device_port}")
        
        # Send clean response (exclude controller_objects)
        response_data = {k: v for k, v in host_object.items() if k != 'controller_objects'}
        
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
def unregister_client():
    """Client unregisters from server"""
    try:
        data = request.get_json()
        
        host_name = data.get('host_name')
        
        if not host_name:
            return jsonify({'error': 'Missing host_name'}), 400
        
        connected_clients = get_connected_clients()
        
        # Find host by host_name
        if host_name in connected_clients:
            host_to_remove = connected_clients[host_name]
            
            # Remove host
            del connected_clients[host_name]
            set_connected_clients(connected_clients)
            
            # Stop health check thread (if any exists)
            health_check_threads = get_health_check_threads()
            if host_name in health_check_threads:
                del health_check_threads[host_name]
                set_health_check_threads(health_check_threads)
            
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

@system_bp.route('/health-with-devices', methods=['GET'])
def health_check_with_devices():
    """Health check endpoint that also returns connected devices"""
    try:
        system_stats = get_system_stats()
        
        # Get connected clients and clean up stale ones
        connected_clients = get_connected_clients()
        
        # Clean up stale clients (not seen for more than 2 minutes)
        current_time = time.time()
        stale_clients = []
        
        for client_id, client_info in connected_clients.items():
            if current_time - client_info.get('last_seen', 0) > 120:  # 2 minutes
                stale_clients.append(client_id)
        
        # Remove stale clients
        for client_id in stale_clients:
            remove_client(client_id)
        
        # Get updated clients list after cleanup
        connected_clients = get_connected_clients()
        
        # Format clients list
        clients_list = []
        for client_id, client_info in connected_clients.items():
            clients_list.append({
                'client_id': client_id,
                'name': client_info.get('name'),
                'device_model': client_info.get('device_model'),
                'local_ip': client_info.get('local_ip'),
                'client_port': client_info.get('client_port'),
                'public_ip': client_info.get('public_ip'),
                'capabilities': client_info.get('capabilities', []),
                'status': client_info.get('status'),
                'registered_at': client_info.get('registered_at'),
                'last_seen': client_info.get('last_seen'),
                'system_stats': client_info.get('system_stats', {
                    'cpu': {'percent': 0},
                    'memory': {'percent': 0, 'used_gb': 0, 'total_gb': 0},
                    'disk': {'percent': 0, 'used_gb': 0, 'total_gb': 0},
                    'timestamp': 0
                })
            })
        
        print(f"💓 [HEALTH-CHECK] Health check with devices: {len(clients_list)} clients connected")
        
        return jsonify({
            'status': 'healthy',
            'timestamp': time.time(),
            'mode': os.getenv('SERVER_MODE', 'server'),
            'system_stats': system_stats,
            'clients': {
                'status': 'success',
                'clients': clients_list,
                'total_clients': len(clients_list)
            }
        }), 200
        
    except Exception as e:
        print(f"❌ [HEALTH-CHECK] Error in health check with devices: {e}")
        return jsonify({
            'status': 'error',
            'timestamp': time.time(),
            'mode': os.getenv('SERVER_MODE', 'server'),
            'error': str(e)
        }), 500

@system_bp.route('/clients', methods=['GET'])
def list_clients():
    """Server lists all connected hosts"""
    try:
        connected_clients = get_connected_clients()
        
        # Clean up stale hosts (not seen for more than 2 minutes)
        current_time = time.time()
        stale_hosts = []
        
        for host_name, host_info in connected_clients.items():
            if current_time - host_info.get('last_seen', 0) > 120:  # 2 minutes
                stale_hosts.append(host_name)
        
        # Remove stale hosts
        for host_name in stale_hosts:
            if host_name in connected_clients:
                del connected_clients[host_name]
                set_connected_clients(connected_clients)
        
        # Return current hosts
        hosts_list = []
        for host_name, host_info in connected_clients.items():
            hosts_list.append({
                'host_name': host_name,
                'name': host_info.get('name'),
                'device_model': host_info.get('model'),
                'host_ip': host_info.get('host_ip'),
                'host_port_external': host_info.get('host_port_external'),
                'capabilities': host_info.get('capabilities', []),
                'status': host_info.get('status'),
                'registered_at': host_info.get('registered_at'),
                'last_seen': host_info.get('last_seen'),
                'system_stats': host_info.get('system_stats', {
                    'cpu': {'percent': 0},
                    'memory': {'percent': 0, 'used_gb': 0, 'total_gb': 0},
                    'disk': {'percent': 0, 'used_gb': 0, 'total_gb': 0},
                    'timestamp': 0
                })
            })
        
        return jsonify({
            'status': 'success',
            'hosts': hosts_list,
            'total_hosts': len(hosts_list)
        }), 200
        
    except Exception as e:
        print(f"❌ Error listing hosts: {e}")
        return jsonify({'error': str(e)}), 500

@system_bp.route('/clients/devices', methods=['GET'])
def list_clients_as_devices():
    """Return registered devices with clean, consistent structure"""
    try:
        connected_clients = get_connected_clients()
        
        # Clean up stale hosts (not seen for more than 2 minutes)
        current_time = time.time()
        stale_hosts = []
        
        for host_name, host_info in connected_clients.items():
            if current_time - host_info.get('last_seen', 0) > 120:  # 2 minutes
                stale_hosts.append(host_name)
        
        # Remove stale hosts
        for host_name in stale_hosts:
            if host_name in connected_clients:
                del connected_clients[host_name]
                set_connected_clients(connected_clients)
        
        # Convert hosts to clean device format
        devices = []
        for host_name, host_info in connected_clients.items():
            if host_info.get('status') == 'online':
                # Return clean, consistent structure
                devices.append({
                    # === PRIMARY DEVICE IDENTIFICATION ===
                    'id': host_name,          # For compatibility
                    'name': host_info.get('name'),             # Device display name
                    'host_name': host_name,                    # Primary host identifier
                    'model': host_info.get('model'),           # Device model
                    
                    # === CONNECTION INFORMATION ===
                    'connection': host_info.get('connection', {}),
                    
                    # === STATUS AND METADATA ===
                    'status': host_info.get('status'),
                    'last_seen': host_info.get('last_seen'),
                    'registered_at': host_info.get('registered_at'),
                    'capabilities': host_info.get('capabilities', []),
                    'system_stats': host_info.get('system_stats', {}),
                    'description': host_info.get('description', ''),
                    
                    # === DEVICE LOCK MANAGEMENT ===
                    'isLocked': host_info.get('isLocked', False),
                    'lockedBy': host_info.get('lockedBy'),
                    'lockedAt': host_info.get('lockedAt'),
                })
        
        print(f"📱 [DEVICES] Returning {len(devices)} online devices from registered hosts")
        for device in devices:
            print(f"   Device: {device['name']} ({device['model']}) on host: {device['host_name']}")
        
        return jsonify({
            'success': True,
            'devices': devices,
            'total_devices': len(devices)
        }), 200
        
    except Exception as e:
        print(f"❌ [DEVICES] Error listing devices: {e}")
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
        
        connected_clients = get_connected_clients()
        
        # Find host by host_name
        if host_name not in connected_clients:
            # Host not registered, ask them to register
            print(f"📍 [PING] Unknown host {host_name} sending registration request")
            return jsonify({
                'status': 'not_registered',
                'message': 'Host not registered, please register first',
                'action': 'register'
            }), 404
        
        # Update host information
        host_to_update = connected_clients[host_name]
        current_time = time.time()
        host_to_update['last_seen'] = current_time
        host_to_update['status'] = 'online'
        
        # Update system stats if provided
        if 'system_stats' in ping_data:
            host_to_update['system_stats'] = ping_data['system_stats']
        
        # Update any other provided fields
        for field in ['host_ip', 'host_port_external']:
            if field in ping_data:
                host_to_update[field] = ping_data[field]
        
        set_connected_clients(connected_clients)
        
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
                        # Use pre-built flask_url from host connection instead of manual URL building
                        host_info = connected_clients[client_id]
                        connection = host_info.get('connection', {})
                        flask_url = connection.get('flask_url')
                        
                        if not flask_url:
                            # Fallback to manual URL building if connection info is missing (legacy support)
                            health_url = f"http://{client_ip}:{client_port}/server/system/health"
                            print(f"⚠️ [HEALTH] No flask_url in connection data for {client_id[:8]}..., using fallback: {health_url}")
                        else:
                            health_url = f"{flask_url}/server/system/health"
                        
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

def remove_client_with_app(client_id, app_instance):
    """Remove a client from the registry with app instance"""
    try:
        print(f"🗑️ [CLEANUP] Attempting to remove client {client_id[:8]}...")
        
        with app_instance.app_context():
            connected_clients = getattr(app_instance, '_connected_clients', {})
            health_check_threads = getattr(app_instance, '_health_check_threads', {})
            
            if client_id in connected_clients:
                client_info = connected_clients[client_id]
                del connected_clients[client_id]
                app_instance._connected_clients = connected_clients
                print(f"🗑️ [CLEANUP] Removed client: {client_info.get('name', client_id[:8])}")
            else:
                print(f"⚠️ [CLEANUP] Client {client_id[:8]}... not found in connected clients")
            
            # Clean up health check thread
            if client_id in health_check_threads:
                del health_check_threads[client_id]
                app_instance._health_check_threads = health_check_threads
                print(f"🗑️ [CLEANUP] Cleaned up health check thread for {client_id[:8]}...")
            else:
                print(f"⚠️ [CLEANUP] No health check thread found for {client_id[:8]}...")
                
            print(f"✅ [CLEANUP] Successfully removed client {client_id[:8]}...")
            
    except Exception as e:
        print(f"❌ [CLEANUP] Error removing client {client_id[:8]}...: {e}")
        import traceback
        traceback.print_exc()

def remove_client(client_id):
    """Remove a client from the registry"""
    try:
        from flask import current_app
        
        print(f"🗑️ [CLEANUP] Attempting to remove client {client_id[:8]}...")
        
        # Try to get app context, if not available use direct access
        try:
            connected_clients = get_connected_clients()
            health_check_threads = get_health_check_threads()
            print(f"🗑️ [CLEANUP] Got app context successfully for {client_id[:8]}...")
        except RuntimeError:
            # If we're outside app context, try to get app directly
            try:
                app = current_app._get_current_object()
                connected_clients = getattr(app, '_connected_clients', {})
                health_check_threads = getattr(app, '_health_check_threads', {})
                print(f"🗑️ [CLEANUP] Got app object directly for {client_id[:8]}...")
            except Exception as app_error:
                print(f"❌ [CLEANUP] Could not access app context to remove client {client_id[:8]}...: {app_error}")
                return
        
        if client_id in connected_clients:
            client_info = connected_clients[client_id]
            del connected_clients[client_id]
            
            # Update the app state
            try:
                set_connected_clients(connected_clients)
                print(f"🗑️ [CLEANUP] Updated connected clients list")
            except RuntimeError:
                # Direct update if context not available
                try:
                    app = current_app._get_current_object()
                    app._connected_clients = connected_clients
                    print(f"🗑️ [CLEANUP] Updated connected clients directly")
                except Exception as update_error:
                    print(f"⚠️ [CLEANUP] Could not update connected clients: {update_error}")
            
            print(f"🗑️ [CLEANUP] Removed client: {client_info.get('name', client_id[:8])}")
        else:
            print(f"⚠️ [CLEANUP] Client {client_id[:8]}... not found in connected clients")
        
        # Clean up health check thread
        if client_id in health_check_threads:
            thread = health_check_threads[client_id]
            del health_check_threads[client_id]
            
            try:
                set_health_check_threads(health_check_threads)
                print(f"🗑️ [CLEANUP] Updated health check threads list")
            except RuntimeError:
                # Direct update if context not available
                try:
                    app = current_app._get_current_object()
                    app._health_check_threads = health_check_threads
                    print(f"🗑️ [CLEANUP] Updated health check threads directly")
                except Exception as update_error:
                    print(f"⚠️ [CLEANUP] Could not update health check threads: {update_error}")
            
            print(f"🗑️ [CLEANUP] Cleaned up health check thread for {client_id[:8]}...")
        else:
            print(f"⚠️ [CLEANUP] No health check thread found for {client_id[:8]}...")
            
        print(f"✅ [CLEANUP] Successfully removed client {client_id[:8]}...")
            
    except Exception as e:
        print(f"❌ [CLEANUP] Error removing client {client_id[:8]}...: {e}")
        import traceback
        traceback.print_exc()

def find_available_client(device_model):
    """Find an available client for the given device model"""
    connected_clients = get_connected_clients()
    
    for client_id, client_info in connected_clients.items():
        if (client_info.get('device_model') == device_model and 
            client_info.get('status') == 'online'):
            return client_info
    
    return None

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
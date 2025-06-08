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
import sys

# Add the web/utils directory to sys.path if not already there
# Use absolute path calculation to be robust regardless of current working directory
routes_dir = os.path.dirname(os.path.abspath(__file__))
web_dir = os.path.dirname(routes_dir)
utils_dir = os.path.join(web_dir, 'utils')

# Ensure the utils directory exists before adding to path
if os.path.exists(utils_dir) and utils_dir not in sys.path:
    sys.path.insert(0, utils_dir)

# Import directly from the module file
from controllerConfigFactory import (
    create_controller_configs_from_device_info,
    get_device_capabilities_from_model,
    get_controller_types_from_model
)
print("[@system_routes] Successfully imported controllerConfigFactory")

system_bp = Blueprint('system', __name__)

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

@system_bp.route('/api/system/logs', methods=['GET'])
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

@system_bp.route('/api/system/logs/clear', methods=['POST'])
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

@system_bp.route('/api/system/register', methods=['POST'])
def register_client():
    """Host registers with server"""
    try:
        host_info = request.get_json()
        
        # Debug: Log the incoming request
        print(f"🔍 [SERVER] Host registration request received:")
        print(f"   Content-Type: {request.content_type}")
        print(f"   Raw data: {request.get_data()}")
        print(f"   Parsed JSON: {host_info}")
        
        # Validate that we received JSON data
        if host_info is None:
            error_msg = "No JSON data received in request body"
            print(f"❌ [SERVER] Registration failed: {error_msg}")
            return jsonify({'error': error_msg}), 400
        
        # Handle backward compatibility - map old client_* fields to host_* fields
        if 'client_id' in host_info and 'host_id' not in host_info:
            host_info['host_id'] = host_info['client_id']
        if 'name' in host_info and 'host_name' not in host_info:
            host_info['host_name'] = host_info['name']
        if 'local_ip' in host_info and 'host_ip' not in host_info:
            host_info['host_ip'] = host_info['local_ip']
        if 'client_port' in host_info and 'host_port' not in host_info:
            host_info['host_port'] = host_info['client_port']
        
        # Validate required fields with coherent naming
        required_fields = ['host_id', 'host_ip', 'host_port', 'device_model', 'host_name']
        missing_fields = []
        
        for field in required_fields:
            if field not in host_info:
                missing_fields.append(field)
        
        if missing_fields:
            error_msg = f'Missing required fields: {", ".join(missing_fields)}'
            print(f"❌ [SERVER] Registration failed: {error_msg}")
            print(f"   Required fields: {required_fields}")
            print(f"   Received fields: {list(host_info.keys()) if host_info else 'None'}")
            return jsonify({'error': error_msg}), 400
        
        # Validate field values
        validation_errors = []
        
        if not host_info.get('host_id'):
            validation_errors.append('host_id cannot be empty')
        
        if not host_info.get('host_ip'):
            validation_errors.append('host_ip cannot be empty')
        
        if not host_info.get('host_port'):
            validation_errors.append('host_port cannot be empty')
        
        if not host_info.get('device_model'):
            validation_errors.append('device_model cannot be empty')
        
        if not host_info.get('host_name'):
            validation_errors.append('host_name cannot be empty')
        
        if validation_errors:
            error_msg = f'Validation errors: {"; ".join(validation_errors)}'
            print(f"❌ [SERVER] Registration failed: {error_msg}")
            return jsonify({'error': error_msg}), 400
        
        # Generate device_id and set device defaults if not provided
        # Use device information from host if provided, otherwise generate defaults
        device_id = host_info.get('device_id')
        if not device_id:
            # Generate device_id if not provided by host (backward compatibility)
            device_id = f"{host_info['host_id']}_device_{host_info['device_model']}"
        
        device_name = host_info.get('device_name')
        if not device_name:
            # Generate device_name if not provided by host (backward compatibility)
            device_name = f"{host_info['device_model'].replace('_', ' ').title()}"
        
        device_ip = host_info.get('device_ip', host_info['host_ip'])  # Default to host IP
        device_port = host_info.get('device_port', '5555')  # Default ADB port
        
        print(f"[@route:register_client] Device information:")
        print(f"   Device ID: {device_id} ({'from host' if host_info.get('device_id') else 'generated'})")
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
            host_port=host_info['host_port']
        )
        
        # Get capabilities and controller types from factory
        capabilities = get_device_capabilities_from_model(host_info['device_model'])
        controller_types = get_controller_types_from_model(host_info['device_model'])
        
        print(f"[@route:register_client] Factory built:")
        print(f"   Controller configs: {list(controller_configs.keys()) if controller_configs else 'None'}")
        print(f"   Capabilities: {capabilities}")
        print(f"   Controller types: {controller_types}")
        
        # Instantiate actual controller objects from configs
        print(f"[@route:register_client] Instantiating controller objects...")
        controller_objects = {}
        
        try:
            from controllers import ControllerFactory
            
            # Instantiate AV controller
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
                    host_port=av_params.get('host_port')
                )
                controller_objects['av'] = av_controller
                print(f"[@route:register_client] AV controller created successfully")
            
            # Instantiate Remote controller
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
            
            # Instantiate Verification controller
            if 'verification' in controller_configs:
                verification_config = controller_configs['verification']
                verification_params = verification_config['parameters']
                
                print(f"[@route:register_client] Creating Verification controller: {verification_config['implementation']}")
                
                # For ADB verification, construct device_id from device_ip and device_port
                if verification_config['implementation'] == 'adb':
                    device_id = f"{verification_params.get('device_ip')}:{verification_params.get('device_port')}"
                    verification_controller = ControllerFactory.create_verification_controller(
                        verification_type=verification_config['implementation'],
                        device_name=device_name,
                        device_id=device_id,
                        connection_timeout=verification_params.get('connection_timeout', 10)
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
            
            # Instantiate Power controller
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
            print(f"[@route:register_client] Warning: Failed to instantiate some controllers: {e}")
            # Continue with configs only if controller instantiation fails
            controller_objects = {}
        
        # Create a single, clean host+device object with no redundancy
        host_device_object = {
            # === HOST INFORMATION ===
            'host_id': host_info['host_id'],
            'host_name': host_info['host_name'],
            'host_ip': host_info['host_ip'],
            'host_port': host_info['host_port'],
            'protocol': host_info.get('protocol', 'https'),
            'internal_port': host_info.get('internal_port', host_info['host_port']),
            'https_port': host_info.get('https_port', '444'),
            'nginx_port': host_info.get('nginx_port', '444'),
            'status': 'online',
            
            # === DEVICE INFORMATION ===
            'device_id': device_id,
            'device_name': device_name,
            'device_model': host_info['device_model'],
            'device_ip': device_ip,
            'device_port': device_port,
            
            # === CONTROLLER INFORMATION ===
            'controller_configs': controller_configs,  # Complete configs from factory (JSON serializable)
            'controller_objects': controller_objects,  # Actual instantiated controller objects (for internal use)
            'controller_types': controller_types,      # Factory-built controller types
            'capabilities': capabilities,              # Factory-built capabilities
            
            # === CONNECTION INFORMATION ===
            'connection': {
                'flask_url': f"http://{host_info['host_ip']}:{host_info['host_port']}",
                'nginx_url': f"https://{host_info['host_ip']}:444"
            },
            
            # === METADATA ===
            'description': f"Device: {device_name} controlled by host: {host_info['host_name']}",
            'registered_at': datetime.now().isoformat(),
            'last_seen': time.time(),
            'system_stats': host_info.get('system_stats', get_system_stats())
        }
        
        # Store controller objects separately in the app context (not in JSON response)
        # This allows us to access them later without serialization issues
        if controller_objects:
            # Store controller objects in a separate registry that won't be serialized
            if not hasattr(current_app, '_controller_registry'):
                current_app._controller_registry = {}
            current_app._controller_registry[host_info['host_id']] = controller_objects
            print(f"[@route:register_client] Stored {len(controller_objects)} controller objects in registry")
        
        # Store host info
        connected_clients = get_connected_clients()
        
        # Check if host is already registered (by host_id, host_name, or IP combination)
        existing_host_id = None
        for existing_id, existing_info in connected_clients.items():
            # Check for exact host_id match (reconnection with same ID)
            if existing_id == host_device_object['host_id']:
                existing_host_id = existing_id
                break
            # Check for same host reconnecting (same host_name + IP + device_model)
            elif (existing_info.get('host_name') == host_device_object['host_name'] and 
                  existing_info.get('host_ip') == host_device_object['host_ip'] and
                  existing_info.get('device_model') == host_device_object['device_model']):
                existing_host_id = existing_id
                break
        
        if existing_host_id:
            # Update existing host instead of creating duplicate
            print(f"🔄 [SERVER] Updating existing host registration:")
            print(f"   Existing ID: {existing_host_id[:8]}...")
            print(f"   New ID: {host_device_object['host_id'][:8]}...")
            print(f"   Host Name: {host_device_object['host_name']}")
            print(f"   Device: {host_device_object['device_name']} ({host_device_object['device_model']})")
            
            # Keep the original registration time but update all other info
            original_registered_at = connected_clients[existing_host_id].get('registered_at')
            host_device_object['registered_at'] = original_registered_at  # Keep original registration time
            host_device_object['reconnected_at'] = datetime.now().isoformat()  # Add reconnection time
            
            # If host_id changed, remove old entry and add with new ID
            if existing_host_id != host_device_object['host_id']:
                del connected_clients[existing_host_id]
                # Stop old health check thread
                health_check_threads = get_health_check_threads()
                if existing_host_id in health_check_threads:
                    del health_check_threads[existing_host_id]
                    set_health_check_threads(health_check_threads)
            
            connected_clients[host_device_object['host_id']] = host_device_object
            set_connected_clients(connected_clients)
            
            print(f"✅ [SERVER] Host registration updated successfully")
        else:
            # New host registration
            connected_clients[host_device_object['host_id']] = host_device_object
            set_connected_clients(connected_clients)
            
            print(f"✅ [SERVER] New host registered successfully:")
            print(f"   Host Name: {host_device_object['host_name']}")
            print(f"   Host Address: {host_device_object['host_ip']}:{host_device_object['host_port']}")
            print(f"   Device: {host_device_object['device_name']} ({host_device_object['device_model']})")
            print(f"   Device Address: {host_device_object['device_ip']}:{host_device_object['device_port']}")
            print(f"   Host ID: {host_device_object['host_id'][:8]}...")
            print(f"   Device ID: {host_device_object['device_id']}")
        
        # Create a JSON-safe version for the response (exclude controller_objects)
        json_safe_host_device = {k: v for k, v in host_device_object.items() if k != 'controller_objects'}
        
        return jsonify({
            'status': 'success',
            'message': 'Host registered successfully',
            'host_id': host_device_object['host_id'],
            'device_id': host_device_object['device_id'],
            'host_device': json_safe_host_device
        }), 200
        
    except Exception as e:
        error_msg = f"Server error during registration: {str(e)}"
        print(f"❌ [SERVER] {error_msg}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': error_msg}), 500

@system_bp.route('/api/system/unregister', methods=['POST'])
def unregister_client():
    """Client unregisters from server"""
    try:
        data = request.get_json()
        client_id = data.get('client_id')
        
        if not client_id:
            return jsonify({'error': 'Missing client_id'}), 400
        
        # Remove client
        connected_clients = get_connected_clients()
        if client_id in connected_clients:
            client_info = connected_clients[client_id]
            del connected_clients[client_id]
            set_connected_clients(connected_clients)
            
            # Stop health check thread
            health_check_threads = get_health_check_threads()
            if client_id in health_check_threads:
                # Thread will stop automatically when client is removed
                del health_check_threads[client_id]
                set_health_check_threads(health_check_threads)
            
            print(f"🔌 Client unregistered: {client_info.get('name', client_id)}")
            
            return jsonify({
                'status': 'success',
                'message': 'Client unregistered successfully'
            }), 200
        else:
            return jsonify({'error': 'Client not found'}), 404
            
    except Exception as e:
        print(f"❌ Error unregistering client: {e}")
        return jsonify({'error': str(e)}), 500

@system_bp.route('/api/system/health', methods=['GET'])
def health_check():
    """Health check endpoint for clients"""
    system_stats = get_system_stats()
    
    return jsonify({
        'status': 'healthy',
        'timestamp': time.time(),
        'mode': os.getenv('SERVER_MODE', 'server'),
        'system_stats': system_stats
    }), 200

@system_bp.route('/api/system/health-with-devices', methods=['GET'])
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

@system_bp.route('/api/system/clients', methods=['GET'])
def list_clients():
    """Server lists all connected clients"""
    try:
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
        
        # Return current clients
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
        
        return jsonify({
            'status': 'success',
            'clients': clients_list,
            'total_clients': len(clients_list)
        }), 200
        
    except Exception as e:
        print(f"❌ Error listing clients: {e}")
        return jsonify({'error': str(e)}), 500

@system_bp.route('/api/system/clients/devices', methods=['GET'])
def list_clients_as_devices():
    """Return registered devices with host references for NavigationEditor"""
    try:
        connected_clients = get_connected_clients()
        
        # Clean up stale hosts (not seen for more than 2 minutes)
        current_time = time.time()
        stale_hosts = []
        
        for host_id, host_info in connected_clients.items():
            if current_time - host_info.get('last_seen', 0) > 120:  # 2 minutes
                stale_hosts.append(host_id)
        
        # Remove stale hosts
        for host_id in stale_hosts:
            remove_client(host_id)
        
        # Convert hosts to device-compatible format with host references
        devices = []
        for host_id, host_info in connected_clients.items():
            if host_info.get('status') == 'online':
                # Use the single object structure directly - no more nested device object
                devices.append({
                    # Device information (from single object)
                    'id': host_info.get('device_id'),  # Keep 'id' for NavigationEditor compatibility
                    'device_id': host_info.get('device_id'),
                    'name': host_info.get('device_name'),  # Keep 'name' for NavigationEditor compatibility
                    'device_name': host_info.get('device_name'),
                    'model': host_info.get('device_model'),  # Keep 'model' for NavigationEditor compatibility
                    'device_model': host_info.get('device_model'),
                    'device_ip': host_info.get('device_ip'),
                    'device_port': host_info.get('device_port'),
                    'controller_configs': host_info.get('controller_configs', {}),
                    'description': host_info.get('description'),
                    
                    # Host reference information (from single object)
                    'host_id': host_info.get('host_id'),
                    'host_name': host_info.get('host_name'),
                    'host_ip': host_info.get('host_ip'),
                    'host_port': host_info.get('host_port'),
                    'connection': host_info.get('connection', {}),
                    'host_connection': host_info.get('connection', {}),  # Alias for backward compatibility
                    
                    # Status and metadata (from single object)
                    'status': host_info.get('status'),
                    'last_seen': host_info.get('last_seen'),
                    'registered_at': host_info.get('registered_at'),
                    'capabilities': host_info.get('capabilities', []),
                    'system_stats': host_info.get('system_stats', {})
                })
        
        print(f"📱 [DEVICES] Returning {len(devices)} online devices from registered hosts")
        for device in devices:
            print(f"   Device: {device['device_name']} ({device['device_model']}) on host: {device['host_name']}")
        
        return jsonify({
            'success': True,
            'devices': devices,
            'total_devices': len(devices)
        }), 200
        
    except Exception as e:
        print(f"❌ [DEVICES] Error listing devices: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@system_bp.route('/api/system/device/<device_id>', methods=['GET'])
def get_device_by_id(device_id):
    """Get device information with host details by device_id"""
    try:
        connected_clients = get_connected_clients()
        
        # Find device by device_id across all hosts
        for host_id, host_info in connected_clients.items():
            if host_info.get('status') == 'online':
                # Check if this host has the requested device
                device_info = host_info.get('device', {})
                if device_info and device_info.get('device_id') == device_id:
                    # Extract host connection info
                    host_ip = host_info.get('host_ip') or host_info.get('local_ip')
                    host_port = host_info.get('host_port') or host_info.get('client_port')
                    host_name = host_info.get('host_name') or host_info.get('name')
                    
                    return jsonify({
                        'success': True,
                        'device': {
                            # Device information
                            'device_id': device_info.get('device_id'),
                            'device_name': device_info.get('device_name'),
                            'device_model': device_info.get('device_model'),
                            'device_ip': device_info.get('device_ip'),
                            'device_port': device_info.get('device_port'),
                            'controller_configs': device_info.get('controller_configs', {}),
                            
                            # Host information
                            'host_id': host_id,
                            'host_name': host_name,
                            'host_ip': host_ip,
                            'host_port': host_port,
                            'host_connection': {
                                'flask_url': f"http://{host_ip}:{host_port}",
                                'nginx_url': f"https://{host_ip}:444"
                            },
                            'capabilities': host_info.get('capabilities', [])
                        }
                    }), 200
                
                # Also check backward compatibility format
                elif not device_info and host_info.get('device_model'):
                    # Generate device_id for backward compatibility
                    compat_device_id = f"{host_id}_device_{host_info.get('device_model')}"
                    if compat_device_id == device_id:
                        host_ip = host_info.get('host_ip') or host_info.get('local_ip')
                        host_port = host_info.get('host_port') or host_info.get('client_port')
                        host_name = host_info.get('host_name') or host_info.get('name')
                        device_model = host_info.get('device_model')
                        
                        return jsonify({
                            'success': True,
                            'device': {
                                # Device information (backward compatibility)
                                'device_id': compat_device_id,
                                'device_name': f"{device_model.replace('_', ' ').title()}",
                                'device_model': device_model,
                                'device_ip': host_ip,
                                'device_port': '5555',
                                'controller_configs': {},
                                
                                # Host information
                                'host_id': host_id,
                                'host_name': host_name,
                                'host_ip': host_ip,
                                'host_port': host_port,
                                'host_connection': {
                                    'flask_url': f"http://{host_ip}:{host_port}",
                                    'nginx_url': f"https://{host_ip}:444"
                                },
                                'capabilities': host_info.get('capabilities', [])
                            }
                        }), 200
        
        return jsonify({
            'success': False,
            'error': f'No device found with device_id: {device_id}'
        }), 404
        
    except Exception as e:
        print(f"❌ Error finding device: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@system_bp.route('/api/system/client/<device_model>', methods=['GET'])
def get_client_by_device_model(device_model):
    """Get available host for specific device model (backward compatibility)"""
    try:
        connected_clients = get_connected_clients()
        
        # Find host with matching device model
        for host_id, host_info in connected_clients.items():
            if host_info.get('status') == 'online':
                # Check new structured format first
                device_info = host_info.get('device', {})
                if device_info and device_info.get('device_model') == device_model:
                    host_ip = host_info.get('host_ip') or host_info.get('local_ip')
                    host_port = host_info.get('host_port') or host_info.get('client_port')
                    host_name = host_info.get('host_name') or host_info.get('name')
                    
                    return jsonify({
                        'status': 'success',
                        'client': {
                            'client_id': host_id,  # Backward compatibility
                            'host_id': host_id,
                            'name': host_name,
                            'local_ip': host_ip,  # Backward compatibility
                            'host_ip': host_ip,
                            'client_port': host_port,  # Backward compatibility
                            'host_port': host_port,
                            'capabilities': host_info.get('capabilities', []),
                            'device': device_info
                        }
                    }), 200
                
                # Check backward compatibility format
                elif host_info.get('device_model') == device_model:
                    host_ip = host_info.get('host_ip') or host_info.get('local_ip')
                    host_port = host_info.get('host_port') or host_info.get('client_port')
                    host_name = host_info.get('host_name') or host_info.get('name')
                    
                    return jsonify({
                        'status': 'success',
                        'client': {
                            'client_id': host_id,  # Backward compatibility
                            'host_id': host_id,
                            'name': host_name,
                            'local_ip': host_ip,  # Backward compatibility
                            'host_ip': host_ip,
                            'client_port': host_port,  # Backward compatibility
                            'host_port': host_port,
                            'capabilities': host_info.get('capabilities', [])
                        }
                    }), 200
        
        return jsonify({
            'status': 'error',
            'message': f'No available host found for device model: {device_model}'
        }), 404
        
    except Exception as e:
        print(f"❌ Error finding host: {e}")
        return jsonify({'error': str(e)}), 500

@system_bp.route('/api/system/ping', methods=['POST'])
def client_ping():
    """Client sends periodic health ping to server"""
    try:
        ping_data = request.get_json()
        
        if not ping_data:
            return jsonify({'error': 'No ping data received'}), 400
        
        client_id = ping_data.get('client_id')
        if not client_id:
            return jsonify({'error': 'Missing client_id in ping'}), 400
        
        connected_clients = get_connected_clients()
        
        # Check if client is registered
        if client_id not in connected_clients:
            # Client not registered, ask them to register
            print(f"📍 [PING] Unknown client {client_id[:8]}... sending registration request")
            return jsonify({
                'status': 'not_registered',
                'message': 'Client not registered, please register first',
                'action': 'register'
            }), 404
        
        # Update client information
        current_time = time.time()
        connected_clients[client_id]['last_seen'] = current_time
        connected_clients[client_id]['status'] = 'online'
        
        # Update system stats if provided
        if 'system_stats' in ping_data:
            connected_clients[client_id]['system_stats'] = ping_data['system_stats']
        
        # Update any other provided fields
        for field in ['local_ip', 'client_port', 'capabilities']:
            if field in ping_data:
                connected_clients[client_id][field] = ping_data[field]
        
        set_connected_clients(connected_clients)
        
        print(f"💓 [PING] Client {client_id[:8]}... ping received - status updated")
        
        return jsonify({
            'status': 'success',
            'message': 'Ping received successfully',
            'server_time': current_time
        }), 200
        
    except Exception as e:
        print(f"❌ [PING] Error processing client ping: {e}")
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
                        response = requests.get(f"http://{client_ip}:{client_port}/api/system/health", timeout=5)
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

def get_controller_objects(host_id):
    """Get controller objects for a specific host"""
    if not hasattr(current_app, '_controller_registry'):
        return {}
    return current_app._controller_registry.get(host_id, {})

def set_controller_objects(host_id, controller_objects):
    """Set controller objects for a specific host"""
    if not hasattr(current_app, '_controller_registry'):
        current_app._controller_registry = {}
    current_app._controller_registry[host_id] = controller_objects 
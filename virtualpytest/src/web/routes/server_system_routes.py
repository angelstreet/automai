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

from src.utils.host_utils import get_host_manager

system_bp = Blueprint('system', __name__, url_prefix='/server/system')

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
        print(f"   Devices: {len(host_info.get('devices', []))} device(s)")
        
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
            device_name = device.get('device_name')
            device_model = device.get('device_model') 
            device_capabilities = device.get('device_capabilities', {})  # Use host-sent detailed capabilities
            
            print(f"[@route:register_host] Processing device: {device_name} ({device_model})")
            print(f"[@route:register_host] Host-sent capabilities: {device_capabilities}")
            
            # Extract capability types for backward compatibility
            capability_list = []
            controller_types = []
            
            if device_capabilities.get('av'):
                capability_list.append('av')
                controller_types.append(f"av_{device_capabilities['av']}")
            
            if device_capabilities.get('remote'):
                capability_list.append('remote')
                controller_types.append(f"remote_{device_capabilities['remote']}")
            
            if device_capabilities.get('verification'):
                capability_list.extend(device_capabilities['verification'])
                for verification_type in device_capabilities['verification']:
                    controller_types.append(f"verification_{verification_type}")
            
            print(f"[@route:register_host] Processed capability list: {capability_list}")
            print(f"[@route:register_host] Controller types: {controller_types}")
            
            # Check for device-level verification and action types
            device_verification_types = device.get('available_verification_types', {})
            device_action_types = device.get('available_action_types', {})
            
            if device_verification_types:
                print(f"[@route:register_host] Device {device_name} has {len(device_verification_types)} verification controller types")
            if device_action_types:
                print(f"[@route:register_host] Device {device_name} has {len(device_action_types)} action categories")
            
            # Add device with processed info (keep the device data as sent by host)
            device_with_controllers = {
                'device_id': device.get('device_id'),
                'name': device_name,
                'model': device_model,
                'device_ip': device.get('device_ip'),
                'device_port': device.get('device_port'),
                'capabilities': device_capabilities,  # Detailed format: {av: 'hdmi_stream', remote: 'android_mobile', verification: ['image', 'text']}
                'capability_list': capability_list,   # Flat list for backward compatibility: ['av', 'remote', 'image', 'text']
                'controller_types': controller_types, # Implementation types: ['av_hdmi_stream', 'remote_android_mobile', 'verification_image', 'verification_text']
                'available_verification_types': device_verification_types,  # Device-level verification types
                'available_action_types': device_action_types  # Device-level action types
            }
            devices_with_controllers.append(device_with_controllers)
            
            # Collect all capabilities and controller types
            all_capabilities.update(capability_list)
            all_controller_types.update(controller_types)
        
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
            
            # === DEVICE LOCK MANAGEMENT ===
            'isLocked': False,
            'lockedBy': None,
            'lockedAt': None,
        }
        
        # Store host using the host manager
        host_manager = get_host_manager()
        success = host_manager.register_host(host_info['host_name'], host_object)
        
        if not success:
            error_msg = f"Failed to register host {host_info['host_name']}"
            print(f"❌ [SERVER] {error_msg}")
            return jsonify({'error': error_msg}), 500
        
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
        
        host_manager = get_host_manager()
        success = host_manager.unregister_host(host_name)
        
        if success:
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
        host_manager = get_host_manager()
        
        # Clean up stale hosts (not seen for more than 2 minutes)
        cleaned_count = host_manager.cleanup_stale_hosts(120)
        if cleaned_count > 0:
            print(f"⚠️ [HOSTS] Cleaned up {cleaned_count} stale hosts")
        
        # Get all hosts from manager
        all_hosts = host_manager.get_all_hosts()
        
        # Verify required fields are present
        valid_hosts = []
        required_fields = ['host_name', 'host_url']
        
        for host_info in all_hosts:
            # Check required fields
            is_valid = True
            for field in required_fields:
                if field not in host_info or not host_info[field]:
                    print(f"⚠️ [HOSTS] Host {host_info.get('host_name', 'unknown')} missing required field: {field}")
                    is_valid = False
                    break
            
            if is_valid:
                valid_hosts.append(host_info)
        
        print(f"🖥️ [HOSTS] Returning {len(valid_hosts)} valid hosts")
        for host in valid_hosts:
            device_count = host.get('device_count', 0)
            print(f"   Host: {host['host_name']} ({host['host_url']}) - {device_count} device(s)")
        
        return jsonify({
            'success': True,
            'hosts': valid_hosts
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
        
        host_manager = get_host_manager()
        
        # Check if host is registered
        host_data = host_manager.get_host(host_name)
        if not host_data:
            # Host not registered, ask them to register
            print(f"📍 [PING] Unknown host {host_name} sending registration request")
            return jsonify({
                'status': 'not_registered',
                'message': 'Host not registered, please register first',
                'action': 'register'
            }), 404
        
        # Update host information using the manager
        success = host_manager.update_host_ping(host_name, ping_data)
        
        if not success:
            return jsonify({'error': 'Failed to update host ping'}), 500
        
        print(f"💓 [PING] Host {host_name} ping received - status updated")
        
        return jsonify({
            'status': 'success',
            'message': 'Ping received successfully',
            'server_time': time.time()
        }), 200
        
    except Exception as e:
        print(f"❌ [PING] Error processing host ping: {e}")
        return jsonify({'error': str(e)}), 500

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
        
        # Get host from host manager
        host_manager = get_host_manager()
        host_data = host_manager.get_host(host_name)
        if not host_data:
            print(f"[@route:server_system_routes:get_available_actions] Host {host_name} not found in host manager")
            return jsonify({'success': False, 'error': f'Host {host_name} not found'}), 404
        
        # Get available actions from all devices in the host
        all_actions = {}
        devices = host_data.get('devices', [])
        
        for device in devices:
            device_action_types = device.get('available_action_types', {})
            device_name = device.get('name', device.get('device_id', 'unknown'))
            
            print(f"[@route:server_system_routes:get_available_actions] Device {device_name} has {len(device_action_types)} action categories")
            
            # Merge device actions into all_actions
            for category, actions_list in device_action_types.items():
                if category not in all_actions:
                    all_actions[category] = []
                if isinstance(actions_list, list):
                    all_actions[category].extend(actions_list)
        
        if not all_actions:
            print(f"[@route:server_system_routes:get_available_actions] No actions available for host {host_name}")
            return jsonify({'success': True, 'actions': []})
        
        # Transform actions to the expected format for the frontend
        transformed_actions = []
        
        for category, actions_list in all_actions.items():
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


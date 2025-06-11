"""
Server Control Routes

This module contains server-side control endpoints that:
- Handle device locking and unlocking on server side
- Coordinate with hosts for device control operations
- Forward requests to appropriate hosts
- Manage device registry and host discovery
- Provide controller type information
"""

from flask import Blueprint, request, jsonify
import requests
import urllib.parse

from src.utils.app_utils import get_host_by_model, buildHostUrl, get_team_id, get_host_registry
from src.utils.device_lock_manager_utils import (
    lock_device_in_registry,
    unlock_device_in_registry,
    is_device_locked_in_registry,
    get_device_lock_info,
    cleanup_expired_locks
)

# Create blueprint
control_bp = Blueprint('server_control', __name__, url_prefix='/server/control')

# Helper functions
def get_controller_metadata():
    """Get enhanced controller metadata"""
    return {
        'remote': [
            {'id': 'android_tv', 'name': 'Android TV Remote', 'description': 'ADB Android TV controller', 'status': 'available'},
            {'id': 'android_mobile', 'name': 'Android Mobile Remote', 'description': 'ADB Android Mobile controller', 'status': 'available'},
            {'id': 'ir_remote', 'name': 'IR Remote', 'description': 'Infrared remote controller', 'status': 'available'},
            {'id': 'bluetooth_remote', 'name': 'Bluetooth Remote', 'description': 'Bluetooth HID remote controller', 'status': 'available'},
        ],
        'av': [
            {'id': 'hdmi_stream', 'name': 'HDMI Stream', 'description': 'HDMI stream URL capture', 'status': 'available'},
        ],
        'network': [
            {'id': 'network', 'name': 'Network Stream', 'description': 'Network-based audio/video streaming', 'status': 'placeholder'},
            {'id': 'rtsp', 'name': 'RTSP Stream', 'description': 'Real-Time Streaming Protocol capture', 'status': 'placeholder'},
            {'id': 'http_stream', 'name': 'HTTP Stream', 'description': 'HTTP-based video streaming', 'status': 'placeholder'},
            {'id': 'webrtc', 'name': 'WebRTC', 'description': 'Web Real-Time Communication', 'status': 'placeholder'},
        ],
        'verification': [
            {'id': 'ocr', 'name': 'Text Verification', 'description': 'Text matching verification', 'status': 'available'},
            {'id': 'image', 'name': 'Image Verification', 'description': 'Image matching verification', 'status': 'available'},
            {'id': 'adb', 'name': 'ADB Verification', 'description': 'Direct ADB element verification via SSH', 'status': 'available'},
            {'id': 'audio', 'name': 'Audio Verification', 'description': 'Audio content verification', 'status': 'placeholder'},
            {'id': 'video', 'name': 'Video Verification', 'description': 'Video content verification', 'status': 'placeholder'},
            {'id': 'ai', 'name': 'AI Verification', 'description': 'AI-based verification', 'status': 'placeholder'},
        ],
        'power': [
            {'id': 'usb', 'name': 'USB Power Control', 'description': 'USB hub power control via SSH + uhubctl', 'status': 'available'},
        ]
    }

# =====================================================
# CONTROLLER INFORMATION ENDPOINTS
# =====================================================

@control_bp.route('/getAllControllers', methods=['GET'])
def getAllControllers():
    """Get all available controller types from the system"""
    try:
        from controllers import ControllerFactory
        
        # Get available controllers from factory
        available_controllers = ControllerFactory.list_available_controllers()
        
        # Get enhanced controller information
        enhanced_controllers = get_controller_metadata()
        
        return jsonify({
            'controller_types': enhanced_controllers,
            'total_types': sum(len(impls) for impls in available_controllers.values())
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# =====================================================
# SERVER-SIDE DEVICE CONTROL ENDPOINTS
# =====================================================

@control_bp.route('/take-control', methods=['POST'])
def take_control():
    """Server-side take control - Coordinate device locking and host discovery"""
    try:
        data = request.get_json() or {}
        device_id = data.get('device_id')
        session_id = data.get('session_id', 'default-session')
        
        print(f"[@route:server_take_control] Take control requested for device: {device_id}")
        print(f"[@route:server_take_control] Session ID: {session_id}")
        
        if not device_id:
            return jsonify({
                'success': False,
                'error': 'Missing device_id'
            }), 400
        
        # Lock the device using device_lock_manager_utils
        try:
            # Try to acquire lock for the device
            lock_acquired = lock_device_in_registry(device_id, session_id)
            
            if not lock_acquired:
                # Get lock info to see who owns it
                lock_info = get_device_lock_info(device_id)
                current_owner = lock_info.get('lockedBy', 'unknown') if lock_info else 'unknown'
                return jsonify({
                    'success': False,
                    'error': f'Device {device_id} is already locked by session: {current_owner}',
                    'device_locked': True,
                    'locked_by': current_owner
                }), 409
            
            print(f"[@route:server_take_control] Successfully locked device {device_id} for session {session_id}")
            
        except Exception as e:
            print(f"[@route:server_take_control] Error acquiring device lock: {e}")
            return jsonify({
                'success': False,
                'error': f'Failed to lock device: {str(e)}'
            }), 500
        
        # Get connected clients to find the host for this device
        try:
            connected_clients = get_host_registry()
            
            # Find host that owns this device
            host_info = None
            for host_id, host_data in connected_clients.items():
                if host_data.get('device_id') == device_id and host_data.get('status') == 'online':
                    host_info = host_data
                    break
            
            if not host_info:
                unlock_device_in_registry(device_id, session_id)
                return jsonify({
                    'success': False,
                    'error': f'No online host found for device: {device_id}'
                }), 404
            
            print(f"[@route:server_take_control] Found host: {host_info.get('host_name')} at {host_info.get('host_ip')}:{host_info.get('host_port')}")
            
        except Exception as e:
            unlock_device_in_registry(device_id, session_id)
            print(f"[@route:server_take_control] Error finding host: {e}")
            return jsonify({
                'success': False,
                'error': f'Failed to find host for device: {str(e)}'
            }), 500
        
        # Forward request to host using proper URL building
        try:
            host_payload = {
                'device_id': device_id,
                'session_id': session_id
            }
            
            print(f"[@route:server_take_control] Forwarding to host using proper URL building")
            print(f"[@route:server_take_control] Payload: {host_payload}")
            
            # Use proper URL building function from utils
            host_url = buildHostUrl(host_info, "/host/take-control")
            
            print(f"[@route:server_take_control] Built URL using build_host_url: {host_url}")
            
            # Make request using the properly built URL
            host_response = requests.post(
                host_url, 
                json=host_payload, 
                timeout=30, 
                verify=False
            )
            
            if host_response.status_code == 200:
                host_data = host_response.json()
                print(f"[@route:server_take_control] Host response: {host_data}")
                
                if host_data.get('success'):
                    # Return the device info from our registry
                    device_response = {
                        'id': host_info.get('device_id'),
                        'device_id': host_info.get('device_id'),
                        'name': host_info.get('device_name'),
                        'device_name': host_info.get('device_name'),
                        'model': host_info.get('device_model'),
                        'device_model': host_info.get('device_model'),
                        'device_ip': host_info.get('device_ip'),
                        'device_port': host_info.get('device_port'),
                        'host_id': host_info.get('host_id'),
                        'host_name': host_info.get('host_name'),
                        'host_ip': host_info.get('host_ip'),
                        'host_port': host_info.get('host_port'),
                        'capabilities': host_info.get('capabilities', [])
                    }
                    
                    return jsonify({
                        'success': True,
                        'message': 'Control taken successfully',
                        'device': device_response
                    }), 200
                else:
                    # Host failed - pass through specific error details
                    unlock_device_in_registry(device_id, session_id)
                    
                    # Determine appropriate HTTP status code based on error type
                    error_type = host_data.get('error_type', 'unknown')
                    status_code = 500  # Default to 500 for unknown errors
                    
                    if error_type in ['stream_service_error', 'adb_connection_error']:
                        status_code = 422  # Unprocessable Entity - service/connection issue
                    elif error_type in ['configuration_error']:
                        status_code = 503  # Service Unavailable - configuration issue
                    elif error_type in ['av_controller_exception', 'remote_controller_exception']:
                        status_code = 500  # Internal Server Error - controller exception
                    
                    return jsonify({
                        'success': False,
                        'error': host_data.get('error', 'Host failed to take control'),
                        'error_type': error_type,
                        'status': host_data.get('status', 'host_error'),
                        'host_details': {
                            'av_status': host_data.get('av_status'),
                            'remote_status': host_data.get('remote_status'),
                            'service_details': host_data.get('service_details'),
                            'adb_details': host_data.get('adb_details')
                        }
                    }), status_code
            else:
                # Host request failed, release the device lock
                unlock_device_in_registry(device_id, session_id)
                return jsonify({
                    'success': False,
                    'error': f'Host request failed: {host_response.status_code} {host_response.text}',
                    'error_type': 'host_communication_error'
                }), 500
                
        except Exception as e:
            # Host communication failed, release the device lock
            unlock_device_in_registry(device_id, session_id)
            print(f"[@route:server_take_control] Error calling host: {e}")
            return jsonify({
                'success': False,
                'error': f'Failed to communicate with host: {str(e)}'
            }), 500
        
    except Exception as e:
        print(f"[@route:server_take_control] Unexpected error: {e}")
        return jsonify({
            'success': False,
            'error': f'Unexpected error: {str(e)}'
        }), 500


@control_bp.route('/release-control', methods=['POST'])
def release_control():
    """Server-side release control - Unlock device and forward request to host"""
    try:
        data = request.get_json() or {}
        device_model = data.get('device_model')
        device_id = data.get('device_id')
        session_id = data.get('session_id', 'default-session')
        
        print(f"[@route:server_release_control] Releasing control")
        print(f"[@route:server_release_control] Device model: {device_model}")
        print(f"[@route:server_release_control] Device ID: {device_id}")
        print(f"[@route:server_release_control] Session ID: {session_id}")
        
        # Step 1: Find host if device_model provided
        host_info = None
        if device_model:
            host_info = get_host_by_model(device_model)
            if host_info and not device_id:
                device_id = host_info.get('client_id')
        
        # Step 2: Call host release control if we have host info
        host_release_success = True
        if host_info:
            try:
                print(f"[@route:server_release_control] Calling host release control")
                
                host_url = buildHostUrl(host_info, '/host/release-control')
                host_response = requests.post(
                    host_url,
                    json={
                        'device_model': device_model,
                        'session_id': session_id
                    },
                    timeout=30,
                    verify=False
                )
                
                if host_response.status_code == 200:
                    host_result = host_response.json()
                    host_release_success = host_result.get('success', False)
                    print(f"[@route:server_release_control] Host release result: {host_result}")
                else:
                    print(f"[@route:server_release_control] Host release failed: {host_response.status_code}")
                    host_release_success = False
                    
            except Exception as e:
                print(f"[@route:server_release_control] Host communication error: {str(e)}")
                host_release_success = False
        
        # Step 3: Unlock device if device_id provided
        device_unlock_success = True
        if device_id:
            device_unlock_success = unlock_device_in_registry(device_id, session_id)
            if device_unlock_success:
                print(f"[@route:server_release_control] Successfully unlocked device: {device_id}")
            else:
                print(f"[@route:server_release_control] Failed to unlock device: {device_id}")
        
        return jsonify({
            'success': host_release_success and device_unlock_success,
            'message': 'Control released',
            'device_unlocked': device_unlock_success if device_id else None,
            'host_released': host_release_success if host_info else None
        })
        
    except Exception as e:
        print(f"[@route:server_release_control] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Error releasing control: {str(e)}'
        }), 500


@control_bp.route('/navigate', methods=['POST'])
def navigate():
    """Server-side navigation - Forward navigation request to appropriate host"""
    try:
        data = request.get_json() or {}
        device_id = data.get('device_id')
        tree_id = data.get('tree_id')
        target_node_id = data.get('target_node_id')
        current_node_id = data.get('current_node_id')
        execute_flag = data.get('execute', True)
        
        print(f"[@route:server_navigate] Navigation request for device: {device_id}")
        print(f"[@route:server_navigate] Tree: {tree_id}, Target: {target_node_id}")
        
        if not device_id or not tree_id or not target_node_id:
            return jsonify({
                'success': False,
                'error': 'Missing required fields: device_id, tree_id, target_node_id'
            }), 400
        
        # Find host that controls this device
        connected_clients = get_host_registry()
        host_info = None
        
        for host_id, host_data in connected_clients.items():
            if host_data.get('status') == 'online' and host_data.get('device_id') == device_id:
                host_info = host_data
                break
        
        if not host_info:
            return jsonify({
                'success': False,
                'error': f'No online host found for device: {device_id}'
            }), 404
        
        # Forward request to host using proper URL building
        host_url = buildHostUrl(host_info, f"/host/navigation/execute/{tree_id}/{target_node_id}")
        
        payload = {
            'current_node_id': current_node_id,
            'execute': execute_flag
        }
        
        print(f"[@route:server_navigate] Forwarding to host: {host_url}")
        
        response = requests.post(host_url, json=payload, timeout=60)
        
        if response.status_code == 200:
            result = response.json()
            print(f"[@route:server_navigate] Host navigation completed: {result.get('success', False)}")
            return jsonify(result)
        else:
            error_msg = f"Host navigation failed: HTTP {response.status_code}"
            print(f"[@route:server_navigate] {error_msg}")
            return jsonify({
                'success': False,
                'error': error_msg
            }), response.status_code
            
    except Exception as e:
        print(f"[@route:server_navigate] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500 
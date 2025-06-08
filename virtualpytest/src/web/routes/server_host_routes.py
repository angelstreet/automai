"""
Server Host Routes

This module contains the unified take-control endpoints that:
- Handle device locking on server side
- Coordinate with hosts for controller status checking
- Provide single API endpoint for take control operations
"""

from flask import Blueprint, request, jsonify, current_app
import requests
import time

from .utils import get_host_by_model, build_host_url, make_host_request, get_team_id, get_connected_clients
from deviceLockManager import (
    lock_device_in_registry,
    unlock_device_in_registry,
    is_device_locked_in_registry,
    get_device_lock_info,
    cleanup_expired_locks
)

# Create blueprint
server_host_bp = Blueprint('server_host', __name__)

# =====================================================
# UNIFIED TAKE CONTROL ENDPOINTS
# =====================================================

@server_host_bp.route('/api/virtualpytest/take-control', methods=['POST'])
def server_take_control():
    """Server-side take control - lock device and call host"""
    try:
        data = request.get_json() or {}
        device_id = data.get('device_id')
        session_id = data.get('session_id', 'default-session')
        
        if not device_id:
            return jsonify({
                'success': False,
                'error': 'device_id is required'
            }), 400
        
        print(f"[@route:server_take_control] Take control requested for device: {device_id}")
        print(f"[@route:server_take_control] Session ID: {session_id}")
        
        # Get device information from registry instead of HTTP call
        try:
            connected_clients = get_connected_clients()
            
            # Find device by device_id across all hosts
            device_info = None
            host_info = None
            host_id = None  # Track the actual registry key for locking
            
            for registry_host_id, host_data in connected_clients.items():
                if host_data.get('status') == 'online':
                    # Check new structured format first
                    device_data = host_data.get('device', {})
                    if device_data and device_data.get('device_id') == device_id:
                        device_info = device_data
                        host_info = host_data
                        host_id = registry_host_id  # Use the registry key for locking
                        break
                    
                    # Check backward compatibility format
                    elif not device_data and host_data.get('device_model'):
                        compat_device_id = f"{registry_host_id}_device_{host_data.get('device_model')}"
                        if compat_device_id == device_id:
                            # Create device_info from backward compatibility format
                            device_info = {
                                'device_id': compat_device_id,
                                'device_name': f"{host_data.get('device_model', '').replace('_', ' ').title()}",
                                'device_model': host_data.get('device_model'),
                                'device_ip': host_data.get('host_ip') or host_data.get('local_ip'),
                                'device_port': '5555'
                            }
                            host_info = host_data
                            host_id = registry_host_id  # Use the registry key for locking
                            break
            
            if not device_info or not host_info or not host_id:
                return jsonify({
                    'success': False,
                    'error': f'Device not found in registry: {device_id}',
                    'host_available': False
                }), 404
            
            # Extract host connection info
            host_ip = host_info.get('host_ip') or host_info.get('local_ip')
            host_port = host_info.get('host_port') or host_info.get('client_port')
            host_name = host_info.get('host_name') or host_info.get('name')
            
            device_model = device_info.get('device_model')
            
            print(f"[@route:server_take_control] Found device: {device_info.get('device_name')} ({device_model})")
            print(f"[@route:server_take_control] Host: {host_name} at {host_ip}:{host_port}")
            print(f"[@route:server_take_control] Registry key for locking: {host_id}")
            
        except Exception as e:
            print(f"[@route:server_take_control] Error getting device from registry: {e}")
            return jsonify({
                'success': False,
                'error': f'Failed to get device information from registry: {str(e)}',
                'host_available': False
            }), 500
        
        # Lock the device using deviceLockManager
        try:
            from web.utils.deviceLockManager import lock_device_in_registry, unlock_device_in_registry, get_device_lock_info
            
            # Try to acquire lock for the HOST (using host_id as registry key)
            lock_acquired = lock_device_in_registry(host_id, session_id)
            
            if not lock_acquired:
                # Get lock info to see who owns it
                lock_info = get_device_lock_info(host_id)
                current_owner = lock_info.get('lockedBy', 'unknown') if lock_info else 'unknown'
                return jsonify({
                    'success': False,
                    'error': f'Device {device_id} is already locked by session: {current_owner}',
                    'device_locked': True,
                    'locked_by': current_owner,
                    'host_available': True
                }), 409
            
            print(f"[@route:server_take_control] Successfully locked host {host_id} for session {session_id}")
            
        except Exception as e:
            print(f"[@route:server_take_control] Error acquiring device lock: {e}")
            return jsonify({
                'success': False,
                'error': f'Failed to lock device: {str(e)}',
                'host_available': True
            }), 500
        
        # Call host to take control
        try:
            import requests
            
            host_url = f"https://{host_ip}:{host_port}/take-control"
            host_payload = {
                'device_id': device_id,
                'device_model': device_model,
                'device_ip': device_info.get('device_ip'),
                'device_port': device_info.get('device_port'),
                'session_id': session_id
            }
            
            print(f"[@route:server_take_control] Calling host at: {host_url}")
            print(f"[@route:server_take_control] Host payload: {host_payload}")
            
            host_response = requests.post(host_url, json=host_payload, timeout=30, verify=False)
            
            if host_response.ok:
                host_data = host_response.json()
                print(f"[@route:server_take_control] Host response: {host_data}")
                
                if host_data.get('success'):
                    # Use the single host_device_object directly (no more nested structures!)
                    # The registry now stores everything in one clean object
                    print(f"[@route:server_take_control] Using single object structure for {device_id}")
                    
                    # Create device response from the single object
                    device_response = {
                        # Device information
                        'id': host_info.get('device_id'),
                        'device_id': host_info.get('device_id'),
                        'name': host_info.get('device_name'),
                        'device_name': host_info.get('device_name'),
                        'model': host_info.get('device_model'),
                        'device_model': host_info.get('device_model'),
                        'device_ip': host_info.get('device_ip'),
                        'device_port': host_info.get('device_port'),
                        'controller_configs': host_info.get('controller_configs', {}),
                        'description': host_info.get('description'),
                        
                        # Host information
                        'host_id': host_info.get('host_id'),
                        'host_name': host_info.get('host_name'),
                        'host_ip': host_info.get('host_ip'),
                        'host_port': host_info.get('host_port'),
                        'connection': host_info.get('connection', {}),
                        'host_connection': host_info.get('connection', {}),
                        
                        # Status and metadata
                        'status': host_info.get('status'),
                        'capabilities': host_info.get('capabilities', [])
                    }
                    
                    return jsonify({
                        'success': True,
                        'message': 'Control taken successfully',
                        'device': device_response
                    }), 200
                else:
                    # Host failed, release the device lock
                    unlock_device_in_registry(host_id, session_id)
                    return jsonify({
                        'success': False,
                        'error': host_data.get('error', 'Host failed to take control'),
                        'device_locked': False,
                        'host_available': True,
                        'controller_errors': host_data.get('controller_errors', {})
                    }), 500
            else:
                # Host request failed, release the device lock
                unlock_device_in_registry(host_id, session_id)
                return jsonify({
                    'success': False,
                    'error': f'Host request failed: {host_response.status_code} {host_response.text}',
                    'device_locked': False,
                    'host_available': False
                }), 500
                
        except Exception as e:
            # Host communication failed, release the device lock
            unlock_device_in_registry(host_id, session_id)
            print(f"[@route:server_take_control] Error calling host: {e}")
            return jsonify({
                'success': False,
                'error': f'Failed to communicate with host: {str(e)}',
                'device_locked': False,
                'host_available': False
            }), 500
        
    except Exception as e:
        print(f"[@route:server_take_control] Unexpected error: {e}")
        return jsonify({
            'success': False,
            'error': f'Unexpected error: {str(e)}',
            'host_available': False
        }), 500


@server_host_bp.route('/api/virtualpytest/release-control', methods=['POST'])
def server_release_control():
    """Unified release control endpoint - handles unlocking + host controller release"""
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
                
                host_response = make_host_request(
                    '/release-control',
                    method='POST',
                    use_https=True,
                    json={
                        'device_model': device_model,
                        'session_id': session_id
                    },
                    timeout=30
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


@server_host_bp.route('/take-control', methods=['POST'])
def take_control():
    """Host-side take control - Use own stored host_device object"""
    try:
        data = request.get_json() or {}
        device_model = data.get('device_model', 'android_mobile')
        device_ip = data.get('device_ip')
        device_port = data.get('device_port', 5555)
        session_id = data.get('session_id', 'default-session')
        
        print(f"[@route:take_control] Checking controllers status using own stored host_device")
        print(f"[@route:take_control] Device model: {device_model}")
        print(f"[@route:take_control] Device IP: {device_ip}")
        print(f"[@route:take_control] Device port: {device_port}")
        print(f"[@route:take_control] Session ID: {session_id}")
        
        # ✅ GET OWN STORED HOST_DEVICE OBJECT (set during registration)
        host_device = getattr(current_app, 'my_host_device', None)
        
        if not host_device:
            return jsonify({
                'success': False,
                'status': 'host_device_not_initialized',
                'error': 'Host device object not initialized. Host may need to re-register.',
                'device_model': device_model,
                'session_id': session_id
            })
        
        print(f"[@route:take_control] Using own stored host_device: {host_device.get('host_name')} with device: {host_device.get('device_name')}")
        
        # Step 1: Check AV controller from own host_device
        try:
            av_controller = host_device.get('controller_objects', {}).get('av')
            
            if not av_controller:
                return jsonify({
                    'success': False,
                    'status': 'av_controller_not_found',
                    'error': 'No AV controller object found in own host_device',
                    'device_model': device_model,
                    'session_id': session_id,
                    'available_controllers': list(host_device.get('controller_objects', {}).keys())
                })
            
            print(f"[@route:take_control] Using own AV controller: {type(av_controller).__name__}")
            
            av_status = av_controller.get_status()
            print(f"[@route:take_control] AV controller status: {av_status}")
            
            if not av_status.get('is_streaming', False):
                return jsonify({
                    'success': False,
                    'status': 'stream_not_ready',
                    'error': av_status.get('message', 'Stream service is not active'),
                    'device_model': device_model,
                    'session_id': session_id,
                    'av_status': av_status,
                    'remote_status': 'not_checked'
                })
                
        except Exception as e:
            print(f"[@route:take_control] AV controller error: {e}")
            return jsonify({
                'success': False,
                'status': 'av_controller_error',
                'error': f'Failed to check AV controller: {str(e)}',
                'device_model': device_model,
                'session_id': session_id
            })
        
        # Step 2: Check Remote controller from own host_device for Android devices
        remote_status = {'adb_status': 'not_applicable'}
        
        if device_ip and device_model in ['android_mobile', 'android_tv']:
            try:
                remote_controller = host_device.get('controller_objects', {}).get('remote')
                
                if not remote_controller:
                    return jsonify({
                        'success': False,
                        'status': 'remote_controller_not_found',
                        'error': 'No remote controller object found in own host_device',
                        'device_model': device_model,
                        'session_id': session_id,
                        'av_status': av_status,
                        'available_controllers': list(host_device.get('controller_objects', {}).keys())
                    })
                
                print(f"[@route:take_control] Using own remote controller: {type(remote_controller).__name__}")
                
                remote_status = remote_controller.get_status()
                print(f"[@route:take_control] Remote controller status: {remote_status}")
                
                if not remote_status.get('adb_connected', False):
                    return jsonify({
                        'success': False,
                        'status': 'device_not_ready',
                        'error': remote_status.get('message', f'Device {device_ip}:{device_port} not connected via ADB'),
                        'device_model': device_model,
                        'session_id': session_id,
                        'av_status': av_status,
                        'remote_status': remote_status
                    })
                    
            except Exception as e:
                print(f"[@route:take_control] Remote controller error: {e}")
                return jsonify({
                    'success': False,
                    'status': 'remote_controller_error',
                    'error': f'Failed to check remote controller: {str(e)}',
                    'device_model': device_model,
                    'session_id': session_id,
                    'av_status': av_status
                })
        
        # Both controllers are ready
        print(f"[@route:take_control] All controllers ready for own device: {host_device.get('device_name')}")
        return jsonify({
            'success': True,
            'status': 'ready',
            'message': f'All controllers ready for {device_model}',
            'device_model': device_model,
            'session_id': session_id,
            'av_status': av_status,
            'remote_status': remote_status,
            'host_device': {
                'host_name': host_device.get('host_name'),
                'device_name': host_device.get('device_name'),
                'device_model': host_device.get('device_model')
            }
        })
            
    except Exception as e:
        print(f"[@route:take_control] Error checking controllers: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to check controllers: {str(e)}'
        }), 500 
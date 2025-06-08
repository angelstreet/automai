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
    """Simplified take control endpoint - lock device and forward request to host"""
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
        
        # Lock the device using deviceLockManager
        try:
            from web.utils.deviceLockManager import lock_device_in_registry, unlock_device_in_registry, get_device_lock_info
            
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
            connected_clients = get_connected_clients()
            
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
            
            # Extract host connection info
            host_ip = host_info.get('host_ip')
            host_port = host_info.get('host_port')
            
            print(f"[@route:server_take_control] Found host: {host_info.get('host_name')} at {host_ip}:{host_port}")
            
        except Exception as e:
            unlock_device_in_registry(device_id, session_id)
            print(f"[@route:server_take_control] Error finding host: {e}")
            return jsonify({
                'success': False,
                'error': f'Failed to find host for device: {str(e)}'
            }), 500
        
        # Forward request to host
        try:
            import requests
            
            host_url = f"https://{host_ip}:{host_port}/take-control"
            host_payload = {
                'device_id': device_id,
                'session_id': session_id
            }
            
            print(f"[@route:server_take_control] Forwarding to host: {host_url}")
            print(f"[@route:server_take_control] Payload: {host_payload}")
            
            host_response = requests.post(host_url, json=host_payload, timeout=30, verify=False)
            
            if host_response.ok:
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
                    # Host failed, release the device lock
                    unlock_device_in_registry(device_id, session_id)
                    return jsonify({
                        'success': False,
                        'error': host_data.get('error', 'Host failed to take control')
                    }), 500
            else:
                # Host request failed, release the device lock
                unlock_device_in_registry(device_id, session_id)
                return jsonify({
                    'success': False,
                    'error': f'Host request failed: {host_response.status_code} {host_response.text}'
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
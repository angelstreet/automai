"""
Server Host Routes

This module contains the unified take-control endpoints that:
- Handle device locking on server side
- Coordinate with hosts for controller status checking
- Provide single API endpoint for take control operations
"""

from flask import Blueprint, request, jsonify
import requests

# Use centralized path setup
from path_setup import setup_all_paths
setup_all_paths()

from .utils import get_host_by_model, build_host_url, make_host_request
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
        
        # Get device information with host details
        try:
            import requests
            device_response = requests.get(f"http://localhost:5009/api/system/device/{device_id}")
            
            if not device_response.ok:
                return jsonify({
                    'success': False,
                    'error': f'Device not found: {device_id}',
                    'host_available': False
                }), 404
            
            device_data = device_response.json()
            if not device_data.get('success'):
                return jsonify({
                    'success': False,
                    'error': device_data.get('error', 'Failed to get device information'),
                    'host_available': False
                }), 404
            
            device_info = device_data['device']
            device_model = device_info['device_model']
            host_connection = device_info['host_connection']
            
            print(f"[@route:server_take_control] Found device: {device_info['device_name']} ({device_model})")
            print(f"[@route:server_take_control] Host: {device_info['host_name']} at {device_info['host_ip']}:{device_info['host_port']}")
            
        except Exception as e:
            print(f"[@route:server_take_control] Error getting device info: {e}")
            return jsonify({
                'success': False,
                'error': f'Failed to get device information: {str(e)}',
                'host_available': False
            }), 500
        
        # Lock the device using deviceLockManager
        try:
            from web.utils.deviceLockManager import deviceLockManager
            
            # Try to acquire lock for the device
            lock_acquired = deviceLockManager.acquire_lock(device_id, session_id)
            
            if not lock_acquired:
                current_owner = deviceLockManager.get_lock_owner(device_id)
                return jsonify({
                    'success': False,
                    'error': f'Device {device_id} is already locked by session: {current_owner}',
                    'device_locked': True,
                    'locked_by': current_owner,
                    'host_available': True
                }), 409
            
            print(f"[@route:server_take_control] Successfully locked device {device_id} for session {session_id}")
            
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
            
            host_url = f"{host_connection['flask_url']}/take-control"
            host_payload = {
                'device_id': device_id,
                'device_model': device_model,
                'device_ip': device_info['device_ip'],
                'device_port': device_info['device_port'],
                'session_id': session_id
            }
            
            print(f"[@route:server_take_control] Calling host at: {host_url}")
            print(f"[@route:server_take_control] Host payload: {host_payload}")
            
            host_response = requests.post(host_url, json=host_payload, timeout=30)
            
            if host_response.ok:
                host_data = host_response.json()
                print(f"[@route:server_take_control] Host response: {host_data}")
                
                if host_data.get('success'):
                    return jsonify({
                        'success': True,
                        'message': 'Successfully took control of device',
                        'device_id': device_id,
                        'device_model': device_model,
                        'device_locked': True,
                        'locked_by': session_id,
                        'host_available': True,
                        'controllers': host_data.get('controllers', {}),
                        'host_info': {
                            'host_id': device_info['host_id'],
                            'host_name': device_info['host_name'],
                            'host_ip': device_info['host_ip'],
                            'host_port': device_info['host_port']
                        }
                    }), 200
                else:
                    # Host failed, release the device lock
                    deviceLockManager.release_lock(device_id, session_id)
                    return jsonify({
                        'success': False,
                        'error': host_data.get('error', 'Host failed to take control'),
                        'device_locked': False,
                        'host_available': True,
                        'controller_errors': host_data.get('controller_errors', {})
                    }), 500
            else:
                # Host request failed, release the device lock
                deviceLockManager.release_lock(device_id, session_id)
                return jsonify({
                    'success': False,
                    'error': f'Host request failed: {host_response.status_code} {host_response.text}',
                    'device_locked': False,
                    'host_available': False
                }), 500
                
        except Exception as e:
            # Host communication failed, release the device lock
            deviceLockManager.release_lock(device_id, session_id)
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
def host_take_control():
    """Host-side take control - check AV controller status using abstract interface"""
    try:
        data = request.get_json() or {}
        device_model = data.get('device_model', 'android_mobile')
        video_device = data.get('video_device', '/dev/video0')
        session_id = data.get('session_id', 'default-session')
        
        print(f"[@route:host_take_control] AV controller take control requested")
        print(f"[@route:host_take_control] Device model: {device_model}")
        print(f"[@route:host_take_control] Video device: {video_device}")
        print(f"[@route:host_take_control] Session ID: {session_id}")
        
        # Use controller factory to create appropriate AV controller
        try:
            print(f"[@route:host_take_control] Creating AV controller using factory")
            
            # Import the controller factory
            from controllers import create_device_controllers
            
            # Create device controller set based on device model
            # This will automatically map device_model to the correct controller types
            device_controllers = create_device_controllers(
                device_name=f"Host - {device_model}",
                device_type=device_model,
                # Pass any additional parameters that controllers might need
                video_device=video_device
            )
            
            # Get the AV controller from the device set
            av_controller = device_controllers.av
            
            print(f"[@route:host_take_control] Created AV controller: {av_controller.__class__.__name__}")
            
            # Use the abstract take_control method
            control_result = av_controller.take_control()
            
            print(f"[@route:host_take_control] Controller take_control result: {control_result}")
            
            # Build response based on controller result
            if control_result.get('success', False):
                # Build stream URL if controller indicates stream is ready
                import os
                host_ip = os.environ.get('HOST_IP', '77.56.53.130')
                stream_url = f"https://{host_ip}:444/stream/video"
                
                return jsonify({
                    'success': True,
                    'status': control_result.get('status', 'ready'),
                    'message': f'AV controller ready for {device_model}',
                    'device_model': device_model,
                    'video_device': video_device,
                    'session_id': session_id,
                    'controller_type': 'av',
                    'controller_class': av_controller.__class__.__name__,
                    'stream_url': stream_url,
                    'controller_details': control_result.get('details', {}),
                    'host_connected': True,
                    'timestamp': __import__('time').time()
                })
            else:
                return jsonify({
                    'success': False,
                    'status': control_result.get('status', 'failed'),
                    'error': control_result.get('error', 'AV controller not ready'),
                    'device_model': device_model,
                    'video_device': video_device,
                    'session_id': session_id,
                    'controller_type': 'av',
                    'controller_class': av_controller.__class__.__name__,
                    'controller_details': control_result.get('details', {}),
                    'host_connected': True,
                    'timestamp': __import__('time').time()
                })
            
        except Exception as e:
            print(f"[@route:host_take_control] Controller error: {str(e)}")
            return jsonify({
                'success': False,
                'status': 'error',
                'error': f'Controller error: {str(e)}',
                'controller_type': 'av',
                'device_model': device_model,
                'host_connected': True,
                'timestamp': __import__('time').time()
            }), 500
        
    except Exception as e:
        print(f"[@route:host_take_control] Error: {str(e)}")
        return jsonify({
            'success': False,
            'status': 'error',
            'error': f'Host AV take control error: {str(e)}',
            'host_connected': True,
            'timestamp': __import__('time').time()
        }), 500 
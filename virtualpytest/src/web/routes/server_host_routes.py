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
                            'host_id': host_id,
                            'host_name': host_name,
                            'host_ip': host_ip,
                            'host_port': host_port
                        }
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
def host_take_control():
    """Host-side take control - check AV controller status using abstract interface"""
    try:
        print(f"[@route:host_take_control] === STARTING HOST TAKE CONTROL ===")
        
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
            print(f"[@route:host_take_control] === STEP 1: About to import HDMIStreamController ===")
            
            # Import the HDMI controller directly to avoid factory import issues
            from controllers.audiovideo.hdmi_stream import HDMIStreamController
            
            print(f"[@route:host_take_control] === STEP 2: Successfully imported HDMIStreamController ===")
            
            # Create HDMI stream controller directly
            print(f"[@route:host_take_control] === STEP 3: About to create HDMIStreamController instance ===")
            
            av_controller = HDMIStreamController(
                device_name=f"Host - {device_model}",
                video_device=video_device,
                output_path="/var/www/html/stream/",
                stream_resolution="640x360",
                stream_fps=12,
                stream_bitrate="400k"
            )
            
            print(f"[@route:host_take_control] === STEP 4: Successfully created HDMIStreamController instance ===")
            print(f"[@route:host_take_control] Created AV controller: {av_controller.__class__.__name__}")
            
            # Use the abstract take_control method
            print(f"[@route:host_take_control] === STEP 5: About to call take_control() ===")
            control_result = av_controller.take_control()
            
            print(f"[@route:host_take_control] === STEP 6: take_control() completed ===")
            print(f"[@route:host_take_control] Controller take_control result: {control_result}")
            
            # Build response based on controller result
            if control_result.get('success', False):
                # Build stream URL if controller indicates stream is ready
                import os
                host_ip = os.environ.get('HOST_IP', '77.56.53.130')
                stream_url = f"https://{host_ip}:444/stream/video"
                
                print(f"[@route:host_take_control] === SUCCESS: Returning success response ===")
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
                print(f"[@route:host_take_control] === FAILURE: Controller failed, returning error response ===")
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
            print(f"[@route:host_take_control] === EXCEPTION IN CONTROLLER SECTION ===")
            print(f"[@route:host_take_control] Controller error: {str(e)}")
            print(f"[@route:host_take_control] Exception type: {type(e)}")
            import traceback
            print(f"[@route:host_take_control] Traceback: {traceback.format_exc()}")
            
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
        print(f"[@route:host_take_control] === EXCEPTION IN MAIN FUNCTION ===")
        print(f"[@route:host_take_control] Error: {str(e)}")
        print(f"[@route:host_take_control] Exception type: {type(e)}")
        import traceback
        print(f"[@route:host_take_control] Traceback: {traceback.format_exc()}")
        
        return jsonify({
            'success': False,
            'status': 'error',
            'error': f'Host AV take control error: {str(e)}',
            'host_connected': True,
            'timestamp': __import__('time').time()
        }), 500 
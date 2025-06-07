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
    """Unified take control endpoint - handles locking + host controller checks"""
    try:
        data = request.get_json()
        device_model = data.get('device_model', 'android_mobile')
        video_device = data.get('video_device', '/dev/video0')
        session_id = data.get('session_id', 'default-session')
        
        print(f"[@route:server_take_control] Taking control of device")
        print(f"[@route:server_take_control] Device model: {device_model}")
        print(f"[@route:server_take_control] Video device: {video_device}")
        print(f"[@route:server_take_control] Session ID: {session_id}")
        
        # Step 1: Find host by device model
        host_info = get_host_by_model(device_model)
        
        if not host_info:
            print(f"[@route:server_take_control] No host found for device model: {device_model}")
            return jsonify({
                'success': False,
                'error': f'No host available for device model: {device_model}'
            }), 404
        
        device_id = host_info.get('client_id')
        print(f"[@route:server_take_control] Found host: {device_id} for device model: {device_model}")
        
        # Step 2: Clean up expired locks
        cleanup_expired_locks()
        
        # Step 3: Check if device is already locked
        if is_device_locked_in_registry(device_id):
            lock_info = get_device_lock_info(device_id)
            locked_by = lock_info.get('lockedBy', 'unknown') if lock_info else 'unknown'
            
            # If locked by the same session, allow it (re-entrant lock)
            if locked_by == session_id:
                print(f"[@route:server_take_control] Device {device_id} already locked by same session: {session_id}")
            else:
                print(f"[@route:server_take_control] Device {device_id} is locked by another session: {locked_by}")
                return jsonify({
                    'success': False,
                    'error': f'Device is currently locked by another session: {locked_by}',
                    'lock_info': lock_info
                }), 409  # Conflict
        
        # Step 4: Lock the device for this session
        if not is_device_locked_in_registry(device_id):
            lock_success = lock_device_in_registry(device_id, session_id)
            if not lock_success:
                print(f"[@route:server_take_control] Failed to lock device: {device_id}")
                return jsonify({
                    'success': False,
                    'error': 'Failed to acquire device lock'
                }), 500
            print(f"[@route:server_take_control] Successfully locked device: {device_id} for session: {session_id}")
        
        # Step 5: Call host take control to check all controllers
        try:
            print(f"[@route:server_take_control] Calling host take control for device: {device_model}")
            
            host_response = make_host_request(
                '/take-control',
                method='POST',
                use_https=True,
                json={
                    'device_model': device_model,
                    'video_device': video_device,
                    'session_id': session_id
                },
                timeout=30
            )
            
            if host_response.status_code == 200:
                host_result = host_response.json()
                print(f"[@route:server_take_control] Host take control result: {host_result}")
                
                # Get lock info for response
                lock_info = get_device_lock_info(device_id)
                
                # Build comprehensive response
                response_data = {
                    'success': host_result.get('success', False),
                    'message': f'Take control completed for {device_model}',
                    'device_model': device_model,
                    'device_id': device_id,
                    'video_device': video_device,
                    'session_id': session_id,
                    'host_info': {
                        'id': device_id,
                        'name': host_info.get('name', 'Unknown'),
                        'ip': host_info.get('local_ip', 'unknown'),
                        'status': host_info.get('status', 'unknown')
                    },
                    'lock_info': lock_info,
                    # Include all controller status from host
                    'controllers': host_result.get('controllers', {}),
                    'stream_url': host_result.get('stream_url'),
                    'host_available': True
                }
                
                # If host reported failure, include error details
                if not host_result.get('success', False):
                    response_data['error'] = host_result.get('error', 'Host controller checks failed')
                    response_data['controller_errors'] = host_result.get('controller_errors', {})
                
                return jsonify(response_data)
            else:
                print(f"[@route:server_take_control] Host take control failed: {host_response.status_code}")
                return jsonify({
                    'success': False,
                    'error': f'Host communication failed: HTTP {host_response.status_code}',
                    'device_id': device_id,
                    'host_available': False
                }), 500
                
        except Exception as e:
            print(f"[@route:server_take_control] Host communication error: {str(e)}")
            return jsonify({
                'success': False,
                'error': f'Host communication error: {str(e)}',
                'device_id': device_id,
                'host_available': False
            }), 500
        
    except Exception as e:
        print(f"[@route:server_take_control] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
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
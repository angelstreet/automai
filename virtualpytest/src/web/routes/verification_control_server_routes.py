"""
Verification Control Server Routes

This module contains the server-side verification control endpoints that:
- Handle device locking and unlocking
- Manage take-control and release-control operations
- Coordinate with hosts for verification system control
"""

from flask import Blueprint, request, jsonify
import requests
from .utils import get_host_by_model, build_host_nginx_url, make_host_request
from utils.deviceLockManager import (
    lock_device_in_registry,
    unlock_device_in_registry,
    is_device_locked_in_registry,
    get_device_lock_info,
    cleanup_expired_locks
)

# Create blueprint
verification_control_server_bp = Blueprint('verification_control_server', __name__)

# =====================================================
# DEVICE LOCK MANAGEMENT (SERVER-ONLY)
# =====================================================

@verification_control_server_bp.route('/api/virtualpytest/verification/lock-device', methods=['POST'])
def lock_device():
    """Lock a device for exclusive access"""
    try:
        print(f"[@route:verification_control_server:lock_device] Lock device request received")
        
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No JSON data provided'}), 400
        
        device_id = data.get('device_id')
        session_id = data.get('session_id', 'default-session')
        
        if not device_id:
            return jsonify({'success': False, 'error': 'device_id is required'}), 400
        
        print(f"[@route:verification_control_server:lock_device] Attempting to lock device: {device_id} for session: {session_id}")
        
        # Clean up any expired locks first
        cleanup_expired_locks()
        
        # Attempt to lock the device
        success = lock_device_in_registry(device_id, session_id)
        
        if success:
            lock_info = get_device_lock_info(device_id)
            print(f"[@route:verification_control_server:lock_device] Successfully locked device: {device_id}")
            return jsonify({
                'success': True,
                'message': f'Device {device_id} locked successfully',
                'lock_info': lock_info
            })
        else:
            # Check if already locked by someone else
            lock_info = get_device_lock_info(device_id)
            if lock_info:
                locked_by = lock_info.get('lockedBy', 'unknown')
                print(f"[@route:verification_control_server:lock_device] Device {device_id} already locked by: {locked_by}")
                return jsonify({
                    'success': False,
                    'error': f'Device is already locked by {locked_by}',
                    'lock_info': lock_info
                }), 409  # Conflict
            else:
                print(f"[@route:verification_control_server:lock_device] Failed to lock device: {device_id} (device not found)")
                return jsonify({
                    'success': False,
                    'error': 'Device not found or unavailable'
                }), 404
        
    except Exception as e:
        print(f"[@route:verification_control_server:lock_device] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}'
        }), 500


@verification_control_server_bp.route('/api/virtualpytest/verification/unlock-device', methods=['POST'])
def unlock_device():
    """Unlock a device"""
    try:
        print(f"[@route:verification_control_server:unlock_device] Unlock device request received")
        
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No JSON data provided'}), 400
        
        device_id = data.get('device_id')
        session_id = data.get('session_id')  # Optional - if provided, only unlock if locked by this session
        
        if not device_id:
            return jsonify({'success': False, 'error': 'device_id is required'}), 400
        
        print(f"[@route:verification_control_server:unlock_device] Attempting to unlock device: {device_id}")
        
        # Attempt to unlock the device
        success = unlock_device_in_registry(device_id, session_id)
        
        if success:
            print(f"[@route:verification_control_server:unlock_device] Successfully unlocked device: {device_id}")
            return jsonify({
                'success': True,
                'message': f'Device {device_id} unlocked successfully'
            })
        else:
            if session_id:
                print(f"[@route:verification_control_server:unlock_device] Failed to unlock device: {device_id} (not locked by session {session_id})")
                return jsonify({
                    'success': False,
                    'error': 'Device not locked by this session or device not found'
                }), 403  # Forbidden
            else:
                print(f"[@route:verification_control_server:unlock_device] Failed to unlock device: {device_id} (device not found)")
                return jsonify({
                    'success': False,
                    'error': 'Device not found'
                }), 404
        
    except Exception as e:
        print(f"[@route:verification_control_server:unlock_device] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}'
        }), 500


@verification_control_server_bp.route('/api/virtualpytest/verification/device-lock-status/<device_id>', methods=['GET'])
def get_device_lock_status(device_id):
    """Get lock status for a specific device"""
    try:
        print(f"[@route:verification_control_server:get_device_lock_status] Getting lock status for device: {device_id}")
        
        # Clean up expired locks first
        cleanup_expired_locks()
        
        is_locked = is_device_locked_in_registry(device_id)
        lock_info = get_device_lock_info(device_id) if is_locked else None
        
        return jsonify({
            'success': True,
            'device_id': device_id,
            'is_locked': is_locked,
            'lock_info': lock_info
        })
        
    except Exception as e:
        print(f"[@route:verification_control_server:get_device_lock_status] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}'
        }), 500

# =====================================================
# VERIFICATION CONTROLLER MANAGEMENT (SERVER-ONLY)
# =====================================================

@verification_control_server_bp.route('/api/virtualpytest/verification/take-control', methods=['POST'])
def take_verification_control():
    """Initialize verification controllers with device model and lock management."""
    try:
        data = request.get_json()
        device_model = data.get('device_model', 'android_mobile')
        video_device = data.get('video_device', '/dev/video0')
        session_id = data.get('session_id', 'default-session')
        
        print(f"[@route:take_verification_control] Initializing verification controllers")
        print(f"[@route:take_verification_control] Device model: {device_model}")
        print(f"[@route:take_verification_control] Video device: {video_device}")
        print(f"[@route:take_verification_control] Session ID: {session_id}")
        
        # Step 1: Find host by device model
        host_info = get_host_by_model(device_model)
        
        if not host_info:
            print(f"[@route:take_verification_control] No host found for device model: {device_model}")
            return jsonify({
                'success': False,
                'error': f'No host available for device model: {device_model}'
            }), 404
        
        device_id = host_info.get('client_id')
        print(f"[@route:take_verification_control] Found host: {device_id} for device model: {device_model}")
        
        # Step 2: Clean up expired locks
        cleanup_expired_locks()
        
        # Step 3: Check if device is already locked
        if is_device_locked_in_registry(device_id):
            lock_info = get_device_lock_info(device_id)
            locked_by = lock_info.get('lockedBy', 'unknown') if lock_info else 'unknown'
            
            # If locked by the same session, allow it (re-entrant lock)
            if locked_by == session_id:
                print(f"[@route:take_verification_control] Device {device_id} already locked by same session: {session_id}")
            else:
                print(f"[@route:take_verification_control] Device {device_id} is locked by another session: {locked_by}")
                return jsonify({
                    'success': False,
                    'error': f'Device is currently locked by another session: {locked_by}',
                    'lock_info': lock_info
                }), 409  # Conflict
        
        # Step 4: Lock the device for this session
        if not is_device_locked_in_registry(device_id):
            lock_success = lock_device_in_registry(device_id, session_id)
            if not lock_success:
                print(f"[@route:take_verification_control] Failed to lock device: {device_id}")
                return jsonify({
                    'success': False,
                    'error': 'Failed to acquire device lock'
                }), 500
            print(f"[@route:take_verification_control] Successfully locked device: {device_id} for session: {session_id}")
        
        # Step 5: Ask host if stream and remote control are available
        try:
            # Check if host can provide stream and remote control
            host_response = make_host_request(
                '/stream/verification-status',
                method='GET',
                use_https=True
            )
            
            host_available = True
            stream_url = None
            
            if host_response.status_code == 200:
                host_result = host_response.json()
                host_available = host_result.get('success', True)
                print(f"[@route:take_verification_control] Host verification status: {host_result}")
            else:
                print(f"[@route:take_verification_control] Host status check failed: {host_response.status_code}, assuming available")
            
            # Build stream URL (this would be the actual video stream URL)
            try:
                # Example stream URL - adjust based on your actual streaming setup
                stream_url = build_host_nginx_url(host_info, 'stream/video')
                print(f"[@route:take_verification_control] Built stream URL: {stream_url}")
            except Exception as e:
                print(f"[@route:take_verification_control] Failed to build stream URL: {str(e)}")
                stream_url = f"https://{host_info.get('local_ip', 'unknown')}:444/stream/video"
            
        except Exception as e:
            print(f"[@route:take_verification_control] Host communication error: {str(e)}")
            # Continue anyway - host might be available but endpoint missing
            host_available = True
            stream_url = f"https://{host_info.get('local_ip', 'unknown')}:444/stream/video"
        
        # Step 6: Return success with stream URL and lock info
        lock_info = get_device_lock_info(device_id)
        
        return jsonify({
            'success': True,
            'message': f'Verification controllers initialized for {device_model}',
            'device_model': device_model,
            'device_id': device_id,
            'video_device': video_device,
            'session_id': session_id,
            'controllers_available': ['image', 'text', 'adb'],
            'host_info': {
                'id': device_id,
                'name': host_info.get('name', 'Unknown'),
                'ip': host_info.get('local_ip', 'unknown'),
                'status': host_info.get('status', 'unknown')
            },
            'stream_url': stream_url,
            'lock_info': lock_info,
            'host_available': host_available
        })
        
    except Exception as e:
        print(f"[@route:take_verification_control] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Error initializing verification controllers: {str(e)}'
        }), 500


@verification_control_server_bp.route('/api/virtualpytest/verification/release-control', methods=['POST'])
def release_verification_control():
    """Release verification controllers and unlock device."""
    try:
        data = request.get_json() or {}
        device_id = data.get('device_id')
        session_id = data.get('session_id')
        
        print(f"[@route:release_verification_control] Releasing verification controllers")
        print(f"[@route:release_verification_control] Device ID: {device_id}")
        print(f"[@route:release_verification_control] Session ID: {session_id}")
        
        # If device_id provided, unlock the specific device
        if device_id:
            unlock_success = unlock_device_in_registry(device_id, session_id)
            if unlock_success:
                print(f"[@route:release_verification_control] Successfully unlocked device: {device_id}")
            else:
                print(f"[@route:release_verification_control] Failed to unlock device: {device_id}")
        
        return jsonify({
            'success': True,
            'message': 'Verification controllers released',
            'device_unlocked': device_id is not None and unlock_success if device_id else None
        })
        
    except Exception as e:
        print(f"[@route:release_verification_control] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Error releasing verification controllers: {str(e)}'
        }), 500 
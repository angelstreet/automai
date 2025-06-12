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

# =====================================================
# SERVER-SIDE DEVICE CONTROL ENDPOINTS
# =====================================================

@control_bp.route('/take-control', methods=['POST'])
def take_control():
    """Server-side take control - Coordinate device locking and host discovery"""
    try:
        data = request.get_json() or {}
        host_name = data.get('host_name')
        session_id = data.get('session_id', 'default-session')
        
        print(f"[@route:server_take_control] Take control requested for host: {host_name}")
        print(f"[@route:server_take_control] Session ID: {session_id}")
        
        if not host_name:
            return jsonify({
                'success': False,
                'error': 'Missing host_name'
            }), 400
        
        # Lock the device using device_lock_manager_utils
        try:
            # Get host info first to check if it exists
            connected_clients = get_host_registry()
            host_info = connected_clients.get(host_name)
            
            if not host_info:
                return jsonify({
                    'success': False,
                    'error': f'Host {host_name} not found in registry',
                    'device_locked': False,
                    'locked_by': None
                }), 404
            
            # Try to acquire lock for the host
            lock_acquired = lock_device_in_registry(host_name, session_id)
            
            if not lock_acquired:
                # Host exists but lock failed - check who owns it
                lock_info = get_device_lock_info(host_name)
                if lock_info:
                    current_owner = lock_info.get('lockedBy', 'unknown')
                    return jsonify({
                        'success': False,
                        'error': f'Host {host_name} is already locked by session: {current_owner}',
                        'device_locked': True,
                        'locked_by': current_owner
                    }), 409
                else:
                    # This shouldn't happen - lock failed but no lock info
                    return jsonify({
                        'success': False,
                        'error': f'Failed to acquire lock for host {host_name} (unknown reason)',
                        'device_locked': False,
                        'locked_by': None
                    }), 500
            
            print(f"[@route:server_take_control] Successfully locked host {host_name} for session {session_id}")
            
        except Exception as e:
            print(f"[@route:server_take_control] Error acquiring host lock: {e}")
            return jsonify({
                'success': False,
                'error': f'Failed to lock host: {str(e)}'
            }), 500
        
        # Verify host is online (host_info is now available from above)
        try:
            # Just verify it's online
            if host_info.get('status') != 'online':
                unlock_device_in_registry(host_name, session_id)
                return jsonify({
                    'success': False,
                    'error': f'Host {host_name} is not online (status: {host_info.get("status")})'
                }), 503
            
            print(f"[@route:server_take_control] Found host: {host_info.get('host_name')} at {host_info.get('host_ip')}:{host_info.get('host_port_external')}")
            
        except Exception as e:
            unlock_device_in_registry(host_name, session_id)
            print(f"[@route:server_take_control] Error verifying host status: {e}")
            return jsonify({
                'success': False,
                'error': f'Failed to verify host status: {str(e)}'
            }), 500
        
        # Forward request to host using proper URL building
        try:
            # Host doesn't need any payload - it uses its own stored host_device object
            print(f"[@route:server_take_control] Forwarding to host using proper URL building")
            
            # Use proper URL building function from utils
            host_url = buildHostUrl(host_info, "/host/take-control")
            
            print(f"[@route:server_take_control] Built URL using build_host_url: {host_url}")
            
            # Make request without payload - host uses its own stored device info
            host_response = requests.post(
                host_url, 
                json={},  # Empty payload since host uses its own stored host_device
                timeout=30, 
                verify=False
            )
            
            if host_response.status_code == 200:
                host_data = host_response.json()
                print(f"[@route:server_take_control] Host response: {host_data}")
                
                if host_data.get('success'):
                    # Host confirmed controllers started - that's all we need
                    print(f"[@route:server_take_control] Control taken successfully for host: {host_name}")
                    return jsonify({
                        'success': True,
                        'message': 'Control taken successfully'
                    }), 200
                else:
                    # Host failed to start controllers - unlock and return simple error
                    unlock_device_in_registry(host_name, session_id)
                    
                    return jsonify({
                        'success': False,
                        'error': host_data.get('error', 'Host failed to start controllers')
                    }), 500
            else:
                # Host request failed, release the device lock
                unlock_device_in_registry(host_name, session_id)
                return jsonify({
                    'success': False,
                    'error': f'Host request failed: {host_response.status_code} {host_response.text}',
                    'error_type': 'host_communication_error'
                }), 500
                
        except Exception as e:
            # Host communication failed, release the device lock
            unlock_device_in_registry(host_name, session_id)
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
        host_name = data.get('host_name')
        session_id = data.get('session_id', 'default-session')
        
        print(f"[@route:server_release_control] Releasing control")
        print(f"[@route:server_release_control] Host name: {host_name}")
        print(f"[@route:server_release_control] Session ID: {session_id}")
        
        # Step 1: Call host release control if host_name provided
        host_release_success = True
        if host_name:
            connected_clients = get_host_registry()
            host_info = connected_clients.get(host_name)
            
            if host_info:
                try:
                    print(f"[@route:server_release_control] Calling host release control")
                    
                    host_url = buildHostUrl(host_info, '/host/release-control')
                    host_response = requests.post(
                        host_url,
                        json={},  # Empty payload since host uses its own stored device info
                        timeout=30,
                        verify=False
                    )
                    
                    if host_response.status_code == 200:
                        host_result = host_response.json()
                        host_release_success = host_result.get('success', False)
                        print(f"[@route:server_release_control] Host confirmed controllers stopped: {host_release_success}")
                    else:
                        print(f"[@route:server_release_control] Host release failed: {host_response.status_code}")
                        host_release_success = False
                        
                except Exception as e:
                    print(f"[@route:server_release_control] Host communication error: {str(e)}")
                    host_release_success = False
        
        # Step 2: Unlock device if host_name provided
        device_unlock_success = True
        if host_name:
            device_unlock_success = unlock_device_in_registry(host_name, session_id)
            if device_unlock_success:
                print(f"[@route:server_release_control] Successfully unlocked host: {host_name}")
            else:
                print(f"[@route:server_release_control] Failed to unlock host: {host_name}")
        
        return jsonify({
            'success': host_release_success and device_unlock_success,
            'message': 'Control released',
            'device_unlocked': device_unlock_success if host_name else None,
            'host_released': host_release_success if host_name else None
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
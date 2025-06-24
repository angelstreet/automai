"""
Server Control Routes

This module contains server-side control endpoints that:
- Handle device locking and unlocking on server side
- Coordinate with hosts for device control operations
- Forward requests to appropriate hosts
- Manage device registry and host discovery
- Provide controller type information
"""

from flask import Blueprint, request, jsonify, session
import uuid
import json
import requests
import time
import threading
from datetime import datetime
from typing import Dict, Any, Optional

from src.utils.app_utils import get_team_id, get_user_id
from src.utils.build_url_utils import buildHostUrl
from src.utils.host_utils import get_host_manager
from src.utils.lock_utils import lock_device, unlock_device, get_all_locked_devices, get_device_lock_info
from src.controllers.controller_config_factory import create_controller_configs_from_device_info

# Create blueprint
control_bp = Blueprint('server_control', __name__, url_prefix='/server/control')

# =====================================================
# SERVER-SIDE DEVICE CONTROL ENDPOINTS
# =====================================================

@control_bp.route('/take-control', methods=['POST'])
def take_control():
    """Take control of a device"""
    try:
        data = request.get_json()
        host = data.get('host')
        
        if not host or not host.get('host_name'):
            return jsonify({'error': 'Host data is required'}), 400
        
        host_name = host['host_name']
        
        # Generate session ID if not exists
        if 'session_id' not in session:
            session['session_id'] = str(uuid.uuid4())
        
        session_id = session['session_id']
        
        print(f"🎮 [CONTROL] Taking control of host: {host_name} (session: {session_id})")
        
        # Use lock utils for device locking
        success = lock_device(host_name, session_id)
        
        if success:
            return jsonify({
                'success': True,
                'message': f'Successfully took control of host: {host_name}',
                'session_id': session_id,
                'host_name': host_name
            })
        else:
            lock_info = get_device_lock_info(host_name)
            if lock_info:
                return jsonify({
                    'success': False,
                    'error': f'Host {host_name} is already locked by another session',
                    'locked_by': lock_info.get('lockedBy'),
                    'locked_at': lock_info.get('lockedAt')
                }), 423  # HTTP 423 Locked
            else:
                return jsonify({
                    'success': False,
                    'error': f'Failed to lock host {host_name}'
                }), 500
        
    except Exception as e:
        print(f"❌ [CONTROL] Error taking control: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@control_bp.route('/release-control', methods=['POST'])
def release_control():
    """Release control of a device"""
    try:
        data = request.get_json()
        host = data.get('host')
        
        if not host or not host.get('host_name'):
            return jsonify({'error': 'Host data is required'}), 400
        
        host_name = host['host_name']
        session_id = session.get('session_id')
        
        print(f"🔓 [CONTROL] Releasing control of host: {host_name} (session: {session_id})")
        
        # Use lock utils for device unlocking
        success = unlock_device(host_name, session_id)
        
        if success:
            return jsonify({
                'success': True,
                'message': f'Successfully released control of host: {host_name}'
            })
        else:
            return jsonify({
                'success': False,
                'error': f'Failed to release control of host {host_name}'
            }), 500
        
    except Exception as e:
        print(f"❌ [CONTROL] Error releasing control: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@control_bp.route('/locked-devices', methods=['GET'])
def get_locked_devices():
    """Get information about all currently locked devices"""
    try:
        locked_devices = get_all_locked_devices()
        
        return jsonify({
            'success': True,
            'locked_devices': locked_devices
        })
        
    except Exception as e:
        print(f"❌ [CONTROL] Error getting locked devices: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@control_bp.route('/navigation/execute', methods=['POST'])
def execute_navigation():
    """Execute navigation on a host device."""
    try:
        data = request.get_json()
        host = data.get('host')
        navigation_data = data.get('navigation_data')
        
        if not host or not host.get('host_name'):
            return jsonify({'error': 'Host data is required'}), 400
        
        if not navigation_data:
            return jsonify({'error': 'Navigation data is required'}), 400
        
        host_name = host['host_name']
        
        print(f"🧭 [NAVIGATION] Executing navigation on host: {host_name}")
        print(f"   Navigation data keys: {list(navigation_data.keys())}")
        
        # Check if host is registered
        host_manager = get_host_manager()
        host_data = host_manager.get_host(host_name)
        if not host_data:
            return jsonify({'error': f'Host {host_name} not found'}), 404
        
        # Forward request to host
        host_endpoint = '/host/navigation/execute'
        host_url = buildHostUrl(host_data, host_endpoint)
        
        print(f"📡 [NAVIGATION] Forwarding to: {host_url}")
        
        response = requests.post(
            host_url,
            json={'navigation_data': navigation_data},
            timeout=60,
            verify=False
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ [NAVIGATION] Navigation completed successfully")
            return jsonify(result)
        else:
            error_msg = f"Navigation failed with status {response.status_code}: {response.text}"
            print(f"❌ [NAVIGATION] {error_msg}")
            return jsonify({'error': error_msg}), response.status_code
        
    except requests.exceptions.Timeout:
        return jsonify({'error': 'Navigation request timed out'}), 408
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Network error: {str(e)}'}), 500
    except Exception as e:
        print(f"❌ [NAVIGATION] Error executing navigation: {e}")
        return jsonify({'error': str(e)}), 500

@control_bp.route('/navigation/batch-execute', methods=['POST'])
def batch_execute_navigation():
    """Execute batch navigation on a host device."""
    try:
        data = request.get_json()
        host = data.get('host')
        batch_data = data.get('batch_data')
        
        if not host or not host.get('host_name'):
            return jsonify({'error': 'Host data is required'}), 400
        
        if not batch_data or not isinstance(batch_data, list):
            return jsonify({'error': 'Batch data must be a list of navigation items'}), 400
        
        host_name = host['host_name']
        
        print(f"🧭 [BATCH-NAVIGATION] Executing batch navigation on host: {host_name}")
        print(f"   Batch size: {len(batch_data)} items")
        
        # Check if host is registered
        host_manager = get_host_manager()
        host_data = host_manager.get_host(host_name)
        if not host_data:
            return jsonify({'error': f'Host {host_name} not found'}), 404
        
        # Forward request to host
        host_endpoint = '/host/navigation/batch-execute'
        host_url = buildHostUrl(host_data, host_endpoint)
        
        print(f"📡 [BATCH-NAVIGATION] Forwarding to: {host_url}")
        
        response = requests.post(
            host_url,
            json={'batch_data': batch_data},
            timeout=120,  # Longer timeout for batch operations
            verify=False
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ [BATCH-NAVIGATION] Batch navigation completed successfully")
            return jsonify(result)
        else:
            error_msg = f"Batch navigation failed with status {response.status_code}: {response.text}"
            print(f"❌ [BATCH-NAVIGATION] {error_msg}")
            return jsonify({'error': error_msg}), response.status_code
        
    except requests.exceptions.Timeout:
        return jsonify({'error': 'Batch navigation request timed out'}), 408
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Network error: {str(e)}'}), 500
    except Exception as e:
        print(f"❌ [BATCH-NAVIGATION] Error executing batch navigation: {e}")
        return jsonify({'error': str(e)}), 500

# =====================================================
# CONTROLLER INFORMATION ENDPOINTS
# =====================================================

@control_bp.route('/getAllControllers', methods=['GET'])
def get_all_controllers():
    """Get all available controller implementations from Python code"""
    try:
        print("[@route:getAllControllers] Fetching all available controller implementations")
        
        # Get controller configurations for different device models to understand available implementations
        controller_types = {
            'remote': [
                {
                    'id': 'android_tv',
                    'name': 'Android TV (ADB)',
                    'description': 'Android TV control with ADB',
                    'implementation': 'android_tv',
                    'status': 'available',
                    'parameters': ['device_ip', 'device_port', 'connection_timeout']
                },
                {
                    'id': 'android_mobile',
                    'name': 'Android Mobile (ADB)',
                    'description': 'Android Mobile control with ADB',
                    'implementation': 'android_mobile',
                    'status': 'available',
                    'parameters': ['device_ip', 'device_port', 'connection_timeout']
                },
                {
                    'id': 'ir_remote',
                    'name': 'IR Remote',
                    'description': 'Infrared remote control with classic TV/STB buttons',
                    'implementation': 'ir_remote',
                    'status': 'available',
                    'parameters': ['device_path', 'protocol', 'frequency']
                },
                {
                    'id': 'bluetooth_remote',
                    'name': 'Bluetooth Remote',
                    'description': 'Bluetooth HID remote control',
                    'implementation': 'bluetooth_remote',
                    'status': 'available',
                    'parameters': ['device_address', 'pairing_pin', 'connection_timeout']
                }
            ],
            'av': [
                {
                    'id': 'hdmi_stream',
                    'name': 'HDMI Stream (Video Capture)',
                    'description': 'HDMI video capture via Flask host with video device',
                    'implementation': 'hdmi_stream',
                    'status': 'available',
                    'parameters': ['video_device', 'resolution', 'fps', 'stream_path', 'service_name']
                }
            ],
            'verification': [
                {
                    'id': 'adb',
                    'name': 'ADB Verification',
                    'description': 'Android device verification via ADB',
                    'implementation': 'adb',
                    'status': 'available',
                    'parameters': ['device_ip', 'device_port', 'connection_timeout']
                },
                {
                    'id': 'ocr',
                    'name': 'OCR Verification',
                    'description': 'Optical Character Recognition verification',
                    'implementation': 'ocr',
                    'status': 'available',
                    'parameters': []
                }
            ],
            'power': [
                {
                    'id': 'usb',
                    'name': 'USB Hub Power Control',
                    'description': 'USB hub power control via uhubctl',
                    'implementation': 'usb',
                    'status': 'available',
                    'parameters': ['hub_location', 'port_number']
                }
            ]
        }
        
        print(f"[@route:getAllControllers] Successfully retrieved {len(controller_types)} controller types")
        
        return jsonify({
            'success': True,
            'controller_types': controller_types
        }), 200
        
    except Exception as e:
        print(f"[@route:getAllControllers] Error: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to get controller types: {str(e)}'
        }), 500 
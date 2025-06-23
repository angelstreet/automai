"""
Host Control Routes

This module contains host-side control endpoints that:
- Handle controller status checking on host devices
- Manage local device control operations
- Execute device-specific control commands
- Use stored host_device objects for controller access
"""

from flask import Blueprint, request, jsonify, current_app
from src.utils.host_utils import get_controller, get_device_by_id, list_available_devices

# Create blueprint
control_bp = Blueprint('host_control', __name__, url_prefix='/host')

# =====================================================
# HOST-SIDE DEVICE CONTROL ENDPOINTS
# =====================================================

@control_bp.route('/take-control', methods=['POST'])
def take_control():
    """Host-side take control - Use own stored host_device object (no parameters needed)"""
    try:
        data = request.get_json() or {}
        device_id = data.get('device_id')  # Optional device_id for multi-device hosts
        
        print(f"[@route:take_control] Host checking controllers status using own stored host_device")
        if device_id:
            print(f"[@route:take_control] Specific device requested: {device_id}")
        
        # ✅ GET HOST_DEVICE FROM FLASK APP CONTEXT (contains all device info)
        host_device = getattr(current_app, 'my_host_device', None)
        
        if not host_device:
            return jsonify({
                'success': False,
                'status': 'host_device_not_initialized',
                'error': 'Host device object not initialized. Host may need to re-register.'
            })
        
        # For multi-device hosts, get device info from devices array
        devices = host_device.get('devices', [])
        if devices and device_id:
            # Find specific device
            target_device = None
            for device in devices:
                if device.get('device_id') == device_id:
                    target_device = device
                    break
            
            if not target_device:
                return jsonify({
                    'success': False,
                    'status': 'device_not_found',
                    'error': f'Device {device_id} not found in host configuration',
                    'available_devices': [d.get('device_id') for d in devices]
                })
            
            # Use device-specific info
            device_model = target_device.get('device_model', 'android_mobile')
            device_ip = target_device.get('device_ip')
            device_port = target_device.get('device_port', 5555)
            device_name = target_device.get('device_name')
        else:
            # Backward compatibility - use legacy single device fields or first device
            if devices:
                target_device = devices[0]
                device_model = target_device.get('device_model', 'android_mobile')
                device_ip = target_device.get('device_ip')
                device_port = target_device.get('device_port', 5555)
                device_name = target_device.get('device_name')
                device_id = target_device.get('device_id', 'device_1')
            else:
                # Legacy single device mode
                device_model = host_device.get('device_model', 'android_mobile')
                device_ip = host_device.get('device_ip')
                device_port = host_device.get('device_port', 5555)
                device_name = host_device.get('device_name')
                device_id = None
        
        host_name = host_device.get('host_name')
        
        print(f"[@route:take_control] Host device: {host_name} managing device: {device_name} ({device_model})")
        print(f"[@route:take_control] Device connection: {device_ip}:{device_port}")
        if device_id:
            print(f"[@route:take_control] Device ID: {device_id}")
        print(f"[@route:take_control] Available controllers: {list(host_device.get('controller_objects', {}).keys())}")
        
        # Step 1: Check AV controller using new architecture
        try:
            av_controller = get_controller(device_id, 'av')
            
            if not av_controller:
                device = get_device_by_id(device_id)
                if not device:
                    return jsonify({
                        'success': False,
                        'status': 'device_not_found',
                        'error': f'Device {device_id} not found',
                        'error_type': 'configuration_error'
                    })
                
                return jsonify({
                    'success': False,
                    'status': 'av_controller_not_found',
                    'error': f'No AV controller found for device {device_id}',
                    'error_type': 'configuration_error',
                    'device_model': device_model,
                    'device_id': device_id,
                    'available_capabilities': device.get_capabilities()
                })
            
            print(f"[@route:take_control] Using AV controller: {type(av_controller).__name__}")
            
            av_status = av_controller.get_status()
            print(f"[@route:take_control] AV controller status: {av_status}")
            
        except Exception as e:
            print(f"[@route:take_control] AV controller error: {e}")
            return jsonify({
                'success': False,
                'status': 'av_controller_error',
                'error': f'AV controller error: {str(e)}',
                'error_type': 'av_controller_exception',
                'device_model': device_model,
                'device_id': device_id
            })
        
        # Step 2: Check remote controller if device supports it
        remote_status = None
        
        if device_ip and device_model in ['android_mobile', 'android_tv']:
            try:
                remote_controller = get_controller(device_id, 'remote')
                
                if not remote_controller:
                    return jsonify({
                        'success': False,
                        'status': 'remote_controller_not_found',
                        'error': f'No remote controller object found for device {device_id or "default"}',
                        'error_type': 'configuration_error',
                        'device_model': device_model,
                        'device_id': device_id,
                        'av_status': av_status,
                        'available_controllers': list(host_device.get('controller_objects', {}).keys())
                    })
                
                print(f"[@route:take_control] Using remote controller: {type(remote_controller).__name__}")
                
                # IMPORTANT: Connect to the remote controller first before checking status
                print(f"[@route:take_control] Connecting to remote controller...")
                if not remote_controller.connect():
                    print(f"[@route:take_control] Failed to connect to remote controller")
                    return jsonify({
                        'success': False,
                        'status': 'remote_connection_failed',
                        'error': f'Host ADB connection failed: Failed to connect to remote controller',
                        'error_type': 'adb_connection_error',
                        'device_model': device_model,
                        'device_id': device_id,
                        'av_status': av_status,
                        'adb_details': {
                            'device_ip': device_ip,
                            'device_port': device_port,
                            'adb_status': 'connection_failed',
                            'device_status': 'unknown'
                        }
                    })
                
                # Get remote controller status
                remote_status = remote_controller.get_status()
                print(f"[@route:take_control] Remote controller status: {remote_status}")
                    
            except Exception as e:
                print(f"[@route:take_control] Remote controller error: {e}")
                return jsonify({
                    'success': False,
                    'status': 'remote_controller_error',
                    'error': f'Host ADB connection failed: Remote controller error - {str(e)}',
                    'error_type': 'remote_controller_exception',
                    'device_model': device_model,
                    'device_id': device_id,
                    'av_status': av_status
                })
        
        # Both controllers are ready
        print(f"[@route:take_control] SUCCESS: Take control succeeded for device: {device_name}")
        return jsonify({
            'success': True,
            'status': 'ready',
            'message': f'All controllers ready for {device_name} ({device_model})',
            'device_model': device_model,
            'device_id': device_id,
            'av_status': av_status,
            'remote_status': remote_status,
            'device': {
                'device_id': device_id,
                'device_name': device_name,
                'device_model': device_model,
                'device_ip': device_ip,
                'device_port': device_port
            }
        })
            
    except Exception as e:
        print(f"[@route:take_control] FAILED: Take control failed with error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to check controllers: {str(e)}'
        }), 500


@control_bp.route('/release-control', methods=['POST'])
def release_control():
    """Host-side release control - Release local controllers (no parameters needed)"""
    try:
        print(f"[@route:release_control] Host releasing control using own stored host_device")
        
        # Get own stored host_device object
        host_device = getattr(current_app, 'my_host_device', None)
        
        if not host_device:
            print(f"[@route:release_control] No host_device found, assuming already released")
            return jsonify({
                'success': True,
                'message': 'No active controllers to release'
            })
        
        # Extract device info from stored host_device
        if not isinstance(host_device, dict):
            return jsonify({
                'success': False,
                'error': f'Host device object is invalid type: {type(host_device).__name__}. Expected dict.'
            }), 500
            
        device_model = host_device.get('device_model', 'android_mobile')
        device_name = host_device.get('device_name')
        
        print(f"[@route:release_control] Host device releasing controllers for device: {device_name} ({device_model})")

        # Release resources (implementation depends on controller types)
        # For now, just return success as controllers are session-based
        
        return jsonify({
            'success': True,
            'message': f'Released control for {device_name} ({device_model})',
            'device_model': device_model,
            'device': {
                'device_name': device_name,
                'device_model': device_model
            }
        })
            
    except Exception as e:
        print(f"[@route:release_control] Error releasing control: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to release control: {str(e)}'
        }), 500


@control_bp.route('/devices', methods=['GET'])
def list_devices():
    """List all available devices on this host"""
    try:
        print(f"[@route:list_devices] Getting available devices")
        
        # Get own stored host_device object
        host_device = getattr(current_app, 'my_host_device', None)
        
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device object not initialized',
                'devices': []
            })
        
        # Get devices from host configuration
        devices = host_device.get('devices', [])
        
        if not devices:
            # Legacy single device mode
            device_info = {
                'device_id': 'default',
                'device_name': host_device.get('device_name', 'Unknown Device'),
                'device_model': host_device.get('device_model', 'unknown'),
                'device_ip': host_device.get('device_ip'),
                'device_port': host_device.get('device_port'),
                'video_device': None,
                'video_stream_path': None,
                'video_capture_path': None
            }
            devices = [device_info]
        
        # Get available controller types for each device
                    # Using already imported functions
        available_device_ids = list_available_devices()
        
        for device in devices:
            device_id = device.get('device_id')
            device['controllers'] = {}
            device['controller_status'] = 'unknown'
            
            # Check if controllers exist for this device
            if device_id in available_device_ids or device_id == 'default':
                # Check AV controller
                av_controller = get_controller(device_id, 'av')
                if av_controller:
                    device['controllers']['av'] = {
                        'available': True,
                        'type': type(av_controller).__name__
                    }
                
                # Check remote controller
                remote_controller = get_controller(device_id, 'remote')
                if remote_controller:
                    device['controllers']['remote'] = {
                        'available': True,
                        'type': type(remote_controller).__name__
                    }
                
                # Check verification controller
                verification_controller = get_controller(device_id, 'verification')
                if verification_controller:
                    device['controllers']['verification'] = {
                        'available': True,
                        'type': type(verification_controller).__name__
                    }
                
                # Check power controller
                power_controller = get_controller(device_id, 'power')
                if power_controller:
                    device['controllers']['power'] = {
                        'available': True,
                        'type': type(power_controller).__name__
                    }
                
                device['controller_status'] = 'ready' if device['controllers'] else 'no_controllers'
            else:
                device['controller_status'] = 'not_registered'
        
        return jsonify({
            'success': True,
            'host_name': host_device.get('host_name'),
            'device_count': len(devices),
            'devices': devices
        })
        
    except Exception as e:
        print(f"[@route:list_devices] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Error listing devices: {str(e)}',
            'devices': []
        }), 500

@control_bp.route('/controller-status', methods=['GET'])
def controller_status():
    """Get status of all controllers on this host"""
    try:
        print(f"[@route:controller_status] Getting controller status")
        
        # Get own stored host_device object
        host_device = getattr(current_app, 'my_host_device', None)
        
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device object not initialized',
                'controllers': {}
            })
        
        if not isinstance(host_device, dict):
            return jsonify({
                'success': False,
                'error': f'Host device object is invalid type: {type(host_device).__name__}. Expected dict.',
                'controllers': {}
            }), 500
            
        controller_status = {}
        controller_objects = host_device.get('controller_objects', {})
        
        # Check each controller
        for controller_name, controller_obj in controller_objects.items():
            try:
                if hasattr(controller_obj, 'get_status'):
                    status = controller_obj.get_status()
                    controller_status[controller_name] = {
                        'available': True,
                        'status': status,
                        'type': type(controller_obj).__name__
                    }
                else:
                    controller_status[controller_name] = {
                        'available': True,
                        'status': {'message': 'No status method available'},
                        'type': type(controller_obj).__name__
                    }
            except Exception as e:
                controller_status[controller_name] = {
                    'available': False,
                    'error': str(e),
                    'type': type(controller_obj).__name__
                }
        
        return jsonify({
            'success': True,
            'device': {
                'device_name': host_device.get('device_name'),
                'device_model': host_device.get('device_model')
            },
            'controllers': controller_status
        })
        
    except Exception as e:
        print(f"[@route:controller_status] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Error getting controller status: {str(e)}',
            'controllers': {}
        }), 500
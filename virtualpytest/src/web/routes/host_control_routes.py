"""
Host Control Routes

This module contains host-side control endpoints that:
- Handle controller status checking on host devices
- Manage local device control operations
- Execute device-specific control commands
- Use stored host_device objects for controller access
"""

from flask import Blueprint, request, jsonify, current_app

# Create blueprint
control_bp = Blueprint('host_control', __name__, url_prefix='/host')

# =====================================================
# HOST-SIDE DEVICE CONTROL ENDPOINTS
# =====================================================

@control_bp.route('/take-control', methods=['POST'])
def take_control():
    """Host-side take control - Use own stored host_device object (no parameters needed)"""
    try:
        print(f"[@route:take_control] Host checking controllers status using own stored host_device")
        
        # ✅ GET HOST_DEVICE FROM FLASK APP CONTEXT (contains all device info)
        host_device = getattr(current_app, 'my_host_device', None)
        
        if not host_device:
            return jsonify({
                'success': False,
                'status': 'host_device_not_initialized',
                'error': 'Host device object not initialized. Host may need to re-register.'
            })
        
        # Extract device info from stored host_device
        device_model = host_device.get('device_model', 'android_mobile')
        device_ip = host_device.get('device_ip')
        device_port = host_device.get('device_port', 5555)
        device_name = host_device.get('device_name')
        host_name = host_device.get('host_name')
        
        print(f"[@route:take_control] Host device: {host_name} managing device: {device_name} ({device_model})")
        print(f"[@route:take_control] Device connection: {device_ip}:{device_port}")
        print(f"[@route:take_control] Available controllers: {list(host_device.get('controller_objects', {}).keys())}")
        
        # Step 1: Check AV controller from own host_device
        try:
            from src.utils.host_utils import get_local_controller
            av_controller = get_local_controller('av')
            
            if not av_controller:
                return jsonify({
                    'success': False,
                    'status': 'av_controller_not_found',
                    'error': 'No AV controller object found in host_device',
                    'error_type': 'configuration_error',
                    'device_model': device_model,
                    'available_controllers': list(host_device.get('controller_objects', {}).keys())
                })
            
            print(f"[@route:take_control] Using AV controller: {type(av_controller).__name__}")
            
            av_status = av_controller.get_status()
            print(f"[@route:take_control] AV controller status: {av_status}")
            
            if not av_status.get('is_streaming', False):
                # Specific error message for stream service failure
                service_name = av_status.get('service_name', 'stream service')
                service_status = av_status.get('service_status', 'unknown')
                error_message = av_status.get('message', f'Stream service ({service_name}) is not active')
                
                return jsonify({
                    'success': False,
                    'status': 'stream_service_failed',
                    'error': f'Host stream status failed: {error_message}',
                    'error_type': 'stream_service_error',
                    'device_model': device_model,
                    'av_status': av_status,
                    'service_details': {
                        'service_name': service_name,
                        'service_status': service_status,
                        'systemctl_returncode': av_status.get('systemctl_returncode'),
                        'systemctl_output': av_status.get('systemctl_output')
                    }
                })
                
        except Exception as e:
            print(f"[@route:take_control] AV controller error: {e}")
            return jsonify({
                'success': False,
                'status': 'av_controller_error',
                'error': f'Host stream status failed: AV controller error - {str(e)}',
                'error_type': 'av_controller_exception',
                'device_model': device_model
            })
        
        # Step 2: Check Remote controller from own host_device for Android devices
        remote_status = {'adb_status': 'not_applicable'}
        
        if device_ip and device_model in ['android_mobile', 'android_tv']:
            try:
                remote_controller = get_local_controller('remote')
                
                if not remote_controller:
                    return jsonify({
                        'success': False,
                        'status': 'remote_controller_not_found',
                        'error': 'No remote controller object found in host_device',
                        'error_type': 'configuration_error',
                        'device_model': device_model,
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
                        'av_status': av_status,
                        'adb_details': {
                            'device_ip': device_ip,
                            'device_port': device_port,
                            'adb_status': 'connection_failed',
                            'device_status': 'unknown'
                        }
                    })
                
                print(f"[@route:take_control] Successfully connected to remote controller")
                
                # Now check the status after connecting
                remote_status = remote_controller.get_status()
                print(f"[@route:take_control] Remote controller status: {remote_status}")
                
                if not remote_status.get('adb_connected', False):
                    # Specific error message for ADB connection failure
                    adb_status = remote_status.get('adb_status', 'unknown')
                    device_status = remote_status.get('device_status', 'unknown')
                    error_message = remote_status.get('message', f'Device {device_ip}:{device_port} not connected via ADB')
                    
                    return jsonify({
                        'success': False,
                        'status': 'adb_connection_failed',
                        'error': f'Host ADB connection failed: {error_message}',
                        'error_type': 'adb_connection_error',
                        'device_model': device_model,
                        'av_status': av_status,
                        'remote_status': remote_status,
                        'adb_details': {
                            'device_ip': device_ip,
                            'device_port': device_port,
                            'adb_status': adb_status,
                            'device_status': device_status
                        }
                    })
                    
            except Exception as e:
                print(f"[@route:take_control] Remote controller error: {e}")
                return jsonify({
                    'success': False,
                    'status': 'remote_controller_error',
                    'error': f'Host ADB connection failed: Remote controller error - {str(e)}',
                    'error_type': 'remote_controller_exception',
                    'device_model': device_model,
                    'av_status': av_status
                })
        
        # Both controllers are ready
        print(f"[@route:take_control] All controllers ready for device: {device_name}")
        return jsonify({
            'success': True,
            'status': 'ready',
            'message': f'All controllers ready for {device_name} ({device_model})',
            'device_model': device_model,
            'av_status': av_status,
            'remote_status': remote_status,
            'device': {
                'device_name': device_name,
                'device_model': device_model,
                'device_ip': device_ip,
                'device_port': device_port
            }
        })
            
    except Exception as e:
        print(f"[@route:take_control] Error checking controllers: {str(e)}")
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
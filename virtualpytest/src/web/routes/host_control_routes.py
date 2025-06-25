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
    """Host-side take control - Check controllers for the requested device"""
    try:
        data = request.get_json() or {}
        device_id = data.get('device_id', 'default')  # Default device_id if not provided
        
        print(f"[@route:take_control] Host checking controllers for device: {device_id}")
        
        # Step 1: Check AV controller (optional)
        av_available = False
        try:
            av_controller = get_controller(device_id, 'av')
            
            if av_controller:
                print(f"[@route:take_control] Using AV controller: {type(av_controller).__name__}")
                av_status = av_controller.get_status()
                print(f"[@route:take_control] AV controller status: {av_status}")
                av_available = av_status.get('success', False)
            else:
                print(f"[@route:take_control] No AV controller found for device {device_id} - continuing without AV")
            
        except Exception as e:
            print(f"[@route:take_control] AV controller error (continuing without AV): {e}")
        
        # Step 2: Check remote controller (optional) - simplified for Appium
        remote_available = False
        try:
            remote_controller = get_controller(device_id, 'remote')
            
            if remote_controller:
                controller_type = type(remote_controller).__name__
                print(f"[@route:take_control] Using remote controller: {controller_type}")
                
                # For AppiumRemoteController, just check status without connecting
                if controller_type == 'AppiumRemoteController':
                    print(f"[@route:take_control] Appium controller - checking server status only")
                    remote_status = remote_controller.get_status()
                    remote_available = remote_status.get('success', False)
                    print(f"[@route:take_control] Appium server status: {remote_status}")
                else:
                    # For other controllers (AndroidMobile, etc.), connect as before
                    if not remote_controller.is_connected:
                        print(f"[@route:take_control] Connecting remote controller to device...")
                        connection_success = remote_controller.connect()
                        remote_available = connection_success
                    else:
                        print(f"[@route:take_control] Remote controller already connected")
                        remote_available = True
                    
                    if remote_available:
                        remote_status = remote_controller.get_status()
                        print(f"[@route:take_control] Remote controller status: {remote_status}")
                        remote_available = remote_status.get('success', False)
            else:
                print(f"[@route:take_control] No remote controller found for device {device_id} - continuing without remote")
                    
        except Exception as e:
            print(f"[@route:take_control] Remote controller error (continuing without remote): {e}")
        
        # Check if at least one controller is available
        if not av_available and not remote_available:
            return jsonify({
                'success': False,
                'error': f'No working controllers found for device {device_id}. Need at least AV or remote controller.'
            })
        
        # Controllers are ready - simple response
        available_controllers = []
        if av_available:
            available_controllers.append('av')
        if remote_available:
            available_controllers.append('remote')
            
        print(f"[@route:take_control] SUCCESS: Take control succeeded for device: {device_id} with controllers: {available_controllers}")
        return jsonify({
            'success': True,
            'available_controllers': available_controllers
        })
            
    except Exception as e:
        print(f"[@route:take_control] FAILED: Take control failed with error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
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
                'success': True
            })
        
        if not isinstance(host_device, dict):
            return jsonify({
                'success': False,
                'error': 'Host device object invalid'
            }), 500
            
        print(f"[@route:release_control] Host device releasing controllers")

        # Release resources (implementation depends on controller types)
        # For now, just return success as controllers are session-based
        
        return jsonify({
            'success': True
        })
            
    except Exception as e:
        print(f"[@route:release_control] Error releasing control: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
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
                'error': 'Host device object not initialized'
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
            'devices': devices
        })
        
    except Exception as e:
        print(f"[@route:list_devices] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
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
                'error': 'Host device object not initialized'
            })
        
        if not isinstance(host_device, dict):
            return jsonify({
                'success': False,
                'error': 'Host device object invalid'
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
            'controllers': controller_status
        })
        
    except Exception as e:
        print(f"[@route:controller_status] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
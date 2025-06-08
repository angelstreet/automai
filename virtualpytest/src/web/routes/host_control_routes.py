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
host_control_bp = Blueprint('host_control', __name__)

# =====================================================
# HOST-SIDE DEVICE CONTROL ENDPOINTS
# =====================================================

@host_control_bp.route('/take-control', methods=['POST'])
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
        
        # ✅ GET HOST_DEVICE FROM FLASK APP CONTEXT OR GLOBAL STORAGE
        host_device = getattr(current_app, 'my_host_device', None)
        
        # If not in Flask app context, get it directly from global storage
        if not host_device:
            try:
                from hostUtils import _pending_host_device
                host_device = _pending_host_device
                print(f"[@route:take_control] Using host_device from global storage")
            except Exception as global_error:
                print(f"[@route:take_control] Error accessing global host_device: {global_error}")
        else:
            print(f"[@route:take_control] Using host_device from Flask app context")
        
        if host_device:
            print(f"[@route:take_control] Host device details: {host_device.get('host_name')} - {host_device.get('device_name')}")
            print(f"[@route:take_control] Available controllers: {list(host_device.get('controller_objects', {}).keys())}")
        
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


@host_control_bp.route('/release-control', methods=['POST'])
def release_control():
    """Host-side release control - Release local controllers"""
    try:
        data = request.get_json() or {}
        device_model = data.get('device_model', 'android_mobile')
        session_id = data.get('session_id', 'default-session')
        
        print(f"[@route:release_control] Releasing host-side control")
        print(f"[@route:release_control] Device model: {device_model}")
        print(f"[@route:release_control] Session ID: {session_id}")
        
        # Get own stored host_device object
        host_device = getattr(current_app, 'my_host_device', None)
        
        if not host_device:
            print(f"[@route:release_control] No host_device found, assuming already released")
            return jsonify({
                'success': True,
                'message': 'No active controllers to release',
                'device_model': device_model,
                'session_id': session_id
            })
        
        print(f"[@route:release_control] Releasing controllers for device: {host_device.get('device_name')}")
        
        # Release AV controller if available
        av_release_success = True
        try:
            av_controller = host_device.get('controller_objects', {}).get('av')
            if av_controller and hasattr(av_controller, 'release_control'):
                av_controller.release_control()
                print(f"[@route:release_control] AV controller released")
        except Exception as e:
            print(f"[@route:release_control] Error releasing AV controller: {e}")
            av_release_success = False
        
        # Release Remote controller if available
        remote_release_success = True
        try:
            remote_controller = host_device.get('controller_objects', {}).get('remote')
            if remote_controller and hasattr(remote_controller, 'release_control'):
                remote_controller.release_control()
                print(f"[@route:release_control] Remote controller released")
        except Exception as e:
            print(f"[@route:release_control] Error releasing remote controller: {e}")
            remote_release_success = False
        
        overall_success = av_release_success and remote_release_success
        
        return jsonify({
            'success': overall_success,
            'message': 'Host-side control released',
            'device_model': device_model,
            'session_id': session_id,
            'av_released': av_release_success,
            'remote_released': remote_release_success
        })
        
    except Exception as e:
        print(f"[@route:release_control] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Error releasing host-side control: {str(e)}'
        }), 500


@host_control_bp.route('/controller-status', methods=['GET'])
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
            'host_device': {
                'host_name': host_device.get('host_name'),
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

    """Debug endpoint to check host_device availability"""
    try:
        # Try to transfer pending host_device first
        try:
            from hostUtils import transfer_pending_host_device_to_app
            transfer_result = transfer_pending_host_device_to_app()
            print(f"[@route:debug_host_device] Transfer result: {transfer_result}")
        except Exception as transfer_error:
            print(f"[@route:debug_host_device] Transfer error: {transfer_error}")
        
        # Check if host_device is available
        host_device = getattr(current_app, 'my_host_device', None)
        
        if host_device:
            return jsonify({
                'success': True,
                'host_device_available': True,
                'host_name': host_device.get('host_name'),
                'device_name': host_device.get('device_name'),
                'device_model': host_device.get('device_model'),
                'available_controllers': list(host_device.get('controller_objects', {}).keys())
            })
        else:
            return jsonify({
                'success': True,
                'host_device_available': False,
                'message': 'Host device object not found in Flask app context'
            })
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500 
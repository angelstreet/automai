"""
Power Management Routes (Abstract)

Session-based power control with abstract power controller methods.
Routes work with any power controller type (Tapo, network, etc.)
"""

from flask import Blueprint, request, jsonify, current_app
import os

server_power_bp = Blueprint('server_power', __name__, url_prefix='/server/power')

@server_power_bp.route('/takeControl', methods=['POST'])
def power_take_control():
    """Take control of power device using abstract power controller."""
    try:
        print(f"[@route:power:take-control] Starting power take control")
        
        # Get the already-instantiated power controller from host device
        host_device = getattr(current_app, 'my_host_device', None)
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device object not initialized. Host may need to re-register.'
            }), 500
        
        power_controller = host_device.get('controller_objects', {}).get('power')
        if not power_controller:
            return jsonify({
                'success': False,
                'error': 'Power controller not available on this host'
            }), 400
        
        # Use abstract controller method
        if power_controller.connect():
            print(f"[@route:power:take-control] Successfully connected to power controller")
            return jsonify({
                'success': True,
                'message': 'Successfully connected to power controller'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to connect to power controller'
            }), 400
            
    except Exception as e:
        print(f"[@route:power:take-control] ERROR: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Connection error: {str(e)}'
        }), 500

@server_power_bp.route('/releaseControl', methods=['POST'])
def power_release_control():
    """Release control of power device using abstract power controller."""
    try:
        print(f"[@route:power:release-control] Starting power release control")
        
        # Get the already-instantiated power controller from host device
        host_device = getattr(current_app, 'my_host_device', None)
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device object not initialized'
            }), 500
        
        power_controller = host_device.get('controller_objects', {}).get('power')
        if power_controller:
            power_controller.disconnect()
            
        print(f"[@route:power:release-control] Power control released")
        return jsonify({
            'success': True,
            'message': 'Power control released'
        })
        
    except Exception as e:
        print(f"[@route:power:release-control] ERROR: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Release error: {str(e)}'
        }), 500

@server_power_bp.route('/status', methods=['GET'])
def get_power_status():
    """Get power controller session status."""
    try:
        print(f"[@route:power:status] Checking power status")
        
        # Get the already-instantiated power controller from host device
        host_device = getattr(current_app, 'my_host_device', None)
        if not host_device:
            return jsonify({
                'success': True,
                'connected': False,
                'controller_status': {}
            })
        
        power_controller = host_device.get('controller_objects', {}).get('power')
        if power_controller:
            controller_status = power_controller.get_status()
            return jsonify({
                'success': True,
                'connected': True,
                'controller_status': controller_status
            })
        else:
            return jsonify({
                'success': True,
                'connected': False,
                'controller_status': {}
            })
            
    except Exception as e:
        print(f"[@route:power:status] ERROR: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Status check error: {str(e)}'
        }), 500

@server_power_bp.route('/powerStatus', methods=['GET'])
def get_power_state():
    """Get current power state using abstract power controller."""
    try:
        print(f"[@route:power:power-status] Checking power state")
        
        # Get the already-instantiated power controller from host device
        host_device = getattr(current_app, 'my_host_device', None)
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device object not initialized'
            }), 500
        
        power_controller = host_device.get('controller_objects', {}).get('power')
        if not power_controller:
            return jsonify({
                'success': False,
                'error': 'No active power controller connection'
            }), 400
        
        power_status = power_controller.get_power_status()
        
        return jsonify({
            'success': True,
            'power_status': power_status
        })
        
    except Exception as e:
        print(f"[@route:power:power-status] ERROR: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Power status error: {str(e)}'
        }), 500

@server_power_bp.route('/powerOn', methods=['POST'])
def power_on():
    """Turn power on using abstract power controller."""
    try:
        print(f"[@route:power:power-on] Executing power on")
        
        # Get the already-instantiated power controller from host device
        host_device = getattr(current_app, 'my_host_device', None)
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device object not initialized'
            }), 500
        
        power_controller = host_device.get('controller_objects', {}).get('power')
        if not power_controller:
            return jsonify({
                'success': False,
                'error': 'No active power controller connection'
            }), 400
        
        success = power_controller.power_on(timeout=10.0)
        
        if success:
            print(f"[@route:power:power-on] Power on successful")
            return jsonify({
                'success': True,
                'message': 'Power on successful'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to power on'
            }), 400
            
    except Exception as e:
        print(f"[@route:power:power-on] ERROR: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Power on error: {str(e)}'
        }), 500

@server_power_bp.route('/powerOff', methods=['POST'])
def power_off():
    """Turn power off using abstract power controller."""
    try:
        print(f"[@route:power:power-off] Executing power off")
        
        # Get the already-instantiated power controller from host device
        host_device = getattr(current_app, 'my_host_device', None)
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device object not initialized'
            }), 500
        
        power_controller = host_device.get('controller_objects', {}).get('power')
        if not power_controller:
            return jsonify({
                'success': False,
                'error': 'No active power controller connection'
            }), 400
        
        success = power_controller.power_off(timeout=5.0)
        
        if success:
            print(f"[@route:power:power-off] Power off successful")
            return jsonify({
                'success': True,
                'message': 'Power off successful'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to power off'
            }), 400
            
    except Exception as e:
        print(f"[@route:power:power-off] ERROR: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Power off error: {str(e)}'
        }), 500

@server_power_bp.route('/reboot', methods=['POST'])
def power_reboot():
    """Reboot power device using abstract power controller."""
    try:
        print(f"[@route:power:reboot] Executing reboot")
        
        # Get the already-instantiated power controller from host device
        host_device = getattr(current_app, 'my_host_device', None)
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device object not initialized'
            }), 500
        
        power_controller = host_device.get('controller_objects', {}).get('power')
        if not power_controller:
            return jsonify({
                'success': False,
                'error': 'No active power controller connection'
            }), 400
        
        success = power_controller.reboot(timeout=20.0)
        
        if success:
            print(f"[@route:power:reboot] Reboot successful")
            return jsonify({
                'success': True,
                'message': 'Power device rebooted successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to reboot power device'
            }), 400
            
    except Exception as e:
        print(f"[@route:power:reboot] ERROR: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Reboot error: {str(e)}'
        }), 500

@server_power_bp.route('/toggle', methods=['POST'])
def power_toggle():
    """Toggle power state (on->off or off->on) using abstract power controller."""
    try:
        print(f"[@route:power:toggle] Checking current power state")
        
        # Get the already-instantiated power controller from host device
        host_device = getattr(current_app, 'my_host_device', None)
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device object not initialized'
            }), 500
        
        power_controller = host_device.get('controller_objects', {}).get('power')
        if not power_controller:
            return jsonify({
                'success': False,
                'error': 'No active power controller connection'
            }), 400
        
        # Get current power state
        power_status = power_controller.get_power_status()
        current_state = power_status.get('power_state', 'unknown')
        
        print(f"[@route:power:toggle] Current state: {current_state}")
        
        # Toggle based on current state
        if current_state == 'on':
            print(f"[@route:power:toggle] Toggling to OFF")
            success = power_controller.power_off(timeout=5.0)
            new_state = 'off' if success else current_state
            message = 'Power device powered off successfully' if success else 'Failed to power off power device'
        elif current_state == 'off':
            print(f"[@route:power:toggle] Toggling to ON")
            success = power_controller.power_on(timeout=10.0)
            new_state = 'on' if success else current_state
            message = 'Power device powered on successfully' if success else 'Failed to power on power device'
        else:
            # Unknown state, try to turn on
            print(f"[@route:power:toggle] Unknown state, attempting to power ON")
            success = power_controller.power_on(timeout=10.0)
            new_state = 'on' if success else 'unknown'
            message = 'Power device powered on successfully' if success else 'Failed to power on power device'
        
        if success:
            return jsonify({
                'success': True,
                'message': message,
                'previous_state': current_state,
                'new_state': new_state
            })
        else:
            return jsonify({
                'success': False,
                'error': message,
                'current_state': current_state
            }), 400
            
    except Exception as e:
        print(f"[@route:power:toggle] ERROR: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Toggle error: {str(e)}'
        }), 500 
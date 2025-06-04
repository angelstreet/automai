"""
USB Power Management Routes

Session-based power control with take-control, release-control, and command execution
"""

from flask import Blueprint, request, jsonify
import os

power_bp = Blueprint('power', __name__)

@power_bp.route('/api/virtualpytest/usb-power/defaults', methods=['GET'])
def get_usb_power_defaults():
    """Get default connection values for USB Power from environment variables."""
    try:
        defaults = {
            'host_ip': os.getenv('HOST_IP', ''),
            'host_username': os.getenv('HOST_USERNAME', ''),
            'host_password': os.getenv('HOST_PASSWORD', ''),
            'host_port': os.getenv('HOST_PORT', '22'),
            'usb_hub': os.getenv('USB_HUB', '1')
        }
        
        return jsonify({
            'success': True,
            'defaults': defaults
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to get defaults: {str(e)}'
        }), 500

@power_bp.route('/api/virtualpytest/usb-power/take-control', methods=['POST'])
def usb_power_take_control():
    """Take control of USB Power device via SSH."""
    try:
        import app
        from controllers.power.usb_power import USBPowerController
        
        data = request.get_json()
        print(f"[@api:usb-power:take-control] Connection data received")
        
        # Validate required fields
        required_fields = ['host_ip', 'host_username', 'host_password']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        # Release any existing session first
        if hasattr(app, 'usb_power_controller') and app.usb_power_controller:
            try:
                app.usb_power_controller.disconnect()
            except:
                pass
        
        # Create controller instance with connection parameters
        controller = USBPowerController(
            device_name="USB Power Device",
            host_ip=data.get('host_ip'),
            host_username=data.get('host_username'),
            host_password=data.get('host_password'),
            host_port=int(data.get('host_port', 22)),
            usb_hub=int(data.get('usb_hub', 1))
        )
        
        # Attempt connection
        if controller.connect():
            # Store controller globally for subsequent commands
            app.usb_power_controller = controller
            
            return jsonify({
                'success': True,
                'message': f'Successfully connected to USB Power host {data.get("host_ip")}'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to connect to SSH host'
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Connection error: {str(e)}'
        }), 500

@power_bp.route('/api/virtualpytest/usb-power/release-control', methods=['POST'])
def usb_power_release_control():
    """Release control of USB Power device."""
    try:
        import app
        
        if hasattr(app, 'usb_power_controller') and app.usb_power_controller:
            app.usb_power_controller.disconnect()
            app.usb_power_controller = None
            
        return jsonify({
            'success': True,
            'message': 'USB Power control released'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Release error: {str(e)}'
        }), 500

@power_bp.route('/api/virtualpytest/usb-power/status', methods=['GET'])
def get_usb_power_status():
    """Get USB Power session status."""
    try:
        import app
        
        if hasattr(app, 'usb_power_controller') and app.usb_power_controller:
            controller_status = app.usb_power_controller.get_status()
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
        return jsonify({
            'success': False,
            'error': f'Status check error: {str(e)}'
        }), 500

@power_bp.route('/api/virtualpytest/usb-power/power-status', methods=['GET'])
def get_usb_power_state():
    """Get current USB hub power state."""
    try:
        import app
        
        if not hasattr(app, 'usb_power_controller') or not app.usb_power_controller:
            return jsonify({
                'success': False,
                'error': 'No active USB Power connection. Please connect first.'
            }), 400
        
        print(f"[@api:usb-power:power-status] Checking power status")
        
        power_status = app.usb_power_controller.get_power_status()
        
        return jsonify({
            'success': True,
            'power_status': power_status
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Power status error: {str(e)}'
        }), 500

@power_bp.route('/api/virtualpytest/usb-power/power-on', methods=['POST'])
def usb_power_on():
    """Turn USB power on using active session."""
    try:
        import app
        
        if not hasattr(app, 'usb_power_controller') or not app.usb_power_controller:
            return jsonify({
                'success': False,
                'error': 'No active USB Power connection. Please connect first.'
            }), 400
        
        print(f"[@api:usb-power:power-on] Executing power on")
        
        success = app.usb_power_controller.power_on(timeout=10.0)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'USB hub powered on successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to power on USB hub'
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Power on error: {str(e)}'
        }), 500

@power_bp.route('/api/virtualpytest/usb-power/power-off', methods=['POST'])
def usb_power_off():
    """Turn USB power off using active session."""
    try:
        import app
        
        if not hasattr(app, 'usb_power_controller') or not app.usb_power_controller:
            return jsonify({
                'success': False,
                'error': 'No active USB Power connection. Please connect first.'
            }), 400
        
        print(f"[@api:usb-power:power-off] Executing power off")
        
        success = app.usb_power_controller.power_off(timeout=5.0)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'USB hub powered off successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to power off USB hub'
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Power off error: {str(e)}'
        }), 500

@power_bp.route('/api/virtualpytest/usb-power/reboot', methods=['POST'])
def usb_power_reboot():
    """Reboot USB device using active session."""
    try:
        import app
        
        if not hasattr(app, 'usb_power_controller') or not app.usb_power_controller:
            return jsonify({
                'success': False,
                'error': 'No active USB Power connection. Please connect first.'
            }), 400
        
        print(f"[@api:usb-power:reboot] Executing reboot")
        
        success = app.usb_power_controller.reboot(timeout=20.0)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'USB hub rebooted successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to reboot USB hub'
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Reboot error: {str(e)}'
        }), 500

@power_bp.route('/api/virtualpytest/usb-power/toggle', methods=['POST'])
def usb_power_toggle():
    """Toggle USB power state (on->off or off->on)."""
    try:
        import app
        
        if not hasattr(app, 'usb_power_controller') or not app.usb_power_controller:
            return jsonify({
                'success': False,
                'error': 'No active USB Power connection. Please connect first.'
            }), 400
        
        print(f"[@api:usb-power:toggle] Checking current power state")
        
        # Get current power state
        power_status = app.usb_power_controller.get_power_status()
        current_state = power_status.get('power_state', 'unknown')
        
        print(f"[@api:usb-power:toggle] Current state: {current_state}")
        
        # Toggle based on current state
        if current_state == 'on':
            print(f"[@api:usb-power:toggle] Toggling to OFF")
            success = app.usb_power_controller.power_off(timeout=5.0)
            new_state = 'off' if success else current_state
            message = 'USB hub powered off successfully' if success else 'Failed to power off USB hub'
        elif current_state == 'off':
            print(f"[@api:usb-power:toggle] Toggling to ON")
            success = app.usb_power_controller.power_on(timeout=10.0)
            new_state = 'on' if success else current_state
            message = 'USB hub powered on successfully' if success else 'Failed to power on USB hub'
        else:
            # Unknown state, try to turn on
            print(f"[@api:usb-power:toggle] Unknown state, attempting to power ON")
            success = app.usb_power_controller.power_on(timeout=10.0)
            new_state = 'on' if success else 'unknown'
            message = 'USB hub powered on successfully' if success else 'Failed to power on USB hub'
        
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
        return jsonify({
            'success': False,
            'error': f'Toggle error: {str(e)}'
        }), 500 
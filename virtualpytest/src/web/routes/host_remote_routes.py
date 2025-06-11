"""
Host Remote Routes

This module contains host-side remote control endpoints that:
- Handle direct remote control operations on host devices
- Execute remote commands using instantiated remote controllers
- Support Android TV, Android Mobile, IR, and Bluetooth remotes
- Provide all remote controller methods as HTTP endpoints
"""

from flask import Blueprint, request, jsonify, current_app

# Create blueprint
remote_bp = Blueprint('host_remote', __name__, url_prefix='/host/remote')

# =====================================================
# REMOTE CONTROLLER ENDPOINTS
# =====================================================

@remote_bp.route('/screenshot', methods=['POST'])
def take_screenshot():
    """Take a screenshot using the remote controller."""
    try:
        print(f"[@route:host_remote:take_screenshot] Taking screenshot")
        
        # Get host device object with instantiated controllers
        host_device = getattr(current_app, 'my_host_device', None)
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device not initialized'
            }), 500
        
        # Get the remote controller
        remote_controller = host_device.get('controller_objects', {}).get('remote')
        if not remote_controller:
            return jsonify({
                'success': False,
                'error': 'Remote controller not available'
            }), 400
        
        # Take screenshot
        success, screenshot_data, error = remote_controller.take_screenshot()
        
        if success:
            return jsonify({
                'success': True,
                'screenshot': screenshot_data
            })
        else:
            return jsonify({
                'success': False,
                'error': error or 'Screenshot failed'
            }), 400
            
    except Exception as e:
        print(f"[@route:host_remote:take_screenshot] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Screenshot error: {str(e)}'
        }), 500

@remote_bp.route('/command', methods=['POST'])
def execute_command():
    """Execute a remote command using the remote controller."""
    try:
        data = request.get_json()
        command = data.get('command')
        params = data.get('params', {})
        
        print(f"[@route:host_remote:execute_command] Executing command: {command} with params: {params}")
        
        if not command:
            return jsonify({
                'success': False,
                'error': 'Command is required'
            }), 400
        
        # Get host device object with instantiated controllers
        host_device = getattr(current_app, 'my_host_device', None)
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device not initialized'
            }), 500
        
        # Get the remote controller
        remote_controller = host_device.get('controller_objects', {}).get('remote')
        if not remote_controller:
            return jsonify({
                'success': False,
                'error': 'Remote controller not available'
            }), 400
        
        # Execute command based on type
        success = False
        result = None
        
        if command == 'press_key':
            key = params.get('key')
            if key:
                success = remote_controller.press_key(key)
            else:
                return jsonify({
                    'success': False,
                    'error': 'Key parameter is required for press_key command'
                }), 400
                
        elif command == 'input_text':
            text = params.get('text')
            if text:
                success = remote_controller.input_text(text)
            else:
                return jsonify({
                    'success': False,
                    'error': 'Text parameter is required for input_text command'
                }), 400
                
        elif command == 'launch_app':
            package = params.get('package')
            if package:
                success = remote_controller.launch_app(package)
            else:
                return jsonify({
                    'success': False,
                    'error': 'Package parameter is required for launch_app command'
                }), 400
                
        elif command == 'close_app':
            package = params.get('package')
            if package:
                success = remote_controller.close_app(package)
            else:
                return jsonify({
                    'success': False,
                    'error': 'Package parameter is required for close_app command'
                }), 400
                
        elif command == 'coordinate_tap':
            x = params.get('x')
            y = params.get('y')
            if x is not None and y is not None:
                success = remote_controller.tap_coordinates(int(x), int(y))
            else:
                return jsonify({
                    'success': False,
                    'error': 'X and Y coordinates are required for coordinate_tap command'
                }), 400
                
        else:
            return jsonify({
                'success': False,
                'error': f'Unknown command: {command}'
            }), 400
        
        if success:
            return jsonify({
                'success': True,
                'message': f'Command {command} executed successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': f'Command {command} failed'
            }), 400
            
    except Exception as e:
        print(f"[@route:host_remote:execute_command] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Command execution error: {str(e)}'
        }), 500

@remote_bp.route('/screenshot-and-dump-ui', methods=['POST'])
def screenshot_and_dump_ui():
    """Take screenshot and dump UI elements (Android Mobile specific)."""
    try:
        print(f"[@route:host_remote:screenshot_and_dump_ui] Taking screenshot and dumping UI")
        
        # Get host device object with instantiated controllers
        host_device = getattr(current_app, 'my_host_device', None)
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device not initialized'
            }), 500
        
        # Get the remote controller
        remote_controller = host_device.get('controller_objects', {}).get('remote')
        if not remote_controller:
            return jsonify({
                'success': False,
                'error': 'Remote controller not available'
            }), 400
        
        # Check if controller supports UI dumping
        if not hasattr(remote_controller, 'dump_ui_elements'):
            return jsonify({
                'success': False,
                'error': 'UI dumping not supported by this remote controller'
            }), 400
        
        # Take screenshot first
        screenshot_success, screenshot_data, screenshot_error = remote_controller.take_screenshot()
        
        # Dump UI elements
        ui_success, elements, ui_error = remote_controller.dump_ui_elements()
        
        # Return results
        response = {
            'success': screenshot_success and ui_success
        }
        
        if screenshot_success:
            response['screenshot'] = screenshot_data
        
        if ui_success:
            # Convert AndroidElement objects to dictionaries
            elements_data = []
            for element in elements:
                elements_data.append({
                    'id': element.id,
                    'tag': element.tag,
                    'text': element.text,
                    'resourceId': element.resource_id,
                    'contentDesc': element.content_desc,
                    'className': element.class_name,
                    'bounds': element.bounds
                })
            response['elements'] = elements_data
        
        if not response['success']:
            error_msg = []
            if not screenshot_success:
                error_msg.append(f"Screenshot: {screenshot_error}")
            if not ui_success:
                error_msg.append(f"UI dump: {ui_error}")
            response['error'] = "; ".join(error_msg)
            return jsonify(response), 400
        
        return jsonify(response)
            
    except Exception as e:
        print(f"[@route:host_remote:screenshot_and_dump_ui] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Screenshot and UI dump error: {str(e)}'
        }), 500

@remote_bp.route('/get-apps', methods=['POST'])
def get_installed_apps():
    """Get list of installed apps (Android Mobile specific)."""
    try:
        print(f"[@route:host_remote:get_installed_apps] Getting installed apps")
        
        # Get host device object with instantiated controllers
        host_device = getattr(current_app, 'my_host_device', None)
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device not initialized'
            }), 500
        
        # Get the remote controller
        remote_controller = host_device.get('controller_objects', {}).get('remote')
        if not remote_controller:
            return jsonify({
                'success': False,
                'error': 'Remote controller not available'
            }), 400
        
        # Check if controller supports app listing
        if not hasattr(remote_controller, 'get_installed_apps'):
            return jsonify({
                'success': False,
                'error': 'App listing not supported by this remote controller'
            }), 400
        
        # Get installed apps
        apps = remote_controller.get_installed_apps()
        
        # Convert AndroidApp objects to dictionaries
        apps_data = []
        for app in apps:
            apps_data.append({
                'packageName': app.package_name,
                'label': app.label
            })
        
        return jsonify({
            'success': True,
            'apps': apps_data
        })
            
    except Exception as e:
        print(f"[@route:host_remote:get_installed_apps] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Get apps error: {str(e)}'
        }), 500

@remote_bp.route('/click-element', methods=['POST'])
def click_element():
    """Click on a UI element (Android Mobile specific)."""
    try:
        data = request.get_json()
        element_id = data.get('elementId')
        
        print(f"[@route:host_remote:click_element] Clicking element ID: {element_id}")
        
        if element_id is None:
            return jsonify({
                'success': False,
                'error': 'Element ID is required'
            }), 400
        
        # Get host device object with instantiated controllers
        host_device = getattr(current_app, 'my_host_device', None)
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device not initialized'
            }), 500
        
        # Get the remote controller
        remote_controller = host_device.get('controller_objects', {}).get('remote')
        if not remote_controller:
            return jsonify({
                'success': False,
                'error': 'Remote controller not available'
            }), 400
        
        # Check if controller supports element clicking
        if not hasattr(remote_controller, 'last_ui_elements'):
            return jsonify({
                'success': False,
                'error': 'Element clicking not supported by this remote controller'
            }), 400
        
        # Find the element by ID
        element = None
        for el in remote_controller.last_ui_elements:
            if el.id == element_id:
                element = el
                break
        
        if not element:
            return jsonify({
                'success': False,
                'error': f'Element with ID {element_id} not found. Please dump UI elements first.'
            }), 400
        
        # Click the element
        success = remote_controller.click_element(element)
        
        if success:
            return jsonify({
                'success': True,
                'message': f'Successfully clicked element {element_id}'
            })
        else:
            return jsonify({
                'success': False,
                'error': f'Failed to click element {element_id}'
            }), 400
            
    except Exception as e:
        print(f"[@route:host_remote:click_element] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Element click error: {str(e)}'
        }), 500

@remote_bp.route('/tap-coordinates', methods=['POST'])
def tap_coordinates():
    """Tap at specific screen coordinates."""
    try:
        data = request.get_json()
        x = data.get('x')
        y = data.get('y')
        
        print(f"[@route:host_remote:tap_coordinates] Tapping at coordinates: ({x}, {y})")
        
        if x is None or y is None:
            return jsonify({
                'success': False,
                'error': 'X and Y coordinates are required'
            }), 400
        
        # Get host device object with instantiated controllers
        host_device = getattr(current_app, 'my_host_device', None)
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device not initialized'
            }), 500
        
        # Get the remote controller
        remote_controller = host_device.get('controller_objects', {}).get('remote')
        if not remote_controller:
            return jsonify({
                'success': False,
                'error': 'Remote controller not available'
            }), 400
        
        # Check if controller supports coordinate tapping
        if not hasattr(remote_controller, 'tap_coordinates'):
            return jsonify({
                'success': False,
                'error': 'Coordinate tapping not supported by this remote controller'
            }), 400
        
        # Tap at coordinates
        success = remote_controller.tap_coordinates(int(x), int(y))
        
        if success:
            return jsonify({
                'success': True,
                'message': f'Successfully tapped at coordinates ({x}, {y})'
            })
        else:
            return jsonify({
                'success': False,
                'error': f'Failed to tap at coordinates ({x}, {y})'
            }), 400
            
    except Exception as e:
        print(f"[@route:host_remote:tap_coordinates] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Coordinate tap error: {str(e)}'
        }), 500

@remote_bp.route('/connect', methods=['POST'])
def connect_remote():
    """Connect to remote device (IR/Bluetooth specific)."""
    try:
        print(f"[@route:host_remote:connect] Connecting to remote device")
        
        # Get host device object with instantiated controllers
        host_device = getattr(current_app, 'my_host_device', None)
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device not initialized'
            }), 500
        
        # Get the remote controller
        remote_controller = host_device.get('controller_objects', {}).get('remote')
        if not remote_controller:
            return jsonify({
                'success': False,
                'error': 'Remote controller not available'
            }), 400
        
        # Connect to remote device
        success = remote_controller.connect()
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Successfully connected to remote device'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to connect to remote device'
            }), 400
            
    except Exception as e:
        print(f"[@route:host_remote:connect] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Remote connection error: {str(e)}'
        }), 500

@remote_bp.route('/disconnect', methods=['POST'])
def disconnect_remote():
    """Disconnect from remote device (IR/Bluetooth specific)."""
    try:
        print(f"[@route:host_remote:disconnect] Disconnecting from remote device")
        
        # Get host device object with instantiated controllers
        host_device = getattr(current_app, 'my_host_device', None)
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device not initialized'
            }), 500
        
        # Get the remote controller
        remote_controller = host_device.get('controller_objects', {}).get('remote')
        if not remote_controller:
            return jsonify({
                'success': False,
                'error': 'Remote controller not available'
            }), 400
        
        # Disconnect from remote device
        success = remote_controller.disconnect()
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Successfully disconnected from remote device'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to disconnect from remote device'
            }), 400
            
    except Exception as e:
        print(f"[@route:host_remote:disconnect] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Remote disconnection error: {str(e)}'
        }), 500

@remote_bp.route('/status', methods=['GET'])
def get_remote_status():
    """Get remote controller status."""
    try:
        print(f"[@route:host_remote:get_remote_status] Getting remote controller status")
        
        # Get host device object with instantiated controllers
        host_device = getattr(current_app, 'my_host_device', None)
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device not initialized'
            }), 500
        
        # Get the remote controller
        remote_controller = host_device.get('controller_objects', {}).get('remote')
        if not remote_controller:
            return jsonify({
                'success': False,
                'error': 'Remote controller not available'
            }), 400
        
        # Get controller status
        status = remote_controller.get_status()
        
        return jsonify({
            'success': True,
            'status': status
        })
            
    except Exception as e:
        print(f"[@route:host_remote:get_remote_status] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Status error: {str(e)}'
        }), 500 
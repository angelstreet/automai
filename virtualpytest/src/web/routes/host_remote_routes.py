"""
Host Remote Routes

Host-side remote control endpoints that execute remote commands using instantiated remote controllers.
"""

from flask import Blueprint, request, jsonify, current_app
from src.utils.host_utils import get_local_controller

# Create blueprint
remote_bp = Blueprint('host_remote', __name__, url_prefix='/host/remote')

# =====================================================
# REMOTE CONTROLLER ENDPOINTS
# =====================================================

@remote_bp.route('/take-screenshot', methods=['POST'])
def take_screenshot():
    """Take a screenshot using the remote controller."""
    try:
        print(f"[@route:host_remote:take_screenshot] Taking screenshot")
        
        host_device = getattr(current_app, 'my_host_device', None)
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device object not initialized. Host may need to re-register.'
            }), 404
        
        remote_controller = get_local_controller('remote')
        if not remote_controller:
            return jsonify({
                'success': False,
                'error': 'No remote controller object found in own host_device',
                'available_controllers': list(host_device.get('controller_objects', {}).keys())
            }), 404
        
        print(f"[@route:host_remote:take_screenshot] Using own remote controller: {type(remote_controller).__name__}")
        
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

@remote_bp.route('/screenshot-and-dump', methods=['POST'])
def screenshot_and_dump():
    """Take screenshot and dump UI elements."""
    try:
        print(f"[@route:host_remote:screenshot_and_dump] Taking screenshot and dumping UI")
        
        host_device = getattr(current_app, 'my_host_device', None)
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device object not initialized. Host may need to re-register.'
            }), 404
        
        remote_controller = get_local_controller('remote')
        if not remote_controller:
            return jsonify({
                'success': False,
                'error': 'No remote controller object found in own host_device',
                'available_controllers': list(host_device.get('controller_objects', {}).keys())
            }), 404
        
        print(f"[@route:host_remote:screenshot_and_dump] Using own remote controller: {type(remote_controller).__name__}")
        
        screenshot_success, screenshot_data, screenshot_error = remote_controller.take_screenshot()
        
        ui_success, elements, ui_error = False, [], None
        if hasattr(remote_controller, 'dump_ui_elements'):
            ui_success, elements, ui_error = remote_controller.dump_ui_elements()
            
            # Store elements in controller for subsequent click operations
            if ui_success and elements:
                remote_controller.last_ui_elements = elements
                print(f"[@route:host_remote:screenshot_and_dump] Stored {len(elements)} elements in controller for clicking")
        
        response = {
            'success': screenshot_success and (ui_success or not hasattr(remote_controller, 'dump_ui_elements'))
        }
        
        if screenshot_success:
            response['screenshot'] = screenshot_data
        
        if ui_success:
            elements_data = []
            for element in elements:
                # Parse bounds string to object format expected by frontend
                bounds_obj = {'left': 0, 'top': 0, 'right': 0, 'bottom': 0}
                if element.bounds and element.bounds != '':
                    import re
                    # Bounds format: [x1,y1][x2,y2]
                    bounds_match = re.match(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]', element.bounds)
                    if bounds_match:
                        x1, y1, x2, y2 = map(int, bounds_match.groups())
                        bounds_obj = {'left': x1, 'top': y1, 'right': x2, 'bottom': y2}
                
                elements_data.append({
                    'id': element.id,
                    'text': element.text,
                    'className': element.class_name,
                    'contentDesc': element.content_desc,
                    'package': element.resource_id,
                    'bounds': bounds_obj,
                    'clickable': element.clickable,
                    'enabled': element.enabled
                })
            response['elements'] = elements_data
        
        if not response['success']:
            error_messages = []
            if not screenshot_success:
                error_messages.append(f"Screenshot: {screenshot_error}")
            if not ui_success and hasattr(remote_controller, 'dump_ui_elements'):
                error_messages.append(f"UI dump: {ui_error}")
            response['error'] = "; ".join(error_messages)
            return jsonify(response), 400
        
        return jsonify(response)
            
    except Exception as e:
        print(f"[@route:host_remote:screenshot_and_dump] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Screenshot and UI dump error: {str(e)}'
        }), 500

@remote_bp.route('/get-apps', methods=['POST'])
def get_apps():
    """Get list of installed apps."""
    try:
        print(f"[@route:host_remote:get_apps] Getting installed apps")
        
        host_device = getattr(current_app, 'my_host_device', None)
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device object not initialized. Host may need to re-register.'
            }), 404
        
        remote_controller = get_local_controller('remote')
        if not remote_controller:
            return jsonify({
                'success': False,
                'error': 'No remote controller object found in own host_device',
                'available_controllers': list(host_device.get('controller_objects', {}).keys())
            }), 404
        
        print(f"[@route:host_remote:get_apps] Using own remote controller: {type(remote_controller).__name__}")
        
        if not hasattr(remote_controller, 'get_installed_apps'):
            return jsonify({
                'success': False,
                'error': 'App listing not supported by this remote controller'
            }), 400
        
        apps = remote_controller.get_installed_apps()
        
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
        print(f"[@route:host_remote:get_apps] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Get apps error: {str(e)}'
        }), 500

@remote_bp.route('/click-element', methods=['POST'])
def click_element():
    """Click on a UI element."""
    try:
        data = request.get_json()
        elementId = data.get('elementId')
        
        print(f"[@route:host_remote:click_element] Clicking element ID: {elementId}")
        
        if elementId is None:
            return jsonify({
                'success': False,
                'error': 'elementId is required'
            }), 400
        
        host_device = getattr(current_app, 'my_host_device', None)
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device object not initialized. Host may need to re-register.'
            }), 404
        
        remote_controller = get_local_controller('remote')
        if not remote_controller:
            return jsonify({
                'success': False,
                'error': 'No remote controller object found in own host_device',
                'available_controllers': list(host_device.get('controller_objects', {}).keys())
            }), 404
        
        print(f"[@route:host_remote:click_element] Using own remote controller: {type(remote_controller).__name__}")
        
        if not hasattr(remote_controller, 'last_ui_elements'):
            return jsonify({
                'success': False,
                'error': 'Element clicking not supported by this remote controller'
            }), 400
        
        # Check if we have any elements stored
        if not remote_controller.last_ui_elements:
            return jsonify({
                'success': False,
                'error': 'No UI elements available. Please dump UI elements first using screenshot-and-dump or dump-ui.'
            }), 400
        
        print(f"[@route:host_remote:click_element] Found {len(remote_controller.last_ui_elements)} stored elements")
        
        # Convert elementId to appropriate type for comparison
        element = None
        available_ids = []
        for el in remote_controller.last_ui_elements:
            available_ids.append(str(el.id))
            # Try both string and int comparison
            if str(el.id) == str(elementId) or el.id == elementId:
                element = el
                break
        
        if not element:
            print(f"[@route:host_remote:click_element] Element {elementId} not found. Available IDs: {available_ids}")
            return jsonify({
                'success': False,
                'error': f'Element with ID {elementId} not found. Available IDs: {available_ids}. Please dump UI elements first.'
            }), 400
        
        success = remote_controller.click_element(element)
        
        if success:
            return jsonify({
                'success': True,
                'message': f'Successfully clicked element {elementId}'
            })
        else:
            return jsonify({
                'success': False,
                'error': f'Failed to click element {elementId}'
            }), 400
            
    except Exception as e:
        print(f"[@route:host_remote:click_element] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Element click error: {str(e)}'
        }), 500

@remote_bp.route('/tap-coordinates', methods=['POST'])
def tap_coordinates():
    """Handle tap coordinates - mobile control only"""
    try:
        data = request.get_json()
        x = data.get('x')
        y = data.get('y')
        
        if x is None or y is None:
            return jsonify({
                'success': False,
                'error': 'Missing required parameters: x, y'
            }), 400
            
        print(f"[@route:host_remote] Handling tap coordinates: ({x}, {y})")
        
        # Get remote controller
        remote_controller = get_local_controller('remote')
        if not remote_controller:
            return jsonify({
                'success': False,
                'error': 'Remote controller not available'
            }), 400
            
        # Execute tap command through remote controller
        success = remote_controller.tap_coordinates(x, y)
        result = {'success': success}
        
        if result.get('success'):
            print(f"[@route:host_remote] Tap executed successfully at ({x}, {y})")
            return jsonify({
                'success': True,
                'message': f'Tap executed at coordinates ({x}, {y})'
            })
        else:
            print(f"[@route:host_remote] Tap failed: {result.get('error', 'Unknown error')}")
            return jsonify({
                'success': False,
                'error': result.get('error', 'Tap execution failed')
            }), 500
            
    except Exception as e:
        print(f"[@route:host_remote] Error in tap_coordinates: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500

@remote_bp.route('/execute-command', methods=['POST'])
def execute_command():
    """Execute a remote command."""
    try:
        data = request.get_json()
        command = data.get('command')
        params = data.get('params', {})
        
        print(f"[@route:host_remote:execute_command] Executing command: {command} with params: {params}")
        
        if not command:
            return jsonify({
                'success': False,
                'error': 'command is required'
            }), 400
        
        host_device = getattr(current_app, 'my_host_device', None)
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device object not initialized. Host may need to re-register.'
            }), 404
        
        remote_controller = get_local_controller('remote')
        if not remote_controller:
            return jsonify({
                'success': False,
                'error': 'No remote controller object found in own host_device',
                'available_controllers': list(host_device.get('controller_objects', {}).keys())
            }), 404
        
        print(f"[@route:host_remote:execute_command] Using own remote controller: {type(remote_controller).__name__}")
        
        success = False
        
        if command == 'press_key':
            key = params.get('key')
            if key:
                success = remote_controller.press_key(key)
            else:
                return jsonify({
                    'success': False,
                    'error': 'key parameter is required for press_key command'
                }), 400
                
        elif command == 'input_text':
            text = params.get('text')
            if text:
                success = remote_controller.input_text(text)
            else:
                return jsonify({
                    'success': False,
                    'error': 'text parameter is required for input_text command'
                }), 400
                
        elif command == 'launch_app':
            package = params.get('package')
            if package:
                success = remote_controller.launch_app(package)
            else:
                return jsonify({
                    'success': False,
                    'error': 'package parameter is required for launch_app command'
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

@remote_bp.route('/dump-ui', methods=['POST'])
def dump_ui():
    """Dump UI elements without screenshot - for HDMI stream usage"""
    try:
        print(f"[@route:host_remote:dump_ui] Dumping UI elements without screenshot")
        
        host_device = getattr(current_app, 'my_host_device', None)
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device object not initialized. Host may need to re-register.'
            }), 404
        
        remote_controller = get_local_controller('remote')
        if not remote_controller:
            return jsonify({
                'success': False,
                'error': 'No remote controller object found in own host_device',
                'available_controllers': list(host_device.get('controller_objects', {}).keys())
            }), 404
        
        print(f"[@route:host_remote:dump_ui] Using own remote controller: {type(remote_controller).__name__}")
        
        if not hasattr(remote_controller, 'dump_ui_elements'):
            return jsonify({
                'success': False,
                'error': 'UI dump not supported by this remote controller'
            }), 400
        
        ui_success, elements, ui_error = remote_controller.dump_ui_elements()
        
        if ui_success:
            # Store elements in controller for subsequent click operations
            if elements:
                remote_controller.last_ui_elements = elements
                print(f"[@route:host_remote:dump_ui] Stored {len(elements)} elements in controller for clicking")
            
            # Serialize elements to JSON format (same as screenshot-and-dump)
            elements_data = []
            for element in elements:
                # Parse bounds string to object format expected by frontend
                bounds_obj = {'left': 0, 'top': 0, 'right': 0, 'bottom': 0}
                if element.bounds and element.bounds != '':
                    import re
                    # Bounds format: [x1,y1][x2,y2]
                    bounds_match = re.match(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]', element.bounds)
                    if bounds_match:
                        x1, y1, x2, y2 = map(int, bounds_match.groups())
                        bounds_obj = {'left': x1, 'top': y1, 'right': x2, 'bottom': y2}
                
                elements_data.append({
                    'id': element.id,
                    'text': element.text,
                    'className': element.class_name,
                    'contentDesc': element.content_desc,
                    'package': element.resource_id,
                    'bounds': bounds_obj,
                    'clickable': element.clickable,
                    'enabled': element.enabled
                })
            
            print(f"[@route:host_remote:dump_ui] UI dump successful, found {len(elements_data)} elements")
            
            return jsonify({
                'success': True,
                'elements': elements_data
            })
        else:
            print(f"[@route:host_remote:dump_ui] UI dump failed: {ui_error}")
            return jsonify({
                'success': False,
                'error': ui_error or 'UI dump failed'
            }), 400
            
    except Exception as e:
        print(f"[@route:host_remote:dump_ui] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'UI dump error: {str(e)}'
        }), 500

# get-status endpoint removed - not needed 
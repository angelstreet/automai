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
                'error': 'Host device not initialized'
            }), 500
        
        remote_controller = get_local_controller('remote')
        if not remote_controller:
            return jsonify({
                'success': False,
                'error': 'Remote controller not available'
            }), 400
        
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
                'error': 'Host device not initialized'
            }), 500
        
        remote_controller = get_local_controller('remote')
        if not remote_controller:
            return jsonify({
                'success': False,
                'error': 'Remote controller not available'
            }), 400
        
        if not hasattr(remote_controller, 'dump_ui_elements'):
            return jsonify({
                'success': False,
                'error': 'UI dumping not supported by this remote controller'
            }), 400
        
        screenshot_success, screenshot_data, screenshot_error = remote_controller.take_screenshot()
        ui_success, elements, ui_error = remote_controller.dump_ui_elements()
        
        response = {
            'success': screenshot_success and ui_success
        }
        
        if screenshot_success:
            response['screenshot'] = screenshot_data
        
        if ui_success:
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
                'error': 'Host device not initialized'
            }), 500
        
        remote_controller = get_local_controller('remote')
        if not remote_controller:
            return jsonify({
                'success': False,
                'error': 'Remote controller not available'
            }), 400
        
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
                'error': 'Host device not initialized'
            }), 500
        
        remote_controller = get_local_controller('remote')
        if not remote_controller:
            return jsonify({
                'success': False,
                'error': 'Remote controller not available'
            }), 400
        
        if not hasattr(remote_controller, 'last_ui_elements'):
            return jsonify({
                'success': False,
                'error': 'Element clicking not supported by this remote controller'
            }), 400
        
        element = None
        for el in remote_controller.last_ui_elements:
            if el.id == elementId:
                element = el
                break
        
        if not element:
            return jsonify({
                'success': False,
                'error': f'Element with ID {elementId} not found. Please dump UI elements first.'
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

@remote_bp.route('/tap-element', methods=['POST'])
def tap_element():
    """Tap at specific screen coordinates."""
    try:
        data = request.get_json()
        x = data.get('x')
        y = data.get('y')
        
        print(f"[@route:host_remote:tap_element] Tapping at coordinates: ({x}, {y})")
        
        if x is None or y is None:
            return jsonify({
                'success': False,
                'error': 'x and y coordinates are required'
            }), 400
        
        host_device = getattr(current_app, 'my_host_device', None)
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device not initialized'
            }), 500
        
        remote_controller = get_local_controller('remote')
        if not remote_controller:
            return jsonify({
                'success': False,
                'error': 'Remote controller not available'
            }), 400
        
        if not hasattr(remote_controller, 'tap_coordinates'):
            return jsonify({
                'success': False,
                'error': 'Coordinate tapping not supported by this remote controller'
            }), 400
        
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
        print(f"[@route:host_remote:tap_element] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Coordinate tap error: {str(e)}'
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
                'error': 'Host device not initialized'
            }), 500
        
        remote_controller = get_local_controller('remote')
        if not remote_controller:
            return jsonify({
                'success': False,
                'error': 'Remote controller not available'
            }), 400
        
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

# get-status endpoint removed - not needed 
"""
Server Remote Routes

Server-side remote control proxy endpoints that forward requests to host remote controllers.
"""

from flask import Blueprint, request, jsonify, current_app

# Create blueprint 
remote_bp = Blueprint('remote', __name__, url_prefix='/server/remote')

# =====================================================
# REMOTE CONTROL PROXY ENDPOINTS  
# =====================================================

@remote_bp.route('/take-screenshot', methods=['POST'])
def take_screenshot():
    """Proxy screenshot request to host remote controller."""
    try:
        print(f"[@route:server_remote:take_screenshot] Proxying screenshot request")
        
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
        
        # Execute screenshot
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
        print(f"[@route:server_remote:take_screenshot] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Screenshot error: {str(e)}'
        }), 500

@remote_bp.route('/screenshot-and-dump', methods=['POST'])
def screenshot_and_dump():
    """Proxy screenshot and UI dump request to host remote controller."""
    try:
        print(f"[@route:server_remote:screenshot_and_dump] Proxying screenshot and dump request")
        
        host_device = getattr(current_app, 'my_host_device', None)
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device not initialized'
            }), 500
        
        remote_controller = host_device.get('controller_objects', {}).get('remote')
        if not remote_controller:
            return jsonify({
                'success': False,
                'error': 'Remote controller not available'
            }), 400
        
        # Take screenshot
        screenshot_success, screenshot_data, screenshot_error = remote_controller.take_screenshot()
        
        # Dump UI elements (Android Mobile specific)
        ui_success, elements, ui_error = False, [], None
        if hasattr(remote_controller, 'dump_ui_elements'):
            ui_success, elements, ui_error = remote_controller.dump_ui_elements()
        
        response = {
            'success': screenshot_success and (ui_success or not hasattr(remote_controller, 'dump_ui_elements'))
        }
        
        if screenshot_success:
            response['screenshot'] = screenshot_data
        
        if ui_success:
            elements_data = []
            for element in elements:
                elements_data.append({
                    'id': element.id,
                    'text': element.text,
                    'className': element.class_name,
                    'bounds': element.bounds,
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
        print(f"[@route:server_remote:screenshot_and_dump] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Screenshot and dump error: {str(e)}'
        }), 500

@remote_bp.route('/get-apps', methods=['POST'])
def get_apps():
    """Proxy get apps request to host remote controller."""
    try:
        print(f"[@route:server_remote:get_apps] Proxying get apps request")
        
        host_device = getattr(current_app, 'my_host_device', None)
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device not initialized'
            }), 500
        
        remote_controller = host_device.get('controller_objects', {}).get('remote')
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
        print(f"[@route:server_remote:get_apps] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Get apps error: {str(e)}'
        }), 500

@remote_bp.route('/click-element', methods=['POST'])
def click_element():
    """Proxy click element request to host remote controller."""
    try:
        data = request.get_json()
        elementId = data.get('elementId')
        
        print(f"[@route:server_remote:click_element] Proxying click element: {elementId}")
        
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
        
        remote_controller = host_device.get('controller_objects', {}).get('remote')
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
        
        # Find element by ID
        element = None
        for el in remote_controller.last_ui_elements:
            if el.id == elementId:
                element = el
                break
        
        if not element:
            return jsonify({
                'success': False,
                'error': f'Element with ID {elementId} not found'
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
        print(f"[@route:server_remote:click_element] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Element click error: {str(e)}'
        }), 500

@remote_bp.route('/tap-element', methods=['POST'])
def tap_element():
    """Proxy tap coordinates request to host remote controller."""
    try:
        data = request.get_json()
        x = data.get('x')
        y = data.get('y')
        
        print(f"[@route:server_remote:tap_element] Proxying tap at coordinates: ({x}, {y})")
        
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
        
        remote_controller = host_device.get('controller_objects', {}).get('remote')
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
        print(f"[@route:server_remote:tap_element] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Coordinate tap error: {str(e)}'
        }), 500

@remote_bp.route('/execute-command', methods=['POST'])
def execute_command():
    """Proxy command execution request to host remote controller."""
    try:
        data = request.get_json()
        command = data.get('command')
        params = data.get('params', {})
        
        print(f"[@route:server_remote:execute_command] Proxying command: {command} with params: {params}")
        
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
        
        remote_controller = host_device.get('controller_objects', {}).get('remote')
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
                return jsonify({'success': False, 'error': 'key parameter required'}), 400
                
        elif command == 'input_text':
            text = params.get('text')
            if text:
                success = remote_controller.input_text(text)
            else:
                return jsonify({'success': False, 'error': 'text parameter required'}), 400
                
        elif command == 'launch_app':
            package = params.get('package')
            if package:
                success = remote_controller.launch_app(package)
            else:
                return jsonify({'success': False, 'error': 'package parameter required'}), 400
                
        else:
            return jsonify({'success': False, 'error': f'Unknown command: {command}'}), 400
        
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
        print(f"[@route:server_remote:execute_command] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Command execution error: {str(e)}'
        }), 500

# get-status endpoint removed - not needed

# NOTE: Navigation actions (navigate, click, swipe, key-press) are typically
# handled by navigation/pathfinding routes or direct controller calls.
# 
# If additional specific remote control endpoints are needed, they should be added here
# using the abstract remote controller pattern:
#
# @remote_bp.route('/navigate', methods=['POST'])
# def navigate():
#     """Navigate using abstract remote controller."""
#     try:
#         host_device = getattr(current_app, 'my_host_device', None)
#         if not host_device:
#             return jsonify({'success': False, 'error': 'Host device not initialized'}), 500
#         
#         remote_controller = host_device.get('controller_objects', {}).get('remote')
#         if not remote_controller:
#             return jsonify({'success': False, 'error': 'Remote controller not available'}), 400
#         
#         data = request.get_json()
#         result = remote_controller.navigate(data.get('direction'))
#         return jsonify({'success': True, 'result': result})
#     except Exception as e:
#         return jsonify({'success': False, 'error': str(e)}), 500

# DELETED: All device-specific /android-tv/* and /android-mobile/* endpoints
# - /config endpoints: Configuration happens at registration
# - /defaults endpoints: Controllers are pre-configured
# 
# Controllers are instantiated and configured during host registration.
# Routes should use the abstract controller methods only. 
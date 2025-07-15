"""
Host Remote Routes

Host-side remote control endpoints that execute remote commands using instantiated remote controllers.
"""

from flask import Blueprint, request, jsonify, current_app
from src.utils.host_utils import get_controller, get_device_by_id
import time

# Create blueprint
host_remote_bp = Blueprint('host_remote', __name__, url_prefix='/host/remote')

# =====================================================
# REMOTE CONTROLLER ENDPOINTS
# =====================================================

@host_remote_bp.route('/takeScreenshot', methods=['POST'])
def take_screenshot():
    """Take a screenshot using the remote controller."""
    try:
        # Get device_id from request (defaults to device1)
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        
        print(f"[@route:host_remote:take_screenshot] Taking screenshot for device: {device_id}")
        
        # Get remote controller for the specified device
        remote_controller = get_controller(device_id, 'remote')
        
        if not remote_controller:
            device = get_device_by_id(device_id)
            if not device:
                return jsonify({
                    'success': False,
                    'error': f'Device {device_id} not found'
                }), 404
            
            return jsonify({
                'success': False,
                'error': f'No remote controller found for device {device_id}',
                'available_capabilities': device.get_capabilities()
            }), 404
        
        print(f"[@route:host_remote:take_screenshot] Using remote controller: {type(remote_controller).__name__}")
        
        success, screenshot_data, error = remote_controller.take_screenshot()
        
        if success:
            # Process screenshot data URL for client consumption
            from src.utils.build_url_utils import buildClientImageUrl
            processed_screenshot = buildClientImageUrl(screenshot_data) if screenshot_data else screenshot_data
            
            return jsonify({
                'success': True,
                'screenshot': processed_screenshot,
                'device_id': device_id
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

@host_remote_bp.route('/screenshotAndDump', methods=['POST'])
def screenshot_and_dump():
    """Take screenshot and dump UI elements."""
    try:
        # Get device_id from request (defaults to device1)
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        
        print(f"[@route:host_remote:screenshot_and_dump] Taking screenshot and dumping UI for device: {device_id}")
        
        # Get remote controller for the specified device
        remote_controller = get_controller(device_id, 'remote')
        
        if not remote_controller:
            device = get_device_by_id(device_id)
            if not device:
                return jsonify({
                    'success': False,
                    'error': f'Device {device_id} not found'
                }), 404
            
            return jsonify({
                'success': False,
                'error': f'No remote controller found for device {device_id}',
                'available_capabilities': device.get_capabilities()
            }), 404
        
        print(f"[@route:host_remote:screenshot_and_dump] Using remote controller: {type(remote_controller).__name__}")
        
        screenshot_success, screenshot_data, screenshot_error = remote_controller.take_screenshot()
        
        ui_success, elements, ui_error = False, [], None
        if hasattr(remote_controller, 'dump_ui_elements'):
            ui_success, elements, ui_error = remote_controller.dump_ui_elements()
            
            # Store elements in controller for subsequent click operations
            if ui_success and elements:
                remote_controller.last_ui_elements = elements
                print(f"[@route:host_remote:screenshot_and_dump] Stored {len(elements)} elements in controller for clicking")
        
        response = {
            'success': screenshot_success and (ui_success or not hasattr(remote_controller, 'dump_ui_elements')),
            'device_id': device_id
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

@host_remote_bp.route('/getApps', methods=['POST'])
def get_apps():
    """Get list of installed apps."""
    try:
        # Get device_id from request (defaults to device1)
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        
        print(f"[@route:host_remote:get_apps] Getting installed apps for device: {device_id}")
        
        # Get remote controller for the specified device
        remote_controller = get_controller(device_id, 'remote')
        
        if not remote_controller:
            device = get_device_by_id(device_id)
            if not device:
                return jsonify({
                    'success': False,
                    'error': f'Device {device_id} not found'
                }), 404
            
            return jsonify({
                'success': False,
                'error': f'No remote controller found for device {device_id}',
                'available_capabilities': device.get_capabilities()
            }), 404
        
        print(f"[@route:host_remote:get_apps] Using remote controller: {type(remote_controller).__name__}")
        
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
            'apps': apps_data,
            'device_id': device_id
        })
            
    except Exception as e:
        print(f"[@route:host_remote:get_apps] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Get apps error: {str(e)}'
        }), 500

@host_remote_bp.route('/tapCoordinates', methods=['POST'])
def tap_coordinates():
    """Handle tap coordinates - mobile control only"""
    try:
        data = request.get_json()
        x = data.get('x')
        y = data.get('y')
        device_id = data.get('device_id', 'device1')
        
        if x is None or y is None:
            return jsonify({
                'success': False,
                'error': 'Missing required parameters: x, y'
            }), 400
            
        print(f"[@route:host_remote] Handling tap coordinates: ({x}, {y}) for device: {device_id}")
        
        # Get remote controller for the specified device
        remote_controller = get_controller(device_id, 'remote')
        
        if not remote_controller:
            device = get_device_by_id(device_id)
            if not device:
                return jsonify({
                    'success': False,
                    'error': f'Device {device_id} not found'
                }), 404
            
            return jsonify({
                'success': False,
                'error': f'No remote controller found for device {device_id}',
                'available_capabilities': device.get_capabilities()
            }), 404
            
        # Execute tap command through remote controller
        success = remote_controller.tap_coordinates(x, y)
        
        if success:
            print(f"[@route:host_remote] Tap executed successfully at ({x}, {y}) for device: {device_id}")
            return jsonify({
                'success': True,
                'message': f'Tap executed at coordinates ({x}, {y})',
                'device_id': device_id
            })
        else:
            print(f"[@route:host_remote] Tap failed for device: {device_id}")
            return jsonify({
                'success': False,
                'error': 'Tap execution failed'
            }), 500
            
    except Exception as e:
        print(f"[@route:host_remote] Error in tap_coordinates: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500

@host_remote_bp.route('/executeCommand', methods=['POST'])
def execute_command():
    """Execute a remote command."""
    try:
        data = request.get_json()
        command = data.get('command')
        params = data.get('params', {})
        device_id = data.get('device_id', 'device1')
        wait_time = data.get('wait_time', 0)  # Get wait_time from request
        
        print(f"[@route:host_remote:execute_command] Executing command: {command} with params: {params} for device: {device_id}")
        if wait_time > 0:
            print(f"[@route:host_remote:execute_command] Will wait {wait_time}ms after command execution")
        
        if not command:
            return jsonify({
                'success': False,
                'error': 'command is required'
            }), 400
        
        # Get remote controller for the specified device
        remote_controller = get_controller(device_id, 'remote')
        
        if not remote_controller:
            device = get_device_by_id(device_id)
            if not device:
                return jsonify({
                    'success': False,
                    'error': f'Device {device_id} not found'
                }), 404
            
            return jsonify({
                'success': False,
                'error': f'No remote controller found for device {device_id}',
                'available_capabilities': device.get_capabilities()
            }), 404
        
        print(f"[@route:host_remote:execute_command] Using remote controller: {type(remote_controller).__name__}")
        
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
                
        elif command == 'close_app':
            package = params.get('package')
            if package:
                success = remote_controller.close_app(package)
            else:
                return jsonify({
                    'success': False,
                    'error': 'package parameter is required for close_app command'
                }), 400
                
        elif command == 'tap_coordinates':
            x = params.get('x')
            y = params.get('y')
            if x is not None and y is not None:
                success = remote_controller.tap_coordinates(int(x), int(y))
            else:
                return jsonify({
                    'success': False,
                    'error': 'x and y parameters are required for tap_coordinates command'
                }), 400
                
        elif command == 'click_element':
            element_id = params.get('element_id')
            if element_id:
                # Use low-level direct click method (no UI dump required)
                success = remote_controller.click_element(element_id)
            else:
                return jsonify({
                    'success': False,
                    'error': 'element_id parameter is required for click_element command'
                }), 400
                
        elif command == 'click_element_by_id':
            element_id = params.get('element_id')
            if element_id:
                # Check if we have stored UI elements
                if not hasattr(remote_controller, 'last_ui_elements') or not remote_controller.last_ui_elements:
                    return jsonify({
                        'success': False,
                        'error': 'No UI elements available. Please dump UI elements first using dump_ui_elements.'
                    }), 400
                
                # Find the element by ID in dumped elements
                element = None
                for el in remote_controller.last_ui_elements:
                    if str(el.id) == str(element_id):
                        element = el
                        break
                
                if not element:
                    available_ids = [str(el.id) for el in remote_controller.last_ui_elements]
                    return jsonify({
                        'success': False,
                        'error': f'Element with ID {element_id} not found. Available IDs: {available_ids}'
                    }), 400
                
                # Pass AndroidElement object to the method
                success = remote_controller.click_element_by_id(element)
            else:
                return jsonify({
                    'success': False,
                    'error': 'element_id parameter is required for click_element_by_id command'
                }), 400
                
        elif command == 'dump_ui_elements':
            if hasattr(remote_controller, 'dump_ui_elements'):
                ui_success, elements, ui_error = remote_controller.dump_ui_elements()
                if ui_success:
                    success = True
                    # Store elements for future click operations
                    remote_controller.last_ui_elements = elements
                else:
                    return jsonify({
                        'success': False,
                        'error': f'UI dump failed: {ui_error}'
                    }), 400
            else:
                return jsonify({
                    'success': False,
                    'error': 'UI dumping not supported by this controller'
                }), 400
                
        elif command == 'take_screenshot':
            if hasattr(remote_controller, 'take_screenshot'):
                screenshot_success, screenshot_data, screenshot_error = remote_controller.take_screenshot()
                if screenshot_success:
                    success = True
                else:
                    return jsonify({
                        'success': False,
                        'error': f'Screenshot failed: {screenshot_error}'
                    }), 400
            else:
                return jsonify({
                    'success': False,
                    'error': 'Screenshot not supported by this controller'
                }), 400
                
        elif command == 'get_installed_apps':
            if hasattr(remote_controller, 'get_installed_apps'):
                apps_success, apps_data, apps_error = remote_controller.get_installed_apps()
                if apps_success:
                    success = True
                else:
                    return jsonify({
                        'success': False,
                        'error': f'Get apps failed: {apps_error}'
                    }), 400
            else:
                return jsonify({
                    'success': False,
                    'error': 'Get installed apps not supported by this controller'
                }), 400
                
        else:
            return jsonify({
                'success': False,
                'error': f'Unknown command: {command}'
            }), 400
        
        if success:
            # Wait for the specified time after successful command execution
            if wait_time > 0:
                print(f"[@route:host_remote:execute_command] Waiting {wait_time}ms after successful command execution")
                time.sleep(wait_time / 1000.0)  # Convert ms to seconds
                
            return jsonify({
                'success': True,
                'message': f'Command {command} executed successfully',
                'device_id': device_id
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

@host_remote_bp.route('/dumpUi', methods=['POST'])
def dump_ui():
    """Dump UI elements without screenshot - for HDMI stream usage"""
    try:
        # Get device_id from request (defaults to device1)
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        
        print(f"[@route:host_remote:dump_ui] Dumping UI elements without screenshot for device: {device_id}")
        
        # Get remote controller for the specified device
        remote_controller = get_controller(device_id, 'remote')
        
        if not remote_controller:
            device = get_device_by_id(device_id)
            if not device:
                return jsonify({
                    'success': False,
                    'error': f'Device {device_id} not found'
                }), 404
            
            return jsonify({
                'success': False,
                'error': f'No remote controller found for device {device_id}',
                'available_capabilities': device.get_capabilities()
            }), 404
        
        print(f"[@route:host_remote:dump_ui] Using remote controller: {type(remote_controller).__name__}")
        
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
            
            # Serialize elements to JSON format (same as screenshotAndDump)
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
                'elements': elements_data,
                'device_id': device_id
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
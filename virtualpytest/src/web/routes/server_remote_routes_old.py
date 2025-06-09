"""
Remote Control Routes

This module contains the remote control API endpoints for:
- Android TV remote control
- Android Mobile remote control  
- IR Remote control
- Bluetooth Remote control
"""

from flask import Blueprint, request, jsonify, current_app
import time
import os
import sys

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from .utils import check_controllers_available

# Create blueprint
remote_bp = Blueprint('remote', __name__, url_prefix='/server/remote')

def get_android_tv_session():
    """Helper function to get android_tv_session from current_app"""
    global_sessions = getattr(current_app, 'global_sessions', {})
    return global_sessions.get('android_tv_session', {})

def get_ir_remote_session():
    """Helper function to get ir_remote_session from current_app"""
    global_sessions = getattr(current_app, 'global_sessions', {})
    return global_sessions.get('ir_remote_session', {})

def get_bluetooth_remote_session():
    """Helper function to get bluetooth_remote_session from current_app"""
    global_sessions = getattr(current_app, 'global_sessions', {})
    return global_sessions.get('bluetooth_remote_session', {})

# =====================================================
# ANDROID TV REMOTE CONTROL ENDPOINTS
# =====================================================

@remote_bp.route('/android-tv/take-control', methods=['POST'])
def take_android_tv_control():
    """Take control of Android TV device via ADB."""
    android_tv_session = get_android_tv_session()
    
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['device_ip']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        # Release any existing session first
        if android_tv_session['connected'] and android_tv_session['controller']:
            try:
                android_tv_session['controller'].disconnect()
            except:
                pass
        
        # Create new Android TV controller
        from controllers import ControllerFactory
        
        controller = ControllerFactory.create_remote_controller(
            device_type="android_tv",
            device_name="Web Interface TV",
            device_ip=data['device_ip'],
            device_port=int(data.get('device_port', 5555))
        )
        
        # Attempt connection
        if controller.connect():
            android_tv_session.update({
                'controller': controller,
                'connected': True,
                'connection_details': {
                    'device_ip': data['device_ip'],
                    'device_port': data.get('device_port', 5555),
                    'connected_at': time.time()
                }
            })
            
            return jsonify({
                'success': True,
                'message': f'Connected to Android TV at {data["device_ip"]}:{data["device_port"]}',
                'session_info': android_tv_session['connection_details']
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to connect to Android TV. Check device connectivity.'
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Connection error: {str(e)}'
        }), 500

@remote_bp.route('/android-tv/release-control', methods=['POST'])
def release_android_tv_control():
    """Release control of Android TV device."""
    android_tv_session = get_android_tv_session()
    
    try:
        if android_tv_session['connected'] and android_tv_session['controller']:
            android_tv_session['controller'].disconnect()
        
        # Reset session
        android_tv_session.update({
            'controller': None,
            'connected': False,
            'connection_details': {}
        })
        
        return jsonify({
            'success': True,
            'message': 'Android TV control released successfully'
        })
        
    except Exception as e:
        # Always reset session even if disconnect fails
        android_tv_session.update({
            'controller': None,
            'connected': False,
            'connection_details': {}
        })
        
        return jsonify({
            'success': True,
            'message': 'Android TV control released (with cleanup)'
        })

@remote_bp.route('/android-tv/command', methods=['POST'])
def send_android_tv_command():
    """Send command to Android TV device."""
    android_tv_session = get_android_tv_session()
    
    try:
        if not android_tv_session['connected'] or not android_tv_session['controller']:
            return jsonify({
                'success': False,
                'error': 'No active Android TV session. Please take control first.'
            }), 400
        
        data = request.get_json()
        command = data.get('command')
        params = data.get('params', {})
        
        controller = android_tv_session['controller']
        
        if command == 'press_key':
            key = params.get('key')
            if not key:
                return jsonify({
                    'success': False,
                    'error': 'Missing key parameter'
                }), 400
            
            success = controller.press_key(key)
            return jsonify({
                'success': success,
                'message': f'Key "{key}" {"sent" if success else "failed"}'
            })
            
        elif command == 'input_text':
            text = params.get('text')
            if not text:
                return jsonify({
                    'success': False,
                    'error': 'Missing text parameter'
                }), 400
            
            success = controller.input_text(text)
            return jsonify({
                'success': success,
                'message': f'Text input {"sent" if success else "failed"}'
            })
            
        elif command == 'execute_sequence':
            sequence = params.get('sequence', [])
            success = controller.execute_sequence(sequence)
            return jsonify({
                'success': success,
                'message': f'Sequence {"executed" if success else "failed"}'
            })
            
        elif command == 'launch_app':
            package = params.get('package')
            if not package:
                return jsonify({
                    'success': False,
                    'error': 'Missing package parameter'
                }), 400
            
            success = controller.launch_app(package)
            return jsonify({
                'success': success,
                'message': f'App "{package}" {"launched" if success else "failed"}'
            })
            
        elif command == 'close_app':
            package = params.get('package')
            if not package:
                return jsonify({
                    'success': False,
                    'error': 'Missing package parameter'
                }), 400
            
            success = controller.close_app(package)
            return jsonify({
                'success': success,
                'message': f'App "{package}" {"closed" if success else "failed"}'
            })
            
        else:
            return jsonify({
                'success': False,
                'error': f'Unknown command: {command}'
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Command execution error: {str(e)}'
        }), 500

@remote_bp.route('/android-tv/status', methods=['GET'])
def get_android_tv_status():
    """Get Android TV session status."""
    android_tv_session = get_android_tv_session()
    
    try:
        if android_tv_session['connected'] and android_tv_session['controller']:
            controller_status = android_tv_session['controller'].get_status()
            return jsonify({
                'success': True,
                'connected': True,
                'session_info': android_tv_session['connection_details'],
                'controller_status': controller_status
            })
        else:
            return jsonify({
                'success': True,
                'connected': False,
                'session_info': {},
                'controller_status': {}
            })
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Status check error: {str(e)}'
        }), 500

@remote_bp.route('/android-tv/defaults', methods=['GET'])
def get_android_tv_defaults():
    """Get default Android TV connection values from environment variables."""
    try:
        defaults = {
            'device_ip': os.getenv('DEVICE_IP') or os.getenv('ANDROID_TV_IP', '192.168.1.130'),
            'device_port': os.getenv('DEVICE_PORT', '5555')
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

@remote_bp.route('/android-tv/config', methods=['GET'])
def get_android_tv_config():
    """Get Android TV remote configuration."""
    try:
        from controllers.remote.android_tv import AndroidTVRemoteController
        config = AndroidTVRemoteController.get_remote_config()
        
        return jsonify({
            'success': True,
            'config': config
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Config error: {str(e)}'
        }), 500

@remote_bp.route('/android-tv/screenshot', methods=['POST'])
def android_tv_screenshot():
    """Take a screenshot of the Android TV device."""
    android_tv_session = get_android_tv_session()
        
    try:
        if not android_tv_session['connected'] or not android_tv_session['controller']:
            return jsonify({
                'success': False,
                'error': 'No active Android TV connection'
            }), 400
            
        success, screenshot_data, error = android_tv_session['controller'].take_screenshot()
        
        if success:
            return jsonify({
                'success': True,
                'screenshot': screenshot_data,  # Base64 encoded image
                'format': 'png'
            })
        else:
            return jsonify({
                'success': False,
                'error': error
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Screenshot error: {str(e)}'
        }), 500

# =====================================================
# ANDROID MOBILE REMOTE CONTROL ENDPOINTS
# =====================================================

@remote_bp.route('/android-mobile/config', methods=['GET'])
def get_android_mobile_config():
    """Get Android Mobile remote configuration including layout, buttons, and image."""
    try:
        from controllers.remote.android_mobile import AndroidMobileRemoteController
        config = AndroidMobileRemoteController.get_remote_config()
        
        return jsonify({
            'success': True,
            'config': config
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to get config: {str(e)}'
        }), 500

@remote_bp.route('/android-mobile/defaults', methods=['GET'])
def get_android_mobile_defaults():
    """Get default connection values for Android Mobile from environment variables."""
    try:
        defaults = {
            'device_ip': os.getenv('DEVICE_IP') or os.getenv('ANDROID_MOBILE_IP', '192.168.1.29'),
            'device_port': os.getenv('DEVICE_PORT', '5555')
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

@remote_bp.route('/android-mobile/take-control', methods=['POST'])
def android_mobile_take_control():
    """Take control of Android Mobile device via SSH and ADB."""
    try:
        from controllers.remote.android_mobile import AndroidMobileRemoteController
        
        data = request.get_json()
        print(f"[@api:android-mobile:take-control] Connection data received")
        
        # Create controller instance with connection parameters
        controller = AndroidMobileRemoteController(
            device_name="Android Mobile Device",
            device_ip=data.get('device_ip'),
            adb_port=int(data.get('device_port', 5555))
        )
        
        # Attempt connection
        if controller.connect():
            # Store controller globally for subsequent commands
            current_app.android_mobile_controller = controller
            
            return jsonify({
                'success': True,
                'message': f'Successfully connected to Android Mobile device {data.get("device_ip")}'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to connect to Android Mobile device'
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Connection error: {str(e)}'
        }), 500

@remote_bp.route('/android-mobile/release-control', methods=['POST'])
def android_mobile_release_control():
    """Release control of Android Mobile device."""
    try:
        if hasattr(current_app, 'android_mobile_controller') and current_app.android_mobile_controller:
            current_app.android_mobile_controller.disconnect()
            current_app.android_mobile_controller = None
            
        return jsonify({
            'success': True,
            'message': 'Android Mobile control released'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Release error: {str(e)}'
        }), 500

@remote_bp.route('/android-mobile/execute-action', methods=['POST'])
def execute_android_mobile_action():
    """Execute a specific action by action ID for Android Mobile controller."""
    try:
        if not hasattr(current_app, 'android_mobile_controller') or not current_app.android_mobile_controller:
            return jsonify({
                'success': False,
                'error': 'No active connection'
            }), 400
            
        data = request.get_json()
        action_data = data.get('action')
        
        if not action_data:
            return jsonify({
                'success': False,
                'error': 'Action data is required'
            }), 400
        
        action_id = action_data.get('id')
        command = action_data.get('command')
        params = action_data.get('params', {})
        
        if not action_id or not command:
            return jsonify({
                'success': False,
                'error': 'Action ID and command are required'
            }), 400
        
        print(f"[@route:execute_android_mobile_action] Executing action {action_id}: {command} with params: {params}")
        
        success = False
        message = ""
        
        # Execute based on the command type
        if command == 'press_key':
            key = params.get('key')
            if not key:
                return jsonify({
                    'success': False,
                    'error': 'Key parameter required for press_key command'
                }), 400
            success = current_app.android_mobile_controller.press_key(key)
            message = f'Key "{key}" {"pressed" if success else "failed"}'
            
        elif command in ['BACK', 'HOME', 'MENU', 'POWER', 'VOLUME_UP', 'VOLUME_DOWN']:
            # Direct Android key commands
            keycode_map = {
                'BACK': 'KEYCODE_BACK',
                'HOME': 'KEYCODE_HOME',
                'MENU': 'KEYCODE_MENU',
                'POWER': 'KEYCODE_POWER',
                'VOLUME_UP': 'KEYCODE_VOLUME_UP',
                'VOLUME_DOWN': 'KEYCODE_VOLUME_DOWN'
            }
            keycode = keycode_map.get(command)
            if keycode:
                success = current_app.android_mobile_controller.press_key(keycode)
            else:
                # Try sending the command directly
                success = current_app.android_mobile_controller.press_key(command)
            message = f'Key "{command}" {"pressed" if success else "failed"}'
            
        elif command == 'launch_app':
            package = params.get('package', '')
            if not package:
                return jsonify({
                    'success': False,
                    'error': 'Package parameter required for launch_app command'
                }), 400
            success = current_app.android_mobile_controller.launch_app(package)
            message = f'App "{package}" {"launched" if success else "failed"}'
            
        elif command == 'close_app':
            package = params.get('package', '')
            if not package:
                return jsonify({
                    'success': False,
                    'error': 'Package parameter required for close_app command'
                }), 400
            success = current_app.android_mobile_controller.close_app(package)
            message = f'App "{package}" {"closed" if success else "failed"}'
            
        elif command == 'input_text':
            text = params.get('text', '')
            if not text:
                return jsonify({
                    'success': False,
                    'error': 'Text parameter required for input_text command'
                }), 400
            success = current_app.android_mobile_controller.input_text(text)
            message = f'Text input {"successful" if success else "failed"}'
            
        elif command == 'click_element':
            element_id = params.get('element_id', '')
            if not element_id:
                return jsonify({
                    'success': False,
                    'error': 'Element ID parameter required for click_element command'
                }), 400
            
            print(f"[@route:execute_android_mobile_action] Attempting to click element: '{element_id}'")
            
            # Check if element_id contains pipe-separated terms
            if '|' in element_id:
                print(f"[@route:execute_android_mobile_action] Detected pipe-separated terms in element_id: '{element_id}'")
                # Use the advanced click_element_by_search method that supports pipe-separated terms
                success = current_app.android_mobile_controller.adb_utils.click_element_by_search(
                    current_app.android_mobile_controller.android_device_id, 
                    element_id
                )
                if success:
                    message = f'Element "{element_id}" click successful using smart search'
                else:
                    message = f'Element "{element_id}" not found by smart search with any fallback terms'
            else:
                # Original logic for single terms
                # Try to click element directly by text, content description, or resource ID
                # First try to find element from last UI dump if available
                target_element = None
                if hasattr(current_app.android_mobile_controller, 'last_ui_elements') and current_app.android_mobile_controller.last_ui_elements:
                    for element in current_app.android_mobile_controller.last_ui_elements:
                        if element.id == element_id:
                            target_element = element
                            break
                
                # If not found in last dump, try to find by text/content/resource ID
                if not target_element:
                    # Do a fresh UI dump first
                    print(f"[@route:execute_android_mobile_action] Element not found in cache, doing fresh UI dump")
                    dump_success, elements, dump_error = current_app.android_mobile_controller.dump_ui_elements()
                    
                    if dump_success:
                        # Try to find element by various methods
                        target_element = current_app.android_mobile_controller.find_element_by_text(element_id)
                        if not target_element:
                            target_element = current_app.android_mobile_controller.find_element_by_content_desc(element_id)
                        if not target_element:
                            target_element = current_app.android_mobile_controller.find_element_by_resource_id(element_id)
                    else:
                        print(f"[@route:execute_android_mobile_action] UI dump failed: {dump_error}")
                
                if target_element:
                    # Click the found element
                    success = current_app.android_mobile_controller.click_element(target_element)
                    if success:
                        message = f'Element "{element_id}" click successful'
                    else:
                        # Check if we might already be on the target screen
                        # by checking if the element exists and is visible
                        if target_element.text or target_element.content_desc:
                            # Element exists but click failed - might already be on target screen
                            message = f'Element "{element_id}" found but click not needed (already on target screen)'
                            success = True  # Consider this a success case
                        else:
                            message = f'Element "{element_id}" found but click failed'
                else:
                    # Fallback: try using smart search even for single terms
                    print(f"[@route:execute_android_mobile_action] Element not found with basic search, trying smart search")
                    success = current_app.android_mobile_controller.adb_utils.click_element_by_search(
                        current_app.android_mobile_controller.android_device_id, 
                        element_id
                    )
                    if success:
                        message = f'Element "{element_id}" click successful using smart search fallback'
                    else:
                        message = f'Element "{element_id}" not found by text, content description, or resource ID'
            
        elif command == 'coordinate_tap':
            x = params.get('x')
            y = params.get('y')
            if x is None or y is None:
                return jsonify({
                    'success': False,
                    'error': 'X and Y coordinates required for coordinate_tap command'
                }), 400
            
            try:
                x = int(x)
                y = int(y)
            except (ValueError, TypeError):
                return jsonify({
                    'success': False,
                    'error': 'X and Y coordinates must be valid integers'
                }), 400
            
            # Use the coordinate tap method from the controller
            success = current_app.android_mobile_controller.tap_coordinates(x, y)
            message = f'Coordinate tap at ({x}, {y}) {"successful" if success else "failed"}'
            
        else:
            return jsonify({
                'success': False,
                'error': f'Unknown command: {command}'
            }), 400
        
        return jsonify({
            'success': success,
            'message': message,
            'action_id': action_id,
            'command': command
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Action execution error: {str(e)}'
        }), 500

@remote_bp.route('/android-mobile/dump-ui', methods=['POST'])
def android_mobile_dump_ui():
    """Dump UI elements from Android Mobile device."""
    try:
        if not hasattr(current_app, 'android_mobile_controller') or not current_app.android_mobile_controller:
            return jsonify({
                'success': False,
                'error': 'No acticve connection'
            }), 400
            
        success, elements, error = current_app.android_mobile_controller.dump_ui_elements()
        
        if success:
            # Get device resolution
            resolution = current_app.android_mobile_controller.get_device_resolution()
            
            # Convert elements to JSON-serializable format
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
            
            return jsonify({
                'success': True,
                'elements': elements_data,
                'totalCount': len(elements_data),
                'deviceResolution': resolution
            })
        else:
            return jsonify({
                'success': False,
                'error': error
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'UI dump error: {str(e)}'
        }), 500

@remote_bp.route('/android-mobile/click-element', methods=['POST'])
def android_mobile_click_element():
    """Click on a UI element on Android Mobile device."""
    try:
        if not hasattr(current_app, 'android_mobile_controller') or not current_app.android_mobile_controller:
            return jsonify({
                'success': False,
                'error': 'No acticve connection'
            }), 400
            
        data = request.get_json()
        element_id = data.get('elementId')
        
        if element_id is None:
            return jsonify({
                'success': False,
                'error': 'No element ID provided'
            }), 400
            
        # Find the element by ID from the last UI dump
        target_element = None
        for element in current_app.android_mobile_controller.last_ui_elements:
            if element.id == element_id:
                target_element = element
                break
                
        if target_element is None:
            return jsonify({
                'success': False,
                'error': f'Element with ID {element_id} not found in last UI dump'
            }), 400
            
        # Click the element using the correct method signature
        success = current_app.android_mobile_controller.click_element(target_element)
        
        return jsonify({
            'success': success,
            'message': f'Element {element_id} click {"successful" if success else "failed"}'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Element click error: {str(e)}'
        }), 500

@remote_bp.route('/android-mobile/get-apps', methods=['POST'])
def android_mobile_get_apps():
    """Get installed apps from Android Mobile device."""
    try:
        if not hasattr(current_app, 'android_mobile_controller') or not current_app.android_mobile_controller:
            return jsonify({
                'success': False,
                'error': 'No acticve connection'
            }), 400
            
        apps = current_app.android_mobile_controller.get_installed_apps()
        
        # Convert apps to JSON-serializable format
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
        return jsonify({
            'success': False,
            'error': f'Get apps error: {str(e)}'
        }), 500

@remote_bp.route('/android-mobile/screenshot', methods=['POST'])
def android_mobile_screenshot():
    """Take a screenshot of the Android mobile device"""
    try:
        if not hasattr(current_app, 'android_mobile_controller') or not current_app.android_mobile_controller:
            return jsonify({
                'success': False,
                'error': 'No acticve connection'
            }), 400
        
        # Take screenshot using the existing controller
        success, screenshot_data, error = current_app.android_mobile_controller.take_screenshot()
        
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
        return jsonify({
            'success': False,
            'error': f'Screenshot error: {str(e)}'
        }), 500

@remote_bp.route('/android-mobile/screenshot-and-dump-ui', methods=['POST'])
def android_mobile_screenshot_and_dump_ui():
    """Take a screenshot and dump UI elements from Android Mobile device in one call."""
    try:
        if not hasattr(current_app, 'android_mobile_controller') or not current_app.android_mobile_controller:
            return jsonify({
                'success': False,
                'error': 'No acticve connection'
            }), 400
            
        # Take screenshot first
        success_screenshot, screenshot_data, screenshot_error = current_app.android_mobile_controller.take_screenshot()
        
        # Dump UI elements
        success_ui, elements, ui_error = current_app.android_mobile_controller.dump_ui_elements()
        
        if success_screenshot and success_ui:
            # Get device resolution
            resolution = current_app.android_mobile_controller.get_device_resolution()
            
            # Convert elements to JSON-serializable format
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
            
            return jsonify({
                'success': True,
                'screenshot': screenshot_data,
                'elements': elements_data,
                'totalCount': len(elements_data),
                'deviceResolution': resolution
            })
        else:
            # Return partial success or error
            errors = []
            if not success_screenshot:
                errors.append(f"Screenshot failed: {screenshot_error}")
            if not success_ui:
                errors.append(f"UI dump failed: {ui_error}")
                
            return jsonify({
                'success': False,
                'error': "; ".join(errors)
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Screenshot and UI dump error: {str(e)}'
        }), 500

@remote_bp.route('/android-mobile/actions', methods=['GET'])
def get_android_mobile_actions():
    """Get available actions for Android Mobile controller."""
    try:
        # Define available actions for android mobile
        actions = {
            'navigation': [
                {
                    'id': 'press_key_up',
                    'label': 'Navigate Up',
                    'command': 'press_key',
                    'params': {'key': 'KEYCODE_DPAD_UP'},
                    'description': 'Move cursor/selection up'
                },
                {
                    'id': 'press_key_down', 
                    'label': 'Navigate Down',
                    'command': 'press_key',
                    'params': {'key': 'KEYCODE_DPAD_DOWN'},
                    'description': 'Move cursor/selection down'
                },
                {
                    'id': 'press_key_left',
                    'label': 'Navigate Left', 
                    'command': 'press_key',
                    'params': {'key': 'KEYCODE_DPAD_LEFT'},
                    'description': 'Move cursor/selection left'
                },
                {
                    'id': 'press_key_right',
                    'label': 'Navigate Right',
                    'command': 'press_key', 
                    'params': {'key': 'KEYCODE_DPAD_RIGHT'},
                    'description': 'Move cursor/selection right'
                },
                {
                    'id': 'press_key_center',
                    'label': 'Select/Enter',
                    'command': 'press_key',
                    'params': {'key': 'KEYCODE_DPAD_CENTER'}, 
                    'description': 'Select current item or press enter'
                }
            ],
            'system': [
                {
                    'id': 'back',
                    'label': 'Back',
                    'command': 'BACK',
                    'params': {},
                    'description': 'Go back to previous screen'
                },
                {
                    'id': 'home',
                    'label': 'Home',
                    'command': 'HOME', 
                    'params': {},
                    'description': 'Go to home screen'
                },
                {
                    'id': 'menu',
                    'label': 'Menu',
                    'command': 'MENU',
                    'params': {},
                    'description': 'Open menu'
                },
                {
                    'id': 'power',
                    'label': 'Power',
                    'command': 'POWER',
                    'params': {},
                    'description': 'Power button press'
                }
            ],
            'volume': [
                {
                    'id': 'volume_up',
                    'label': 'Volume Up',
                    'command': 'VOLUME_UP',
                    'params': {},
                    'description': 'Increase volume'
                },
                {
                    'id': 'volume_down', 
                    'label': 'Volume Down',
                    'command': 'VOLUME_DOWN',
                    'params': {},
                    'description': 'Decrease volume'
                }
            ],
            'apps': [
                {
                    'id': 'launch_app',
                    'label': 'Launch App',
                    'command': 'launch_app',
                    'params': {'package': ''},
                    'description': 'Launch a specific app by package name',
                    'requiresInput': True,
                    'inputLabel': 'Package Name',
                    'inputPlaceholder': 'com.example.app'
                },
                {
                    'id': 'close_app',
                    'label': 'Close App',
                    'command': 'close_app',
                    'params': {'package': ''},
                    'description': 'Close/stop a specific app by package name',
                    'requiresInput': True,
                    'inputLabel': 'Package Name',
                    'inputPlaceholder': 'com.example.app'
                }
            ],
            'input': [
                {
                    'id': 'input_text',
                    'label': 'Input Text', 
                    'command': 'input_text',
                    'params': {'text': ''},
                    'description': 'Send text input to the device',
                    'requiresInput': True,
                    'inputLabel': 'Text',
                    'inputPlaceholder': 'Enter text to send'
                }
            ],
            'interaction': [
                {
                    'id': 'click_element',
                    'label': 'Click Element',
                    'command': 'click_element',
                    'params': {'element_id': ''},
                    'description': 'Click on a UI element by element ID',
                    'requiresInput': True,
                    'inputLabel': 'Element ID',
                    'inputPlaceholder': 'Enter element ID or selector'
                },
                {
                    'id': 'coordinate_tap',
                    'label': 'Tap Coordinates',
                    'command': 'coordinate_tap',
                    'params': {'x': 0, 'y': 0},
                    'description': 'Tap at specific screen coordinates',
                    'requiresInput': True,
                    'inputLabel': 'Coordinates',
                    'inputPlaceholder': 'x,y (e.g., 100,200)'
                }
            ]
        }
        
        return jsonify({
            'success': True,
            'controller_type': 'android_mobile',
            'actions': actions
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error getting actions: {str(e)}'
        }), 500

@remote_bp.route('/android-mobile/command', methods=['POST'])
def android_mobile_command():
    """Send command to Android Mobile device."""
    try:
        if not hasattr(current_app, 'android_mobile_controller') or not current_app.android_mobile_controller:
            return jsonify({
                'success': False,
                'error': 'No active connection'
            }), 400
            
        data = request.get_json()
        command = data.get('command')
        params = data.get('params', {})
        
        success = False
        
        if command == 'press_key':
            key = params.get('key')
            if not key:
                return jsonify({
                    'success': False,
                    'error': 'Key parameter required for press_key command'
                }), 400
                
            success = current_app.android_mobile_controller.press_key(key)
            return jsonify({
                'success': success,
                'message': f'Key "{key}" {"pressed" if success else "failed"}'
            })
            
        elif command == 'launch_app':
            package = params.get('package', '')
            if not package:
                return jsonify({
                    'success': False,
                    'error': 'Package parameter required for launch_app command'
                }), 400
                
            success = current_app.android_mobile_controller.launch_app(package)
            return jsonify({
                'success': success,
                'message': f'App "{package}" {"launched" if success else "failed"}'
            })
            
        elif command == 'close_app':
            package = params.get('package', '')
            if not package:
                return jsonify({
                    'success': False,
                    'error': 'Package parameter required for close_app command'
                }), 400
                
            success = current_app.android_mobile_controller.close_app(package)
            return jsonify({
                'success': success,
                'message': f'App "{package}" {"closed" if success else "failed"}'
            })
            
        elif command == 'input_text':
            text = params.get('text', '')
            if not text:
                return jsonify({
                    'success': False,
                    'error': 'Text parameter required for input_text command'
                }), 400
                
            success = current_app.android_mobile_controller.input_text(text)
            return jsonify({
                'success': success,
                'message': f'Text input {"successful" if success else "failed"}'
            })
            
        # Handle direct Android key commands
        elif command in ['BACK', 'HOME', 'MENU', 'VOLUME_UP', 'VOLUME_DOWN', 'POWER', 'CAMERA', 'CALL', 'ENDCALL']:
            # Map command to Android keycode
            keycode_map = {
                'BACK': 'KEYCODE_BACK',
                'HOME': 'KEYCODE_HOME', 
                'MENU': 'KEYCODE_MENU',
                'VOLUME_UP': 'KEYCODE_VOLUME_UP',
                'VOLUME_DOWN': 'KEYCODE_VOLUME_DOWN',
                'POWER': 'KEYCODE_POWER',
                'CAMERA': 'KEYCODE_CAMERA',
                'CALL': 'KEYCODE_CALL',
                'ENDCALL': 'KEYCODE_ENDCALL'
            }
            
            keycode = keycode_map.get(command)
            if keycode:
                success = current_app.android_mobile_controller.press_key(keycode)
                return jsonify({
                    'success': success,
                    'message': f'Key "{command}" {"pressed" if success else "failed"}'
                })
            else:
                return jsonify({
                    'success': False,
                    'error': f'Unknown keycode for command: {command}'
                }), 400
                
        # Handle app launch command (when sent as command directly)
        elif command == 'LAUNCH_APP':
            package = params.get('package', '')
            if not package:
                return jsonify({
                    'success': False,
                    'error': 'Package parameter required for LAUNCH_APP command'
                }), 400
                
            success = current_app.android_mobile_controller.launch_app(package)
            return jsonify({
                'success': success,
                'message': f'App "{package}" {"launched" if success else "failed"}'
            })
            
        else:
            return jsonify({
                'success': False,
                'error': f'Unknown command: {command}'
            }), 400
            
        return jsonify({
            'success': success,
            'message': f'Command {command} {"executed" if success else "failed"}'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Command error: {str(e)}'
        }), 500

# =====================================================
# IR REMOTE CONTROL ENDPOINTS
# =====================================================

@remote_bp.route('/ir-remote/connect', methods=['POST'])
def connect_ir_remote():
    """Connect to IR remote device"""
    ir_remote_session = get_ir_remote_session()
    
    error = check_controllers_available()
    if error:
        return error
    
    try:
        data = request.json
        device_path = data.get('device_path', '/dev/lirc0')
        protocol = data.get('protocol', 'NEC')
        frequency = data.get('frequency', '38000')
        
        print(f"[@api:ir-remote:connect] Connecting to IR device: {device_path}")
        
        # Create IR remote controller
        from controllers.remote.infrared import IRRemoteController
        
        ir_controller = IRRemoteController(
            device_name="IR Remote",
            device_type="ir_remote",
            ir_device=device_path,
            protocol=protocol,
            frequency=int(frequency)
        )
        
        # Connect to the IR device
        if ir_controller.connect():
            ir_remote_session.update({
                'controller': ir_controller,
                'connected': True,
                'connection_details': {
                    'device_path': device_path,
                    'protocol': protocol,
                    'frequency': frequency
                }
            })
            
            print(f"[@api:ir-remote:connect] Successfully connected to IR device")
            return jsonify({
                'success': True,
                'message': f'Connected to IR device {device_path}',
                'device_path': device_path,
                'protocol': protocol
            })
        else:
            print(f"[@api:ir-remote:connect] Failed to connect to IR device")
            return jsonify({
                'success': False,
                'error': 'Failed to connect to IR device'
            })
            
    except Exception as e:
        print(f"[@api:ir-remote:connect] ERROR: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Connection failed: {str(e)}'
        }), 500

@remote_bp.route('/ir-remote/disconnect', methods=['POST'])
def disconnect_ir_remote():
    """Disconnect from IR remote device"""
    ir_remote_session = get_ir_remote_session()
    
    try:
        print(f"[@api:ir-remote:disconnect] Disconnecting from IR device")
        
        if ir_remote_session['controller']:
            ir_remote_session['controller'].disconnect()
            
        # Reset session
        ir_remote_session.update({
            'controller': None,
            'connected': False,
            'connection_details': {}
        })
        
        print(f"[@api:ir-remote:disconnect] Successfully disconnected")
        return jsonify({
            'success': True,
            'message': 'Disconnected from IR device'
        })
        
    except Exception as e:
        print(f"[@api:ir-remote:disconnect] ERROR: {str(e)}")
        # Reset session even on error
        ir_remote_session.update({
            'controller': None,
            'connected': False,
            'connection_details': {}
        })
        
        return jsonify({
            'success': True,  # Still return success since we reset the session
            'message': 'Disconnected from IR device'
        })

@remote_bp.route('/ir-remote/command', methods=['POST'])
def send_ir_remote_command():
    """Send command to IR remote device"""
    ir_remote_session = get_ir_remote_session()
    
    if not ir_remote_session['connected'] or not ir_remote_session['controller']:
        return jsonify({
            'success': False,
            'error': 'IR remote not connected'
        }), 400
    
    try:
        data = request.json
        command = data.get('command')
        params = data.get('params', {})
        
        print(f"[@api:ir-remote:command] Executing command: {command} with params: {params}")
        
        controller = ir_remote_session['controller']
        
        if command == 'press_key':
            key = params.get('key')
            if not key:
                return jsonify({
                    'success': False,
                    'error': 'Key parameter required for press_key command'
                }), 400
                
            success = controller.press_key(key)
            return jsonify({
                'success': success,
                'message': f'Pressed key: {key}' if success else f'Failed to press key: {key}'
            })
            
        elif command == 'input_text':
            text = params.get('text')
            if not text:
                return jsonify({
                    'success': False,
                    'error': 'Text parameter required for input_text command'
                }), 400
                
            success = controller.input_text(text)
            return jsonify({
                'success': success,
                'message': f'Input text: {text}' if success else f'Failed to input text: {text}'
            })
            
        else:
            return jsonify({
                'success': False,
                'error': f'Unknown command: {command}'
            }), 400
            
    except Exception as e:
        print(f"[@api:ir-remote:command] ERROR: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Command failed: {str(e)}'
        }), 500

@remote_bp.route('/ir-remote/status', methods=['GET'])
def get_ir_remote_status():
    """Get IR remote connection status"""
    ir_remote_session = get_ir_remote_session()
    
    return jsonify({
        'connected': ir_remote_session['connected'],
        'connection_details': ir_remote_session['connection_details']
    })

@remote_bp.route('/ir-remote/config', methods=['GET'])
def get_ir_remote_config():
    """Get IR remote configuration including layout, buttons, and image."""
    try:
        from controllers.remote.infrared import IRRemoteController
        config = IRRemoteController.get_remote_config()
        
        return jsonify({
            'success': True,
            'config': config
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to get config: {str(e)}'
        }), 500

# =====================================================
# BLUETOOTH REMOTE CONTROL ENDPOINTS
# =====================================================

@remote_bp.route('/bluetooth-remote/connect', methods=['POST'])
def connect_bluetooth_remote():
    """Connect to Bluetooth remote device"""
    bluetooth_remote_session = get_bluetooth_remote_session()
    
    error = check_controllers_available()
    if error:
        return error
    
    try:
        data = request.json
        device_address = data.get('device_address', '00:00:00:00:00:00')
        device_name = data.get('device_name', 'Unknown Device')
        pairing_pin = data.get('pairing_pin', '0000')
        
        print(f"[@api:bluetooth-remote:connect] Connecting to Bluetooth device: {device_address}")
        
        # Create Bluetooth remote controller
        from controllers.remote.bluetooth import BluetoothRemoteController
        
        bluetooth_controller = BluetoothRemoteController(
            device_name=device_name,
            device_type="bluetooth_remote",
            device_address=device_address,
            pairing_pin=pairing_pin
        )
        
        # Connect to the Bluetooth device
        if bluetooth_controller.connect():
            bluetooth_remote_session.update({
                'controller': bluetooth_controller,
                'connected': True,
                'connection_details': {
                    'device_address': device_address,
                    'device_name': device_name,
                    'pairing_pin': pairing_pin
                }
            })
            
            print(f"[@api:bluetooth-remote:connect] Successfully connected to Bluetooth device")
            return jsonify({
                'success': True,
                'message': f'Connected to Bluetooth device {device_name}',
                'device_address': device_address,
                'device_name': device_name
            })
        else:
            print(f"[@api:bluetooth-remote:connect] Failed to connect to Bluetooth device")
            return jsonify({
                'success': False,
                'error': 'Failed to connect to Bluetooth device'
            })
            
    except Exception as e:
        print(f"[@api:bluetooth-remote:connect] ERROR: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Connection failed: {str(e)}'
        }), 500

@remote_bp.route('/bluetooth-remote/disconnect', methods=['POST'])
def disconnect_bluetooth_remote():
    """Disconnect from Bluetooth remote device"""
    bluetooth_remote_session = get_bluetooth_remote_session()
    
    try:
        print(f"[@api:bluetooth-remote:disconnect] Disconnecting from Bluetooth device")
        
        if bluetooth_remote_session['controller']:
            bluetooth_remote_session['controller'].disconnect()
            
        # Reset session
        bluetooth_remote_session.update({
            'controller': None,
            'connected': False,
            'connection_details': {}
        })
        
        print(f"[@api:bluetooth-remote:disconnect] Successfully disconnected")
        return jsonify({
            'success': True,
            'message': 'Disconnected from Bluetooth device'
        })
        
    except Exception as e:
        print(f"[@api:bluetooth-remote:disconnect] ERROR: {str(e)}")
        # Reset session even on error
        bluetooth_remote_session.update({
            'controller': None,
            'connected': False,
            'connection_details': {}
        })
        
        return jsonify({
            'success': True,  # Still return success since we reset the session
            'message': 'Disconnected from Bluetooth device'
        })

@remote_bp.route('/bluetooth-remote/command', methods=['POST'])
def send_bluetooth_remote_command():
    """Send command to Bluetooth remote device"""
    bluetooth_remote_session = get_bluetooth_remote_session()
    
    if not bluetooth_remote_session['connected'] or not bluetooth_remote_session['controller']:
        return jsonify({
            'success': False,
            'error': 'Bluetooth remote not connected'
        }), 400
    
    try:
        data = request.json
        command = data.get('command')
        params = data.get('params', {})
        
        print(f"[@api:bluetooth-remote:command] Executing command: {command} with params: {params}")
        
        controller = bluetooth_remote_session['controller']
        
        if command == 'press_key':
            key = params.get('key')
            if not key:
                return jsonify({
                    'success': False,
                    'error': 'Key parameter required for press_key command'
                }), 400
                
            success = controller.press_key(key)
            return jsonify({
                'success': success,
                'message': f'Pressed key: {key}' if success else f'Failed to press key: {key}'
            })
            
        elif command == 'input_text':
            text = params.get('text')
            if not text:
                return jsonify({
                    'success': False,
                    'error': 'Text parameter required for input_text command'
                }), 400
                
            success = controller.input_text(text)
            return jsonify({
                'success': success,
                'message': f'Input text: {text}' if success else f'Failed to input text: {text}'
            })
            
        else:
            return jsonify({
                'success': False,
                'error': f'Unknown command: {command}'
            }), 400
            
    except Exception as e:
        print(f"[@api:bluetooth-remote:command] ERROR: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Command failed: {str(e)}'
        }), 500

@remote_bp.route('/bluetooth-remote/status', methods=['GET'])
def get_bluetooth_remote_status():
    """Get Bluetooth remote connection status"""
    bluetooth_remote_session = get_bluetooth_remote_session()
    
    return jsonify({
        'connected': bluetooth_remote_session['connected'],
        'connection_details': bluetooth_remote_session['connection_details']
    })

@remote_bp.route('/bluetooth-remote/config', methods=['GET'])
def get_bluetooth_remote_config():
    """Get Bluetooth remote configuration including layout, buttons, and image."""
    try:
        from controllers.remote.bluetooth import BluetoothRemoteController
        config = BluetoothRemoteController.get_remote_config()
        
        return jsonify({
            'success': True,
            'config': config
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to get config: {str(e)}'
        }), 500 
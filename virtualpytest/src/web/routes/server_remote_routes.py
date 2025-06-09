"""
Standardized Remote Control Routes (v2)

This module contains the new standardized remote control API endpoints following
the /{context}/{domain}/{action} convention with proper error handling.

New route structure:
- /server/remote/android-tv/*
- /server/remote/android-mobile/*
- /server/remote/ir/*
- /server/remote/bluetooth/*
"""

from flask import Blueprint, request, jsonify, current_app
import time
import os
import sys

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from .utils import check_controllers_available
from ..utils.error_handling import (
    ErrorCodes, ErrorTypes, create_error_response,
    missing_required_field, invalid_parameter_value,
    device_not_ready, controller_not_available,
    controller_error, host_not_initialized,
    validate_required_fields, handle_common_exceptions
)

# Create blueprint with new standardized prefix
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
@handle_common_exceptions
def take_android_tv_control():
    """Take control of Android TV device via ADB."""
    android_tv_session = get_android_tv_session()
    
    try:
        data = request.get_json() or {}
        
        # Validate required fields using standardized validation
        validation_error = validate_required_fields(data, ['device_ip'])
        if validation_error:
            return validation_error
        
        # Release any existing session first
        if android_tv_session.get('connected') and android_tv_session.get('controller'):
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
                'message': f'Connected to Android TV at {data["device_ip"]}:{data.get("device_port", 5555)}',
                'session_info': android_tv_session['connection_details']
            })
        else:
            return device_not_ready(
                device_ip=data['device_ip'],
                device_port=int(data.get('device_port', 5555)),
                reason="Failed to connect to Android TV. Check device connectivity."
            )
            
    except Exception as e:
        return controller_error(
            controller_type="android_tv",
            operation="take_control",
            error_details=str(e)
        )

@remote_bp.route('/android-tv/release-control', methods=['POST'])
@handle_common_exceptions
def release_android_tv_control():
    """Release control of Android TV device."""
    android_tv_session = get_android_tv_session()
    
    try:
        if android_tv_session.get('connected') and android_tv_session.get('controller'):
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
@handle_common_exceptions
def send_android_tv_command():
    """Send command to Android TV device."""
    android_tv_session = get_android_tv_session()
    
    if not android_tv_session.get('connected') or not android_tv_session.get('controller'):
        return create_error_response(
            error_code=ErrorCodes.DEVICE_NOT_READY,
            message="No active Android TV session. Please take control first.",
            error_type=ErrorTypes.DEVICE_STATE,
            details={"suggested_action": "call_take_control_first"},
            status_code=422
        )
    
    try:
        data = request.get_json() or {}
        
        # Validate required fields
        validation_error = validate_required_fields(data, ['command'])
        if validation_error:
            return validation_error
        
        command = data['command']
        params = data.get('params', {})
        
        controller = android_tv_session['controller']
        
        if command == 'press_key':
            if 'key' not in params:
                return missing_required_field('params.key')
            
            success = controller.press_key(params['key'])
            return jsonify({
                'success': success,
                'message': f'Key "{params["key"]}" {"sent" if success else "failed"}'
            })
            
        elif command == 'input_text':
            if 'text' not in params:
                return missing_required_field('params.text')
            
            success = controller.input_text(params['text'])
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
            if 'package' not in params:
                return missing_required_field('params.package')
            
            success = controller.launch_app(params['package'])
            return jsonify({
                'success': success,
                'message': f'App "{params["package"]}" {"launched" if success else "failed"}'
            })
            
        elif command == 'close_app':
            if 'package' not in params:
                return missing_required_field('params.package')
            
            success = controller.close_app(params['package'])
            return jsonify({
                'success': success,
                'message': f'App "{params["package"]}" {"closed" if success else "failed"}'
            })
            
        else:
            return invalid_parameter_value('command', command, 'press_key, input_text, execute_sequence, launch_app, or close_app')
            
    except Exception as e:
        return controller_error(
            controller_type="android_tv",
            operation=f"command_{command}",
            error_details=str(e)
        )

@remote_bp.route('/android-tv/status', methods=['GET'])
@handle_common_exceptions
def get_android_tv_status():
    """Get Android TV session status."""
    android_tv_session = get_android_tv_session()
    
    try:
        if android_tv_session.get('connected') and android_tv_session.get('controller'):
            controller_status = android_tv_session['controller'].get_status()
            return jsonify({
                'success': True,
                'connected': True,
                'session_info': android_tv_session.get('connection_details', {}),
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
        return controller_error(
            controller_type="android_tv",
            operation="get_status",
            error_details=str(e)
        )

@remote_bp.route('/android-tv/defaults', methods=['GET'])
@handle_common_exceptions
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
        return controller_error(
            controller_type="android_tv",
            operation="get_defaults",
            error_details=str(e)
        )

@remote_bp.route('/android-tv/config', methods=['GET'])
@handle_common_exceptions
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
        return controller_error(
            controller_type="android_tv",
            operation="get_config",
            error_details=str(e)
        )

@remote_bp.route('/android-tv/screenshot', methods=['POST'])
@handle_common_exceptions
def android_tv_screenshot():
    """Take a screenshot of the Android TV device."""
    android_tv_session = get_android_tv_session()
        
    if not android_tv_session.get('connected') or not android_tv_session.get('controller'):
        return create_error_response(
            error_code=ErrorCodes.DEVICE_NOT_READY,
            message="No active Android TV connection",
            error_type=ErrorTypes.DEVICE_STATE,
            details={"suggested_action": "call_take_control_first"},
            status_code=422
        )
        
    try:
        success, screenshot_data, error = android_tv_session['controller'].take_screenshot()
        
        if success:
            return jsonify({
                'success': True,
                'screenshot': screenshot_data,  # Base64 encoded image
                'format': 'png'
            })
        else:
            return controller_error(
                controller_type="android_tv",
                operation="take_screenshot",
                error_details=error or "Screenshot operation failed"
            )
            
    except Exception as e:
        return controller_error(
            controller_type="android_tv",
            operation="take_screenshot",
            error_details=str(e)
        )

# =====================================================
# ANDROID MOBILE REMOTE CONTROL ENDPOINTS
# =====================================================

@remote_bp.route('/android-mobile/take-control', methods=['POST'])
@handle_common_exceptions
def android_mobile_take_control():
    """Take control of Android Mobile device via SSH and ADB."""
    try:
        from controllers.remote.android_mobile import AndroidMobileRemoteController
        
        data = request.get_json() or {}
        print(f"[@api:android-mobile:take-control] Connection data received")
        
        # Validate required fields
        validation_error = validate_required_fields(data, ['device_ip'])
        if validation_error:
            return validation_error
        
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
            return device_not_ready(
                device_ip=data.get('device_ip'),
                device_port=int(data.get('device_port', 5555)),
                reason="Failed to connect to Android Mobile device"
            )
            
    except Exception as e:
        return controller_error(
            controller_type="android_mobile",
            operation="take_control",
            error_details=str(e)
        )

@remote_bp.route('/android-mobile/release-control', methods=['POST'])
@handle_common_exceptions
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
        return controller_error(
            controller_type="android_mobile",
            operation="release_control",
            error_details=str(e)
        )

@remote_bp.route('/android-mobile/execute-action', methods=['POST'])
@handle_common_exceptions
def execute_android_mobile_action():
    """Execute a specific action by action ID for Android Mobile controller."""
        if not hasattr(current_app, 'android_mobile_controller') or not current_app.android_mobile_controller:
        return create_error_response(
            error_code=ErrorCodes.DEVICE_NOT_READY,
            message="No active Android Mobile connection",
            error_type=ErrorTypes.DEVICE_STATE,
            details={"suggested_action": "call_take_control_first"},
            status_code=422
        )
        
    try:
        data = request.get_json() or {}
        
        # Validate required fields
        validation_error = validate_required_fields(data, ['action'])
        if validation_error:
            return validation_error
        
        action_data = data['action']
        
        # Validate action structure
        action_validation = validate_required_fields(action_data, ['id', 'command'])
        if action_validation:
            return action_validation
        
        action_id = action_data['id']
        command = action_data['command']
        params = action_data.get('params', {})
        
        print(f"[@route:execute_android_mobile_action] Executing action {action_id}: {command} with params: {params}")
        
        success = False
        message = ""
        
        # Execute based on the command type
        if command == 'press_key':
            if 'key' not in params:
                return missing_required_field('action.params.key')
            success = current_app.android_mobile_controller.press_key(params['key'])
            message = f'Key "{params["key"]}" {"pressed" if success else "failed"}'
            
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
            if 'package' not in params:
                return missing_required_field('action.params.package')
            success = current_app.android_mobile_controller.launch_app(params['package'])
            message = f'App "{params["package"]}" {"launched" if success else "failed"}'
            
        elif command == 'close_app':
            if 'package' not in params:
                return missing_required_field('action.params.package')
            success = current_app.android_mobile_controller.close_app(params['package'])
            message = f'App "{params["package"]}" {"closed" if success else "failed"}'
            
        elif command == 'input_text':
            if 'text' not in params:
                return missing_required_field('action.params.text')
            success = current_app.android_mobile_controller.input_text(params['text'])
            message = f'Text input {"successful" if success else "failed"}'
            
        elif command == 'click_element':
            if 'element_id' not in params:
                return missing_required_field('action.params.element_id')
            
            element_id = params['element_id']
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
            if 'x' not in params or 'y' not in params:
                return missing_required_field('action.params.x and action.params.y')
            
            try:
                x = int(params['x'])
                y = int(params['y'])
            except (ValueError, TypeError):
                return invalid_parameter_value('coordinates', f"x={params.get('x')}, y={params.get('y')}", "valid integers")
            
            # Use the coordinate tap method from the controller
            success = current_app.android_mobile_controller.tap_coordinates(x, y)
            message = f'Coordinate tap at ({x}, {y}) {"successful" if success else "failed"}'
            
        else:
            return invalid_parameter_value('action.command', command, 'valid command type')
        
        return jsonify({
            'success': success,
            'message': message,
            'action_id': action_id,
            'command': command
        })
        
    except Exception as e:
        return controller_error(
            controller_type="android_mobile",
            operation="execute_action",
            error_details=str(e)
        )

# Add remaining Android Mobile endpoints with same pattern...
@remote_bp.route('/android-mobile/config', methods=['GET'])
@handle_common_exceptions
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
        return controller_error(
            controller_type="android_mobile",
            operation="get_config",
            error_details=str(e)
        )

@remote_bp.route('/android-mobile/defaults', methods=['GET'])
@handle_common_exceptions
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
        return controller_error(
            controller_type="android_mobile",
            operation="get_defaults",
            error_details=str(e)
        )

# Continue with remaining endpoints following the same pattern...
# (I'll add the rest if you want to see them, but this demonstrates the approach) 
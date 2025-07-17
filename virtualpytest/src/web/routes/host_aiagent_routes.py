"""
Host AI Agent Routes

Host-side AI agent endpoints that execute using instantiated AI agent controllers.
"""

from flask import Blueprint, request, jsonify
from src.utils.host_utils import get_controller, get_device_by_id

# Create blueprint
host_aiagent_bp = Blueprint('host_aiagent', __name__, url_prefix='/host/aiagent')

@host_aiagent_bp.route('/executeTask', methods=['POST'])
def execute_task():
    """Execute AI task using AI agent controller."""
    try:
        # Get device_id from request (defaults to device1)
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        task_description = data.get('task_description', '')
        
        print(f"[@route:host_aiagent:execute_task] Executing AI task for device: {device_id}")
        print(f"[@route:host_aiagent:execute_task] Task: {task_description}")
        
        # Get AI agent controller for the specified device
        ai_controller = get_controller(device_id, 'ai')
        
        if not ai_controller:
            device = get_device_by_id(device_id)
            if not device:
                return jsonify({
                    'success': False,
                    'error': f'Device {device_id} not found'
                }), 404
            
            return jsonify({
                'success': False,
                'error': f'No AI agent controller found for device {device_id}',
                'available_capabilities': device.get_capabilities()
            }), 404
        
        print(f"[@route:host_aiagent:execute_task] Using AI controller: {type(ai_controller).__name__}")
        
        # Get device info and model
        device = get_device_by_id(device_id)
        if not device:
            return jsonify({
                'success': False,
                'error': f'Device {device_id} not found'
            }), 404
        
        device_model = device.device_model
        print(f"[@route:host_aiagent:execute_task] Device model: {device_model}")
        
        # Get real available actions from device capabilities (same as DeviceDataContext)
        device_action_types = device.get_available_action_types()
        available_actions = []
        
        # Enhanced action flattening with better AI context
        for category, actions in device_action_types.items():
            if isinstance(actions, list):
                for action in actions:
                    # Build enhanced action description for AI
                    base_command = action.get('command', '')
                    base_params = action.get('params', {})
                    original_description = action.get('description', '')
                    action_id = action.get('id', '')
                    label = action.get('label', '')
                    
                    # Create AI-friendly action name and description
                    ai_action_name = label if label else base_command
                    ai_description = original_description
                    
                    # Enhance specific actions with common user task mappings
                    if base_command == 'press_key' and base_params.get('key') == 'BACK':
                        ai_action_name = "go_back_button"
                        ai_description = "Go back to previous screen (use for: 'go back', 'navigate back', 'return to previous page')"
                        
                    elif base_command == 'press_key' and base_params.get('key') == 'HOME':
                        ai_action_name = "go_home_button"
                        ai_description = "Go to home screen (use for: 'go home', 'navigate to home', 'return to home')"
                        
                    elif base_command == 'input_text':
                        ai_action_name = "type_text"
                        ai_description = "Type text into current input field (use for: 'enter text', 'type', 'input', 'write')"
                        
                    elif base_command == 'click_element':
                        ai_action_name = "click_ui_element"
                        ai_description = "Click on UI element by text/ID (use for: 'click [element]', 'tap [element]', 'select [item]')"
                        
                    elif base_command == 'tap_coordinates':
                        ai_action_name = "tap_screen_coordinates"
                        ai_description = "Tap at specific screen coordinates (use for: 'tap at position', 'click coordinates')"
                        
                    elif base_command == 'launch_app':
                        ai_action_name = "open_application"
                        ai_description = "Launch/open an Android application (use for: 'open app', 'start app', 'launch')"
                        
                    elif base_command == 'close_app':
                        ai_action_name = "close_application"
                        ai_description = "Close/stop an Android application (use for: 'close app', 'stop app', 'exit app')"
                    
                    # Build comprehensive action context for AI
                    ai_action = {
                        'command': base_command,
                        'ai_name': ai_action_name,
                        'description': ai_description,
                        'action_type': action.get('action_type', category),
                        'params': base_params,
                        'category': category,
                        'full_context': {
                            'original_id': action_id,
                            'original_label': label,
                            'requires_input': action.get('requiresInput', False),
                            'input_example': action.get('inputPlaceholder', ''),
                            'common_use_cases': []
                        }
                    }
                    
                    # Add common use cases for better AI understanding
                    if 'back' in ai_action_name.lower():
                        ai_action['full_context']['common_use_cases'] = [
                            "go back", "navigate back", "previous screen", "return", "back button"
                        ]
                    elif 'home' in ai_action_name.lower():
                        ai_action['full_context']['common_use_cases'] = [
                            "go home", "home screen", "main screen", "home button"
                        ]
                    elif 'text' in ai_action_name.lower():
                        ai_action['full_context']['common_use_cases'] = [
                            "type text", "enter text", "input text", "write", "fill field"
                        ]
                    elif 'click' in ai_action_name.lower():
                        ai_action['full_context']['common_use_cases'] = [
                            "click [element]", "tap [element]", "select [item]", "press [element]"
                        ]
                    
                    available_actions.append(ai_action)
        
        print(f"[@route:host_aiagent:execute_task] Available actions: {len(available_actions)} actions from device capabilities")
        
        # Get real available verifications from device capabilities (same as DeviceDataContext)
        device_verification_types = device.get_available_verification_types()
        available_verifications = []
        
        # Flatten all verification categories into a single list for AI
        for category, verifications in device_verification_types.items():
            if isinstance(verifications, list):
                for verification in verifications:
                    available_verifications.append({
                        'verification_type': verification.get('verification_type', ''),
                        'description': verification.get('description', f"{verification.get('verification_type', '')} verification"),
                        'params': verification.get('params', {}),
                        'category': category
                    })
        
        print(f"[@route:host_aiagent:execute_task] Available verifications: {len(available_verifications)} verifications from device capabilities")
        
        # Execute task using AI controller with real device capabilities and model
        result = ai_controller.execute_task(
            task_description, 
            available_actions, 
            available_verifications,
            device_model=device_model
        )
        
        return jsonify({
            'success': result.get('success', False),
            'message': result.get('message', ''),
            'error': result.get('error'),
            'execution_log': result.get('execution_log', []),
            'current_step': result.get('current_step', ''),
            'suggested_action': result.get('suggested_action'),
            'suggested_verification': result.get('suggested_verification'),
            'device_id': device_id
        })
        
    except Exception as e:
        print(f"[@route:host_aiagent:execute_task] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'AI task execution error: {str(e)}'
        }), 500

@host_aiagent_bp.route('/getStatus', methods=['GET'])
def get_status():
    """Get AI agent execution status."""
    try:
        # Get device_id from query params (defaults to device1)
        device_id = request.args.get('device_id', 'device1')
        
        print(f"[@route:host_aiagent:get_status] Getting AI status for device: {device_id}")
        
        # Get AI agent controller for the specified device
        ai_controller = get_controller(device_id, 'ai')
        
        if not ai_controller:
            return jsonify({
                'success': False,
                'error': f'No AI agent controller found for device {device_id}'
            }), 404
        
        # Get status from AI controller
        status = ai_controller.get_status()
        
        return jsonify(status)
        
    except Exception as e:
        print(f"[@route:host_aiagent:get_status] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'AI status error: {str(e)}'
        }), 500

@host_aiagent_bp.route('/stopExecution', methods=['POST'])
def stop_execution():
    """Stop AI agent execution."""
    try:
        # Get device_id from request (defaults to device1)
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        
        print(f"[@route:host_aiagent:stop_execution] Stopping AI execution for device: {device_id}")
        
        # Get AI agent controller for the specified device
        ai_controller = get_controller(device_id, 'ai')
        
        if not ai_controller:
            return jsonify({
                'success': False,
                'error': f'No AI agent controller found for device {device_id}'
            }), 404
        
        # Stop execution using AI controller
        result = ai_controller.stop_execution()
        
        return jsonify({
            'success': result.get('success', False),
            'message': result.get('message', ''),
            'execution_log': result.get('execution_log', []),
            'device_id': device_id
        })
        
    except Exception as e:
        print(f"[@route:host_aiagent:stop_execution] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'AI stop execution error: {str(e)}'
        }), 500 
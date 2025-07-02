"""
Host AI Agent Routes

Host-side AI agent endpoints that execute using instantiated AI agent controllers.
"""

from flask import Blueprint, request, jsonify
from src.utils.host_utils import get_controller, get_device_by_id

# Create blueprint
aiagent_host_bp = Blueprint('host_aiagent', __name__, url_prefix='/host/aiagent')

@aiagent_host_bp.route('/executeTask', methods=['POST'])
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
        
        device_model = device.get('device_model', 'unknown')
        print(f"[@route:host_aiagent:execute_task] Device model: {device_model}")
        
        # Get real available actions from device capabilities (same as DeviceDataContext)
        device_action_types = device.get('device_action_types', {})
        available_actions = []
        
        # Flatten all action categories into a single list for AI
        for category, actions in device_action_types.items():
            if isinstance(actions, list):
                for action in actions:
                    available_actions.append({
                        'command': action.get('command', ''),
                        'description': action.get('description', f"{action.get('command', '')} action"),
                        'action_type': action.get('action_type', category),
                        'params': action.get('params', {}),
                        'category': category
                    })
        
        print(f"[@route:host_aiagent:execute_task] Available actions: {len(available_actions)} actions from device capabilities")
        
        # Get real available verifications from device capabilities (same as DeviceDataContext)
        device_verification_types = device.get('device_verification_types', {})
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

@aiagent_host_bp.route('/getStatus', methods=['GET'])
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

@aiagent_host_bp.route('/stopExecution', methods=['POST'])
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
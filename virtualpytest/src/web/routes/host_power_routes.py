"""
Host Power Routes

Host-side power control endpoints that execute power commands using instantiated power controllers.
"""

from flask import Blueprint, request, jsonify
from src.utils.host_utils import get_controller, get_device_by_id

# Create blueprint
host_power_bp = Blueprint('host_power', __name__, url_prefix='/host/power')

# =====================================================
# POWER CONTROLLER ENDPOINTS
# =====================================================

@host_power_bp.route('/getStatus', methods=['POST'])
def get_power_status():
    """Get power status using the power controller."""
    try:
        # Get device_id from request (defaults to device1)
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        
        print(f"[@route:host_power:get_power_status] Getting power status for device: {device_id}")
        
        # Get power controller for the specified device
        power_controller = get_controller(device_id, 'power')
        
        if not power_controller:
            device = get_device_by_id(device_id)
            if not device:
                return jsonify({
                    'success': False,
                    'error': f'Device {device_id} not found'
                }), 404
            
            return jsonify({
                'success': False,
                'error': f'No power controller found for device {device_id}',
                'available_capabilities': device.get_capabilities()
            }), 404
        
        print(f"[@route:host_power:get_power_status] Using power controller: {type(power_controller).__name__}")
        
        # Get power status from controller
        status = power_controller.get_power_status()
        
        return jsonify({
            'success': True,
            'status': status,
            'device_id': device_id
        })
            
    except Exception as e:
        print(f"[@route:host_power:get_power_status] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Power status error: {str(e)}'
        }), 500

@host_power_bp.route('/executeCommand', methods=['POST'])
def execute_power_command():
    """Execute a power command."""
    try:
        data = request.get_json()
        command = data.get('command')
        params = data.get('params', {})
        device_id = data.get('device_id', 'device1')
        
        print(f"[@route:host_power:execute_power_command] Executing command: {command} with params: {params} for device: {device_id}")
        
        if not command:
            return jsonify({
                'success': False,
                'error': 'command is required'
            }), 400
        
        # Validate command
        valid_commands = ['power_on', 'power_off', 'reboot']
        if command not in valid_commands:
            return jsonify({
                'success': False,
                'error': f'Invalid command. Valid commands: {valid_commands}'
            }), 400
        
        # Get power controller for the specified device
        power_controller = get_controller(device_id, 'power')
        
        if not power_controller:
            device = get_device_by_id(device_id)
            if not device:
                return jsonify({
                    'success': False,
                    'error': f'Device {device_id} not found'
                }), 404
            
            return jsonify({
                'success': False,
                'error': f'No power controller found for device {device_id}',
                'available_capabilities': device.get_capabilities()
            }), 404
        
        print(f"[@route:host_power:execute_power_command] Using power controller: {type(power_controller).__name__}")
        
        # Use controller-specific abstraction - single line!
        success = power_controller.execute_command(command, params)
        
        return jsonify({
            'success': success,
            'message': f'Command {command} {"executed successfully" if success else "failed"}',
            'device_id': device_id
        })
            
    except Exception as e:
        print(f"[@route:host_power:execute_power_command] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Power command execution error: {str(e)}'
        }), 500 
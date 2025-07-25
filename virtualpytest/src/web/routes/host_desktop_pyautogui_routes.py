"""
Host Desktop PyAutoGUI Routes

Host-side PyAutoGUI desktop endpoints that execute using instantiated PyAutoGUI desktop controllers.
"""

from flask import Blueprint, request, jsonify
from src.utils.host_utils import get_controller, get_device_by_id

# Create blueprint
host_desktop_pyautogui_bp = Blueprint('host_desktop_pyautogui', __name__, url_prefix='/host/desktop/pyautogui')

def get_desktop_controller(device_id: str, controller_type: str, check_device: bool = False):
    """
    Helper function to get desktop controller and handle common validation.
    
    Args:
        device_id: ID of the device
        controller_type: Type of controller ('desktop')
        check_device: Whether to also validate device existence
        
    Returns:
        Tuple of (controller, device, error_response) where error_response is None if successful
    """
    from src.utils.host_utils import get_host
    host = get_host()
    host_device = host.get_device(device_id or 'host')
    
    if not host_device:
        error_response = jsonify({
            'success': False,
            'error': f'Device {device_id or "host"} not found'
        }), 404
        return None, None, error_response
    
    # Get all desktop controllers and find PyAutoGUI controller
    desktop_controllers = host_device.get_controllers('desktop')
    
    if not desktop_controllers:
        error_response = jsonify({
            'success': False,
            'error': f'No desktop controllers found for device {device_id or "host"}'
        }), 404
        return None, None, error_response
    
    # Look for PyAutoGUI controller specifically
    pyautogui_controller = None
    for controller in desktop_controllers:
        if 'pyautogui' in controller.desktop_type.lower() or 'PyAutoGUI' in type(controller).__name__:
            pyautogui_controller = controller
            break
    
    if not pyautogui_controller:
        error_response = jsonify({
            'success': False,
            'error': f'No PyAutoGUI desktop controller found for device {device_id or "host"}'
        }), 404
        return None, None, error_response
    
    return pyautogui_controller, host_device, None

@host_desktop_pyautogui_bp.route('/executeCommand', methods=['POST'])
def execute_pyautogui_command():
    """Execute PyAutoGUI desktop command on host device"""
    try:
        print("[@route:host_desktop_pyautogui:execute_command] Executing PyAutoGUI desktop command")
        
        # Get request data
        data = request.get_json() or {}
        command = data.get('command')
        params = data.get('params', {})
        device_id = data.get('device_id')  # Optional, defaults to host
        
        print(f"[@route:host_desktop_pyautogui:execute_command] Command: {command}, Params: {params}")
        
        if not command:
            return jsonify({
                'success': False,
                'error': 'command is required'
            }), 400
        
        # Get PyAutoGUI desktop controller
        controller, device, error_response = get_desktop_controller(device_id, 'desktop')
        if error_response:
            return error_response
        
        print(f"[@route:host_desktop_pyautogui:execute_command] Using controller: {type(controller).__name__}")
        
        # Execute command using controller
        result = controller.execute_command(command, params)
        
        print(f"[@route:host_desktop_pyautogui:execute_command] Command result: success={result.get('success', False)}")
        
        return jsonify(result)
        
    except Exception as e:
        print(f"[@route:host_desktop_pyautogui:execute_command] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Command execution failed: {str(e)}'
        }), 500 
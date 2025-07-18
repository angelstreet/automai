"""
Host Desktop Routes

Host-side desktop control endpoints that execute commands using instantiated desktop controllers.
"""

from flask import Blueprint, request, jsonify
from src.utils.host_utils import get_controller, get_device_by_id

# Create blueprint
host_desktop_bp = Blueprint('host_desktop', __name__, url_prefix='/host/desktop')

# =====================================================
# DESKTOP CONTROLLER ENDPOINTS
# =====================================================

@host_desktop_bp.route('/executeCommand', methods=['POST'])
def execute_command():
    """Execute a desktop command using desktop controller."""
    try:
        # Get device_id from request (defaults to device1)
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        command = data.get('command')
        params = data.get('params', {})
        
        print(f"[@route:host_desktop:execute_command] Executing command: {command} with params: {params} for device: {device_id}")
        
        if not command:
            return jsonify({
                'success': False,
                'error': 'command is required'
            }), 400
        
        # Get desktop controller for the specified device
        desktop_controller = get_controller(device_id, 'desktop')
        
        if not desktop_controller:
            device = get_device_by_id(device_id)
            if not device:
                return jsonify({
                    'success': False,
                    'error': f'Device {device_id} not found'
                }), 404
            
            return jsonify({
                'success': False,
                'error': f'No desktop controller found for device {device_id}',
                'available_capabilities': device.get_capabilities()
            }), 404
        
        print(f"[@route:host_desktop:execute_command] Using desktop controller: {type(desktop_controller).__name__}")
        
        # Use controller-specific abstraction - single line!
        success = desktop_controller.execute_command(command, params)
        
        return jsonify({
            'success': success,
            'message': f'Command {command} {"executed successfully" if success else "failed"}',
            'device_id': device_id
        })
            
    except Exception as e:
        print(f"[@route:host_desktop:execute_command] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Command execution error: {str(e)}'
        }), 500

@host_desktop_bp.route('/readFile', methods=['POST'])
def read_file():
    """Read file content using desktop controller."""
    try:
        # Get device_id from request (defaults to device1)
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        file_path = data.get('file_path')
        
        print(f"[@route:host_desktop:read_file] Reading file: {file_path} for device: {device_id}")
        
        if not file_path:
            return jsonify({
                'success': False,
                'error': 'file_path is required'
            }), 400
        
        # Get desktop controller for the specified device
        desktop_controller = get_controller(device_id, 'desktop')
        
        if not desktop_controller:
            device = get_device_by_id(device_id)
            if not device:
                return jsonify({
                    'success': False,
                    'error': f'Device {device_id} not found'
                }), 404
            
            return jsonify({
                'success': False,
                'error': f'No desktop controller found for device {device_id}',
                'available_capabilities': device.get_capabilities()
            }), 404
        
        print(f"[@route:host_desktop:read_file] Using desktop controller: {type(desktop_controller).__name__}")
        
        # Use get_file_content method
        if not hasattr(desktop_controller, 'get_file_content'):
            return jsonify({
                'success': False,
                'error': 'File reading not supported by this desktop controller'
            }), 400
        
        success, content, error = desktop_controller.get_file_content(file_path)
        
        if success:
            return jsonify({
                'success': True,
                'content': content,
                'device_id': device_id
            })
        else:
            return jsonify({
                'success': False,
                'error': error or 'File read failed'
            }), 400
            
    except Exception as e:
        print(f"[@route:host_desktop:read_file] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'File read error: {str(e)}'
        }), 500

@host_desktop_bp.route('/writeFile', methods=['POST'])
def write_file():
    """Write file content using desktop controller."""
    try:
        # Get device_id from request (defaults to device1)
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        file_path = data.get('file_path')
        content = data.get('content')
        
        print(f"[@route:host_desktop:write_file] Writing file: {file_path} for device: {device_id}")
        
        if not file_path or content is None:
            return jsonify({
                'success': False,
                'error': 'file_path and content are required'
            }), 400
        
        # Get desktop controller for the specified device
        desktop_controller = get_controller(device_id, 'desktop')
        
        if not desktop_controller:
            device = get_device_by_id(device_id)
            if not device:
                return jsonify({
                    'success': False,
                    'error': f'Device {device_id} not found'
                }), 404
            
            return jsonify({
                'success': False,
                'error': f'No desktop controller found for device {device_id}',
                'available_capabilities': device.get_capabilities()
            }), 404
        
        print(f"[@route:host_desktop:write_file] Using desktop controller: {type(desktop_controller).__name__}")
        
        # Use write_file_content method
        if not hasattr(desktop_controller, 'write_file_content'):
            return jsonify({
                'success': False,
                'error': 'File writing not supported by this desktop controller'
            }), 400
        
        success, error = desktop_controller.write_file_content(file_path, content)
        
        if success:
            return jsonify({
                'success': True,
                'message': f'File {file_path} written successfully',
                'device_id': device_id
            })
        else:
            return jsonify({
                'success': False,
                'error': error or 'File write failed'
            }), 400
            
    except Exception as e:
        print(f"[@route:host_desktop:write_file] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'File write error: {str(e)}'
        }), 500

@host_desktop_bp.route('/getStatus', methods=['POST'])
def get_status():
    """Get desktop controller status."""
    try:
        # Get device_id from request (defaults to device1)
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        
        print(f"[@route:host_desktop:get_status] Getting status for device: {device_id}")
        
        # Get desktop controller for the specified device
        desktop_controller = get_controller(device_id, 'desktop')
        
        if not desktop_controller:
            device = get_device_by_id(device_id)
            if not device:
                return jsonify({
                    'success': False,
                    'error': f'Device {device_id} not found'
                }), 404
            
            return jsonify({
                'success': False,
                'error': f'No desktop controller found for device {device_id}',
                'available_capabilities': device.get_capabilities()
            }), 404
        
        print(f"[@route:host_desktop:get_status] Using desktop controller: {type(desktop_controller).__name__}")
        
        # Get controller status
        status = desktop_controller.get_status()
        
        return jsonify({
            'success': True,
            'status': status,
            'device_id': device_id
        })
            
    except Exception as e:
        print(f"[@route:host_desktop:get_status] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Status check error: {str(e)}'
        }), 500 
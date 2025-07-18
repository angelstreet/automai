"""
Host Web Routes

Host-side web automation endpoints that execute commands using instantiated web controllers.
"""

from flask import Blueprint, request, jsonify
from src.utils.host_utils import get_controller, get_device_by_id

# Create blueprint
host_web_bp = Blueprint('host_web', __name__, url_prefix='/host/web')

# =====================================================
# WEB CONTROLLER ENDPOINTS
# =====================================================

@host_web_bp.route('/executeCommand', methods=['POST'])
def execute_command():
    """Execute a web automation command using web controller."""
    try:
        # Get device_id from request (defaults to device1)
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        command = data.get('command')
        params = data.get('params', {})
        
        print(f"[@route:host_web:execute_command] Executing command: {command} with params: {params} for device: {device_id}")
        
        if not command:
            return jsonify({
                'success': False,
                'error': 'command is required'
            }), 400
        
        # Get web controller for the specified device
        web_controller = get_controller(device_id, 'web')
        
        if not web_controller:
            device = get_device_by_id(device_id)
            if not device:
                return jsonify({
                    'success': False,
                    'error': f'Device {device_id} not found'
                }), 404
            
            return jsonify({
                'success': False,
                'error': f'No web controller found for device {device_id}',
                'available_capabilities': device.get_capabilities()
            }), 404
        
        print(f"[@route:host_web:execute_command] Using web controller: {type(web_controller).__name__}")
        
        # Use controller-specific abstraction - single line!
        result = web_controller.execute_command(command, params)
        
        return jsonify(result)
            
    except Exception as e:
        print(f"[@route:host_web:execute_command] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Command execution error: {str(e)}'
        }), 500

@host_web_bp.route('/navigateToUrl', methods=['POST'])
def navigate_to_url():
    """Navigate to URL using web controller."""
    try:
        # Get device_id from request (defaults to device1)
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        url = data.get('url')
        timeout = data.get('timeout', 30000)
        
        print(f"[@route:host_web:navigate_to_url] Navigating to: {url} for device: {device_id}")
        
        if not url:
            return jsonify({
                'success': False,
                'error': 'url is required'
            }), 400
        
        # Get web controller for the specified device
        web_controller = get_controller(device_id, 'web')
        
        if not web_controller:
            device = get_device_by_id(device_id)
            if not device:
                return jsonify({
                    'success': False,
                    'error': f'Device {device_id} not found'
                }), 404
            
            return jsonify({
                'success': False,
                'error': f'No web controller found for device {device_id}',
                'available_capabilities': device.get_capabilities()
            }), 404
        
        print(f"[@route:host_web:navigate_to_url] Using web controller: {type(web_controller).__name__}")
        
        # Navigate to URL
        if not hasattr(web_controller, 'navigate_to_url'):
            return jsonify({
                'success': False,
                'error': 'URL navigation not supported by this web controller'
            }), 400
        
        result = web_controller.navigate_to_url(url, timeout=timeout)
        
        return jsonify(result)
            
    except Exception as e:
        print(f"[@route:host_web:navigate_to_url] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Navigation error: {str(e)}'
        }), 500

@host_web_bp.route('/getPageInfo', methods=['POST'])
def get_page_info():
    """Get page information using web controller."""
    try:
        # Get device_id from request (defaults to device1)
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        
        print(f"[@route:host_web:get_page_info] Getting page info for device: {device_id}")
        
        # Get web controller for the specified device
        web_controller = get_controller(device_id, 'web')
        
        if not web_controller:
            device = get_device_by_id(device_id)
            if not device:
                return jsonify({
                    'success': False,
                    'error': f'Device {device_id} not found'
                }), 404
            
            return jsonify({
                'success': False,
                'error': f'No web controller found for device {device_id}',
                'available_capabilities': device.get_capabilities()
            }), 404
        
        print(f"[@route:host_web:get_page_info] Using web controller: {type(web_controller).__name__}")
        
        # Get page info
        if not hasattr(web_controller, 'get_page_info'):
            return jsonify({
                'success': False,
                'error': 'Page info not supported by this web controller'
            }), 400
        
        result = web_controller.get_page_info()
        
        return jsonify(result)
            
    except Exception as e:
        print(f"[@route:host_web:get_page_info] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Page info error: {str(e)}'
        }), 500

@host_web_bp.route('/getStatus', methods=['POST'])
def get_status():
    """Get web controller status."""
    try:
        # Get device_id from request (defaults to device1)
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        
        print(f"[@route:host_web:get_status] Getting status for device: {device_id}")
        
        # Get web controller for the specified device
        web_controller = get_controller(device_id, 'web')
        
        if not web_controller:
            device = get_device_by_id(device_id)
            if not device:
                return jsonify({
                    'success': False,
                    'error': f'Device {device_id} not found'
                }), 404
            
            return jsonify({
                'success': False,
                'error': f'No web controller found for device {device_id}',
                'available_capabilities': device.get_capabilities()
            }), 404
        
        print(f"[@route:host_web:get_status] Using web controller: {type(web_controller).__name__}")
        
        # Get controller status
        status = web_controller.get_status()
        
        return jsonify({
            'success': True,
            'status': status,
            'device_id': device_id
        })
            
    except Exception as e:
        print(f"[@route:host_web:get_status] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Status check error: {str(e)}'
        }), 500 
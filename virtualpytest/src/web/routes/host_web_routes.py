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
        # Get request data
        data = request.get_json() or {}
        command = data.get('command')
        params = data.get('params', {})
        
        print(f"[@route:host_web:execute_command] Executing command: {command} with params: {params}")
        
        if not command:
            return jsonify({
                'success': False,
                'error': 'command is required'
            }), 400
        
        # Get web controller for the host (no device_id needed for host operations)
        web_controller = get_controller(None, 'web')
        
        if not web_controller:
            return jsonify({
                'success': False,
                'error': 'No web controller found for host'
            }), 404
        
        print(f"[@route:host_web:execute_command] Using web controller: {type(web_controller).__name__}")
        
        # Execute command and wait for result
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
        # Get request data
        data = request.get_json() or {}
        url = data.get('url')
        timeout = data.get('timeout', 30000)
        
        print(f"[@route:host_web:navigate_to_url] Navigating to: {url}")
        
        if not url:
            return jsonify({
                'success': False,
                'error': 'url is required'
            }), 400
        
        # Get web controller for the host (no device_id needed for host operations)
        web_controller = get_controller(None, 'web')
        
        if not web_controller:
            return jsonify({
                'success': False,
                'error': 'No web controller found for host'
            }), 404
        
        print(f"[@route:host_web:navigate_to_url] Using web controller: {type(web_controller).__name__}")
        
        # Navigate to URL and wait for result
        result = web_controller.navigate_to_url(url, timeout=timeout)
        
        return jsonify(result)
            
    except Exception as e:
        print(f"[@route:host_web:navigate_to_url] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Navigation error: {str(e)}'
        }), 500

@host_web_bp.route('/openBrowser', methods=['POST'])
def open_browser():
    """Open browser using web controller."""
    try:
        print(f"[@route:host_web:open_browser] Opening browser")
        
        # Get web controller for the host (no device_id needed for host operations)
        web_controller = get_controller(None, 'web')
        
        if not web_controller:
            return jsonify({
                'success': False,
                'error': 'No web controller found for host'
            }), 404
        
        print(f"[@route:host_web:open_browser] Using web controller: {type(web_controller).__name__}")
        
        # Open browser and wait for result
        result = web_controller.open_browser()
        
        return jsonify(result)
            
    except Exception as e:
        print(f"[@route:host_web:open_browser] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Browser open error: {str(e)}'
        }), 500

@host_web_bp.route('/closeBrowser', methods=['POST'])
def close_browser():
    """Close browser using web controller."""
    try:
        print(f"[@route:host_web:close_browser] Closing browser")
        
        # Get web controller for the host (no device_id needed for host operations)
        web_controller = get_controller(None, 'web')
        
        if not web_controller:
            return jsonify({
                'success': False,
                'error': 'No web controller found for host'
            }), 404
        
        print(f"[@route:host_web:close_browser] Using web controller: {type(web_controller).__name__}")
        
        # Close browser and wait for result
        result = web_controller.close_browser()
        
        return jsonify(result)
            
    except Exception as e:
        print(f"[@route:host_web:close_browser] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Browser close error: {str(e)}'
        }), 500

@host_web_bp.route('/getPageInfo', methods=['POST'])
def get_page_info():
    """Get page information using web controller."""
    try:
        print(f"[@route:host_web:get_page_info] Getting page info")
        
        # Get web controller for the host (no device_id needed for host operations)
        web_controller = get_controller(None, 'web')
        
        if not web_controller:
            return jsonify({
                'success': False,
                'error': 'No web controller found for host'
            }), 404
        
        print(f"[@route:host_web:get_page_info] Using web controller: {type(web_controller).__name__}")
        
        # Get page info and wait for result
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
        print(f"[@route:host_web:get_status] Getting status")
        
        # Get web controller for the host (no device_id needed for host operations)
        web_controller = get_controller(None, 'web')
        
        if not web_controller:
            return jsonify({
                'success': False,
                'error': 'No web controller found for host'
            }), 404
        
        print(f"[@route:host_web:get_status] Using web controller: {type(web_controller).__name__}")
        
        # Get controller status and wait for result
        status = web_controller.get_status()
        
        return jsonify({
            'success': True,
            'status': status
        })
            
    except Exception as e:
        print(f"[@route:host_web:get_status] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Status check error: {str(e)}'
        }), 500 
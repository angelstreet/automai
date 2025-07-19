"""
Server Web Routes

Server-side web automation proxy endpoints that forward requests to host web controllers.
"""

from flask import Blueprint, request, jsonify
from src.web.utils.routeUtils import proxy_to_host, get_host_from_request

# Create blueprint
server_web_bp = Blueprint('server_web', __name__, url_prefix='/server/web')

# =====================================================
# WEB CONTROLLER ENDPOINTS
# =====================================================

@server_web_bp.route('/executeCommand', methods=['POST'])
def execute_command():
    """Proxy execute web command request to selected host"""
    try:
        print("[@route:server_web:execute_command] Proxying execute command request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Extract host info and remove it from the data to be sent to host
        host_info, error = get_host_from_request()
        if not host_info:
            return jsonify({
                'success': False,
                'error': error or 'Host information required'
            }), 400
        
        # Remove host from request data before sending to host (host doesn't need its own info)
        host_request_data = {k: v for k, v in request_data.items() if k != 'host'}
        
        # Use longer timeout for browser-use tasks (10 minutes)
        command = request_data.get('command', '')
        timeout = 600 if command == 'browser_use_task' else 30
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/web/executeCommand', 'POST', host_request_data, timeout=timeout)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@server_web_bp.route('/navigateToUrl', methods=['POST'])
def navigate_to_url():
    """Proxy navigate to URL request to selected host"""
    try:
        print("[@route:server_web:navigate_to_url] Proxying navigate to URL request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Extract host info and remove it from the data to be sent to host
        host_info, error = get_host_from_request()
        if not host_info:
            return jsonify({
                'success': False,
                'error': error or 'Host information required'
            }), 400
        
        # Remove host from request data before sending to host (host doesn't need its own info)
        host_request_data = {k: v for k, v in request_data.items() if k != 'host'}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/web/navigateToUrl', 'POST', host_request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@server_web_bp.route('/getPageInfo', methods=['POST'])
def get_page_info():
    """Proxy get page info request to selected host"""
    try:
        print("[@route:server_web:get_page_info] Proxying get page info request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Extract host info and remove it from the data to be sent to host
        host_info, error = get_host_from_request()
        if not host_info:
            return jsonify({
                'success': False,
                'error': error or 'Host information required'
            }), 400
        
        # Remove host from request data before sending to host (host doesn't need its own info)
        host_request_data = {k: v for k, v in request_data.items() if k != 'host'}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/web/getPageInfo', 'POST', host_request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@server_web_bp.route('/openBrowser', methods=['POST'])
def open_browser():
    """Proxy open browser request to selected host"""
    try:
        print("[@route:server_web:open_browser] Proxying open browser request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Extract host info and remove it from the data to be sent to host
        host_info, error = get_host_from_request()
        if not host_info:
            return jsonify({
                'success': False,
                'error': error or 'Host information required'
            }), 400
        
        # Remove host from request data before sending to host (host doesn't need its own info)
        host_request_data = {k: v for k, v in request_data.items() if k != 'host'}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/web/openBrowser', 'POST', host_request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@server_web_bp.route('/closeBrowser', methods=['POST'])
def close_browser():
    """Proxy close browser request to selected host"""
    try:
        print("[@route:server_web:close_browser] Proxying close browser request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Extract host info and remove it from the data to be sent to host
        host_info, error = get_host_from_request()
        if not host_info:
            return jsonify({
                'success': False,
                'error': error or 'Host information required'
            }), 400
        
        # Remove host from request data before sending to host (host doesn't need its own info)
        host_request_data = {k: v for k, v in request_data.items() if k != 'host'}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/web/closeBrowser', 'POST', host_request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@server_web_bp.route('/getStatus', methods=['POST'])
def get_status():
    """Proxy get web controller status request to selected host"""
    try:
        print("[@route:server_web:get_status] Proxying get status request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/web/getStatus', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500 
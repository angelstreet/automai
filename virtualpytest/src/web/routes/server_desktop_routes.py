"""
Server Desktop Routes

Server-side desktop control proxy endpoints that forward requests to host desktop controllers.
"""

from flask import Blueprint, request, jsonify
from src.web.utils.routeUtils import proxy_to_host, get_host_from_request

# Create blueprint
server_desktop_bp = Blueprint('server_desktop', __name__, url_prefix='/server/desktop')

# =====================================================
# DESKTOP CONTROLLER ENDPOINTS
# =====================================================

@server_desktop_bp.route('/executeCommand', methods=['POST'])
def execute_command():
    """Proxy execute desktop command request to selected host"""
    try:
        print("[@route:server_desktop:execute_command] Proxying execute command request")
        
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
        response_data, status_code = proxy_to_host('/host/desktop/executeCommand', 'POST', host_request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@server_desktop_bp.route('/readFile', methods=['POST'])
def read_file():
    """Proxy read file request to selected host"""
    try:
        print("[@route:server_desktop:read_file] Proxying read file request")
        
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
        response_data, status_code = proxy_to_host('/host/desktop/readFile', 'POST', host_request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@server_desktop_bp.route('/writeFile', methods=['POST'])
def write_file():
    """Proxy write file request to selected host"""
    try:
        print("[@route:server_desktop:write_file] Proxying write file request")
        
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
        response_data, status_code = proxy_to_host('/host/desktop/writeFile', 'POST', host_request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@server_desktop_bp.route('/getStatus', methods=['POST'])
def get_status():
    """Proxy get desktop controller status request to selected host"""
    try:
        print("[@route:server_desktop:get_status] Proxying get status request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/desktop/getStatus', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500 
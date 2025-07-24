"""
Server Power Routes

Server-side power control proxy endpoints that forward requests to host power controllers.
"""

from flask import Blueprint, request, jsonify
from src.web.utils.routeUtils import proxy_to_host, get_host_from_request

# Create blueprint
server_power_bp = Blueprint('server_power', __name__, url_prefix='/server/power')

# =====================================================
# POWER CONTROLLER ENDPOINTS
# =====================================================

@server_power_bp.route('/getStatus', methods=['POST'])
def get_power_status():
    """Proxy get power status request to selected host"""
    try:
        print("[@route:server_power:get_power_status] Proxying get power status request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/power/getStatus', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@server_power_bp.route('/executeCommand', methods=['POST'])
def execute_power_command():
    """Proxy execute power command request to selected host"""
    try:
        print("[@route:server_power:execute_power_command] Proxying execute power command request")
        
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
        response_data, status_code = proxy_to_host('/host/power/executeCommand', 'POST', host_request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500 
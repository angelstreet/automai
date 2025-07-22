"""
Server Rec Routes

Server-side rec endpoints that proxy requests to host rec controllers.
Handles restart player data fetching and image timeline management.
"""

from flask import Blueprint, request, jsonify
from src.web.utils.routeUtils import proxy_to_host, get_host_from_request

# Create blueprint
server_rec_bp = Blueprint('server_rec', __name__, url_prefix='/server/rec')

@server_rec_bp.route('/getRestartImages', methods=['POST'])
def get_restart_images():
    """Proxy get restart images request to selected host"""
    try:
        print("[@route:server_rec:get_restart_images] Proxying restart images request")
        
        # Get request data
        request_data = request.get_json() or {}
        host = request_data.get('host')
        device_id = request_data.get('device_id', 'device1')
        timeframe_minutes = request_data.get('timeframe_minutes', 5)

        # Validate host
        if not host:
            return jsonify({'success': False, 'error': 'Host required'}), 400

        print(f"[@route:server_rec:get_restart_images] Host: {host.get('host_name')}, Device: {device_id}, Timeframe: {timeframe_minutes}min")

        # Extract host info and remove it from the data to be sent to host
        host_info, error = get_host_from_request()
        if not host_info:
            return jsonify({
                'success': False,
                'error': error or 'Host information required'
            }), 400

        # Remove host from request data before sending to host (host doesn't need its own info)
        host_request_data = {k: v for k, v in request_data.items() if k != 'host'}

        # Proxy to host rec endpoint
        response_data, status_code = proxy_to_host('/host/rec/listRestartImages', 'POST', host_request_data)

        return jsonify(response_data), status_code
        
    except Exception as e:
        print(f"[@route:server_rec:get_restart_images] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500 
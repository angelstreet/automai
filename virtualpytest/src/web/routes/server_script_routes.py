"""
Server Script Routes - Proxy script execution to hosts
"""
from flask import Blueprint, request, jsonify
import requests
from src.utils.build_url_utils import buildHostUrl
from src.utils.host_utils import get_host_manager

server_script_bp = Blueprint('server_script', __name__, url_prefix='/server')

@server_script_bp.route('/script/execute', methods=['POST'])
def execute_script():
    """Proxy script execution to host"""
    try:
        data = request.get_json()
        
        host_name = data.get('host_name')
        device_id = data.get('device_id')
        script_name = data.get('script_name')
        
        if not all([host_name, device_id, script_name]):
            return jsonify({
                'success': False,
                'error': 'host_name, device_id, and script_name required'
            }), 400
        
        # Get host info from registry
        host_manager = get_host_manager()
        host_info = host_manager.get_host(host_name)
        
        if not host_info:
            return jsonify({
                'success': False,
                'error': f'Host not found: {host_name}'
            }), 404
        
        # Build host URL
        host_url = buildHostUrl(host_info, '/host/script/execute')
        
        # Proxy request to host
        response = requests.post(
            host_url,
            json={
                'script_name': script_name,
                'device_id': device_id
            },
            timeout=60
        )
        
        return jsonify(response.json()), response.status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500 
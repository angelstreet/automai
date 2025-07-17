"""
Server Script Routes - Proxy script execution to hosts
"""
from flask import Blueprint, request, jsonify
import requests
import os
import glob
from src.utils.build_url_utils import buildHostUrl
from src.utils.host_utils import get_host_manager

server_script_bp = Blueprint('server_script', __name__, url_prefix='/server')

@server_script_bp.route('/script/list', methods=['GET'])
def list_scripts():
    """List all available Python scripts from virtualpytest/scripts folder"""
    try:
        # Get the project root directory (virtualpytest)
        current_dir = os.path.dirname(os.path.abspath(__file__))  # /src/web/routes
        web_dir = os.path.dirname(current_dir)  # /src/web
        src_dir = os.path.dirname(web_dir)  # /src
        project_root = os.path.dirname(src_dir)  # /virtualpytest
        scripts_dir = os.path.join(project_root, 'scripts')
        
        # Check if scripts directory exists
        if not os.path.exists(scripts_dir):
            return jsonify({
                'success': False,
                'error': f'Scripts directory not found: {scripts_dir}'
            }), 404
        
        # Find all Python files in the scripts directory
        script_pattern = os.path.join(scripts_dir, '*.py')
        script_files = glob.glob(script_pattern)
        
        # Extract just the filenames without path and extension
        available_scripts = []
        for script_file in script_files:
            filename = os.path.basename(script_file)
            script_name = os.path.splitext(filename)[0]  # Remove .py extension
            available_scripts.append(script_name)
        
        # Sort alphabetically
        available_scripts.sort()
        
        return jsonify({
            'success': True,
            'scripts': available_scripts,
            'count': len(available_scripts)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

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
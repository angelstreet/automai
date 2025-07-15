"""
Server stream proxy routes for forwarding requests to hosts
"""

from flask import Blueprint, request, jsonify, Response
import requests
import json

from src.utils.build_url_utils import buildHostUrl
from src.utils.host_utils import get_host_manager

server_stream_proxy_bp = Blueprint('server_stream_proxy', __name__, url_prefix='/server/stream')

@server_stream_proxy_bp.route('/av/screenshot', methods=['POST'])
def proxy_screenshot():
    """Proxy screenshot request to appropriate host"""
    try:
        data = request.get_json()
        host = data.get('host')
        
        if not host or not host.get('host_name'):
            return jsonify({'error': 'Host data is required'}), 400
        
        host_name = host['host_name']
        
        print(f"📸 [PROXY] Screenshot request for host: {host_name}")
        
        # Get host from manager
        host_manager = get_host_manager()
        host_data = host_manager.get_host(host_name)
        if not host_data:
            return jsonify({'error': f'Host {host_name} not found'}), 404
        
        # Forward request to host
        host_url = buildHostUrl(host_data, '/host/av/screenshot')
        
        print(f"📡 [PROXY] Forwarding screenshot request to: {host_url}")
        
        response = requests.post(
            host_url,
            json=data,
            timeout=30,
            verify=False
        )
        
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            error_msg = f"Screenshot request failed: {response.status_code} {response.text}"
            print(f"❌ [PROXY] {error_msg}")
            return jsonify({'error': error_msg}), response.status_code
        
    except Exception as e:
        print(f"❌ [PROXY] Error proxying screenshot: {e}")
        return jsonify({'error': str(e)}), 500

@server_stream_proxy_bp.route('/av/streamUrl', methods=['POST'])
def proxy_stream_url():
    """Proxy stream URL request to appropriate host"""
    try:
        data = request.get_json()
        host = data.get('host')
        
        if not host or not host.get('host_name'):
            return jsonify({'error': 'Host data is required'}), 400
        
        host_name = host['host_name']
        
        print(f"📺 [PROXY] Stream URL request for host: {host_name}")
        
        # Get host from manager
        host_manager = get_host_manager()
        host_data = host_manager.get_host(host_name)
        if not host_data:
            return jsonify({'error': f'Host {host_name} not found'}), 404
        
        # Forward request to host
        host_url = buildHostUrl(host_data, '/host/av/streamUrl')
        
        print(f"📡 [PROXY] Forwarding stream URL request to: {host_url}")
        
        response = requests.post(
            host_url,
            json=data,
            timeout=30,
            verify=False
        )
        
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            error_msg = f"Stream URL request failed: {response.status_code} {response.text}"
            print(f"❌ [PROXY] {error_msg}")
            return jsonify({'error': error_msg}), response.status_code
        
    except Exception as e:
        print(f"❌ [PROXY] Error proxying stream URL: {e}")
        return jsonify({'error': str(e)}), 500

@server_stream_proxy_bp.route('/verification/execute', methods=['POST'])
def proxy_verification():
    """Proxy verification request to appropriate host"""
    try:
        data = request.get_json()
        host = data.get('host')
        
        if not host or not host.get('host_name'):
            return jsonify({'error': 'Host data is required'}), 400
        
        host_name = host['host_name']
        
        print(f"✅ [PROXY] Verification request for host: {host_name}")
        
        # Get host from manager
        host_manager = get_host_manager()
        host_data = host_manager.get_host(host_name)
        if not host_data:
            return jsonify({'error': f'Host {host_name} not found'}), 404
        
        # Forward request to host
        host_url = buildHostUrl(host_data, '/host/verification/execute')
        
        print(f"📡 [PROXY] Forwarding verification request to: {host_url}")
        
        response = requests.post(
            host_url,
            json=data,
            timeout=60,  # Longer timeout for verification
            verify=False
        )
        
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            error_msg = f"Verification request failed: {response.status_code} {response.text}"
            print(f"❌ [PROXY] {error_msg}")
            return jsonify({'error': error_msg}), response.status_code
        
    except Exception as e:
        print(f"❌ [PROXY] Error proxying verification: {e}")
        return jsonify({'error': str(e)}), 500 
"""
Server Audio/Video Routes

This module contains the server-side audio/video API endpoints that proxy requests
to the selected host's AV controller endpoints.

These endpoints run on the server and forward requests to the appropriate host.
"""

from flask import Blueprint, request, jsonify
from src.web.utils.routeUtils import proxy_to_host, get_host_from_request

# Create blueprint
av_bp = Blueprint('server_av', __name__, url_prefix='/server/av')

@av_bp.route('/restart-stream', methods=['POST'])
def restart_stream():
    """Proxy restart stream request to selected host"""
    try:
        print("[@route:server_av:restart_stream] Proxying restart stream request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/av/restart-stream', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@av_bp.route('/get-stream-url', methods=['GET', 'POST'])
def get_stream_url():
    """Proxy get stream URL request to selected host"""
    try:
        print("[@route:server_av:get_stream_url] Proxying get stream URL request")
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/av/get-stream-url', 'GET')
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@av_bp.route('/get-status', methods=['GET'])
def get_status():
    """Proxy get status request to selected host"""
    try:
        print("[@route:server_av:status] Proxying get status request")
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/av/status', 'GET')
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@av_bp.route('/take-screenshot', methods=['POST'])
def take_screenshot():
    """Proxy take screenshot request to selected host (temporary nginx storage)"""
    try:
        print("[@route:server_av:take_screenshot] Proxying take screenshot request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/av/take-screenshot', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@av_bp.route('/save-screenshot', methods=['POST'])
def save_screenshot():
    """Proxy save screenshot request to selected host (uploads to R2)"""
    try:
        print("[@route:server_av:save_screenshot] Proxying save screenshot request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/av/save-screenshot', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@av_bp.route('/start-capture', methods=['POST'])
def start_video_capture():
    """Proxy start video capture request to selected host"""
    try:
        print("[@route:server_av:start_capture] Proxying start video capture request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/av/start-capture', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@av_bp.route('/stop-capture', methods=['POST'])
def stop_video_capture():
    """Proxy stop video capture request to selected host"""
    try:
        print("[@route:server_av:stop_capture] Proxying stop video capture request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/av/stop-capture', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@av_bp.route('/take-control', methods=['POST'])
def take_control():
    """Proxy take control request to selected host"""
    try:
        print("[@route:server_av:take_control] Proxying take control request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/av/take-control', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@av_bp.route('/connect', methods=['POST'])
def connect():
    """Proxy connect request to selected host"""
    try:
        print("[@route:server_av:connect] Proxying connect request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/av/connect', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@av_bp.route('/disconnect', methods=['POST'])
def disconnect():
    """Proxy disconnect request to selected host"""
    try:
        print("[@route:server_av:disconnect] Proxying disconnect request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/av/disconnect', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500 
"""
Verification Execution Server Routes

This module contains the server-side verification execution endpoints that:
- Forward verification execution requests to host
- Handle batch verification coordination
- Manage execution results and status
"""

from flask import Blueprint, request, jsonify
from src.web.utils.routeUtils import proxy_to_host, get_host_from_request
import requests
import json

# Create blueprint
verification_av_execution_bp = Blueprint('verification_av_execution', __name__, url_prefix='/server/verification/execution')

# =====================================================
# SERVER-SIDE VERIFICATION EXECUTION (FORWARDS TO HOST)
# =====================================================

@verification_av_execution_bp.route('/execute', methods=['POST'])
def execute_verification():
    """Proxy verification execution request to selected host"""
    try:
        print("[@route:server_verification_av_execution:execute] Proxying verification execution request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host with extended timeout for verification execution
        response_data, status_code = proxy_to_host('/host/verification/execution/execute-verification', 'POST', request_data, timeout=60)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@verification_av_execution_bp.route('/execute-batch', methods=['POST'])
def execute_batch_verification():
    """Proxy batch verification execution request to selected host"""
    try:
        print("[@route:server_verification_av_execution:execute_batch] Proxying batch verification execution request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Use extended timeout for batch operations (120 seconds)
        response_data, status_code = proxy_to_host('/host/verification/av/execute-batch', 'POST', request_data, timeout=120)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500 
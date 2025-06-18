"""
Verification ADB Server Routes

This module contains the server-side ADB verification endpoints that:
- Forward ADB verification requests to host ADB controller
- Handle ADB element verification operations
- Support waitForElementToAppear and waitForElementToDisappear
"""

from flask import Blueprint, request, jsonify
from src.web.utils.routeUtils import proxy_to_host, get_host_from_request

# Create blueprint - using adb since ADB verification uses ADB controller
verification_adb_bp = Blueprint('verification_adb', __name__, url_prefix='/server/verification/adb')

# =====================================================
# SERVER-SIDE ADB VERIFICATION ENDPOINTS (FORWARDS TO HOST)
# =====================================================

@verification_adb_bp.route('/execute-verification', methods=['POST'])
def execute_verification():
    """Proxy ADB verification execution request to selected host"""
    try:
        print("[@route:server_verification_adb:execute_verification] Proxying ADB verification execution request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/verification/execution/execute-verification', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@verification_adb_bp.route('/waitForElementToAppear', methods=['POST'])
def wait_for_element_to_appear():
    """Proxy ADB waitForElementToAppear request to selected host"""
    try:
        print("[@route:server_verification_adb:waitForElementToAppear] Proxying ADB waitForElementToAppear request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/verification/adb/waitForElementToAppear', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@verification_adb_bp.route('/waitForElementToDisappear', methods=['POST'])
def wait_for_element_to_disappear():
    """Proxy ADB waitForElementToDisappear request to selected host"""
    try:
        print("[@route:server_verification_adb:waitForElementToDisappear] Proxying ADB waitForElementToDisappear request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/verification/adb/waitForElementToDisappear', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500 
"""
Verification Image Server Routes

This module contains the server-side image verification endpoints that:
- Forward image verification requests to host AV controller
- Handle reference image management
- Manage image processing operations
"""

from flask import Blueprint, request, jsonify
from src.web.utils.routeUtils import proxy_to_host, get_host_from_request

# Create blueprint - using av since image verification uses AV controller
verification_av_image_bp = Blueprint('verification_av_image', __name__, url_prefix='/server/verification/image')

# =====================================================
# VERIFICATION IMAGE CAPTURE ENDPOINTS
# =====================================================

@verification_av_image_bp.route('/capture-area', methods=['POST'])
def capture_area():
    """Proxy capture area request to selected host for reference image cropping"""
    try:
        print("[@route:server_verification_image:capture_area] Proxying capture area request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host verification image crop endpoint
        response_data, status_code = proxy_to_host('/host/verification/image/crop-image', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@verification_av_image_bp.route('/capture-area-process', methods=['POST'])
def capture_area_process():
    """Proxy capture area with processing request to selected host for reference image processing"""
    try:
        print("[@route:server_verification_image:capture_area_process] Proxying capture area with processing request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host verification image process endpoint
        response_data, status_code = proxy_to_host('/host/verification/image/process-image', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# =====================================================
# EXISTING VERIFICATION IMAGE ENDPOINTS
# =====================================================

@verification_av_image_bp.route('/execute-verification', methods=['POST'])
def execute_verification():
    """Proxy image verification execution request to selected host"""
    try:
        print("[@route:server_verification_av_image:execute_verification] Proxying image verification execution request")
        
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

@verification_av_image_bp.route('/save-image-reference', methods=['POST'])
def save_reference():
    """Proxy image reference save request to selected host"""
    try:
        print("[@route:server_verification_av_image:save_image_reference] Proxying image reference save request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/verification/image/save-image-reference', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

 
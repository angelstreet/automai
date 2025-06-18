"""
Verification Text Server Routes

This module contains the server-side text verification endpoints that:
- Forward text verification requests to host AV controller
- Handle OCR detection and text reference management
- Manage text processing operations
"""

from flask import Blueprint, request, jsonify
from src.web.utils.routeUtils import proxy_to_host, get_host_from_request

# Create blueprint - using av since text verification uses AV controller
verification_av_text_bp = Blueprint('verification_av_text', __name__, url_prefix='/server/verification/text')

# =====================================================
# SERVER-SIDE TEXT VERIFICATION ENDPOINTS (FORWARDS TO HOST)
# =====================================================

@verification_av_text_bp.route('/auto-detect-text', methods=['POST'])
def ocr_detection():
    """Proxy text auto-detection request to selected host"""
    try:
        print("[@route:server_verification_av_text:ocr_detection] Proxying OCR detection request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/verification/text/auto-detect-text', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@verification_av_text_bp.route('/save-text-reference', methods=['POST'])
def save_text_reference():
    """Proxy text reference save request to selected host"""
    try:
        print("[@route:server_verification_av_text:save_text_reference] Proxying text reference save request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/verification/text/save-text-reference', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500 
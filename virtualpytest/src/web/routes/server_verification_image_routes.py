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

@verification_av_image_bp.route('/crop-image', methods=['POST'])
def crop_image():
    """Proxy crop image request to selected host for reference image cropping"""
    try:
        print("[@route:server_verification_image:crop_image] Proxying crop image request")
        
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

@verification_av_image_bp.route('/process-image', methods=['POST'])
def process_image():
    """Proxy process image request to selected host for reference image processing"""
    try:
        print("[@route:server_verification_image:process_image] Proxying process image request")
        
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
    """Save image reference directly on server (using exact same pattern as navigation trees)"""
    try:
        print("[@route:server_verification_av_image:save_image_reference] Saving image reference on server")
        
        # ✅ GET TEAM_ID FROM REQUEST HEADERS LIKE OTHER WORKING ROUTES
        from src.utils.app_utils import get_team_id
        team_id = get_team_id()
        
        # Get request data
        data = request.get_json() or {}
        
        # Extract required fields
        name = data.get('reference_name') or data.get('name')
        model = data.get('model')
        r2_url = data.get('r2_url')  # The image should already be uploaded to R2
        reference_type = data.get('reference_type', 'reference_image')
        area = data.get('area', {})
        
        if not all([name, model, r2_url]):
            return jsonify({
                'success': False,
                'error': 'Missing required fields: name, model, r2_url'
            }), 400
        
        print(f'[@route:server_verification_av_image:save_image_reference] Saving image: {name} for model: {model}')
        
        # ✅ USE EXACT SAME PATTERN AS NAVIGATION TREES - DIRECT DB SAVE ON SERVER
        from src.lib.supabase.images_db import save_image
        
        # Extract R2 path from URL for the database
        r2_path = r2_url.split('/')[-1] if r2_url else ''
        
        result = save_image(
            name=name,
            device_model=model,
            type=reference_type,
            r2_path=r2_path,
            r2_url=r2_url,
            team_id=team_id,
            area=area
        )
        
        if result.get('success'):
            return jsonify({
                'success': True,
                'message': 'Image reference saved successfully',
                'image': result.get('image', {
                    'name': name,
                    'model': model,
                    'team_id': team_id,
                    'type': reference_type,
                    'url': r2_url
                })
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Failed to save image reference')
            }), 500
        
    except Exception as e:
        print(f"[@route:server_verification_av_image:save_image_reference] ERROR: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

 
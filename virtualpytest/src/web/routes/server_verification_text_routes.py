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
    """Save text reference to database - NEW: Two-step process like image references"""
    try:
        print("[@route:server_verification_av_text:save_text_reference] Processing text reference save request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Step 1: Get text data from host (fast, no git operations)
        print("[@route:server_verification_av_text:save_text_reference] Step 1: Getting text data from host")
        host_response_data, host_status_code = proxy_to_host('/host/verification/text/save-text-reference', 'POST', request_data)
        
        if host_status_code != 200 or not host_response_data.get('success'):
            print(f"[@route:server_verification_av_text:save_text_reference] Host step failed: {host_response_data}")
            return jsonify(host_response_data), host_status_code
        
        # Step 2: Save text reference to database
        print("[@route:server_verification_av_text:save_text_reference] Step 2: Saving text reference to database")
        
        from src.lib.supabase.images_db import save_image
        from src.utils.app_utils import get_team_id
        
        # Get team ID
        team_id = get_team_id()
        if not team_id:
            return jsonify({
                'success': False,
                'error': 'Team ID not found in request'
            }), 400
        
        # Extract data from host response
        reference_name = host_response_data.get('reference_name')
        model = host_response_data.get('model')
        area = host_response_data.get('area')
        text_data = host_response_data.get('text_data', {})
        
        print(f"[@route:server_verification_av_text:save_text_reference] Saving to database: {reference_name} for model: {model}")
        
        # Save text reference to database using images table with type='reference_text'
        # For text references, we store text data in area field and use a placeholder R2 path
        extended_area = {
            **(area or {}),
            'text': text_data.get('text', ''),
            'font_size': text_data.get('font_size', 12.0),
            'confidence': text_data.get('confidence', 0.8)
        }
        
        db_result = save_image(
            name=reference_name,
            device_model=model,
            type='reference_text',  # Use reference_text type for text references
            r2_path=f'text-references/{model}/{reference_name}',  # Placeholder path for consistency
            r2_url='',  # No R2 URL needed for text references
            team_id=team_id,
            area=extended_area  # Store text data in area field
        )
        
        if db_result['success']:
            print(f"[@route:server_verification_av_text:save_text_reference] Successfully saved text reference to database")
            return jsonify({
                'success': True,
                'message': f'Text reference saved: {reference_name}',
                'reference_name': reference_name,
                'model': model,
                'text': text_data.get('text', ''),
                'image_id': db_result.get('image_id')
            })
        else:
            print(f"[@route:server_verification_av_text:save_text_reference] Database save failed: {db_result.get('error')}")
            return jsonify({
                'success': False,
                'error': f"Database save failed: {db_result.get('error')}"
            }), 500
        
    except Exception as e:
        print(f"[@route:server_verification_av_text:save_text_reference] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500 
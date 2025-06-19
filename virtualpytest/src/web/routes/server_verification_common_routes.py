"""
Verification Common Routes

This module contains the common verification API endpoints that:
- Handle verification execution coordination
- Manage reference lists and status
- Provide shared verification utilities
"""

from flask import Blueprint, request, jsonify
from src.web.utils.routeUtils import proxy_to_host, get_host_from_request

# Create blueprint
verification_common_bp = Blueprint('verification_common', __name__, url_prefix='/server/verification')

# =====================================================
# COMMON VERIFICATION ENDPOINTS
# =====================================================

@verification_common_bp.route('/getAllVerifications', methods=['GET', 'POST'])
def get_verification_types():
    """Get available verification types from host's stored verification data."""
    try:
        # Get host information from request
        host_info, error = get_host_from_request()
        if not host_info:
            return jsonify({
                'success': False,
                'error': error or 'Host information required'
            }), 400
        
        # For now, return error indicating this route should not be used
        # Verification types should be retrieved from host's stored data during registration
        return jsonify({
            'success': False,
            'error': 'This route is deprecated. Verification types should be retrieved from host registration data.',
            'message': 'Use host.available_verification_types from the host object instead'
        }), 400
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error getting verification types: {str(e)}'
        }), 500

@verification_common_bp.route('/getAllReferences', methods=['GET', 'POST'])
def getAllReferences():
    """Get available references from database - NO host proxy needed"""
    try:
        print("[@route:server_verification:getAllReferences] Getting references from database")
        
        # Get host info for model filtering
        host_info, error = get_host_from_request()
        if not host_info:
            return jsonify({
                'success': False,
                'error': error or 'Host information required'
            }), 400
        
        # Get device model with fallback
        device_model = host_info.get('device_model', 'default')
        print(f"[@route:server_verification:getAllReferences] Using device model: {device_model}")
        
        # Get references from database
        try:
            from src.lib.supabase.images_db import get_images
            from src.utils.app_utils import DEFAULT_TEAM_ID
            
            # Get all images for this device model
            result = get_images(
                team_id=DEFAULT_TEAM_ID,
                device_model=device_model
            )
            
            if result['success']:
                images = result['images']
                print(f"[@route:server_verification:getAllReferences] Found {len(images)} images from database")
                
                return jsonify({
                    'success': True,
                    'images': images,
                    'count': len(images),
                    'device_model': device_model
                })
            else:
                print(f"[@route:server_verification:getAllReferences] Database query failed: {result.get('error')}")
                return jsonify({
                    'success': False,
                    'error': result.get('error', 'Database query failed'),
                    'device_model': device_model
                })
                
        except Exception as db_error:
            print(f"[@route:server_verification:getAllReferences] Database error: {db_error}")
            return jsonify({
                'success': False,
                'error': f'Database error: {str(db_error)}',
                'device_model': device_model
            })
        
    except Exception as e:
        print(f"[@route:server_verification:getAllReferences] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@verification_common_bp.route('/getStatus', methods=['GET'])
def verification_status():
    """Proxy verification status request to selected host"""
    try:
        print("[@route:server_verification:getStatus] Proxying verification status request")
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/verification/getStatus', 'GET')
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
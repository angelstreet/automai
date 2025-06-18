"""
Verification Common Routes

This module contains the common verification API endpoints that:
- Handle verification execution coordination
- Manage reference lists and status
- Provide shared verification utilities
"""

from flask import Blueprint, request, jsonify
from src.web.utils.routeUtils import proxy_to_host, get_host_from_request
import json
import os

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
    """Get available references from resource.json config - NO host proxy needed"""
    try:
        print("[@route:server_verification:getAllReferences] Getting references from config")
        
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
        
        # Read from resource.json directly (no host proxy)
        try:
            # Use absolute path relative to this file's location
            current_dir = os.path.dirname(os.path.abspath(__file__))
            resource_path = os.path.join(current_dir, '..', '..', 'config', 'resource', 'resource.json')
            
            with open(resource_path, 'r') as f:
                config = json.load(f)
            
            # Get references for specific device model
            resources = config.get('resources', {})
            model_references_dict = resources.get(device_model, {})
            
            # Convert dict to list and add model, name, filename fields for backward compatibility
            processed_references = []
            for filename, ref_data in model_references_dict.items():
                processed_ref = ref_data.copy()
                processed_ref['model'] = device_model
                processed_ref['filename'] = filename
                processed_ref['name'] = filename.split('.')[0]  # Extract name from filename
                processed_references.append(processed_ref)
            
            # Group by type for backward compatibility
            references = {
                'image': [ref for ref in processed_references if ref.get('type') == 'image'],
                'text': [ref for ref in processed_references if ref.get('type') == 'text']
            }
            
            print(f"[@route:server_verification:getAllReferences] Found {len(processed_references)} references for model {device_model}")
            
            return jsonify({
                'success': True,
                'references': references,
                'model': device_model,
                'source': 'cloudflare'
            })
            
        except FileNotFoundError:
            print(f"[@route:server_verification:getAllReferences] resource.json not found")
            return jsonify({
                'success': True,
                'references': {'image': [], 'text': []},
                'model': device_model,  # Use the device_model variable from outer scope
                'source': 'cloudflare'
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

# =====================================================
# VERIFICATION CONTROLLER MANAGEMENT
# =====================================================

# REMOVED: All device control and locking endpoints have been removed from verification routes
# Device locking and control is now handled exclusively by server_control_routes.py

# The following endpoints have been REMOVED from verification routes:
# - /server/verification/take-control (REMOVED - use server_control_routes.py)
# - /server/verification/release-control (REMOVED - use server_control_routes.py)
# - /server/verification/lock-device (REMOVED - use server_control_routes.py)
# - /server/verification/unlock-device (REMOVED - use server_control_routes.py)
# - /server/verification/device-lock-status/<d> (REMOVED - use server_control_routes.py)

# For device control, use the main server control endpoints:
# - /server/control/take-control (POST) - Main device control with locking
# - /server/control/release-control (POST) - Release device control and unlock 
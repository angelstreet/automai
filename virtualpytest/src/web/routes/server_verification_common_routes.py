"""
Verification Common Routes

This module contains the common verification API endpoints that:
- Handle verification execution coordination
- Manage reference lists and status
- Provide shared verification utilities
"""

from flask import Blueprint, request, jsonify
import requests
import json

# Create blueprint
verification_common_bp = Blueprint('verification_common', __name__, url_prefix='/server/verification')

def get_host_from_request():
    """
    Get host information from request data.
    Frontend can provide:
    - GET: host_name in query params (simple)
    - POST: full host object in body (efficient - has host_url)
    
    Returns:
        Tuple of (host_info, error_message)
    """
    try:
        if request.method == 'GET':
            host_name = request.args.get('host_name')
            if not host_name:
                return None, 'host_name parameter required'
            # Simple host info for buildHostUrl
            return {'host_name': host_name}, None
        else:
            data = request.get_json() or {}
            host_object = data.get('host')
            
            if not host_object:
                return None, 'host object required in request body'
                
            # Full host object with host_url - most efficient
            return host_object, None
                
    except Exception as e:
        return None, f'Error getting host from request: {str(e)}'

def proxy_to_host(endpoint, method='GET', data=None):
    """
    Proxy a request to the specified host's verification endpoint using buildHostUrl
    
    Args:
        endpoint: The host endpoint to call (e.g., '/host/verification/references')
        method: HTTP method ('GET', 'POST', etc.)
        data: Request data for POST requests (should include host info)
    
    Returns:
        Tuple of (response_data, status_code)
    """
    try:
        # Get host information from request
        host_info, error = get_host_from_request()
        if not host_info:
            return {
                'success': False,
                'error': error or 'Host information required'
            }, 400
        
        # Use buildHostUrl to construct the proper URL
        from src.utils.app_utils import buildHostUrl
        full_url = buildHostUrl(host_info, endpoint)
        
        if not full_url:
            return {
                'success': False,
                'error': 'Failed to build host URL'
            }, 500
        
        print(f"[@route:server_verification:proxy] Proxying {method} {full_url}")
        
        # Prepare request parameters
        kwargs = {
            'timeout': 30,
            'verify': False  # For self-signed certificates
        }
        
        if data:
            kwargs['json'] = data
            kwargs['headers'] = {'Content-Type': 'application/json'}
        
        # Make the request to the host
        if method.upper() == 'GET':
            response = requests.get(full_url, **kwargs)
        elif method.upper() == 'POST':
            response = requests.post(full_url, **kwargs)
        else:
            return {
                'success': False,
                'error': f'Unsupported HTTP method: {method}'
            }, 400
        
        # Return the host's response
        try:
            response_data = response.json()
        except json.JSONDecodeError:
            response_data = {
                'success': False,
                'error': 'Invalid JSON response from host',
                'raw_response': response.text[:500]  # First 500 chars for debugging
            }
        
        return response_data, response.status_code
        
    except requests.exceptions.Timeout:
        return {
            'success': False,
            'error': 'Request to host timed out'
        }, 504
    except requests.exceptions.ConnectionError:
        return {
            'success': False,
            'error': 'Could not connect to host'
        }, 503
    except Exception as e:
        return {
            'success': False,
            'error': f'Proxy error: {str(e)}'
        }, 500

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

@verification_common_bp.route('/getAllReferences', methods=['GET'])
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
        
        # Read from resource.json directly (no host proxy)
        try:
            with open('src/config/resource/resource.json', 'r') as f:
                config = json.load(f)
            
            # Filter by device model and return Cloudflare URLs
            device_model = host_info.get('device_model', 'default')
            model_references = [
                ref for ref in config.get('resources', [])
                if ref.get('model') == device_model
            ]
            
            # Group by type for backward compatibility
            references = {
                'image': [ref for ref in model_references if ref.get('type') == 'image'],
                'text': [ref for ref in model_references if ref.get('type') == 'text']
            }
            
            print(f"[@route:server_verification:getAllReferences] Found {len(model_references)} references for model {device_model}")
            
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
                'model': device_model,
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
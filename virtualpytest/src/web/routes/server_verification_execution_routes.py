"""
Verification Execution Server Routes

This module contains the server-side verification execution endpoints that:
- Forward verification execution requests to host
- Handle batch verification coordination
- Manage execution results and status
"""

from flask import Blueprint, request, jsonify
import requests
import json

# Create blueprint
verification_av_execution_bp = Blueprint('verification_av_execution', __name__, url_prefix='/server/verification/execution')

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
    Proxy a request to the specified host's AV execution endpoint using buildHostUrl
    
    Args:
        endpoint: The host endpoint to call (e.g., '/host/verification/av/execute')
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
        
        print(f"[@route:server_verification_av_execution:proxy] Proxying {method} {full_url}")
        
        # Prepare request parameters
        kwargs = {
            'timeout': 60,  # Longer timeout for execution operations
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
# SERVER-SIDE VERIFICATION EXECUTION (FORWARDS TO HOST)
# =====================================================

@verification_av_execution_bp.route('/execute', methods=['POST'])
def execute_verification():
    """Proxy verification execution request to selected host"""
    try:
        print("[@route:server_verification_av_execution:execute] Proxying verification execution request")
        
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

@verification_av_execution_bp.route('/execute-batch', methods=['POST'])
def execute_batch_verification():
    """Proxy batch verification execution request to selected host"""
    try:
        print("[@route:server_verification_av_execution:execute_batch] Proxying batch verification execution request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Use longer timeout for batch operations
        def proxy_to_host_batch(endpoint, method='POST', data=None):
            """Extended proxy function with longer timeout for batch operations"""
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
                
                print(f"[@route:server_verification_av_execution:proxy_batch] Proxying {method} {full_url}")
                
                # Prepare request parameters with extended timeout
                kwargs = {
                    'timeout': 120,  # Extended timeout for batch operations
                    'verify': False  # For self-signed certificates
                }
                
                if data:
                    kwargs['json'] = data
                    kwargs['headers'] = {'Content-Type': 'application/json'}
                
                # Make the request to the host
                response = requests.post(full_url, **kwargs)
                
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
        
        # Proxy to host with extended timeout
        response_data, status_code = proxy_to_host_batch('/host/verification/av/execute-batch', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500 
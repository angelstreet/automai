"""
Route Utilities

Shared utilities for server routes including host proxying and request handling.
"""

from flask import request
import requests
import json


def get_host_from_request():
    """
    Get host information from request data.
    Frontend must provide full host object in request body.
    
    Returns:
        Tuple of (host_info, error_message)
    """
    try:
        data = request.get_json() or {}
        host_object = data.get('host')
        
        if not host_object:
            return None, 'host object required in request body'
            
        # Full host object with host_url - most efficient
        return host_object, None
                
    except Exception as e:
        return None, f'Error getting host from request: {str(e)}'


def proxy_to_host(endpoint, method='GET', data=None, timeout=30, headers=None):
    """
    Proxy a request to the specified host's endpoint using buildHostUrl
    
    Args:
        endpoint: The host endpoint to call (e.g., '/host/av/get-stream-url')
        method: HTTP method ('GET', 'POST', etc.)
        data: Request data for POST requests (should include host info)
        timeout: Request timeout in seconds (default: 30)
        headers: Additional headers to include in the request (dict)
    
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
        
        # Use centralized API URL builder to construct the proper URL
        from src.utils.build_url_utils import buildHostUrl
        full_url = buildHostUrl(host_info, endpoint)
        
        if not full_url:
            return {
                'success': False,
                'error': 'Failed to build host URL'
            }, 500
        
        print(f"[@utils:routeUtils:proxy_to_host] Proxying {method} {endpoint} to {full_url}")
        
        # Prepare request parameters
        kwargs = {
            'timeout': timeout,
            'verify': False  # For self-signed certificates
        }
        
        # Prepare headers
        request_headers = {'Content-Type': 'application/json'}
        if headers:
            request_headers.update(headers)
        
        if data:
            kwargs['json'] = data
        
        kwargs['headers'] = request_headers
        
        # Make the request to the host
        if method.upper() == 'GET':
            response = requests.get(full_url, **kwargs)
        elif method.upper() == 'POST':
            response = requests.post(full_url, **kwargs)
        elif method.upper() == 'PUT':
            response = requests.put(full_url, **kwargs)
        elif method.upper() == 'DELETE':
            response = requests.delete(full_url, **kwargs)
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


def proxy_to_host_with_params(endpoint, method='GET', data=None, query_params=None, timeout=30, headers=None):
    """
    Proxy a request to the specified host's endpoint with query parameters (for device_id handling)
    
    Args:
        endpoint: The host endpoint to call (e.g., '/host/av/get-stream-url')
        method: HTTP method ('GET', 'POST', etc.)
        data: Request data for POST requests (should include host info)
        query_params: Query parameters to add to the URL (dict)
        timeout: Request timeout in seconds (default: 30)
        headers: Additional headers to include in the request (dict)
    
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
        
        # Use centralized API URL builder to construct the proper URL
        from src.utils.build_url_utils import buildHostUrl
        full_url = buildHostUrl(host_info, endpoint)
        
        if not full_url:
            return {
                'success': False,
                'error': 'Failed to build host URL'
            }, 500
        
        print(f"[@utils:routeUtils:proxy_to_host_with_params] Proxying {method} {endpoint} to {full_url}")
        if query_params:
            print(f"[@utils:routeUtils:proxy_to_host_with_params] Query params: {query_params}")
        
        # Prepare request parameters
        kwargs = {
            'timeout': timeout,
            'verify': False  # For self-signed certificates
        }
        
        # Add query parameters
        if query_params:
            kwargs['params'] = query_params
        
        # Prepare headers
        request_headers = {'Content-Type': 'application/json'}
        if headers:
            request_headers.update(headers)
        
        if data:
            kwargs['json'] = data
        
        kwargs['headers'] = request_headers
        
        # Make the request to the host
        if method.upper() == 'GET':
            response = requests.get(full_url, **kwargs)
        elif method.upper() == 'POST':
            response = requests.post(full_url, **kwargs)
        elif method.upper() == 'PUT':
            response = requests.put(full_url, **kwargs)
        elif method.upper() == 'DELETE':
            response = requests.delete(full_url, **kwargs)
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


def proxy_to_host_direct(host_info, endpoint, method='GET', data=None, timeout=30, headers=None):
    """
    Proxy a request to the specified host's endpoint using provided host_info
    (for use in background threads where Flask request context is not available)
    
    Args:
        host_info: Host information dict (required)
        endpoint: The host endpoint to call (e.g., '/host/web/executeCommand')
        method: HTTP method ('GET', 'POST', etc.)
        data: Request data for POST requests
        timeout: Request timeout in seconds (default: 30)
        headers: Additional headers to include in the request (dict)
    
    Returns:
        Tuple of (response_data, status_code)
    """
    try:
        if not host_info:
            return {
                'success': False,
                'error': 'Host information required'
            }, 400
        
        # Use centralized API URL builder to construct the proper URL
        from src.utils.build_url_utils import buildHostUrl
        full_url = buildHostUrl(host_info, endpoint)
        
        if not full_url:
            return {
                'success': False,
                'error': 'Failed to build host URL'
            }, 500
        
        print(f"[@utils:routeUtils:proxy_to_host_direct] Proxying {method} {endpoint} to {full_url}")
        
        # Prepare request parameters
        kwargs = {
            'timeout': timeout,
            'verify': False  # For self-signed certificates
        }
        
        # Prepare headers
        request_headers = {'Content-Type': 'application/json'}
        if headers:
            request_headers.update(headers)
        
        if data:
            kwargs['json'] = data
        
        kwargs['headers'] = request_headers
        
        # Make the request to the host
        if method.upper() == 'GET':
            response = requests.get(full_url, **kwargs)
        elif method.upper() == 'POST':
            response = requests.post(full_url, **kwargs)
        elif method.upper() == 'PUT':
            response = requests.put(full_url, **kwargs)
        elif method.upper() == 'DELETE':
            response = requests.delete(full_url, **kwargs)
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
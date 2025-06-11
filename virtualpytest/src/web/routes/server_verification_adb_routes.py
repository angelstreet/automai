"""
Verification ADB Server Routes

This module contains the server-side ADB verification API endpoints that:
- Forward ADB element detection requests to host
- Handle ADB verification coordination
- Manage ADB wait operations
"""

from flask import Blueprint, request, jsonify
import requests
from src.utils.app_utils import get_host_by_model, get_primary_host, build_host_url

# Create blueprint
verification_adb_server_bp = Blueprint('verification_adb_server', __name__, url_prefix='/server/verification')

# =====================================================
# SERVER-SIDE ADB VERIFICATION ENDPOINTS (FORWARDS TO HOST)
# =====================================================

@verification_adb_server_bp.route('/adb/element-lists', methods=['POST'])
def adb_element_lists():
    """Forward ADB element lists request to host."""
    try:
        data = request.get_json()
        model = data.get('model', 'default')
        search_term = data.get('search_term', '')
        
        print(f"[@route:adb_element_lists] Forwarding ADB element lists request to host for model: {model}")
        if search_term:
            print(f"[@route:adb_element_lists] With search term: '{search_term}'")
        
        # Find appropriate host using registry
        host_info = get_host_by_model(model) if model != 'default' else get_primary_host()
        
        if not host_info:
            return jsonify({
                'success': False,
                'error': f'No available host found for model: {model}'
            }), 404
        
        print(f"[@route:adb_element_lists] Using registered host: {host_info.get('host_name', 'unknown')}")
        
        # Use pre-built URL from host registry
        host_adb_url = build_host_url(host_info, '/stream/adb-element-lists')
        
        adb_payload = {
            'model': model,
            'search_term': search_term
        }
        
        print(f"[@route:adb_element_lists] Sending request to {host_adb_url} with payload: {adb_payload}")
        
        try:
            host_response = requests.post(host_adb_url, json=adb_payload, timeout=30, verify=False)
            host_result = host_response.json()
            
            if host_result.get('success'):
                data = host_result.get('data', {})
                total_elements = data.get('total_elements', 0)
                print(f"[@route:adb_element_lists] Host ADB element lists successful: {total_elements} elements")
                return jsonify(host_result)
            else:
                error_msg = host_result.get('error', 'Host ADB element lists failed')
                print(f"[@route:adb_element_lists] Host ADB element lists failed: {error_msg}")
                return jsonify(host_result), 500
                
        except requests.exceptions.RequestException as e:
            print(f"[@route:adb_element_lists] Failed to connect to host: {e}")
            return jsonify({
                'success': False,
                'error': f'Failed to connect to host for ADB element lists: {str(e)}'
            }), 500
            
    except Exception as e:
        print(f"[@route:adb_element_lists] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'ADB element lists error: {str(e)}'
        }), 500

@verification_adb_server_bp.route('/adb/wait-element-appear', methods=['POST'])
def adb_wait_element_appear():
    """Forward ADB wait element appear request to host."""
    try:
        data = request.get_json()
        search_term = data.get('search_term', '')
        timeout = data.get('timeout', 10.0)
        model = data.get('model', 'default')
        
        print(f"[@route:adb_wait_element_appear] Forwarding ADB wait element appear to host: '{search_term}' (timeout: {timeout}s)")
        
        # Validate required parameters
        if not search_term:
            return jsonify({
                'success': False,
                'error': 'search_term is required'
            }), 400
        
        # Find appropriate host using registry
        host_info = get_host_by_model(model) if model != 'default' else get_primary_host()
        
        if not host_info:
            return jsonify({
                'success': False,
                'error': f'No available host found for model: {model}'
            }), 404
        
        print(f"[@route:adb_wait_element_appear] Using registered host: {host_info.get('host_name', 'unknown')}")
        
        # Use pre-built URL from host registry
        host_adb_url = build_host_url(host_info, '/stream/adb-wait-element-appear')
        
        adb_payload = {
            'search_term': search_term,
            'timeout': timeout,
            'model': model
        }
        
        print(f"[@route:adb_wait_element_appear] Sending request to {host_adb_url} with payload: {adb_payload}")
        
        try:
            host_response = requests.post(host_adb_url, json=adb_payload, timeout=timeout+5, verify=False)
            host_result = host_response.json()
            
            if host_result.get('success'):
                message = host_result.get('message', 'Element appeared')
                print(f"[@route:adb_wait_element_appear] Host ADB wait element appear successful: {message}")
                return jsonify(host_result)
            else:
                message = host_result.get('message', 'Element did not appear')
                print(f"[@route:adb_wait_element_appear] Host ADB wait element appear failed: {message}")
                return jsonify(host_result), 200  # Return 200 but success=False for timeout/not found
                
        except requests.exceptions.RequestException as e:
            print(f"[@route:adb_wait_element_appear] Failed to connect to host: {e}")
            return jsonify({
                'success': False,
                'error': f'Failed to connect to host for ADB wait element appear: {str(e)}'
            }), 500
            
    except Exception as e:
        print(f"[@route:adb_wait_element_appear] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'ADB wait element appear error: {str(e)}'
        }), 500

@verification_adb_server_bp.route('/adb/wait-element-disappear', methods=['POST'])
def adb_wait_element_disappear():
    """Forward ADB wait element disappear request to host."""
    try:
        data = request.get_json()
        search_term = data.get('search_term', '')
        timeout = data.get('timeout', 10.0)
        model = data.get('model', 'default')
        
        print(f"[@route:adb_wait_element_disappear] Forwarding ADB wait element disappear to host: '{search_term}' (timeout: {timeout}s)")
        
        # Validate required parameters
        if not search_term:
            return jsonify({
                'success': False,
                'error': 'search_term is required'
            }), 400
        
        # Find appropriate host using registry
        host_info = get_host_by_model(model) if model != 'default' else get_primary_host()
        
        if not host_info:
            return jsonify({
                'success': False,
                'error': f'No available host found for model: {model}'
            }), 404
        
        print(f"[@route:adb_wait_element_disappear] Using registered host: {host_info.get('host_name', 'unknown')}")
        
        # Use pre-built URL from host registry
        host_adb_url = build_host_url(host_info, '/stream/adb-wait-element-disappear')
        
        adb_payload = {
            'search_term': search_term,
            'timeout': timeout,
            'model': model
        }
        
        print(f"[@route:adb_wait_element_disappear] Sending request to {host_adb_url} with payload: {adb_payload}")
        
        try:
            host_response = requests.post(host_adb_url, json=adb_payload, timeout=timeout+5, verify=False)
            host_result = host_response.json()
            
            if host_result.get('success'):
                message = host_result.get('message', 'Element disappeared')
                print(f"[@route:adb_wait_element_disappear] Host ADB wait element disappear successful: {message}")
                return jsonify(host_result)
            else:
                message = host_result.get('message', 'Element still present')
                print(f"[@route:adb_wait_element_disappear] Host ADB wait element disappear failed: {message}")
                return jsonify(host_result), 200  # Return 200 but success=False for timeout/still present
                
        except requests.exceptions.RequestException as e:
            print(f"[@route:adb_wait_element_disappear] Failed to connect to host: {e}")
            return jsonify({
                'success': False,
                'error': f'Failed to connect to host for ADB wait element disappear: {str(e)}'
            }), 500
            
    except Exception as e:
        print(f"[@route:adb_wait_element_disappear] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'ADB wait element disappear error: {str(e)}'
        }), 500 
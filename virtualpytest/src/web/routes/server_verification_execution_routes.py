"""
Verification Execution Server Routes

This module contains the server-side verification execution endpoints that:
- Forward verification execution requests to host
- Handle batch verification coordination
- Manage execution results and status
"""

from flask import Blueprint, request, jsonify
import urllib.parse
import requests
from src.utils.app_utils import get_host_by_model, buildHostUrl, buildHostWebUrl

# Create blueprint
verification_execution_server_bp = Blueprint('verification_execution_server', __name__, url_prefix='/server/verification')

# =====================================================
# SERVER-SIDE VERIFICATION EXECUTION (FORWARDS TO HOST)
# =====================================================

@verification_execution_server_bp.route('/execute', methods=['POST'])
def execute_verification():
    """Forward verification execution request to host."""
    try:
        data = request.get_json()
        verification_params = data.get('verification_params', {})
        model = data.get('model', 'default')
        
        print(f"[@route:execute_verification] Forwarding verification execution to host for model: {model}")
        print(f"[@route:execute_verification] Verification params: {verification_params}")
        
        # Validate required parameters
        if not verification_params:
            return jsonify({
                'success': False,
                'error': 'verification_params is required'
            }), 400
        
        # Find appropriate host using registry
        host_info = get_host_by_model(model)
        
        if not host_info:
            return jsonify({
                'success': False,
                'error': f'No available host found for model: {model}'
            }), 404
        
        verification = verification_params.get('verification')
        source_path = verification_params.get('source_path')
        
        print(f"[@route:execute_verification] Verification type: {verification.get('type') if verification else 'unknown'}")
        
        # Extract filename from source_path URL if provided
        if source_path:
            parsed_url = urllib.parse.urlparse(source_path)
            source_filename = parsed_url.path.split('/')[-1]  # Extract filename
        else:
            source_filename = 'no_source'
        
        print(f"[@route:execute_verification] Using registered host: {host_info.get('host_name', 'unknown')}, filename: {source_filename}")
        
        # Use pre-built URL from host registry
        host_execute_url = buildHostUrl(host_info, '/stream/execute-verification')
        
        execute_payload = {
            'source_filename': source_filename,
            'verification': verification,
            'model': model
        }
        
        print(f"[@route:execute_verification] Sending request to {host_execute_url} with payload: {execute_payload}")
        
        try:
            host_response = requests.post(host_execute_url, json=execute_payload, timeout=60, verify=False)
            host_result = host_response.json()
            
            if host_result.get('success'):
                verification_result = host_result.get('verification_result', {})
                print(f"[@route:execute_verification] Host verification successful")
                
                # Convert host URLs to nginx-exposed URLs using registry-based URL builder
                if verification_result.get('source_image_url'):
                    verification_result['source_image_url'] = buildHostWebUrl(host_info, verification_result['source_image_url'])
                if verification_result.get('result_overlay_url'):
                    verification_result['result_overlay_url'] = buildHostWebUrl(host_info, verification_result['result_overlay_url'])
                if verification_result.get('reference_image_url'):
                    verification_result['reference_image_url'] = buildHostWebUrl(host_info, verification_result['reference_image_url'])
                
                return jsonify(host_result)
            else:
                error_msg = host_result.get('error', 'Host execution failed')
                print(f"[@route:execute_verification] Host execution failed: {error_msg}")
                return jsonify(host_result), 500
                
        except requests.exceptions.RequestException as e:
            print(f"[@route:execute_verification] Failed to connect to host: {e}")
            return jsonify({
                'success': False,
                'error': f'Failed to connect to host for execution: {str(e)}'
            }), 500
            
    except Exception as e:
        print(f"[@route:execute_verification] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Verification execution error: {str(e)}'
        }), 500

@verification_execution_server_bp.route('/execute-batch', methods=['POST'])
def execute_batch_verification():
    """Forward batch verification execution request to host."""
    try:
        data = request.get_json()
        verifications = data.get('verifications', [])
        source_path = data.get('source_path')
        model = data.get('model', 'default')
        
        print(f"[@route:execute_batch_verification] Forwarding batch verification execution to host")
        print(f"[@route:execute_batch_verification] Source: {source_path}, Model: {model}")
        print(f"[@route:execute_batch_verification] Verification count: {len(verifications)}")
        
        # Validate required parameters
        if not verifications or not source_path:
            return jsonify({
                'success': False,
                'error': 'verifications and source_path are required'
            }), 400
        
        # Find appropriate host using registry
        host_info = get_host_by_model(model)
        
        if not host_info:
            return jsonify({
                'success': False,
                'error': f'No available host found for model: {model}'
            }), 404
        
        # Extract filename from source_path URL
        parsed_url = urllib.parse.urlparse(source_path)
        source_filename = parsed_url.path.split('/')[-1]  # Extract filename
        
        print(f"[@route:execute_batch_verification] Using registered host: {host_info.get('host_name', 'unknown')}, filename: {source_filename}")
        
        # Use pre-built URL from host registry
        host_batch_url = buildHostUrl(host_info, '/stream/execute-batch-verification')
        
        batch_payload = {
            'source_filename': source_filename,
            'verifications': verifications,
            'model': model
        }
        
        print(f"[@route:execute_batch_verification] Sending request to {host_batch_url} with {len(verifications)} verifications")
        
        try:
            host_response = requests.post(host_batch_url, json=batch_payload, timeout=120, verify=False)
            host_result = host_response.json()
            
            if host_result.get('success'):
                results = host_result.get('results', [])
                print(f"[@route:execute_batch_verification] Host batch verification successful: {len(results)} results")
                
                # Convert all host URLs to nginx-exposed URLs using registry-based URL builder
                for result in results:
                    if result.get('source_image_url'):
                        result['source_image_url'] = buildHostWebUrl(host_info, result['source_image_url'])
                    if result.get('result_overlay_url'):
                        result['result_overlay_url'] = buildHostWebUrl(host_info, result['result_overlay_url'])
                    if result.get('reference_image_url'):
                        result['reference_image_url'] = buildHostWebUrl(host_info, result['reference_image_url'])
                
                # Convert results directory URL
                if host_result.get('results_directory'):
                    host_result['results_directory_url'] = buildHostWebUrl(host_info, host_result['results_directory'])
                
                return jsonify(host_result)
            else:
                error_msg = host_result.get('error', 'Host batch execution failed')
                print(f"[@route:execute_batch_verification] Host batch execution failed: {error_msg}")
                return jsonify(host_result), 500
                
        except requests.exceptions.RequestException as e:
            print(f"[@route:execute_batch_verification] Failed to connect to host: {e}")
            return jsonify({
                'success': False,
                'error': f'Failed to connect to host for batch execution: {str(e)}'
            }), 500
            
    except Exception as e:
        print(f"[@route:execute_batch_verification] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Batch verification execution error: {str(e)}'
        }), 500 
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

# Create blueprint
verification_execution_server_bp = Blueprint('verification_execution_server', __name__)

# =====================================================
# SERVER-SIDE VERIFICATION EXECUTION (FORWARDS TO HOST)
# =====================================================

@verification_execution_server_bp.route('/api/virtualpytest/verification/execute', methods=['POST'])
def execute_verification():
    """Forward verification execution request to host."""
    try:
        data = request.get_json()
        verification = data.get('verification')
        source_path = data.get('source_path')
        model = data.get('model', 'default')
        
        print(f"[@route:execute_verification] Forwarding verification execution to host")
        print(f"[@route:execute_verification] Source: {source_path}, Model: {model}")
        print(f"[@route:execute_verification] Verification type: {verification.get('type') if verification else 'unknown'}")
        
        # Validate required parameters
        if not verification or not source_path:
            return jsonify({
                'success': False,
                'error': 'verification and source_path are required'
            }), 400
        
        # Hardcode IPs for testing
        host_ip = "77.56.53.130"  # Host IP
        host_port = "5119"        # Host internal port
        
        # Extract filename from source_path URL
        parsed_url = urllib.parse.urlparse(source_path)
        source_filename = parsed_url.path.split('/')[-1]  # Extract filename
        
        print(f"[@route:execute_verification] Using hardcoded host: {host_ip}:{host_port}, filename: {source_filename}")
        
        # Forward execution request to host
        host_execute_url = f'http://{host_ip}:{host_port}/stream/execute-verification'
        
        execute_payload = {
            'verification': verification,
            'source_filename': source_filename,
            'model': model
        }
        
        print(f"[@route:execute_verification] Sending request to {host_execute_url}")
        
        try:
            host_response = requests.post(host_execute_url, json=execute_payload, timeout=60, verify=False)
            host_result = host_response.json()
            
            if host_result.get('success'):
                verification_result = host_result.get('verification_result', {})
                print(f"[@route:execute_verification] Host execution completed: {verification_result.get('success')}")
                
                # Convert host URLs to nginx-exposed URLs
                if verification_result.get('source_image_url'):
                    verification_result['source_image_url'] = f'https://77.56.53.130:444{verification_result["source_image_url"]}'
                if verification_result.get('result_overlay_url'):
                    verification_result['result_overlay_url'] = f'https://77.56.53.130:444{verification_result["result_overlay_url"]}'
                if verification_result.get('reference_image_url'):
                    verification_result['reference_image_url'] = f'https://77.56.53.130:444{verification_result["reference_image_url"]}'
                
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

@verification_execution_server_bp.route('/api/virtualpytest/verification/execute-batch', methods=['POST'])
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
        
        # Hardcode IPs for testing
        host_ip = "77.56.53.130"  # Host IP
        host_port = "5119"        # Host internal port
        
        # Extract filename from source_path URL
        parsed_url = urllib.parse.urlparse(source_path)
        source_filename = parsed_url.path.split('/')[-1]  # Extract filename
        
        print(f"[@route:execute_batch_verification] Using hardcoded host: {host_ip}:{host_port}, filename: {source_filename}")
        
        # Forward batch execution request to host
        host_batch_url = f'http://{host_ip}:{host_port}/stream/execute-batch-verification'
        
        batch_payload = {
            'verifications': verifications,
            'source_filename': source_filename,
            'model': model
        }
        
        print(f"[@route:execute_batch_verification] Sending batch request to {host_batch_url}")
        
        try:
            # Use longer timeout for batch operations
            host_response = requests.post(host_batch_url, json=batch_payload, timeout=300, verify=False)
            host_result = host_response.json()
            
            if host_result.get('success') is not None:  # Can be True or False
                passed_count = host_result.get('passed_count', 0)
                total_count = host_result.get('total_count', 0)
                print(f"[@route:execute_batch_verification] Host batch execution completed: {passed_count}/{total_count} passed")
                
                # Convert host URLs to nginx-exposed URLs for all results
                results = host_result.get('results', [])
                for result in results:
                    if result.get('source_image_url'):
                        result['source_image_url'] = f'https://77.56.53.130:444{result["source_image_url"]}'
                    if result.get('result_overlay_url'):
                        result['result_overlay_url'] = f'https://77.56.53.130:444{result["result_overlay_url"]}'
                    if result.get('reference_image_url'):
                        result['reference_image_url'] = f'https://77.56.53.130:444{result["reference_image_url"]}'
                
                # Convert results directory URL
                if host_result.get('results_directory'):
                    host_result['results_directory_url'] = f'https://77.56.53.130:444{host_result["results_directory"]}'
                
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
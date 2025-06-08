"""
Verification Execution Host Routes

This module contains the main verification execution endpoints that:
- Coordinate verification execution across all types (image, text, ADB)
- Import execution functions from separated verification modules
- Handle batch verification operations
"""

from flask import Blueprint, request, jsonify, current_app
import os
import json
from datetime import datetime

# Import execution functions from separated modules
from .host_verification_image_routes import execute_image_verification_host
from .host_verification_text_routes import execute_text_verification_host
from .host_verification_adb_routes import execute_adb_verification_host

# Create blueprint
verification_execution_host_bp = Blueprint('verification_execution_host', __name__)

# Host configuration
HOST_IP = "77.56.53.130"
HOST_PORT = "5119"
CLIENT_URL = "https://77.56.53.130:444"  # Nginx-exposed URL

# =====================================================
# HOST-SIDE VERIFICATION EXECUTION ENDPOINTS
# =====================================================

@verification_execution_host_bp.route('/stream/execute-verification', methods=['POST'])
def execute_verification():
    """Execute verification test on host using existing controllers and return results with comparison images."""
    try:
        # ✅ USE OWN STORED HOST_DEVICE OBJECT
        host_device = getattr(current_app, 'my_host_device', None)
        
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device object not initialized. Host may need to re-register.'
            }), 404
        
        print(f"[@route:execute_verification] Using host device: {host_device.get('host_name')} - {host_device.get('device_name')}")
        
        data = request.get_json()
        verification = data.get('verification')
        source_filename = data.get('source_filename')
        model = data.get('model', 'default')
        
        print(f"[@route:execute_verification] Executing verification on host")
        print(f"[@route:execute_verification] Source: {source_filename}, Model: {model}")
        print(f"[@route:execute_verification] Verification type: {verification.get('type')}")
        
        # Validate required parameters
        if not verification or not source_filename:
            return jsonify({
                'success': False,
                'error': 'verification and source_filename are required'
            }), 400
        
        # Build source path
        source_path = f'/var/www/html/stream/captures/{source_filename}'
        
        # Check if source file exists
        if not os.path.exists(source_path):
            print(f"[@route:execute_verification] Source file not found: {source_path}")
            return jsonify({
                'success': False,
                'error': f'Source file not found: {source_filename}'
            }), 404
        
        # Create results directory
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        results_dir = f'/var/www/html/stream/verification_results/{timestamp}'
        os.makedirs(results_dir, exist_ok=True)
        
        verification_index = 0
        verification_type = verification.get('type', 'unknown')
        
        print(f"[@route:execute_verification] Executing {verification_type} verification")
        
        # Execute verification based on type
        if verification_type == 'image':
            result = execute_image_verification_host(verification, source_path, model, verification_index, results_dir)
        elif verification_type == 'text':
            result = execute_text_verification_host(verification, source_path, model, verification_index, results_dir)
        elif verification_type == 'adb':
            result = execute_adb_verification_host(verification, source_path, model, verification_index, results_dir)
        else:
            return jsonify({
                'success': False,
                'error': f'Unknown verification type: {verification_type}'
            }), 400
        
        # Convert local paths to public URLs
        if result.get('source_image_path'):
            result['source_image_url'] = result['source_image_path'].replace('/var/www/html', '')
        if result.get('result_overlay_path'):
            result['result_overlay_url'] = result['result_overlay_path'].replace('/var/www/html', '')
        if result.get('reference_image_path'):
            result['reference_image_url'] = result['reference_image_path'].replace('/var/www/html', '')
        
        print(f"[@route:execute_verification] Verification completed: {result.get('success')}")
        
        return jsonify({
            'success': True,
            'verification_result': result,
            'results_directory': results_dir.replace('/var/www/html', ''),
            'timestamp': timestamp
        })
        
    except Exception as e:
        print(f"[@route:execute_verification] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Verification execution error: {str(e)}'
        }), 500

@verification_execution_host_bp.route('/stream/execute-batch-verification', methods=['POST'])
def execute_batch_verification():
    """Execute batch verification tests on host and return consolidated results."""
    try:
        # ✅ USE OWN STORED HOST_DEVICE OBJECT
        host_device = getattr(current_app, 'my_host_device', None)
        
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device object not initialized. Host may need to re-register.'
            }), 404
        
        print(f"[@route:execute_batch_verification] Using host device: {host_device.get('host_name')} - {host_device.get('device_name')}")
        
        data = request.get_json()
        verifications = data.get('verifications', [])
        source_filename = data.get('source_filename')
        model = data.get('model', 'default')
        
        print(f"[@route:execute_batch_verification] Executing batch verification on host")
        print(f"[@route:execute_batch_verification] Source: {source_filename}, Model: {model}")
        print(f"[@route:execute_batch_verification] Verification count: {len(verifications)}")
        
        # Validate required parameters
        if not verifications or not source_filename:
            return jsonify({
                'success': False,
                'error': 'verifications and source_filename are required'
            }), 400
        
        # Build source path
        source_path = f'/var/www/html/stream/captures/{source_filename}'
        
        # Check if source file exists
        if not os.path.exists(source_path):
            print(f"[@route:execute_batch_verification] Source file not found: {source_path}")
            return jsonify({
                'success': False,
                'error': f'Source file not found: {source_filename}'
            }), 404
        
        # Create results directory
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        results_dir = f'/var/www/html/stream/verification_results/{timestamp}'
        os.makedirs(results_dir, exist_ok=True)
        
        results = []
        passed_count = 0
        
        for i, verification in enumerate(verifications):
            verification_type = verification.get('type', 'unknown')
            
            print(f"[@route:execute_batch_verification] Executing verification {i+1}/{len(verifications)}: {verification_type}")
            
            # Execute verification based on type
            if verification_type == 'image':
                result = execute_image_verification_host(verification, source_path, model, i, results_dir)
            elif verification_type == 'text':
                result = execute_text_verification_host(verification, source_path, model, i, results_dir)
            elif verification_type == 'adb':
                result = execute_adb_verification_host(verification, source_path, model, i, results_dir)
            else:
                result = {
                    'success': False,
                    'error': f'Unknown verification type: {verification_type}',
                    'verification_type': verification_type
                }
            
            # Convert local paths to public URLs
            if result.get('source_image_path'):
                result['source_image_url'] = result['source_image_path'].replace('/var/www/html', '')
            if result.get('result_overlay_path'):
                result['result_overlay_url'] = result['result_overlay_path'].replace('/var/www/html', '')
            if result.get('reference_image_path'):
                result['reference_image_url'] = result['reference_image_path'].replace('/var/www/html', '')
            
            results.append(result)
            
            if result.get('success'):
                passed_count += 1
        
        overall_success = passed_count == len(verifications)
        
        print(f"[@route:execute_batch_verification] Batch verification completed: {passed_count}/{len(verifications)} passed")
        
        return jsonify({
            'success': overall_success,
            'total_count': len(verifications),
            'passed_count': passed_count,
            'failed_count': len(verifications) - passed_count,
            'results': results,
            'results_directory': results_dir.replace('/var/www/html', ''),
            'timestamp': timestamp
        })
        
    except Exception as e:
        print(f"[@route:execute_batch_verification] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Batch verification execution error: {str(e)}'
        }), 500 
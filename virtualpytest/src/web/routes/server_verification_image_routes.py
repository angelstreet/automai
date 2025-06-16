"""
Verification Image Server Routes

This module contains the server-side image verification endpoints that:
- Forward image verification requests to host AV controller
- Handle reference image management
- Manage image processing operations
"""

from flask import Blueprint, request, jsonify
import requests
from src.utils.app_utils import get_host_by_model, buildHostUrl

# Create blueprint - using av since image verification uses AV controller
verification_av_image_bp = Blueprint('verification_av_image', __name__, url_prefix='/server/verification/av')

# =====================================================
# SERVER-SIDE IMAGE VERIFICATION ENDPOINTS (FORWARDS TO HOST)
# =====================================================

@verification_av_image_bp.route('/capture-reference', methods=['POST'])
def capture_reference():
    """Forward reference capture request to host."""
    try:
        data = request.get_json()
        reference_name = data.get('reference_name')
        model = data.get('model', 'default')
        area = data.get('area')  # Optional area selection
        
        print(f"[@route:capture_reference] Forwarding reference capture to host: {reference_name} (model: {model})")
        if area:
            print(f"[@route:capture_reference] With area selection: {area}")
        
        # Validate required parameters
        if not reference_name:
            return jsonify({
                'success': False,
                'error': 'reference_name is required'
            }), 400
        
        # Find appropriate host using registry
        host_info = get_host_by_model(model)
        
        if not host_info:
            return jsonify({
                'success': False,
                'error': f'No available host found for model: {model}'
            }), 404
        
        print(f"[@route:capture_reference] Using registered host: {host_info.get('host_name', 'unknown')}")
        
        # Use pre-built URL from host registry
        host_capture_url = buildHostUrl(host_info, '/host/verification/av/capture-reference')
        
        capture_payload = {
            'reference_name': reference_name,
            'model': model,
            'area': area
        }
        
        print(f"[@route:capture_reference] Sending request to {host_capture_url} with payload: {capture_payload}")
        
        try:
            host_response = requests.post(host_capture_url, json=capture_payload, timeout=30, verify=False)
            host_result = host_response.json()
            
            if host_result.get('success'):
                reference_path = host_result.get('reference_path', '')
                print(f"[@route:capture_reference] Host reference capture successful: {reference_path}")
                
                # Convert host URL to nginx-exposed URL using registry-based URL builder
                if host_result.get('reference_url'):
                    host_result['reference_url'] = buildHostUrl(host_info, host_result['reference_url'])
                
                return jsonify(host_result)
            else:
                error_msg = host_result.get('error', 'Host reference capture failed')
                print(f"[@route:capture_reference] Host reference capture failed: {error_msg}")
                return jsonify(host_result), 500
                
        except requests.exceptions.RequestException as e:
            print(f"[@route:capture_reference] Failed to connect to host: {e}")
            return jsonify({
                'success': False,
                'error': f'Failed to connect to host for reference capture: {str(e)}'
            }), 500
            
    except Exception as e:
        print(f"[@route:capture_reference] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Reference capture error: {str(e)}'
        }), 500

@verification_av_image_bp.route('/process-area', methods=['POST'])
def process_area():
    """Forward area processing request to host."""
    try:
        data = request.get_json()
        area = data.get('area')
        model = data.get('model', 'default')
        
        print(f"[@route:process_area] Forwarding area processing to host (model: {model})")
        print(f"[@route:process_area] Area: {area}")
        
        # Validate required parameters
        if not area:
            return jsonify({
                'success': False,
                'error': 'area is required'
            }), 400
        
        # Find appropriate host using registry
        host_info = get_host_by_model(model)
        
        if not host_info:
            return jsonify({
                'success': False,
                'error': f'No available host found for model: {model}'
            }), 404
        
        print(f"[@route:process_area] Using registered host: {host_info.get('host_name', 'unknown')}")
        
        # Use pre-built URL from host registry
        host_process_url = buildHostUrl(host_info, '/host/verification/av/process-area')
        
        process_payload = {
            'area': area,
            'model': model
        }
        
        print(f"[@route:process_area] Sending request to {host_process_url} with payload: {process_payload}")
        
        try:
            host_response = requests.post(host_process_url, json=process_payload, timeout=30, verify=False)
            host_result = host_response.json()
            
            if host_result.get('success'):
                print(f"[@route:process_area] Host area processing successful")
                
                # Convert host URLs to nginx-exposed URLs using registry-based URL builder
                if host_result.get('processed_image_url'):
                    host_result['processed_image_url'] = buildHostUrl(host_info, host_result['processed_image_url'])
                
                return jsonify(host_result)
            else:
                error_msg = host_result.get('error', 'Host area processing failed')
                print(f"[@route:process_area] Host area processing failed: {error_msg}")
                return jsonify(host_result), 500
                
        except requests.exceptions.RequestException as e:
            print(f"[@route:process_area] Failed to connect to host: {e}")
            return jsonify({
                'success': False,
                'error': f'Failed to connect to host for area processing: {str(e)}'
            }), 500
            
    except Exception as e:
        print(f"[@route:process_area] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Area processing error: {str(e)}'
        }), 500

@verification_av_image_bp.route('/save-reference', methods=['POST'])
def save_reference():
    """Forward reference save request to host."""
    try:
        data = request.get_json()
        reference_name = data.get('reference_name')
        image_data = data.get('image_data')
        model = data.get('model', 'default')
        
        print(f"[@route:save_reference] Forwarding reference save to host: {reference_name} (model: {model})")
        
        # Validate required parameters
        if not reference_name or not image_data:
            return jsonify({
                'success': False,
                'error': 'reference_name and image_data are required'
            }), 400
        
        # Find appropriate host using registry
        host_info = get_host_by_model(model)
        
        if not host_info:
            return jsonify({
                'success': False,
                'error': f'No available host found for model: {model}'
            }), 404
        
        print(f"[@route:save_reference] Using registered host: {host_info.get('host_name', 'unknown')}")
        
        # Use pre-built URL from host registry
        host_save_url = buildHostUrl(host_info, '/host/verification/av/save-reference')
        
        save_payload = {
            'reference_name': reference_name,
            'image_data': image_data,
            'model': model
        }
        
        print(f"[@route:save_reference] Sending request to {host_save_url}")
        
        try:
            host_response = requests.post(host_save_url, json=save_payload, timeout=30, verify=False)
            host_result = host_response.json()
            
            if host_result.get('success'):
                reference_path = host_result.get('reference_path', '')
                print(f"[@route:save_reference] Host reference save successful: {reference_path}")
                
                # Convert host URL to nginx-exposed URL using registry-based URL builder
                if host_result.get('reference_url'):
                    host_result['reference_url'] = buildHostUrl(host_info, host_result['reference_url'])
                
                return jsonify(host_result)
            else:
                error_msg = host_result.get('error', 'Host reference save failed')
                print(f"[@route:save_reference] Host reference save failed: {error_msg}")
                return jsonify(host_result), 500
                
        except requests.exceptions.RequestException as e:
            print(f"[@route:save_reference] Failed to connect to host: {e}")
            return jsonify({
                'success': False,
                'error': f'Failed to connect to host for reference save: {str(e)}'
            }), 500
            
    except Exception as e:
        print(f"[@route:save_reference] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Reference save error: {str(e)}'
        }), 500

@verification_av_image_bp.route('/ensure-reference-availability', methods=['POST'])
def ensure_reference_availability():
    """Forward reference availability check to host."""
    try:
        data = request.get_json()
        reference_name = data.get('reference_name')
        model = data.get('model', 'default')
        
        print(f"[@route:ensure_reference_availability] Checking reference availability: {reference_name} (model: {model})")
        
        # Validate required parameters
        if not reference_name:
            return jsonify({
                'success': False,
                'error': 'reference_name is required'
            }), 400
        
        # Find appropriate host using registry
        host_info = get_host_by_model(model)
        
        if not host_info:
            return jsonify({
                'success': False,
                'error': f'No available host found for model: {model}'
            }), 404
        
        print(f"[@route:ensure_reference_availability] Using registered host: {host_info.get('host_name', 'unknown')}")
        
        # Use pre-built URL from host registry
        host_check_url = buildHostUrl(host_info, '/host/verification/av/ensure-reference-availability')
        
        check_payload = {
            'reference_name': reference_name,
            'model': model
        }
        
        print(f"[@route:ensure_reference_availability] Sending request to {host_check_url} with payload: {check_payload}")
        
        try:
            host_response = requests.post(host_check_url, json=check_payload, timeout=30, verify=False)
            host_result = host_response.json()
            
            if host_result.get('success'):
                available = host_result.get('available', False)
                print(f"[@route:ensure_reference_availability] Reference availability check successful: {available}")
                
                # Convert host URL to nginx-exposed URL using registry-based URL builder
                if host_result.get('reference_url'):
                    host_result['reference_url'] = buildHostUrl(host_info, host_result['reference_url'])
                
                return jsonify(host_result)
            else:
                error_msg = host_result.get('error', 'Host reference availability check failed')
                print(f"[@route:ensure_reference_availability] Host reference availability check failed: {error_msg}")
                return jsonify(host_result), 500
                
        except requests.exceptions.RequestException as e:
            print(f"[@route:ensure_reference_availability] Failed to connect to host: {e}")
            return jsonify({
                'success': False,
                'error': f'Failed to connect to host for reference availability check: {str(e)}'
            }), 500
            
    except Exception as e:
        print(f"[@route:ensure_reference_availability] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Reference availability check error: {str(e)}'
        }), 500 
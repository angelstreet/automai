"""
Verification Image Server Routes

This module contains the server-side image verification API endpoints that:
- Forward image cropping requests to host
- Handle image verification execution coordination
- Manage image reference actions and status
"""

from flask import Blueprint, request, jsonify
import urllib.parse
import requests

# Create blueprint
verification_image_server_bp = Blueprint('verification_image_server', __name__)

# =====================================================
# SERVER-SIDE REFERENCE IMAGE CAPTURE (FORWARDS TO HOST)
# =====================================================

@verification_image_server_bp.route('/api/virtualpytest/reference/capture', methods=['POST'])
def capture_reference_image():
    """Forward crop request to host instead of processing locally."""
    try:
        data = request.get_json()
        area = data.get('area')
        source_path = data.get('source_path')
        reference_name = data.get('reference_name')
        model = data.get('model')
        
        print(f"[@route:capture_reference_image] Forwarding crop request to host from {source_path} with area: {area}")
        
        # Validate required parameters
        if not area or not source_path or not reference_name or not model:
            return jsonify({
                'success': False,
                'error': 'Missing required parameters: area, source_path, reference_name, and model are all required'
            }), 400
        
        # Hardcode IPs for testing
        host_ip = "77.56.53.130"  # Host IP
        host_port = "5119"        # Host internal port
        server_ip = "192.168.1.67"  # Server IP
        
        # Extract filename from source_path URL
        parsed_url = urllib.parse.urlparse(source_path)
        source_filename = parsed_url.path.split('/')[-1]  # Extract filename
        
        print(f"[@route:capture_reference_image] Using hardcoded host: {host_ip}:{host_port}, filename: {source_filename}")
        
        # Forward crop request to host
        host_crop_url = f'http://{host_ip}:{host_port}/stream/crop-area'
        
        crop_payload = {
            'source_filename': source_filename,
            'area': area,
            'reference_name': reference_name
        }
        
        print(f"[@route:capture_reference_image] Sending request to {host_crop_url} with payload: {crop_payload}")
        
        try:
            host_response = requests.post(host_crop_url, json=crop_payload, timeout=30, verify=False)
            host_result = host_response.json()
            
            if host_result.get('success'):
                cropped_path = host_result.get('cropped_path')
                print(f"[@route:capture_reference_image] Host cropping successful: {cropped_path}")
                
                # Convert relative path to full nginx-exposed URL
                full_image_url = f'https://77.56.53.130:444{cropped_path}'
                
                # Extract the actual filename for later save operations
                cropped_filename = cropped_path.split('/')[-1] if cropped_path else None
                
                return jsonify({
                    'success': True,
                    'message': f'Reference image cropped on host: {reference_name}',
                    'image_url': full_image_url,
                    'cropped_filename': cropped_filename  # Return actual filename
                })
            else:
                error_msg = host_result.get('error', 'Host cropping failed')
                print(f"[@route:capture_reference_image] Host cropping failed: {error_msg}")
                return jsonify({
                    'success': False,
                    'error': f'Host cropping failed: {error_msg}'
                }), 500
                
        except requests.exceptions.RequestException as e:
            print(f"[@route:capture_reference_image] Failed to connect to host: {e}")
            return jsonify({
                'success': False,
                'error': f'Failed to connect to host for cropping: {str(e)}'
            }), 500
            
    except Exception as e:
        print(f"[@route:capture_reference_image] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Reference capture error: {str(e)}'
        }), 500

@verification_image_server_bp.route('/api/virtualpytest/reference/process-area', methods=['POST'])
def process_area_reference():
    """Forward process request to host instead of processing locally."""
    try:
        data = request.get_json()
        area = data.get('area')
        source_path = data.get('source_path')
        reference_name = data.get('reference_name')
        model = data.get('model')
        autocrop = data.get('autocrop', False)
        remove_background = data.get('remove_background', False)
        
        print(f"[@route:process_area_reference] Forwarding process request to host from {source_path} with area: {area}")
        print(f"[@route:process_area_reference] Processing options: autocrop={autocrop}, remove_background={remove_background}")
        
        # Validate required parameters
        if not area or not source_path or not reference_name or not model:
            return jsonify({
                'success': False,
                'error': 'Missing required parameters: area, source_path, reference_name, and model are all required'
            }), 400
        
        # Hardcode IPs for testing
        host_ip = "77.56.53.130"  # Host IP
        host_port = "5119"        # Host internal port
        server_ip = "192.168.1.67"  # Server IP
        
        # Extract filename from source_path URL
        parsed_url = urllib.parse.urlparse(source_path)
        source_filename = parsed_url.path.split('/')[-1]  # Extract filename
        
        print(f"[@route:process_area_reference] Using hardcoded host: {host_ip}:{host_port}, filename: {source_filename}")
        
        # Forward process request to host
        host_process_url = f'http://{host_ip}:{host_port}/stream/process-area'
        
        process_payload = {
            'source_filename': source_filename,
            'area': area,
            'reference_name': reference_name,
            'autocrop': autocrop,
            'remove_background': remove_background
        }
        
        print(f"[@route:process_area_reference] Sending request to {host_process_url} with payload: {process_payload}")
        
        try:
            host_response = requests.post(host_process_url, json=process_payload, timeout=30, verify=False)
            host_result = host_response.json()
            
            if host_result.get('success'):
                cropped_path = host_result.get('cropped_path')
                processed_area = host_result.get('processed_area')
                print(f"[@route:process_area_reference] Host processing successful: {cropped_path}")
                
                # Convert relative path to full nginx-exposed URL
                full_image_url = f'https://77.56.53.130:444{cropped_path}'
                
                # Extract the actual filename for later save operations
                cropped_filename = cropped_path.split('/')[-1] if cropped_path else None
                
                return jsonify({
                    'success': True,
                    'message': f'Reference image processed on host: {reference_name}',
                    'image_url': full_image_url,
                    'processed_area': processed_area,
                    'cropped_filename': cropped_filename  # Return actual filename
                })
            else:
                error_msg = host_result.get('error', 'Host processing failed')
                print(f"[@route:process_area_reference] Host processing failed: {error_msg}")
                return jsonify({
                    'success': False,
                    'error': f'Host processing failed: {error_msg}'
                }), 500
                
        except requests.exceptions.RequestException as e:
            print(f"[@route:process_area_reference] Failed to connect to host: {e}")
            return jsonify({
                'success': False,
                'error': f'Failed to connect to host for processing: {str(e)}'
            }), 500
            
    except Exception as e:
        print(f"[@route:process_area_reference] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Reference processing error: {str(e)}'
        }), 500

# =====================================================
# SERVER-SIDE REFERENCE SAVE (FORWARDS TO HOST)
# =====================================================

@verification_image_server_bp.route('/api/virtualpytest/reference/save', methods=['POST'])
def save_reference():
    """Forward save request to host to save resource to git repository."""
    try:
        data = request.get_json()
        reference_name = data.get('reference_name')
        model_name = data.get('model_name')
        area = data.get('area')
        reference_type = data.get('reference_type', 'reference_image')
        source_path = data.get('source_path')  # Source path to extract filename
        cropped_filename = data.get('cropped_filename')  # NEW: Use provided cropped filename if available
        
        print(f"[@route:save_reference] Forwarding save request to host: {reference_name} for model: {model_name}")
        print(f"[@route:save_reference] Source path: {source_path}")
        print(f"[@route:save_reference] Provided cropped filename: {cropped_filename}")
        
        # Validate required parameters
        if not reference_name or not model_name or not area:
            return jsonify({
                'success': False,
                'error': 'Missing required parameters: reference_name, model_name, and area are all required'
            }), 400
        
        # Hardcode IPs for testing
        host_ip = "77.56.53.130"  # Host IP
        host_port = "5119"        # Host internal port
        
        # Use provided cropped_filename or build it from source_path (fallback)
        if not cropped_filename and source_path:
            parsed_url = urllib.parse.urlparse(source_path)
            source_filename = parsed_url.path.split('/')[-1]  # Extract filename
            # Build the expected cropped filename: cropped_{reference_name}_{source_filename}
            cropped_filename = f'cropped_{reference_name}_{source_filename}'
        elif not cropped_filename:
            # Fallback pattern if no source_path provided
            cropped_filename = f'cropped_{reference_name}.jpg'
        
        print(f"[@route:save_reference] Using hardcoded host: {host_ip}:{host_port}, cropped filename: {cropped_filename}")
        
        # Forward save request to host
        host_save_url = f'http://{host_ip}:{host_port}/stream/save-resource'
        
        save_payload = {
            'cropped_filename': cropped_filename,
            'reference_name': reference_name,
            'model': model_name,
            'area': area,
            'reference_type': reference_type
        }
        
        print(f"[@route:save_reference] Sending request to {host_save_url} with payload: {save_payload}")
        
        try:
            host_response = requests.post(host_save_url, json=save_payload, timeout=60, verify=False)
            host_result = host_response.json()
            
            if host_result.get('success'):
                public_url = host_result.get('public_url')
                print(f"[@route:save_reference] Host save successful: {public_url}")
                
                # Build full URL with nginx-exposed URL
                full_public_url = f'https://77.56.53.130:444{public_url}'
                
                return jsonify({
                    'success': True,
                    'message': f'Reference saved to git repository: {reference_name}',
                    'public_url': full_public_url
                })
            else:
                error_msg = host_result.get('error', 'Host save failed')
                print(f"[@route:save_reference] Host save failed: {error_msg}")
                return jsonify({
                    'success': False,
                    'error': f'Host save failed: {error_msg}'
                }), 500
                
        except requests.exceptions.RequestException as e:
            print(f"[@route:save_reference] Failed to connect to host: {e}")
            return jsonify({
                'success': False,
                'error': f'Failed to connect to host for saving: {str(e)}'
            }), 500
            
    except Exception as e:
        print(f"[@route:save_reference] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Reference save error: {str(e)}'
        }), 500

# =====================================================
# SERVER-SIDE IMAGE REFERENCE STREAM AVAILABILITY ENDPOINT
# =====================================================

@verification_image_server_bp.route('/api/virtualpytest/reference/ensure-stream-availability', methods=['POST'])
def ensure_reference_stream_availability():
    """Ensure reference image is available in stream directory for preview."""
    try:
        data = request.get_json()
        reference_name = data.get('reference_name')
        model = data.get('model')
        
        print(f"[@route:ensure_reference_stream_availability] Ensuring availability for: {reference_name} (model: {model})")
        
        # Validate required parameters
        if not reference_name or not model:
            return jsonify({
                'success': False,
                'error': 'reference_name and model are required'
            }), 400
        
        # Hardcode IPs for testing (same as other functions)
        host_ip = "77.56.53.130"  # Host IP
        host_port = "5119"        # Host internal port
        
        # Forward request to host
        host_response = requests.post(
            f'http://{host_ip}:{host_port}/stream/ensure-reference-availability',
            json={
                'reference_name': reference_name,
                'model': model
            },
            timeout=30
        )
        
        if host_response.status_code == 200:
            host_result = host_response.json()
            print(f"[@route:ensure_reference_stream_availability] Host response: {host_result.get('success')}")
            return jsonify(host_result)
        else:
            print(f"[@route:ensure_reference_stream_availability] Host request failed: {host_response.status_code}")
            return jsonify({
                'success': False,
                'error': f'Host request failed: {host_response.status_code}'
            }), host_response.status_code
            
    except requests.exceptions.RequestException as e:
        print(f"[@route:ensure_reference_stream_availability] Request error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to connect to host: {str(e)}'
        }), 500
    except Exception as e:
        print(f"[@route:ensure_reference_stream_availability] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500 
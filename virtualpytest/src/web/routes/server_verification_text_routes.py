"""
Verification Text Server Routes

This module contains the server-side text verification endpoints that:
- Forward text verification requests to host AV controller
- Handle OCR detection and text reference management
- Manage text processing operations
"""

from flask import Blueprint, request, jsonify
import requests
from src.utils.app_utils import get_host_by_model, buildHostUrl

# Create blueprint - using av since text verification uses AV controller
verification_av_text_bp = Blueprint('verification_av_text', __name__, url_prefix='/server/verification/av')

# =====================================================
# SERVER-SIDE TEXT VERIFICATION ENDPOINTS (FORWARDS TO HOST)
# =====================================================

@verification_av_text_bp.route('/ocr-detection', methods=['POST'])
def ocr_detection():
    """Forward OCR detection request to host."""
    try:
        data = request.get_json()
        area = data.get('area')
        model = data.get('model', 'default')
        
        print(f"[@route:ocr_detection] Forwarding OCR detection to host (model: {model})")
        print(f"[@route:ocr_detection] Area: {area}")
        
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
        
        print(f"[@route:ocr_detection] Using registered host: {host_info.get('host_name', 'unknown')}")
        
        # Use pre-built URL from host registry
        host_ocr_url = buildHostUrl(host_info, '/host/verification/av/ocr-detection')
        
        ocr_payload = {
            'area': area,
            'model': model
        }
        
        print(f"[@route:ocr_detection] Sending request to {host_ocr_url} with payload: {ocr_payload}")
        
        try:
            host_response = requests.post(host_ocr_url, json=ocr_payload, timeout=30, verify=False)
            host_result = host_response.json()
            
            if host_result.get('success'):
                detected_text = host_result.get('detected_text', '')
                print(f"[@route:ocr_detection] Host OCR detection successful: '{detected_text}'")
                
                # Convert host URLs to nginx-exposed URLs using registry-based URL builder
                if host_result.get('processed_image_url'):
                    host_result['processed_image_url'] = buildHostUrl(host_info, host_result['processed_image_url'])
                
                return jsonify(host_result)
            else:
                error_msg = host_result.get('error', 'Host OCR detection failed')
                print(f"[@route:ocr_detection] Host OCR detection failed: {error_msg}")
                return jsonify(host_result), 500
                
        except requests.exceptions.RequestException as e:
            print(f"[@route:ocr_detection] Failed to connect to host: {e}")
            return jsonify({
                'success': False,
                'error': f'Failed to connect to host for OCR detection: {str(e)}'
            }), 500
            
    except Exception as e:
        print(f"[@route:ocr_detection] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'OCR detection error: {str(e)}'
        }), 500

@verification_av_text_bp.route('/save-text-reference', methods=['POST'])
def save_text_reference():
    """Forward text reference save request to host."""
    try:
        data = request.get_json()
        reference_name = data.get('reference_name')
        text_content = data.get('text_content')
        model = data.get('model', 'default')
        
        print(f"[@route:save_text_reference] Forwarding text reference save to host: {reference_name} (model: {model})")
        print(f"[@route:save_text_reference] Text content: '{text_content}'")
        
        # Validate required parameters
        if not reference_name or not text_content:
            return jsonify({
                'success': False,
                'error': 'reference_name and text_content are required'
            }), 400
        
        # Find appropriate host using registry
        host_info = get_host_by_model(model)
        
        if not host_info:
            return jsonify({
                'success': False,
                'error': f'No available host found for model: {model}'
            }), 404
        
        print(f"[@route:save_text_reference] Using registered host: {host_info.get('host_name', 'unknown')}")
        
        # Use pre-built URL from host registry
        host_save_url = buildHostUrl(host_info, '/host/verification/av/save-text-reference')
        
        save_payload = {
            'reference_name': reference_name,
            'text_content': text_content,
            'model': model
        }
        
        print(f"[@route:save_text_reference] Sending request to {host_save_url}")
        
        try:
            host_response = requests.post(host_save_url, json=save_payload, timeout=30, verify=False)
            host_result = host_response.json()
            
            if host_result.get('success'):
                reference_path = host_result.get('reference_path', '')
                print(f"[@route:save_text_reference] Host text reference save successful: {reference_path}")
                
                # Convert host URL to nginx-exposed URL using registry-based URL builder
                if host_result.get('reference_url'):
                    host_result['reference_url'] = buildHostUrl(host_info, host_result['reference_url'])
                
                return jsonify(host_result)
            else:
                error_msg = host_result.get('error', 'Host text reference save failed')
                print(f"[@route:save_text_reference] Host text reference save failed: {error_msg}")
                return jsonify(host_result), 500
                
        except requests.exceptions.RequestException as e:
            print(f"[@route:save_text_reference] Failed to connect to host: {e}")
            return jsonify({
                'success': False,
                'error': f'Failed to connect to host for text reference save: {str(e)}'
            }), 500
            
    except Exception as e:
        print(f"[@route:save_text_reference] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Text reference save error: {str(e)}'
        }), 500 
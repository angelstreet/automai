"""
Verification Text Server Routes

This module contains the server-side text verification API endpoints that:
- Forward text auto-detection requests to host
- Handle text reference save operations
- Manage text verification coordination
"""

from flask import Blueprint, request, jsonify
import urllib.parse
import requests
from src.utils.app_utils import get_host_by_model, get_primary_host, build_host_url, build_host_nginx_url

# Create blueprint
verification_text_server_bp = Blueprint('verification_text_server', __name__, url_prefix='/server/verification')

# =====================================================
# SERVER-SIDE TEXT AUTO-DETECTION (FORWARDS TO HOST)
# =====================================================

@verification_text_server_bp.route('/reference/text/auto-detect', methods=['POST'])
def text_auto_detect():
    """Forward text auto-detection request to host for OCR processing."""
    try:
        data = request.get_json()
        source_path = data.get('source_path')
        area = data.get('area')
        model = data.get('model', 'default')
        image_filter = data.get('image_filter', 'none')
        
        print(f"[@route:text_auto_detect] Forwarding text auto-detection to host from {source_path}")
        print(f"[@route:text_auto_detect] Area: {area}, Model: {model}, Filter: {image_filter}")
        
        # Validate required parameters
        if not source_path or not area:
            return jsonify({
                'success': False,
                'error': 'source_path and area are required'
            }), 400
        
        # Find appropriate host using registry
        host_info = get_host_by_model(model) if model != 'default' else get_primary_host()
        
        if not host_info:
            return jsonify({
                'success': False,
                'error': f'No available host found for model: {model}'
            }), 404
        
        # Extract filename from source_path URL
        parsed_url = urllib.parse.urlparse(source_path)
        source_filename = parsed_url.path.split('/')[-1]  # Extract filename
        
        print(f"[@route:text_auto_detect] Using registered host: {host_info.get('host_name', 'unknown')}, filename: {source_filename}")
        
        # Use pre-built URL from host registry
        host_text_url = build_host_url(host_info, '/stream/text-auto-detect')
        
        text_payload = {
            'source_filename': source_filename,
            'area': area,
            'model': model,
            'image_filter': image_filter
        }
        
        print(f"[@route:text_auto_detect] Sending request to {host_text_url} with payload: {text_payload}")
        
        try:
            host_response = requests.post(host_text_url, json=text_payload, timeout=30, verify=False)
            host_result = host_response.json()
            
            if host_result.get('success'):
                detected_text = host_result.get('detected_text')
                confidence = host_result.get('confidence')
                preview_url = host_result.get('preview_url')
                
                print(f"[@route:text_auto_detect] Host text detection successful: '{detected_text}' (confidence: {confidence}%)")
                
                # Convert relative preview URL to full nginx-exposed URL
                if preview_url:
                    full_preview_url = build_host_nginx_url(host_info, preview_url)
                    host_result['preview_url'] = full_preview_url
                
                return jsonify(host_result)
            else:
                error_msg = host_result.get('error', 'Host text detection failed')
                preview_url = host_result.get('preview_url')
                
                print(f"[@route:text_auto_detect] Host text detection failed: {error_msg}")
                
                # Convert preview URL even for failures (user can still see the cropped area)
                if preview_url:
                    full_preview_url = build_host_nginx_url(host_info, preview_url)
                    host_result['preview_url'] = full_preview_url
                
                return jsonify(host_result), 400
                
        except requests.exceptions.RequestException as e:
            print(f"[@route:text_auto_detect] Failed to connect to host: {e}")
            return jsonify({
                'success': False,
                'error': f'Failed to connect to host for text detection: {str(e)}'
            }), 500
            
    except Exception as e:
        print(f"[@route:text_auto_detect] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Text auto-detection error: {str(e)}'
        }), 500

# =====================================================
# SERVER-SIDE TEXT REFERENCE SAVE (FORWARDS TO HOST)
# =====================================================

@verification_text_server_bp.route('/reference/text/save', methods=['POST'])
def save_text_reference():
    """Forward text reference save request to host to save to git repository."""
    try:
        data = request.get_json()
        reference_name = data.get('reference_name')
        model_name = data.get('model_name')
        text = data.get('text')
        font_size = data.get('font_size', 12.0)
        confidence = data.get('confidence', 0.8)
        area = data.get('area')
        
        print(f"[@route:save_text_reference] Forwarding text save request to host: {reference_name} for model: {model_name}")
        print(f"[@route:save_text_reference] Text: '{text}', Font size: {font_size}, Confidence: {confidence}")
        
        # Validate required parameters
        if not reference_name or not model_name or not text:
            return jsonify({
                'success': False,
                'error': 'reference_name, model_name, and text are required'
            }), 400
        
        # Find appropriate host using registry
        host_info = get_host_by_model(model_name) if model_name != 'default' else get_primary_host()
        
        if not host_info:
            return jsonify({
                'success': False,
                'error': f'No available host found for model: {model_name}'
            }), 404
        
        print(f"[@route:save_text_reference] Using registered host: {host_info.get('host_name', 'unknown')}")
        
        # Use pre-built URL from host registry
        host_save_url = build_host_url(host_info, '/stream/save-text-resource')
        
        # Note: Host expects 'name' instead of 'reference_name' and 'model' instead of 'model_name'
        save_payload = {
            'name': reference_name,  # Different parameter name for host
            'model': model_name,     # Different parameter name for host
            'text': text,
            'font_size': font_size,
            'confidence': confidence,
            'area': area
        }
        
        print(f"[@route:save_text_reference] Sending request to {host_save_url} with payload: {save_payload}")
        
        try:
            host_response = requests.post(host_save_url, json=save_payload, timeout=60, verify=False)
            host_result = host_response.json()
            
            if host_result.get('success'):
                public_url = host_result.get('public_url')
                print(f"[@route:save_text_reference] Host text save successful: {public_url}")
                
                # Use pre-built nginx URL from host registry
                full_public_url = build_host_nginx_url(host_info, public_url) if public_url else None
                
                return jsonify({
                    'success': True,
                    'message': f'Text reference saved to git repository: {reference_name}',
                    'public_url': full_public_url,
                    'resource_type': 'text_reference'
                })
            else:
                error_msg = host_result.get('error', 'Host text save failed')
                print(f"[@route:save_text_reference] Host text save failed: {error_msg}")
                return jsonify({
                    'success': False,
                    'error': f'Host text save failed: {error_msg}'
                }), 500
                
        except requests.exceptions.RequestException as e:
            print(f"[@route:save_text_reference] Failed to connect to host: {e}")
            return jsonify({
                'success': False,
                'error': f'Failed to connect to host for text saving: {str(e)}'
            }), 500
            
    except Exception as e:
        print(f"[@route:save_text_reference] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Text reference save error: {str(e)}'
        }), 500 
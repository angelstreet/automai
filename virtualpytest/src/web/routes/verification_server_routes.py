"""
Verification Server Routes

This module contains the server-side verification API endpoints that:
- Forward cropping requests to host
- Handle verification execution coordination
- Manage verification actions and status
"""

from flask import Blueprint, request, jsonify
import urllib.parse
import requests
import os
import json

# Create blueprint
verification_server_bp = Blueprint('verification_server', __name__)

# =====================================================
# VERIFICATION ACTIONS AND REFERENCES
# =====================================================

@verification_server_bp.route('/api/virtualpytest/verification/actions', methods=['GET'])
def get_verification_actions():
    """Get available verification actions organized by category."""
    try:
        # Define verification actions organized by category
        verification_actions = {
            "Image Verification": [
                {
                    "id": "image_appear",
                    "label": "Image Appear",
                    "command": "image_appear",
                    "description": "Wait for an image to appear on screen",
                    "requiresInput": False,
                    "params": {
                        "timeout": 10.0,
                        "threshold": 0.8
                    }
                },
                {
                    "id": "image_disappear", 
                    "label": "Image Disappear",
                    "command": "image_disappear",
                    "description": "Wait for an image to disappear from screen",
                    "requiresInput": False,
                    "params": {
                        "timeout": 10.0,
                        "threshold": 0.8
                    }
                }
            ],
            "Text Verification": [
                {
                    "id": "text_appear",
                    "label": "Text Appear",
                    "command": "text_appear", 
                    "description": "Wait for text to appear on screen",
                    "requiresInput": True,
                    "inputLabel": "Text to find",
                    "inputPlaceholder": "Enter text or regex pattern",
                    "params": {
                        "timeout": 10.0,
                        "confidence": 0.8
                    }
                },
                {
                    "id": "text_disappear",
                    "label": "Text Disappear", 
                    "command": "text_disappear",
                    "description": "Wait for text to disappear from screen",
                    "requiresInput": True,
                    "inputLabel": "Text to find",
                    "inputPlaceholder": "Enter text or regex pattern",
                    "params": {
                        "timeout": 10.0,
                        "confidence": 0.8
                    }
                }
            ],
            "ADB Verification": [
                {
                    "id": "adb_element_appear",
                    "label": "Element Appear",
                    "command": "adb_element_appear",
                    "description": "Wait for UI element to appear",
                    "requiresInput": True,
                    "inputLabel": "Element selector",
                    "inputPlaceholder": "Enter element text, resource-id, or content-desc",
                    "params": {
                        "timeout": 10.0
                    }
                },
                {
                    "id": "adb_element_disappear",
                    "label": "Element Disappear", 
                    "command": "adb_element_disappear",
                    "description": "Wait for UI element to disappear",
                    "requiresInput": True,
                    "inputLabel": "Element selector",
                    "inputPlaceholder": "Enter element text, resource-id, or content-desc",
                    "params": {
                        "timeout": 10.0
                    }
                }
            ]
        }
        
        return jsonify({
            'success': True,
            'verifications': verification_actions
        })
        
    except Exception as e:
        print(f"[@route:get_verification_actions] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to get verification actions: {str(e)}'
        }), 500

@verification_server_bp.route('/api/virtualpytest/reference/list', methods=['GET'])
def list_references():
    """List available reference images and text patterns."""
    try:
        # Try to read from the main resource config file first
        config_path = '/Users/cpeengineering/automai/automai/virtualpytest/src/config/resource/resource.json'
        
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                resource_data = json.load(f)
            
            references = []
            for resource in resource_data.get('resources', []):
                references.append({
                    'name': resource.get('name'),
                    'model': resource.get('model'),
                    'type': resource.get('type', 'reference_image'),
                    'path': resource.get('path'),
                    'full_path': resource.get('full_path'),
                    'area': resource.get('area'),
                    'created_at': resource.get('created_at'),
                    'text': resource.get('text'),  # For text references
                    'font_size': resource.get('font_size'),  # For text references
                    'confidence': resource.get('confidence')  # For text references
                })
            
            return jsonify({
                'success': True,
                'references': references
            })
        else:
            # Return empty list if config file doesn't exist
            return jsonify({
                'success': True,
                'references': []
            })
            
    except Exception as e:
        print(f"[@route:list_references] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to list references: {str(e)}'
        }), 500

# =====================================================
# SERVER-SIDE REFERENCE IMAGE CAPTURE (FORWARDS TO HOST)
# =====================================================

@verification_server_bp.route('/api/virtualpytest/reference/capture', methods=['POST'])
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

@verification_server_bp.route('/api/virtualpytest/reference/process-area', methods=['POST'])
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

@verification_server_bp.route('/api/virtualpytest/reference/save', methods=['POST'])
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
# SERVER-SIDE TEXT REFERENCE SAVE (FORWARDS TO HOST)
# =====================================================

@verification_server_bp.route('/api/virtualpytest/reference/text/save', methods=['POST'])
def save_text_reference():
    """Forward text reference save request to host to save text resource to git repository."""
    try:
        data = request.get_json()
        reference_name = data.get('name')  # Text save uses 'name' instead of 'reference_name'
        model = data.get('model')
        area = data.get('area')
        text = data.get('text')
        font_size = data.get('fontSize')
        confidence = data.get('confidence')
        
        print(f"[@route:save_text_reference] Forwarding text save request to host: {reference_name} for model: {model}")
        print(f"[@route:save_text_reference] Text: '{text}', Font size: {font_size}, Confidence: {confidence}")
        
        # Validate required parameters
        if not reference_name or not model or not area or not text:
            return jsonify({
                'success': False,
                'error': 'Missing required parameters: name, model, area, and text are all required'
            }), 400
        
        # Hardcode IPs for testing
        host_ip = "77.56.53.130"  # Host IP
        host_port = "5119"        # Host internal port
        
        print(f"[@route:save_text_reference] Using hardcoded host: {host_ip}:{host_port}")
        
        # Forward text save request to host
        host_text_save_url = f'http://{host_ip}:{host_port}/stream/save-text-resource'
        
        text_save_payload = {
            'reference_name': reference_name,
            'model': model,
            'area': area,
            'text': text,
            'font_size': font_size,
            'confidence': confidence
        }
        
        print(f"[@route:save_text_reference] Sending request to {host_text_save_url} with payload: {text_save_payload}")
        
        try:
            host_response = requests.post(host_text_save_url, json=text_save_payload, timeout=60, verify=False)
            host_result = host_response.json()
            
            if host_result.get('success'):
                print(f"[@route:save_text_reference] Host text save successful")
                
                return jsonify({
                    'success': True,
                    'message': f'Text reference "{reference_name}" saved successfully to git repository'
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

# =====================================================
# SERVER-SIDE VERIFICATION EXECUTION (FORWARDS TO HOST)
# =====================================================

@verification_server_bp.route('/api/virtualpytest/verification/execute', methods=['POST'])
def execute_verification():
    """Forward single verification execution to host and return results with nginx URLs."""
    try:
        data = request.get_json()
        verification = data.get('verification')
        model = data.get('model', 'default')
        verification_index = data.get('verification_index', 0)
        source_path = data.get('source_path')  # Optional source image path
        
        print(f"[@route:execute_verification] Forwarding verification execution to host")
        print(f"[@route:execute_verification] Verification: {verification.get('command') if verification else 'None'}")
        print(f"[@route:execute_verification] Model: {model}")
        
        # Validate required parameters
        if not verification:
            return jsonify({
                'success': False,
                'error': 'verification is required'
            }), 400
        
        # Hardcode IPs for testing
        host_ip = "77.56.53.130"  # Host IP
        host_port = "5119"        # Host internal port
        
        # Extract filename from source_path if provided
        source_filename = None
        if source_path:
            parsed_url = urllib.parse.urlparse(source_path)
            source_filename = parsed_url.path.split('/')[-1]  # Extract filename
            print(f"[@route:execute_verification] Using source filename: {source_filename}")
        
        # Forward verification execution to host
        host_execute_url = f'http://{host_ip}:{host_port}/stream/execute-verification'
        
        execute_payload = {
            'verification': verification,
            'model': model,
            'verification_index': verification_index,
            'source_filename': source_filename
        }
        
        print(f"[@route:execute_verification] Sending request to {host_execute_url}")
        
        try:
            host_response = requests.post(host_execute_url, json=execute_payload, timeout=60, verify=False)
            host_result = host_response.json()
            
            if host_result.get('success') is not None:  # Handle both success and failure cases
                # Convert host paths to nginx-exposed URLs
                if 'source_image_url' in host_result:
                    host_result['source_image_url'] = f'https://77.56.53.130:444{host_result["source_image_url"]}'
                if 'reference_image_url' in host_result:
                    host_result['reference_image_url'] = f'https://77.56.53.130:444{host_result["reference_image_url"]}'
                if 'result_overlay_url' in host_result:
                    host_result['result_overlay_url'] = f'https://77.56.53.130:444{host_result["result_overlay_url"]}'
                
                print(f"[@route:execute_verification] Host execution completed: {host_result.get('success')}")
                return jsonify(host_result)
            else:
                error_msg = host_result.get('error', 'Host verification execution failed')
                print(f"[@route:execute_verification] Host execution failed: {error_msg}")
                return jsonify({
                    'success': False,
                    'error': f'Host execution failed: {error_msg}'
                }), 500
                
        except requests.exceptions.RequestException as e:
            print(f"[@route:execute_verification] Failed to connect to host: {e}")
            return jsonify({
                'success': False,
                'error': f'Failed to connect to host for verification execution: {str(e)}'
            }), 500
            
    except Exception as e:
        print(f"[@route:execute_verification] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Verification execution error: {str(e)}'
        }), 500

@verification_server_bp.route('/api/virtualpytest/verification/execute-batch', methods=['POST'])
def execute_batch_verification():
    """Forward batch verification execution to host and return consolidated results."""
    try:
        data = request.get_json()
        verifications = data.get('verifications', [])
        model = data.get('model', 'default')
        node_id = data.get('node_id', 'unknown')
        tree_id = data.get('tree_id', 'unknown')
        capture_filename = data.get('capture_filename')  # NEW: Optional specific capture
        
        print(f"[@route:execute_batch_verification] === BATCH VERIFICATION DEBUG ===")
        print(f"[@route:execute_batch_verification] Executing {len(verifications)} verifications for node: {node_id}")
        print(f"[@route:execute_batch_verification] Model: {model}")
        print(f"[@route:execute_batch_verification] Capture filename: {capture_filename}")
        
        # Log each verification with area details
        for i, verification in enumerate(verifications):
            print(f"[@route:execute_batch_verification] Verification {i}:")
            print(f"  ID: {verification.get('id')}")
            print(f"  Label: {verification.get('label')}")
            print(f"  Command: {verification.get('command')}")
            print(f"  Controller type: {verification.get('controller_type')}")
            print(f"  Input value: {verification.get('inputValue')}")
            
            params = verification.get('params', {})
            print(f"  Params: {params}")
            
            if 'area' in params:
                area = params['area']
                print(f"  Area details: x={area.get('x')}, y={area.get('y')}, width={area.get('width')}, height={area.get('height')}")
            else:
                print(f"  No area specified")
        
        # Validate required parameters
        if not verifications:
            return jsonify({
                'success': False,
                'error': 'verifications list is required'
            }), 400
        
        # Hardcode IPs for testing
        host_ip = "77.56.53.130"  # Host IP
        host_port = "5119"        # Host internal port
        
        # Forward batch execution request to host
        host_batch_url = f'http://{host_ip}:{host_port}/stream/execute-verification-batch'
        
        batch_payload = {
            'verifications': verifications,
            'model': model,
            'node_id': node_id,
            'capture_filename': capture_filename  # NEW: Forward specific capture filename
        }
        
        print(f"[@route:execute_batch_verification] Sending batch request to {host_batch_url}")
        print(f"[@route:execute_batch_verification] Payload summary: {len(verifications)} verifications, model: {model}")
        
        try:
            host_response = requests.post(host_batch_url, json=batch_payload, timeout=60, verify=False)
            host_result = host_response.json()
            
            if host_result.get('success') is not None:  # Host responded with valid result
                print(f"[@route:execute_batch_verification] Host batch execution completed: {host_result.get('passed_count', 0)}/{host_result.get('total_count', 0)} passed")
                
                # Convert host URLs to nginx-exposed URLs for each result
                results = host_result.get('results', [])
                print(f"[@route:execute_batch_verification] Converting {len(results)} result URLs")
                
                for i, result in enumerate(results):
                    print(f"[@route:execute_batch_verification] Result {i} before URL conversion:")
                    print(f"  Success: {result.get('success')}")
                    print(f"  Message: {result.get('message')}")
                    print(f"  Source URL: {result.get('sourceImageUrl')}")
                    print(f"  Reference URL: {result.get('referenceImageUrl')}")
                    print(f"  Overlay URL: {result.get('resultOverlayUrl')}")
                    
                    if 'sourceImageUrl' in result:
                        result['sourceImageUrl'] = f'https://77.56.53.130:444{result["sourceImageUrl"]}'
                    if 'referenceImageUrl' in result:
                        result['referenceImageUrl'] = f'https://77.56.53.130:444{result["referenceImageUrl"]}'
                    if 'resultOverlayUrl' in result:
                        result['resultOverlayUrl'] = f'https://77.56.53.130:444{result["resultOverlayUrl"]}'
                    
                    print(f"[@route:execute_batch_verification] Result {i} after URL conversion:")
                    print(f"  Source URL: {result.get('sourceImageUrl')}")
                    print(f"  Reference URL: {result.get('referenceImageUrl')}")
                    print(f"  Overlay URL: {result.get('resultOverlayUrl')}")
                
                # Return host result with additional server metadata
                return jsonify({
                    'success': host_result.get('success'),
                    'message': host_result.get('message'),
                    'passed_count': host_result.get('passed_count', 0),
                    'total_count': host_result.get('total_count', 0),
                    'results': results,  # Use the URL-converted results
                    'node_id': node_id,
                    'tree_id': tree_id,
                    'model': model,
                    'capture_filename': host_result.get('capture_filename'),  # Return actual filename used by host
                    'host_response': True
                })
            else:
                error_msg = host_result.get('error', 'Host batch execution failed')
                print(f"[@route:execute_batch_verification] Host batch execution failed: {error_msg}")
                return jsonify({
                    'success': False,
                    'error': f'Host batch execution failed: {error_msg}',
                    'node_id': node_id,
                    'tree_id': tree_id
                }), 500
                
        except requests.exceptions.RequestException as e:
            print(f"[@route:execute_batch_verification] Failed to connect to host: {e}")
            return jsonify({
                'success': False,
                'error': f'Failed to connect to host for batch execution: {str(e)}',
                'node_id': node_id,
                'tree_id': tree_id
            }), 500
            
    except Exception as e:
        print(f"[@route:execute_batch_verification] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Batch verification error: {str(e)}'
        }), 500

# =====================================================
# SERVER-SIDE REFERENCE STREAM AVAILABILITY ENDPOINT
# =====================================================

@verification_server_bp.route('/api/virtualpytest/reference/ensure-stream-availability', methods=['POST'])
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

# =====================================================
# SERVER-SIDE TEXT AUTO-DETECTION (FORWARDS TO HOST)
# =====================================================

@verification_server_bp.route('/api/virtualpytest/reference/text/auto-detect', methods=['POST'])
def text_auto_detect():
    """Forward text auto-detection request to host instead of processing locally."""
    try:
        data = request.get_json()
        area = data.get('area')
        source_path = data.get('source_path')
        model = data.get('model', 'default')
        image_filter = data.get('image_filter', 'none')
        
        print(f"[@route:text_auto_detect] Forwarding text auto-detection request to host")
        print(f"[@route:text_auto_detect] Source path: {source_path}, Model: {model}, Filter: {image_filter}")
        
        # Validate required parameters
        if not area or not source_path:
            return jsonify({
                'success': False,
                'error': 'Missing required parameters: area and source_path are required'
            }), 400
        
        # Hardcode IPs for testing
        host_ip = "77.56.53.130"  # Host IP
        host_port = "5119"        # Host internal port
        
        # Extract filename from source_path URL
        parsed_url = urllib.parse.urlparse(source_path)
        source_filename = parsed_url.path.split('/')[-1]  # Extract filename
        
        print(f"[@route:text_auto_detect] Using hardcoded host: {host_ip}:{host_port}, filename: {source_filename}")
        
        # Forward text auto-detection request to host
        host_text_detect_url = f'http://{host_ip}:{host_port}/stream/text-auto-detect'
        
        text_detect_payload = {
            'source_filename': source_filename,
            'area': area,
            'model': model,
            'image_filter': image_filter
        }
        
        print(f"[@route:text_auto_detect] Sending request to {host_text_detect_url} with payload: {text_detect_payload}")
        
        try:
            host_response = requests.post(host_text_detect_url, json=text_detect_payload, timeout=30, verify=False)
            host_result = host_response.json()
            
            if host_result.get('success'):
                preview_url = host_result.get('preview_url')
                detected_text = host_result.get('detected_text', '')
                print(f"[@route:text_auto_detect] Host text auto-detection successful: '{detected_text}'")
                
                # Convert relative path to full nginx-exposed URL
                full_preview_url = f'https://77.56.53.130:444{preview_url}' if preview_url else None
                
                return jsonify({
                    'success': True,
                    'detected_text': detected_text,
                    'confidence': host_result.get('confidence', 0.0),
                    'font_size': host_result.get('font_size', 12.0),
                    'detected_language': host_result.get('detected_language', 'eng'),
                    'detected_language_name': host_result.get('detected_language_name', 'English'),
                    'language_confidence': host_result.get('language_confidence', 0.8),
                    'preview_url': full_preview_url,
                    'message': host_result.get('message', 'Text auto-detection completed')
                })
            else:
                error_msg = host_result.get('error', 'Host text auto-detection failed')
                print(f"[@route:text_auto_detect] Host text auto-detection failed: {error_msg}")
                
                # Still return preview URL if available (even on OCR failure)
                preview_url = host_result.get('preview_url')
                full_preview_url = f'https://77.56.53.130:444{preview_url}' if preview_url else None
                
                return jsonify({
                    'success': False,
                    'error': f'Host text auto-detection failed: {error_msg}',
                    'preview_url': full_preview_url
                }), 500
                
        except requests.exceptions.RequestException as e:
            print(f"[@route:text_auto_detect] Failed to connect to host: {e}")
            return jsonify({
                'success': False,
                'error': f'Failed to connect to host for text auto-detection: {str(e)}'
            }), 500
            
    except Exception as e:
        print(f"[@route:text_auto_detect] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Text auto-detection error: {str(e)}'
        }), 500 
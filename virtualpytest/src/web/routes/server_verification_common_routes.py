"""
Verification Common Routes

This module contains ALL server-side verification endpoints that:
- Handle single verification execution for all types (image, text, adb)
- Coordinate batch verification by dispatching to individual host endpoints
- Manage reference lists and database operations
- Provide shared verification utilities
"""

from flask import Blueprint, request, jsonify
from src.web.utils.routeUtils import proxy_to_host, get_host_from_request

# Create blueprint
server_verification_common_bp = Blueprint('server_verification_common', __name__, url_prefix='/server/verification')

# =====================================================
# SINGLE VERIFICATION EXECUTION ENDPOINTS (PROXY TO HOST)
# =====================================================

@server_verification_common_bp.route('/image/execute', methods=['POST'])
def execute_image_verification():
    """Proxy single image verification to host"""
    try:
        print("[@route:server_verification_common:execute_image_verification] Proxying image verification request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host image verification endpoint
        response_data, status_code = proxy_to_host('/host/verification/image/execute', 'POST', request_data, timeout=60)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@server_verification_common_bp.route('/text/execute', methods=['POST'])
def execute_text_verification():
    """Proxy single text verification to host"""
    try:
        print("[@route:server_verification_common:execute_text_verification] Proxying text verification request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host text verification endpoint
        response_data, status_code = proxy_to_host('/host/verification/text/execute', 'POST', request_data, timeout=60)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@server_verification_common_bp.route('/adb/execute', methods=['POST'])
def execute_adb_verification():
    """Proxy single ADB verification to host"""
    try:
        print("[@route:server_verification_common:execute_adb_verification] Proxying ADB verification request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host ADB verification endpoint
        response_data, status_code = proxy_to_host('/host/verification/adb/execute', 'POST', request_data, timeout=60)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# =====================================================
# BATCH VERIFICATION COORDINATION (SERVER-SIDE LOGIC)
# =====================================================

@server_verification_common_bp.route('/batch/execute', methods=['POST'])
def execute_batch_verification():
    """Execute batch verification by dispatching individual requests to host endpoints"""
    try:
        print("[@route:server_verification_common:execute_batch_verification] Starting batch verification coordination")
        
        # Get request data
        data = request.get_json() or {}
        verifications = data.get('verifications', [])
        source_filename = data.get('source_filename')
        model = data.get('model', 'default')
        
        print(f"[@route:server_verification_common:execute_batch_verification] Processing {len(verifications)} verifications")
        print(f"[@route:server_verification_common:execute_batch_verification] Source: {source_filename}, Model: {model}")
        
        # Validate required parameters
        if not verifications:
            return jsonify({
                'success': False,
                'error': 'verifications are required'
            }), 400
        
        # Handle source_filename scenarios:
        # Scenario 1: Frontend provides source_filename (should be complete path)
        # Scenario 2: No source_filename provided - use most recent capture from /var/www/html/stream/captures
        if not source_filename:
            print("[@route:server_verification_common:execute_batch_verification] No source_filename provided, finding most recent capture")
            
            # Find most recent capture in /var/www/html/stream/captures
            import os
            import glob
            
            captures_dir = '/var/www/html/stream/captures'
            if os.path.exists(captures_dir):
                # Get all image files in captures directory
                image_patterns = ['*.jpg', '*.jpeg', '*.png', '*.bmp', '*.gif']
                all_captures = []
                
                for pattern in image_patterns:
                    all_captures.extend(glob.glob(os.path.join(captures_dir, pattern)))
                
                if all_captures:
                    # Sort by modification time (most recent first)
                    all_captures.sort(key=os.path.getmtime, reverse=True)
                    most_recent_capture = os.path.basename(all_captures[0])
                    source_filename = most_recent_capture
                    print(f"[@route:server_verification_common:execute_batch_verification] Using most recent capture: {source_filename}")
                else:
                    return jsonify({
                        'success': False,
                        'error': 'No source_filename provided and no captures found in /var/www/html/stream/captures'
                    }), 400
            else:
                return jsonify({
                    'success': False,
                    'error': 'No source_filename provided and captures directory does not exist'
                }), 400
        
        results = []
        passed_count = 0
        
        for i, verification in enumerate(verifications):
            verification_type = verification.get('type', 'unknown')
            
            print(f"[@route:server_verification_common:execute_batch_verification] Processing verification {i+1}/{len(verifications)}: {verification_type}")
            
            # Prepare individual request data
            individual_request = {
                'verification': verification,
                'source_filename': source_filename,
                'model': model
            }
            
            # Dispatch to appropriate host endpoint based on verification type
            if verification_type == 'image':
                result, status = proxy_to_host('/host/verification/image/execute', 'POST', individual_request, timeout=60)
            elif verification_type == 'text':
                result, status = proxy_to_host('/host/verification/text/execute', 'POST', individual_request, timeout=60)
            elif verification_type == 'adb':
                result, status = proxy_to_host('/host/verification/adb/execute', 'POST', individual_request, timeout=60)
            else:
                result = {
                    'success': False,
                    'error': f'Unknown verification type: {verification_type}',
                    'verification_type': verification_type
                }
                status = 400
            
            # Handle proxy errors
            if status != 200 and isinstance(result, dict):
                result['verification_type'] = verification_type
            elif status != 200:
                result = {
                    'success': False,
                    'error': f'Host request failed with status {status}',
                    'verification_type': verification_type
                }
            
            results.append(result)
            
            # Count successful verifications
            if result.get('success'):
                passed_count += 1
        
        # Calculate overall batch success
        overall_success = passed_count == len(verifications)
        
        print(f"[@route:server_verification_common:execute_batch_verification] Batch completed: {passed_count}/{len(verifications)} passed")
        
        return jsonify({
            'success': overall_success,
            'total_count': len(verifications),
            'passed_count': passed_count,
            'failed_count': len(verifications) - passed_count,
            'results': results
        })
        
    except Exception as e:
        print(f"[@route:server_verification_common:execute_batch_verification] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Batch verification coordination error: {str(e)}'
        }), 500

@server_verification_common_bp.route('/batch/status', methods=['GET'])
def get_batch_status():
    """Get batch verification status from host"""
    try:
        print("[@route:server_verification_common:get_batch_status] Proxying batch status request")
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/verification/getStatus', 'GET')
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# =====================================================
# IMAGE VERIFICATION SPECIFIC ENDPOINTS
# =====================================================

@server_verification_common_bp.route('/image/crop-image', methods=['POST'])
def crop_image():
    """Proxy crop image request to host for reference image cropping"""
    try:
        print("[@route:server_verification_common:crop_image] Proxying crop image request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host verification image crop endpoint
        response_data, status_code = proxy_to_host('/host/verification/image/crop-image', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@server_verification_common_bp.route('/image/process-image', methods=['POST'])
def process_image():
    """Proxy process image request to host for reference image processing"""
    try:
        print("[@route:server_verification_common:process_image] Proxying process image request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host verification image process endpoint
        response_data, status_code = proxy_to_host('/host/verification/image/process-image', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@server_verification_common_bp.route('/image/save-image-reference', methods=['POST'])
def save_image_reference():
    """Save image reference directly on server (database operation)"""
    try:
        print("[@route:server_verification_common:save_image_reference] Saving image reference on server")
        
        # Get team ID from request headers
        from src.utils.app_utils import get_team_id
        team_id = get_team_id()
        
        # Get request data
        data = request.get_json() or {}
        
        # Extract required fields
        name = data.get('reference_name') or data.get('name')
        model = data.get('model')
        r2_url = data.get('r2_url')  # The image should already be uploaded to R2
        reference_type = data.get('reference_type', 'reference_image')
        
        # Ensure we only use valid database types
        if reference_type not in ['screenshot', 'reference_image', 'reference_text']:
            reference_type = 'reference_image'  # Default to reference_image for safety
        area = data.get('area', {})
        
        if not all([name, model, r2_url]):
            return jsonify({
                'success': False,
                'error': 'Missing required fields: name, model, r2_url'
            }), 400
        
        print(f'[@route:server_verification_common:save_image_reference] Saving image: {name} for model: {model}')
        
        # Save to database
        from src.lib.supabase.images_db import save_image
        
        # Extract R2 path from URL for the database
        r2_path = r2_url.split('/')[-1] if r2_url else ''
        
        result = save_image(
            name=name,
            device_model=model,
            type=reference_type,
            r2_path=r2_path,
            r2_url=r2_url,
            team_id=team_id,
            area=area
        )
        
        if result.get('success'):
            return jsonify({
                'success': True,
                'message': 'Image reference saved successfully',
                'image': result.get('image', {
                    'name': name,
                    'model': model,
                    'team_id': team_id,
                    'type': reference_type,
                    'url': r2_url
                })
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Failed to save image reference')
            }), 500
        
    except Exception as e:
        print(f"[@route:server_verification_common:save_image_reference] ERROR: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# =====================================================
# TEXT VERIFICATION SPECIFIC ENDPOINTS
# =====================================================

@server_verification_common_bp.route('/text/auto-detect-text', methods=['POST'])
def auto_detect_text():
    """Proxy text auto-detection request to host"""
    try:
        print("[@route:server_verification_common:auto_detect_text] Proxying OCR detection request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/verification/text/auto-detect-text', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@server_verification_common_bp.route('/text/save-text-reference', methods=['POST'])
def save_text_reference():
    """Save text reference to database - Two-step process like image references"""
    try:
        print("[@route:server_verification_common:save_text_reference] Processing text reference save request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Step 1: Get text data from host (fast, no git operations)
        print("[@route:server_verification_common:save_text_reference] Step 1: Getting text data from host")
        host_response_data, host_status_code = proxy_to_host('/host/verification/text/save-text-reference', 'POST', request_data)
        
        if host_status_code != 200 or not host_response_data.get('success'):
            print(f"[@route:server_verification_common:save_text_reference] Host step failed: {host_response_data}")
            return jsonify(host_response_data), host_status_code
        
        # Step 2: Save text reference to database
        print("[@route:server_verification_common:save_text_reference] Step 2: Saving text reference to database")
        
        from src.lib.supabase.images_db import save_image
        from src.utils.app_utils import get_team_id
        
        # Get team ID
        team_id = get_team_id()
        if not team_id:
            return jsonify({
                'success': False,
                'error': 'Team ID not found in request'
            }), 400
        
        # Extract data from host response
        reference_name = host_response_data.get('reference_name')
        model = host_response_data.get('model')
        area = host_response_data.get('area')
        text_data = host_response_data.get('text_data', {})
        
        print(f"[@route:server_verification_common:save_text_reference] Saving to database: {reference_name} for model: {model}")
        
        # Save text reference to database using images table with type='reference_text'
        # For text references, we store text data in area field and use a placeholder R2 path
        extended_area = {
            **(area or {}),
            'text': text_data.get('text', ''),
            'font_size': text_data.get('font_size', 12.0),
            'confidence': text_data.get('confidence', 0.8)
        }
        
        db_result = save_image(
            name=reference_name,
            device_model=model,
            type='reference_text',  # Use reference_text type for text references
            r2_path=f'text-references/{model}/{reference_name}',  # Placeholder path for consistency
            r2_url='',  # No R2 URL needed for text references
            team_id=team_id,
            area=extended_area  # Store text data in area field
        )
        
        if db_result['success']:
            print(f"[@route:server_verification_common:save_text_reference] Successfully saved text reference to database")
            return jsonify({
                'success': True,
                'message': f'Text reference saved: {reference_name}',
                'reference_name': reference_name,
                'model': model,
                'text': text_data.get('text', ''),
                'image_id': db_result.get('image_id')
            })
        else:
            print(f"[@route:server_verification_common:save_text_reference] Database save failed: {db_result.get('error')}")
            return jsonify({
                'success': False,
                'error': f"Database save failed: {db_result.get('error')}"
            }), 500
        
    except Exception as e:
        print(f"[@route:server_verification_common:save_text_reference] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# =====================================================
# ADB VERIFICATION SPECIFIC ENDPOINTS
# =====================================================

@server_verification_common_bp.route('/adb/waitForElementToAppear', methods=['POST'])
def wait_for_element_to_appear():
    """Proxy ADB waitForElementToAppear request to host"""
    try:
        print("[@route:server_verification_common:wait_for_element_to_appear] Proxying ADB waitForElementToAppear request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/verification/adb/waitForElementToAppear', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@server_verification_common_bp.route('/adb/waitForElementToDisappear', methods=['POST'])
def wait_for_element_to_disappear():
    """Proxy ADB waitForElementToDisappear request to host"""
    try:
        print("[@route:server_verification_common:wait_for_element_to_disappear] Proxying ADB waitForElementToDisappear request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/verification/adb/waitForElementToDisappear', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# =====================================================
# DATABASE OPERATIONS (SERVER-SIDE ONLY)
# =====================================================

@server_verification_common_bp.route('/image/get-references', methods=['POST'])
def get_image_references():
    """Get image references from database"""
    try:
        print("[@route:server_verification_common:get_image_references] Getting image references from database")
        
        # Get host info for model filtering
        host_info, error = get_host_from_request()
        if not host_info:
            return jsonify({
                'success': False,
                'error': error or 'Host information required'
            }), 400
        
        # Get device model with fallback
        device_model = host_info.get('device_model', 'default')
        print(f"[@route:server_verification_common:get_image_references] Using device model: {device_model}")
        
        # Get references from database
        from src.lib.supabase.images_db import get_images
        from src.utils.app_utils import DEFAULT_TEAM_ID
        
        # Get image references for this device model
        result = get_images(
            team_id=DEFAULT_TEAM_ID,
            device_model=device_model,
            image_type='reference_image'
        )
        
        if result['success']:
            images = result['images']
            print(f"[@route:server_verification_common:get_image_references] Found {len(images)} image references from database")
            
            return jsonify({
                'success': True,
                'images': images,
                'count': len(images),
                'device_model': device_model
            })
        else:
            print(f"[@route:server_verification_common:get_image_references] Database query failed: {result.get('error')}")
            return jsonify({
                'success': False,
                'error': result.get('error', 'Database query failed'),
                'device_model': device_model
            })
            
    except Exception as e:
        print(f"[@route:server_verification_common:get_image_references] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@server_verification_common_bp.route('/text/get-references', methods=['POST'])
def get_text_references():
    """Get text references from database"""
    try:
        print("[@route:server_verification_common:get_text_references] Getting text references from database")
        
        # Get host info for model filtering
        host_info, error = get_host_from_request()
        if not host_info:
            return jsonify({
                'success': False,
                'error': error or 'Host information required'
            }), 400
        
        # Get device model with fallback
        device_model = host_info.get('device_model', 'default')
        print(f"[@route:server_verification_common:get_text_references] Using device model: {device_model}")
        
        # Get references from database
        from src.lib.supabase.images_db import get_images
        from src.utils.app_utils import DEFAULT_TEAM_ID
        
        # Get text references for this device model
        result = get_images(
            team_id=DEFAULT_TEAM_ID,
            device_model=device_model,
            image_type='reference_text'
        )
        
        if result['success']:
            images = result['images']
            print(f"[@route:server_verification_common:get_text_references] Found {len(images)} text references from database")
            
            return jsonify({
                'success': True,
                'images': images,
                'count': len(images),
                'device_model': device_model
            })
        else:
            print(f"[@route:server_verification_common:get_text_references] Database query failed: {result.get('error')}")
            return jsonify({
                'success': False,
                'error': result.get('error', 'Database query failed'),
                'device_model': device_model
            })
        
    except Exception as e:
        print(f"[@route:server_verification_common:get_text_references] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@server_verification_common_bp.route('/getAllReferences', methods=['GET', 'POST'])
def get_all_references():
    """Get all references from database - Legacy endpoint"""
    try:
        print("[@route:server_verification_common:get_all_references] Getting references from database")
        
        # Get host info for model filtering
        host_info, error = get_host_from_request()
        if not host_info:
            return jsonify({
                'success': False,
                'error': error or 'Host information required'
            }), 400
        
        # Get device model with fallback
        device_model = host_info.get('device_model', 'default')
        print(f"[@route:server_verification_common:get_all_references] Using device model: {device_model}")
        
        # Get references from database
        from src.lib.supabase.images_db import get_images
        from src.utils.app_utils import DEFAULT_TEAM_ID
        
        # Get all images for this device model
        result = get_images(
            team_id=DEFAULT_TEAM_ID,
            device_model=device_model
        )
        
        if result['success']:
            images = result['images']
            print(f"[@route:server_verification_common:get_all_references] Found {len(images)} images from database")
            
            return jsonify({
                'success': True,
                'images': images,
                'count': len(images),
                'device_model': device_model
            })
        else:
            print(f"[@route:server_verification_common:get_all_references] Database query failed: {result.get('error')}")
            return jsonify({
                'success': False,
                'error': result.get('error', 'Database query failed'),
                'device_model': device_model
            })
        
    except Exception as e:
        print(f"[@route:server_verification_common:get_all_references] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# =====================================================
# LEGACY ENDPOINTS (FOR BACKWARD COMPATIBILITY)
# =====================================================

@server_verification_common_bp.route('/getAllVerifications', methods=['GET', 'POST'])
def get_verification_types():
    """Get available verification types from host's stored verification data."""
    try:
        # For now, return error indicating this route should not be used
        # Verification types should be retrieved from host's stored data during registration
        return jsonify({
            'success': False,
            'error': 'This route is deprecated. Verification types should be retrieved from host registration data.',
            'message': 'Use host.available_verification_types from the host object instead'
        }), 400
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error getting verification types: {str(e)}'
        }), 500

@server_verification_common_bp.route('/getStatus', methods=['GET'])
def verification_status():
    """Proxy verification status request to selected host"""
    try:
        print("[@route:server_verification_common:verification_status] Proxying verification status request")
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/verification/getStatus', 'GET')
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
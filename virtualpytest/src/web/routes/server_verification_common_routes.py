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
def verification_image_execute():
    """Proxy single image verification to host"""
    try:
        print("[@route:server_verification_common:verification_image_execute] Proxying image verification request")
        
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
def verification_text_execute():
    """Proxy single text verification to host"""
    try:
        print("[@route:server_verification_common:verification_text_execute] Proxying text verification request")
        
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
def verification_adb_execute():
    """Proxy single ADB verification to host"""
    try:
        print("[@route:server_verification_common:verification_adb_execute] Proxying ADB verification request")
        
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

@server_verification_common_bp.route('/appium/execute', methods=['POST'])
def verification_appium_execute():
    """Proxy single Appium verification to host"""
    try:
        print("[@route:server_verification_common:verification_appium_execute] Proxying Appium verification request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host Appium verification endpoint
        response_data, status_code = proxy_to_host('/host/verification/appium/execute', 'POST', request_data, timeout=60)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@server_verification_common_bp.route('/audio/execute', methods=['POST'])
def verification_audio_execute():
    """Proxy single audio verification to host"""
    try:
        print("[@route:server_verification_common:verification_audio_execute] Proxying audio verification request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host audio verification endpoint
        response_data, status_code = proxy_to_host('/host/verification/audio/execute', 'POST', request_data, timeout=60)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@server_verification_common_bp.route('/video/execute', methods=['POST'])
def verification_video_execute():
    """Proxy single video verification to host"""
    try:
        print("[@route:server_verification_common:verification_video_execute] Proxying video verification request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host video verification endpoint
        response_data, status_code = proxy_to_host('/host/verification/video/execute', 'POST', request_data, timeout=60)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# =====================================================
# BATCH VERIFICATION COORDINATION (SERVER-SIDE LOGIC)
# =====================================================

@server_verification_common_bp.route('/executeBatch', methods=['POST'])
def verification_execute_batch():
    """Execute batch verification by dispatching individual requests to host endpoints (NEW NAMING CONVENTION)"""
    try:
        print("[@route:server_verification_common:verification_execute_batch] Starting batch verification coordination")
        
        # Get request data
        data = request.get_json() or {}
        verifications = data.get('verifications', [])
        image_source_url = data.get('image_source_url')
        host = data.get('host', {})
        
        # Extract model from host device (required)
        device_model = data.get('model') or host.get('device_model')
        
        if not device_model:
            return jsonify({
                'success': False,
                'error': 'device_model is required but not found in host object'
            }), 400
        
        print(f"[@route:server_verification_common:verification_execute_batch] Processing {len(verifications)} verifications")
        print(f"[@route:server_verification_common:verification_execute_batch] Source: {image_source_url}, Model: {device_model}")
        
        # Validate required parameters
        if not verifications:
            return jsonify({
                'success': False,
                'error': 'verifications are required'
            }), 400
        
        # Note: image_source_url is optional - controllers will take screenshots automatically when needed
        # ADB verifications don't need screenshots, image/text verifications will capture if no source provided
        
        results = []
        passed_count = 0
        
        for i, verification in enumerate(verifications):
            verification_type = verification.get('verification_type', 'text')
            
            print(f"[@route:server_verification_common:verification_execute_batch] Processing verification {i+1}/{len(verifications)}: {verification_type}")
            
            # Prepare individual request data
            individual_request = {
                'verification': verification,
                'image_source_url': image_source_url,
                'model': device_model
            }
            
            # Dispatch to appropriate host endpoint based on verification type
            if verification_type == 'image':
                result, status = proxy_to_host('/host/verification/image/execute', 'POST', individual_request, timeout=60)
            elif verification_type == 'text':
                result, status = proxy_to_host('/host/verification/text/execute', 'POST', individual_request, timeout=60)
            elif verification_type == 'adb':
                result, status = proxy_to_host('/host/verification/adb/execute', 'POST', individual_request, timeout=60)
            elif verification_type == 'appium':
                result, status = proxy_to_host('/host/verification/appium/execute', 'POST', individual_request, timeout=60)
            elif verification_type == 'audio':
                result, status = proxy_to_host('/host/verification/audio/execute', 'POST', individual_request, timeout=60)
            elif verification_type == 'video':
                result, status = proxy_to_host('/host/verification/video/execute', 'POST', individual_request, timeout=60)
            else:
                result = {
                    'success': False,
                    'error': f'Unknown verification type: {verification_type}. Supported types: image, text, adb, appium, audio, video',
                    'verification_type': verification_type
                }
                status = 400
            
            # Handle proxy errors and flatten verification results
            if status != 200 and isinstance(result, dict):
                result['verification_type'] = verification_type
                flattened_result = result
            elif status != 200:
                flattened_result = {
                    'success': False,
                    'error': f'Host request failed with status {status}',
                    'verification_type': verification_type
                }
            else:
                # All verification controllers return flat structures
                # Use the result directly without looking for a nested verification_result
                verification_result = result
                
                flattened_result = {
                    'success': verification_result.get('success', False),
                    'message': verification_result.get('message'),
                    'error': verification_result.get('error'),
                    'threshold': verification_result.get('threshold') or verification_result.get('confidence') or verification_result.get('userThreshold', 0.8),
                    'resultType': 'PASS' if verification_result.get('success', False) else 'FAIL',
                    'sourceImageUrl': verification_result.get('sourceUrl'),
                    'referenceImageUrl': verification_result.get('referenceUrl'),
                    'extractedText': verification_result.get('extractedText', ''),
                    'searchedText': verification_result.get('searchedText', ''),
                    'imageFilter': verification_result.get('imageFilter', 'none'),
                    'detectedLanguage': verification_result.get('detected_language'),
                    'languageConfidence': verification_result.get('language_confidence'),
                    # ADB-specific fields
                    'search_term': verification_result.get('search_term'),
                    'wait_time': verification_result.get('wait_time'),
                    'total_matches': verification_result.get('total_matches'),
                    'matches': verification_result.get('matches'),
                    # Appium-specific fields
                    'platform': verification_result.get('platform'),
                    # Audio/Video-specific fields  
                    'motion_threshold': verification_result.get('motion_threshold'),
                    'duration': verification_result.get('duration'),
                    'frequency': verification_result.get('frequency'),
                    'audio_level': verification_result.get('audio_level'),
                    # General fields
                    'verification_type': verification_result.get('verification_type', verification_type),
                    'execution_time_ms': verification_result.get('execution_time_ms'),
                    'details': verification_result.get('details', {})
                }
                
                print(f"[@route:server_verification_common:verification_execute_batch] Flattened result {i+1}: success={flattened_result['success']}, type={flattened_result['verification_type']}")
            
            results.append(flattened_result)
            
            # Count successful verifications
            if flattened_result.get('success'):
                passed_count += 1
        
        # Calculate overall batch success
        overall_success = passed_count == len(verifications)
        
        print(f"[@route:server_verification_common:verification_execute_batch] Batch completed: {passed_count}/{len(verifications)} passed")
        
        return jsonify({
            'success': overall_success,
            'total_count': len(verifications),
            'passed_count': passed_count,
            'failed_count': len(verifications) - passed_count,
            'results': results,
            'message': f'Batch verification completed: {passed_count}/{len(verifications)} passed'
        })
        
    except Exception as e:
        print(f"[@route:server_verification_common:verification_execute_batch] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Batch verification coordination error: {str(e)}'
        }), 500

# =====================================================
# IMAGE VERIFICATION SPECIFIC ENDPOINTS
# =====================================================

@server_verification_common_bp.route('/image/processImage', methods=['POST'])
def verification_image_process():
    """Proxy process image request to host for reference image processing"""
    try:
        print("[@route:server_verification_common:verification_image_process] Proxying process image request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host verification image process endpoint
        response_data, status_code = proxy_to_host('/host/verification/image/processImage', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@server_verification_common_bp.route('/image/cropImage', methods=['POST'])
def verification_image_crop():
    """Proxy crop image request to host for reference image cropping"""
    try:
        print("[@route:server_verification_common:verification_image_crop] Proxying crop image request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host verification image crop endpoint
        response_data, status_code = proxy_to_host('/host/verification/image/cropImage', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@server_verification_common_bp.route('/image/saveImage', methods=['POST'])
def verification_image_save():
    """Proxy save image request to host"""
    try:
        print("[@route:server_verification_common:verification_image_save] Proxying save image request to host")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host verification image save endpoint
        response_data, status_code = proxy_to_host('/host/verification/image/saveImage', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        print(f"[@route:server_verification_common:verification_image_save] ERROR: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# =====================================================
# TEXT VERIFICATION SPECIFIC ENDPOINTS
# =====================================================

@server_verification_common_bp.route('/text/detectText', methods=['POST'])
def verification_text_detect():
    """Proxy text auto-detection request to host"""
    try:
        print("[@route:server_verification_common:verification_text_detect] Proxying OCR detection request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/verification/text/detectText', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@server_verification_common_bp.route('/text/saveText', methods=['POST'])
def verification_text_save():
    """Save text reference to database - Two-step process like image references"""
    try:
        print("[@route:server_verification_common:verification_text_save] Processing text reference save request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Step 1: Get text data from host (fast, no git operations)
        print("[@route:server_verification_common:verification_text_save] Step 1: Getting text data from host")
        host_response_data, host_status_code = proxy_to_host('/host/verification/text/saveText', 'POST', request_data)
        
        if host_status_code != 200 or not host_response_data.get('success'):
            print(f"[@route:server_verification_common:verification_text_save] Host step failed: {host_response_data}")
            return jsonify(host_response_data), host_status_code
        
        # Step 2: Save text reference to database
        print("[@route:server_verification_common:verification_text_save] Step 2: Saving text reference to database")
        
        from src.lib.supabase.verifications_references_db import save_reference
        from src.utils.app_utils import get_team_id
        
        # Get team ID
        team_id = get_team_id()
        if not team_id:
            return jsonify({
                'success': False,
                'error': 'Team ID not found in request'
            }), 400
        
        # Extract data from host response and original request
        reference_name = host_response_data.get('reference_name')
        device_id = request_data.get('device_id')
        
        if not device_id:
            return jsonify({
                'success': False,
                'error': 'device_id is required'
            }), 400
        
        # Extract device_model from frontend request data
        device_model = request_data.get('model')
 
        if not device_model:
            return jsonify({
                'success': False,
                'error': 'device_model is required but not found in request data'
            }), 400
        
        area = host_response_data.get('area')
        text_data = host_response_data.get('text_data', {})
        
        print(f"[@route:server_verification_common:verification_text_save] Saving to database: {reference_name} for model: {device_model}")
        
        # Save text reference to database using save_reference function
        # For text references, we store text data in area field and use a placeholder R2 path
        extended_area = {
            **(area or {}),
            'text': text_data.get('text', ''),
            'font_size': text_data.get('font_size', 12.0),
            'confidence': text_data.get('confidence', 0.8)
        }
        
        db_result = save_reference(
            name=reference_name,
            device_model=device_model,
            reference_type='reference_text',  # Use reference_text type for text references
            r2_path=f'text-references/{device_model}/{reference_name}',  # Placeholder path for consistency
            r2_url='',  # No R2 URL needed for text references
            team_id=team_id,
            area=extended_area  # Store text data in area field
        )
        
        if db_result['success']:
            print(f"[@route:server_verification_common:verification_text_save] Successfully saved text reference to database")
            return jsonify({
                'success': True,
                'message': f'Text reference saved: {reference_name}',
                'reference_name': reference_name,
                'model': device_model,
                'text': text_data.get('text', ''),
                'reference_id': db_result.get('reference_id')
            })
        else:
            print(f"[@route:server_verification_common:verification_text_save] Database save failed: {db_result.get('error')}")
            return jsonify({
                'success': False,
                'error': f"Database save failed: {db_result.get('error')}"
            }), 500
        
    except Exception as e:
        print(f"[@route:server_verification_common:verification_text_save] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# =====================================================
# ADB VERIFICATION SPECIFIC ENDPOINTS
# =====================================================

@server_verification_common_bp.route('/adb/waitForElementToAppear', methods=['POST'])
def verification_adb_wait_for_element_to_appear():
    """Proxy ADB waitForElementToAppear request to host"""
    try:
        print("[@route:server_verification_common:verification_adb_wait_for_element_to_appear] Proxying ADB waitForElementToAppear request")
        
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
def verification_adb_wait_for_element_to_disappear():
    """Proxy ADB waitForElementToDisappear request to host"""
    try:
        print("[@route:server_verification_common:verification_adb_wait_for_element_to_disappear] Proxying ADB waitForElementToDisappear request")
        
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

@server_verification_common_bp.route('/image/getReferences', methods=['POST'])
def verification_image_get_references():
    """Get image references from database - Uses verification controller"""
    try:
        print("[@route:server_verification_common:verification_image_get_references] Getting image references using verification controller")
        
        # Get host info for model filtering
        host_info, error = get_host_from_request()
        if not host_info:
            return jsonify({
                'success': False,
                'error': error or 'Host information required'
            }), 400
        
        # Get image references from database directly
        from src.lib.supabase.verifications_references_db import get_references
        from src.utils.app_utils import DEFAULT_TEAM_ID
        
        result = get_references(
            team_id=DEFAULT_TEAM_ID,
            device_model=host_info.get('device_model'),
            reference_type='reference_image'
        )
        
        return jsonify(result)
            
    except Exception as e:
        print(f"[@route:server_verification_common:verification_image_get_references] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@server_verification_common_bp.route('/text/getReferences', methods=['POST'])
def verification_text_get_references():
    """Get text references from database - Uses verification controller"""
    try:
        print("[@route:server_verification_common:verification_text_get_references] Getting text references using verification controller")
        
        # Get host info for model filtering
        host_info, error = get_host_from_request()
        if not host_info:
            return jsonify({
                'success': False,
                'error': error or 'Host information required'
            }), 400
        
        # Get text references from database directly
        from src.lib.supabase.verifications_references_db import get_references
        from src.utils.app_utils import DEFAULT_TEAM_ID
        
        result = get_references(
            team_id=DEFAULT_TEAM_ID,
            device_model=host_info.get('device_model'),
            reference_type='reference_text'
        )
        
        return jsonify(result)
        
    except Exception as e:
        print(f"[@route:server_verification_common:verification_text_get_references] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@server_verification_common_bp.route('/getAllReferences', methods=['GET', 'POST'])
def verification_get_all_references():
    """Get all references from database - Uses verification controller"""
    try:
        print("[@route:server_verification_common:verification_get_all_references] Getting references using verification controller")
        
        # Get host info for model filtering
        host_info, error = get_host_from_request()
        if not host_info:
            return jsonify({
                'success': False,
                'error': error or 'Host information required'
            }), 400
        
        # Get all references from database directly
        from src.lib.supabase.verifications_references_db import get_references
        from src.utils.app_utils import DEFAULT_TEAM_ID
        
        result = get_references(
            team_id=DEFAULT_TEAM_ID,
            device_model=host_info.get('device_model')
        )
        
        return jsonify(result)
        
    except Exception as e:
        print(f"[@route:server_verification_common:verification_get_all_references] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

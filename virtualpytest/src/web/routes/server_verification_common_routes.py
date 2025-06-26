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

@server_verification_common_bp.route('/appium/execute', methods=['POST'])
def execute_appium_verification():
    """Proxy single Appium verification to host"""
    try:
        print("[@route:server_verification_common:execute_appium_verification] Proxying Appium verification request")
        
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
def execute_audio_verification():
    """Proxy single audio verification to host"""
    try:
        print("[@route:server_verification_common:execute_audio_verification] Proxying audio verification request")
        
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
def execute_video_verification():
    """Proxy single video verification to host"""
    try:
        print("[@route:server_verification_common:execute_video_verification] Proxying video verification request")
        
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

@server_verification_common_bp.route('/batch/execute', methods=['POST'])
def execute_batch_verification():
    """Execute batch verification by dispatching individual requests to host endpoints"""
    try:
        print("[@route:server_verification_common:execute_batch_verification] Starting batch verification coordination")
        
        # Get request data
        data = request.get_json() or {}
        verifications = data.get('verifications', [])
        source_filename = data.get('source_filename')
        host = data.get('host', {})
        
        # Extract model from host device (required)
        device_model = data.get('model') or host.get('device_model')
        
        if not device_model:
            return jsonify({
                'success': False,
                'error': 'device_model is required but not found in host object'
            }), 400
        
        print(f"[@route:server_verification_common:execute_batch_verification] Processing {len(verifications)} verifications")
        print(f"[@route:server_verification_common:execute_batch_verification] Source: {source_filename}, Model: {device_model}")
        
        # Validate required parameters
        if not verifications:
            return jsonify({
                'success': False,
                'error': 'verifications are required'
            }), 400
        
        # Note: source_filename is optional - controllers will take screenshots automatically when needed
        # ADB verifications don't need screenshots, image/text verifications will capture if no source provided
        
        results = []
        passed_count = 0
        
        for i, verification in enumerate(verifications):
            verification_type = verification.get('verification_type', 'text')
            
            print(f"[@route:server_verification_common:execute_batch_verification] Processing verification {i+1}/{len(verifications)}: {verification_type}")
            
            # Prepare individual request data
            individual_request = {
                'verification': verification,
                'source_filename': source_filename,
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
                # Flatten the nested verification_result structure
                verification_result = result.get('verification_result', {})
                flattened_result = {
                    'success': verification_result.get('success', False),
                    'message': verification_result.get('message'),
                    'error': verification_result.get('error'),
                    'threshold': verification_result.get('threshold') or verification_result.get('confidence'),
                    'resultType': 'PASS' if verification_result.get('success', False) else 'FAIL',
                    'sourceImageUrl': verification_result.get('source_image_url'),
                    'referenceImageUrl': verification_result.get('reference_image_url'),
                    'extractedText': verification_result.get('extracted_text'),
                    'searchedText': verification_result.get('searched_text'),
                    'imageFilter': verification_result.get('image_filter'),
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
                
                print(f"[@route:server_verification_common:execute_batch_verification] Flattened result {i+1}: success={flattened_result['success']}, type={flattened_result['verification_type']}")
            
            results.append(flattened_result)
            
            # Count successful verifications
            if flattened_result.get('success'):
                passed_count += 1
        
        # Calculate overall batch success
        overall_success = passed_count == len(verifications)
        
        print(f"[@route:server_verification_common:execute_batch_verification] Batch completed: {passed_count}/{len(verifications)} passed")
        
        return jsonify({
            'success': overall_success,
            'total_count': len(verifications),
            'passed_count': passed_count,
            'failed_count': len(verifications) - passed_count,
            'results': results,
            'message': f'Batch verification completed: {passed_count}/{len(verifications)} passed'
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

@server_verification_common_bp.route('/image/save-image', methods=['POST'])
def save_image():
    """Proxy save image request to host"""
    try:
        print("[@route:server_verification_common:save_image] Proxying save image request to host")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host verification image save endpoint
        response_data, status_code = proxy_to_host('/host/verification/image/save-image', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        print(f"[@route:server_verification_common:save_image] ERROR: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# =====================================================
# TEXT VERIFICATION SPECIFIC ENDPOINTS
# =====================================================

@server_verification_common_bp.route('/text/detect-text', methods=['POST'])
def detect_text():
    """Proxy text auto-detection request to host"""
    try:
        print("[@route:server_verification_common:detect_text] Proxying OCR detection request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Proxy to host
        response_data, status_code = proxy_to_host('/host/verification/text/detect-text', 'POST', request_data)
        
        return jsonify(response_data), status_code
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@server_verification_common_bp.route('/text/save-text', methods=['POST'])
def save_text():
    """Save text reference to database - Two-step process like image references"""
    try:
        print("[@route:server_verification_common:save_text] Processing text reference save request")
        
        # Get request data
        request_data = request.get_json() or {}
        
        # Step 1: Get text data from host (fast, no git operations)
        print("[@route:server_verification_common:save_text] Step 1: Getting text data from host")
        host_response_data, host_status_code = proxy_to_host('/host/verification/text/save-text', 'POST', request_data)
        
        if host_status_code != 200 or not host_response_data.get('success'):
            print(f"[@route:server_verification_common:save_text] Host step failed: {host_response_data}")
            return jsonify(host_response_data), host_status_code
        
        # Step 2: Save text reference to database
        print("[@route:server_verification_common:save_text] Step 2: Saving text reference to database")
        
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
        
        # Get device_model from host response (host route includes it following established pattern)
        device_model = host_response_data.get('device_model')
        
        if not device_model:
            return jsonify({
                'success': False,
                'error': 'device_model not provided by host'
            }), 400
        
        area = host_response_data.get('area')
        text_data = host_response_data.get('text_data', {})
        
        print(f"[@route:server_verification_common:save_text] Saving to database: {reference_name} for model: {device_model}")
        
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
            print(f"[@route:server_verification_common:save_text] Successfully saved text reference to database")
            return jsonify({
                'success': True,
                'message': f'Text reference saved: {reference_name}',
                'reference_name': reference_name,
                'model': device_model,
                'text': text_data.get('text', ''),
                'image_id': db_result.get('image_id')
            })
        else:
            print(f"[@route:server_verification_common:save_text] Database save failed: {db_result.get('error')}")
            return jsonify({
                'success': False,
                'error': f"Database save failed: {db_result.get('error')}"
            }), 500
        
    except Exception as e:
        print(f"[@route:server_verification_common:save_text] Error: {str(e)}")
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
    """Get image references from database - Uses verification controller"""
    try:
        print("[@route:server_verification_common:get_image_references] Getting image references using verification controller")
        
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
        print(f"[@route:server_verification_common:get_image_references] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@server_verification_common_bp.route('/text/get-references', methods=['POST'])
def get_text_references():
    """Get text references from database - Uses verification controller"""
    try:
        print("[@route:server_verification_common:get_text_references] Getting text references using verification controller")
        
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
        print(f"[@route:server_verification_common:get_text_references] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@server_verification_common_bp.route('/getAllReferences', methods=['GET', 'POST'])
def get_all_references():
    """Get all references from database - Uses verification controller"""
    try:
        print("[@route:server_verification_common:get_all_references] Getting references using verification controller")
        
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
        print(f"[@route:server_verification_common:get_all_references] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
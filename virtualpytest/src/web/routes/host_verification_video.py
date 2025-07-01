"""
Host Video Verification Routes

This module contains host-side video verification endpoints that:
- Handle video analysis requests (blackscreen, freeze, subtitle detection)
- Execute video verification using the VideoVerificationController
- Return detailed analysis results with same level of detail as analyze_frame.py
"""

from flask import Blueprint, request, jsonify
from src.utils.host_utils import get_controller, get_device_by_id, get_host
import time
import traceback

# Create blueprint
host_verification_video_bp = Blueprint('host_verification_video', __name__, url_prefix='/host/verification/video')

def get_verification_controller(device_id: str, controller_type: str, check_device: bool = False):
    """
    Helper function to get verification controller and handle common validation.
    
    Args:
        device_id: ID of the device
        controller_type: Type of controller ('verification_video', 'verification_image', 'verification_text')
        check_device: Whether to also validate device existence
        
    Returns:
        Tuple of (controller, device, error_response) where error_response is None if successful
    """
    controller = get_controller(device_id, controller_type)
    device = None
    
    if not controller:
        error_response = jsonify({
            'success': False,
            'error': f'No {controller_type} controller found for device {device_id}'
        }), 404
        return None, None, error_response
    
    if check_device:
        device = get_device_by_id(device_id)
        if not device:
            error_response = jsonify({
                'success': False,
                'error': f'Device {device_id} not found'
            }), 404
            return None, None, error_response
    
    return controller, device, None

# =====================================================
# VIDEO VERIFICATION EXECUTION ENDPOINT
# =====================================================

@host_verification_video_bp.route('/execute', methods=['POST'])
def host_video_verification_execute():
    """Execute video verification using VideoVerificationController"""
    try:
        print("[@route:host_verification_video:execute] Processing video verification request")
        
        # Get request data
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        verification = data.get('verification', {})
        image_source_url = data.get('image_source_url')
        
        print(f"[@route:host_verification_video:execute] Verification: {verification}")
        print(f"[@route:host_verification_video:execute] Image source: {image_source_url}")
        
        # Get video verification controller
        video_controller, device, error_response = get_verification_controller(device_id, 'verification_video')
        if error_response:
            return error_response
        
        # Execute verification
        start_time = time.time()
        result = video_controller.execute_verification(verification, image_source_url)
        execution_time = int((time.time() - start_time) * 1000)
        
        # Add execution time to result
        result['execution_time_ms'] = execution_time
        
        print(f"[@route:host_verification_video:execute] Result: success={result.get('success')}, time={execution_time}ms")
        
        return jsonify(result)
        
    except Exception as e:
        print(f"[@route:host_verification_video:execute] Error: {str(e)}")
        print(f"[@route:host_verification_video:execute] Traceback: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': f'Video verification execution error: {str(e)}'
        }), 500

# =====================================================
# SPECIFIC VIDEO ANALYSIS ENDPOINTS
# =====================================================

@host_verification_video_bp.route('/detectBlackscreen', methods=['POST'])
def host_video_detect_blackscreen():
    """Detect blackscreen in video frames"""
    try:
        print("[@route:host_verification_video:detectBlackscreen] Processing blackscreen detection request")
        
        # Get request data
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        image_paths = data.get('image_paths')  # Array of image paths
        image_source_url = data.get('image_source_url')  # Single image or comma-separated
        threshold = data.get('threshold', 10)
        
        # Parse image sources
        final_image_paths = None
        if image_paths:
            final_image_paths = image_paths
        elif image_source_url:
            if isinstance(image_source_url, str):
                if ',' in image_source_url:
                    final_image_paths = [path.strip() for path in image_source_url.split(',')]
                else:
                    final_image_paths = [image_source_url]
            elif isinstance(image_source_url, list):
                final_image_paths = image_source_url
        
        print(f"[@route:host_verification_video:detectBlackscreen] Image paths: {final_image_paths}")
        print(f"[@route:host_verification_video:detectBlackscreen] Threshold: {threshold}")
        
        # Get video verification controller
        video_controller, device, error_response = get_verification_controller(device_id, 'verification_video')
        if error_response:
            return error_response
        
        # Execute blackscreen detection
        start_time = time.time()
        result = video_controller.detect_blackscreen(final_image_paths, threshold)
        execution_time = int((time.time() - start_time) * 1000)
        
        # Add execution time to result
        result['execution_time_ms'] = execution_time
        
        print(f"[@route:host_verification_video:detectBlackscreen] Result: success={result.get('success')}, blackscreen={result.get('blackscreen_detected')}, time={execution_time}ms")
        
        return jsonify(result)
        
    except Exception as e:
        print(f"[@route:host_verification_video:detectBlackscreen] Error: {str(e)}")
        print(f"[@route:host_verification_video:detectBlackscreen] Traceback: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': f'Blackscreen detection error: {str(e)}'
        }), 500

@host_verification_video_bp.route('/detectFreeze', methods=['POST'])
def host_video_detect_freeze():
    """Detect freeze in video frames"""
    try:
        print("[@route:host_verification_video:detectFreeze] Processing freeze detection request")
        
        # Get request data
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        image_paths = data.get('image_paths')  # Array of image paths
        image_source_url = data.get('image_source_url')  # Single image or comma-separated
        freeze_threshold = data.get('freeze_threshold', 1.0)
        
        # Parse image sources
        final_image_paths = None
        if image_paths:
            final_image_paths = image_paths
        elif image_source_url:
            if isinstance(image_source_url, str):
                if ',' in image_source_url:
                    final_image_paths = [path.strip() for path in image_source_url.split(',')]
                else:
                    final_image_paths = [image_source_url]
            elif isinstance(image_source_url, list):
                final_image_paths = image_source_url
        
        print(f"[@route:host_verification_video:detectFreeze] Image paths: {final_image_paths}")
        print(f"[@route:host_verification_video:detectFreeze] Freeze threshold: {freeze_threshold}")
        
        # Get video verification controller
        video_controller, device, error_response = get_verification_controller(device_id, 'verification_video')
        if error_response:
            return error_response
        
        # Execute freeze detection
        start_time = time.time()
        result = video_controller.detect_freeze(final_image_paths, freeze_threshold)
        execution_time = int((time.time() - start_time) * 1000)
        
        # Add execution time to result
        result['execution_time_ms'] = execution_time
        
        print(f"[@route:host_verification_video:detectFreeze] Result: success={result.get('success')}, freeze={result.get('freeze_detected')}, time={execution_time}ms")
        
        return jsonify(result)
        
    except Exception as e:
        print(f"[@route:host_verification_video:detectFreeze] Error: {str(e)}")
        print(f"[@route:host_verification_video:detectFreeze] Traceback: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': f'Freeze detection error: {str(e)}'
        }), 500

@host_verification_video_bp.route('/detectSubtitles', methods=['POST'])
def host_video_detect_subtitles():
    """Detect subtitles in video frames"""
    try:
        print("[@route:host_verification_video:detectSubtitles] Processing subtitle detection request")
        
        # Get request data
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        image_paths = data.get('image_paths')  # Array of image paths
        image_source_url = data.get('image_source_url')  # Single image or comma-separated
        extract_text = data.get('extract_text', True)
        
        # Parse image sources
        final_image_paths = None
        if image_paths:
            final_image_paths = image_paths
        elif image_source_url:
            if isinstance(image_source_url, str):
                if ',' in image_source_url:
                    final_image_paths = [path.strip() for path in image_source_url.split(',')]
                else:
                    final_image_paths = [image_source_url]
            elif isinstance(image_source_url, list):
                final_image_paths = image_source_url
        
        print(f"[@route:host_verification_video:detectSubtitles] Image paths: {final_image_paths}")
        print(f"[@route:host_verification_video:detectSubtitles] Extract text: {extract_text}")
        
        # Convert URLs to local paths if needed
        if final_image_paths and any(path.startswith(('http://', 'https://')) for path in final_image_paths):
            from src.utils.build_url_utils import convertHostUrlToLocalPath
            final_image_paths = [convertHostUrlToLocalPath(path) if path.startswith(('http://', 'https://')) else path for path in final_image_paths]
        
        # Get video verification controller
        video_controller, device, error_response = get_verification_controller(device_id, 'verification_video')
        if error_response:
            return error_response
        
        # Execute subtitle detection
        start_time = time.time()
        result = video_controller.detect_subtitles(final_image_paths, extract_text)
        execution_time = int((time.time() - start_time) * 1000)
        
        # Add execution time to result
        result['execution_time_ms'] = execution_time
        
        print(f"[@route:host_verification_video:detectSubtitles] Result: success={result.get('success')}, subtitles={result.get('subtitles_detected')}, time={execution_time}ms")
        
        return jsonify(result)
        
    except Exception as e:
        print(f"[@route:host_verification_video:detectSubtitles] Error: {str(e)}")
        print(f"[@route:host_verification_video:detectSubtitles] Traceback: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': f'Subtitle detection error: {str(e)}'
        }), 500

# =====================================================
# STATUS AND INFO ENDPOINTS
# =====================================================

@host_verification_video_bp.route('/status', methods=['GET'])
def host_video_verification_status():
    """Get video verification controller status"""
    try:
        # Get device_id from query params (defaults to device1)
        device_id = request.args.get('device_id', 'device1')
        
        print("[@route:host_verification_video:status] Getting video verification status")
        
        # Get video verification controller
        video_controller, device, error_response = get_verification_controller(device_id, 'verification_video')
        if error_response:
            return error_response
        
        # Get status
        status = video_controller.get_status()
        
        return jsonify({
            'success': True,
            'status': status
        })
        
    except Exception as e:
        print(f"[@route:host_verification_video:status] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Status error: {str(e)}'
        }), 500

@host_verification_video_bp.route('/availableVerifications', methods=['GET'])
def host_video_verification_available():
    """Get available video verifications"""
    try:
        # Get device_id from query params (defaults to device1)
        device_id = request.args.get('device_id', 'device1')
        
        print("[@route:host_verification_video:availableVerifications] Getting available video verifications")
        
        # Get video verification controller
        video_controller, device, error_response = get_verification_controller(device_id, 'verification_video')
        if error_response:
            return error_response
        
        # Get available verifications
        verifications = video_controller.get_available_verifications()
        
        return jsonify({
            'success': True,
            'verifications': verifications
        })
        
    except Exception as e:
        print(f"[@route:host_verification_video:availableVerifications] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Available verifications error: {str(e)}'
        }), 500 
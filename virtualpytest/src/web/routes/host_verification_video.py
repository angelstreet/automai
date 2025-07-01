"""
Host Video Verification Routes

This module contains host-side video verification endpoints that:
- Handle video analysis requests (blackscreen, freeze, subtitle detection)
- Execute video verification using the VideoVerificationController
- Return detailed analysis results with same level of detail as analyze_frame.py
"""

from flask import Blueprint, request, jsonify
import time
import traceback

# Create blueprint
host_verification_video_bp = Blueprint('host_verification_video', __name__, url_prefix='/host/verification/video')

def get_video_verification_controller():
    """Get the video verification controller instance"""
    try:
        from src.controllers.controller_config_factory import ControllerConfigFactory
        
        # Get the controller factory instance
        factory = ControllerConfigFactory.get_instance()
        if not factory:
            return None, "Controller factory not initialized"
        
        # Get video verification controller
        video_controller = factory.get_verification_controller('video')
        if not video_controller:
            return None, "Video verification controller not available"
        
        return video_controller, None
        
    except Exception as e:
        return None, f"Failed to get video verification controller: {str(e)}"

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
        verification = data.get('verification', {})
        image_source_url = data.get('image_source_url')
        
        print(f"[@route:host_verification_video:execute] Verification: {verification}")
        print(f"[@route:host_verification_video:execute] Image source: {image_source_url}")
        
        # Get video verification controller
        video_controller, error = get_video_verification_controller()
        if not video_controller:
            return jsonify({
                'success': False,
                'error': error or 'Video verification controller not available'
            }), 500
        
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
        video_controller, error = get_video_verification_controller()
        if not video_controller:
            return jsonify({
                'success': False,
                'error': error or 'Video verification controller not available'
            }), 500
        
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
        video_controller, error = get_video_verification_controller()
        if not video_controller:
            return jsonify({
                'success': False,
                'error': error or 'Video verification controller not available'
            }), 500
        
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
        
        # Get video verification controller
        video_controller, error = get_video_verification_controller()
        if not video_controller:
            return jsonify({
                'success': False,
                'error': error or 'Video verification controller not available'
            }), 500
        
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
        print("[@route:host_verification_video:status] Getting video verification status")
        
        # Get video verification controller
        video_controller, error = get_video_verification_controller()
        if not video_controller:
            return jsonify({
                'success': False,
                'error': error or 'Video verification controller not available'
            }), 500
        
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
        print("[@route:host_verification_video:availableVerifications] Getting available video verifications")
        
        # Get video verification controller
        video_controller, error = get_video_verification_controller()
        if not video_controller:
            return jsonify({
                'success': False,
                'error': error or 'Video verification controller not available'
            }), 500
        
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
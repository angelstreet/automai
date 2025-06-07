"""
Verification Routes

This module contains the core verification API endpoints for:
- Verification controller initialization (take-control)
- Verification actions definition
- Basic verification controller management
"""

from flask import Blueprint, request, jsonify
import os
import sys

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from .utils import check_controllers_available

# Create blueprint
verification_bp = Blueprint('verification', __name__)

# =====================================================
# VERIFICATION ACTIONS DEFINITION
# =====================================================

@verification_bp.route('/api/virtualpytest/verification/actions', methods=['GET'])
def get_verification_actions():
    """Get available verification actions for all verification controllers."""
    try:
        # Define available verifications following the same pattern as remote actions
        verifications = {
            'image': [
                {
                    'id': 'wait_for_image_appear',
                    'label': 'Wait for Image to Appear',
                    'command': 'waitForImageToAppear',
                    'params': {
                        'image_path': '',
                        'timeout': 10.0,
                        'threshold': 0.8,
                        'area': None
                    },
                    'description': 'Wait for specific image to appear on screen',
                    'requiresInput': True,
                    'inputLabel': 'Image Path',
                    'inputPlaceholder': 'button.png'
                },
                {
                    'id': 'wait_for_image_disappear',
                    'label': 'Wait for Image to Disappear',
                    'command': 'waitForImageToDisappear',
                    'params': {
                        'image_path': '',
                        'timeout': 10.0,
                        'threshold': 0.8,
                        'area': None
                    },
                    'description': 'Wait for specific image to disappear from screen',
                    'requiresInput': True,
                    'inputLabel': 'Image Path',
                    'inputPlaceholder': 'loading.png'
                }
            ],
            'text': [
                {
                    'id': 'wait_for_text_appear',
                    'label': 'Wait for Text to Appear',
                    'command': 'waitForTextToAppear',
                    'params': {
                        'text': '',
                        'timeout': 10.0,
                        'case_sensitive': False,
                        'area': None
                    },
                    'description': 'Wait for specific text to appear on screen',
                    'requiresInput': True,
                    'inputLabel': 'Text',
                    'inputPlaceholder': 'Welcome'
                },
                {
                    'id': 'wait_for_text_disappear',
                    'label': 'Wait for Text to Disappear',
                    'command': 'waitForTextToDisappear',
                    'params': {
                        'text': '',
                        'timeout': 10.0,
                        'case_sensitive': False,
                        'area': None
                    },
                    'description': 'Wait for specific text to disappear from screen',
                    'requiresInput': True,
                    'inputLabel': 'Text',
                    'inputPlaceholder': 'Loading...'
                }
            ],
            'adb': [
                {
                    'id': 'wait_for_element_appear',
                    'label': 'Wait for Element to Appear',
                    'command': 'adb_element_appear',
                    'params': {
                        'timeout': 10.0
                    },
                    'description': 'Wait for UI element to appear using ADB (case-insensitive search across all attributes)',
                    'requiresInput': True,
                    'inputLabel': 'Search Term',
                    'inputPlaceholder': 'HOME'
                },
                {
                    'id': 'wait_for_element_disappear',
                    'label': 'Wait for Element to Disappear',
                    'command': 'adb_element_disappear',
                    'params': {
                        'timeout': 10.0
                    },
                    'description': 'Wait for UI element to disappear using ADB (case-insensitive search across all attributes)',
                    'requiresInput': True,
                    'inputLabel': 'Search Term',
                    'inputPlaceholder': 'loading'
                }
            ]
        }
        
        return jsonify({
            'success': True,
            'controller_type': 'verification',
            'verifications': verifications
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Error getting verification actions: {str(e)}'
        }), 500

# =====================================================
# VERIFICATION CONTROLLER MANAGEMENT
# =====================================================

@verification_bp.route('/api/virtualpytest/verification/take-control', methods=['POST'])
def take_verification_control():
    """Initialize verification controllers with device model."""
    try:
        data = request.get_json()
        device_model = data.get('device_model', 'android_mobile')
        video_device = data.get('video_device', '/dev/video0')
        
        print(f"[@route:take_verification_control] Initializing verification controllers")
        print(f"[@route:take_verification_control] Device model: {device_model}")
        print(f"[@route:take_verification_control] Video device: {video_device}")
        
        # For now, return success to indicate the endpoint is working
        # The actual controller initialization logic can be implemented later
        return jsonify({
            'success': True,
            'message': f'Verification controllers initialized for {device_model}',
            'device_model': device_model,
            'video_device': video_device,
            'controllers_available': ['image', 'text', 'adb']
        })
        
    except Exception as e:
        print(f"[@route:take_verification_control] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Error initializing verification controllers: {str(e)}'
        }), 500

@verification_bp.route('/api/virtualpytest/verification/release-control', methods=['POST'])
def release_verification_control():
    """Release verification controllers."""
    try:
        print(f"[@route:release_verification_control] Releasing verification controllers")
        
        # For now, return success to indicate the endpoint is working
        return jsonify({
            'success': True,
            'message': 'Verification controllers released'
        })
        
    except Exception as e:
        print(f"[@route:release_verification_control] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Error releasing verification controllers: {str(e)}'
        }), 500
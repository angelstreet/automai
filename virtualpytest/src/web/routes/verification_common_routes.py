"""
Verification Common Routes

This module contains the common verification API endpoints that:
- Handle verification execution coordination
- Manage reference lists and status
- Provide shared verification utilities
"""

from flask import Blueprint, request, jsonify
import requests
import json
import os

# Create blueprint
verification_common_bp = Blueprint('verification_common', __name__)

# =====================================================
# COMMON VERIFICATION ENDPOINTS
# =====================================================

@verification_common_bp.route('/api/virtualpytest/verification/actions', methods=['GET'])
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

@verification_common_bp.route('/api/virtualpytest/reference/list', methods=['GET'])
def list_references():
    """Get list of available references from host."""
    try:
        model = request.args.get('model', 'default')
        
        print(f"[@route:list_references] Getting reference list for model: {model}")
        
        # Hardcode IPs for testing
        host_ip = "77.56.53.130"  # Host IP
        host_port = "5119"        # Host internal port
        
        print(f"[@route:list_references] Using hardcoded host: {host_ip}:{host_port}")
        
        # Forward request to host
        host_response = requests.get(
            f'http://{host_ip}:{host_port}/stream/references',
            params={'model': model},
            timeout=30
        )
        
        if host_response.status_code == 200:
            host_result = host_response.json()
            print(f"[@route:list_references] Host response: {len(host_result.get('references', []))} references")
            return jsonify(host_result)
        else:
            print(f"[@route:list_references] Host request failed: {host_response.status_code}")
            return jsonify({
                'success': False,
                'error': f'Host request failed: {host_response.status_code}'
            }), host_response.status_code
            
    except requests.exceptions.RequestException as e:
        print(f"[@route:list_references] Request error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to connect to host: {str(e)}'
        }), 500
    except Exception as e:
        print(f"[@route:list_references] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500

@verification_common_bp.route('/api/virtualpytest/verification/actions', methods=['POST'])
def verification_actions():
    """Handle verification actions like delete, update, etc."""
    try:
        data = request.get_json()
        action = data.get('action')
        reference_name = data.get('reference_name')
        model = data.get('model')
        
        print(f"[@route:verification_actions] Action: {action} for reference: {reference_name} (model: {model})")
        
        # Validate required parameters
        if not action or not reference_name or not model:
            return jsonify({
                'success': False,
                'error': 'action, reference_name, and model are required'
            }), 400
        
        # Hardcode IPs for testing
        host_ip = "77.56.53.130"  # Host IP
        host_port = "5119"        # Host internal port
        
        # Forward action request to host
        host_response = requests.post(
            f'http://{host_ip}:{host_port}/stream/reference-actions',
            json={
                'action': action,
                'reference_name': reference_name,
                'model': model
            },
            timeout=30
        )
        
        if host_response.status_code == 200:
            host_result = host_response.json()
            print(f"[@route:verification_actions] Host response: {host_result.get('success')}")
            return jsonify(host_result)
        else:
            print(f"[@route:verification_actions] Host request failed: {host_response.status_code}")
            return jsonify({
                'success': False,
                'error': f'Host request failed: {host_response.status_code}'
            }), host_response.status_code
            
    except requests.exceptions.RequestException as e:
        print(f"[@route:verification_actions] Request error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to connect to host: {str(e)}'
        }), 500
    except Exception as e:
        print(f"[@route:verification_actions] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500

@verification_common_bp.route('/api/virtualpytest/verification/status', methods=['GET'])
def verification_status():
    """Get verification system status."""
    try:
        print(f"[@route:verification_status] Getting verification system status")
        
        # Hardcode IPs for testing
        host_ip = "77.56.53.130"  # Host IP
        host_port = "5119"        # Host internal port
        
        # Forward status request to host
        host_response = requests.get(
            f'http://{host_ip}:{host_port}/stream/verification-status',
            timeout=30
        )
        
        if host_response.status_code == 200:
            host_result = host_response.json()
            print(f"[@route:verification_status] Host response: {host_result.get('status')}")
            return jsonify(host_result)
        else:
            print(f"[@route:verification_status] Host request failed: {host_response.status_code}")
            return jsonify({
                'success': False,
                'error': f'Host request failed: {host_response.status_code}'
            }), host_response.status_code
            
    except requests.exceptions.RequestException as e:
        print(f"[@route:verification_status] Request error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to connect to host: {str(e)}'
        }), 500
    except Exception as e:
        print(f"[@route:verification_status] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500

# =====================================================
# VERIFICATION CONTROLLER MANAGEMENT
# =====================================================

@verification_common_bp.route('/api/virtualpytest/verification/take-control', methods=['POST'])
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

@verification_common_bp.route('/api/virtualpytest/verification/release-control', methods=['POST'])
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
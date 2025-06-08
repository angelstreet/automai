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
from .utils import make_host_request, get_primary_host, get_host_by_model, build_host_nginx_url

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
        
        # Use dynamic host discovery instead of hardcoded values
        try:
            host_response = make_host_request(
                '/stream/references',
                method='GET',
                params={'model': model},
                use_https=True
            )
        except ValueError as e:
            print(f"[@route:list_references] Host discovery error: {str(e)}")
            return jsonify({
                'success': False,
                'error': f'No hosts available: {str(e)}'
            }), 503
        
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
        
        # Use dynamic host discovery instead of hardcoded values
        try:
            host_response = make_host_request(
                '/stream/reference-actions',
                method='POST',
                json={
                    'action': action,
                    'reference_name': reference_name,
                    'model': model
                },
                use_https=True
            )
        except ValueError as e:
            print(f"[@route:verification_actions] Host discovery error: {str(e)}")
            return jsonify({
                'success': False,
                'error': f'No hosts available: {str(e)}'
            }), 503
        
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
        
        # Check if any hosts are available
        host_info = get_primary_host()
        if not host_info:
            print(f"[@route:verification_status] No hosts available")
            return jsonify({
                'success': False,
                'error': 'No hosts available',
                'status': 'no_hosts'
            }), 503
        
        # Try to get status from host (but this endpoint might not exist yet)
        try:
            host_response = make_host_request(
                '/stream/verification-status',
                method='GET',
                use_https=True
            )
            
            if host_response.status_code == 200:
                host_result = host_response.json()
                print(f"[@route:verification_status] Host response: {host_result.get('status')}")
                return jsonify(host_result)
            else:
                print(f"[@route:verification_status] Host request failed: {host_response.status_code}")
                # If the endpoint doesn't exist (404), return a mock status
                if host_response.status_code == 404:
                    print(f"[@route:verification_status] Host endpoint not found, returning mock status")
                    return jsonify({
                        'success': True,
                        'status': 'ready',
                        'controllers_available': ['image', 'text', 'adb'],
                        'message': 'Verification system is ready (mock status)',
                        'host_connected': True,
                        'device_model': host_info.get('device_model', 'unknown'),
                        'host_id': host_info.get('client_id', 'unknown')
                    })
                else:
                    return jsonify({
                        'success': False,
                        'error': f'Host request failed: {host_response.status_code}'
                    }), host_response.status_code
                    
        except ValueError as e:
            print(f"[@route:verification_status] Host discovery error: {str(e)}")
            return jsonify({
                'success': False,
                'error': f'No hosts available: {str(e)}'
            }), 503
            
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

# REMOVED: take-control and release-control endpoints moved to server_verification_control_routes.py
# These endpoints should only be available on the server, not shared between server and host

# The following endpoints have been moved to server-specific routes:
# - /api/virtualpytest/verification/take-control
# - /api/virtualpytest/verification/release-control  
# - /api/virtualpytest/verification/lock-device
# - /api/virtualpytest/verification/unlock-device
# - /api/virtualpytest/verification/device-lock-status/<device_id> 
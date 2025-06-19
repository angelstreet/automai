"""
Verification ADB Host Routes

This module contains the host-side ADB verification API endpoints that:
- Handle ADB element verification directly using ADB controller
- Support waitForElementToAppear and waitForElementToDisappear
- Execute ADB verification operations
"""

from flask import Blueprint, request, jsonify, current_app
import os
import json
from src.utils.host_utils import get_local_controller

# Create blueprint
verification_adb_host_bp = Blueprint('verification_adb_host', __name__, url_prefix='/host/verification/adb')

# =====================================================
# HOST-SIDE ADB VERIFICATION ENDPOINTS
# =====================================================

@verification_adb_host_bp.route('/execute', methods=['POST'])
def execute_adb_verification():
    """Execute single ADB verification on host"""
    try:
        print("[@route:host_verification_adb:execute] Executing ADB verification on host")
        
        data = request.get_json()
        verification = data.get('verification')
        source_filename = data.get('source_filename')  # Not used for ADB but kept for consistency
        model = data.get('model', 'default')
        
        print(f"[@route:host_verification_adb:execute] Verification: {verification}")
        
        # Validate required parameters
        if not verification:
            return jsonify({
                'success': False,
                'error': 'verification is required'
            }), 400
        
        # Get ADB verification controller
        adb_controller = get_local_controller('verification_adb')
        if not adb_controller:
            return jsonify({
                'success': False,
                'error': 'ADB verification controller not available'
            }), 404
        
        # Extract verification parameters
        params = verification.get('params', {})
        command = verification.get('command', '')
        
        # Execute based on command type
        if command == 'waitForElementToAppear':
            search_term = params.get('search_term') or verification.get('inputValue', '')
            timeout = params.get('timeout', 10.0)
            check_interval = params.get('check_interval', 1.0)
            
            success, message, result_data = adb_controller.waitForElementToAppear(
                search_term=search_term,
                timeout=timeout,
                check_interval=check_interval
            )
            
        elif command == 'waitForElementToDisappear':
            search_term = params.get('search_term') or verification.get('inputValue', '')
            timeout = params.get('timeout', 10.0)
            check_interval = params.get('check_interval', 1.0)
            
            success, message, result_data = adb_controller.waitForElementToDisappear(
                search_term=search_term,
                timeout=timeout,
                check_interval=check_interval
            )
            
        else:
            return jsonify({
                'success': False,
                'error': f'Unknown ADB command: {command}. Supported commands: waitForElementToAppear, waitForElementToDisappear'
            }), 400
        
        return jsonify({
            'success': True,
            'verification_result': {
                'success': success,
                'message': message,
                'result_data': result_data,
                'verification_type': 'adb',
                'command': command
            }
        })
        
    except Exception as e:
        print(f"[@route:host_verification_adb:execute] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'ADB verification execution error: {str(e)}'
        }), 500

@verification_adb_host_bp.route('/waitForElementToAppear', methods=['POST'])
def wait_for_element_to_appear():
    """Execute ADB waitForElementToAppear verification"""
    try:
        print("[@route:host_verification_adb:waitForElementToAppear] Executing ADB waitForElementToAppear")
        
        # Get request data
        data = request.get_json() or {}
        search_term = data.get('search_term')
        timeout = data.get('timeout', 10.0)
        check_interval = data.get('check_interval', 1.0)
        
        # Validate required parameters
        if not search_term:
            return jsonify({
                'success': False,
                'error': 'search_term is required'
            }), 400
        
        # Get ADB verification controller
        adb_controller = get_local_controller('verification_adb')
        if not adb_controller:
            return jsonify({
                'success': False,
                'error': 'ADB verification controller not available'
            }), 404
        
        # Execute the verification
        success, message, result_data = adb_controller.waitForElementToAppear(
            search_term=search_term,
            timeout=timeout,
            check_interval=check_interval
        )
        
        return jsonify({
            'success': success,
            'message': message,
            'result_data': result_data,
            'verification_type': 'adb',
            'command': 'waitForElementToAppear'
        })
        
    except Exception as e:
        print(f"[@route:host_verification_adb:waitForElementToAppear] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'ADB waitForElementToAppear error: {str(e)}'
        }), 500

@verification_adb_host_bp.route('/waitForElementToDisappear', methods=['POST'])
def wait_for_element_to_disappear():
    """Execute ADB waitForElementToDisappear verification"""
    try:
        print("[@route:host_verification_adb:waitForElementToDisappear] Executing ADB waitForElementToDisappear")
        
        # Get request data
        data = request.get_json() or {}
        search_term = data.get('search_term')
        timeout = data.get('timeout', 10.0)
        check_interval = data.get('check_interval', 1.0)
        
        # Validate required parameters
        if not search_term:
            return jsonify({
                'success': False,
                'error': 'search_term is required'
            }), 400
        
        # Get ADB verification controller
        adb_controller = get_local_controller('verification_adb')
        if not adb_controller:
            return jsonify({
                'success': False,
                'error': 'ADB verification controller not available'
            }), 404
        
        # Execute the verification
        success, message, result_data = adb_controller.waitForElementToDisappear(
            search_term=search_term,
            timeout=timeout,
            check_interval=check_interval
        )
        
        return jsonify({
            'success': success,
            'message': message,
            'result_data': result_data,
            'verification_type': 'adb',
            'command': 'waitForElementToDisappear'
        })
        
    except Exception as e:
        print(f"[@route:host_verification_adb:waitForElementToDisappear] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'ADB waitForElementToDisappear error: {str(e)}'
        }), 500 
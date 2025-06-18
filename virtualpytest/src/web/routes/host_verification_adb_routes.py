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
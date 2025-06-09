"""
Standardized Remote Control Routes (v2)

This module contains the new standardized remote control API endpoints following
the /{context}/{domain}/{action} convention with proper error handling.

New route structure:
- /server/remote/android-tv/* (configuration and status only)
- /server/remote/android-mobile/* (configuration and status only)
- /server/remote/ir/*
- /server/remote/bluetooth/*

Note: take-control is handled by abstract /server/take-control and /host/take-control routes
"""

from flask import Blueprint, request, jsonify
import os
import sys

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from error_handling import controller_error

# Create blueprint with new standardized prefix
remote_bp = Blueprint('remote', __name__, url_prefix='/server/remote')

# =====================================================
# ANDROID TV REMOTE CONTROL ENDPOINTS (Config Only)
# =====================================================

@remote_bp.route('/android-tv/config', methods=['GET'])
def get_android_tv_config():
    """Get Android TV remote configuration."""
    try:
        from controllers.remote.android_tv import AndroidTVRemoteController
        config = AndroidTVRemoteController.get_remote_config()
        
        return jsonify({
            'success': True,
            'config': config
        })
        
    except Exception as e:
        return controller_error(
            controller_type="android_tv",
            operation="get_config",
            error_details=str(e)
        )

@remote_bp.route('/android-tv/defaults', methods=['GET'])
def get_android_tv_defaults():
    """Get default Android TV connection values from environment variables."""
    try:
        defaults = {
            'device_ip': os.getenv('DEVICE_IP') or os.getenv('ANDROID_TV_IP', '192.168.1.130'),
            'device_port': os.getenv('DEVICE_PORT', '5555')
        }
        
        return jsonify({
            'success': True,
            'defaults': defaults
        })
        
    except Exception as e:
        return controller_error(
            controller_type="android_tv",
            operation="get_defaults",
            error_details=str(e)
        )

# =====================================================
# ANDROID MOBILE REMOTE CONTROL ENDPOINTS (Config Only)
# =====================================================

@remote_bp.route('/android-mobile/config', methods=['GET'])
def get_android_mobile_config():
    """Get Android Mobile remote configuration including layout, buttons, and image."""
    try:
        from controllers.remote.android_mobile import AndroidMobileRemoteController
        config = AndroidMobileRemoteController.get_remote_config()
        
        return jsonify({
            'success': True,
            'config': config
        })
        
    except Exception as e:
        return controller_error(
            controller_type="android_mobile",
            operation="get_config",
            error_details=str(e)
        )

@remote_bp.route('/android-mobile/defaults', methods=['GET'])
def get_android_mobile_defaults():
    """Get default connection values for Android Mobile from environment variables."""
    try:
        defaults = {
            'device_ip': os.getenv('DEVICE_IP') or os.getenv('ANDROID_MOBILE_IP', '192.168.1.29'),
            'device_port': os.getenv('DEVICE_PORT', '5555')
        }
        
        return jsonify({
            'success': True,
            'defaults': defaults
        })
        
    except Exception as e:
        return controller_error(
            controller_type="android_mobile",
            operation="get_defaults",
            error_details=str(e)
        ) 
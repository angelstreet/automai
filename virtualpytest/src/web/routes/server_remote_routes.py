"""
Remote Control Routes (Abstract)

This module contains abstract remote control API endpoints that work with any 
remote controller type (Android TV, Android Mobile, IR, Bluetooth, etc.)

Routes use the abstract remote controller from the host device object.
No device-specific knowledge or configuration needed.
"""

from flask import Blueprint, request, jsonify, current_app
import os
import sys

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Create blueprint with abstract prefix
remote_bp = Blueprint('remote', __name__, url_prefix='/server/remote')

# =====================================================
# ABSTRACT REMOTE CONTROL ENDPOINTS
# =====================================================

# NOTE: Remote control actions (navigate, click, swipe, key-press) are typically
# handled by navigation/pathfinding routes or direct controller calls.
# 
# If specific remote control endpoints are needed, they should be added here
# using the abstract remote controller pattern:
#
# @remote_bp.route('/navigate', methods=['POST'])
# def navigate():
#     """Navigate using abstract remote controller."""
#     try:
#         host_device = getattr(current_app, 'my_host_device', None)
#         if not host_device:
#             return jsonify({'success': False, 'error': 'Host device not initialized'}), 500
#         
#         remote_controller = host_device.get('controller_objects', {}).get('remote')
#         if not remote_controller:
#             return jsonify({'success': False, 'error': 'Remote controller not available'}), 400
#         
#         data = request.get_json()
#         result = remote_controller.navigate(data.get('direction'))
#         return jsonify({'success': True, 'result': result})
#     except Exception as e:
#         return jsonify({'success': False, 'error': str(e)}), 500

# DELETED: All device-specific /android-tv/* and /android-mobile/* endpoints
# - /config endpoints: Configuration happens at registration
# - /defaults endpoints: Controllers are pre-configured
# 
# Controllers are instantiated and configured during host registration.
# Routes should use the abstract controller methods only. 
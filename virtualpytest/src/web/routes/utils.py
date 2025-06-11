"""
Shared Route Utilities

This module contains Flask-specific helper functions.
All registry and URL building functions are imported from app_utils.py (the reference implementation).
"""

from flask import jsonify, request, current_app
import sys
import os

# Import core utilities from app_utils.py (the reference)
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))
from utils.app_utils import (
    lazy_load_controllers,
    get_host_registry,
    get_host_by_id,
    get_host_by_model,
    get_primary_host,
    build_host_url,
    build_host_nginx_url,
    build_server_url,
    make_host_request
)

# =====================================================
# FLASK-SPECIFIC HELPER FUNCTIONS
# =====================================================

def check_controllers_available():
    """Helper function to check if controllers are available (lazy loaded)"""
    try:
        controllers_available = lazy_load_controllers()
        if not controllers_available:
            return jsonify({'error': 'Controllers not available'}), 503
        return None
    except Exception:
        return jsonify({'error': 'Controllers not available'}), 503

def get_team_id():
    """Get team_id from request headers or use default for demo"""
    default_team_id = getattr(current_app, 'default_team_id', 'default-team-id')
    return request.headers.get('X-Team-ID', default_team_id)

def get_user_id():
    """Get user_id from request headers or use default for demo"""
    default_user_id = getattr(current_app, 'default_user_id', 'default-user-id')
    return request.headers.get('X-User-ID', default_user_id)

# =====================================================
# BACKWARD COMPATIBILITY ALIASES
# =====================================================
# These functions are now imported from app_utils.py but kept here for routes that import them

def get_connected_hosts():
    """Alias for get_host_registry - for backward compatibility"""
    return get_host_registry()

def get_connected_clients():
    """Alias for get_host_registry - for backward compatibility"""
    return get_host_registry() 
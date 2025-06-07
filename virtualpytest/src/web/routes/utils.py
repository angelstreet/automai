"""
Shared Route Utilities

This module contains common helper functions used across route modules.
"""

from flask import jsonify, request, current_app

def check_supabase():
    """Helper function to check if Supabase is available"""
    supabase_client = getattr(current_app, 'supabase_client', None)
    if supabase_client is None:
        return jsonify({'error': 'Supabase not available'}), 503
    return None

def check_controllers_available():
    """Helper function to check if controllers are available"""
    controllers_available = getattr(current_app, 'controllers_available', False)
    if not controllers_available:
        return jsonify({'error': 'VirtualPyTest controllers not available'}), 503
    return None

def get_team_id():
    """Get team_id from request headers or use default for demo"""
    default_team_id = getattr(current_app, 'default_team_id', 'default-team-id')
    return request.headers.get('X-Team-ID', default_team_id)

def get_user_id():
    """Get user_id from request headers or use default for demo"""
    default_user_id = getattr(current_app, 'default_user_id', 'default-user-id')
    return request.headers.get('X-User-ID', default_user_id) 
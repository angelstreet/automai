"""
Shared Route Utilities

This module contains common helper functions used across route modules.
"""

from flask import jsonify, request

def check_supabase():
    """Helper function to check if Supabase is available"""
    from app import supabase_client
    if supabase_client is None:
        return jsonify({'error': 'Supabase not available'}), 503
    return None

def check_controllers_available():
    """Helper function to check if controllers are available"""
    from app import controllers_available
    if not controllers_available:
        return jsonify({'error': 'VirtualPyTest controllers not available'}), 503
    return None

def get_team_id():
    """Get team_id from request headers or use default for demo"""
    from app import DEFAULT_TEAM_ID
    return request.headers.get('X-Team-ID', DEFAULT_TEAM_ID)

def get_user_id():
    """Get user_id from request headers or use default for demo"""
    from app import DEFAULT_USER_ID
    return request.headers.get('X-User-ID', DEFAULT_USER_ID) 
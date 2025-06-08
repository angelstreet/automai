"""
Core API Routes

This module contains the core API endpoints for:
- Health check
"""

from flask import Blueprint, request, jsonify, current_app

# Import utility functions
from .utils import get_team_id

# Create blueprint
core_bp = Blueprint('core', __name__)

# =====================================================
# HEALTH CHECK ENDPOINT
# =====================================================

@core_bp.route('/api/health')
def health():
    """Health check endpoint"""
    supabase_status = "connected" if current_app.supabase_client else "disconnected"
    return jsonify({
        'status': 'ok',
        'supabase': supabase_status,
        'team_id': get_team_id()
    }) 

def check_supabase():
    """Helper function to check if Supabase is available"""
    supabase_client = getattr(current_app, 'supabase_client', None)
    if supabase_client is None:
        return jsonify({'error': 'Supabase not available'}), 503
    return None 
"""
Core API Routes

This module contains the core API endpoints for:
- Health check
"""

from flask import Blueprint, jsonify

# Import utility functions
import sys
import os

# Add parent directory to path for imports
src_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, src_dir)  # Insert at beginning to prioritize over local utils

from .utils import check_supabase, get_team_id

# Create blueprint
core_bp = Blueprint('core', __name__)

# =====================================================
# HEALTH CHECK ENDPOINT
# =====================================================

@core_bp.route('/api/health')
def health():
    """Health check endpoint"""
    from app import supabase_client
    supabase_status = "connected" if supabase_client else "disconnected"
    return jsonify({
        'status': 'ok',
        'supabase': supabase_status,
        'team_id': get_team_id()
    }) 
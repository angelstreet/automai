"""
Alerts Management Routes

This module contains the alerts management API endpoints for:
- Active alerts retrieval
- Closed alerts retrieval
- Alert filtering
"""

from flask import Blueprint, jsonify

# Import database functions from src/lib/supabase (uses absolute import)
from src.lib.supabase.alerts_db import (
    get_active_alerts,
    get_closed_alerts
)

from src.utils.app_utils import check_supabase, get_team_id

# Create blueprint
server_alerts_bp = Blueprint('server_alerts', __name__, url_prefix='/server/alerts')

# =====================================================
# ALERTS ENDPOINTS
# =====================================================

@server_alerts_bp.route('/getActiveAlerts', methods=['GET'])
def get_all_active_alerts():
    """Get all active alerts for the team"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        # Get active alerts from database
        result = get_active_alerts(team_id, limit=100)
        
        if result['success']:
            return jsonify(result['alerts'])
        else:
            return jsonify({'error': result.get('error', 'Failed to fetch active alerts')}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@server_alerts_bp.route('/getClosedAlerts', methods=['GET'])
def get_all_closed_alerts():
    """Get all closed/resolved alerts for the team"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        # Get closed alerts from database
        result = get_closed_alerts(team_id, limit=100)
        
        if result['success']:
            return jsonify(result['alerts'])
        else:
            return jsonify({'error': result.get('error', 'Failed to fetch closed alerts')}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500 
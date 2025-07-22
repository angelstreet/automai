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
    """Get all active alerts."""
    try:
        print("[@routes:server_alerts:getActiveAlerts] Getting active alerts")
        
        result = get_active_alerts()
        
        if result['success']:
            return jsonify({
                'success': True,
                'alerts': result['alerts'],
                'count': result['count']
            })
        else:
            return jsonify({
                'success': False,
                'error': result['error'],
                'alerts': [],
                'count': 0
            }), 500
            
    except Exception as e:
        print(f"[@routes:server_alerts:getActiveAlerts] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'alerts': [],
            'count': 0
        }), 500

@server_alerts_bp.route('/getClosedAlerts', methods=['GET'])
def get_all_closed_alerts():
    """Get all closed/resolved alerts."""
    try:
        print("[@routes:server_alerts:getClosedAlerts] Getting closed alerts")
        
        result = get_closed_alerts()
        
        if result['success']:
            return jsonify({
                'success': True,
                'alerts': result['alerts'],
                'count': result['count']
            })
        else:
            return jsonify({
                'success': False,
                'error': result['error'],
                'alerts': [],
                'count': 0
            }), 500
            
    except Exception as e:
        print(f"[@routes:server_alerts:getClosedAlerts] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'alerts': [],
            'count': 0
        }), 500 
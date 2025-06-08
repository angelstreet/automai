"""
Statistics Routes

This module contains the statistics API endpoints for:
- Dashboard statistics
"""

from flask import Blueprint, request, jsonify

# Import utility functions
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.supabase_utils import (
    get_all_test_cases, get_all_trees, get_all_campaigns, get_all_devices,
    get_all_controllers, get_all_environment_profiles
)
from .utils import check_supabase, get_team_id

# Create blueprint
stats_bp = Blueprint('stats', __name__)

def get_failure_rates(team_id):
    """Get failure rates for the team (placeholder implementation)"""
    # This would be implemented based on your actual failure tracking logic
    return {
        'overall': 5.2,
        'last_week': 3.8,
        'trend': 'improving'
    }

# =====================================================
# STATISTICS ENDPOINTS
# =====================================================

@stats_bp.route('/api/stats', methods=['GET'])
def stats():
    """Get statistics for the dashboard"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        test_cases = get_all_test_cases(team_id)
        trees = get_all_trees(team_id)
        campaigns = get_all_campaigns(team_id)
        devices = get_all_devices(team_id)
        controllers = get_all_controllers(team_id)
        environment_profiles = get_all_environment_profiles(team_id)
        failure_rates = get_failure_rates(team_id)
        
        return jsonify({
            'test_cases_count': len(test_cases),
            'trees_count': len(trees),
            'campaigns_count': len(campaigns),
            'devices_count': len(devices),
            'controllers_count': len(controllers),
            'environment_profiles_count': len(environment_profiles),
            'failure_rates': failure_rates,
            'recent_test_cases': test_cases[:5],  # Last 5 test cases
            'recent_campaigns': campaigns[:5],    # Last 5 campaigns
            'recent_devices': devices[:5]         # Last 5 devices
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500 
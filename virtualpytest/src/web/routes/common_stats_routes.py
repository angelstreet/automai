"""
Statistics Routes

This module contains the statistics API endpoints for:
- Dashboard statistics (mock data)
"""

from flask import Blueprint, jsonify

# Create blueprint
stats_bp = Blueprint('stats', __name__)

def get_failure_rates(team_id):
    """Get failure rates for the team (mock implementation)"""
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
    """Get statistics for the dashboard (mock data)"""
    try:
        # Mock data - no database connection needed
        team_id = "mock_team_id"
        
        # Return hardcoded mock statistics
        return jsonify({
            'test_cases_count': 42,
            'trees_count': 8,
            'campaigns_count': 15,
            'devices_count': 6,
            'controllers_count': 12,
            'environment_profiles_count': 4,
            'failure_rates': get_failure_rates(team_id),
            'recent_test_cases': [
                {'id': 1, 'name': 'Login Test', 'status': 'passed'},
                {'id': 2, 'name': 'Navigation Test', 'status': 'failed'},
                {'id': 3, 'name': 'Search Test', 'status': 'passed'},
                {'id': 4, 'name': 'Checkout Test', 'status': 'passed'},
                {'id': 5, 'name': 'Profile Test', 'status': 'pending'}
            ],
            'recent_campaigns': [
                {'id': 1, 'name': 'Smoke Tests', 'status': 'completed'},
                {'id': 2, 'name': 'Regression Suite', 'status': 'running'},
                {'id': 3, 'name': 'Mobile Tests', 'status': 'completed'},
                {'id': 4, 'name': 'API Tests', 'status': 'scheduled'},
                {'id': 5, 'name': 'Performance Tests', 'status': 'completed'}
            ],
            'recent_devices': [
                {'id': 1, 'name': 'Android TV Living Room', 'status': 'online'},
                {'id': 2, 'name': 'Samsung Galaxy S21', 'status': 'online'},
                {'id': 3, 'name': 'iPhone 13 Pro', 'status': 'offline'},
                {'id': 4, 'name': 'iPad Air', 'status': 'online'},
                {'id': 5, 'name': 'Pixel 6', 'status': 'online'}
            ]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500 
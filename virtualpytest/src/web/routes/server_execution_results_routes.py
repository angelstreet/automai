"""
Execution Results Management Routes

This module contains the execution results management API endpoints for:
- Execution results retrieval (edge actions and node verifications)
- Execution results filtering
"""

from flask import Blueprint, jsonify

# Import database functions from src/lib/supabase (uses absolute import)
from src.lib.supabase.execution_results_db import (
    get_execution_results
)

from src.utils.app_utils import check_supabase, get_team_id

# Create blueprint
server_execution_results_bp = Blueprint('server_execution_results', __name__, url_prefix='/server/execution-results')

# =====================================================
# EXECUTION RESULTS ENDPOINTS
# =====================================================

@server_execution_results_bp.route('/getAllExecutionResults', methods=['GET'])
def get_all_execution_results():
    """Get all execution results for the team"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        # Get execution results from database
        result = get_execution_results(team_id, limit=200)
        
        if result['success']:
            return jsonify(result['execution_results'])
        else:
            return jsonify({'error': result.get('error', 'Failed to fetch execution results')}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500 
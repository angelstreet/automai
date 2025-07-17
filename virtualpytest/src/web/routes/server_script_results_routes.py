"""
Script Results Management Routes

This module contains the script results management API endpoints for:
- Script results retrieval
- Script results filtering
"""

from flask import Blueprint, jsonify

# Import database functions from src/lib/supabase (uses absolute import)
from src.lib.supabase.script_results_db import (
    get_script_results
)

from src.utils.app_utils import check_supabase, get_team_id

# Create blueprint
server_script_results_bp = Blueprint('server_script_results', __name__, url_prefix='/server/script-results')

# =====================================================
# SCRIPT RESULTS ENDPOINTS
# =====================================================

@server_script_results_bp.route('/getAllScriptResults', methods=['GET'])
def get_all_script_results():
    """Get all script results for the team"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        # Get script results from database
        result = get_script_results(team_id, include_discarded=False, limit=100)
        
        if result['success']:
            return jsonify(result['script_results'])
        else:
            return jsonify({'error': result.get('error', 'Failed to fetch script results')}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500 
'''
Campaign API Routes

This module contains the API endpoints for managing campaigns.
'''

from flask import Blueprint, request, jsonify

# Import utility functions
import sys
import os

# Add parent directory to path for imports
src_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, src_dir)  # Insert at beginning to prioritize over local utils

from utils.supabase_utils import (
    get_all_campaigns, get_campaign, save_campaign, delete_campaign
)

from .utils import check_supabase, get_team_id

# Create blueprint
campaign_bp = Blueprint('campaign', __name__, url_prefix='/api')

# Helper functions (these should be imported from a shared module)
def get_user_id():
    '''Get user_id from request headers or use default for demo'''
    from app import DEFAULT_USER_ID
    return request.headers.get('X-User-ID', DEFAULT_USER_ID)

# =====================================================
# CAMPAIGNS ENDPOINTS
# =====================================================

@campaign_bp.route('/campaigns', methods=['GET', 'POST'])
def campaigns():
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    user_id = get_user_id()
    
    try:
        if request.method == 'GET':
            campaigns = get_all_campaigns(team_id)
            return jsonify(campaigns)
        elif request.method == 'POST':
            campaign = request.json
            save_campaign(campaign, team_id, user_id)
            return jsonify({'status': 'success', 'campaign_id': campaign['campaign_id']})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@campaign_bp.route('/campaigns/<campaign_id>', methods=['GET', 'PUT', 'DELETE'])
def campaign(campaign_id):
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    user_id = get_user_id()
    
    try:
        if request.method == 'GET':
            campaign = get_campaign(campaign_id, team_id)
            return jsonify(campaign if campaign else {})
        elif request.method == 'PUT':
            campaign = request.json
            campaign['campaign_id'] = campaign_id
            save_campaign(campaign, team_id, user_id)
            return jsonify({'status': 'success'})
        elif request.method == 'DELETE':
            success = delete_campaign(campaign_id, team_id)
            if success:
                return jsonify({'status': 'success'})
            else:
                return jsonify({'error': 'Campaign not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500 
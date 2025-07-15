"""
Campaign API Routes

This module contains the campaign management endpoints for:
- Creating campaigns
- Retrieving campaigns
- Updating campaigns
- Deleting campaigns
"""

from flask import Blueprint, request, jsonify, current_app

# Import utility functions
from src.utils.app_utils import get_team_id

# Import database functions from src/lib/supabase (uses absolute import)
from src.lib.supabase.campaign_db import (
    get_all_campaigns, get_campaign, save_campaign, delete_campaign
)

from src.utils.app_utils import check_supabase

# Create blueprint with abstract server campaign prefix
server_campaign_bp = Blueprint('server_campaign', __name__, url_prefix='/server/campaigns')

# Helper functions (these should be imported from a shared module)
def get_user_id():
    '''Get user_id from request headers - FAIL FAST if not provided'''
    user_id = request.headers.get('X-User-ID')
    if not user_id:
        raise ValueError('X-User-ID header is required but not provided')
    return user_id

# =====================================================
# CAMPAIGN ENDPOINTS WITH CONSISTENT NAMING
# =====================================================

@server_campaign_bp.route('/getAllCampaigns', methods=['GET'])
def get_all_campaigns_route():
    """Get all campaigns for a team"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        campaigns = get_all_campaigns(team_id)
        return jsonify(campaigns)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@server_campaign_bp.route('/getCampaign/<campaign_id>', methods=['GET'])
def get_campaign_route(campaign_id):
    """Get a specific campaign by ID"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        campaign = get_campaign(campaign_id, team_id)
        return jsonify(campaign if campaign else {})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@server_campaign_bp.route('/createCampaign', methods=['POST'])
def create_campaign_route():
    """Create a new campaign"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    user_id = get_user_id()
    
    try:
        campaign = request.json
        save_campaign(campaign, team_id, user_id)
        return jsonify({'status': 'success', 'campaign_id': campaign['campaign_id']})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@server_campaign_bp.route('/updateCampaign/<campaign_id>', methods=['PUT'])
def update_campaign_route(campaign_id):
    """Update an existing campaign"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    user_id = get_user_id()
    
    try:
        campaign = request.json
        campaign['campaign_id'] = campaign_id
        save_campaign(campaign, team_id, user_id)
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@server_campaign_bp.route('/deleteCampaign/<campaign_id>', methods=['DELETE'])
def delete_campaign_route(campaign_id):
    """Delete a campaign"""
    error = check_supabase()
    if error:
        return error
        
    team_id = get_team_id()
    
    try:
        success = delete_campaign(campaign_id, team_id)
        if success:
            return jsonify({'status': 'success'})
        else:
            return jsonify({'error': 'Campaign not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500 
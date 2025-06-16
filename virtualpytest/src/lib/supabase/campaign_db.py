"""
Campaign Database Operations

This module provides functions for managing campaigns in the database.
"""

import json
from datetime import datetime
from typing import Dict, List, Optional
from uuid import uuid4

from src.utils.supabase_utils import get_supabase_client

def get_supabase():
    """Get the Supabase client instance."""
    return get_supabase_client()

def save_campaign(campaign: Dict, team_id: str, creator_id: str = None) -> None:
    """Save campaign to Supabase campaigns table."""
    campaign['campaign_id'] = campaign.get('campaign_id', str(uuid4()))
    
    supabase = get_supabase()
    try:
        supabase.table('campaigns').insert({
            'campaign_id': campaign['campaign_id'],
            'name': campaign['name'],
            'description': campaign.get('description', ''),
            'test_case_ids': campaign.get('test_case_ids', []),
            'team_id': team_id,
            'creator_id': creator_id
        }).execute()
    except Exception:
        # Update existing campaign
        supabase.table('campaigns').update({
            'name': campaign['name'],
            'description': campaign.get('description', ''),
            'test_case_ids': campaign.get('test_case_ids', []),
            'updated_at': datetime.now().isoformat()
        }).eq('campaign_id', campaign['campaign_id']).eq('team_id', team_id).execute()

def get_campaign(campaign_id: str, team_id: str) -> Optional[Dict]:
    """Retrieve campaign by campaign_id from Supabase."""
    supabase = get_supabase()
    result = supabase.table('campaigns').select(
        'campaign_id', 'name', 'description', 'test_case_ids'
    ).eq('campaign_id', campaign_id).eq('team_id', team_id).execute()
    
    if result.data:
        campaign = dict(result.data[0])
        return campaign
    return None

def get_all_campaigns(team_id: str) -> List[Dict]:
    """Retrieve all campaigns for a team from Supabase."""
    supabase = get_supabase()
    result = supabase.table('campaigns').select(
        'campaign_id', 'name', 'description', 'test_case_ids'
    ).eq('team_id', team_id).execute()
    
    campaigns = []
    for campaign in result.data:
        campaign = dict(campaign)
        campaigns.append(campaign)
    return campaigns

def delete_campaign(campaign_id: str, team_id: str) -> bool:
    """Delete campaign from Supabase."""
    supabase = get_supabase()
    result = supabase.table('campaigns').delete().eq('campaign_id', campaign_id).eq('team_id', team_id).execute()
    return len(result.data) > 0 
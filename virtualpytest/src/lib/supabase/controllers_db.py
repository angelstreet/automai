"""
Controllers Database Operations

This module provides functions for managing controllers in the database.
Controllers define how devices are controlled during test execution.
"""

from datetime import datetime
from typing import Dict, List, Optional
from uuid import uuid4

from utils.supabase_utils import get_supabase_client

def get_supabase():
    """Get the Supabase client instance."""
    return get_supabase_client()

def save_controller(controller: Dict, team_id: str, creator_id: str = None) -> None:
    """Save controller to Supabase controllers table."""
    controller_id = controller.get('id', str(uuid4()))
    
    supabase = get_supabase()
    try:
        supabase.table('controllers').insert({
            'id': controller_id,
            'name': controller['name'],
            'type': controller['type'],
            'config': controller.get('config', {}),
            'device_id': controller.get('device_id'),
            'team_id': team_id
        }).execute()
    except Exception:
        # Update existing controller
        supabase.table('controllers').update({
            'name': controller['name'],
            'type': controller['type'],
            'config': controller.get('config', {}),
            'device_id': controller.get('device_id'),
            'updated_at': datetime.now().isoformat()
        }).eq('id', controller_id).eq('team_id', team_id).execute()

def get_controller(controller_id: str, team_id: str) -> Optional[Dict]:
    """Retrieve controller by controller_id from Supabase."""
    supabase = get_supabase()
    result = supabase.table('controllers').select(
        'id', 'name', 'type', 'config', 'device_id', 'created_at', 'updated_at'
    ).eq('id', controller_id).eq('team_id', team_id).execute()
    
    if result.data:
        return dict(result.data[0])
    return None

def get_all_controllers(team_id: str) -> List[Dict]:
    """Retrieve all controllers for a team from Supabase."""
    supabase = get_supabase()
    result = supabase.table('controllers').select(
        'id', 'name', 'type', 'config', 'device_id', 'created_at', 'updated_at'
    ).eq('team_id', team_id).order('created_at', desc=True).execute()
    
    return [dict(controller) for controller in result.data]

def delete_controller(controller_id: str, team_id: str) -> bool:
    """Delete controller from Supabase."""
    supabase = get_supabase()
    result = supabase.table('controllers').delete().eq('id', controller_id).eq('team_id', team_id).execute()
    return len(result.data) > 0 
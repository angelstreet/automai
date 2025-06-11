"""
Environment Profiles Database Operations

This module provides functions for managing environment profiles in the database.
Environment profiles define the configuration for test execution environments.
"""

from datetime import datetime
from typing import Dict, List, Optional
from uuid import uuid4

from src.utils.supabase_utils import get_supabase_client

def get_supabase():
    """Get the Supabase client instance."""
    return get_supabase_client()

def save_environment_profile(profile: Dict, team_id: str, creator_id: str = None) -> None:
    """Save environment profile to Supabase environment_profiles table."""
    profile_id = profile.get('id', str(uuid4()))
    
    supabase = get_supabase()
    try:
        supabase.table('environment_profiles').insert({
            'id': profile_id,
            'name': profile['name'],
            'device_id': profile['device_id'],
            'remote_controller_id': profile.get('remote_controller_id'),
            'av_controller_id': profile.get('av_controller_id'),
            'verification_controller_id': profile.get('verification_controller_id'),
            'team_id': team_id
        }).execute()
    except Exception:
        # Update existing profile
        supabase.table('environment_profiles').update({
            'name': profile['name'],
            'device_id': profile['device_id'],
            'remote_controller_id': profile.get('remote_controller_id'),
            'av_controller_id': profile.get('av_controller_id'),
            'verification_controller_id': profile.get('verification_controller_id'),
            'updated_at': datetime.now().isoformat()
        }).eq('id', profile_id).eq('team_id', team_id).execute()

def get_environment_profile(profile_id: str, team_id: str) -> Optional[Dict]:
    """Retrieve environment profile by profile_id from Supabase."""
    supabase = get_supabase()
    result = supabase.table('environment_profiles').select(
        'id', 'name', 'device_id', 'remote_controller_id', 
        'av_controller_id', 'verification_controller_id', 'created_at', 'updated_at'
    ).eq('id', profile_id).eq('team_id', team_id).execute()
    
    if result.data:
        return dict(result.data[0])
    return None

def get_all_environment_profiles(team_id: str) -> List[Dict]:
    """Retrieve all environment profiles for a team from Supabase."""
    supabase = get_supabase()
    result = supabase.table('environment_profiles').select(
        'id', 'name', 'device_id', 'remote_controller_id', 
        'av_controller_id', 'verification_controller_id', 'created_at', 'updated_at'
    ).eq('team_id', team_id).order('created_at', desc=True).execute()
    
    return [dict(profile) for profile in result.data]

def delete_environment_profile(profile_id: str, team_id: str) -> bool:
    """Delete environment profile from Supabase."""
    supabase = get_supabase()
    result = supabase.table('environment_profiles').delete().eq('id', profile_id).eq('team_id', team_id).execute()
    return len(result.data) > 0 
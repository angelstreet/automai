"""
Devices Database Operations

This module provides functions for managing devices in the database.
Devices represent the physical or virtual test targets.
"""

from datetime import datetime
from typing import Dict, List, Optional
from uuid import uuid4

from utils.supabase_utils import get_supabase_client

def get_supabase():
    """Get the Supabase client instance."""
    return get_supabase_client()

def save_device(device: Dict, team_id: str, creator_id: str = None) -> None:
    """Save device to Supabase devices table."""
    device_id = device.get('id', str(uuid4()))
    
    supabase = get_supabase()
    try:
        supabase.table('devices').insert({
            'id': device_id,
            'name': device['name'],
            'type': device['type'],
            'model': device.get('model', ''),
            'version': device.get('version', ''),
            'environment': device.get('environment', 'dev'),
            'connection_config': device.get('connection_config', {}),
            'status': device.get('status', 'offline'),
            'team_id': team_id
        }).execute()
    except Exception:
        # Update existing device
        supabase.table('devices').update({
            'name': device['name'],
            'type': device['type'],
            'model': device.get('model', ''),
            'version': device.get('version', ''),
            'environment': device.get('environment', 'dev'),
            'connection_config': device.get('connection_config', {}),
            'status': device.get('status', 'offline'),
            'updated_at': datetime.now().isoformat()
        }).eq('id', device_id).eq('team_id', team_id).execute()

def get_device(device_id: str, team_id: str) -> Optional[Dict]:
    """Retrieve device by device_id from Supabase."""
    supabase = get_supabase()
    result = supabase.table('devices').select(
        'id', 'name', 'type', 'model', 'version', 'environment', 
        'connection_config', 'status', 'created_at', 'updated_at'
    ).eq('id', device_id).eq('team_id', team_id).execute()
    
    if result.data:
        return dict(result.data[0])
    return None

def get_all_devices(team_id: str) -> List[Dict]:
    """Retrieve all devices for a team from Supabase."""
    supabase = get_supabase()
    result = supabase.table('devices').select(
        'id', 'name', 'type', 'model', 'version', 'environment', 
        'connection_config', 'status', 'created_at', 'updated_at'
    ).eq('team_id', team_id).order('created_at', desc=True).execute()
    
    return [dict(device) for device in result.data]

def delete_device(device_id: str, team_id: str) -> bool:
    """Delete device from Supabase."""
    supabase = get_supabase()
    result = supabase.table('devices').delete().eq('id', device_id).eq('team_id', team_id).execute()
    return len(result.data) > 0 
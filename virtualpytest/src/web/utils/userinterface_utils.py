"""
User Interface Database Utilities

This module provides functions for managing user interfaces in the database.
User interfaces define device compatibility and metadata for UI navigation trees.
"""

import json
import uuid
from datetime import datetime
from typing import Dict, List, Optional

from supabase_utils import get_supabase_client

def get_all_userinterfaces(team_id: str) -> List[Dict]:
    """Retrieve all user interfaces for a team from Supabase."""
    supabase = get_supabase_client()
    
    try:
        result = supabase.table('userinterfaces').select(
            'id', 'name', 'models', 'min_version', 'max_version', 'created_at', 'updated_at'
        ).eq('team_id', team_id).order('created_at', desc=False).execute()
        
        userinterfaces = []
        for interface in result.data:
            userinterfaces.append({
                'id': interface['id'],
                'name': interface['name'],
                'models': interface['models'] or [],
                'min_version': interface['min_version'] or '',
                'max_version': interface['max_version'] or '',
                'created_at': interface['created_at'],
                'updated_at': interface['updated_at']
            })
        
        return userinterfaces
    except Exception as e:
        print(f"❌ Error retrieving user interfaces: {e}")
        return []

def get_userinterface(interface_id: str, team_id: str) -> Optional[Dict]:
    """Retrieve a specific user interface by ID."""
    supabase = get_supabase_client()
    
    try:
        result = supabase.table('userinterfaces').select(
            'id', 'name', 'models', 'min_version', 'max_version', 'created_at', 'updated_at'
        ).eq('id', interface_id).eq('team_id', team_id).single().execute()
        
        if result.data:
            interface = result.data
            return {
                'id': interface['id'],
                'name': interface['name'],
                'models': interface['models'] or [],
                'min_version': interface['min_version'] or '',
                'max_version': interface['max_version'] or '',
                'created_at': interface['created_at'],
                'updated_at': interface['updated_at']
            }
        return None
    except Exception as e:
        print(f"❌ Error retrieving user interface {interface_id}: {e}")
        return None

def create_userinterface(interface_data: Dict, team_id: str) -> Optional[Dict]:
    """Create a new user interface."""
    supabase = get_supabase_client()
    
    try:
        # Prepare the data for insertion
        insert_data = {
            'name': interface_data['name'],
            'models': interface_data['models'],
            'min_version': interface_data.get('min_version', ''),
            'max_version': interface_data.get('max_version', ''),
            'team_id': team_id,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        # Fix: Use insert().execute() first, then select separately if needed
        result = supabase.table('userinterfaces').insert(insert_data).execute()
        
        if result.data and len(result.data) > 0:
            interface = result.data[0]
            return {
                'id': interface['id'],
                'name': interface['name'],
                'models': interface['models'] or [],
                'min_version': interface['min_version'] or '',
                'max_version': interface['max_version'] or '',
                'created_at': interface['created_at'],
                'updated_at': interface['updated_at']
            }
        return None
    except Exception as e:
        print(f"❌ Error creating user interface: {e}")
        return None

def update_userinterface(interface_id: str, interface_data: Dict, team_id: str) -> Optional[Dict]:
    """Update an existing user interface."""
    supabase = get_supabase_client()
    
    try:
        # Prepare the data for update
        update_data = {
            'name': interface_data['name'],
            'models': interface_data['models'],
            'min_version': interface_data.get('min_version', ''),
            'max_version': interface_data.get('max_version', ''),
            'updated_at': datetime.now().isoformat()
        }
        
        result = supabase.table('userinterfaces').update(update_data).eq('id', interface_id).eq('team_id', team_id).execute()
        
        if result.data and len(result.data) > 0:
            interface = result.data[0]
            return {
                'id': interface['id'],
                'name': interface['name'],
                'models': interface['models'] or [],
                'min_version': interface['min_version'] or '',
                'max_version': interface['max_version'] or '',
                'created_at': interface['created_at'],
                'updated_at': interface['updated_at']
            }
        return None
    except Exception as e:
        print(f"❌ Error updating user interface {interface_id}: {e}")
        return None

def delete_userinterface(interface_id: str, team_id: str) -> bool:
    """Delete a user interface."""
    supabase = get_supabase_client()
    
    try:
        result = supabase.table('userinterfaces').delete().eq('id', interface_id).eq('team_id', team_id).execute()
        return True
    except Exception as e:
        print(f"❌ Error deleting user interface {interface_id}: {e}")
        return False

def check_userinterface_name_exists(name: str, team_id: str, exclude_id: str = None) -> bool:
    """Check if a user interface name already exists in the team."""
    supabase = get_supabase_client()
    
    try:
        query = supabase.table('userinterfaces').select('id').eq('name', name).eq('team_id', team_id)
        
        if exclude_id:
            query = query.neq('id', exclude_id)
        
        result = query.execute()
        return len(result.data) > 0
    except Exception as e:
        print(f"❌ Error checking user interface name: {e}")
        return False 
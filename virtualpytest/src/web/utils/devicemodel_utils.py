"""
Device Model Database Utilities

This module provides functions for managing device models in the database.
Device models define hardware specifications and controller configurations for test automation.
"""

import json
import uuid
from typing import Dict, List, Optional

from supabase_utils import get_supabase_client

def get_all_devicemodels(team_id: str) -> List[Dict]:
    """Retrieve all device models for a team from Supabase."""
    supabase = get_supabase_client()
    
    try:
        result = supabase.table('device_models').select(
            'id', 'name', 'types', 'controllers', 'version', 'description', 'created_at', 'updated_at'
        ).eq('team_id', team_id).order('created_at', desc=False).execute()
        
        devicemodels = []
        for model in result.data:
            devicemodels.append({
                'id': model['id'],
                'name': model['name'],
                'types': model['types'] or [],
                'controllers': model['controllers'] or {'remote': '', 'av': '', 'network': '', 'power': ''},
                'version': model['version'] or '',
                'description': model['description'] or '',
                'created_at': model['created_at'],
                'updated_at': model['updated_at']
            })
        
        return devicemodels
    except Exception as e:
        print(f"❌ Error retrieving device models: {e}")
        return []

def get_devicemodel(model_id: str, team_id: str) -> Optional[Dict]:
    """Retrieve a specific device model by ID."""
    supabase = get_supabase_client()
    
    try:
        result = supabase.table('device_models').select(
            'id', 'name', 'types', 'controllers', 'version', 'description', 'created_at', 'updated_at'
        ).eq('id', model_id).eq('team_id', team_id).single().execute()
        
        if result.data:
            model = result.data
            return {
                'id': model['id'],
                'name': model['name'],
                'types': model['types'] or [],
                'controllers': model['controllers'] or {'remote': '', 'av': '', 'network': '', 'power': ''},
                'version': model['version'] or '',
                'description': model['description'] or '',
                'created_at': model['created_at'],
                'updated_at': model['updated_at']
            }
        return None
    except Exception as e:
        print(f"❌ Error retrieving device model {model_id}: {e}")
        return None

def create_devicemodel(model_data: Dict, team_id: str) -> Optional[Dict]:
    """Create a new device model."""
    supabase = get_supabase_client()
    
    try:
        # Prepare the data for insertion - let Supabase auto-generate id, created_at, updated_at
        insert_data = {
            'name': model_data['name'],
            'types': model_data['types'],
            'controllers': model_data['controllers'],
            'version': model_data.get('version', ''),
            'description': model_data.get('description', ''),
            'team_id': team_id
        }
        
        print(f"🔍 About to insert device model with data: {insert_data}")
        
        result = supabase.table('device_models').insert(insert_data).execute()
        
        print(f"🔍 Supabase insert result: {result}")
        print(f"🔍 Result data: {result.data}")
        print(f"🔍 Result count: {result.count if hasattr(result, 'count') else 'N/A'}")
        
        if result.data and len(result.data) > 0:
            model = result.data[0]
            print(f"✅ Successfully created device model with ID: {model.get('id', 'NO_ID')}")
            return {
                'id': model['id'],
                'name': model['name'],
                'types': model['types'] or [],
                'controllers': model['controllers'] or {'remote': '', 'av': '', 'network': '', 'power': ''},
                'version': model['version'] or '',
                'description': model['description'] or '',
                'created_at': model['created_at'],
                'updated_at': model['updated_at']
            }
        else:
            print(f"❌ No data returned from insert operation")
        return None
    except Exception as e:
        print(f"❌ Error creating device model: {e}")
        print(f"❌ Exception type: {type(e)}")
        if hasattr(e, 'details'):
            print(f"❌ Exception details: {e.details}")
        return None

def update_devicemodel(model_id: str, model_data: Dict, team_id: str) -> Optional[Dict]:
    """Update an existing device model."""
    supabase = get_supabase_client()
    
    try:
        # Prepare the data for update - let Supabase auto-update updated_at
        update_data = {
            'name': model_data['name'],
            'types': model_data['types'],
            'controllers': model_data['controllers'],
            'version': model_data.get('version', ''),
            'description': model_data.get('description', '')
        }
        
        result = supabase.table('device_models').update(update_data).eq('id', model_id).eq('team_id', team_id).execute()
        
        if result.data and len(result.data) > 0:
            model = result.data[0]
            return {
                'id': model['id'],
                'name': model['name'],
                'types': model['types'] or [],
                'controllers': model['controllers'] or {'remote': '', 'av': '', 'network': '', 'power': ''},
                'version': model['version'] or '',
                'description': model['description'] or '',
                'created_at': model['created_at'],
                'updated_at': model['updated_at']
            }
        return None
    except Exception as e:
        print(f"❌ Error updating device model {model_id}: {e}")
        return None

def delete_devicemodel(model_id: str, team_id: str) -> bool:
    """Delete a device model."""
    supabase = get_supabase_client()
    
    try:
        result = supabase.table('device_models').delete().eq('id', model_id).eq('team_id', team_id).execute()
        return True
    except Exception as e:
        print(f"❌ Error deleting device model {model_id}: {e}")
        return False

def check_devicemodel_name_exists(name: str, team_id: str, exclude_id: str = None) -> bool:
    """Check if a device model name already exists in the team."""
    supabase = get_supabase_client()
    
    try:
        query = supabase.table('device_models').select('id').eq('name', name).eq('team_id', team_id)
        
        if exclude_id:
            query = query.neq('id', exclude_id)
        
        result = query.execute()
        return len(result.data) > 0
    except Exception as e:
        print(f"❌ Error checking device model name: {e}")
        return False 
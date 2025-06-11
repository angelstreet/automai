"""
Device Models Database Operations

This module provides functions for managing device models in the database.
Device models define the types and capabilities of different device categories.
"""

from datetime import datetime
from typing import Dict, List, Optional

from src.utils.supabase_utils import get_supabase_client

def get_supabase():
    """Get the Supabase client instance."""
    return get_supabase_client()

def get_all_device_models(team_id: str) -> List[Dict]:
    """Retrieve all device models for a team from Supabase."""
    supabase = get_supabase()
    try:
        result = supabase.table('device_models').select(
            'id', 'name', 'type', 'controllers', 'updated_at'
        ).eq('team_id', team_id).order('created_at', desc=False).execute()
        
        models = []
        for model in result.data:
            models.append({
                'id': model['id'],
                'name': model['name'],
                'type': model['type'],
                'controllers': model.get('controllers', []),
                'team_id': model['team_id'],
                'created_at': model['created_at'],
                'updated_at': model['updated_at']
            })
        
        return models
    except Exception as e:
        print(f"[@db:device_models_db:get_all_device_models] Error: {e}")
        return []

def get_device_model(model_id: str, team_id: str) -> Optional[Dict]:
    """Retrieve a device model by ID and team ID from Supabase."""
    supabase = get_supabase()
    try:
        result = supabase.table('device_models').select(
            'id', 'name', 'description', 'device_type', 'capabilities', 'team_id', 'created_at', 'updated_at'
        ).eq('id', model_id).eq('team_id', team_id).single().execute()
        
        if result.data:
            model = result.data
            return {
                'id': model['id'],
                'name': model['name'],
                'type': model['type'],
                'controllers': model.get('controllers', []),
                'team_id': model['team_id'],
                'created_at': model['created_at'],
                'updated_at': model['updated_at']
            }
        return None
    except Exception as e:
        print(f"[@db:device_models_db:get_device_model] Error: {e}")
        return None

def create_device_model(model_data: Dict, team_id: str, creator_id: str = None) -> Optional[Dict]:
    """Create a new device model."""
    supabase = get_supabase()
    try:
        insert_data = {
            'name': model_data['name'],
            'type': model_data['type'],
            'controllers': model_data.get('controllers', []),
            'team_id': team_id,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        result = supabase.table('device_models').insert(insert_data).execute()
        
        if result.data and len(result.data) > 0:
            model = result.data[0]
            return {
                'id': model['id'],
                'name': model['name'],
                'type': model['type'],
                'controllers': model.get('controllers', []),
                'team_id': model['team_id'],
                'created_at': model['created_at'],
                'updated_at': model['updated_at']
            }
        return None
    except Exception as e:
        print(f"[@db:device_models_db:create_device_model] Error: {e}")
        return None

def update_device_model(model_id: str, model_data: Dict, team_id: str) -> Optional[Dict]:
    """Update an existing device model."""
    supabase = get_supabase()
    try:
        update_data = {
            'updated_at': datetime.now().isoformat()
        }
        
        if 'name' in model_data:
            update_data['name'] = model_data['name']
        if 'type' in model_data:
            update_data['type'] = model_data['type']
        if 'controllers' in model_data:
            update_data['controllers'] = model_data['controllers']
        
        result = supabase.table('device_models').update(update_data).eq('id', model_id).eq('team_id', team_id).execute()
        
        if result.data and len(result.data) > 0:
            model = result.data[0]
            return {
                'id': model['id'],
                'name': model['name'],
                'type': model['type'],
                'controllers': model.get('controllers', []),
                'team_id': model['team_id'],
                'created_at': model['created_at'],
                'updated_at': model['updated_at']
            }
        return None
    except Exception as e:
        print(f"[@db:device_models_db:update_device_model] Error: {e}")
        return None

def delete_device_model(model_id: str, team_id: str) -> bool:
    """Delete a device model."""
    supabase = get_supabase()
    try:
        result = supabase.table('device_models').delete().eq('id', model_id).eq('team_id', team_id).execute()
        return len(result.data) > 0
    except Exception as e:
        print(f"[@db:device_models_db:delete_device_model] Error: {e}")
        return False

def check_device_model_name_exists(name: str, team_id: str, exclude_id: str = None) -> bool:
    """Check if a device model name already exists for a team."""
    supabase = get_supabase()
    try:
        query = supabase.table('device_models').select('id').eq('name', name).eq('team_id', team_id)
        
        if exclude_id:
            query = query.neq('id', exclude_id)
        
        result = query.execute()
        return len(result.data) > 0
    except Exception as e:
        print(f"[@db:device_models_db:check_device_model_name] Error: {e}")
        return False 
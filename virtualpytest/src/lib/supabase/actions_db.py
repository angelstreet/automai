"""
Actions Database Operations - Clean and Simple

This module provides functions for managing action definitions in the database.
"""

from datetime import datetime
from typing import Dict, List, Optional

from src.utils.supabase_utils import get_supabase_client

def get_supabase():
    """Get the Supabase client instance."""
    return get_supabase_client()

def save_action(name: str, device_model: str, action_type: str, command: str, team_id: str, parameters: Dict = None, wait_time: int = None, requires_input: bool = False) -> Dict:
    """
    Save action definition to database.
    
    Args:
        name: Action name/identifier
        device_model: Device model (e.g., 'android_mobile')
        action_type: Action type ('adb', 'ui', 'gesture', etc.)
        command: The action command
        team_id: Team ID for RLS
        parameters: Additional parameters (optional)
        wait_time: Wait time in milliseconds (optional)
        requires_input: Whether action requires user input (optional)
        
    Returns:
        Dict: {'success': bool, 'action_id': str, 'error': str}
    """
    try:
        supabase = get_supabase()
        
        # Prepare action data
        action_data = {
            'name': name,
            'device_model': device_model,
            'action_type': action_type,
            'command': command,
            'team_id': team_id,
            'parameters': parameters,  # Store as JSONB directly
            'wait_time': wait_time,
            'requires_input': requires_input,
            'updated_at': datetime.now().isoformat()
        }
        
        print(f"[@db:actions:save_action] Saving action: {name} ({action_type}) for model: {device_model}")
        
        # Use upsert to handle duplicates (INSERT or UPDATE)
        result = supabase.table('actions').upsert(
            action_data,
            on_conflict='team_id,name,device_model,action_type'
        ).execute()
        
        if result.data:
            saved_action = result.data[0]
            print(f"[@db:actions:save_action] Successfully saved action: {saved_action['id']}")
            return {
                'success': True,
                'action_id': saved_action['id'],
                'action': saved_action
            }
        else:
            print(f"[@db:actions:save_action] No data returned from upsert")
            return {
                'success': False,
                'error': 'No data returned from database'
            }
            
    except Exception as e:
        print(f"[@db:actions:save_action] Error saving action: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }

def get_actions(team_id: str, action_type: str = None, device_model: str = None, name: str = None) -> Dict:
    """
    Get actions with optional filtering.
    
    Args:
        team_id: Team ID for RLS
        action_type: Filter by type ('adb', 'ui', 'gesture', etc.)
        device_model: Filter by device model
        name: Filter by name (partial match)
        
    Returns:
        Dict: {'success': bool, 'actions': List[Dict], 'error': str}
    """
    try:
        supabase = get_supabase()
        
        print(f"[@db:actions:get_actions] Getting actions with filters: type={action_type}, model={device_model}, name={name}")
        
        # Start with base query
        query = supabase.table('actions').select('*').eq('team_id', team_id)
        
        # Add filters
        if action_type:
            query = query.eq('action_type', action_type)
        if device_model:
            query = query.eq('device_model', device_model)
        if name:
            query = query.ilike('name', f'%{name}%')
        
        # Execute query with ordering
        result = query.order('created_at', desc=True).execute()
        
        print(f"[@db:actions:get_actions] Found {len(result.data)} actions")
        return {
            'success': True,
            'actions': result.data
        }
        
    except Exception as e:
        print(f"[@db:actions:get_actions] Error getting actions: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'actions': []
        }

def get_all_actions(team_id: str) -> Dict:
    """
    Get all actions for a team.
    
    Args:
        team_id: Team ID for RLS
        
    Returns:
        Dict: {'success': bool, 'actions': List[Dict], 'error': str}
    """
    try:
        supabase = get_supabase()
        
        print(f"[@db:actions:get_all_actions] Getting all actions for team: {team_id}")
        
        result = supabase.table('actions').select('*').eq('team_id', team_id).order('created_at', desc=True).execute()
        
        print(f"[@db:actions:get_all_actions] Found {len(result.data)} actions")
        return {
            'success': True,
            'actions': result.data
        }
        
    except Exception as e:
        print(f"[@db:actions:get_all_actions] Error getting actions: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'actions': []
        }

def delete_action(team_id: str, action_id: str = None, name: str = None, device_model: str = None, action_type: str = None) -> Dict:
    """
    Delete action by ID or by identifiers.
    
    Args:
        team_id: Team ID for RLS
        action_id: Action ID (if deleting by ID)
        name: Action name (if deleting by identifiers)
        device_model: Device model (if deleting by identifiers)
        action_type: Action type (if deleting by identifiers)
        
    Returns:
        Dict: {'success': bool, 'error': str}
    """
    try:
        supabase = get_supabase()
        
        if action_id:
            print(f"[@db:actions:delete_action] Deleting action by ID: {action_id}")
            result = supabase.table('actions').delete().eq('id', action_id).eq('team_id', team_id).execute()
        elif name and device_model and action_type:
            print(f"[@db:actions:delete_action] Deleting action: {name} ({action_type}) for model: {device_model}")
            result = supabase.table('actions').delete().eq('name', name).eq('device_model', device_model).eq('action_type', action_type).eq('team_id', team_id).execute()
        else:
            return {
                'success': False,
                'error': 'Must provide either action_id or name/device_model/action_type'
            }
        
        success = len(result.data) > 0
        if success:
            print(f"[@db:actions:delete_action] Successfully deleted action")
            return {'success': True}
        else:
            print(f"[@db:actions:delete_action] Action not found or already deleted")
            return {
                'success': False,
                'error': 'Action not found'
            }
        
    except Exception as e:
        print(f"[@db:actions:delete_action] Error deleting action: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        } 
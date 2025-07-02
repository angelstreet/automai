"""
Actions Database Operations - Clean and Simple

This module provides functions for managing action definitions in the database.
"""

import json
from datetime import datetime
from typing import Dict, List, Optional

from src.utils.supabase_utils import get_supabase_client

def get_supabase():
    """Get the Supabase client instance."""
    return get_supabase_client()

def find_existing_action(team_id: str, device_model: str, action_type: str, command: str, parameters: Dict = None) -> Dict:
    """
    Find existing action with the same parameters to avoid duplicates.
    
    Args:
        team_id: Team ID for RLS
        device_model: Device model (e.g., 'android_mobile')
        action_type: Action type ('remote', 'av', 'power', etc.)
        command: The action command
        parameters: JSONB parameters (optional)
        
    Returns:
        Dict: {'success': bool, 'action': Dict or None, 'error': str}
    """
    try:
        supabase = get_supabase()
        
        # Build query conditions
        query = supabase.table('actions').select('*').eq('team_id', team_id).eq('device_model', device_model).eq('action_type', action_type).eq('command', command)
        
        # Add params filter if provided
        if parameters:
            query = query.eq('params', json.dumps(parameters, sort_keys=True))
        
        result = query.execute()
        
        if result.data and len(result.data) > 0:
            # Found existing action
            existing_action = result.data[0]
            print(f"[@db:actions:find_existing_action] Found existing action: {existing_action['id']}")
            return {
                'success': True,
                'action': existing_action
            }
        else:
            # No existing action found
            print(f"[@db:actions:find_existing_action] No existing action found for: {command} ({action_type})")
            return {
                'success': True,
                'action': None
            }
            
    except Exception as e:
        print(f"[@db:actions:find_existing_action] Error finding existing action: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }

def save_action(name: str, device_model: str, action_type: str, command: str, team_id: str, params: Dict = None, requires_input: bool = False) -> Dict:
    """
    Save action definition to database.
    
    Args:
        name: Action name/identifier
        device_model: Device model (e.g., 'android_mobile')
        action_type: Action type ('remote', 'av', 'power', etc.)
        command: The action command
        team_id: Team ID for RLS
        params: JSONB parameters including wait_time, etc. (optional)
        requires_input: Whether action requires user input
        
    Returns:
        Dict: {'success': bool, 'action_id': str, 'action': Dict, 'reused': bool, 'error': str}
    """
    try:
        # First, check if an action with the same parameters already exists
        existing_result = find_existing_action(
            team_id=team_id,
            device_model=device_model,
            action_type=action_type,
            command=command,
            parameters=params
        )
        
        if not existing_result['success']:
            return existing_result
        
        if existing_result['action']:
            # Reuse existing action
            existing_action = existing_result['action']
            print(f"[@db:actions:save_action] Reusing existing action: {existing_action['id']}")
            return {
                'success': True,
                'action_id': existing_action['id'],
                'action': existing_action,
                'reused': True
            }
        
        # No existing action found, create a new one
        supabase = get_supabase()
        
        # Prepare action data - only store essential fields
        action_data = {
            'name': name,
            'device_model': device_model,
            'action_type': action_type,
            'command': command,
            'team_id': team_id,
            'params': params or {},  # Store as JSONB directly (includes wait_time, etc.)
            'requires_input': requires_input,
            'updated_at': datetime.now().isoformat()
        }
        
        print(f"[@db:actions:save_action] Creating new action: {name} ({action_type}) for model: {device_model}")
        
        # Use insert since we checked for duplicates already
        result = supabase.table('actions').insert(action_data).execute()
        
        if result.data:
            saved_action = result.data[0]
            print(f"[@db:actions:save_action] Successfully created action: {saved_action['id']}")
            return {
                'success': True,
                'action_id': saved_action['id'],
                'action': saved_action,
                'reused': False
            }
        else:
            print(f"[@db:actions:save_action] No data returned from insert")
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

def get_edges_using_action(team_id: str, action_id: str) -> Dict:
    """
    Get all edges that use a specific action.
    
    Args:
        team_id: Team ID for RLS
        action_id: Action ID to search for
        
    Returns:
        Dict: {'success': bool, 'edges': List[Dict], 'error': str}
    """
    try:
        supabase = get_supabase()
        
        print(f"[@db:actions:get_edges_using_action] Searching for edges using action: {action_id}")
        
        # Query navigation trees to find edges that reference this action
        result = supabase.table('navigation_trees').select('id, name, tree_data').eq('team_id', team_id).execute()
        
        edges_using_action = []
        
        for tree in result.data:
            tree_data = tree.get('tree_data', {})
            edges = tree_data.get('edges', [])
            
            for edge in edges:
                edge_data = edge.get('data', {})
                action_ids = edge_data.get('action_ids', [])
                retry_action_ids = edge_data.get('retry_action_ids', [])
                
                # Check if this action is used in main actions or retry actions
                if action_id in action_ids or action_id in retry_action_ids:
                    edge_info = {
                        'tree_id': tree['id'],
                        'tree_name': tree['name'],
                        'edge_id': edge.get('id'),
                        'edge_description': edge_data.get('description', ''),
                        'from_node': edge.get('source', ''),
                        'to_node': edge.get('target', ''),
                        'is_retry_action': action_id in retry_action_ids
                    }
                    edges_using_action.append(edge_info)
        
        print(f"[@db:actions:get_edges_using_action] Found {len(edges_using_action)} edges using action {action_id}")
        return {
            'success': True,
            'edges': edges_using_action
        }
        
    except Exception as e:
        print(f"[@db:actions:get_edges_using_action] Error: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'edges': []
        }

def update_action(team_id: str, action_id: str, updates: Dict) -> Dict:
    """
    Update an action.
    
    Args:
        team_id: Team ID for RLS
        action_id: Action ID to update
        updates: Dictionary of fields to update
        
    Returns:
        Dict: {'success': bool, 'updated_action': Dict, 'error': str}
    """
    try:
        supabase = get_supabase()
        
        # Add updated_at timestamp
        update_data = {
            **updates,
            'updated_at': datetime.now().isoformat()
        }
        
        print(f"[@db:actions:update_action] Updating action {action_id}")
        
        result = supabase.table('actions').update(update_data).eq('id', action_id).eq('team_id', team_id).execute()
        
        if result.data and len(result.data) > 0:
            print(f"[@db:actions:update_action] Successfully updated action {action_id}")
            return {
                'success': True,
                'updated_action': result.data[0]
            }
        else:
            return {
                'success': False,
                'error': 'Action not found or update failed'
            }
            
    except Exception as e:
        print(f"[@db:actions:update_action] Error: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }



 
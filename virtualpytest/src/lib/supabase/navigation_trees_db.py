"""
Navigation Trees Database Operations

This module provides functions for managing navigation trees in the database.
Navigation trees define the UI structure and flow for test automation.
"""

import json
from datetime import datetime
from typing import Dict, List, Optional
from uuid import uuid4

from src.utils.supabase_utils import get_supabase_client

def get_supabase():
    """Get the Supabase client instance."""
    return get_supabase_client()

def get_all_trees(team_id: str) -> List[Dict]:
    """Retrieve all navigation trees for a team from Supabase."""
    supabase = get_supabase()
    result = supabase.table('navigation_trees').select(
        'id', 'name', 'userinterface_id', 'team_id', 'root_tree_id', 'description', 'created_at', 'updated_at',
        'userinterfaces(id, name, models)'
    ).eq('team_id', team_id).order('created_at', desc=False).execute()
    
    trees = []
    for tree in result.data:
        trees.append({
            'id': tree['id'],
            'name': tree['name'],
            'userinterface_id': tree['userinterface_id'],
            'userinterface': tree['userinterfaces'],
            'team_id': tree['team_id'],
            'root_tree_id': tree['root_tree_id'],
            'description': tree['description'] or '',
            'created_at': tree['created_at'],
            'updated_at': tree['updated_at']
        })
    
    return trees

def get_tree(tree_id: str, team_id: str) -> Optional[Dict]:
    """Retrieve navigation tree by tree_id from Supabase."""
    supabase = get_supabase()
    try:
        result = supabase.table('navigation_trees').select('*').eq('id', tree_id).eq('team_id', team_id).single().execute()
        
        if result.data:
            tree = result.data
            return {
                'id': tree['id'],
                'name': tree['name'],
                'description': tree.get('description', ''),
                'is_root': tree.get('is_root', False),
                'userinterface_id': tree['userinterface_id'],
                'team_id': tree['team_id'],
                'metadata': tree.get('metadata', {}),
                'created_at': tree['created_at'],
                'updated_at': tree['updated_at']
            }
        return None
    except Exception as e:
        print(f"[@db:navigation_trees_db:get_tree] Error: {e}")
        return None

def save_tree(tree: Dict, team_id: str, creator_id: str = None) -> Optional[Dict]:
    """Save navigation tree to Supabase navigation_trees table."""
    supabase = get_supabase()
    try:
        # Prepare the data for insertion
        insert_data = {
            'name': tree['name'],
            'userinterface_id': tree.get('userinterface_id'),
            'team_id': team_id,
            'description': tree.get('description', ''),
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        # Include metadata if provided (for tree structure with nodes and edges)
        if 'metadata' in tree:
            insert_data['metadata'] = tree['metadata']
        elif 'tree_data' in tree:
            insert_data['metadata'] = tree['tree_data']
        
        # Set is_root flag if provided
        if 'is_root' in tree:
            insert_data['is_root'] = tree['is_root']
        elif tree.get('tree_data', {}).get('is_root') is not None:
            insert_data['is_root'] = tree.get('tree_data', {}).get('is_root')
        
        result = supabase.table('navigation_trees').insert(insert_data).execute()
        
        if result.data and len(result.data) > 0:
            tree_result = result.data[0]
            return {
                'id': tree_result['id'],
                'name': tree_result['name'],
                'userinterface_id': tree_result['userinterface_id'],
                'team_id': tree_result['team_id'],
                'root_tree_id': tree_result.get('root_tree_id'),
                'description': tree_result['description'] or '',
                'created_at': tree_result['created_at'],
                'updated_at': tree_result['updated_at'],
                'metadata': tree_result.get('metadata')
            }
        return None
    except Exception as e:
        print(f"[@db:navigation_trees_db:save_tree] Error creating tree: {e}")
        # Try update if insert failed
        try:
            tree_id = tree.get('id') or tree.get('tree_id')
            if tree_id:
                return update_tree(tree_id, tree, team_id)
        except Exception:
            pass
        return None

def update_tree(tree_id: str, tree_data: Dict, team_id: str) -> Optional[Dict]:
    """Update an existing navigation tree."""
    supabase = get_supabase()
    try:
        # Prepare the data for update
        update_data = {
            'updated_at': datetime.now().isoformat()
        }
        
        # Only update fields that are provided
        if 'name' in tree_data:
            update_data['name'] = tree_data['name']
        
        if 'userinterface_id' in tree_data:
            update_data['userinterface_id'] = tree_data['userinterface_id']
        
        if 'description' in tree_data:
            update_data['description'] = tree_data.get('description', '')
            
        # Include metadata if provided (for tree structure with nodes and edges)
        if 'metadata' in tree_data:
            update_data['metadata'] = tree_data['metadata']
        elif 'tree_data' in tree_data:
            update_data['metadata'] = tree_data['tree_data']
        
        result = supabase.table('navigation_trees').update(update_data).eq('id', tree_id).eq('team_id', team_id).execute()
        
        if result.data and len(result.data) > 0:
            tree = result.data[0]
            return {
                'id': tree['id'],
                'name': tree['name'],
                'userinterface_id': tree['userinterface_id'],
                'team_id': tree['team_id'],
                'root_tree_id': tree.get('root_tree_id'),
                'description': tree['description'] or '',
                'created_at': tree['created_at'],
                'updated_at': tree['updated_at'],
                'metadata': tree.get('metadata')
            }
        return None
    except Exception as e:
        print(f"[@db:navigation_trees_db:update_tree] Error updating tree {tree_id}: {e}")
        return None

def delete_tree(tree_id: str, team_id: str) -> bool:
    """Delete navigation tree from Supabase."""
    supabase = get_supabase()
    try:
        result = supabase.table('navigation_trees').delete().eq('id', tree_id).eq('team_id', team_id).execute()
        return len(result.data) > 0
    except Exception as e:
        print(f"[@db:navigation_trees_db:delete_tree] Error deleting tree {tree_id}: {e}")
        return False

def check_navigation_tree_name_exists(name: str, userinterface_id: str, team_id: str, exclude_id: str = None) -> bool:
    """Check if a navigation tree name already exists for a user interface."""
    supabase = get_supabase()
    try:
        query = supabase.table('navigation_trees').select('id').eq('name', name).eq('userinterface_id', userinterface_id).eq('team_id', team_id)
        
        if exclude_id:
            query = query.neq('id', exclude_id)
        
        result = query.execute()
        return len(result.data) > 0
    except Exception as e:
        print(f"[@db:navigation_trees_db:check_tree_name] Error: {e}")
        return False

def get_root_tree_for_interface(interface_id: str, team_id: str) -> Optional[Dict]:
    """Get the root navigation tree for a user interface."""
    supabase = get_supabase()
    try:
        result = supabase.table('navigation_trees').select('*').eq('userinterface_id', interface_id).eq('team_id', team_id).eq('is_root', True).single().execute()
        
        if result.data:
            tree = result.data
            return {
                'id': tree['id'],
                'name': tree['name'],
                'description': tree.get('description', ''),
                'is_root': tree.get('is_root', False),
                'userinterface_id': tree['userinterface_id'],
                'team_id': tree['team_id'],
                'metadata': tree.get('metadata', {}),
                'created_at': tree['created_at'],
                'updated_at': tree['updated_at']
            }
        return None
    except Exception as e:
        print(f"[@db:navigation_trees_db:get_root_tree] Error: {e}")
        return None 
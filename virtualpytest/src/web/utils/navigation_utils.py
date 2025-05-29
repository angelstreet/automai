"""
Navigation Database Utilities

This module provides functions for managing navigation trees, nodes, and edges in the database.
Navigation trees define the UI flow and remote control navigation for different user interfaces.
"""

import json
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import sys
import os

# Add src directory to path to import supabase_utils
current_dir = os.path.dirname(os.path.abspath(__file__))  # /src/web/utils
web_dir = os.path.dirname(current_dir)                    # /src/web  
src_dir = os.path.dirname(web_dir)                        # /src

# Add the main src directory to Python path
sys.path.insert(0, src_dir)
from utils.supabase_utils import get_supabase_client

# =====================================================
# NAVIGATION TREES MANAGEMENT
# =====================================================

def get_all_navigation_trees(team_id: str) -> List[Dict]:
    """Retrieve all navigation trees for a team from Supabase."""
    supabase = get_supabase_client()
    
    try:
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
    except Exception as e:
        print(f"[@utils:navigation:get_trees] Error retrieving navigation trees: {e}")
        return []

def get_navigation_tree(tree_id: str, team_id: str) -> Optional[Dict]:
    """Retrieve a navigation tree by ID and team ID from Supabase."""
    supabase = get_supabase_client()
    
    try:
        print(f"[@db:navigation_utils:get_tree] Attempting to retrieve tree: {tree_id} for team: {team_id}")
        
        # Execute the query with proper RLS filtering
        result = supabase.table('navigation_trees').select('*').eq('id', tree_id).eq('team_id', team_id).single().execute()
        
        if result.data:
            tree = result.data
            print(f"[@db:navigation_utils:get_tree] Retrieved tree: {tree['id']} for team: {team_id}")
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
        else:
            print(f"[@db:navigation_utils:get_tree] No tree found with ID: {tree_id} for team: {team_id}")
            return None
    except Exception as e:
        print(f"[@db:navigation_utils:get_tree] ERROR: Failed to fetch tree: {str(e)}")
        # Try to diagnose if the tree exists but with a different team_id
        try:
            check_result = supabase.table('navigation_trees').select('id, team_id').eq('id', tree_id).execute()
            if check_result.data and len(check_result.data) > 0:
                found_tree = check_result.data[0]
                found_team_id = found_tree.get('team_id')
                print(f"[@db:navigation_utils:get_tree] DIAGNOSIS: Tree {tree_id} exists but belongs to team {found_team_id}, not the requested team {team_id}")
            else:
                print(f"[@db:navigation_utils:get_tree] DIAGNOSIS: Tree {tree_id} does not exist in the database")
        except Exception as diag_error:
            print(f"[@db:navigation_utils:get_tree] DIAGNOSIS failed: {str(diag_error)}")
        
        return None

def create_navigation_tree(tree_data: Dict, team_id: str) -> Optional[Dict]:
    """Create a new navigation tree."""
    supabase = get_supabase_client()
    
    try:
        # Prepare the data for insertion
        insert_data = {
            'name': tree_data['name'],
            'userinterface_id': tree_data.get('userinterface_id'),
            'team_id': team_id,
            'description': tree_data.get('description', ''),
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        # Include metadata if provided (for tree structure with nodes and edges)
        if 'metadata' in tree_data:
            insert_data['metadata'] = tree_data['metadata']
        elif 'tree_data' in tree_data:
            insert_data['metadata'] = tree_data['tree_data']
        
        result = supabase.table('navigation_trees').insert(insert_data).execute()
        
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
        print(f"[@utils:navigation:create_tree] Error creating navigation tree: {e}")
        return None

def update_navigation_tree(tree_id: str, tree_data: Dict, team_id: str) -> Optional[Dict]:
    """Update an existing navigation tree."""
    supabase = get_supabase_client()
    
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
        print(f"[@utils:navigation:update_tree] Error updating navigation tree {tree_id}: {e}")
        return None

def delete_navigation_tree(tree_id: str, team_id: str) -> bool:
    """Delete a navigation tree and all its nodes and edges."""
    supabase = get_supabase_client()
    
    try:
        result = supabase.table('navigation_trees').delete().eq('id', tree_id).eq('team_id', team_id).execute()
        return True
    except Exception as e:
        print(f"❌ Error deleting navigation tree {tree_id}: {e}")
        return False

# =====================================================
# HELPER FUNCTIONS
# =====================================================

def check_navigation_tree_name_exists(name: str, userinterface_id: str, exclude_id: str = None) -> bool:
    """Check if a navigation tree name already exists for a user interface."""
    supabase = get_supabase_client()
    
    try:
        query = supabase.table('navigation_trees').select('id').eq('name', name).eq('userinterface_id', userinterface_id)
        
        if exclude_id:
            query = query.neq('id', exclude_id)
        
        result = query.execute()
        return len(result.data) > 0
    except Exception as e:
        print(f"❌ Error checking navigation tree name: {e}")
        return False

# =====================================================
# NOTE: REMOVED OBSOLETE DATABASE TABLE FUNCTIONS
# =====================================================
# The following functions have been removed because they tried to access
# non-existent navigation_nodes and navigation_edges tables:
# - convert_nodes_and_edges_to_reactflow 
# - convert_reactflow_to_nodes_and_edges
# - get_navigation_nodes_and_edges  
# - save_navigation_nodes_and_edges
#
# These functions are obsolete because:
# 1. The database schema only has navigation_trees table with metadata JSONB field
# 2. No separate navigation_nodes or navigation_edges tables exist
# 3. All data is stored in and loaded from the metadata field
# =====================================================

def get_root_tree_for_interface(interface_id: str, team_id: str) -> Optional[Dict]:
    """Retrieve the root navigation tree for a given user interface ID and team ID from Supabase."""
    supabase = get_supabase_client()
    
    try:
        result = supabase.table('navigation_trees').select('*').eq('userinterface_id', interface_id).eq('team_id', team_id).eq('is_root', True).single().execute()
        
        if result.data:
            tree = result.data
            print(f"[@db:navigation_utils:get_root_tree] Retrieved root tree: {tree['id']} for interface: {interface_id}")
            return {
                'id': tree['id'],
                'name': tree['name'],
                'description': tree.get('description', ''),
                'is_root': tree.get('is_root', False),
                'userinterface_id': tree.get('userinterface_id', ''),
                'team_id': tree.get('team_id', ''),
                'created_at': tree.get('created_at', ''),
                'updated_at': tree.get('updated_at', '')
            }
        else:
            print(f"[@db:navigation_utils:get_root_tree] No root tree found for interface: {interface_id}")
            return None
    except Exception as e:
        print(f"[@db:navigation_utils:get_root_tree] ERROR: Failed to retrieve root tree for interface {interface_id}: {str(e)}")
        return None 
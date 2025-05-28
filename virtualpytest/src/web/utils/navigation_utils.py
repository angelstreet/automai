"""
Navigation Database Utilities

This module provides functions for managing navigation trees, screens, and links in the database.
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
                'created_at': tree['created_at'],
                'updated_at': tree['updated_at']
            }
        else:
            print(f"[@db:navigation_utils:get_tree] No tree found with ID: {tree_id} for team: {team_id}")
            return None
    except Exception as e:
        print(f"[@db:navigation_utils:get_tree] ERROR: Failed to fetch tree: {str(e)}")
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
    """Delete a navigation tree and all its screens and links."""
    supabase = get_supabase_client()
    
    try:
        result = supabase.table('navigation_trees').delete().eq('id', tree_id).eq('team_id', team_id).execute()
        return True
    except Exception as e:
        print(f"❌ Error deleting navigation tree {tree_id}: {e}")
        return False

# =====================================================
# NAVIGATION SCREENS MANAGEMENT
# =====================================================

def get_navigation_screens(tree_id: str, level: Optional[int] = None) -> List[Dict]:
    """Retrieve all screens for a navigation tree, optionally filtered by level."""
    supabase = get_supabase_client()
    
    try:
        query = supabase.table('navigation_screens').select(
            'id', 'tree_id', 'userinterface_id', 'screen_name', 'screen_type', 'level', 
            'parent_screen_id', 'is_entry_point', 'position_x', 'position_y', 
            'screenshot_url', 'description', 'created_at', 'updated_at'
        ).eq('tree_id', tree_id)
        
        if level is not None:
            query = query.eq('level', level)
            
        result = query.order('level').order('position_x').order('position_y').execute()
        
        screens = []
        for screen in result.data:
            screens.append({
                'id': screen['id'],
                'tree_id': screen['tree_id'],
                'userinterface_id': screen['userinterface_id'],
                'screen_name': screen['screen_name'],
                'screen_type': screen['screen_type'],
                'level': screen['level'],
                'parent_screen_id': screen['parent_screen_id'],
                'is_entry_point': screen['is_entry_point'],
                'position_x': screen['position_x'],
                'position_y': screen['position_y'],
                'screenshot_url': screen['screenshot_url'],
                'description': screen['description'] or '',
                'created_at': screen['created_at'],
                'updated_at': screen['updated_at']
            })
        
        return screens
    except Exception as e:
        print(f"❌ Error retrieving navigation screens: {e}")
        return []

def create_navigation_screen(screen_data: Dict, tree_id: str, userinterface_id: str) -> Optional[Dict]:
    """Create a new navigation screen."""
    supabase = get_supabase_client()
    
    try:
        # Prepare the data for insertion
        insert_data = {
            'tree_id': tree_id,
            'userinterface_id': userinterface_id,
            'screen_name': screen_data['screen_name'],
            'screen_type': screen_data.get('screen_type', 'screen'),
            'level': screen_data.get('level', 0),
            'parent_screen_id': screen_data.get('parent_screen_id'),
            'is_entry_point': screen_data.get('is_entry_point', False),
            'position_x': screen_data.get('position_x', 0),
            'position_y': screen_data.get('position_y', 0),
            'screenshot_url': screen_data.get('screenshot_url'),
            'description': screen_data.get('description', ''),
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        result = supabase.table('navigation_screens').insert(insert_data).execute()
        
        if result.data and len(result.data) > 0:
            screen = result.data[0]
            return {
                'id': screen['id'],
                'tree_id': screen['tree_id'],
                'userinterface_id': screen['userinterface_id'],
                'screen_name': screen['screen_name'],
                'screen_type': screen['screen_type'],
                'level': screen['level'],
                'parent_screen_id': screen['parent_screen_id'],
                'is_entry_point': screen['is_entry_point'],
                'position_x': screen['position_x'],
                'position_y': screen['position_y'],
                'screenshot_url': screen['screenshot_url'],
                'description': screen['description'] or '',
                'created_at': screen['created_at'],
                'updated_at': screen['updated_at']
            }
        return None
    except Exception as e:
        print(f"❌ Error creating navigation screen: {e}")
        return None

def update_navigation_screen(screen_id: str, screen_data: Dict) -> Optional[Dict]:
    """Update an existing navigation screen."""
    supabase = get_supabase_client()
    
    try:
        # Prepare the data for update
        update_data = {
            'screen_name': screen_data['screen_name'],
            'screen_type': screen_data.get('screen_type', 'screen'),
            'level': screen_data.get('level', 0),
            'parent_screen_id': screen_data.get('parent_screen_id'),
            'is_entry_point': screen_data.get('is_entry_point', False),
            'position_x': screen_data.get('position_x', 0),
            'position_y': screen_data.get('position_y', 0),
            'screenshot_url': screen_data.get('screenshot_url'),
            'description': screen_data.get('description', ''),
            'updated_at': datetime.now().isoformat()
        }
        
        result = supabase.table('navigation_screens').update(update_data).eq('id', screen_id).execute()
        
        if result.data and len(result.data) > 0:
            screen = result.data[0]
            return {
                'id': screen['id'],
                'tree_id': screen['tree_id'],
                'userinterface_id': screen['userinterface_id'],
                'screen_name': screen['screen_name'],
                'screen_type': screen['screen_type'],
                'level': screen['level'],
                'parent_screen_id': screen['parent_screen_id'],
                'is_entry_point': screen['is_entry_point'],
                'position_x': screen['position_x'],
                'position_y': screen['position_y'],
                'screenshot_url': screen['screenshot_url'],
                'description': screen['description'] or '',
                'created_at': screen['created_at'],
                'updated_at': screen['updated_at']
            }
        return None
    except Exception as e:
        print(f"❌ Error updating navigation screen {screen_id}: {e}")
        return None

def delete_navigation_screen(screen_id: str) -> bool:
    """Delete a navigation screen and all its links."""
    supabase = get_supabase_client()
    
    try:
        result = supabase.table('navigation_screens').delete().eq('id', screen_id).execute()
        return True
    except Exception as e:
        print(f"❌ Error deleting navigation screen {screen_id}: {e}")
        return False

# =====================================================
# NAVIGATION LINKS MANAGEMENT
# =====================================================

def get_navigation_links(tree_id: str) -> List[Dict]:
    """Retrieve all navigation links for a tree."""
    supabase = get_supabase_client()
    
    try:
        result = supabase.table('navigation_links').select(
            'id', 'tree_id', 'userinterface_id', 'source_screen_id', 'target_screen_id',
            'link_type', 'go_key', 'comeback_key', 'direction', 'description', 'created_at', 'updated_at'
        ).eq('tree_id', tree_id).order('created_at').execute()
        
        links = []
        for link in result.data:
            links.append({
                'id': link['id'],
                'tree_id': link['tree_id'],
                'userinterface_id': link['userinterface_id'],
                'source_screen_id': link['source_screen_id'],
                'target_screen_id': link['target_screen_id'],
                'link_type': link['link_type'],
                'go_key': link['go_key'],
                'comeback_key': link['comeback_key'],
                'direction': link['direction'],
                'description': link['description'] or '',
                'created_at': link['created_at'],
                'updated_at': link['updated_at']
            })
        
        return links
    except Exception as e:
        print(f"❌ Error retrieving navigation links: {e}")
        return []

def create_navigation_link(link_data: Dict, tree_id: str, userinterface_id: str) -> Optional[Dict]:
    """Create a new navigation link."""
    supabase = get_supabase_client()
    
    try:
        # Prepare the data for insertion
        insert_data = {
            'tree_id': tree_id,
            'userinterface_id': userinterface_id,
            'source_screen_id': link_data['source_screen_id'],
            'target_screen_id': link_data['target_screen_id'],
            'link_type': link_data['link_type'],
            'go_key': link_data.get('go_key'),
            'comeback_key': link_data.get('comeback_key'),
            'direction': link_data.get('direction'),
            'description': link_data.get('description', ''),
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        result = supabase.table('navigation_links').insert(insert_data).execute()
        
        if result.data and len(result.data) > 0:
            link = result.data[0]
            return {
                'id': link['id'],
                'tree_id': link['tree_id'],
                'userinterface_id': link['userinterface_id'],
                'source_screen_id': link['source_screen_id'],
                'target_screen_id': link['target_screen_id'],
                'link_type': link['link_type'],
                'go_key': link['go_key'],
                'comeback_key': link['comeback_key'],
                'direction': link['direction'],
                'description': link['description'] or '',
                'created_at': link['created_at'],
                'updated_at': link['updated_at']
            }
        return None
    except Exception as e:
        print(f"❌ Error creating navigation link: {e}")
        return None

def update_navigation_link(link_id: str, link_data: Dict) -> Optional[Dict]:
    """Update an existing navigation link."""
    supabase = get_supabase_client()
    
    try:
        # Prepare the data for update
        update_data = {
            'source_screen_id': link_data['source_screen_id'],
            'target_screen_id': link_data['target_screen_id'],
            'link_type': link_data['link_type'],
            'go_key': link_data.get('go_key'),
            'comeback_key': link_data.get('comeback_key'),
            'direction': link_data.get('direction'),
            'description': link_data.get('description', ''),
            'updated_at': datetime.now().isoformat()
        }
        
        result = supabase.table('navigation_links').update(update_data).eq('id', link_id).execute()
        
        if result.data and len(result.data) > 0:
            link = result.data[0]
            return {
                'id': link['id'],
                'tree_id': link['tree_id'],
                'userinterface_id': link['userinterface_id'],
                'source_screen_id': link['source_screen_id'],
                'target_screen_id': link['target_screen_id'],
                'link_type': link['link_type'],
                'go_key': link['go_key'],
                'comeback_key': link['comeback_key'],
                'direction': link['direction'],
                'description': link['description'] or '',
                'created_at': link['created_at'],
                'updated_at': link['updated_at']
            }
        return None
    except Exception as e:
        print(f"❌ Error updating navigation link {link_id}: {e}")
        return None

def delete_navigation_link(link_id: str) -> bool:
    """Delete a navigation link."""
    supabase = get_supabase_client()
    
    try:
        result = supabase.table('navigation_links').delete().eq('id', link_id).execute()
        return True
    except Exception as e:
        print(f"❌ Error deleting navigation link {link_id}: {e}")
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

def get_tree_with_screens_and_links(tree_id: str, team_id: str, level: Optional[int] = None) -> Optional[Dict]:
    """Get a complete navigation tree with all its screens and links."""
    tree = get_navigation_tree(tree_id, team_id)
    if not tree:
        return None
    
    screens = get_navigation_screens(tree_id, level)
    links = get_navigation_links(tree_id)
    
    return {
        'tree': tree,
        'screens': screens,
        'links': links
    }

def get_root_tree_for_interface(interface_id: str, team_id: str) -> Optional[Dict]:
    """Retrieve the root navigation tree for a given user interface ID and team ID from Supabase."""
    supabase = get_supabase_client()
    
    try:
        result = supabase.table('navigation_trees').select('*').eq('user_interface_id', interface_id).eq('team_id', team_id).eq('is_root', True).single().execute()
        
        if result.data:
            tree = result.data
            print(f"[@db:navigation_utils:get_root_tree] Retrieved root tree: {tree['id']} for interface: {interface_id}")
            return {
                'id': tree['id'],
                'name': tree['name'],
                'description': tree.get('description', ''),
                'is_root': tree.get('is_root', False),
                'user_interface_id': tree.get('user_interface_id', ''),
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
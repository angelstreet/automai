"""
Navigation Trees Database Operations with History Support
"""

import json
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any
from uuid import uuid4

from src.utils.supabase_utils import get_supabase_client
from src.utils.app_utils import DEFAULT_TEAM_ID

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

def get_next_version_number(tree_id: str, supabase_client) -> int:
    """Get the next version number for a navigation tree"""
    try:
        result = supabase_client.table('navigation_trees_history')\
            .select('version_number')\
            .eq('tree_id', tree_id)\
            .order('version_number', desc=True)\
            .limit(1)\
            .execute()
        
        if result.data:
            return result.data[0]['version_number'] + 1
        return 1
    except Exception as e:
        print(f'[@db:navigation_trees:get_next_version_number] ERROR: {e}')
        return 1

def save_navigation_tree(userinterface_id: str, team_id: str, tree_data: Dict, 
                        description: str = None, creator_id: str = None, 
                        modification_type: str = 'update', changes_summary: str = None,
                        supabase_client=None) -> Tuple[bool, str, Optional[Dict]]:
    """
    Save navigation tree and create history record
    
    Args:
        userinterface_id: UI interface ID (primary identifier)
        team_id: Team ID
        tree_data: Complete navigation tree data (nodes, edges, etc.)
        description: Optional description
        creator_id: User who created/modified
        modification_type: 'create', 'update', 'restore'
        changes_summary: Description of changes
        supabase_client: Supabase client instance
    
    Returns:
        Tuple of (success, message, tree_record)
    """
    try:
        if not supabase_client:
            supabase_client = get_supabase()
        
        print(f'[@db:navigation_trees:save_navigation_tree] Starting save for userinterface_id: {userinterface_id}')
        
        # Check if tree exists (using userinterface_id as primary identifier)
        existing_result = supabase_client.table('navigation_trees')\
            .select('*')\
            .eq('userinterface_id', userinterface_id)\
            .eq('team_id', team_id)\
            .execute()
        
        tree_record = None
        is_new = len(existing_result.data) == 0
        
        if is_new:
            # Create new tree
            print(f'[@db:navigation_trees:save_navigation_tree] Creating new tree for userinterface_id: {userinterface_id}')
            insert_data = {
                'name': f'nav_tree_{userinterface_id}',  # Generate name from userinterface_id
                'userinterface_id': userinterface_id,
                'team_id': team_id,
                'metadata': tree_data,
                'description': description,
                # Removed creator_id - column doesn't exist in current schema
                # Removed is_root and tree_level - columns don't exist in current schema
            }
            
            result = supabase_client.table('navigation_trees')\
                .insert(insert_data)\
                .execute()
            
            if not result.data:
                return False, "Failed to create navigation tree", None
                
            tree_record = result.data[0]
            actual_modification_type = 'create'
        else:
            # Update existing tree
            tree_record = existing_result.data[0]
            print(f'[@db:navigation_trees:save_navigation_tree] Updating existing tree: {tree_record["id"]}')
            
            update_data = {
                'metadata': tree_data,
                'updated_at': 'now()',
                'description': description
            }
            
            result = supabase_client.table('navigation_trees')\
                .update(update_data)\
                .eq('id', tree_record['id'])\
                .execute()
            
            if not result.data:
                return False, "Failed to update navigation tree", None
                
            tree_record = result.data[0]
            actual_modification_type = modification_type
        
        # Create history record
        version_number = get_next_version_number(tree_record['id'], supabase_client)
        
        print(f'[@db:navigation_trees:save_navigation_tree] Creating history with creator_id: {creator_id} (type: {type(creator_id)})')
        
        history_data = {
            'tree_id': tree_record['id'],
            'team_id': team_id,
            'version_number': version_number,
            'modification_type': actual_modification_type,
            'modified_by': creator_id,
            'tree_data': tree_record,  # Complete snapshot
            'changes_summary': changes_summary or f'{actual_modification_type.title()} navigation tree'
        }
        
        history_result = supabase_client.table('navigation_trees_history')\
            .insert(history_data)\
            .execute()
        
        if not history_result.data:
            print(f'[@db:navigation_trees:save_navigation_tree] WARNING: Failed to create history record')
        else:
            print(f'[@db:navigation_trees:save_navigation_tree] Created history version {version_number}')
        
        print(f'[@db:navigation_trees:save_navigation_tree] Successfully saved tree: {tree_record["id"]}')
        return True, "Navigation tree saved successfully", tree_record
        
    except Exception as e:
        error_msg = f"Failed to save navigation tree: {str(e)}"
        print(f'[@db:navigation_trees:save_navigation_tree] ERROR: {error_msg}')
        return False, error_msg, None

def get_navigation_tree(tree_id: str, team_id: str, supabase_client=None) -> Tuple[bool, str, Optional[Dict]]:
    """Get a navigation tree by ID"""
    try:
        if not supabase_client:
            supabase_client = get_supabase()
        
        print(f'[@db:navigation_trees:get_navigation_tree] Fetching tree: {tree_id}')
        
        result = supabase_client.table('navigation_trees')\
            .select('*')\
            .eq('id', tree_id)\
            .eq('team_id', team_id)\
            .execute()
        
        if not result.data:
            return False, "Navigation tree not found", None
        
        tree = result.data[0]
        print(f'[@db:navigation_trees:get_navigation_tree] Successfully fetched tree: {tree["name"]}')
        
        # Automatically populate cache for navigation operations
        _populate_navigation_cache(tree, team_id)
        
        return True, "Success", tree
        
    except Exception as e:
        error_msg = f"Failed to get navigation tree: {str(e)}"
        print(f'[@db:navigation_trees:get_navigation_tree] ERROR: {error_msg}')
        return False, error_msg, None

def get_navigation_trees(team_id: str, userinterface_id: str = None, supabase_client=None) -> Tuple[bool, str, List[Dict]]:
    """Get all navigation trees for a team, optionally filtered by UI interface"""
    try:
        if not supabase_client:
            supabase_client = get_supabase()
        
        print(f'[@db:navigation_trees:get_navigation_trees] Fetching trees for team: {team_id}')
        
        query = supabase_client.table('navigation_trees')\
            .select('*')\
            .eq('team_id', team_id)\
            .order('updated_at', desc=True)
        
        if userinterface_id:
            query = query.eq('userinterface_id', userinterface_id)
        
        result = query.execute()
        
        trees = result.data or []
        print(f'[@db:navigation_trees:get_navigation_trees] Successfully fetched {len(trees)} trees')
        
        # Automatically populate cache for all loaded trees
        for tree in trees:
            _populate_navigation_cache(tree, team_id)
        
        return True, "Success", trees
        
    except Exception as e:
        error_msg = f"Failed to get navigation trees: {str(e)}"
        print(f'[@db:navigation_trees:get_navigation_trees] ERROR: {error_msg}')
        return False, error_msg, []

def get_tree_history(tree_id: str, team_id: str, limit: int = 50, supabase_client=None) -> Tuple[bool, str, List[Dict]]:
    """Get history for a navigation tree"""
    try:
        if not supabase_client:
            supabase_client = get_supabase()
        
        print(f'[@db:navigation_trees:get_tree_history] Fetching history for tree: {tree_id}')
        
        result = supabase_client.table('navigation_trees_history')\
            .select('id, version_number, modification_type, modified_by, changes_summary, created_at, restored_from_version')\
            .eq('tree_id', tree_id)\
            .eq('team_id', team_id)\
            .order('version_number', desc=True)\
            .limit(limit)\
            .execute()
        
        history = result.data or []
        print(f'[@db:navigation_trees:get_tree_history] Successfully fetched {len(history)} history records')
        return True, "Success", history
        
    except Exception as e:
        error_msg = f"Failed to get tree history: {str(e)}"
        print(f'[@db:navigation_trees:get_tree_history] ERROR: {error_msg}')
        return False, error_msg, []

def restore_tree_version(tree_id: str, version_number: int, team_id: str, 
                        restored_by: str = None, supabase_client=None) -> Tuple[bool, str, Optional[Dict]]:
    """Restore a navigation tree to a specific version"""
    try:
        if not supabase_client:
            supabase_client = get_supabase()
        
        print(f'[@db:navigation_trees:restore_tree_version] Restoring tree {tree_id} to version {version_number}')
        
        # Get the historical version
        history_result = supabase_client.table('navigation_trees_history')\
            .select('tree_data')\
            .eq('tree_id', tree_id)\
            .eq('team_id', team_id)\
            .eq('version_number', version_number)\
            .execute()
        
        if not history_result.data:
            return False, f"Version {version_number} not found", None
        
        historical_data = history_result.data[0]['tree_data']
        
        # Update current tree with historical data
        restore_data = {
            'name': historical_data['name'],
            'description': historical_data.get('description'),
            'metadata': historical_data['metadata'],
            'updated_at': 'now()'
        }
        
        result = supabase_client.table('navigation_trees')\
            .update(restore_data)\
            .eq('id', tree_id)\
            .eq('team_id', team_id)\
            .execute()
        
        if not result.data:
            return False, "Failed to restore navigation tree", None
        
        restored_tree = result.data[0]
        
        # Create history record for the restore
        new_version = get_next_version_number(tree_id, supabase_client)
        
        history_data = {
            'tree_id': tree_id,
            'team_id': team_id,
            'version_number': new_version,
            'modification_type': 'restore',
            'modified_by': restored_by,
            'tree_data': restored_tree,
            'changes_summary': f'Restored from version {version_number}',
            'restored_from_version': version_number
        }
        
        supabase_client.table('navigation_trees_history')\
            .insert(history_data)\
            .execute()
        
        print(f'[@db:navigation_trees:restore_tree_version] Successfully restored to version {version_number}')
        return True, f"Successfully restored to version {version_number}", restored_tree
        
    except Exception as e:
        error_msg = f"Failed to restore tree version: {str(e)}"
        print(f'[@db:navigation_trees:restore_tree_version] ERROR: {error_msg}')
        return False, error_msg, None

def delete_navigation_tree(tree_id: str, team_id: str, deleted_by: str = None, supabase_client=None) -> Tuple[bool, str]:
    """Delete a navigation tree (soft delete by creating history record)"""
    try:
        if not supabase_client:
            supabase_client = get_supabase()
        
        print(f'[@db:navigation_trees:delete_navigation_tree] Deleting tree: {tree_id}')
        
        # Get current tree data for history
        tree_result = supabase_client.table('navigation_trees')\
            .select('*')\
            .eq('id', tree_id)\
            .eq('team_id', team_id)\
            .execute()
        
        if not tree_result.data:
            return False, "Navigation tree not found"
        
        tree_data = tree_result.data[0]
        
        # Create deletion history record
        version_number = get_next_version_number(tree_id, supabase_client)
        
        history_data = {
            'tree_id': tree_id,
            'team_id': team_id,
            'version_number': version_number,
            'modification_type': 'delete',
            'modified_by': deleted_by,
            'tree_data': tree_data,
            'changes_summary': 'Navigation tree deleted'
        }
        
        supabase_client.table('navigation_trees_history')\
            .insert(history_data)\
            .execute()
        
        # Delete the actual tree
        result = supabase_client.table('navigation_trees')\
            .delete()\
            .eq('id', tree_id)\
            .eq('team_id', team_id)\
            .execute()
        
        print(f'[@db:navigation_trees:delete_navigation_tree] Successfully deleted tree: {tree_id}')
        return True, "Navigation tree deleted successfully"
        
    except Exception as e:
        error_msg = f"Failed to delete navigation tree: {str(e)}"
        print(f'[@db:navigation_trees:delete_navigation_tree] ERROR: {error_msg}')
        return False, error_msg 

def _populate_navigation_cache(tree: Dict, team_id: str):
    """
    Helper function to automatically populate navigation cache when tree is loaded
    This ensures cache is always available for navigation operations
    """
    try:
        # Import cache function (lazy import to avoid circular dependencies)
        from src.web.cache.navigation_cache import populate_cache
        
        tree_metadata = tree.get('metadata', {})
        nodes = tree_metadata.get('nodes', [])
        edges = tree_metadata.get('edges', [])
        
        if nodes:
            # Cache with tree ID, tree name, AND userinterface_name for maximum compatibility
            tree_id = tree['id']
            tree_name = tree['name']
            userinterface_id = tree.get('userinterface_id')
            
            # Populate cache with tree ID
            populate_cache(tree_id, team_id, nodes, edges)
            
            # Populate cache with tree name (always "root")
            populate_cache(tree_name, team_id, nodes, edges)
            
            # CRITICAL: Get userinterface name and populate cache for navigation requests
            if userinterface_id:
                try:
                    # Import userinterface database function
                    from src.lib.supabase.userinterface_db import get_userinterface
                    
                    # Get userinterface data to retrieve the name
                    userinterface = get_userinterface(userinterface_id, team_id)
                    if userinterface and userinterface.get('name'):
                        userinterface_name = userinterface['name']
                        
                        # Populate cache with userinterface name (this is what navigation uses!)
                        populate_cache(userinterface_name, team_id, nodes, edges)
                        
                        print(f'[@db:navigation_trees:_populate_navigation_cache] Auto-cached tree data for navigation - ID: {tree_id}, Name: {tree_name}, UserInterface: {userinterface_name}')
                    else:
                        print(f'[@db:navigation_trees:_populate_navigation_cache] Warning: Could not fetch userinterface name for ID: {userinterface_id}')
                        print(f'[@db:navigation_trees:_populate_navigation_cache] Auto-cached tree data for navigation - ID: {tree_id}, Name: {tree_name}')
                except Exception as ui_error:
                    print(f'[@db:navigation_trees:_populate_navigation_cache] Error fetching userinterface name: {ui_error}')
                    print(f'[@db:navigation_trees:_populate_navigation_cache] Auto-cached tree data for navigation - ID: {tree_id}, Name: {tree_name}')
            else:
                print(f'[@db:navigation_trees:_populate_navigation_cache] Warning: No userinterface_id found for tree: {tree_id}')
                print(f'[@db:navigation_trees:_populate_navigation_cache] Auto-cached tree data for navigation - ID: {tree_id}, Name: {tree_name}')
        else:
            print(f'[@db:navigation_trees:_populate_navigation_cache] No nodes to cache for tree: {tree["id"]}')
            
    except Exception as cache_error:
        print(f'[@db:navigation_trees:_populate_navigation_cache] Cache population failed: {cache_error}')
        # Don't fail the tree loading if caching fails 
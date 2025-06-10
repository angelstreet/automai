"""
Navigation Tree Database Utilities

This module provides functions for managing navigation trees in the database.
Navigation trees define the UI structure and flow for test automation.
"""

import json
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Tuple

from supabase_utils import get_supabase_client

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
        
        # Set is_root flag if provided in tree_data or inside tree_data.tree_data
        if 'is_root' in tree_data:
            insert_data['is_root'] = tree_data['is_root']
        elif tree_data.get('tree_data', {}).get('is_root') is not None:
            insert_data['is_root'] = tree_data.get('tree_data', {}).get('is_root')
        
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

def convert_nodes_and_edges_to_reactflow(nodes, edges):
    """Convert database nodes and edges to ReactFlow format"""
    try:
        print(f"[@utils:navigation:convert_nodes_and_edges_to_reactflow] Converting {len(nodes)} nodes and {len(edges)} edges")
        
        # Convert nodes
        reactflow_nodes = []
        for node in nodes:
            reactflow_node = {
                'id': node['id'],  # Use database primary key as ReactFlow ID
                'type': 'uiScreen',
                'position': {
                    'x': float(node['position_x']),
                    'y': float(node['position_y'])
                },
                'data': {
                    'label': node['label'],
                    'description': node.get('description', ''),
                    'type': node['node_type'],
                    'isEntryPoint': node.get('is_entry_point', False),
                    'isExitPoint': node.get('is_exit_point', False),
                    'hasChildren': node.get('has_children', False),
                    'childTreeId': node.get('child_tree_id'),
                    'screenshot': node.get('screenshot_url'),
                    'metadata': node.get('metadata', {})
                },
                'width': node.get('width', 200),
                'height': node.get('height', 120)
            }
            reactflow_nodes.append(reactflow_node)
        
        # Convert edges
        reactflow_edges = []
        for edge in edges:
            reactflow_edge = {
                'id': edge['id'],  # Use database primary key as ReactFlow ID
                'source': edge['source_id'],  # This should match a node's id
                'target': edge['target_id'],  # This should match a node's id
                'type': 'smoothstep',
                'data': {
                    'go': edge.get('go_action'),
                    'comeback': edge.get('comeback_action'),
                    'description': edge.get('description', ''),
                    'edgeType': edge.get('edge_type', 'navigation'),
                    'isBidirectional': edge.get('is_bidirectional', False),
                    'conditions': edge.get('conditions', {}),
                    'metadata': edge.get('metadata', {}),
                    'actions': edge.get('actions', []),
                    'retryActions': edge.get('retryActions', []),
                    'finalWaitTime': edge.get('finalWaitTime', 2000)
                }
            }
            reactflow_edges.append(reactflow_edge)
        
        print(f"[@utils:navigation:convert_nodes_and_edges_to_reactflow] Converted to {len(reactflow_nodes)} ReactFlow nodes and {len(reactflow_edges)} ReactFlow edges")
        return {
            'nodes': reactflow_nodes,
            'edges': reactflow_edges
        }
        
    except Exception as e:
        print(f"[@utils:navigation:convert_nodes_and_edges_to_reactflow] Error: {str(e)}")
        return {'nodes': [], 'edges': []}

def convert_reactflow_to_nodes_and_edges(reactflow_data, tree_id):
    """Convert ReactFlow format to database nodes and edges"""
    try:
        nodes_data = reactflow_data.get('nodes', [])
        edges_data = reactflow_data.get('edges', [])
        
        print(f"[@utils:navigation:convert_reactflow_to_nodes_and_edges] Converting {len(nodes_data)} ReactFlow nodes and {len(edges_data)} ReactFlow edges")
        
        # Convert nodes
        db_nodes = []
        for node in nodes_data:
            node_data = node.get('data', {})
            db_node = {
                'tree_id': tree_id,
                'label': node_data.get('label', ''),
                'node_type': node_data.get('type', 'screen'),
                'position_x': float(node['position']['x']),
                'position_y': float(node['position']['y']),
                'width': node.get('width', 200),
                'height': node.get('height', 120),
                'description': node_data.get('description'),
                'screenshot_url': node_data.get('screenshot'),
                'has_children': node_data.get('hasChildren', False),
                'child_tree_id': node_data.get('childTreeId'),
                'is_entry_point': node_data.get('isEntryPoint', False),
                'is_exit_point': node_data.get('isExitPoint', False),
                'metadata': node_data.get('metadata', {})
            }
            db_nodes.append(db_node)
        
        # Convert edges
        db_edges = []
        for edge in edges_data:
            edge_data = edge.get('data', {})
            db_edge = {
                'tree_id': tree_id,
                'source_id': edge['source'],
                'target_id': edge['target'],
                'edge_type': edge_data.get('edgeType', 'navigation'),
                'go_action': edge_data.get('go'),
                'comeback_action': edge_data.get('comeback'),
                'description': edge_data.get('description'),
                'is_bidirectional': edge_data.get('isBidirectional', False),
                'conditions': edge_data.get('conditions', {}),
                'metadata': edge_data.get('metadata', {}),
                'actions': edge_data.get('actions', []),
                'retryActions': edge_data.get('retryActions', []),
                'finalWaitTime': edge_data.get('finalWaitTime', 2000)
            }
            db_edges.append(db_edge)
        
        print(f"[@utils:navigation:convert_reactflow_to_nodes_and_edges] Converted to {len(db_nodes)} database nodes and {len(db_edges)} database edges")
        return db_nodes, db_edges
        
    except Exception as e:
        print(f"[@utils:navigation:convert_reactflow_to_nodes_and_edges] Error: {str(e)}")
        return [], []

def get_navigation_nodes_and_edges(tree_id, team_id):
    """Get navigation nodes and edges from tree metadata (single tree architecture)"""
    try:
        print(f"[@utils:navigation:get_navigation_nodes_and_edges] Getting nodes and edges for tree: {tree_id}")
        
        # Get the tree with its metadata containing nodes and edges
        tree_info = get_navigation_tree(tree_id, team_id)
        
        if not tree_info:
            print(f"[@utils:navigation:get_navigation_nodes_and_edges] Tree not found: {tree_id}")
            return [], []
        
        # Extract tree data from metadata field
        tree_data = tree_info.get('metadata', {})
        
        # Handle both old format (metadata) and new format (tree_data)
        if isinstance(tree_data, dict):
            nodes = tree_data.get('nodes', [])
            edges = tree_data.get('edges', [])
        else:
            print(f"[@utils:navigation:get_navigation_nodes_and_edges] Invalid tree_data format: {type(tree_data)}")
            nodes = []
            edges = []
        
        print(f"[@utils:navigation:get_navigation_nodes_and_edges] Found {len(nodes)} nodes and {len(edges)} edges in tree metadata")
        
        # DEBUG: Print node and edge details
        print(f"[@utils:navigation:get_navigation_nodes_and_edges] DEBUG: Node IDs:")
        for i, node in enumerate(nodes):
            node_id = node.get('id', 'NO_ID')
            node_data = node.get('data', {})
            label = node_data.get('label', 'NO_LABEL')
            print(f"  {i+1:2d}. {label} ({node_id})")
        
        print(f"[@utils:navigation:get_navigation_nodes_and_edges] DEBUG: Edge details:")
        for i, edge in enumerate(edges):
            source = edge.get('source', 'NO_SOURCE')
            target = edge.get('target', 'NO_TARGET')
            edge_data = edge.get('data', {})
            from_label = edge_data.get('from', 'NO_FROM')
            to_label = edge_data.get('to', 'NO_TO')
            print(f"  {i+1:2d}. {from_label} → {to_label} ({source} → {target})")
        
        return nodes, edges
        
    except Exception as e:
        print(f"[@utils:navigation:get_navigation_nodes_and_edges] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return [], []

def save_navigation_nodes_and_edges(tree_id, nodes, edges, team_id=None):
    """Save navigation nodes and edges to tree metadata (single tree architecture)"""
    try:
        print(f"[@utils:navigation:save_navigation_nodes_and_edges] Saving {len(nodes)} nodes and {len(edges)} edges for tree: {tree_id}")
        
        # Get the team_id from the tree if not provided
        if team_id is None:
            print(f"[@utils:navigation:save_navigation_nodes_and_edges] WARNING: No team_id provided, attempting to get it from the tree")
            tree_info = get_navigation_tree(tree_id, team_id='')  # This will fail if no team_id, but we need to get it
            if tree_info:
                team_id = tree_info.get('team_id')
                print(f"[@utils:navigation:save_navigation_nodes_and_edges] Retrieved team_id: {team_id} from tree: {tree_id}")
            else:
                print(f"[@utils:navigation:save_navigation_nodes_and_edges] ERROR: Could not find tree with ID: {tree_id}")
                return False
        
        # Prepare tree data in ReactFlow format
        tree_data = {
            'nodes': nodes,
            'edges': edges
        }
        
        # Update the tree's metadata with the new nodes and edges
        update_data = {
            'metadata': tree_data
        }
        
        # Use utility function to update navigation tree
        updated_tree = update_navigation_tree(tree_id, update_data, team_id)
        
        if updated_tree:
            print(f"[@utils:navigation:save_navigation_nodes_and_edges] Successfully saved {len(nodes)} nodes and {len(edges)} edges to tree metadata")
            
            # INVALIDATE CACHE after successful save
            try:
                from navigation_cache import invalidate_cache
                invalidate_cache(tree_id, team_id)
                print(f"[@utils:navigation:save_navigation_nodes_and_edges] Cache invalidated for tree: {tree_id}")
            except ImportError:
                print(f"[@utils:navigation:save_navigation_nodes_and_edges] Cache module not available, skipping cache invalidation")
            except Exception as cache_error:
                print(f"[@utils:navigation:save_navigation_nodes_and_edges] Warning: Failed to invalidate cache: {cache_error}")
            
            return True
        else:
            print(f"[@utils:navigation:save_navigation_nodes_and_edges] ERROR: Failed to update tree metadata")
            return False
        
    except Exception as e:
        print(f"[@utils:navigation:save_navigation_nodes_and_edges] Error: {str(e)}")
        print(f"[@utils:navigation:save_navigation_nodes_and_edges] Error details: Type={type(e)}, Traceback follows:")
        import traceback
        traceback.print_exc()
        return False

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
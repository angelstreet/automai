"""
Navigation graph caching system
Manages in-memory cache of NetworkX graphs for performance
"""

import networkx as nx
from datetime import datetime, timedelta
from typing import Dict, Optional, List
import sys
import os

# Global cache storage
_navigation_graphs_cache: Dict[str, nx.DiGraph] = {}
_cache_timestamps: Dict[str, datetime] = {}
_resolved_tree_data_cache: Dict[str, Dict] = {}  # Cache for resolved tree data (nodes + edges)

def get_cached_graph(tree_id: str, team_id: str, force_rebuild: bool = False) -> Optional[nx.DiGraph]:
    """
    Get cached NetworkX graph for a navigation tree
    
    Args:
        tree_id: Navigation tree ID (name or UUID)
        team_id: Team ID for security
        force_rebuild: Force rebuild even if cached
        
    Returns:
        NetworkX directed graph or None if not cached
    """
    cache_key = f"{tree_id}_{team_id}"
    
    # Return cached graph if available
    if cache_key in _navigation_graphs_cache and not force_rebuild:
        print(f"[@navigation:cache:get_cached_graph] Using cached NetworkX graph for tree: {tree_id}")
        return _navigation_graphs_cache[cache_key]
    
    # If not cached, return None - no database calls during navigation
    print(f"[@navigation:cache:get_cached_graph] No cached graph found for tree: {tree_id}")
    return None

def populate_cache(tree_id: str, team_id: str, nodes: List[Dict], edges: List[Dict]) -> Optional[nx.DiGraph]:
    """
    Populate cache with tree data (called when tree is first loaded)
    
    Args:
        tree_id: Navigation tree ID (name or UUID)
        team_id: Team ID for security
        nodes: Tree nodes data (with resolved verification objects)
        edges: Tree edges data (with resolved action objects)
        
    Returns:
        NetworkX directed graph or None if failed
    """
    cache_key = f"{tree_id}_{team_id}"
    
    try:
        print(f"[@navigation:cache:populate_cache] Building NetworkX graph for tree: {tree_id}")
        
        from src.web.cache.navigation_graph import create_networkx_graph
        
        if not nodes:
            print(f"[@navigation:cache:populate_cache] No nodes found for tree: {tree_id}")
            return None
            
        # Build NetworkX graph
        G = create_networkx_graph(nodes, edges)
        
        # Cache the NetworkX graph
        _navigation_graphs_cache[cache_key] = G
        _cache_timestamps[cache_key] = datetime.now()
        
        # Cache the resolved tree data (nodes and edges with resolved objects)
        _resolved_tree_data_cache[cache_key] = {
            'nodes': nodes,  # Resolved nodes with verification objects
            'edges': edges   # Resolved edges with action objects
        }
        
        print(f"[@navigation:cache:populate_cache] Successfully cached graph with {len(G.nodes)} nodes and {len(G.edges)} edges")
        print(f"[@navigation:cache:populate_cache] Successfully cached resolved tree data with {len(nodes)} nodes and {len(edges)} edges")
        
        # Log cache statistics
        print(f"[@navigation:cache:populate_cache] ===== CACHE STATISTICS =====")
        print(f"[@navigation:cache:populate_cache] Cache key: {cache_key}")
        print(f"[@navigation:cache:populate_cache] Total cached graphs: {len(_navigation_graphs_cache)}")
        print(f"[@navigation:cache:populate_cache] Total cached tree data: {len(_resolved_tree_data_cache)}")
        print(f"[@navigation:cache:populate_cache] All cache keys: {list(_navigation_graphs_cache.keys())}")
        
        # Log what transitions are now available for pathfinding
        print(f"[@navigation:cache:populate_cache] ===== CACHED TRANSITIONS AVAILABLE FOR PATHFINDING =====")
        for i, (from_node, to_node, edge_data) in enumerate(G.edges(data=True), 1):
            from_info = G.nodes[from_node]
            to_info = G.nodes[to_node]
            from_label = from_info.get('label', from_node)
            to_label = to_info.get('label', to_node)
            actions = edge_data.get('actions', [])
            action_count = len(actions) if actions else 0
            primary_action = edge_data.get('go_action', 'none')
            
            print(f"[@navigation:cache:populate_cache] Cached Transition {i:2d}: {from_label} → {to_label} (primary: {primary_action}, {action_count} actions)")
        
        print(f"[@navigation:cache:populate_cache] ===== END CACHED TRANSITIONS =====")
        
        return G
        
    except Exception as e:
        print(f"[@navigation:cache:populate_cache] Error building graph: {e}")
        return None

def invalidate_cache(tree_id: str, team_id: str = None):
    """
    Invalidate cache when tree is updated
    
    Args:
        tree_id: Navigation tree ID
        team_id: Team ID (optional, if None invalidates all teams for this tree)
    """
    if team_id:
        cache_key = f"{tree_id}_{team_id}"
        if cache_key in _navigation_graphs_cache:
            del _navigation_graphs_cache[cache_key]
            del _cache_timestamps[cache_key]
        if cache_key in _resolved_tree_data_cache:
            del _resolved_tree_data_cache[cache_key]
        print(f"[@navigation:cache:invalidate_cache] Invalidated cache for tree: {tree_id}, team: {team_id}")
    else:
        # Invalidate all caches for this tree_id (if team_id unknown)
        keys_to_remove = [k for k in _navigation_graphs_cache.keys() if k.startswith(f"{tree_id}_")]
        for key in keys_to_remove:
            if key in _navigation_graphs_cache:
                del _navigation_graphs_cache[key]
            if key in _cache_timestamps:
                del _cache_timestamps[key]
            if key in _resolved_tree_data_cache:
                del _resolved_tree_data_cache[key]
        print(f"[@navigation:cache:invalidate_cache] Invalidated {len(keys_to_remove)} cache entries for tree: {tree_id}")

def cleanup_old_caches(max_age_hours: int = 24):
    """
    Clean up old cached graphs to prevent memory bloat
    
    Args:
        max_age_hours: Maximum age of cached graphs in hours
    """
    cutoff = datetime.now() - timedelta(hours=max_age_hours)
    
    keys_to_remove = []
    for key, timestamp in _cache_timestamps.items():
        if timestamp < cutoff:
            keys_to_remove.append(key)
    
    for key in keys_to_remove:
        del _navigation_graphs_cache[key]
        del _cache_timestamps[key]
    
    if keys_to_remove:
        print(f"[@navigation:cache:cleanup_old_caches] Cleaned up {len(keys_to_remove)} old cached graphs")

def get_cache_stats() -> Dict:
    """
    Get cache statistics for monitoring
    
    Returns:
        Dictionary with cache statistics
    """
    return {
        'total_cached_graphs': len(_navigation_graphs_cache),
        'cache_keys': list(_navigation_graphs_cache.keys()),
        'oldest_cache': min(_cache_timestamps.values()) if _cache_timestamps else None,
        'newest_cache': max(_cache_timestamps.values()) if _cache_timestamps else None
    }

def clear_all_cache():
    """Clear all cached graphs (useful for debugging)"""
    global _navigation_graphs_cache, _cache_timestamps, _resolved_tree_data_cache
    count = len(_navigation_graphs_cache)
    _navigation_graphs_cache.clear()
    _cache_timestamps.clear()
    _resolved_tree_data_cache.clear()
    print(f"[@navigation:cache:clear_all_cache] Cleared {count} cached graphs and resolved tree data")

def force_refresh_cache(tree_id: str, team_id: str) -> bool:
    """
    Force refresh cache for a specific tree by invalidating and reloading
    
    Args:
        tree_id: Navigation tree ID
        team_id: Team ID for security
        
    Returns:
        True if cache was refreshed successfully
    """
    try:
        # Invalidate existing cache
        invalidate_cache(tree_id, team_id)
        
        # Try to reload tree data to populate cache
        try:
            from src.lib.supabase.navigation_trees_db import get_navigation_tree
            tree = get_navigation_tree(tree_id, team_id)
            if tree and tree.get('success'):
                print(f"[@navigation:cache:force_refresh_cache] Successfully refreshed cache for tree: {tree_id}")
                return True
            else:
                print(f"[@navigation:cache:force_refresh_cache] Failed to reload tree: {tree_id}")
                return False
        except Exception as e:
            print(f"[@navigation:cache:force_refresh_cache] Error reloading tree: {e}")
            return False
            
    except Exception as e:
        print(f"[@navigation:cache:force_refresh_cache] Error refreshing cache: {e}")
        return False

def get_cached_tree_data(tree_id: str, team_id: str) -> Optional[Dict]:
    """
    Get cached resolved tree data (nodes and edges with resolved objects)
    
    Args:
        tree_id: Navigation tree ID (name or UUID)
        team_id: Team ID for security
        
    Returns:
        Dictionary with 'nodes' and 'edges' containing resolved objects, or None if not cached
    """
    cache_key = f"{tree_id}_{team_id}"
    
    if cache_key in _resolved_tree_data_cache:
        print(f"[@navigation:cache:get_cached_tree_data] Using cached resolved tree data for tree: {tree_id}")
        return _resolved_tree_data_cache[cache_key]
    
    print(f"[@navigation:cache:get_cached_tree_data] No cached resolved tree data found for tree: {tree_id}")
    return None 
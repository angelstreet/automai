"""
Navigation graph caching system
Manages in-memory cache of NetworkX graphs for performance
"""

import networkx as nx
from datetime import datetime, timedelta
from typing import Dict, Optional
import sys
import os

# Global cache storage
_navigation_graphs_cache: Dict[str, nx.DiGraph] = {}
_cache_timestamps: Dict[str, datetime] = {}

def get_cached_graph(tree_id: str, team_id: str, force_rebuild: bool = False) -> Optional[nx.DiGraph]:
    """
    Get or build cached NetworkX graph for a navigation tree
    
    Args:
        tree_id: Navigation tree ID
        team_id: Team ID for security
        force_rebuild: Force rebuild even if cached
        
    Returns:
        NetworkX directed graph or None if failed
    """
    cache_key = f"{tree_id}_{team_id}"
    
    # TEMPORARY: Force rebuild to debug the issue
    force_rebuild = True
    
    # Check if we need to rebuild
    if force_rebuild or cache_key not in _navigation_graphs_cache:
        print(f"[@navigation:cache:get_cached_graph] Building NetworkX graph for tree: {tree_id}")
        
        # Import from centralized utils instead of obsolete navigation_utils
        from utils.supabase_utils import get_tree
        from navigation_graph import create_networkx_graph
        
        # Get fresh data from database
        tree_data = get_tree(tree_id, team_id)
        if not tree_data:
            print(f"[@navigation:cache:get_cached_graph] No tree data found for tree: {tree_id}")
            return None
            
        nodes = tree_data.get('metadata', {}).get('nodes', [])
        edges = tree_data.get('metadata', {}).get('edges', [])
        
        if not nodes:
            print(f"[@navigation:cache:get_cached_graph] No nodes found for tree: {tree_id}")
            return None
            
        # Build NetworkX graph
        try:
            G = create_networkx_graph(nodes, edges)
            
            # Cache it
            _navigation_graphs_cache[cache_key] = G
            _cache_timestamps[cache_key] = datetime.now()
            
            print(f"[@navigation:cache:get_cached_graph] Successfully cached graph with {len(G.nodes)} nodes and {len(G.edges)} edges")
            return G
            
        except Exception as e:
            print(f"[@navigation:cache:get_cached_graph] Error building graph: {e}")
            return None
    
    print(f"[@navigation:cache:get_cached_graph] Using cached NetworkX graph for tree: {tree_id}")
    return _navigation_graphs_cache[cache_key]

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
            print(f"[@navigation:cache:invalidate_cache] Invalidated cache for tree: {tree_id}, team: {team_id}")
    else:
        # Invalidate all caches for this tree_id (if team_id unknown)
        keys_to_remove = [k for k in _navigation_graphs_cache.keys() if k.startswith(f"{tree_id}_")]
        for key in keys_to_remove:
            del _navigation_graphs_cache[key]
            del _cache_timestamps[key]
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
    global _navigation_graphs_cache, _cache_timestamps
    count = len(_navigation_graphs_cache)
    _navigation_graphs_cache.clear()
    _cache_timestamps.clear()
    print(f"[@navigation:cache:clear_all_cache] Cleared {count} cached graphs") 
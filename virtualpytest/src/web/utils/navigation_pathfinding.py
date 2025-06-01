"""
Pathfinding algorithms for navigation trees
Uses NetworkX for shortest path calculations
"""

import networkx as nx
from typing import List, Dict, Optional

def find_shortest_path(tree_id: str, target_node_id: str, team_id: str, start_node_id: str = None) -> Optional[List[Dict]]:
    """
    Find shortest path to target node using NetworkX algorithms
    
    Args:
        tree_id: Navigation tree ID
        target_node_id: Target node to navigate to
        team_id: Team ID for security
        start_node_id: Starting node (if None, uses entry point)
        
    Returns:
        List of navigation steps or None if no path found
    """
    print(f"[@navigation:pathfinding:find_shortest_path] Finding path to node {target_node_id} in tree {tree_id}")
    
    # Get cached NetworkX graph
    from ..cache.navigation_cache import get_cached_graph
    from ..cache.navigation_graph import get_entry_points, get_node_info, get_edge_action
    
    G = get_cached_graph(tree_id, team_id)
    if not G:
        print(f"[@navigation:pathfinding:find_shortest_path] Failed to get graph for tree {tree_id}")
        return None
    
    # Determine starting node
    if not start_node_id:
        entry_points = get_entry_points(G)
        if not entry_points:
            print(f"[@navigation:pathfinding:find_shortest_path] No entry points found in tree {tree_id}")
            return None
        start_node_id = entry_points[0]
        print(f"[@navigation:pathfinding:find_shortest_path] Using entry point as start: {start_node_id}")
    
    # Check if target node exists
    if target_node_id not in G.nodes:
        print(f"[@navigation:pathfinding:find_shortest_path] Target node {target_node_id} not found in graph")
        return None
    
    # Check if we're already at the target
    if start_node_id == target_node_id:
        print(f"[@navigation:pathfinding:find_shortest_path] Already at target node {target_node_id}")
        return []
    
    try:
        # Use NetworkX shortest path algorithm
        path = nx.shortest_path(G, start_node_id, target_node_id)
        print(f"[@navigation:pathfinding:find_shortest_path] Found path with {len(path)} nodes: {path}")
        
        # Convert path to navigation steps
        navigation_steps = []
        for i in range(len(path) - 1):
            from_node = path[i]
            to_node = path[i + 1]
            
            # Get node information
            from_node_info = get_node_info(G, from_node)
            to_node_info = get_node_info(G, to_node)
            
            # Get navigation action
            action = get_edge_action(G, from_node, to_node)
            
            step = {
                'step_number': i + 1,
                'from_node_id': from_node,
                'to_node_id': to_node,
                'from_node_label': from_node_info.get('label', '') if from_node_info else '',
                'to_node_label': to_node_info.get('label', '') if to_node_info else '',
                'action': action,
                'description': f"Navigate from '{from_node_info.get('label', from_node)}' to '{to_node_info.get('label', to_node)}'"
            }
            
            navigation_steps.append(step)
        
        print(f"[@navigation:pathfinding:find_shortest_path] Generated {len(navigation_steps)} navigation steps")
        return navigation_steps
        
    except nx.NetworkXNoPath:
        print(f"[@navigation:pathfinding:find_shortest_path] No path found from {start_node_id} to {target_node_id}")
        return None
    except Exception as e:
        print(f"[@navigation:pathfinding:find_shortest_path] Error finding path: {e}")
        return None

def get_navigation_steps(tree_id: str, target_node_id: str, team_id: str, current_node_id: str = None) -> List[Dict]:
    """
    Get step-by-step navigation instructions with detailed information
    
    Args:
        tree_id: Navigation tree ID
        target_node_id: Target node to navigate to
        team_id: Team ID for security
        current_node_id: Current position (if None, uses entry point)
        
    Returns:
        List of detailed navigation steps
    """
    print(f"[@navigation:pathfinding:get_navigation_steps] Getting detailed steps to {target_node_id}")
    
    # Find the path
    steps = find_shortest_path(tree_id, target_node_id, team_id, current_node_id)
    
    if not steps:
        return []
    
    # Enhance steps with additional information
    from ..cache.navigation_cache import get_cached_graph
    from ..cache.navigation_graph import get_node_info
    
    G = get_cached_graph(tree_id, team_id)
    if not G:
        return steps
    
    enhanced_steps = []
    for step in steps:
        # Get detailed node information
        from_node_info = get_node_info(G, step['from_node_id'])
        to_node_info = get_node_info(G, step['to_node_id'])
        
        # Get edge information
        edge_data = G.edges[step['from_node_id'], step['to_node_id']] if G.has_edge(step['from_node_id'], step['to_node_id']) else {}
        
        enhanced_step = {
            **step,
            'from_node': {
                'id': step['from_node_id'],
                'label': from_node_info.get('label', '') if from_node_info else '',
                'type': from_node_info.get('node_type', '') if from_node_info else '',
                'description': from_node_info.get('description', '') if from_node_info else '',
                'screenshot_url': from_node_info.get('screenshot_url') if from_node_info else None
            },
            'to_node': {
                'id': step['to_node_id'],
                'label': to_node_info.get('label', '') if to_node_info else '',
                'type': to_node_info.get('node_type', '') if to_node_info else '',
                'description': to_node_info.get('description', '') if to_node_info else '',
                'screenshot_url': to_node_info.get('screenshot_url') if to_node_info else None
            },
            'edge': {
                'action': edge_data.get('go_action'),
                'type': edge_data.get('edge_type', ''),
                'description': edge_data.get('description', ''),
                'conditions': edge_data.get('conditions', {}),
                'is_bidirectional': edge_data.get('is_bidirectional', False)
            }
        }
        
        enhanced_steps.append(enhanced_step)
    
    return enhanced_steps

def find_entry_point(tree_id: str, team_id: str) -> Optional[str]:
    """
    Find the entry/root node of a navigation tree
    
    Args:
        tree_id: Navigation tree ID
        team_id: Team ID for security
        
    Returns:
        Entry point node ID or None if not found
    """
    from ..cache.navigation_cache import get_cached_graph
    from ..cache.navigation_graph import get_entry_points
    
    G = get_cached_graph(tree_id, team_id)
    if not G:
        return None
    
    entry_points = get_entry_points(G)
    if entry_points:
        return entry_points[0]
    
    # Fallback: return first node if no entry point is marked
    nodes = list(G.nodes())
    return nodes[0] if nodes else None

def find_all_paths(tree_id: str, target_node_id: str, team_id: str, start_node_id: str = None, max_paths: int = 3) -> List[List[Dict]]:
    """
    Find multiple paths to target node (useful for alternatives)
    
    Args:
        tree_id: Navigation tree ID
        target_node_id: Target node to navigate to
        team_id: Team ID for security
        start_node_id: Starting node (if None, uses entry point)
        max_paths: Maximum number of paths to return
        
    Returns:
        List of path options, each path is a list of navigation steps
    """
    print(f"[@navigation:pathfinding:find_all_paths] Finding up to {max_paths} paths to {target_node_id}")
    
    from ..cache.navigation_cache import get_cached_graph
    from ..cache.navigation_graph import get_entry_points, get_node_info, get_edge_action
    
    G = get_cached_graph(tree_id, team_id)
    if not G:
        return []
    
    # Determine starting node
    if not start_node_id:
        entry_points = get_entry_points(G)
        if not entry_points:
            return []
        start_node_id = entry_points[0]
    
    try:
        # Find all simple paths (no cycles)
        all_paths = list(nx.all_simple_paths(G, start_node_id, target_node_id))
        
        # Sort by length and take the shortest ones
        all_paths.sort(key=len)
        selected_paths = all_paths[:max_paths]
        
        path_options = []
        for path in selected_paths:
            navigation_steps = []
            for i in range(len(path) - 1):
                from_node = path[i]
                to_node = path[i + 1]
                
                from_node_info = get_node_info(G, from_node)
                to_node_info = get_node_info(G, to_node)
                action = get_edge_action(G, from_node, to_node)
                
                step = {
                    'step_number': i + 1,
                    'from_node_id': from_node,
                    'to_node_id': to_node,
                    'from_node_label': from_node_info.get('label', '') if from_node_info else '',
                    'to_node_label': to_node_info.get('label', '') if to_node_info else '',
                    'action': action,
                    'description': f"Navigate from '{from_node_info.get('label', from_node)}' to '{to_node_info.get('label', to_node)}'"
                }
                navigation_steps.append(step)
            
            path_options.append(navigation_steps)
        
        print(f"[@navigation:pathfinding:find_all_paths] Found {len(path_options)} path options")
        return path_options
        
    except Exception as e:
        print(f"[@navigation:pathfinding:find_all_paths] Error finding paths: {e}")
        return []

def get_reachable_nodes(tree_id: str, team_id: str, from_node_id: str = None) -> List[str]:
    """
    Get all nodes reachable from a given starting point
    
    Args:
        tree_id: Navigation tree ID
        team_id: Team ID for security
        from_node_id: Starting node (if None, uses entry point)
        
    Returns:
        List of reachable node IDs
    """
    from ..cache.navigation_cache import get_cached_graph
    from ..cache.navigation_graph import get_entry_points
    
    G = get_cached_graph(tree_id, team_id)
    if not G:
        return []
    
    if not from_node_id:
        entry_points = get_entry_points(G)
        if not entry_points:
            return []
        from_node_id = entry_points[0]
    
    if from_node_id not in G.nodes:
        return []
    
    # Get all descendants (reachable nodes)
    reachable = nx.descendants(G, from_node_id)
    reachable.add(from_node_id)  # Include the starting node
    
    return list(reachable) 
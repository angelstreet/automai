"""
Pathfinding algorithms for navigation trees
Uses NetworkX for shortest path calculations
"""

import networkx as nx
from typing import List, Dict, Optional, Tuple

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
    print(f"[@navigation:pathfinding:find_shortest_path] Finding path to node {target_node_id}")
    
    # Get cached NetworkX graph
    from src.web.cache.navigation_cache import get_cached_graph
    from src.web.cache.navigation_graph import get_entry_points, get_node_info
    
    G = get_cached_graph(tree_id, team_id)
    if not G:
        print(f"[@navigation:pathfinding:find_shortest_path] Failed to get graph for tree {tree_id}")
        return None
    
    # Determine starting node
    actual_start_node = start_node_id
    if not actual_start_node:
        entry_points = get_entry_points(G)
        
        if not entry_points:
            print(f"[@navigation:pathfinding:find_shortest_path] No entry points found, using first node")
            nodes = list(G.nodes())
            if not nodes:
                print(f"[@navigation:pathfinding:find_shortest_path] No nodes in graph")
                return None
            actual_start_node = nodes[0]
        else:
            # Prioritize dedicated entry node over home node
            dedicated_entry = None
            for entry_id in entry_points:
                entry_info = get_node_info(G, entry_id)
                if entry_info and entry_info.get('node_type') == 'entry':
                    dedicated_entry = entry_id
                    break
            
            actual_start_node = dedicated_entry if dedicated_entry else entry_points[0]
    
    # Check if start node exists
    if actual_start_node not in G.nodes:
        print(f"[@navigation:pathfinding:find_shortest_path] ERROR: Start node {actual_start_node} not found in graph")
        return None
    
    # Check if target node exists
    if target_node_id not in G.nodes:
        print(f"[@navigation:pathfinding:find_shortest_path] ERROR: Target node {target_node_id} not found in graph")
        return None
    

    
    # Check if we're already at the target
    if actual_start_node == target_node_id:
        print(f"[@navigation:pathfinding:find_shortest_path] Already at target node {target_node_id}")
        return []
    
    try:
        # Use NetworkX shortest path algorithm
        path = nx.shortest_path(G, actual_start_node, target_node_id)
        print(f"[@navigation:pathfinding:find_shortest_path] Found path with {len(path)} nodes")
        print(f"[@navigation:pathfinding:find_shortest_path] Path nodes: {' → '.join(path)}")
        
        # Log available transitions from start node for debugging
        print(f"[@navigation:pathfinding:find_shortest_path] ===== AVAILABLE TRANSITIONS FROM START NODE =====")
        start_successors = list(G.successors(actual_start_node))
        for successor in start_successors:
            successor_info = get_node_info(G, successor)
            successor_label = successor_info.get('label', successor) if successor_info else successor
            edge_data = G.edges[actual_start_node, successor]
            actions = edge_data.get('actions', [])
            action_count = len(actions) if actions else 0
            primary_action = edge_data.get('go_action', 'none')
            print(f"[@navigation:pathfinding:find_shortest_path] Available: {get_node_info(G, actual_start_node).get('label', actual_start_node)} → {successor_label} (primary: {primary_action}, {action_count} actions)")
        
        # Convert path to navigation transitions (grouped by from → to)
        print(f"[@navigation:pathfinding:find_shortest_path] ===== BUILDING NAVIGATION TRANSITIONS =====")
        
        navigation_transitions = []
        transition_number = 1
        
        for i in range(len(path) - 1):
            from_node = path[i]
            to_node = path[i + 1]
            
            # Get node information
            from_node_info = get_node_info(G, from_node)
            to_node_info = get_node_info(G, to_node)
            
            # Get edge data with actions
            edge_data = G.edges[from_node, to_node] if G.has_edge(from_node, to_node) else {}
            actions_list = edge_data.get('actions', [])
            
            # Log detailed transition information
            print(f"[@navigation:pathfinding:find_shortest_path] Transition {transition_number}: {from_node_info.get('label', from_node) if from_node_info else from_node} → {to_node_info.get('label', to_node) if to_node_info else to_node}")
            print(f"[@navigation:pathfinding:find_shortest_path]   From Node ID: {from_node}")
            print(f"[@navigation:pathfinding:find_shortest_path]   To Node ID: {to_node}")
            print(f"[@navigation:pathfinding:find_shortest_path]   Edge exists: {G.has_edge(from_node, to_node)}")
            print(f"[@navigation:pathfinding:find_shortest_path]   Actions found: {len(actions_list)}")
            
            if actions_list:
                for j, action in enumerate(actions_list):
                    command = action.get('command', 'unknown')
                    params = action.get('params', {})
                    params_str = ', '.join([f"{k}={v}" for k, v in params.items()]) if params else 'no params'
                    print(f"[@navigation:pathfinding:find_shortest_path]     Action {j+1}: {command}({params_str})")
            else:
                print(f"[@navigation:pathfinding:find_shortest_path]     No actions found for this transition")
            
            # Get retry actions
            retry_actions_list = edge_data.get('retryActions', [])
            
            print(f"[@navigation:pathfinding:find_shortest_path]   Retry Actions found: {len(retry_actions_list)}")
            if retry_actions_list:
                for j, action in enumerate(retry_actions_list):
                    command = action.get('command', 'unknown')
                    params = action.get('params', {})
                    params_str = ', '.join([f"{k}={v}" for k, v in params.items()]) if params else 'no params'
                    print(f"[@navigation:pathfinding:find_shortest_path]     Retry Action {j+1}: {command}({params_str})")
            
            transition = {
                'transition_number': transition_number,
                'from_node_id': from_node,
                'to_node_id': to_node,
                'from_node_label': from_node_info.get('label', '') if from_node_info else '',
                'to_node_label': to_node_info.get('label', '') if to_node_info else '',
                'actions': actions_list,
                'retryActions': retry_actions_list,
                'total_actions': len(actions_list),
                'total_retry_actions': len(retry_actions_list),
                'finalWaitTime': edge_data.get('finalWaitTime', 2000),
                'description': f"Navigate from '{from_node_info.get('label', from_node)}' to '{to_node_info.get('label', to_node)}'"
            }
            
            navigation_transitions.append(transition)
            transition_number += 1
            print(f"[@navigation:pathfinding:find_shortest_path] -----")
        
        print(f"[@navigation:pathfinding:find_shortest_path] ===== NAVIGATION TRANSITIONS COMPLETE =====")
        print(f"[@navigation:pathfinding:find_shortest_path] Generated {len(navigation_transitions)} navigation transitions")
        for i, transition in enumerate(navigation_transitions):
            actions_summary = [f"{a.get('command', 'unknown')}" for a in transition['actions']]
            print(f"  Transition {i+1}: {transition['from_node_label']} → {transition['to_node_label']} ({len(transition['actions'])} actions: {actions_summary})")
        
        return navigation_transitions
        
    except nx.NetworkXNoPath:
        print(f"[@navigation:pathfinding:find_shortest_path] No path found from {actual_start_node} to {target_node_id}")
        
        # Additional debugging for no path case
        print(f"[@navigation:pathfinding:find_shortest_path] DEBUGGING NO PATH:")
        
        # Check if graph is connected (considering it as undirected for connectivity)
        undirected_G = G.to_undirected()
        is_connected = nx.is_connected(undirected_G)
        print(f"[@navigation:pathfinding:find_shortest_path] Graph is connected (undirected): {is_connected}")
        
        if not is_connected:
            components = list(nx.connected_components(undirected_G))
            print(f"[@navigation:pathfinding:find_shortest_path] Connected components: {len(components)}")
            for i, component in enumerate(components):
                print(f"  Component {i}: {component}")
            
            # Check which component each node is in
            start_component = None
            target_component = None
            for i, component in enumerate(components):
                if actual_start_node in component:
                    start_component = i
                if target_node_id in component:
                    target_component = i
            
            print(f"[@navigation:pathfinding:find_shortest_path] Start node {actual_start_node} in component {start_component}")
            print(f"[@navigation:pathfinding:find_shortest_path] Target node {target_node_id} in component {target_component}")
            
            if start_component != target_component:
                print(f"[@navigation:pathfinding:find_shortest_path] Nodes are in different components - no path possible")
        
        # Check reachability from start node
        try:
            reachable_from_start = set(nx.descendants(G, actual_start_node))
            reachable_from_start.add(actual_start_node)
            print(f"[@navigation:pathfinding:find_shortest_path] Nodes reachable from {actual_start_node}: {reachable_from_start}")
            
            if target_node_id not in reachable_from_start:
                print(f"[@navigation:pathfinding:find_shortest_path] Target {target_node_id} is NOT reachable from start {actual_start_node}")
            else:
                print(f"[@navigation:pathfinding:find_shortest_path] Target {target_node_id} IS reachable from start {actual_start_node} - this shouldn't happen!")
                
        except Exception as reach_error:
            print(f"[@navigation:pathfinding:find_shortest_path] Error checking reachability: {reach_error}")
        
        return None
    except Exception as e:
        print(f"[@navigation:pathfinding:find_shortest_path] Error finding path: {e}")
        return None

def get_navigation_transitions(tree_id: str, target_node_id: str, team_id: str, current_node_id: str = None) -> List[Dict]:
    """
    Get step-by-step navigation instructions with actions grouped by transitions
    
    Args:
        tree_id: Navigation tree ID
        target_node_id: Target node to navigate to
        team_id: Team ID for security
        current_node_id: Current position (if None, uses entry point)
        
    Returns:
        List of navigation transitions with multiple actions per transition
    """
    print(f"[@navigation:pathfinding:get_navigation_transitions] Getting transitions to {target_node_id}")
    
    # Find the path (now returns transitions)
    transitions = find_shortest_path(tree_id, target_node_id, team_id, current_node_id)
    
    if not transitions:
        return []
    
    # Enhance transitions with additional information
    from src.web.cache.navigation_cache import get_cached_graph
    from src.web.cache.navigation_graph import get_node_info
    
    G = get_cached_graph(tree_id, team_id)
    if not G:
        return transitions
    
    enhanced_transitions = []
    for transition in transitions:
        # Get detailed node information
        from_node_info = get_node_info(G, transition['from_node_id'])
        to_node_info = get_node_info(G, transition['to_node_id'])
        
        # Get edge information
        edge_data = G.edges[transition['from_node_id'], transition['to_node_id']] if G.has_edge(transition['from_node_id'], transition['to_node_id']) else {}
        
        enhanced_transition = {
            **transition,
            'from_node': {
                'id': transition['from_node_id'],
                'label': from_node_info.get('label', '') if from_node_info else '',
                'type': from_node_info.get('node_type', '') if from_node_info else '',
                'description': from_node_info.get('description', '') if from_node_info else '',
                'screenshot_url': from_node_info.get('screenshot_url') if from_node_info else None
            },
            'to_node': {
                'id': transition['to_node_id'],
                'label': to_node_info.get('label', '') if to_node_info else '',
                'type': to_node_info.get('node_type', '') if to_node_info else '',
                'description': to_node_info.get('description', '') if to_node_info else '',
                'screenshot_url': to_node_info.get('screenshot_url') if to_node_info else None
            },
            'edge': {
                'actions': edge_data.get('actions', []),
                'total_actions': len(edge_data.get('actions', [])),
                'edge_type': edge_data.get('edge_type', ''),
                'description': edge_data.get('description', ''),
                'conditions': edge_data.get('conditions', {}),
                'is_bidirectional': edge_data.get('is_bidirectional', False),
                'finalWaitTime': edge_data.get('finalWaitTime', 2000)
            }
        }
        
        enhanced_transitions.append(enhanced_transition)
    
    return enhanced_transitions

def find_entry_point(tree_id: str, team_id: str) -> Optional[str]:
    """
    Find the entry/root node of a navigation tree
    
    Args:
        tree_id: Navigation tree ID
        team_id: Team ID for security
        
    Returns:
        Entry point node ID or None if not found
    """
    from src.web.cache.navigation_cache import get_cached_graph
    from src.web.cache.navigation_graph import get_entry_points
    
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
    
    from src.web.cache.navigation_cache import get_cached_graph
    from src.web.cache.navigation_graph import get_entry_points, get_node_info, get_edge_action
    
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
    from src.web.cache.navigation_cache import get_cached_graph
    from src.web.cache.navigation_graph import get_entry_points
    
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

def find_optimal_edge_validation_sequence(tree_id: str, team_id: str) -> List[Dict]:
    """
    Find optimal sequence for validating all edges using reachability-based ordering.
    
    Strategy:
    1. Start from entry nodes (always reachable)
    2. Process edges in waves where each wave tests edges whose source nodes are reachable
    3. Ensures proper execution dependencies
    
    Args:
        tree_id: Navigation tree ID
        team_id: Team ID for security
        
    Returns:
        List of edge validation sequences ordered by reachability
    """
    print(f"[@navigation:pathfinding:find_optimal_edge_validation_sequence] Finding reachability-based validation sequence for tree {tree_id}")
    
    try:
        from src.web.cache.navigation_cache import get_cached_graph
        from src.web.cache.navigation_graph import get_entry_points, get_node_info
        
        G = get_cached_graph(tree_id, team_id)
        if not G:
            print(f"[@navigation:pathfinding:find_optimal_edge_validation_sequence] Failed to get graph for tree {tree_id}")
            return []
        
        edges_to_validate = list(G.edges(data=True))
        if not edges_to_validate:
            print(f"[@navigation:pathfinding:find_optimal_edge_validation_sequence] No edges found in graph")
            return []
        
        print(f"[@navigation:pathfinding:find_optimal_edge_validation_sequence] Found {len(edges_to_validate)} edges to validate")
        
        validation_sequence = _create_reachability_based_validation_sequence(G, edges_to_validate)
        
        print(f"[@navigation:pathfinding:find_optimal_edge_validation_sequence] Generated {len(validation_sequence)} validation steps")
        
        return validation_sequence
    except Exception as e:
        print(f"[@navigation:pathfinding:find_optimal_edge_validation_sequence] Error: {e}")
        return []

def _create_reachability_based_validation_sequence(G, edges_to_validate: List[Tuple]) -> List[Dict]:
    """
    Create validation sequence based on reachability, ensuring each edge's source node is reachable when tested.
    
    Args:
        G: NetworkX graph
        edges_to_validate: List of (from_node, to_node, edge_data) tuples
        
    Returns:
        List of validation steps ordered by reachability
    """
    from src.web.cache.navigation_graph import get_entry_points, get_node_info
    
    print(f"[@navigation:pathfinding:_create_reachability_based_validation_sequence] Creating reachability-based sequence")
    
    # Start with entry nodes (always reachable)
    entry_points = get_entry_points(G)
    reachable_nodes = set(entry_points) if entry_points else set()
    
    # If no entry points, find nodes with no incoming edges
    if not reachable_nodes:
        for node in G.nodes():
            if G.in_degree(node) == 0:
                reachable_nodes.add(node)
    
    # If still no reachable nodes, use first node as fallback
    if not reachable_nodes and G.nodes():
        reachable_nodes.add(list(G.nodes())[0])
    
    print(f"[@navigation:pathfinding:_create_reachability_based_validation_sequence] Starting with {len(reachable_nodes)} reachable nodes: {reachable_nodes}")
    
    validation_sequence = []
    remaining_edges = [(u, v, data) for u, v, data in edges_to_validate]
    step_number = 1
    
    # Process edges in waves - each wave tests edges whose source nodes are reachable
    while remaining_edges:
        # Find edges we can test now (source node is reachable)
        testable_edges = [
            edge for edge in remaining_edges 
            if edge[0] in reachable_nodes
        ]
        
        if not testable_edges:
            # No progress possible - log remaining edges and break
            print(f"[@navigation:pathfinding:_create_reachability_based_validation_sequence] No testable edges found, {len(remaining_edges)} edges unreachable")
            for edge in remaining_edges:
                from_info = get_node_info(G, edge[0]) or {}
                to_info = get_node_info(G, edge[1]) or {}
                from_label = from_info.get('label', edge[0])
                to_label = to_info.get('label', edge[1])
                print(f"  Unreachable: {from_label} → {to_label}")
            break
        
        print(f"[@navigation:pathfinding:_create_reachability_based_validation_sequence] Wave {step_number}: Testing {len(testable_edges)} edges")
        
        # Test these edges and mark their target nodes as reachable
        for edge in testable_edges:
            from_node, to_node, edge_data = edge
            
            validation_step = _create_validation_step(G, from_node, to_node, edge_data, step_number, 'reachability_wave')
            validation_sequence.append(validation_step)
            
            # Target node is now reachable for future waves
            reachable_nodes.add(to_node)
            remaining_edges.remove(edge)
            
            step_number += 1
    
    print(f"[@navigation:pathfinding:_create_reachability_based_validation_sequence] Generated {len(validation_sequence)} validation steps")
    return validation_sequence



def _create_validation_step(G, from_node: str, to_node: str, edge_data: Dict, step_number: int, optimization: str) -> Dict:
    """
    Create a validation step with consistent format.
    """
    from src.web.cache.navigation_graph import get_node_info
    
    from_info = get_node_info(G, from_node) or {}
    to_info = get_node_info(G, to_node) or {}
    
    return {
        'step_number': step_number,
        'validation_type': 'edge',
        'from_node_id': from_node,
        'to_node_id': to_node,
        'from_node_label': from_info.get('label', from_node),
        'to_node_label': to_info.get('label', to_node),
        'actions': edge_data.get('actions', []),
        'retryActions': edge_data.get('retryActions', []),
        'description': f"Validate edge: {from_info.get('label', from_node)} → {to_info.get('label', to_node)}",
        'optimization': optimization
    } 
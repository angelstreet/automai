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
            actual_start_node = entry_points[0]
    
    # Check if start node exists
    if actual_start_node not in G.nodes:
        print(f"[@navigation:pathfinding:find_shortest_path] ERROR: Start node {actual_start_node} not found in graph")
        return None
    
    # Check if target node exists
    if target_node_id not in G.nodes:
        print(f"[@navigation:pathfinding:find_shortest_path] ERROR: Target node {target_node_id} not found in graph")
        return None
    
    # Handle entry point navigation
    target_node_info = get_node_info(G, target_node_id)
    is_target_entry_point = target_node_info and target_node_info.get('is_entry_point', False)
    
    if is_target_entry_point:
        print(f"[@navigation:pathfinding:find_shortest_path] Target {target_node_id} is an entry point (root node)")
        
        # Look for entry edges that connect to this root node
        entry_edges = []
        for from_node, to_node, edge_data in G.edges(data=True):
            if to_node == target_node_id:
                from_node_info = get_node_info(G, from_node)
                if from_node_info and (from_node_info.get('node_type') == 'entry' or 'entry' in from_node.lower()):
                    entry_edges.append((from_node, to_node, edge_data))
        
        if entry_edges:
            # Use the first entry edge as our path
            from_node, to_node, edge_data = entry_edges[0]
            
            # Create a simple one-step navigation path using the entry edge
            from_node_info = get_node_info(G, from_node)
            actions_list = edge_data.get('actions', [])
            
            # Get retry actions
            retry_actions_list = edge_data.get('retryActions', [])
            
            # Create navigation transition for entry edge
            transition = {
                'transition_number': 1,
                'from_node_id': from_node,
                'to_node_id': to_node,
                'from_node_label': from_node_info.get('label', '') if from_node_info else 'Entry',
                'to_node_label': target_node_info.get('label', '') if target_node_info else '',
                'actions': actions_list,
                'retryActions': retry_actions_list,
                'total_actions': len(actions_list),
                'total_retry_actions': len(retry_actions_list),
                'finalWaitTime': edge_data.get('finalWaitTime', 2000),
                'description': f"Navigate from entry to '{target_node_info.get('label', target_node_id)}'"
            }
            
            print(f"[@navigation:pathfinding:find_shortest_path] Created entry edge path to root node")
            return [transition]
    
    # Check if we're already at the target
    if actual_start_node == target_node_id:
        print(f"[@navigation:pathfinding:find_shortest_path] Already at target node {target_node_id}")
        return []
    
    # ALWAYS include entry→home transition when it exists (for execution context)
    navigation_transitions = []
    transition_number = 1
    
    # Find entry point and home node
    entry_points = get_entry_points(G)
    entry_node = entry_points[0] if entry_points else None
    
    # Find home node (the main starting point for navigation)
    home_node = None
    for node_id, node_data in G.nodes(data=True):
        if (node_data.get('is_root') or 
            node_data.get('label', '').lower() == 'home' or
            node_id == 'node-1'):  # Common home node ID
            home_node = node_id
            break
    
    # ALWAYS include entry→home transition when it exists (represents actual execution flow)
    if entry_node and home_node and entry_node != home_node and G.has_edge(entry_node, home_node):
        entry_info = get_node_info(G, entry_node)
        home_info = get_node_info(G, home_node)
        entry_edge_data = G.edges[entry_node, home_node]
        
        entry_transition = {
            'transition_number': transition_number,
            'from_node_id': entry_node,
            'to_node_id': home_node,
            'from_node_label': entry_info.get('label', '') if entry_info else 'Entry',
            'to_node_label': home_info.get('label', '') if home_info else 'Home',
            'actions': entry_edge_data.get('actions', []),
            'retryActions': entry_edge_data.get('retryActions', []),
            'total_actions': len(entry_edge_data.get('actions', [])),
            'total_retry_actions': len(entry_edge_data.get('retryActions', [])),
            'finalWaitTime': entry_edge_data.get('finalWaitTime', 2000),
            'description': f"Navigate from entry to '{home_info.get('label', home_node)}'"
        }
        
        navigation_transitions.append(entry_transition)
        transition_number += 1
        print(f"[@navigation:pathfinding:find_shortest_path] Added entry→home transition (execution context)")
    
    # If target is home and we just added entry→home, we're done
    if home_node and target_node_id == home_node and navigation_transitions:
        print(f"[@navigation:pathfinding:find_shortest_path] Target is home node, returning entry→home transition")
        return navigation_transitions
    
    # Now find the path from home (or actual start) to target
    # Use the actual start node for pathfinding, but we've already added entry→home context
    path_start = actual_start_node
    
    try:
        # Use NetworkX shortest path algorithm
        path = nx.shortest_path(G, path_start, target_node_id)
        print(f"[@navigation:pathfinding:find_shortest_path] Found path with {len(path)} nodes")
        print(f"[@navigation:pathfinding:find_shortest_path] Path nodes: {' → '.join(path)}")
        
        # Log available transitions from start node for debugging
        print(f"[@navigation:pathfinding:find_shortest_path] ===== AVAILABLE TRANSITIONS FROM START NODE =====")
        start_successors = list(G.successors(path_start))
        for successor in start_successors:
            successor_info = get_node_info(G, successor)
            successor_label = successor_info.get('label', successor) if successor_info else successor
            edge_data = G.edges[path_start, successor]
            actions = edge_data.get('actions', [])
            action_count = len(actions) if actions else 0
            primary_action = edge_data.get('go_action', 'none')
            print(f"[@navigation:pathfinding:find_shortest_path] Available: {get_node_info(G, path_start).get('label', path_start)} → {successor_label} (primary: {primary_action}, {action_count} actions)")
        
        # Convert path to navigation transitions (grouped by from → to)
        print(f"[@navigation:pathfinding:find_shortest_path] ===== BUILDING NAVIGATION TRANSITIONS =====")
        
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
        print(f"[@navigation:pathfinding:find_shortest_path] No path found from {path_start} to {target_node_id}")
        
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
                if path_start in component:
                    start_component = i
                if target_node_id in component:
                    target_component = i
            
            print(f"[@navigation:pathfinding:find_shortest_path] Start node {path_start} in component {start_component}")
            print(f"[@navigation:pathfinding:find_shortest_path] Target node {target_node_id} in component {target_component}")
            
            if start_component != target_component:
                print(f"[@navigation:pathfinding:find_shortest_path] Nodes are in different components - no path possible")
        
        # Check reachability from start node
        try:
            reachable_from_start = set(nx.descendants(G, path_start))
            reachable_from_start.add(path_start)
            print(f"[@navigation:pathfinding:find_shortest_path] Nodes reachable from {path_start}: {reachable_from_start}")
            
            if target_node_id not in reachable_from_start:
                print(f"[@navigation:pathfinding:find_shortest_path] Target {target_node_id} is NOT reachable from start {path_start}")
            else:
                print(f"[@navigation:pathfinding:find_shortest_path] Target {target_node_id} IS reachable from start {path_start} - this shouldn't happen!")
                
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
    Find optimal sequence for validating all edges using a simple NetworkX approach.
    
    Simple Strategy:
    1. Start from hub node (highest degree)
    2. Process bidirectional edges together when possible
    3. Use NetworkX shortest path only when necessary
    
    Args:
        tree_id: Navigation tree ID
        team_id: Team ID for security
        
    Returns:
        List of edge validation sequences optimized for minimal navigation
    """
    print(f"[@navigation:pathfinding:find_optimal_edge_validation_sequence] Finding optimal edge validation for tree {tree_id}")
    
    try:
        from src.web.cache.navigation_cache import get_cached_graph
        from src.web.cache.navigation_graph import get_entry_points, get_node_info
        
        G = get_cached_graph(tree_id, team_id)
        if not G:
            print(f"[@navigation:pathfinding:find_optimal_edge_validation_sequence] Failed to get graph for tree {tree_id}")
            return []
        
        # DEBUG: Print all nodes and edges in the graph
        print(f"[@navigation:pathfinding:find_optimal_edge_validation_sequence] DEBUG: Graph has {len(G.nodes)} nodes and {len(G.edges)} edges")
        print(f"[@navigation:pathfinding:find_optimal_edge_validation_sequence] DEBUG: Nodes: {list(G.nodes)}")
        print(f"[@navigation:pathfinding:find_optimal_edge_validation_sequence] DEBUG: Edges:")
        for i, (from_node, to_node, edge_data) in enumerate(G.edges(data=True), 1):
            from_info = get_node_info(G, from_node) or {}
            to_info = get_node_info(G, to_node) or {}
            from_label = from_info.get('label', from_node)
            to_label = to_info.get('label', to_node)
            print(f"  {i:2d}. {from_label} → {to_label} ({from_node} → {to_node})")
        
        edges_raw = list(G.edges(data=True))
        if not edges_raw:
            print(f"[@navigation:pathfinding:find_optimal_edge_validation_sequence] No edges found in graph for tree {tree_id}")
            return []
            
        edges_to_validate = sorted(edges_raw, key=lambda edge: (edge[0], edge[1]))
        
        if not edges_to_validate:
            print(f"[@navigation:pathfinding:find_optimal_edge_validation_sequence] No edges found to validate")
            return []
        
        print(f"[@navigation:pathfinding:find_optimal_edge_validation_sequence] Found {len(edges_to_validate)} edges to validate")
        
        # Use simple NetworkX-based algorithm
        validation_sequence = _create_simple_networkx_validation_sequence(G, edges_to_validate)
        
        # Analyze the final sequence
        efficiency_report = analyze_validation_sequence_efficiency(validation_sequence)
        print(f"[@navigation:pathfinding:find_optimal_edge_validation_sequence] Validation sequence efficiency report:")
        print(f"  - Total steps: {efficiency_report['total_steps']}")
        print(f"  - Edge validations: {efficiency_report['edge_validations']}")
        print(f"  - Navigation steps: {efficiency_report['navigation_steps']}")
        print(f"  - Bidirectional optimizations: {efficiency_report['bidirectional_optimizations']}")
        print(f"  - Efficiency ratio: {efficiency_report['efficiency_ratio']:.2f}")
        print(f"  - Bidirectional efficiency: {efficiency_report['bidirectional_efficiency']:.2f}")
        print(f"  - Overall efficiency rating: {efficiency_report['efficiency_rating']}")
        
        return validation_sequence
    except Exception as e:
        import traceback
        print(f"[@navigation:pathfinding:find_optimal_edge_validation_sequence] Error generating path: {e}")
        traceback.print_exc()
        return []

def analyze_validation_sequence_efficiency(validation_sequence: List[Dict]) -> Dict:
    """
    Analyze the efficiency of a validation sequence and provide detailed metrics.
    
    Args:
        validation_sequence: The validation sequence to analyze
        
    Returns:
        Dictionary with efficiency metrics
    """
    # Basic counts
    total_steps = len(validation_sequence)
    edge_validations = sum(1 for step in validation_sequence if step.get('validation_type') == 'edge')
    navigation_steps = sum(1 for step in validation_sequence if step.get('validation_type') == 'navigation')
    
    # Optimization metrics
    bidirectional_optimizations = sum(1 for step in validation_sequence if step.get('optimization') == 'bidirectional_immediate')
    
    # Safe handling of optimization types
    optimization_types = set()
    for step in validation_sequence:
        opt = step.get('optimization')
        if opt is not None:
            optimization_types.add(opt)
        else:
            optimization_types.add('none')
    
    optimization_counts = {}
    for opt in optimization_types:
        optimization_counts[opt] = sum(1 for step in validation_sequence if step.get('optimization') == opt)
    
    # Navigation cost analysis
    total_navigation_cost = sum(step.get('navigation_cost', 0) for step in validation_sequence)
    
    # Efficiency ratios
    efficiency_ratio = edge_validations / total_steps if total_steps > 0 else 0
    
    # Bidirectional edge analysis
    bidirectional_pairs = bidirectional_optimizations / 2
    bidirectional_efficiency = bidirectional_pairs / (edge_validations / 2) if edge_validations > 0 else 0
    
    # Position changes
    position_changes = 0
    current_position = None
    for step in validation_sequence:
        if current_position is None:
            current_position = step['to_node_id']
        elif current_position != step['from_node_id']:
            position_changes += 1
            current_position = step['from_node_id']
        current_position = step['to_node_id']
    
    # Overall efficiency rating
    if efficiency_ratio > 0.8 and bidirectional_efficiency > 0.5:
        efficiency_rating = "Excellent"
    elif efficiency_ratio > 0.7:
        efficiency_rating = "Good"
    elif efficiency_ratio > 0.5:
        efficiency_rating = "Average"
    else:
        efficiency_rating = "Needs improvement"

    
    # Use only primitive types in the returned dictionary
    return {
        'total_steps': total_steps,
        'edge_validations': edge_validations,
        'navigation_steps': navigation_steps,
        'bidirectional_optimizations': bidirectional_optimizations,
        'bidirectional_pairs': bidirectional_pairs,
        'optimization_types': list(str(opt) for opt in optimization_types),  # Convert to strings
        'optimization_counts': {str(k): v for k, v in optimization_counts.items()},  # Ensure keys are strings
        'total_navigation_cost': total_navigation_cost,
        'efficiency_ratio': efficiency_ratio,
        'bidirectional_efficiency': bidirectional_efficiency,
        'position_changes': position_changes,
        'efficiency_rating': efficiency_rating,
    }

def _create_simple_networkx_validation_sequence(G: nx.DiGraph, edges_to_validate: List[Tuple]) -> List[Dict]:
    """
    Simple NetworkX-based validation sequence using depth-first traversal.
    Focus on: finding ALL edges and using depth-first exploration for optimal ordering.
    """
    from src.web.cache.navigation_graph import get_entry_points, get_node_info
    
    print(f"[@navigation:pathfinding:_create_simple_networkx_validation_sequence] Creating depth-first validation sequence")
    
    # Get ALL edges from the graph
    all_edges_in_graph = list(G.edges(data=True))
    print(f"[@navigation:pathfinding:_create_simple_networkx_validation_sequence] Found {len(all_edges_in_graph)} edges in graph")
    
    # Use ALL edges from the graph
    edges_to_validate = all_edges_in_graph
    
    if not edges_to_validate:
        print(f"[@navigation:pathfinding:_create_simple_networkx_validation_sequence] No edges found to validate")
        return []
    
    # Find the hub node (highest degree) and entry points
    degrees = dict(G.degree())
    hub_node = max(degrees.keys(), key=lambda n: degrees[n]) if degrees else None
    entry_points = get_entry_points(G)
    start_node = entry_points[0] if entry_points else hub_node
    
    print(f"[@navigation:pathfinding:_create_simple_networkx_validation_sequence] Hub node: {hub_node}, Start node: {start_node}")
    
    # Create edge mapping for quick lookup
    edge_map = {}
    for u, v, data in edges_to_validate:
        edge_map[(u, v)] = data
    
    # Find and separate ENTRY edges first
    entry_edges = []
    regular_edges = set()
    
    for edge in edge_map.keys():
        from_node = edge[0]
        from_info = get_node_info(G, from_node) or {}
        from_label = from_info.get('label', from_node)
        
        if 'ENTRY' in from_label.upper() and from_label.upper() != 'HOME':
            entry_edges.append(edge)
            print(f"[@navigation:pathfinding:_create_simple_networkx_validation_sequence] Found ENTRY edge: {from_label}")
        else:
            regular_edges.add(edge)
    
    print(f"[@navigation:pathfinding:_create_simple_networkx_validation_sequence] Found {len(entry_edges)} entry edges and {len(regular_edges)} regular edges")
    
    # DEPTH-FIRST TRAVERSAL ALGORITHM
    validation_sequence = []
    visited_edges = set()
    step_number = 1
    
    # Step 1: Process ENTRY edges first
    for edge in entry_edges:
        if edge not in visited_edges:
            validation_step = _create_validation_step(
                G, edge[0], edge[1], edge_map[edge], step_number, 'entry_edge'
            )
            validation_sequence.append(validation_step)
            visited_edges.add(edge)
            step_number += 1
    
    # Step 2: Optimal traversal algorithm following the exact pattern
    def optimal_traversal(start_node):
        nonlocal step_number
        
        # Build adjacency list
        adjacency = {}
        reverse_adjacency = {}
        for edge in regular_edges:
            from_node, to_node = edge
            if from_node not in adjacency:
                adjacency[from_node] = []
            adjacency[from_node].append(to_node)
            
            if to_node not in reverse_adjacency:
                reverse_adjacency[to_node] = []
            reverse_adjacency[to_node].append(from_node)
        
        # Sort for consistent ordering
        for node in adjacency:
            adjacency[node].sort()
        
        def process_branch_completely(current_node, parent_node):
            """Process all edges in a branch completely before returning"""
            nonlocal step_number
            
            if current_node not in adjacency:
                return
            
            # Process all children of current node
            for child_node in adjacency[current_node]:
                forward_edge = (current_node, child_node)
                
                # Skip if already visited or if it's the parent (we'll handle return separately)
                if forward_edge in visited_edges or child_node == parent_node:
                    continue
                
                # Add forward edge
                validation_step = _create_validation_step(
                    G, current_node, child_node, edge_map[forward_edge], step_number, 'deep_forward'
                )
                validation_sequence.append(validation_step)
                visited_edges.add(forward_edge)
                step_number += 1
                
                # Recursively process this child's branch
                process_branch_completely(child_node, current_node)
                
                # Add return edge after processing child completely
                return_edge = (child_node, current_node)
                if return_edge in regular_edges and return_edge not in visited_edges:
                    validation_step = _create_validation_step(
                        G, child_node, current_node, edge_map[return_edge], step_number, 'deep_return'
                    )
                    validation_sequence.append(validation_step)
                    visited_edges.add(return_edge)
                    step_number += 1
        
        # Step 2.1: Process all leaf nodes from start_node first
        if start_node in adjacency:
            for target_node in adjacency[start_node]:
                forward_edge = (start_node, target_node)
                
                # Skip if this edge is already visited
                if forward_edge in visited_edges:
                    continue
                
                # Check if target_node is a leaf (has no outgoing edges or only back to start)
                target_children = adjacency.get(target_node, [])
                is_leaf = len(target_children) == 0 or (len(target_children) == 1 and target_children[0] == start_node)
                
                if is_leaf:
                    # Add forward edge
                    validation_step = _create_validation_step(
                        G, start_node, target_node, edge_map[forward_edge], step_number, 'leaf_forward'
                    )
                    validation_sequence.append(validation_step)
                    visited_edges.add(forward_edge)
                    step_number += 1
                    
                    # Add return edge immediately for leaf nodes
                    return_edge = (target_node, start_node)
                    if return_edge in regular_edges and return_edge not in visited_edges:
                        validation_step = _create_validation_step(
                            G, target_node, start_node, edge_map[return_edge], step_number, 'leaf_return'
                        )
                        validation_sequence.append(validation_step)
                        visited_edges.add(return_edge)
                        step_number += 1
        
        # Step 2.2: Process deeper branches (non-leaf nodes)
        if start_node in adjacency:
            for target_node in adjacency[start_node]:
                forward_edge = (start_node, target_node)
                
                # Skip if already visited
                if forward_edge in visited_edges:
                    continue
                
                # Check if this is a deeper branch (has children other than back to start)
                target_children = adjacency.get(target_node, [])
                has_deeper_children = any(child != start_node for child in target_children)
                
                if has_deeper_children:
                    # Add forward edge to deeper branch
                    validation_step = _create_validation_step(
                        G, start_node, target_node, edge_map[forward_edge], step_number, 'branch_forward'
                    )
                    validation_sequence.append(validation_step)
                    visited_edges.add(forward_edge)
                    step_number += 1
                    
                    # Recursively process this branch completely
                    process_branch_completely(target_node, start_node)
                    
                    # After processing branch completely, add return edge
                    return_edge = (target_node, start_node)
                    if return_edge in regular_edges and return_edge not in visited_edges:
                        validation_step = _create_validation_step(
                            G, target_node, start_node, edge_map[return_edge], step_number, 'branch_return'
                        )
                        validation_sequence.append(validation_step)
                        visited_edges.add(return_edge)
                        step_number += 1
    
    # Start optimal traversal from hub node
    optimal_traversal(start_node)
    
    # Step 3: Add any remaining unvisited edges
    remaining_edges = [edge for edge in regular_edges if edge not in visited_edges]
    for edge in remaining_edges:
        validation_step = _create_validation_step(
            G, edge[0], edge[1], edge_map[edge], step_number, 'remaining_edge'
        )
        validation_sequence.append(validation_step)
        visited_edges.add(edge)
        step_number += 1
        print(f"[@navigation:pathfinding:_create_simple_networkx_validation_sequence] Added remaining edge: {edge}")
    
    print(f"[@navigation:pathfinding:_create_simple_networkx_validation_sequence] Optimal traversal complete: {len(validation_sequence)} steps")
    print(f"[@navigation:pathfinding:_create_simple_networkx_validation_sequence] Visited {len(visited_edges)} edges out of {len(edge_map)} total")
    
    return validation_sequence

def _create_validation_step(G: nx.DiGraph, from_node: str, to_node: str, edge_data: Dict, step_number: int, optimization: str) -> Dict:
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
        'navigation_cost': 0,
        'optimization': optimization
    } 
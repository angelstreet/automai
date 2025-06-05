"""
Pathfinding algorithms for navigation trees
Uses NetworkX for shortest path calculations
"""

import networkx as nx
from typing import List, Dict, Optional, Tuple
import sys
import os

# Add paths for absolute imports instead of relative imports
web_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
web_cache_path = os.path.join(web_dir, 'cache')
sys.path.insert(0, web_cache_path)

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
    from navigation_cache import get_cached_graph
    from navigation_graph import get_entry_points, get_node_info, get_edge_action
    
    G = get_cached_graph(tree_id, team_id)
    if not G:
        print(f"[@navigation:pathfinding:find_shortest_path] Failed to get graph for tree {tree_id}")
        return None
    
    # Determine starting node
    if not start_node_id:
        entry_points = get_entry_points(G)
        
        if not entry_points:
            print(f"[@navigation:pathfinding:find_shortest_path] No entry points found, using first node")
            nodes = list(G.nodes())
            if not nodes:
                print(f"[@navigation:pathfinding:find_shortest_path] No nodes in graph")
                return None
            start_node_id = nodes[0]
        else:
            start_node_id = entry_points[0]
    
    # Check if start node exists
    if start_node_id not in G.nodes:
        print(f"[@navigation:pathfinding:find_shortest_path] ERROR: Start node {start_node_id} not found in graph")
        return None
    
    # Check if target node exists
    if target_node_id not in G.nodes:
        print(f"[@navigation:pathfinding:find_shortest_path] ERROR: Target node {target_node_id} not found in graph")
        return None
    
    # SPECIAL CASE: If target is a root node (entry point), handle entry edge navigation
    target_node_info = get_node_info(G, target_node_id)
    is_target_entry_point = target_node_info and target_node_info.get('is_entry_point', False)
    
    if is_target_entry_point:
        print(f"[@navigation:pathfinding:find_shortest_path] Target {target_node_id} is an entry point (root node)")
        
        # Look for entry edges that connect to this root node
        entry_edges = []
        for from_node, to_node, edge_data in G.edges(data=True):
            if to_node == target_node_id:
                # Check if this is an entry edge (from an entry-type node or special entry node)
                from_node_info = get_node_info(G, from_node)
                if from_node_info and (from_node_info.get('node_type') == 'entry' or 'entry' in from_node.lower()):
                    entry_edges.append((from_node, to_node, edge_data))
        
        if entry_edges:
            # Use the first entry edge as our path
            from_node, to_node, edge_data = entry_edges[0]
            
            # Create a simple one-step navigation path using the entry edge
            from_node_info = get_node_info(G, from_node)
            actions_list = edge_data.get('actions', [])
            
            # If no actions in the new format, try to get from legacy format
            if not actions_list:
                primary_action = edge_data.get('go_action')
                if primary_action:
                    actions_list = [{
                        'id': primary_action,
                        'label': primary_action.replace('_', ' ').title(),
                        'command': primary_action,
                        'params': {},
                        'requiresInput': False,
                        'inputValue': '',
                        'waitTime': 1000
                    }]
            
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
    if start_node_id == target_node_id:
        print(f"[@navigation:pathfinding:find_shortest_path] Already at target node {target_node_id}")
        return []
    
    try:
        # Use NetworkX shortest path algorithm
        path = nx.shortest_path(G, start_node_id, target_node_id)
        print(f"[@navigation:pathfinding:find_shortest_path] Found path with {len(path)} nodes")
        
        # Convert path to navigation transitions (grouped by from → to)
        navigation_transitions = []
        for i in range(len(path) - 1):
            from_node = path[i]
            to_node = path[i + 1]
            
            # Get node information
            from_node_info = get_node_info(G, from_node)
            to_node_info = get_node_info(G, to_node)
            
            # Get edge data with actions
            edge_data = G.edges[from_node, to_node] if G.has_edge(from_node, to_node) else {}
            actions_list = edge_data.get('actions', [])
            
            # If no actions in the new format, try to get from legacy format
            if not actions_list:
                primary_action = edge_data.get('go_action')
                if primary_action:
                    actions_list = [{
                        'id': primary_action,
                        'label': primary_action.replace('_', ' ').title(),
                        'command': primary_action,
                        'params': {},
                        'requiresInput': False,
                        'inputValue': '',
                        'waitTime': 1000
                    }]
            
            # Get retry actions
            retry_actions_list = edge_data.get('retryActions', [])
            
            transition = {
                'transition_number': i + 1,
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
        
        print(f"[@navigation:pathfinding:find_shortest_path] Generated {len(navigation_transitions)} navigation transitions")
        for i, transition in enumerate(navigation_transitions):
            actions_summary = [f"{a.get('command', 'unknown')}" for a in transition['actions']]
            print(f"  Transition {i+1}: {transition['from_node_label']} → {transition['to_node_label']} ({len(transition['actions'])} actions: {actions_summary})")
        
        return navigation_transitions
        
    except nx.NetworkXNoPath:
        print(f"[@navigation:pathfinding:find_shortest_path] No path found from {start_node_id} to {target_node_id}")
        
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
                if start_node_id in component:
                    start_component = i
                if target_node_id in component:
                    target_component = i
            
            print(f"[@navigation:pathfinding:find_shortest_path] Start node {start_node_id} in component {start_component}")
            print(f"[@navigation:pathfinding:find_shortest_path] Target node {target_node_id} in component {target_component}")
            
            if start_component != target_component:
                print(f"[@navigation:pathfinding:find_shortest_path] Nodes are in different components - no path possible")
        
        # Check reachability from start node
        try:
            reachable_from_start = set(nx.descendants(G, start_node_id))
            reachable_from_start.add(start_node_id)
            print(f"[@navigation:pathfinding:find_shortest_path] Nodes reachable from {start_node_id}: {reachable_from_start}")
            
            if target_node_id not in reachable_from_start:
                print(f"[@navigation:pathfinding:find_shortest_path] Target {target_node_id} is NOT reachable from start {start_node_id}")
            else:
                print(f"[@navigation:pathfinding:find_shortest_path] Target {target_node_id} IS reachable from start {start_node_id} - this shouldn't happen!")
                
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
    from navigation_cache import get_cached_graph
    from navigation_graph import get_node_info
    
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

# Keep the old function name for backward compatibility, but mark as deprecated
def get_navigation_steps(tree_id: str, target_node_id: str, team_id: str, current_node_id: str = None) -> List[Dict]:
    """
    DEPRECATED: Use get_navigation_transitions instead.
    This function now returns transitions but converts them to individual steps for backward compatibility.
    """
    transitions = get_navigation_transitions(tree_id, target_node_id, team_id, current_node_id)
    
    # Convert transitions back to individual steps for backward compatibility
    steps = []
    step_counter = 1
    
    for transition in transitions:
        for action in transition.get('actions', []):
            step = {
                'step_number': step_counter,
                'from_node_id': transition['from_node_id'],
                'to_node_id': transition['to_node_id'],
                'from_node_label': transition.get('from_node_label', ''),
                'to_node_label': transition.get('to_node_label', ''),
                'action': action.get('command', ''),
                'action_info': action,
                'description': f"Execute {action.get('label', action.get('command', 'Unknown Action'))} to navigate from '{transition.get('from_node_label', '')}' to '{transition.get('to_node_label', '')}'"
            }
            steps.append(step)
            step_counter += 1
    
    return steps

def find_entry_point(tree_id: str, team_id: str) -> Optional[str]:
    """
    Find the entry/root node of a navigation tree
    
    Args:
        tree_id: Navigation tree ID
        team_id: Team ID for security
        
    Returns:
        Entry point node ID or None if not found
    """
    from navigation_cache import get_cached_graph
    from navigation_graph import get_entry_points
    
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
    
    from navigation_cache import get_cached_graph
    from navigation_graph import get_entry_points, get_node_info, get_edge_action
    
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
    from navigation_cache import get_cached_graph
    from navigation_graph import get_entry_points
    
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
        from navigation_cache import get_cached_graph
        from navigation_graph import get_entry_points, get_node_info
        
        G = get_cached_graph(tree_id, team_id)
        if not G:
            print(f"[@navigation:pathfinding:find_optimal_edge_validation_sequence] Failed to get graph for tree {tree_id}")
            return []
        
        # Get all edges that need to be validated - SORT FOR DETERMINISTIC BEHAVIOR
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
    
    optimizations_used = list(str(opt) for opt in optimization_types)
    
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
    
    # Add analysis section for backward compatibility
    analysis = {
        'very_efficient': efficiency_ratio > 0.8 and total_navigation_cost < edge_validations * 0.2,
        'efficient': efficiency_ratio > 0.6,
        'needs_improvement': efficiency_ratio < 0.4 or total_navigation_cost > edge_validations
    }
    
    # Use only primitive types in the returned dictionary
    return {
        'total_steps': total_steps,
        'edge_validations': edge_validations,
        'navigation_steps': navigation_steps,
        'bidirectional_optimizations': bidirectional_optimizations,
        'bidirectional_pairs': bidirectional_pairs,
        'optimization_types': list(str(opt) for opt in optimization_types),  # Convert to strings
        'optimizations_used': optimizations_used,  # For backward compatibility
        'optimization_counts': {str(k): v for k, v in optimization_counts.items()},  # Ensure keys are strings
        'total_navigation_cost': total_navigation_cost,
        'efficiency_ratio': efficiency_ratio,
        'bidirectional_efficiency': bidirectional_efficiency,
        'position_changes': position_changes,
        'efficiency_rating': efficiency_rating,
        'analysis': analysis  # For backward compatibility
    }

def _create_simple_networkx_validation_sequence(G: nx.DiGraph, edges_to_validate: List[Tuple]) -> List[Dict]:
    """
    Simple NetworkX-based validation sequence.
    Focus on: hub start, bidirectional grouping, minimal navigation.
    """
    from navigation_graph import get_entry_points, get_node_info
    
    print(f"[@navigation:pathfinding:_create_simple_networkx_validation_sequence] Creating simple NetworkX validation sequence")
    
    # Find the hub node (highest degree) to start from
    degrees = dict(G.degree())
    hub_node = max(degrees.keys(), key=lambda n: degrees[n]) if degrees else None
    
    # Start from entry point if available, otherwise use hub
    entry_points = get_entry_points(G)
    start_node = entry_points[0] if entry_points else hub_node
    
    print(f"[@navigation:pathfinding:_create_simple_networkx_validation_sequence] Starting from: {start_node} (hub: {hub_node})")
    
    # Create edge sets for tracking
    remaining_edges = set((u, v) for u, v, _ in edges_to_validate)
    processed_edges = set()
    validation_sequence = []
    current_position = start_node
    step_number = 1
    
    # Process edges using simple greedy approach with NetworkX
    while remaining_edges:
        print(f"[@navigation:pathfinding:_create_simple_networkx_validation_sequence] Current position: {current_position}, Remaining edges: {len(remaining_edges)}")
        
        # Find best edge from current position
        best_edge = _find_best_edge_from_position(current_position, remaining_edges)
        
        if best_edge:
            # Process the edge
            from_node, to_node = best_edge
            edge_data = G.edges[from_node, to_node]
            
            print(f"[@navigation:pathfinding:_create_simple_networkx_validation_sequence] Processing edge from current position: {from_node} → {to_node}")
            
            # Add validation step
            validation_step = _create_validation_step(
                G, from_node, to_node, edge_data, step_number, 'direct_from_position'
            )
            validation_sequence.append(validation_step)
            processed_edges.add(best_edge)
            remaining_edges.remove(best_edge)
            step_number += 1
            current_position = to_node
            
            # Check for immediate bidirectional edge
            reverse_edge = (to_node, from_node)
            if reverse_edge in remaining_edges:
                print(f"[@navigation:pathfinding:_create_simple_networkx_validation_sequence] Processing bidirectional edge: {to_node} → {from_node}")
                reverse_edge_data = G.edges[to_node, from_node]
                
                reverse_validation_step = _create_validation_step(
                    G, to_node, from_node, reverse_edge_data, step_number, 'bidirectional_immediate'
                )
                validation_sequence.append(reverse_validation_step)
                processed_edges.add(reverse_edge)
                remaining_edges.remove(reverse_edge)
                step_number += 1
                current_position = from_node
        else:
            # No direct edge from current position, need to navigate
            # Use NetworkX to find shortest path to any remaining edge
            next_edge = _find_closest_edge_networkx(G, current_position, remaining_edges)
            
            if not next_edge:
                print(f"[@navigation:pathfinding:_create_simple_networkx_validation_sequence] No reachable edges remaining")
                break
            
            target_from_node, target_to_node = next_edge
            print(f"[@navigation:pathfinding:_create_simple_networkx_validation_sequence] Need to navigate from {current_position} to {target_from_node} for edge {target_from_node} → {target_to_node}")
            
            # Navigate to the source of the next edge if needed
            if current_position != target_from_node:
                try:
                    if nx.has_path(G, current_position, target_from_node):
                        nav_path = nx.shortest_path(G, current_position, target_from_node)
                        print(f"[@navigation:pathfinding:_create_simple_networkx_validation_sequence] Navigation path: {' → '.join(nav_path)}")
                        
                        # Add navigation steps (but avoid redundant navigation)
                        for i in range(len(nav_path) - 1):
                            nav_from = nav_path[i]
                            nav_to = nav_path[i + 1]
                            
                            # Always add navigation steps - don't skip based on processed_edges
                            # Navigation and validation are different purposes
                            if G.has_edge(nav_from, nav_to):
                                nav_edge_data = G.edges[nav_from, nav_to]
                                nav_step = _create_validation_step(
                                    G, nav_from, nav_to, nav_edge_data, step_number, 'navigation'
                                )
                                nav_step['validation_type'] = 'navigation'
                                nav_step['navigation_cost'] = 1
                                validation_sequence.append(nav_step)
                                step_number += 1
                                print(f"[@navigation:pathfinding:_create_simple_networkx_validation_sequence] Added navigation step: {nav_from} → {nav_to}")
                        
                        current_position = target_from_node
                        print(f"[@navigation:pathfinding:_create_simple_networkx_validation_sequence] Navigation complete, now at: {current_position}")
                    else:
                        print(f"[@navigation:pathfinding:_create_simple_networkx_validation_sequence] No path to {target_from_node}")
                        break
                except nx.NetworkXNoPath:
                    print(f"[@navigation:pathfinding:_create_simple_networkx_validation_sequence] NetworkX no path to {target_from_node}")
                    break
            
            # After navigation, continue the loop to process the edge from the new position
            # Don't process the edge here, let the next iteration handle it
    
    print(f"[@navigation:pathfinding:_create_simple_networkx_validation_sequence] Created sequence with {len(validation_sequence)} steps")
    
    # Post-process the sequence to remove redundant navigation steps
    optimized_sequence = _post_process_validation_sequence(validation_sequence)
    
    # Re-number steps after post-processing
    for i, step in enumerate(optimized_sequence):
        step['step_number'] = i + 1
    
    # Analyze efficiency
    edge_validations = sum(1 for step in optimized_sequence if step.get('validation_type') == 'edge')
    navigation_steps = sum(1 for step in optimized_sequence if step.get('validation_type') == 'navigation')
    print(f"[@navigation:pathfinding:_create_simple_networkx_validation_sequence] Final optimized sequence: {len(optimized_sequence)} steps")
    print(f"[@navigation:pathfinding:_create_simple_networkx_validation_sequence] Efficiency: {edge_validations} validations, {navigation_steps} navigation steps")
    
    return optimized_sequence

def _post_process_validation_sequence(sequence: List[Dict]) -> List[Dict]:
    """
    Post-process the validation sequence to remove redundant navigation steps.
    
    Optimizations applied:
    1. Remove navigation steps that aren't needed because we're already at the target
    2. Remove navigation steps that immediately follow a step with the same target
    3. Group bidirectional edges more aggressively
    4. Optimize navigation paths between validations
    """
    print(f"[@navigation:pathfinding:_post_process_validation_sequence] Post-processing sequence with {len(sequence)} steps")
    
    # Initialize optimized sequence
    optimized_sequence = []
    current_position = None
    
    # Collect all bidirectional pairs for better grouping
    bidirectional_pairs = {}
    for i, step in enumerate(sequence):
        if step.get('validation_type') != 'navigation':
            for j in range(i+1, len(sequence)):
                next_step = sequence[j]
                if (next_step.get('validation_type') != 'navigation' and
                    next_step['from_node_id'] == step['to_node_id'] and
                    next_step['to_node_id'] == step['from_node_id']):
                    # Found a bidirectional pair
                    key = tuple(sorted([step['from_node_id'], step['to_node_id']]))
                    if key not in bidirectional_pairs:
                        bidirectional_pairs[key] = []
                    # Store indices instead of the actual step dictionaries
                    bidirectional_pairs[key].append((i, j))
                    break
    
    print(f"[@navigation:pathfinding:_post_process_validation_sequence] Found {len(bidirectional_pairs)} bidirectional pairs")
    
    # Track processed steps by index
    processed_indices = set()
    
    # Track position through the sequence
    for i, step in enumerate(sequence):
        # Skip if already processed
        if i in processed_indices:
            continue
            
        # First step - just add it and set position
        if current_position is None:
            optimized_sequence.append(step)
            current_position = step['to_node_id']
            processed_indices.add(i)
            continue
        
        # Check if this step starts from where we actually are
        if step['from_node_id'] != current_position:
            print(f"[@navigation:pathfinding:_post_process_validation_sequence] Warning: Position mismatch - current position is {current_position} but step starts from {step['from_node_id']}")
            # Skip this step as it's invalid - position tracking is critical
            continue
        
        # For navigation steps, check if they're redundant
        if step.get('validation_type') == 'navigation':
            # Check if we're already at the target
            if step['from_node_id'] == step['to_node_id']:
                print(f"[@navigation:pathfinding:_post_process_validation_sequence] Removing redundant self-navigation: {step['from_node_label']} → {step['to_node_label']}")
                continue
            
            # Check if we just came from this target
            if optimized_sequence and optimized_sequence[-1]['from_node_id'] == step['to_node_id'] and optimized_sequence[-1]['to_node_id'] == step['from_node_id']:
                print(f"[@navigation:pathfinding:_post_process_validation_sequence] Removing redundant back-and-forth navigation: {step['from_node_label']} → {step['to_node_label']}")
                continue
            
            # Check if this navigation leads to an already validated bidirectional edge
            is_redundant_navigation = False
            for key in bidirectional_pairs:
                if step['to_node_id'] in key:
                    # Check if all pairs involving this node have been processed
                    all_processed = True
                    for pair_indices in bidirectional_pairs[key]:
                        if not all(idx in processed_indices for idx in pair_indices):
                            all_processed = False
                            break
                    
                    if all_processed:
                        is_redundant_navigation = True
                        break
            
            if is_redundant_navigation:
                print(f"[@navigation:pathfinding:_post_process_validation_sequence] Skipping navigation to completed bidirectional node: {step['from_node_label']} → {step['to_node_label']}")
                continue
        
        # Process bidirectional edges more efficiently
        elif step.get('validation_type') != 'navigation':
            # Check if this step is part of a bidirectional pair
            key = tuple(sorted([step['from_node_id'], step['to_node_id']]))
            if key in bidirectional_pairs:
                for pair_indices in bidirectional_pairs[key]:
                    first_idx, second_idx = pair_indices
                    
                    # If this is the first part of a pair and we're at the right position
                    if first_idx == i:
                        # Mark as processed
                        processed_indices.add(first_idx)
                        processed_indices.add(second_idx)
                        
                        # Get both steps
                        forward_step = sequence[first_idx]
                        reverse_step = sequence[second_idx]
                        
                        # Add both steps with proper optimization flags
                        forward_step = forward_step.copy()  # Create a copy to avoid modifying the original
                        forward_step['optimization'] = 'bidirectional_immediate'
                        optimized_sequence.append(forward_step)
                        
                        # Make sure the reverse step comes next
                        reverse_step = reverse_step.copy()  # Create a copy to avoid modifying the original
                        reverse_step['optimization'] = 'bidirectional_immediate'
                        reverse_step['from_node_id'] = forward_step['to_node_id']  # Ensure position is correct
                        optimized_sequence.append(reverse_step)
                        
                        # Update position after both steps
                        current_position = reverse_step['to_node_id']
                        
                        print(f"[@navigation:pathfinding:_post_process_validation_sequence] Processed bidirectional pair: {forward_step['from_node_label']} ↔ {forward_step['to_node_label']}")
                        
                        # Skip the regular step addition since we handled it specially
                        break
                else:
                    # No pair found or processed - add as normal
                    optimized_sequence.append(step)
                    current_position = step['to_node_id']
                    processed_indices.add(i)
                continue
        
        # This step is valid, add it and update position
        optimized_sequence.append(step)
        current_position = step['to_node_id']
        processed_indices.add(i)
    
    # Re-number steps
    for i, step in enumerate(optimized_sequence):
        step['step_number'] = i + 1
    
    # Log optimization results
    initial_edge_validations = sum(1 for step in sequence if step.get('validation_type') == 'edge')
    initial_navigation_steps = sum(1 for step in sequence if step.get('validation_type') == 'navigation')
    
    final_edge_validations = sum(1 for step in optimized_sequence if step.get('validation_type') == 'edge')
    final_navigation_steps = sum(1 for step in optimized_sequence if step.get('validation_type') == 'navigation')
    
    bidirectional_optimizations = sum(1 for step in optimized_sequence if step.get('optimization') == 'bidirectional_immediate')
    
    print(f"[@navigation:pathfinding:_post_process_validation_sequence] Initial sequence: {len(sequence)} steps ({initial_edge_validations} validations, {initial_navigation_steps} navigation)")
    print(f"[@navigation:pathfinding:_post_process_validation_sequence] Optimized sequence: {len(optimized_sequence)} steps ({final_edge_validations} validations, {final_navigation_steps} navigation)")
    print(f"[@navigation:pathfinding:_post_process_validation_sequence] Bidirectional optimizations: {bidirectional_optimizations}")
    
    return optimized_sequence

def _find_best_edge_from_position(current_position: str, remaining_edges: set) -> Optional[Tuple]:
    """Find the best edge to process from current position"""
    # First priority: direct edges from current position
    direct_edges = [edge for edge in remaining_edges if edge[0] == current_position]
    
    if direct_edges:
        # Check if we have multiple edges from this position
        if len(direct_edges) > 1:
            # If we have multiple edges, prefer ones that DON'T have bidirectional counterparts
            # This way we process all forward edges first, then come back for reverse edges
            non_bidirectional_edges = []
            bidirectional_edges = []
            
            for edge in direct_edges:
                reverse_edge = (edge[1], edge[0])
                if reverse_edge in remaining_edges:
                    bidirectional_edges.append(edge)
                else:
                    non_bidirectional_edges.append(edge)
            
            # Prefer non-bidirectional edges first (to avoid getting stranded)
            if non_bidirectional_edges:
                return sorted(non_bidirectional_edges)[0]
            else:
                # If all edges are bidirectional, choose the one that leads to a node with more remaining edges
                # This helps us stay in areas with more work to do
                best_edge = None
                max_remaining_edges_from_target = -1
                
                for edge in bidirectional_edges:
                    target_node = edge[1]
                    edges_from_target = len([e for e in remaining_edges if e[0] == target_node])
                    if edges_from_target > max_remaining_edges_from_target:
                        max_remaining_edges_from_target = edges_from_target
                        best_edge = edge
                
                return best_edge or sorted(bidirectional_edges)[0]
        else:
            # Only one edge available, take it
            return direct_edges[0]
    
    return None

def _find_closest_edge_networkx(G: nx.DiGraph, current_position: str, remaining_edges: set) -> Optional[Tuple]:
    """Use NetworkX to find the closest remaining edge"""
    # Get all source nodes of remaining edges
    source_nodes = set(edge[0] for edge in remaining_edges)
    
    # Find shortest path to any source node
    shortest_distance = float('inf')
    closest_edge = None
    
    for source_node in source_nodes:
        if source_node == current_position:
            # We're already at a source node, find an edge from here
            edges_from_here = [edge for edge in remaining_edges if edge[0] == source_node]
            if edges_from_here:
                return sorted(edges_from_here)[0]  # Deterministic choice
        
        try:
            if nx.has_path(G, current_position, source_node):
                distance = nx.shortest_path_length(G, current_position, source_node)
                if distance < shortest_distance:
                    shortest_distance = distance
                    # Find an edge from this source node
                    edges_from_source = [edge for edge in remaining_edges if edge[0] == source_node]
                    if edges_from_source:
                        closest_edge = sorted(edges_from_source)[0]  # Deterministic choice
        except nx.NetworkXNoPath:
            continue
    
    return closest_edge

def _create_validation_step(G: nx.DiGraph, from_node: str, to_node: str, edge_data: Dict, step_number: int, optimization: str) -> Dict:
    """
    Create a validation step with consistent format.
    """
    from navigation_graph import get_node_info
    
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

def _create_simple_edge_validation_sequence(G: nx.DiGraph, edges_to_validate: List[Tuple]) -> List[Dict]:
    """Fallback: create simple sequential edge validation"""
    from navigation_graph import get_node_info
    
    validation_sequence = []
    
    for i, (from_node, to_node, edge_data) in enumerate(edges_to_validate):
        from_info = get_node_info(G, from_node)
        to_info = get_node_info(G, to_node)
        
        validation_sequence.append({
            'step_number': i + 1,
            'validation_type': 'edge',
            'from_node_id': from_node,
            'to_node_id': to_node,
            'from_node_label': from_info.get('label', from_node) if from_info else from_node,
            'to_node_label': to_info.get('label', to_node) if to_info else to_node,
            'actions': edge_data.get('actions', []),
            'retryActions': edge_data.get('retryActions', []),
            'description': f"Validate edge: {from_info.get('label', from_node) if from_info else from_node} → {to_info.get('label', to_node) if to_info else to_node}",
            'navigation_cost': 1,  # Assume navigation needed between each edge
            'optimization': 'simple_sequential'
        })
    
    print(f"[@navigation:pathfinding:_create_simple_edge_validation_sequence] Created simple validation sequence with {len(validation_sequence)} steps")
    return validation_sequence 
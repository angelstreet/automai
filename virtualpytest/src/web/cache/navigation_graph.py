"""
NetworkX Graph Management for Navigation Trees
Handles building and managing NetworkX graphs from navigation data
"""

import networkx as nx
from typing import Dict, List, Optional

def create_networkx_graph(nodes: List[Dict], edges: List[Dict]) -> nx.DiGraph:
    """
    Create NetworkX directed graph from navigation nodes and edges
    
    Args:
        nodes: List of navigation nodes from database
        edges: List of navigation edges from database
        
    Returns:
        NetworkX directed graph
    """
    print(f"[@navigation:graph:create_networkx_graph] Creating graph with {len(nodes)} nodes and {len(edges)} edges")
    
    # Create directed graph for navigation flow
    G = nx.DiGraph()
    
    # Add nodes with their data
    for node in nodes:
        node_id = node.get('id')
        if not node_id:
            print(f"[@navigation:graph:create_networkx_graph] Warning: Node without ID found, skipping")
            continue
            
        # Add node with all its attributes
        # Handle both database format (direct fields) and ReactFlow format (data.field)
        node_data = node.get('data', {})
        label = node.get('label') or node_data.get('label', '')
        
        # Enhanced entry point detection
        is_entry_point = (
            node.get('is_entry_point', False) or 
            node_data.get('is_entry_point', False) or
            node_data.get('is_root', False) or
            node_data.get('node_type') == 'entry' or
            node.get('node_type') == 'entry' or
            label.lower() == 'entry'
        )
        
        print(f"[@navigation:graph:create_networkx_graph] Adding node: {label} ({node_id})")
        
        G.add_node(node_id, **{
            'label': label,
            'node_type': node.get('node_type') or node_data.get('type', 'screen'),
            'description': node.get('description') or node_data.get('description', ''),
            'screenshot_url': node.get('screenshot_url') or node_data.get('screenshot'),
            'is_entry_point': is_entry_point,
            'is_exit_point': node.get('is_exit_point', False) or node_data.get('is_exit_point', False),
            'has_children': node.get('has_children', False) or node_data.get('has_children', False),
            'child_tree_id': node.get('child_tree_id') or node_data.get('child_tree_id'),
            'metadata': node.get('metadata', {}) or node_data.get('metadata', {}),
            'verifications': node.get('verifications') or node_data.get('verifications', [])
        })
    
    print(f"[@navigation:graph:create_networkx_graph] Added {len(G.nodes)} nodes to graph")
    
    # Add edges with actions as attributes
    edges_added = 0
    edges_skipped = 0
    
    print(f"[@navigation:graph:create_networkx_graph] ===== ADDING EDGES WITH ACTIONS =====")
    
    for edge in edges:
        # Handle both ReactFlow format (source/target) and database format (source_id/target_id)
        source_id = edge.get('source') or edge.get('source_id')
        target_id = edge.get('target') or edge.get('target_id')
        
        if not source_id or not target_id:
            print(f"[@navigation:graph:create_networkx_graph] Warning: Edge without source/target found, skipping. Available keys: {list(edge.keys())}")
            edges_skipped += 1
            continue
            
        # Check if nodes exist
        if source_id not in G.nodes or target_id not in G.nodes:
            print(f"[@navigation:graph:create_networkx_graph] Warning: Edge references non-existent nodes {source_id} -> {target_id}, skipping")
            print(f"[@navigation:graph:create_networkx_graph] DEBUG: Available nodes: {list(G.nodes)}")
            print(f"[@navigation:graph:create_networkx_graph] DEBUG: Source exists: {source_id in G.nodes}, Target exists: {target_id in G.nodes}")
            edges_skipped += 1
            continue
        
        # Get resolved actions from cache - cache provides fully resolved objects
        edge_data = edge.get('data', {})
        actions_list = edge_data.get('actions', [])
        retry_actions_list = edge_data.get('retryActions', [])
        
        # Get node labels for logging
        source_node_data = G.nodes[source_id]
        target_node_data = G.nodes[target_id]
        source_label = source_node_data.get('label', source_id)
        target_label = target_node_data.get('label', target_id)
        
        # Log detailed edge information
        print(f"[@navigation:graph:create_networkx_graph] Adding Edge: {source_label} → {target_label}")
        print(f"[@navigation:graph:create_networkx_graph]   Source ID: {source_id}")
        print(f"[@navigation:graph:create_networkx_graph]   Target ID: {target_id}")
        print(f"[@navigation:graph:create_networkx_graph]   Actions ({len(actions_list)}):")
        
        if actions_list:
            for i, action in enumerate(actions_list):
                command = action.get('command', 'unknown')
                params = action.get('params', {})
                params_str = ', '.join([f"{k}={v}" for k, v in params.items()]) if params else 'no params'
                print(f"[@navigation:graph:create_networkx_graph]     {i+1}. {command}({params_str})")
        else:
            print(f"[@navigation:graph:create_networkx_graph]     No actions defined")
        
        print(f"[@navigation:graph:create_networkx_graph]   Retry Actions ({len(retry_actions_list)}):")
        if retry_actions_list:
            for i, action in enumerate(retry_actions_list):
                command = action.get('command', 'unknown')
                params = action.get('params', {})
                params_str = ', '.join([f"{k}={v}" for k, v in params.items()]) if params else 'no params'
                print(f"[@navigation:graph:create_networkx_graph]     {i+1}. {command}({params_str})")
        else:
            print(f"[@navigation:graph:create_networkx_graph]     No retry actions defined")
        
        # Get the primary action for pathfinding
        primary_action = actions_list[0]['command'] if actions_list else None
        
        # Add edge with resolved actions
        G.add_edge(source_id, target_id, **{
            'edge_id': edge.get('id'),  # Store the actual edge ID for metrics
            'go_action': primary_action,
            'actions': actions_list,
            'retryActions': retry_actions_list,
            'comeback_action': edge_data.get('comeback_action'),
            'edge_type': edge_data.get('edge_type', 'navigation'),
            'description': edge_data.get('description', ''),
            'is_bidirectional': edge_data.get('is_bidirectional', False),
            'conditions': edge_data.get('conditions', {}),
            'metadata': edge_data.get('metadata', {}),
            'finalWaitTime': edge_data.get('finalWaitTime', 2000),
            'weight': 1
        })
        
        # Add reverse edge if bidirectional
        if edge_data.get('is_bidirectional', False):
            comeback_action = edge_data.get('comeback_action') or primary_action
            print(f"[@navigation:graph:create_networkx_graph] Adding Bidirectional Edge: {target_label} → {source_label}")
            print(f"[@navigation:graph:create_networkx_graph]   Comeback Action: {comeback_action}")
            
            G.add_edge(target_id, source_id, **{
                'go_action': comeback_action,
                'comeback_action': primary_action,
                'edge_type': edge_data.get('edge_type', 'navigation'),
                'description': f"Reverse: {edge_data.get('description', '')}",
                'is_bidirectional': True,
                'conditions': edge_data.get('conditions', {}),
                'metadata': edge_data.get('metadata', {}),
                'weight': 1
            })
        
        edges_added += 1
        print(f"[@navigation:graph:create_networkx_graph] -----")
    
    print(f"[@navigation:graph:create_networkx_graph] ===== GRAPH CONSTRUCTION COMPLETE =====")
    print(f"[@navigation:graph:create_networkx_graph] Successfully created graph with {len(G.nodes)} nodes and {len(G.edges)} edges")
    print(f"[@navigation:graph:create_networkx_graph] Edge processing summary: {edges_added} added, {edges_skipped} skipped")
    
    # Log all possible transitions summary
    print(f"[@navigation:graph:create_networkx_graph] ===== ALL POSSIBLE TRANSITIONS SUMMARY =====")
    for i, (from_node, to_node, edge_data) in enumerate(G.edges(data=True), 1):
        from_info = G.nodes[from_node]
        to_info = G.nodes[to_node]
        from_label = from_info.get('label', from_node)
        to_label = to_info.get('label', to_node)
        actions = edge_data.get('actions', [])
        action_summary = f"{len(actions)} actions" if actions else "no actions"
        primary_action = edge_data.get('go_action', 'none')
        
        print(f"[@navigation:graph:create_networkx_graph] Transition {i:2d}: {from_label} → {to_label} (primary: {primary_action}, {action_summary})")
    
    print(f"[@navigation:graph:create_networkx_graph] ===== END TRANSITIONS SUMMARY =====")
    
    return G

def get_node_info(graph: nx.DiGraph, node_id: str) -> Optional[Dict]:
    """
    Get node information from NetworkX graph
    
    Args:
        graph: NetworkX directed graph
        node_id: Node identifier
        
    Returns:
        Node information dictionary or None if not found
    """
    if node_id not in graph.nodes:
        return None
        
    return dict(graph.nodes[node_id])

def get_edge_action(graph: nx.DiGraph, from_node: str, to_node: str) -> Optional[str]:
    """
    Get navigation action between two nodes
    
    Args:
        graph: NetworkX directed graph
        from_node: Source node ID
        to_node: Target node ID
        
    Returns:
        Navigation action string or None if edge doesn't exist
    """
    if not graph.has_edge(from_node, to_node):
        return None
        
    edge_data = graph.edges[from_node, to_node]
    return edge_data.get('go_action')

def get_entry_points(graph: nx.DiGraph) -> List[str]:
    """
    Get all entry point nodes from the graph
    
    Args:
        graph: NetworkX directed graph
        
    Returns:
        List of entry point node IDs
    """
    entry_points = []
    for node_id, node_data in graph.nodes(data=True):
        if node_data.get('is_entry_point', False):
            entry_points.append(node_id)
    
    return entry_points

def get_exit_points(graph: nx.DiGraph) -> List[str]:
    """
    Get all exit point nodes from the graph
    
    Args:
        graph: NetworkX directed graph
        
    Returns:
        List of exit point node IDs
    """
    exit_points = []
    for node_id, node_data in graph.nodes(data=True):
        if node_data.get('is_exit_point', False):
            exit_points.append(node_id)
    
    return exit_points

def validate_graph(graph: nx.DiGraph) -> Dict:
    """
    Validate the navigation graph for potential issues
    
    Args:
        graph: NetworkX directed graph
        
    Returns:
        Validation results dictionary
    """
    issues = []
    warnings = []
    
    # Check for isolated nodes
    isolated = list(nx.isolates(graph))
    if isolated:
        warnings.append(f"Found {len(isolated)} isolated nodes: {isolated}")
    
    # Check for entry points
    entry_points = get_entry_points(graph)
    if not entry_points:
        issues.append("No entry point nodes found")
    elif len(entry_points) > 1:
        warnings.append(f"Multiple entry points found: {entry_points}")
    
    # Check for unreachable nodes
    if entry_points:
        reachable = nx.descendants(graph, entry_points[0])
        reachable.add(entry_points[0])
        unreachable = set(graph.nodes) - reachable
        if unreachable:
            warnings.append(f"Found {len(unreachable)} unreachable nodes: {list(unreachable)}")
    
    # Check for missing actions
    missing_actions = []
    for from_node, to_node, edge_data in graph.edges(data=True):
        if not edge_data.get('go_action'):
            missing_actions.append(f"{from_node} -> {to_node}")
    
    if missing_actions:
        warnings.append(f"Found {len(missing_actions)} edges without go_action")
    
    return {
        'is_valid': len(issues) == 0,
        'issues': issues,
        'warnings': warnings,
        'stats': {
            'nodes': len(graph.nodes),
            'edges': len(graph.edges),
            'entry_points': len(entry_points),
            'exit_points': len(get_exit_points(graph)),
            'isolated_nodes': len(isolated)
        }
    } 
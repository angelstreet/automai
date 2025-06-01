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
        
        G.add_node(node_id, **{
            'label': label,
            'node_type': node.get('node_type') or node_data.get('type', 'screen'),
            'description': node.get('description') or node_data.get('description', ''),
            'is_entry_point': node.get('is_entry_point') or node_data.get('is_root', False),
            'is_exit_point': node.get('is_exit_point', False),
            'has_children': node.get('has_children', False),
            'child_tree_id': node.get('child_tree_id'),
            'screenshot_url': node.get('screenshot_url') or node_data.get('screenshot'),
            'position_x': node.get('position_x', 0),
            'position_y': node.get('position_y', 0),
            'width': node.get('width', 200),
            'height': node.get('height', 120),
            'metadata': node.get('metadata', {})
        })
    
    # Add edges with actions as attributes
    for edge in edges:
        # DEBUG: Show what fields are available in each edge
        print(f"[@navigation:graph:create_networkx_graph] Processing edge: {edge}")
        
        # Handle both ReactFlow format (source/target) and database format (source_id/target_id)
        source_id = edge.get('source') or edge.get('source_id')
        target_id = edge.get('target') or edge.get('target_id')
        
        print(f"[@navigation:graph:create_networkx_graph] Edge connection: {source_id} -> {target_id}")
        
        if not source_id or not target_id:
            print(f"[@navigation:graph:create_networkx_graph] Warning: Edge without source/target found, skipping. Available keys: {list(edge.keys())}")
            continue
            
        # Check if nodes exist
        if source_id not in G.nodes or target_id not in G.nodes:
            print(f"[@navigation:graph:create_networkx_graph] Warning: Edge references non-existent nodes {source_id} -> {target_id}, skipping")
            print(f"[@navigation:graph:create_networkx_graph] Available nodes: {list(G.nodes)}")
            continue
        
        # Get action from edge data
        edge_data = edge.get('data', {})
        action = edge_data.get('action', {})
        go_action = action.get('command') or action.get('id') or edge_data.get('go_action')
        
        # Add edge with navigation actions and metadata
        G.add_edge(source_id, target_id, **{
            'go_action': go_action,
            'comeback_action': edge_data.get('comeback_action'),
            'edge_type': edge_data.get('edge_type', 'navigation'),
            'description': edge_data.get('description', ''),
            'is_bidirectional': edge_data.get('is_bidirectional', False),
            'conditions': edge_data.get('conditions', {}),
            'metadata': edge_data.get('metadata', {}),
            'weight': 1  # Default weight for pathfinding
        })
        
        print(f"[@navigation:graph:create_networkx_graph] Added edge {source_id} -> {target_id} with action: {go_action}")
        
        # Add reverse edge if bidirectional
        if edge_data.get('is_bidirectional', False):
            comeback_action = edge_data.get('comeback_action') or go_action
            G.add_edge(target_id, source_id, **{
                'go_action': comeback_action,
                'comeback_action': go_action,
                'edge_type': edge_data.get('edge_type', 'navigation'),
                'description': f"Reverse: {edge_data.get('description', '')}",
                'is_bidirectional': True,
                'conditions': edge_data.get('conditions', {}),
                'metadata': edge_data.get('metadata', {}),
                'weight': 1
            })
            print(f"[@navigation:graph:create_networkx_graph] Added reverse edge {target_id} -> {source_id} with action: {comeback_action}")
    
    print(f"[@navigation:graph:create_networkx_graph] Successfully created graph with {len(G.nodes)} nodes and {len(G.edges)} edges")
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
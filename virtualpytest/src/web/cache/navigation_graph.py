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
            node.get('node_type') == 'entry'
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
        
        # Get actions from edge data - handle both multiple actions and single action formats
        edge_data = edge.get('data', {})
        
        # Handle multiple actions format (new format)
        actions_list = []
        if edge_data.get('actions') and isinstance(edge_data['actions'], list) and len(edge_data['actions']) > 0:
            # New format: multiple actions
            for action in edge_data['actions']:
                if action and action.get('id'):  # Only include actions that have an ID
                    action_info = {
                        'id': action.get('id'),
                        'label': action.get('label', action.get('id', 'Unknown Action')),
                        'command': action.get('command', action.get('id')),
                        'params': action.get('params', {}),
                        'requiresInput': action.get('requiresInput', False),
                        'inputValue': action.get('inputValue', ''),
                        'waitTime': action.get('waitTime', 1000)
                    }
                    actions_list.append(action_info)
        
        # Handle retry actions format (both full objects and ID references)
        retry_actions_list = []
        
        # Handle full retry action objects (legacy format)
        if edge_data.get('retryActions') and isinstance(edge_data['retryActions'], list) and len(edge_data['retryActions']) > 0:
            for action in edge_data['retryActions']:
                if action and action.get('id'):  # Only include actions that have an ID
                    action_info = {
                        'id': action.get('id'),
                        'label': action.get('label', action.get('id', 'Unknown Action')),
                        'command': action.get('command', action.get('id')),
                        'params': action.get('params', {}),
                        'requiresInput': action.get('requiresInput', False),
                        'inputValue': action.get('inputValue', ''),
                        'waitTime': action.get('waitTime', 1000)
                    }
                    retry_actions_list.append(action_info)
        
        # Handle retry action IDs (new format) - just store the IDs for now
        # Resolution of IDs to full actions should be done by the UI layer
        elif edge_data.get('retry_action_ids') and isinstance(edge_data['retry_action_ids'], list) and len(edge_data['retry_action_ids']) > 0:
            for action_id in edge_data['retry_action_ids']:
                if action_id:  # Only include non-empty IDs
                    action_info = {
                        'id': action_id,
                        'label': f'Retry Action {action_id[:8]}...',  # Placeholder label
                        'command': 'resolve_from_id',  # Placeholder command indicating ID needs resolution
                        'params': {},
                        'requiresInput': False,
                        'inputValue': '',
                        'waitTime': 1000
                    }
                    retry_actions_list.append(action_info)
        
        # Get the primary action for pathfinding (first action or fallback)
        primary_action = actions_list[0]['command'] if actions_list else None
        
        # Add edge with navigation actions and metadata
        G.add_edge(source_id, target_id, **{
            'go_action': primary_action,  # Primary action for pathfinding
            'actions': actions_list,      # Full list of actions to execute
            'retryActions': retry_actions_list,  # Full list of retry actions to execute on failure
            'comeback_action': edge_data.get('comeback_action'),
            'edge_type': edge_data.get('edge_type', 'navigation'),
            'description': edge_data.get('description', ''),
            'is_bidirectional': edge_data.get('is_bidirectional', False),
            'conditions': edge_data.get('conditions', {}),
            'metadata': edge_data.get('metadata', {}),
            'finalWaitTime': edge_data.get('finalWaitTime', 2000),
            'weight': 1  # Default weight for pathfinding
        })
        
        # Add reverse edge if bidirectional
        if edge_data.get('is_bidirectional', False):
            comeback_action = edge_data.get('comeback_action') or primary_action
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
    
    print(f"[@navigation:graph:create_networkx_graph] Successfully created graph with {len(G.nodes)} nodes and {len(G.edges)} edges")
    print(f"[@navigation:graph:create_networkx_graph] Edge processing summary: {edges_added} added, {edges_skipped} skipped")
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
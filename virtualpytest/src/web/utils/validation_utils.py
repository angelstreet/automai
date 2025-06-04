"""
Validation utility functions for navigation trees
"""

import sys
import os
from typing import List, Dict, Any, Optional

# Add paths for imports
web_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
web_utils_path = os.path.join(web_dir, 'utils')
sys.path.insert(0, web_utils_path)

def calculate_estimated_test_time(total_nodes: int, total_edges: int, reachable_nodes: int) -> int:
    """
    Calculate estimated test time for validation
    
    Args:
        total_nodes: Total number of nodes in tree
        total_edges: Total number of edges in tree
        reachable_nodes: Number of reachable nodes to test
        
    Returns:
        Estimated time in seconds
    """
    # Base time estimates:
    # - 2 seconds per reachable node for pathfinding
    # - 1 second per edge for edge validation
    # - 5 second base overhead
    
    node_time = reachable_nodes * 2
    edge_time = total_edges * 1
    base_overhead = 5
    
    return node_time + edge_time + base_overhead

def format_validation_results(results: Dict[str, Any]) -> Dict[str, Any]:
    """
    Format validation results for consistent output
    
    Args:
        results: Raw validation results
        
    Returns:
        Formatted validation results
    """
    formatted = {
        'treeId': results.get('treeId', ''),
        'summary': {
            'totalNodes': results.get('summary', {}).get('totalNodes', 0),
            'validNodes': results.get('summary', {}).get('validNodes', 0),
            'errorNodes': results.get('summary', {}).get('errorNodes', 0),
            'overallHealth': results.get('summary', {}).get('overallHealth', 'unknown'),
            'executionTime': results.get('summary', {}).get('executionTime', 0)
        },
        'nodeResults': results.get('nodeResults', [])
    }
    
    return formatted

def validate_node_reachability(tree_id: str, node_id: str, team_id: str) -> bool:
    """
    Check if a specific node is reachable in the tree
    
    Args:
        tree_id: Navigation tree ID
        node_id: Node to check
        team_id: Team ID for security
        
    Returns:
        True if node is reachable, False otherwise
    """
    try:
        from navigation_pathfinding import get_reachable_nodes
        
        reachable_nodes = get_reachable_nodes(tree_id, team_id)
        return node_id in reachable_nodes
        
    except Exception as e:
        print(f"[@utils:validation:validate_node_reachability] Error checking reachability for {node_id}: {e}")
        return False

def get_validation_health_color(health: str) -> str:
    """
    Get color representation for validation health status
    
    Args:
        health: Health status string
        
    Returns:
        Color code or name
    """
    health_colors = {
        'excellent': 'success',
        'good': 'info',
        'fair': 'warning',
        'poor': 'error'
    }
    
    return health_colors.get(health, 'default')

def generate_validation_summary(node_results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Generate summary statistics from node validation results
    
    Args:
        node_results: List of individual node validation results
        
    Returns:
        Summary statistics dictionary
    """
    total_nodes = len(node_results)
    valid_nodes = sum(1 for node in node_results if node.get('isValid', False))
    error_nodes = total_nodes - valid_nodes
    
    if total_nodes == 0:
        health = 'poor'
        success_rate = 0
    else:
        success_rate = valid_nodes / total_nodes
        if success_rate == 1.0:
            health = 'excellent'
        elif success_rate >= 0.8:
            health = 'good'
        elif success_rate >= 0.6:
            health = 'fair'
        else:
            health = 'poor'
    
    return {
        'totalNodes': total_nodes,
        'validNodes': valid_nodes,
        'errorNodes': error_nodes,
        'successRate': round(success_rate * 100, 1),
        'overallHealth': health
    }

def filter_validation_results(results: List[Dict[str, Any]], filter_type: str = 'all') -> List[Dict[str, Any]]:
    """
    Filter validation results by status
    
    Args:
        results: List of validation results
        filter_type: Filter type ('all', 'valid', 'error')
        
    Returns:
        Filtered results list
    """
    if filter_type == 'valid':
        return [result for result in results if result.get('isValid', False)]
    elif filter_type == 'error':
        return [result for result in results if not result.get('isValid', False)]
    else:
        return results 
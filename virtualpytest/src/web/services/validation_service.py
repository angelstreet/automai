"""
Validation Service for Navigation Trees

This service orchestrates the validation process by leveraging
existing pathfinding infrastructure to test all nodes and paths.
"""

import sys
import os
from typing import Dict, List, Any, Optional
import time
import json

# Add paths for imports
web_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
web_utils_path = os.path.join(web_dir, 'utils')
sys.path.insert(0, web_utils_path)

# Import existing pathfinding utilities
from navigation_pathfinding import (
    get_reachable_nodes,
    find_shortest_path,
    get_navigation_transitions,
    find_all_paths
)

# Import navigation cache
web_cache_path = os.path.join(web_dir, 'cache')
sys.path.insert(0, web_cache_path)
from navigation_cache import get_cached_graph
from navigation_graph import get_node_info, get_entry_points

class ValidationService:
    """Service for comprehensive navigation tree validation"""
    
    def get_validation_preview(self, tree_id: str, team_id: str) -> Dict[str, Any]:
        """
        Get preview of what will be validated
        
        Args:
            tree_id: Navigation tree ID
            team_id: Team ID for security
            
        Returns:
            Dictionary with preview data
        """
        print(f"[@service:validation:get_validation_preview] Getting preview for tree {tree_id}")
        
        try:
            # Get cached graph to analyze structure
            G = get_cached_graph(tree_id, team_id)
            if not G:
                raise Exception(f"Failed to load graph for tree {tree_id}")
            
            # Get basic metrics
            total_nodes = len(G.nodes())
            total_edges = len(G.edges())
            
            # Get all reachable nodes using existing pathfinding
            reachable_nodes = get_reachable_nodes(tree_id, team_id)
            
            # Get reachable edges with node names for display
            reachable_edges = []
            for edge in G.edges(data=True):
                from_node, to_node, edge_data = edge
                
                # Get node names for display
                from_info = get_node_info(G, from_node)
                to_info = get_node_info(G, to_node)
                from_name = from_info.get('label', from_node) if from_info else from_node
                to_name = to_info.get('label', to_node) if to_info else to_node
                
                reachable_edges.append({
                    'from': from_node,
                    'to': to_node,
                    'fromName': from_name,
                    'toName': to_name
                })
            
            # Exclude artificial entry node from counts (subtract 1 from both totals)
            actual_total_nodes = max(0, total_nodes - 1)
            actual_reachable_count = max(0, len(reachable_nodes) - 1)
            
            # Estimate test time (assuming 2 seconds per node + 1 second per edge)
            estimated_time = (actual_reachable_count * 2) + (total_edges * 1)
            
            preview = {
                'treeId': tree_id,
                'totalNodes': actual_total_nodes,
                'totalEdges': total_edges,
                'reachableNodes': reachable_nodes,
                'reachableEdges': reachable_edges,
                'estimatedTime': estimated_time
            }
            
            print(f"[@service:validation:get_validation_preview] Preview generated: {actual_total_nodes} nodes (excluding entry), {total_edges} edges, {actual_reachable_count} reachable (excluding entry)")
            return preview
            
        except Exception as e:
            print(f"[@service:validation:get_validation_preview] Error: {e}")
            raise
    
    def run_comprehensive_validation(self, tree_id: str, team_id: str) -> Dict[str, Any]:
        """
        Run comprehensive validation of the navigation tree
        
        Args:
            tree_id: Navigation tree ID
            team_id: Team ID for security
            
        Returns:
            Dictionary with validation results
        """
        print(f"[@service:validation:run_comprehensive_validation] Starting validation for tree {tree_id}")
        start_time = time.time()
        
        try:
            # Get reachable nodes to validate
            reachable_nodes = get_reachable_nodes(tree_id, team_id)
            print(f"[@service:validation:run_comprehensive_validation] Found {len(reachable_nodes)} reachable nodes")
            
            # Get graph for node information
            G = get_cached_graph(tree_id, team_id)
            if not G:
                raise Exception(f"Failed to load graph for tree {tree_id}")
            
            # Validate each reachable node
            node_results = []
            valid_count = 0
            
            for node_id in reachable_nodes:
                print(f"[@service:validation:run_comprehensive_validation] Validating node: {node_id}")
                
                node_result = self._validate_single_node(tree_id, node_id, team_id, G)
                node_results.append(node_result)
                
                if node_result['isValid']:
                    valid_count += 1
            
            # Calculate overall health
            total_nodes = len(node_results)
            error_count = total_nodes - valid_count
            
            # Exclude artificial entry node from summary counts
            actual_total_nodes = max(0, total_nodes - 1) if total_nodes > 0 else 0
            actual_error_count = max(0, error_count - 1) if error_count > 0 and total_nodes > 0 else error_count
            
            if actual_total_nodes == 0:
                health = 'poor'
            else:
                success_rate = valid_count / actual_total_nodes
                if success_rate == 1.0:
                    health = 'excellent'
                elif success_rate >= 0.8:
                    health = 'good'
                elif success_rate >= 0.6:
                    health = 'fair'
                else:
                    health = 'poor'
            
            execution_time = time.time() - start_time
            
            results = {
                'treeId': tree_id,
                'summary': {
                    'totalNodes': actual_total_nodes,
                    'validNodes': valid_count,
                    'errorNodes': actual_error_count,
                    'overallHealth': health,
                    'executionTime': round(execution_time, 2)
                },
                'nodeResults': node_results
            }
            
            print(f"[@service:validation:run_comprehensive_validation] Validation completed: {valid_count}/{actual_total_nodes} nodes valid (excluding entry), health: {health}")
            return results
            
        except Exception as e:
            print(f"[@service:validation:run_comprehensive_validation] Error: {e}")
            raise
    
    def _validate_single_node(self, tree_id: str, node_id: str, team_id: str, graph) -> Dict[str, Any]:
        """
        Validate a single node using existing pathfinding
        
        Args:
            tree_id: Navigation tree ID
            node_id: Node to validate
            team_id: Team ID for security
            graph: NetworkX graph object
            
        Returns:
            Dictionary with node validation result
        """
        try:
            # Get node information
            node_info = get_node_info(graph, node_id)
            node_name = node_info.get('label', node_id) if node_info else node_id
            
            # Test pathfinding to this node using existing infrastructure
            path_result = find_shortest_path(tree_id, node_id, team_id)
            
            is_valid = path_result is not None and len(path_result) > 0
            path_length = len(path_result) if path_result else 0
            
            errors = []
            if not is_valid:
                errors.append(f"No valid path found to node {node_id}")
            
            return {
                'nodeId': node_id,
                'nodeName': node_name,
                'isValid': is_valid,
                'pathLength': path_length,
                'errors': errors
            }
            
        except Exception as e:
            return {
                'nodeId': node_id,
                'nodeName': node_id,
                'isValid': False,
                'pathLength': 0,
                'errors': [f"Validation failed: {str(e)}"]
            }
    
    def export_validation_report(self, tree_id: str, team_id: str, format_type: str = 'json') -> Any:
        """
        Export validation report in specified format
        
        Args:
            tree_id: Navigation tree ID
            team_id: Team ID for security
            format_type: Export format ('json' or 'csv')
            
        Returns:
            Report data in requested format
        """
        print(f"[@service:validation:export_validation_report] Exporting report for tree {tree_id} in {format_type} format")
        
        try:
            # Run fresh validation for export
            results = self.run_comprehensive_validation(tree_id, team_id)
            
            if format_type == 'csv':
                return self._format_as_csv(results)
            else:
                return results
                
        except Exception as e:
            print(f"[@service:validation:export_validation_report] Error: {e}")
            raise
    
    def _format_as_csv(self, results: Dict[str, Any]) -> str:
        """
        Format validation results as CSV
        
        Args:
            results: Validation results dictionary
            
        Returns:
            CSV formatted string
        """
        import csv
        from io import StringIO
        
        output = StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow(['Node ID', 'Node Name', 'Status', 'Path Length', 'Errors'])
        
        # Write data rows
        for node in results['nodeResults']:
            status = 'Valid' if node['isValid'] else 'Error'
            errors = '; '.join(node['errors']) if node['errors'] else ''
            writer.writerow([
                node['nodeId'],
                node['nodeName'],
                status,
                node['pathLength'],
                errors
            ])
        
        return output.getvalue()

# Create singleton instance
validation_service = ValidationService() 
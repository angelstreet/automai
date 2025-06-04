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
import requests

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
    
    def __init__(self):
        self.navigation_api_base = 'http://localhost:5009/api/navigation'
    
    def get_validation_preview(self, tree_id: str, team_id: str) -> Dict[str, Any]:
        """
        Get validation preview showing what will be tested
        """
        print(f"[@service:validation:get_validation_preview] Getting preview for tree {tree_id}")
        
        try:
            # Get graph to analyze structure
            G = get_cached_graph(tree_id, team_id)
            if not G:
                raise Exception(f"Failed to load graph for tree {tree_id}")
            
            # Get all edges (navigation paths) to test
            all_edges = list(G.edges(data=True))
            print(f"[@service:validation:get_validation_preview] Found {len(all_edges)} total edges")
            
            # Filter out entry node edges since entry is artificial
            testable_edges = []
            edge_details = []
            
            for edge in all_edges:
                from_node, to_node, edge_data = edge
                from_info = get_node_info(G, from_node)
                to_info = get_node_info(G, to_node)
                
                # Skip edges from entry node (artificial)
                if from_info and from_info.get('type') == 'entry':
                    continue
                
                from_name = from_info.get('label', from_node) if from_info else from_node
                to_name = to_info.get('label', to_node) if to_info else to_node
                
                testable_edges.append((from_node, to_node))
                edge_details.append({
                    'from': from_node,
                    'to': to_node,
                    'fromName': from_name,
                    'toName': to_name
                })
            
            # Get all non-entry nodes
            all_nodes = list(G.nodes(data=True))
            testable_nodes = []
            
            for node_id, node_data in all_nodes:
                if node_data.get('type') != 'entry':
                    testable_nodes.append(node_id)
            
            # Calculate estimated time (3-5 seconds per edge test)
            estimated_time = len(testable_edges) * 4
            
            preview = {
                'treeId': tree_id,
                'totalNodes': len(testable_nodes),
                'totalEdges': len(testable_edges),
                'reachableNodes': testable_nodes,
                'reachableEdges': edge_details,
                'estimatedTime': estimated_time
            }
            
            print(f"[@service:validation:get_validation_preview] Preview: {len(testable_nodes)} nodes, {len(testable_edges)} edges to test")
            return preview
            
        except Exception as e:
            print(f"[@service:validation:get_validation_preview] Error: {e}")
            raise
    
    def run_comprehensive_validation(self, tree_id: str, team_id: str) -> Dict[str, Any]:
        """
        Run comprehensive validation by testing all navigation paths with smart dependency logic
        """
        print(f"[@service:validation:run_comprehensive_validation] Starting comprehensive validation for tree {tree_id}")
        start_time = time.time()
        
        try:
            # Get graph to analyze all edges
            G = get_cached_graph(tree_id, team_id)
            if not G:
                raise Exception(f"Failed to load graph for tree {tree_id}")
            
            # Find entry nodes first - these are always reachable as starting points
            entry_nodes = set()
            all_nodes = list(G.nodes(data=True))
            
            print(f"[@service:validation:run_comprehensive_validation] Analyzing {len(all_nodes)} nodes for entry detection")
            for node_id, node_data in all_nodes:
                # Check for entry node characteristics - improved detection
                node_type = node_data.get('node_type') or node_data.get('type') or node_data.get('label', '').lower()
                label = node_data.get('label', '')
                
                # STRICT ENTRY NODE DETECTION - only nodes explicitly marked as entry
                is_entry = (
                    node_type == 'entry' or 
                    node_data.get('is_entry_point', False) or
                    label.upper() == 'ENTRY'
                )
                
                if is_entry:
                    entry_nodes.add(node_id)
                    print(f"[@service:validation:run_comprehensive_validation] ✓ FOUND ENTRY node: {node_id} ({label})")
            
            # If no entry nodes found, find nodes with no incoming edges (could be implicit entry points)
            # BUT BE CAREFUL: Don't auto-detect regular nodes as entry points
            if not entry_nodes:
                print(f"[@service:validation:run_comprehensive_validation] No explicit ENTRY nodes found, checking for nodes with no incoming edges...")
                for node_id in G.nodes():
                    incoming_edges = list(G.predecessors(node_id))
                    if not incoming_edges:
                        node_info = get_node_info(G, node_id)
                        node_label = node_info.get('label', node_id) if node_info else node_id
                        node_type = node_info.get('type', '') if node_info else ''
                        
                        # Only consider as entry if it's not a regular menu node
                        if node_type != 'menu':
                            entry_nodes.add(node_id)
                            print(f"[@service:validation:run_comprehensive_validation] ✓ FOUND implicit ENTRY node: {node_id} ({node_label})")
            
            # Get all edges to test
            all_edges = list(G.edges(data=True))
            testable_edges = []
            
            for edge in all_edges:
                from_node, to_node, edge_data = edge
                testable_edges.append((from_node, to_node, edge_data))
            
            print(f"[@service:validation:run_comprehensive_validation] Testing {len(testable_edges)} edges with smart dependency logic")
            print(f"[@service:validation:run_comprehensive_validation] Entry nodes: {len(entry_nodes)}")
            
            # Track which nodes are reachable (start with entry nodes as they are always reachable)
            reachable_nodes = set(entry_nodes)
            print(f"[@service:validation:run_comprehensive_validation] Initial reachable nodes: {len(reachable_nodes)}")
            
            # Test each edge/path individually with smart dependency checking
            path_results = []
            successful_paths = 0
            skipped_paths = 0
            
            for i, (from_node, to_node, edge_data) in enumerate(testable_edges):
                # Get node names for progress display
                from_info = get_node_info(G, from_node)
                to_info = get_node_info(G, to_node)
                from_name = from_info.get('label', from_node) if from_info else from_node
                to_name = to_info.get('label', to_node) if to_info else to_node
                
                # Check if the source node is reachable - THIS IS THE CRITICAL CHECK
                if from_node not in reachable_nodes:
                    print(f"[@service:validation:run_comprehensive_validation] ❌ SKIPPING edge {i+1}/{len(testable_edges)}: {from_name} -> {to_name} (source not reachable)")
                    
                    # Mark as skipped - DO NOT EXECUTE THE NAVIGATION
                    path_result = {
                        'from_node': from_node,
                        'to_node': to_node,
                        'from_name': from_name,
                        'to_name': to_name,
                        'success': False,
                        'skipped': True,
                        'steps_executed': 0,
                        'total_steps': 0,
                        'execution_time': 0,
                        'actions_executed': 0,
                        'total_actions': 0,
                        'action_results': [],
                        'verification_results': [],
                        'error': f"Skipped: Source node '{from_name}' is not reachable due to failed dependencies"
                    }
                    path_results.append(path_result)
                    skipped_paths += 1
                    continue  # CRITICAL: Skip to next edge without any execution
                
                print(f"[@service:validation:run_comprehensive_validation] ✅ TESTING edge {i+1}/{len(testable_edges)}: {from_name} -> {to_name}")
                
                # Execute the navigation test ONLY if source node is reachable
                path_result = self._test_navigation_path(tree_id, from_node, to_node, G)
                path_result['skipped'] = False  # Mark as not skipped since we executed it
                path_results.append(path_result)
                
                # If successful, mark the target node as reachable for future edge tests
                if path_result['success']:
                    successful_paths += 1
                    reachable_nodes.add(to_node)
                    print(f"[@service:validation:run_comprehensive_validation] ✅ SUCCESS: {from_name} -> {to_name}. Node '{to_name}' is now reachable")
                else:
                    print(f"[@service:validation:run_comprehensive_validation] ❌ FAILED: {from_name} -> {to_name}. Node '{to_name}' remains unreachable")
                
                # Small delay between tests to avoid overwhelming the device
                time.sleep(1)
            
            # Calculate overall health based on success rate (excluding skipped)
            executed_paths = len(testable_edges) - skipped_paths
            total_paths = len(testable_edges)
            
            if executed_paths == 0:
                health = 'poor'
                success_rate = 0
            else:
                success_rate = successful_paths / executed_paths
                if success_rate == 1.0:
                    health = 'excellent'
                elif success_rate >= 0.8:
                    health = 'good'
                elif success_rate >= 0.6:
                    health = 'fair'
                else:
                    health = 'poor'
            
            execution_time = time.time() - start_time
            
            # Convert path results to node results format for compatibility
            node_results = self._convert_path_results_to_node_results(path_results, G)
            
            # Convert path results to edge results format
            edge_results = self._convert_path_results_to_edge_results(path_results)
            
            results = {
                'treeId': tree_id,
                'summary': {
                    'totalNodes': len(set([r['from_node'] for r in path_results] + [r['to_node'] for r in path_results])),
                    'totalEdges': len(testable_edges),
                    'validNodes': successful_paths,
                    'errorNodes': executed_paths - successful_paths,
                    'skippedEdges': skipped_paths,  # Add skipped count
                    'overallHealth': health,
                    'executionTime': round(execution_time, 2)
                },
                'nodeResults': node_results,
                'edgeResults': edge_results
            }
            
            print(f"[@service:validation:run_comprehensive_validation] Completed: {successful_paths}/{executed_paths} successful, {skipped_paths} skipped, health: {health}")
            return results
            
        except Exception as e:
            print(f"[@service:validation:run_comprehensive_validation] Error: {e}")
            raise
    
    def _test_navigation_path(self, tree_id: str, from_node: str, to_node: str, graph) -> Dict[str, Any]:
        """
        Test a specific navigation path by actually executing it on the device
        """
        try:
            # Get node names for display
            from_info = get_node_info(graph, from_node)
            to_info = get_node_info(graph, to_node)
            from_name = from_info.get('label', from_node) if from_info else from_node
            to_name = to_info.get('label', to_node) if to_info else to_node
            
            # Execute navigation using the real navigation API
            response = requests.post(
                f"{self.navigation_api_base}/navigate/{tree_id}/{to_node}",
                json={
                    'current_node_id': from_node,
                    'execute': True
                },
                timeout=30  # 30 second timeout
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success', False):
                    return {
                        'from_node': from_node,
                        'to_node': to_node,
                        'from_name': from_name,
                        'to_name': to_name,
                        'success': True,
                        'skipped': False,
                        'steps_executed': result.get('steps_executed', 0),
                        'total_steps': result.get('total_steps', 0),
                        'execution_time': result.get('execution_time', 0),
                        'actions_executed': result.get('actions_executed', 0),
                        'total_actions': result.get('total_actions', 0),
                        'action_results': result.get('action_results', []),
                        'verification_results': result.get('verification_results', []),
                        'error': None
                    }
                else:
                    return {
                        'from_node': from_node,
                        'to_node': to_node,
                        'from_name': from_name,
                        'to_name': to_name,
                        'success': False,
                        'skipped': False,
                        'steps_executed': result.get('steps_executed', 0),
                        'total_steps': result.get('total_steps', 0),
                        'execution_time': result.get('execution_time', 0),
                        'actions_executed': result.get('actions_executed', 0),
                        'total_actions': result.get('total_actions', 0),
                        'action_results': result.get('action_results', []),
                        'verification_results': result.get('verification_results', []),
                        'error': result.get('error', 'Navigation failed')
                    }
            else:
                return {
                    'from_node': from_node,
                    'to_node': to_node,
                    'from_name': from_name,
                    'to_name': to_name,
                    'success': False,
                    'skipped': False,
                    'steps_executed': 0,
                    'total_steps': 0,
                    'execution_time': 0,
                    'actions_executed': 0,
                    'total_actions': 0,
                    'action_results': [],
                    'verification_results': [],
                    'error': f"HTTP {response.status_code}: {response.text}"
                }
                
        except Exception as e:
            return {
                'from_node': from_node,
                'to_node': to_node,
                'from_name': from_name,
                'to_name': to_name,
                'success': False,
                'skipped': False,
                'steps_executed': 0,
                'total_steps': 0,
                'execution_time': 0,
                'actions_executed': 0,
                'total_actions': 0,
                'action_results': [],
                'verification_results': [],
                'error': f"Exception: {str(e)}"
            }
    
    def _convert_path_results_to_node_results(self, path_results: List[Dict], graph) -> List[Dict[str, Any]]:
        """
        Convert path results to node results format for compatibility with existing UI
        """
        # Group paths by target node
        node_groups = {}
        for path in path_results:
            to_node = path['to_node']
            if to_node not in node_groups:
                node_groups[to_node] = []
            node_groups[to_node].append(path)
        
        node_results = []
        for node_id, paths in node_groups.items():
            node_info = get_node_info(graph, node_id)
            node_name = node_info.get('label', node_id) if node_info else node_id
            
            # A node is valid if at least one path to it works
            successful_paths = [p for p in paths if p['success']]
            is_valid = len(successful_paths) > 0
            
            # Calculate average path length from successful paths
            if successful_paths:
                avg_path_length = sum(p['total_steps'] for p in successful_paths) / len(successful_paths)
            else:
                avg_path_length = 0
            
            # Collect errors from failed paths
            errors = []
            failed_paths = [p for p in paths if not p['success']]
            for failed_path in failed_paths:
                if failed_path['error']:
                    errors.append(f"Path from {failed_path['from_name']}: {failed_path['error']}")
            
            node_results.append({
                'nodeId': node_id,
                'nodeName': node_name,
                'isValid': is_valid,
                'pathLength': int(avg_path_length),
                'errors': errors,
                'successfulPaths': len(successful_paths),
                'totalPaths': len(paths)
            })
        
        return node_results

    def _convert_path_results_to_edge_results(self, path_results: List[Dict]) -> List[Dict[str, Any]]:
        """
        Convert path results to edge results format for frontend
        """
        edge_results = []
        for path in path_results:
            edge_result = {
                'from': path['from_node'],
                'to': path['to_node'],
                'fromName': path['from_name'],
                'toName': path['to_name'],
                'success': path['success'],
                'skipped': path.get('skipped', False),
                'retryAttempts': 0,  # TODO: implement retry attempts tracking
                'errors': [path['error']] if path['error'] else []
            }
            
            # Add detailed execution results if available
            if 'actions_executed' in path:
                edge_result['actionsExecuted'] = path['actions_executed']
            if 'total_actions' in path:
                edge_result['totalActions'] = path['total_actions']
            if 'execution_time' in path:
                edge_result['executionTime'] = path['execution_time']
            if 'action_results' in path:
                edge_result['actionResults'] = path['action_results']
            if 'verification_results' in path:
                edge_result['verificationResults'] = path['verification_results']
                
            edge_results.append(edge_result)
            
        return edge_results

# Create singleton instance
validation_service = ValidationService() 
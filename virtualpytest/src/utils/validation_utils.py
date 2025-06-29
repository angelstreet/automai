"""
Validation Utilities

This module provides utility functions for navigation tree validation.
"""

import json
import uuid
from datetime import datetime
from typing import Dict, List, Optional

from utils.supabase_utils import get_supabase_client

from typing import List, Dict, Any, Optional, Set, Tuple
from collections import defaultdict, deque
import networkx as nx

# Import existing NetworkX-based navigation utilities
from src.navigation.navigation_pathfinding import (
    find_shortest_path,
    get_navigation_transitions,
    get_reachable_nodes as get_networkx_reachable_nodes,
    find_entry_point
)
from src.web.cache.navigation_cache import get_cached_graph
from src.web.cache.navigation_graph import get_entry_points, get_node_info, create_networkx_graph

class SmartValidationEngine:
    """Engine for smart path validation using NetworkX for graph operations"""
    
    def __init__(self, tree_data: Dict[str, Any], team_id: str = None):
        self.tree_data = tree_data
        self.team_id = team_id or 'default'
        self.nodes = tree_data.get('nodes', [])
        self.edges = tree_data.get('edges', [])
        self.failed_nodes: Set[str] = set()
        self.validated_nodes: Set[str] = set()
        self.retry_attempts: Dict[str, int] = defaultdict(int)
        
        # Create NetworkX graph from tree data
        self.graph = create_networkx_graph(self.nodes, self.edges)
        
        print(f"[@validation:SmartValidationEngine:init] Created NetworkX graph with {len(self.graph.nodes)} nodes and {len(self.graph.edges)} edges")
        
    def get_reachable_nodes(self, exclude_failed: bool = True) -> Set[str]:
        """Calculate currently reachable nodes using NetworkX algorithms"""
        try:
            # Get entry points using NetworkX-based utilities
            entry_points = get_entry_points(self.graph)
            
            if not entry_points:
                print(f"[@validation:SmartValidationEngine:get_reachable_nodes] No entry points found")
                # Fallback: find nodes with no predecessors
                entry_points = [node for node in self.graph.nodes() if len(list(self.graph.predecessors(node))) == 0]
            
            if not entry_points:
                print(f"[@validation:SmartValidationEngine:get_reachable_nodes] No entry points or root nodes found")
                return set()
            
            # Start with entry points as reachable
            reachable = set(entry_points)
            
            # Use NetworkX to find all descendants from each entry point
            for entry_point in entry_points:
                if exclude_failed and entry_point in self.failed_nodes:
                    continue
                    
                try:
                    # Get all nodes reachable from this entry point
                    descendants = nx.descendants(self.graph, entry_point)
                    
                    if exclude_failed:
                        # Filter out paths that go through failed nodes
                        filtered_descendants = set()
                        for node in descendants:
                            # Check if there's any path to this node that doesn't go through failed nodes
                            if self._has_valid_path_to_node(entry_point, node):
                                filtered_descendants.add(node)
                        descendants = filtered_descendants
                    
                    reachable.update(descendants)
                    
                except nx.NetworkXError as e:
                    print(f"[@validation:SmartValidationEngine:get_reachable_nodes] NetworkX error for entry point {entry_point}: {e}")
                    continue
            
            print(f"[@validation:SmartValidationEngine:get_reachable_nodes] Found {len(reachable)} reachable nodes: {list(reachable)}")
            return reachable
            
        except Exception as e:
            print(f"[@validation:SmartValidationEngine:get_reachable_nodes] Error: {e}")
            return set()
    
    def _has_valid_path_to_node(self, start_node: str, target_node: str) -> bool:
        """Check if there's a valid path that doesn't go through failed nodes"""
        if not self.failed_nodes:
            return nx.has_path(self.graph, start_node, target_node)
        
        try:
            # Create a subgraph without failed nodes
            valid_nodes = set(self.graph.nodes()) - self.failed_nodes
            subgraph = self.graph.subgraph(valid_nodes)
            
            # Check if path exists in the subgraph
            return nx.has_path(subgraph, start_node, target_node)
            
        except Exception:
            return False
    
    def get_smart_validation_paths(self) -> List[Dict[str, Any]]:
        """Generate optimized validation paths using NetworkX topological ordering"""
        try:
            # Use NetworkX topological sort for optimal ordering
            # This automatically handles dependencies correctly
            if nx.is_directed_acyclic_graph(self.graph):
                # For DAGs, use topological sort
                topo_order = list(nx.topological_sort(self.graph))
                print(f"[@validation:SmartValidationEngine:get_smart_validation_paths] Using topological sort order: {topo_order}")
            else:
                # For graphs with cycles, use a different approach
                print(f"[@validation:SmartValidationEngine:get_smart_validation_paths] Graph has cycles, using alternative ordering")
                # Start from entry points and do BFS
                entry_points = get_entry_points(self.graph)
                if entry_points:
                    topo_order = list(nx.bfs_tree(self.graph, entry_points[0]).nodes())
                else:
                    topo_order = list(self.graph.nodes())
            
            paths = []
            for i, node_id in enumerate(topo_order):
                # Get node information
                node_info = get_node_info(self.graph, node_id)
                node_name = node_info.get('label', node_id) if node_info else node_id
                
                # Get dependencies (predecessors)
                dependencies = list(self.graph.predecessors(node_id))
                
                # Check if any incoming edges have retry actions
                has_retry = False
                for pred in dependencies:
                    edge_data = self.graph.edges[pred, node_id] if self.graph.has_edge(pred, node_id) else {}
                    if edge_data.get('retryActions'):
                        has_retry = True
                        break
                
                # Calculate depth using NetworkX
                depth = self._calculate_networkx_depth(node_id)
                
                paths.append({
                    'index': i,
                    'target': node_id,
                    'targetName': node_name,
                    'dependsOn': dependencies,
                    'hasRetry': has_retry,
                    'depth': depth
                })
            
            print(f"[@validation:SmartValidationEngine:get_smart_validation_paths] Generated {len(paths)} validation paths")
            return paths
            
        except Exception as e:
            print(f"[@validation:SmartValidationEngine:get_smart_validation_paths] Error: {e}")
            # Fallback to original method if NetworkX fails
            return self._fallback_validation_paths()
    
    def _calculate_networkx_depth(self, node_id: str) -> int:
        """Calculate node depth using NetworkX shortest path from entry points"""
        try:
            entry_points = get_entry_points(self.graph)
            if not entry_points:
                return 0
            
            min_depth = float('inf')
            for entry in entry_points:
                try:
                    if nx.has_path(self.graph, entry, node_id):
                        path_length = nx.shortest_path_length(self.graph, entry, node_id)
                        min_depth = min(min_depth, path_length)
                except nx.NetworkXNoPath:
                    continue
            
            return min_depth if min_depth != float('inf') else 0
            
        except Exception:
            return 0
    
    def _fallback_validation_paths(self) -> List[Dict[str, Any]]:
        """Fallback method using the original dependency calculation"""
        dependencies = defaultdict(list)
        
        for edge in self.edges:
            from_node = edge.get('from')
            to_node = edge.get('to')
            if from_node and to_node:
                dependencies[to_node].append(from_node)
        
        paths = []
        def get_depth(node_id: str, visited: Set[str] = None) -> int:
            if visited is None:
                visited = set()
            if node_id in visited:
                return 0
            visited.add(node_id)
            
            if node_id not in dependencies:
                return 0
            
            max_depth = 0
            for dep in dependencies[node_id]:
                depth = get_depth(dep, visited.copy())
                max_depth = max(max_depth, depth + 1)
            
            return max_depth
        
        sorted_nodes = sorted(
            [node.get('id') for node in self.nodes if node.get('id')],
            key=lambda x: get_depth(x)
        )
        
        for i, node_id in enumerate(sorted_nodes):
            node_deps = dependencies.get(node_id, [])
            has_retry = any(edge.get('retryActions') for edge in self.edges 
                          if edge.get('to') == node_id)
            
            paths.append({
                'index': i,
                'target': node_id,
                'targetName': next((n.get('name', n.get('id')) for n in self.nodes 
                                 if n.get('id') == node_id), node_id),
                'dependsOn': node_deps,
                'hasRetry': has_retry,
                'depth': get_depth(node_id)
            })
        
        return paths
    
    def should_skip_node(self, node_id: str) -> bool:
        """Check if node should be skipped due to failed dependencies using NetworkX"""
        try:
            # Get all predecessors (dependencies) of this node
            predecessors = list(self.graph.predecessors(node_id))
            
            if not predecessors:
                return False  # Root node, never skip
            
            # Check if any predecessor has failed AND is required for reaching this node
            for pred in predecessors:
                if pred in self.failed_nodes:
                    # Check if this is the only path to the node
                    # Create subgraph without the failed predecessor
                    remaining_nodes = set(self.graph.nodes()) - {pred}
                    subgraph = self.graph.subgraph(remaining_nodes)
                    
                    # Check if node is still reachable from entry points
                    entry_points = get_entry_points(subgraph)
                    if not entry_points:
                        return True  # No entry points left, must skip
                    
                    still_reachable = False
                    for entry in entry_points:
                        if nx.has_path(subgraph, entry, node_id):
                            still_reachable = True
                            break
                    
                    if not still_reachable:
                        return True  # Node is no longer reachable, must skip
            
            return False
            
        except Exception as e:
            print(f"[@validation:SmartValidationEngine:should_skip_node] Error checking {node_id}: {e}")
            return False

    def validate_node_with_retry(self, node_id: str) -> Dict[str, Any]:
        """Validate a single node with retry logic using NetworkX navigation"""
        if self.should_skip_node(node_id):
            return {
                'nodeId': node_id,
                'isValid': False,
                'isSkipped': True,
                'retryAttempts': 0,
                'errors': ['Skipped due to failed parent dependencies']
            }
        
        # Use NetworkX to find the path to this node
        entry_points = get_entry_points(self.graph)
        if not entry_points:
            print(f"[@validation:SmartValidationEngine:validate_node_with_retry] No entry points found for navigation to {node_id}")
            return self._create_failure_result(node_id, ['No entry points available for navigation'])
        
        # Find the best path to the node using NetworkX pathfinding
        navigation_path = None
        for entry_point in entry_points:
            try:
                if nx.has_path(self.graph, entry_point, node_id):
                    # Use the existing pathfinding utilities
                    navigation_path = find_shortest_path(None, node_id, self.team_id, entry_point)
                    if navigation_path:
                        break
            except Exception as e:
                print(f"[@validation:SmartValidationEngine:validate_node_with_retry] Error finding path from {entry_point} to {node_id}: {e}")
                continue
        
        if not navigation_path:
            return self._create_failure_result(node_id, ['No valid navigation path found to node'])
        
        # Execute the navigation path
        validation_result = self._execute_navigation_path(node_id, navigation_path)
        
        # Update tracking sets
        if not validation_result['isValid'] and not validation_result.get('isSkipped', False):
            self.failed_nodes.add(node_id)
        else:
            self.validated_nodes.add(node_id)
        
        validation_result['retryAttempts'] = self.retry_attempts[node_id]
        return validation_result
    
    def _execute_navigation_path(self, node_id: str, navigation_path: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Execute the navigation path and validate the target node"""
        try:
            print(f"[@validation:SmartValidationEngine:_execute_navigation_path] Executing path to {node_id} with {len(navigation_path)} transitions")
            
            # Execute each transition in the path
            for i, transition in enumerate(navigation_path):
                transition_success = self._execute_transition(transition)
                
                if not transition_success:
                    # Transition failed, try retry actions if available
                    retry_actions = transition.get('retryActions', [])
                    if retry_actions:
                        self.retry_attempts[node_id] += 1
                        print(f"[@validation:SmartValidationEngine:_execute_navigation_path] Transition failed for {node_id}, executing retry actions (attempt {self.retry_attempts[node_id]})")
                        
                        retry_success = self._execute_retry_actions(retry_actions)
                        if not retry_success:
                            return self._create_failure_result(node_id, [f'Transition {i+1} failed and retry actions unsuccessful'])
                    else:
                        return self._create_failure_result(node_id, [f'Transition {i+1} failed with no retry options'])
            
            # All transitions succeeded, perform final node validation
            final_validation = self._perform_node_validation(node_id)
            if self.retry_attempts[node_id] > 0:
                final_validation['hasRetrySuccess'] = True
            
            return final_validation
            
        except Exception as e:
            print(f"[@validation:SmartValidationEngine:_execute_navigation_path] Error executing path to {node_id}: {e}")
            return self._create_failure_result(node_id, [f'Navigation execution error: {str(e)}'])
    
    def _execute_transition(self, transition: Dict[str, Any]) -> bool:
        """Execute a single navigation transition (placeholder for real implementation)"""
        try:
            actions = transition.get('actions', [])
            for action in actions:
                action_type = action.get('command', action.get('type'))
                if action_type == 'click':
                    element_id = action.get('elementId', action.get('params', {}).get('elementId'))
                    print(f"[@validation:SmartValidationEngine:_execute_transition] Executing click on {element_id}")
                elif action_type == 'navigate':
                    url = action.get('url', action.get('params', {}).get('url'))
                    print(f"[@validation:SmartValidationEngine:_execute_transition] Navigating to {url}")
                elif action_type == 'input':
                    text = action.get('text', action.get('inputValue'))
                    print(f"[@validation:SmartValidationEngine:_execute_transition] Inputting text: {text}")
                elif action_type == 'wait':
                    import time
                    duration = action.get('duration', action.get('waitTime', 1000)) / 1000.0
                    time.sleep(duration)
                    
            # Simulate success/failure (replace with actual validation logic)
            import random
            return random.choice([True, False])  # Replace with actual validation logic
            
        except Exception as e:
            print(f"[@validation:SmartValidationEngine:_execute_transition] Transition execution failed: {e}")
            return False
    
    def _perform_node_validation(self, node_id: str) -> Dict[str, Any]:
        """Perform actual node validation (placeholder for real implementation)"""
        # This would be replaced with actual validation logic
        import random
        is_valid = random.choice([True, False, False])  # Simulate some failures
        
        node_info = get_node_info(self.graph, node_id)
        node_name = node_info.get('label', node_id) if node_info else node_id
        
        return {
            'nodeId': node_id,
            'nodeName': node_name,
            'isValid': is_valid,
            'isSkipped': False,
            'pathLength': self._calculate_networkx_depth(node_id),
            'errors': [] if is_valid else [f'Validation failed for node {node_id}']
        }
    
    def _execute_retry_actions(self, retry_actions: List[Dict[str, Any]]) -> bool:
        """Execute retry actions for failed transitions"""
        try:
            for action in retry_actions:
                action_type = action.get('type')
                if action_type == 'wait':
                    import time
                    time.sleep(action.get('duration', 1))
                elif action_type == 'refresh':
                    # Simulate page refresh or element refresh
                    pass
                elif action_type == 'click':
                    # Simulate retry click
                    pass
            return True
        except Exception as e:
            print(f"[@validation:SmartValidationEngine:_execute_retry_actions] Retry action failed: {e}")
            return False
    
    def _create_failure_result(self, node_id: str, errors: List[str]) -> Dict[str, Any]:
        """Create a standardized failure result"""
        node_info = get_node_info(self.graph, node_id)
        node_name = node_info.get('label', node_id) if node_info else node_id
        
        return {
            'nodeId': node_id,
            'nodeName': node_name,
            'isValid': False,
            'isSkipped': False,
            'pathLength': self._calculate_networkx_depth(node_id),
            'errors': errors
        }

    def abort_dependent_nodes(self, failed_node_id: str, smart_paths: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Mark all nodes dependent on a failed node as aborted using NetworkX"""
        aborted_results = []
        
        try:
            # Use NetworkX to find all descendants (nodes that depend on the failed node)
            all_dependents = nx.descendants(self.graph, failed_node_id)
            
            print(f"[@validation:SmartValidationEngine:abort_dependent_nodes] Found {len(all_dependents)} dependents of failed node {failed_node_id}")
            
            # Mark all dependents as aborted
            for dependent_id in all_dependents:
                if dependent_id not in self.failed_nodes and dependent_id not in self.validated_nodes:
                    self.failed_nodes.add(dependent_id)  # Mark as failed to prevent validation
                    
                    # Find the path info for this dependent
                    path_info = next((p for p in smart_paths if p['target'] == dependent_id), None)
                    node_name = path_info['targetName'] if path_info else dependent_id
                    
                    aborted_results.append({
                        'nodeId': dependent_id,
                        'nodeName': node_name,
                        'isValid': False,
                        'isSkipped': True,
                        'pathLength': path_info['depth'] if path_info else self._calculate_networkx_depth(dependent_id),
                        'retryAttempts': 0,
                        'errors': [f'Aborted due to parent node failure: {failed_node_id}']
                    })
                    
                    print(f"[@validation:SmartValidationEngine:abort_dependent_nodes] Aborting {dependent_id} due to failed parent: {failed_node_id}")
            
        except Exception as e:
            print(f"[@validation:SmartValidationEngine:abort_dependent_nodes] Error finding dependents: {e}")
        
        return aborted_results

def calculate_validation_preview(tree_data: Dict[str, Any], team_id: str = None) -> Dict[str, Any]:
    """Calculate validation preview with NetworkX-based smart path analysis"""
    engine = SmartValidationEngine(tree_data, team_id)
    
    total_nodes = len(tree_data.get('nodes', []))
    total_edges = len(tree_data.get('edges', []))
    reachable_nodes = list(engine.get_reachable_nodes())
    smart_paths = engine.get_smart_validation_paths()
    
    edges_with_retry = [
        edge for edge in tree_data.get('edges', [])
        if edge.get('retryActions')
    ]
    
    return {
        'totalNodes': total_nodes,
        'totalEdges': total_edges,
        'reachableNodes': reachable_nodes,
        'smartPaths': smart_paths,
        'edgesWithRetry': edges_with_retry,
        'reachableEdges': [
            {
                'from': edge.get('from'),
                'to': edge.get('to'),
                'fromName': edge.get('fromName', edge.get('from')),
                'toName': edge.get('toName', edge.get('to')),
                'hasRetry': bool(edge.get('retryActions'))
            }
            for edge in tree_data.get('edges', [])
            if edge.get('from') in reachable_nodes or edge.get('to') in reachable_nodes
        ],
        'networkxStats': {
            'graphNodes': len(engine.graph.nodes()),
            'graphEdges': len(engine.graph.edges()),
            'isDAG': nx.is_directed_acyclic_graph(engine.graph),
            'isConnected': nx.is_weakly_connected(engine.graph),
            'entryPoints': get_entry_points(engine.graph)
        }
    }

def execute_smart_validation(tree_data: Dict[str, Any], team_id: str) -> Dict[str, Any]:
    """Execute smart validation with NetworkX-based dynamic path calculation"""
    engine = SmartValidationEngine(tree_data, team_id)
    smart_paths = engine.get_smart_validation_paths()
    
    validation_results = []
    skipped_count = 0
    retry_success_count = 0
    total_retry_attempts = 0
    
    print(f"[@validation:execute_smart_validation] Starting NetworkX-based smart validation for {len(smart_paths)} paths")
    
    # Execute validation in optimized order (NetworkX topological sort)
    for path in smart_paths:
        node_id = path['target']
        
        # Skip if already marked as failed (due to parent failure)
        if node_id in engine.failed_nodes:
            continue
        
        # Dynamic reachability check using NetworkX
        current_reachable = engine.get_reachable_nodes()
        
        if node_id not in current_reachable:
            print(f"[@validation:execute_smart_validation] Skipping {node_id} - no longer reachable via NetworkX")
            validation_results.append({
                'nodeId': node_id,
                'nodeName': path['targetName'],
                'isValid': False,
                'isSkipped': True,
                'pathLength': path['depth'],
                'retryAttempts': 0,
                'errors': ['Node became unreachable due to parent failures (NetworkX analysis)']
            })
            skipped_count += 1
            continue
        
        # Validate node using NetworkX pathfinding
        result = engine.validate_node_with_retry(node_id)
        validation_results.append(result)
        
        # If node failed, immediately abort all dependent nodes using NetworkX
        if not result['isValid'] and not result.get('isSkipped', False):
            aborted_results = engine.abort_dependent_nodes(node_id, smart_paths)
            validation_results.extend(aborted_results)
            skipped_count += len(aborted_results)
        
        # Update statistics
        if result.get('hasRetrySuccess'):
            retry_success_count += 1
        total_retry_attempts += result.get('retryAttempts', 0)
        
        print(f"[@validation:execute_smart_validation] Validated {node_id}: {'PASSED' if result['isValid'] else 'FAILED'}")
    
    # Calculate summary
    valid_nodes = sum(1 for r in validation_results if r['isValid'])
    total_nodes = len(validation_results)
    error_nodes = total_nodes - valid_nodes - skipped_count
    
    if total_nodes == 0:
        health = 'poor'
    else:
        success_rate = valid_nodes / (total_nodes - skipped_count) if (total_nodes - skipped_count) > 0 else 0
        if success_rate >= 0.9:
            health = 'excellent'
        elif success_rate >= 0.7:
            health = 'good'
        elif success_rate >= 0.5:
            health = 'fair'
        else:
            health = 'poor'
    
    return {
        'summary': {
            'totalNodes': total_nodes,
            'validNodes': valid_nodes,
            'errorNodes': error_nodes,
            'skippedNodes': skipped_count,
            'overallHealth': health,
            'executionTime': 0,  # Will be calculated by caller
            'smartValidation': True,
            'networkxEnabled': True,
            'retryAttempts': total_retry_attempts,
            'retrySuccesses': retry_success_count
        },
        'nodeResults': validation_results,
        'pathResults': [
            {
                'pathId': f"path-{i}",
                'source': path['dependsOn'][0] if path['dependsOn'] else 'root',
                'target': path['target'],
                'success': any(r['nodeId'] == path['target'] and r['isValid'] 
                             for r in validation_results),
                'skipped': any(r['nodeId'] == path['target'] and r.get('isSkipped', False)
                             for r in validation_results)
            }
            for i, path in enumerate(smart_paths)
        ],
        'networkxStats': {
            'graphNodes': len(engine.graph.nodes()),
            'graphEdges': len(engine.graph.edges()),
            'isDAG': nx.is_directed_acyclic_graph(engine.graph),
            'isConnected': nx.is_weakly_connected(engine.graph),
            'failedNodes': list(engine.failed_nodes),
            'validatedNodes': list(engine.validated_nodes)
        }
    } 
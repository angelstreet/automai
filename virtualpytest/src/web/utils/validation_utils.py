"""
Smart validation utility functions for navigation trees with dynamic path calculation
"""

import sys
import os
from typing import List, Dict, Any, Optional, Set, Tuple
from collections import defaultdict, deque

# Add paths for imports
web_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
web_utils_path = os.path.join(web_dir, 'utils')
sys.path.insert(0, web_utils_path)

class SmartValidationEngine:
    """Engine for smart path validation with dynamic reachability calculation"""
    
    def __init__(self, tree_data: Dict[str, Any]):
        self.tree_data = tree_data
        self.nodes = tree_data.get('nodes', [])
        self.edges = tree_data.get('edges', [])
        self.failed_nodes: Set[str] = set()
        self.validated_nodes: Set[str] = set()
        self.retry_attempts: Dict[str, int] = defaultdict(int)
        
    def build_dependency_graph(self) -> Dict[str, List[str]]:
        """Build parent-child dependency graph from edges"""
        dependencies = defaultdict(list)
        
        for edge in self.edges:
            from_node = edge.get('from')
            to_node = edge.get('to')
            if from_node and to_node:
                dependencies[to_node].append(from_node)
                
        return dependencies
    
    def get_reachable_nodes(self, exclude_failed: bool = True) -> Set[str]:
        """Calculate currently reachable nodes, optionally excluding failed paths"""
        reachable = set()
        dependencies = self.build_dependency_graph()
        
        # Find root nodes (nodes with no dependencies)
        all_nodes = {node.get('id') for node in self.nodes if node.get('id')}
        root_nodes = all_nodes - set(dependencies.keys())
        
        # BFS traversal to find reachable nodes
        queue = deque(root_nodes)
        
        while queue:
            current_node = queue.popleft()
            if current_node in reachable:
                continue
                
            # Check if all dependencies are satisfied
            if current_node in dependencies:
                deps_satisfied = True
                for dep in dependencies[current_node]:
                    if exclude_failed and dep in self.failed_nodes:
                        deps_satisfied = False
                        break
                    if dep not in reachable and dep not in root_nodes:
                        deps_satisfied = False
                        break
                        
                if not deps_satisfied:
                    continue
            
            reachable.add(current_node)
            
            # Add children of this node to queue
            for edge in self.edges:
                if edge.get('from') == current_node:
                    child_node = edge.get('to')
                    if child_node and child_node not in reachable:
                        queue.append(child_node)
        
        return reachable
    
    def get_smart_validation_paths(self) -> List[Dict[str, Any]]:
        """Generate optimized validation paths based on dependencies"""
        dependencies = self.build_dependency_graph()
        paths = []
        
        # Create validation order based on dependency depth
        def get_depth(node_id: str, visited: Set[str] = None) -> int:
            if visited is None:
                visited = set()
            if node_id in visited:
                return 0  # Circular dependency
            visited.add(node_id)
            
            if node_id not in dependencies:
                return 0  # Root node
            
            max_depth = 0
            for dep in dependencies[node_id]:
                depth = get_depth(dep, visited.copy())
                max_depth = max(max_depth, depth + 1)
            
            return max_depth
        
        # Sort nodes by dependency depth
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
        """Check if node should be skipped due to failed dependencies"""
        dependencies = self.build_dependency_graph()
        
        if node_id not in dependencies:
            return False  # Root node, never skip
        
        # Check if any dependency has failed
        for dep in dependencies[node_id]:
            if dep in self.failed_nodes:
                return True
        
        return False
    
    def validate_node_with_retry(self, node_id: str) -> Dict[str, Any]:
        """Validate a single node with retry logic"""
        if self.should_skip_node(node_id):
            return {
                'nodeId': node_id,
                'isValid': False,
                'isSkipped': True,
                'retryAttempts': 0,
                'errors': ['Skipped due to failed parent dependencies']
            }
        
        # Get edges leading to this node
        incoming_edges = [edge for edge in self.edges if edge.get('to') == node_id]
        
        validation_result = None
        
        # Try each incoming edge (usually there's one main path)
        for edge in incoming_edges:
            # Execute normal edge actions first
            edge_success = self._execute_edge_actions(edge)
            
            if edge_success:
                # Edge actions succeeded, validate the node
                validation_result = self._perform_node_validation(node_id)
                break
            else:
                # Edge actions failed, try retry actions if available
                retry_actions = edge.get('retryActions')
                if retry_actions:
                    self.retry_attempts[node_id] += 1
                    print(f"[@validation:SmartValidationEngine] Edge actions failed for {node_id}, executing retry actions (attempt {self.retry_attempts[node_id]})")
                    
                    retry_success = self._execute_retry_actions(retry_actions)
                    
                    if retry_success:
                        # Retry actions succeeded, proceed to validate the node
                        validation_result = self._perform_node_validation(node_id)
                        validation_result['hasRetrySuccess'] = True
                        break
        
        # If no edge succeeded, create failure result
        if validation_result is None:
            node_name = next((n.get('name', n.get('id')) for n in self.nodes 
                            if n.get('id') == node_id), node_id)
            validation_result = {
                'nodeId': node_id,
                'nodeName': node_name,
                'isValid': False,
                'isSkipped': False,
                'pathLength': self._calculate_path_length(node_id),
                'errors': ['All edge actions failed to reach node']
            }
        
        # Update failed nodes set
        if not validation_result['isValid'] and not validation_result.get('isSkipped', False):
            self.failed_nodes.add(node_id)
        else:
            self.validated_nodes.add(node_id)
        
        validation_result['retryAttempts'] = self.retry_attempts[node_id]
        return validation_result
    
    def _execute_edge_actions(self, edge: Dict[str, Any]) -> bool:
        """Execute normal edge actions (navigation/interaction)"""
        try:
            actions = edge.get('actions', [])
            for action in actions:
                action_type = action.get('type')
                if action_type == 'click':
                    # Simulate click action
                    element_id = action.get('elementId')
                    print(f"[@validation:SmartValidationEngine] Executing click on {element_id}")
                elif action_type == 'navigate':
                    # Simulate navigation
                    url = action.get('url')
                    print(f"[@validation:SmartValidationEngine] Navigating to {url}")
                elif action_type == 'input':
                    # Simulate input action
                    text = action.get('text')
                    print(f"[@validation:SmartValidationEngine] Inputting text: {text}")
                elif action_type == 'wait':
                    # Wait action
                    import time
                    duration = action.get('duration', 1)
                    time.sleep(duration)
                    
            # Simulate success/failure
            import random
            return random.choice([True, False])  # Replace with actual validation logic
            
        except Exception as e:
            print(f"[@validation:SmartValidationEngine] Edge action failed: {e}")
            return False
    
    def _perform_node_validation(self, node_id: str) -> Dict[str, Any]:
        """Perform actual node validation (placeholder for real implementation)"""
        # This would be replaced with actual validation logic
        import random
        is_valid = random.choice([True, False, False])  # Simulate some failures
        
        node_name = next((n.get('name', n.get('id')) for n in self.nodes 
                        if n.get('id') == node_id), node_id)
        
        return {
            'nodeId': node_id,
            'nodeName': node_name,
            'isValid': is_valid,
            'isSkipped': False,
            'pathLength': self._calculate_path_length(node_id),
            'errors': [] if is_valid else [f'Validation failed for node {node_id}']
        }
    
    def _execute_retry_actions(self, retry_actions: List[Dict[str, Any]]) -> bool:
        """Execute retry actions for failed edges"""
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
            print(f"[@validation:SmartValidationEngine] Retry action failed: {e}")
            return False
    
    def _calculate_path_length(self, node_id: str) -> int:
        """Calculate path length from root to node"""
        dependencies = self.build_dependency_graph()
        
        def get_path_length(current_id: str, visited: Set[str] = None) -> int:
            if visited is None:
                visited = set()
            if current_id in visited:
                return 0
            visited.add(current_id)
            
            if current_id not in dependencies:
                return 0
            
            max_length = 0
            for dep in dependencies[current_id]:
                length = get_path_length(dep, visited.copy())
                max_length = max(max_length, length + 1)
            
            return max_length
        
        return get_path_length(node_id)

    def abort_dependent_nodes(self, failed_node_id: str, smart_paths: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Mark all nodes dependent on a failed node as aborted"""
        aborted_results = []
        dependencies = self.build_dependency_graph()
        
        # Find all nodes that depend on the failed node (directly or indirectly)
        def find_all_dependents(node_id: str, visited: Set[str] = None) -> Set[str]:
            if visited is None:
                visited = set()
            if node_id in visited:
                return set()
            visited.add(node_id)
            
            dependents = set()
            for target_node, deps in dependencies.items():
                if node_id in deps and target_node not in self.failed_nodes:
                    dependents.add(target_node)
                    # Recursively find dependents of dependents
                    dependents.update(find_all_dependents(target_node, visited.copy()))
            
            return dependents
        
        all_dependents = find_all_dependents(failed_node_id)
        
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
                    'pathLength': path_info['depth'] if path_info else 0,
                    'retryAttempts': 0,
                    'errors': [f'Aborted due to parent node failure: {failed_node_id}']
                })
                
                print(f"[@validation:SmartValidationEngine] Aborting {dependent_id} due to failed parent: {failed_node_id}")
        
        return aborted_results

def calculate_validation_preview(tree_data: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate validation preview with smart path analysis"""
    engine = SmartValidationEngine(tree_data)
    
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
        ]
    }

def execute_smart_validation(tree_data: Dict[str, Any], team_id: str) -> Dict[str, Any]:
    """Execute smart validation with dynamic path calculation"""
    engine = SmartValidationEngine(tree_data)
    smart_paths = engine.get_smart_validation_paths()
    
    validation_results = []
    skipped_count = 0
    retry_success_count = 0
    total_retry_attempts = 0
    
    print(f"[@validation:execute_smart_validation] Starting smart validation for {len(smart_paths)} paths")
    
    # Execute validation in dependency order
    for path in smart_paths:
        node_id = path['target']
        
        # Skip if already marked as failed (due to parent failure)
        if node_id in engine.failed_nodes:
            continue
        
        # Dynamic reachability check before validation
        current_reachable = engine.get_reachable_nodes()
        
        if node_id not in current_reachable:
            print(f"[@validation:execute_smart_validation] Skipping {node_id} - no longer reachable")
            validation_results.append({
                'nodeId': node_id,
                'nodeName': path['targetName'],
                'isValid': False,
                'isSkipped': True,
                'pathLength': path['depth'],
                'retryAttempts': 0,
                'errors': ['Node became unreachable due to parent failures']
            })
            skipped_count += 1
            continue
        
        # Validate node with retry logic
        result = engine.validate_node_with_retry(node_id)
        validation_results.append(result)
        
        # If node failed, immediately abort all dependent nodes
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
        ]
    } 
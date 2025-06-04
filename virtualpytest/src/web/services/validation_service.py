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
        self.progress_callback = None  # Callback function for progress updates
    
    def set_progress_callback(self, callback_func):
        """Set the progress callback function for real-time updates"""
        self.progress_callback = callback_func
    
    def _report_progress(self, current_step: int, total_steps: int, edge_from: str, edge_to: str, 
                        edge_from_name: str, edge_to_name: str, status: str, retry_attempt: int = 0):
        """Report progress to the callback function if one is set"""
        if self.progress_callback:
            progress_data = {
                'currentStep': current_step,
                'totalSteps': total_steps,
                'currentEdgeFrom': edge_from,
                'currentEdgeTo': edge_to,
                'currentEdgeFromName': edge_from_name,
                'currentEdgeToName': edge_to_name,
                'currentEdgeStatus': status,
                'retryAttempt': retry_attempt,
                'progressPercentage': round((current_step / total_steps) * 100, 1) if total_steps > 0 else 0
            }
            try:
                self.progress_callback(progress_data)
            except Exception as e:
                print(f"[@service:validation:_report_progress] Error in progress callback: {e}")
    
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
    
    def run_comprehensive_validation(self, tree_id: str, team_id: str, skipped_edges: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
        """
        Run comprehensive validation by testing all navigation paths with smart dependency logic
        
        Args:
            tree_id: Navigation tree ID
            team_id: Team ID
            skipped_edges: Optional list of edges to skip in format [{"from": "node1", "to": "node2"}]
        """
        print(f"[@service:validation:run_comprehensive_validation] Starting validation for tree {tree_id}")
        
        if skipped_edges:
            print(f"[@service:validation:run_comprehensive_validation] Will skip {len(skipped_edges)} user-selected edges")
        
        start_time = time.time()
        
        try:
            # Get graph to analyze all edges
            G = get_cached_graph(tree_id, team_id)
            if not G:
                raise Exception(f"Failed to load graph for tree {tree_id}")
            
            # Convert skipped_edges to a set of tuples for efficient lookup
            skipped_edge_set = set()
            if skipped_edges:
                for edge in skipped_edges:
                    skipped_edge_set.add((edge['from'], edge['to']))
                print(f"[@service:validation:run_comprehensive_validation] Skipped edges: {skipped_edge_set}")
            
            # Find entry nodes first - these are always reachable as starting points
            entry_nodes = set()
            all_nodes = list(G.nodes(data=True))
            
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
                    print(f"[@service:validation:run_comprehensive_validation] ✓ Found ENTRY node: {node_id}")
            
            # If no entry nodes found, find nodes with no incoming edges (could be implicit entry points)
            # BUT BE CAREFUL: Don't auto-detect regular nodes as entry points
            if not entry_nodes:
                for node_id in G.nodes():
                    incoming_edges = list(G.predecessors(node_id))
                    if not incoming_edges:
                        node_info = get_node_info(G, node_id)
                        node_type = node_info.get('type', '') if node_info else ''
                        
                        # Only consider as entry if it's not a regular menu node
                        if node_type != 'menu':
                            entry_nodes.add(node_id)
                            print(f"[@service:validation:run_comprehensive_validation] ✓ Found implicit ENTRY node: {node_id}")
            
            # Get all edges to test, filtering out skipped edges
            all_edges = list(G.edges(data=True))
            testable_edges = []
            
            for edge in all_edges:
                from_node, to_node, edge_data = edge
                edge_tuple = (from_node, to_node)
                
                # Skip if this edge is in the skipped list
                if edge_tuple in skipped_edge_set:
                    print(f"[@service:validation:run_comprehensive_validation] ⏭️ Skipping edge {from_node} → {to_node} (user selected)")
                    continue
                    
                testable_edges.append((from_node, to_node, edge_data))
            
            print(f"[@service:validation:run_comprehensive_validation] Testing {len(testable_edges)} edges (skipped {len(skipped_edge_set)}) with smart dependency logic")
            
            # Track which nodes are reachable (start with entry nodes as they are always reachable)
            reachable_nodes = set(entry_nodes)
            
            # Test each edge/path individually with smart dependency checking
            path_results = []
            successful_paths = 0
            skipped_paths = 0
            
            for i, (from_node, to_node, edge_data) in enumerate(testable_edges):
                current_step = i + 1
                total_steps = len(testable_edges)
                
                # Get node names for progress display
                from_info = get_node_info(G, from_node)
                to_info = get_node_info(G, to_node)
                from_name = from_info.get('label', from_node) if from_info else from_node
                to_name = to_info.get('label', to_node) if to_info else to_node
                
                # Report progress: Starting to test this edge
                self._report_progress(current_step, total_steps, from_node, to_node, from_name, to_name, 'testing')
                
                # Check if the source node is reachable - THIS IS THE CRITICAL CHECK
                if from_node not in reachable_nodes:
                    # Find which dependency failed by checking incoming edges to the source node
                    incoming_edges = list(G.predecessors(from_node))
                    failed_dependency_info = "unknown dependency"
                    
                    if incoming_edges:
                        # Find the first incoming edge that should have made this node reachable
                        for pred_node in incoming_edges:
                            pred_info = get_node_info(G, pred_node)
                            pred_name = pred_info.get('label', pred_node) if pred_info else pred_node
                            
                            # If the predecessor is reachable but the current node isn't, 
                            # it means the edge from predecessor to current node failed
                            if pred_node in reachable_nodes:
                                failed_dependency_info = f"edge from '{pred_name}' failed"
                                break
                            else:
                                # If predecessor is also not reachable, that's the root cause
                                failed_dependency_info = f"'{pred_name}' is unreachable"
                                break
                    
                    skip_message = f"Skipped: Source node '{from_name}' is not reachable (dependency: {failed_dependency_info})"
                    print(f"[@service:validation:run_comprehensive_validation] ❌ SKIPPING {from_name} -> {to_name}")
                    
                    # Report progress: Edge skipped
                    self._report_progress(current_step, total_steps, from_node, to_node, from_name, to_name, 'skipped')
                    
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
                        'error': skip_message
                    }
                    path_results.append(path_result)
                    skipped_paths += 1
                    continue  # CRITICAL: Skip to next edge without any execution
                
                print(f"[@service:validation:run_comprehensive_validation] ✅ TESTING {from_name} -> {to_name}")
                
                # Execute the navigation test ONLY if source node is reachable
                path_result = self._test_navigation_path(tree_id, from_node, to_node, G)
                path_result['skipped'] = False  # Mark as not skipped since we executed it
                path_results.append(path_result)
                
                # If successful, mark the target node as reachable for future edge tests
                if path_result['success']:
                    successful_paths += 1
                    reachable_nodes.add(to_node)
                    print(f"[@service:validation:run_comprehensive_validation] ✅ SUCCESS {from_name} -> {to_name}")
                    # Report progress: Edge succeeded
                    self._report_progress(current_step, total_steps, from_node, to_node, from_name, to_name, 'success')
                else:
                    print(f"[@service:validation:run_comprehensive_validation] ❌ FAILED {from_name} -> {to_name}")
                    # Report progress: Edge failed
                    self._report_progress(current_step, total_steps, from_node, to_node, from_name, to_name, 'failed')
                
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
            
            # Report final progress: Validation completed
            self._report_progress(len(testable_edges), len(testable_edges), '', '', '', '', 'completed')
            
            return results
            
        except Exception as e:
            print(f"[@service:validation:run_comprehensive_validation] Error: {e}")
            raise
    
    def _test_navigation_path(self, tree_id: str, from_node: str, to_node: str, graph) -> Dict[str, Any]:
        """
        Test a specific navigation path by actually executing it on the device
        AND execute target node verifications if present
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
            
            navigation_success = False
            navigation_result = {}
            
            if response.status_code == 200:
                navigation_result = response.json()
                navigation_success = navigation_result.get('success', False)
                print(f"[@service:validation:_test_navigation_path] Navigation API response: {navigation_result}")
            else:
                navigation_result = {
                    'success': False,
                    'error': f"HTTP {response.status_code}: {response.text}",
                    'transitions_executed': 0,
                    'total_transitions': 0,
                    'execution_time': 0,
                    'actions_executed': 0,
                    'total_actions': 0,
                    'transitions_details': []
                }
            
            # Extract action results from transitions_details (CORRECT FIELD NAME)
            action_results = []
            if navigation_success and 'transitions_details' in navigation_result:
                for i, transition in enumerate(navigation_result['transitions_details']):
                    # Extract individual actions from this transition
                    for j, action in enumerate(transition.get('actions', [])):
                        action_results.append({
                            'actionIndex': len(action_results),  # Global action index
                            'transitionIndex': i,  # Which transition this action belongs to
                            'actionInTransition': j,  # Action index within the transition
                            'actionId': action.get('id', f'action_{len(action_results)}'),
                            'actionLabel': action.get('label', f'Action {len(action_results) + 1}'),
                            'actionCommand': action.get('command', 'unknown'),
                            'inputValue': action.get('inputValue', ''),
                            'success': transition.get('success', False),  # Transition success applies to all its actions
                            'error': None if transition.get('success', False) else transition.get('error', 'Action failed'),
                            'executionTime': transition.get('execution_time', 0) / len(transition.get('actions', [1])) if transition.get('actions') else 0
                        })
            
            # If navigation succeeded, execute target node verifications
            verification_results = []
            if navigation_success:
                verification_results = self._execute_target_node_verifications(tree_id, to_node, to_info)
            
            # Combine navigation and verification results
            combined_success = navigation_success and (
                len(verification_results) == 0 or  # No verifications to run
                all(v.get('success', False) for v in verification_results)  # All verifications passed
            )
            
            # Build final result with CORRECT field mapping
            result = {
                'from_node': from_node,
                'to_node': to_node,
                'from_name': from_name,
                'to_name': to_name,
                'success': combined_success,
                'skipped': False,
                'steps_executed': navigation_result.get('transitions_executed', 0),  # CORRECT: transitions_executed
                'total_steps': navigation_result.get('total_transitions', 0),      # CORRECT: total_transitions
                'execution_time': navigation_result.get('execution_time', 0),
                'actions_executed': navigation_result.get('actions_executed', 0),
                'total_actions': navigation_result.get('total_actions', 0),
                'action_results': action_results,  # ✅ NOW CORRECTLY EXTRACTED from transitions_details
                'verification_results': verification_results,  # Include target node verifications
                'error': None if combined_success else (
                    navigation_result.get('error_message', navigation_result.get('error', 'Navigation failed')) if not navigation_success
                    else 'Target node verifications failed'
                )
            }
            
            print(f"[@service:validation:_test_navigation_path] Navigation: {'✓' if navigation_success else '✗'}, "
                  f"Actions: {len(action_results)} extracted, "
                  f"Verifications: {len(verification_results)} executed, "
                  f"Overall: {'✓' if combined_success else '✗'}")
            
            return result
                
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
    
    def _execute_target_node_verifications(self, tree_id: str, node_id: str, node_info: Dict) -> List[Dict[str, Any]]:
        """
        Execute verifications for the target node after successful navigation
        
        Args:
            tree_id: Navigation tree ID
            node_id: Target node ID
            node_info: Node information from graph
            
        Returns:
            List of verification results
        """
        if not node_info:
            print(f"[@service:validation:_execute_target_node_verifications] No node_info provided for node {node_id}")
            return []
        
        # Debug: Log the complete structure we received to understand the data format
        print(f"[@service:validation:_execute_target_node_verifications] DEBUGGING Node {node_id}:")
        print(f"[@service:validation:_execute_target_node_verifications] Full node_info structure: {node_info}")
        print(f"[@service:validation:_execute_target_node_verifications] Node {node_id} structure keys: {list(node_info.keys())}")
        
        # Try to get verifications from multiple possible locations in the node data
        verifications = []
        
        # Option 1: Direct verifications field (standard location from NetworkX graph)
        if 'verifications' in node_info:
            verifications = node_info.get('verifications', [])
            print(f"[@service:validation:_execute_target_node_verifications] ✓ Found {len(verifications)} verifications in node_info.verifications")
            if verifications:
                print(f"[@service:validation:_execute_target_node_verifications] First verification structure: {verifications[0] if verifications else 'None'}")
        
        # Option 2: Nested in data object (React Flow format: node.data.verifications)
        elif 'data' in node_info and isinstance(node_info['data'], dict):
            verifications = node_info['data'].get('verifications', [])
            print(f"[@service:validation:_execute_target_node_verifications] ✓ Found {len(verifications)} verifications in node_info.data.verifications")
            print(f"[@service:validation:_execute_target_node_verifications] Node data keys: {list(node_info['data'].keys())}")
            if verifications:
                print(f"[@service:validation:_execute_target_node_verifications] First verification structure: {verifications[0] if verifications else 'None'}")
        
        # Option 3: Check if the entire node_info IS the data object
        elif 'label' in node_info and 'type' in node_info:
            # This suggests node_info is already the data portion
            verifications = node_info.get('verifications', [])
            print(f"[@service:validation:_execute_target_node_verifications] ✓ Found {len(verifications)} verifications in flattened node_info")
            if verifications:
                print(f"[@service:validation:_execute_target_node_verifications] First verification structure: {verifications[0] if verifications else 'None'}")
        
        # Additional debug: Check if data is nested deeper
        if 'data' in node_info:
            data_content = node_info['data']
            print(f"[@service:validation:_execute_target_node_verifications] Node data content type: {type(data_content)}")
            if isinstance(data_content, dict):
                print(f"[@service:validation:_execute_target_node_verifications] Node data keys: {list(data_content.keys())}")
                # Look for verifications in nested structures
                for key, value in data_content.items():
                    if 'verification' in key.lower():
                        print(f"[@service:validation:_execute_target_node_verifications] Found verification-related key: {key} = {value}")
            else:
                print(f"[@service:validation:_execute_target_node_verifications] Node data is not dict: {data_content}")
        
        if not verifications:
            print(f"[@service:validation:_execute_target_node_verifications] ❌ No verifications found for node {node_id} after checking all possible locations")
            print(f"[@service:validation:_execute_target_node_verifications] Available node_info keys for debugging: {list(node_info.keys())}")
            return []
        
        # Validate verification structure
        valid_verifications = []
        for i, verification in enumerate(verifications):
            if not isinstance(verification, dict):
                print(f"[@service:validation:_execute_target_node_verifications] ⚠️ Verification {i} is not a dict: {verification}")
                continue
            
            # Check required fields
            if not verification.get('command') and not verification.get('id'):
                print(f"[@service:validation:_execute_target_node_verifications] ⚠️ Verification {i} missing required fields: {verification}")
                continue
                
            valid_verifications.append(verification)
            print(f"[@service:validation:_execute_target_node_verifications] ✓ Valid verification {i}: {verification.get('label', verification.get('id', 'Unknown'))}")
        
        if not valid_verifications:
            print(f"[@service:validation:_execute_target_node_verifications] ❌ No valid verifications found for node {node_id}")
            return []
        
        print(f"[@service:validation:_execute_target_node_verifications] Executing {len(valid_verifications)} valid verifications for node {node_id}")
        
        verification_results = []
        
        try:
            # Call verification API to execute all node verifications
            api_payload = {
                'verifications': valid_verifications,
                'node_id': node_id,
                'tree_id': tree_id,
                'model': 'android_mobile'  # Required parameter for verification API
            }
            
            print(f"[@service:validation:_execute_target_node_verifications] Sending API request with payload: {api_payload}")
            
            verification_response = requests.post(
                'http://localhost:5009/api/virtualpytest/verification/execute-batch',
                json=api_payload,
                timeout=30
            )
            
            print(f"[@service:validation:_execute_target_node_verifications] API Response Status: {verification_response.status_code}")
            print(f"[@service:validation:_execute_target_node_verifications] API Response Text: {verification_response.text[:500]}...")
            
            if verification_response.status_code == 200:
                verification_data = verification_response.json()
                print(f"[@service:validation:_execute_target_node_verifications] API Response Data: {verification_data}")
                
                if verification_data.get('success', False):
                    # Extract individual verification results and map to frontend format
                    api_results = verification_data.get('results', [])
                    print(f"[@service:validation:_execute_target_node_verifications] ✓ Executed {len(api_results)} verifications for node {node_id}")
                    
                    # Map API response format to frontend format
                    for i, (api_result, original_verification) in enumerate(zip(api_results, valid_verifications)):
                        mapped_result = {
                            'verificationId': api_result.get('verification_id', original_verification.get('id', f'verification_{i}')),
                            'verificationLabel': original_verification.get('label', f'Verification {i+1}'),
                            'verificationCommand': original_verification.get('command', 'unknown'),
                            'success': api_result.get('success', False),
                            'error': api_result.get('error'),
                            'resultType': api_result.get('resultType', 'FAIL' if not api_result.get('success', False) else 'PASS'),
                            'message': api_result.get('message'),
                            'inputValue': original_verification.get('inputValue')
                        }
                        verification_results.append(mapped_result)
                        print(f"[@service:validation:_execute_target_node_verifications] Mapped result {i}: {mapped_result}")
                else:
                    print(f"[@service:validation:_execute_target_node_verifications] ✗ Verification batch failed: {verification_data.get('error', 'Unknown error')}")
                    # Create failed results for all verifications
                    for i, verification in enumerate(valid_verifications):
                        verification_results.append({
                            'verificationId': verification.get('id', f'verification_{i}'),
                            'verificationLabel': verification.get('label', f'Verification {i+1}'),
                            'verificationCommand': verification.get('command', 'unknown'),
                            'success': False,
                            'error': verification_data.get('error', 'Batch verification failed'),
                            'resultType': 'FAIL',
                            'message': None,
                            'inputValue': None
                        })
            else:
                print(f"[@service:validation:_execute_target_node_verifications] ✗ HTTP {verification_response.status_code}: {verification_response.text}")
                # Create failed results for all verifications
                for i, verification in enumerate(valid_verifications):
                    verification_results.append({
                        'verificationId': verification.get('id', f'verification_{i}'),
                        'verificationLabel': verification.get('label', f'Verification {i+1}'),
                        'verificationCommand': verification.get('command', 'unknown'),
                        'success': False,
                        'error': f"HTTP {verification_response.status_code}",
                        'resultType': 'ERROR',
                        'message': None,
                        'inputValue': None
                    })
                    
        except Exception as e:
            print(f"[@service:validation:_execute_target_node_verifications] ✗ Exception: {e}")
            import traceback
            print(f"[@service:validation:_execute_target_node_verifications] ✗ Full traceback: {traceback.format_exc()}")
            # Create failed results for all verifications
            for i, verification in enumerate(valid_verifications):
                verification_results.append({
                    'verificationId': verification.get('id', f'verification_{i}'),
                    'verificationLabel': verification.get('label', f'Verification {i+1}'),
                    'verificationCommand': verification.get('command', 'unknown'),
                    'success': False,
                    'error': f"Exception: {str(e)}",
                    'resultType': 'ERROR',
                    'message': None,
                    'inputValue': None
                })
        
        print(f"[@service:validation:_execute_target_node_verifications] Final verification_results: {verification_results}")
        return verification_results
    
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
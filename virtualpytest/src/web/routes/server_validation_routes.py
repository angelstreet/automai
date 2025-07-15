"""
Validation Routes

Service for comprehensive navigation tree validation.
Provides functionality for testing navigation paths and verifying UI elements.
"""

from typing import Dict, List, Optional, Any
import time
import json
import queue
import threading
from flask import Blueprint, request, jsonify, Response

# Import existing pathfinding utilities
from src.lib.navigation.navigation_pathfinding import (
    get_reachable_nodes,
    find_shortest_path,
    get_navigation_transitions,
    find_all_paths,
    find_optimal_edge_validation_sequence
)

# Import navigation cache
from src.web.cache.navigation_cache import get_cached_graph
from src.web.cache.navigation_graph import get_node_info, get_entry_points
from src.utils.app_utils import get_team_id, check_supabase

# Create blueprint
server_validation_bp = Blueprint('server_validation', __name__, url_prefix='/server/validation')

# Store SSE connections by session_id
sse_connections = {}

# Store active validation sessions for stopping
validation_sessions = {}

class ValidationService:
    """Service for comprehensive navigation tree validation"""
    
    def __init__(self):
        self.progress_callback = None  # Callback function for progress updates
    
    def set_progress_callback(self, callback_func):
        """Set the progress callback function for real-time updates"""
        self.progress_callback = callback_func
    
    def _send_to_sse_connections(self, session_id: str, data: Dict):
        """Send data to SSE connection for a specific session"""
        if session_id in sse_connections:
            try:
                sse_connections[session_id].put(data)
            except Exception as e:
                print(f"[@service:validation:_send_to_sse_connections] Error sending to SSE: {e}")
    
    def _should_stop_validation(self, session_id: str) -> bool:
        """Check if validation should be stopped"""
        if session_id and session_id in validation_sessions:
            return validation_sessions[session_id].get('should_stop', False)
        return False
    
    def _report_progress(self, current_step: int, total_steps: int, edge_from: str, edge_to: str, 
                        edge_from_name: str, edge_to_name: str, status: str, retry_attempt: int = 0, session_id: str = None):
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
        
        # Also send to SSE connection if session_id is provided
        if session_id:
            self._send_to_sse_connections(session_id, {
                'currentStep': current_step,
                'totalSteps': total_steps,
                'currentEdgeFrom': edge_from,
                'currentEdgeTo': edge_to,
                'currentEdgeFromName': edge_from_name,
                'currentEdgeToName': edge_to_name,
                'currentEdgeStatus': status,
                'retryAttempt': retry_attempt,
                'progressPercentage': round((current_step / total_steps) * 100, 1) if total_steps > 0 else 0
            })

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

    def run_comprehensive_validation(self, tree_id: str, team_id: str, skipped_edges: Optional[List[Dict[str, str]]] = None, host: Optional[Dict] = None, device_id: Optional[str] = None, session_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Run comprehensive validation by testing all navigation paths with smart dependency logic
        
        Args:
            tree_id: Navigation tree ID
            team_id: Team ID
            skipped_edges: Optional list of edges to skip in format [{"from": "node1", "to": "node2"}]
        """
        print(f"[@service:validation:run_comprehensive_validation] Starting validation for tree {tree_id}")
        
        # Register session for stopping capability
        if session_id:
            validation_sessions[session_id] = {'should_stop': False, 'tree_id': tree_id}
        
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
            
            # USE OPTIMAL EDGE VALIDATION SEQUENCE INSTEAD OF ARBITRARY ORDER
            try:
                # Get the optimal sequence of edges to test
                optimal_sequence = find_optimal_edge_validation_sequence(tree_id, team_id)
                print(f"[@service:validation:run_comprehensive_validation] ✅ Using NetworkX optimal sequence: {len(optimal_sequence)} steps")
                
                # Convert optimal sequence to testable edges, filtering out skipped edges
                testable_edges = []
                for step in optimal_sequence:
                    # Skip navigation steps - we only want edge validation steps
                    if step.get('validation_type') != 'edge':
                        continue
                        
                    from_node = step['from_node_id']
                    to_node = step['to_node_id']
                    edge_tuple = (from_node, to_node)
                    
                    # Skip if this edge is in the skipped list
                    if edge_tuple in skipped_edge_set:
                        print(f"[@service:validation:run_comprehensive_validation] ⏭️ Skipping edge {from_node} → {to_node} (user selected)")
                        continue
                        
                    # Get edge data from graph
                    edge_data = G.get_edge_data(from_node, to_node, {})
                    testable_edges.append((from_node, to_node, edge_data))
                    
            except Exception as e:
                print(f"[@service:validation:run_comprehensive_validation] ⚠️ Failed to get optimal sequence, falling back to graph edges: {e}")
                # Fallback to original method if optimal sequence fails
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
            
            print(f"[@service:validation:run_comprehensive_validation] Testing {len(testable_edges)} edges (skipped {len(skipped_edge_set)}) with NetworkX optimal ordering")
            
            # Track which nodes are reachable (start with entry nodes as they are always reachable)
            reachable_nodes = set(entry_nodes)
            
            # ✅ CASCADING SKIP: Track edges to skip due to failed dependencies
            edges_to_skip = set()
            
            # Test each edge/path individually with smart dependency checking
            path_results = []
            successful_paths = 0
            skipped_paths = 0
            
            for i, (from_node, to_node, edge_data) in enumerate(testable_edges):
                # Check if validation should be stopped
                if self._should_stop_validation(session_id):
                    print(f"[@service:validation:run_comprehensive_validation] ⏹️ Validation stopped by user at step {i+1}")
                    # Send stop notification to SSE
                    if session_id:
                        self._send_to_sse_connections(session_id, {
                            'currentStep': i + 1,
                            'totalSteps': len(testable_edges),
                            'currentEdgeFrom': '',
                            'currentEdgeTo': '',
                            'currentEdgeFromName': '',
                            'currentEdgeToName': '',
                            'currentEdgeStatus': 'stopped',
                            'retryAttempt': 0,
                            'progressPercentage': round((i + 1) / len(testable_edges) * 100, 1)
                        })
                    break
                
                current_step = i + 1
                total_steps = len(testable_edges)
                
                # Get node names for progress display
                from_info = get_node_info(G, from_node)
                to_info = get_node_info(G, to_node)
                from_name = from_info.get('label', from_node) if from_info else from_node
                to_name = to_info.get('label', to_node) if to_info else to_node
                
                # Report progress: Starting to test this edge
                self._report_progress(current_step, total_steps, from_node, to_node, from_name, to_name, 'testing', session_id=session_id)
                
                # Check if this edge was marked to skip due to failed dependency
                if (from_node, to_node) in edges_to_skip:
                    skip_message = f"Skipped: Source node '{from_name}' is unreachable due to cascading dependency failure"
                    print(f"[@service:validation:run_comprehensive_validation] ⏭️ CASCADING SKIP: {from_name} -> {to_name}")
                    
                    # Report progress: Edge skipped
                    self._report_progress(current_step, total_steps, from_node, to_node, from_name, to_name, 'skipped', session_id=session_id)
                    
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
                    continue
                
                # Check if the source node is reachable
                if from_node not in reachable_nodes:
                    skip_message = f"Skipped: Source node '{from_name}' is not reachable"
                    print(f"[@service:validation:run_comprehensive_validation] ❌ SKIPPING {from_name} -> {to_name}")
                    
                    # Report progress: Edge skipped
                    self._report_progress(current_step, total_steps, from_node, to_node, from_name, to_name, 'skipped', session_id=session_id)
                    
                    # Mark as skipped
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
                    continue
                
                print(f"[@service:validation:run_comprehensive_validation] ✅ TESTING {from_name} -> {to_name}")
                
                # Execute the navigation test ONLY if source node is reachable
                path_result = self._test_navigation_path(tree_id, from_node, to_node, G, host, device_id)
                path_result['skipped'] = False
                path_results.append(path_result)
                
                # If successful, mark the target node as reachable for future edge tests
                if path_result['success']:
                    successful_paths += 1
                    reachable_nodes.add(to_node)
                    print(f"[@service:validation:run_comprehensive_validation] ✅ SUCCESS {from_name} -> {to_node}")
                    self._report_progress(current_step, total_steps, from_node, to_node, from_name, to_name, 'success', session_id=session_id)
                else:
                    print(f"[@service:validation:run_comprehensive_validation] ❌ FAILED {from_name} -> {to_name}")
                    
                    # Mark dependent edges for cascading skip
                    unreachable_nodes = {to_node}
                    for j in range(i+1, len(testable_edges)):
                        dep_from, dep_to, dep_edge_data = testable_edges[j]
                        if dep_from in unreachable_nodes:
                            edges_to_skip.add((dep_from, dep_to))
                    
                    self._report_progress(current_step, total_steps, from_node, to_node, from_name, to_name, 'failed', session_id=session_id)
                
                # Small delay between tests
                time.sleep(1)
            
            # Calculate overall health based on success rate
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
                    'skippedEdges': skipped_paths,
                    'overallHealth': health,
                    'executionTime': round(execution_time, 2)
                },
                'nodeResults': node_results,
                'edgeResults': edge_results
            }
            
            print(f"[@service:validation:run_comprehensive_validation] Completed: {successful_paths}/{executed_paths} successful, {skipped_paths} skipped, health: {health}")
            
            # Report final progress: Validation completed
            if not self._should_stop_validation(session_id):
                self._report_progress(len(testable_edges), len(testable_edges), '', '', '', '', 'completed', session_id=session_id)
            
            return results
            
        except Exception as e:
            print(f"[@service:validation:run_comprehensive_validation] Error: {e}")
            raise
        finally:
            # Clean up session
            if session_id and session_id in validation_sessions:
                del validation_sessions[session_id]

    def _test_navigation_path(self, tree_id: str, from_node: str, to_node: str, graph, host: Optional[Dict] = None, device_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Test a specific navigation path by calling the same navigation executor that goto uses
        """
        try:
            # Get node names for display
            from_info = get_node_info(graph, from_node)
            to_info = get_node_info(graph, to_node)
            from_name = from_info.get('label', from_node) if from_info else from_node
            to_name = to_info.get('label', to_node) if to_info else to_node
            
            # Call the same navigation executor endpoint that goto uses
            import requests
            import json
            
            # Get team_id for the request
            team_id = get_team_id()
            
            # Make HTTP request to navigation executor endpoint (same as goto)
            from src.utils.build_url_utils import buildServerUrl
            navigation_url = buildServerUrl(f'server/navigation/execute/{tree_id}/{to_node}')
            
            # Use the same payload structure as goto functionality
            payload = {
                'current_node_id': from_node,
            }
            
            # Add host and device information if provided (same as goto)
            if host and device_id:
                payload['host'] = host
                payload['device_id'] = device_id
            
            response = requests.post(
                navigation_url,
                json=payload,
                headers={
                    'Content-Type': 'application/json',
                    'X-Team-ID': team_id
                },
                timeout=30
            )
            
            navigation_result = response.json() if response.status_code == 200 else {'success': False, 'error': f'HTTP {response.status_code}'}
            navigation_success = navigation_result.get('success', False)
            
            # Extract action results if available in response
            action_results = []
            if 'action_results' in navigation_result:
                action_results = navigation_result['action_results']
            
            # If navigation succeeded, execute target node verifications
            verification_results = []
            if navigation_success:
                verification_results = self._execute_target_node_verifications(tree_id, to_node, to_info)
            
            # Combine navigation and verification results
            combined_success = navigation_success and (
                len(verification_results) == 0 or
                all(v.get('success', False) for v in verification_results)
            )
            
            result = {
                'from_node': from_node,
                'to_node': to_node,
                'from_name': from_name,
                'to_name': to_name,
                'success': combined_success,
                'skipped': False,
                'steps_executed': navigation_result.get('transitions_executed', 0),
                'total_steps': navigation_result.get('total_transitions', 0),
                'execution_time': navigation_result.get('execution_time', 0),
                'actions_executed': navigation_result.get('actions_executed', 0),
                'total_actions': navigation_result.get('total_actions', 0),
                'action_results': action_results,
                'verification_results': verification_results,
                'error': None if combined_success else (
                    navigation_result.get('error', 'Navigation failed') if not navigation_success
                    else 'Target node verifications failed'
                )
            }
            
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
        """
        if not node_info:
            return []
        
        # Get verifications from node data
        verifications = []
        if 'verifications' in node_info:
            verifications = node_info.get('verifications', [])
        elif 'data' in node_info and isinstance(node_info['data'], dict):
            verifications = node_info['data'].get('verifications', [])
        
        if not verifications:
            return []
        
        # NOTE: Verification execution should be handled by frontend calling /server/verification/executeBatch directly
        # This validation service should only handle navigation path testing, not verification execution
        print(f"[@service:validation:_execute_target_node_verifications] Skipping verification execution - frontend should call verification endpoints directly")
        return []

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
                'retryAttempts': 0,
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

# Bind method to ValidationService class
ValidationService.get_validation_preview = validation_service.get_validation_preview

@server_validation_bp.route('/health', methods=['GET'])
def validation_health():
    """Health check for validation endpoints"""
    return jsonify({
        'success': True,
        'service': 'validation',
        'status': 'healthy',
        'message': 'Validation routes are operational'
    }), 200

@server_validation_bp.route('/preview/<tree_id>', methods=['GET'])
def get_validation_preview(tree_id):
    """Get validation preview showing what will be tested"""
    try:
        team_id = get_team_id()
        result = validation_service.get_validation_preview(tree_id, team_id)
        return jsonify({
            'success': True,
            'preview': result
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@server_validation_bp.route('/run/<tree_id>', methods=['POST'])
def run_comprehensive_validation(tree_id):
    """Run comprehensive validation by testing all navigation paths"""
    try:
        team_id = get_team_id()
        data = request.get_json() or {}
        skipped_edges = data.get('skipped_edges', [])
        host = data.get('host')
        device_id = data.get('device_id')
        session_id = data.get('session_id') # Get session_id from request
        
        result = validation_service.run_comprehensive_validation(tree_id, team_id, skipped_edges, host, device_id, session_id)
        return jsonify({
            'success': True,
            'results': result
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@server_validation_bp.route('/optimal-path/<tree_id>', methods=['GET'])
def get_optimal_path(tree_id):
    """Get optimal validation path using NetworkX algorithms"""
    try:
        team_id = get_team_id()
        
        # Get the optimal sequence
        sequence = find_optimal_edge_validation_sequence(tree_id, team_id)
        
        if not sequence:
            return jsonify({
                'success': False,
                'error': 'No optimal path found or graph is empty'
            }), 404
        
        # Calculate summary statistics
        total_steps = len(sequence)
        edge_validations = len([step for step in sequence if step.get('validation_type') == 'edge'])
        navigation_steps = total_steps - edge_validations
        efficiency_ratio = edge_validations / total_steps if total_steps > 0 else 0
        
        result = {
            'sequence': sequence,
            'summary': {
                'total_steps': total_steps,
                'edge_validations': edge_validations,
                'navigation_steps': navigation_steps,
                'efficiency_ratio': efficiency_ratio
            }
        }
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"[@validation:optimal-path] Error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@server_validation_bp.route('/progress/<session_id>', methods=['GET'])
def get_validation_progress(session_id):
    """Server-Sent Events endpoint for real-time validation progress"""
    
    def generate_progress_events():
        # Create a queue for this session
        progress_queue = queue.Queue()
        sse_connections[session_id] = progress_queue
        
        try:
            # Send initial heartbeat
            yield f"data: {json.dumps({'type': 'heartbeat', 'timestamp': time.time()})}\n\n"
            
            while True:
                try:
                    # Wait for progress data with timeout
                    data = progress_queue.get(timeout=30)  # 30 second timeout
                    
                    if data is None:  # Signal to close connection
                        break
                    
                    # Send progress update
                    yield f"data: {json.dumps(data)}\n\n"
                    
                except queue.Empty:
                    # Send heartbeat every 30 seconds to keep connection alive
                    yield f"data: {json.dumps({'type': 'heartbeat', 'timestamp': time.time()})}\n\n"
                    
        except Exception as e:
            print(f"[@validation:progress] Error in SSE generator: {e}")
        finally:
            # Clean up connection
            if session_id in sse_connections:
                del sse_connections[session_id]
    
    return Response(
        generate_progress_events(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control'
        }
    )

@server_validation_bp.route('/stop/<session_id>', methods=['POST'])
def stop_validation(session_id):
    """Stop a running validation session"""
    try:
        if session_id in validation_sessions:
            validation_sessions[session_id]['should_stop'] = True
            print(f"[@validation:stop] Stopping validation session: {session_id}")
            
            # Send stop notification to SSE connection
            if session_id in sse_connections:
                try:
                    sse_connections[session_id].put({
                        'currentStep': 0,
                        'totalSteps': 0,
                        'currentEdgeFrom': '',
                        'currentEdgeTo': '',
                        'currentEdgeFromName': '',
                        'currentEdgeToName': '',
                        'currentEdgeStatus': 'stopped',
                        'retryAttempt': 0,
                        'progressPercentage': 0
                    })
                except Exception as e:
                    print(f"[@validation:stop] Error sending stop notification: {e}")
            
            return jsonify({
                'success': True,
                'message': f'Validation session {session_id} stopped'
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': f'Validation session {session_id} not found'
            }), 404
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

"""
Navigation Execution System

This module provides a clean, standardized way to execute navigation that can be used by:
- Python code directly (scripts, automation, etc.)
- API endpoints (maintaining consistency)
- Frontend hooks (via API calls)

The NavigationExecutor orchestrates ActionExecutor and VerificationExecutor to provide
complete navigation execution with proper error handling and logging.
"""

import time
from typing import Dict, List, Optional, Any
from src.lib.actions.action_executor import ActionExecutor
from src.lib.verifications.verification_executor import VerificationExecutor
from src.lib.navigation.navigation_pathfinding import find_shortest_path
from src.utils.app_utils import get_team_id


class NavigationExecutor:
    """
    Standardized navigation executor that orchestrates action and verification execution
    to provide complete navigation functionality.
    """
    
    def __init__(self, host: Dict[str, Any], device_id: Optional[str] = None, team_id: Optional[str] = None):
        """
        Initialize NavigationExecutor
        
        Args:
            host: Host configuration dict with host_name, devices, etc.
            device_id: Optional device ID for multi-device hosts
            team_id: Optional team ID, defaults to system team ID
        """
        self.host = host
        self.device_id = device_id
        self.team_id = team_id or get_team_id()
        
        # Initialize standardized executors (will be updated with navigation context per execution)
        self.action_executor = None
        self.verification_executor = None
        
        # Validate host configuration
        if not host or not host.get('host_name'):
            raise ValueError("Host configuration with host_name is required")
    
    def execute_navigation(self, 
                          tree_id: str, 
                          target_node_id: str, 
                          current_node_id: Optional[str] = None,
                          image_source_url: Optional[str] = None) -> Dict[str, Any]:
        """
        Execute complete navigation to target node
        
        Args:
            tree_id: Navigation tree ID
            target_node_id: Target node to navigate to
            current_node_id: Optional current node ID (for pathfinding)
            image_source_url: Optional source image URL for verifications
            
        Returns:
            Dict with success status, execution details, and statistics
        """
        start_time = time.time()
        
        print(f"[@lib:navigation_execution:execute_navigation] Starting navigation to {target_node_id} in tree {tree_id}")
        print(f"[@lib:navigation_execution:execute_navigation] Current node: {current_node_id}")
        print(f"[@lib:navigation_execution:execute_navigation] Host: {self.host.get('host_name')}")
        
        try:
            # 1. Get navigation path using existing pathfinding
            print(f"[@lib:navigation_execution:execute_navigation] Getting navigation path...")
            transitions = find_shortest_path(tree_id, target_node_id, self.team_id, current_node_id)
            
            if not transitions:
                return {
                    'success': False,
                    'error': 'No navigation path found',
                    'tree_id': tree_id,
                    'target_node_id': target_node_id,
                    'current_node_id': current_node_id,
                    'transitions_executed': 0,
                    'total_transitions': 0,
                    'actions_executed': 0,
                    'total_actions': 0,
                    'execution_time': 0
                }
            
            print(f"[@lib:navigation_execution:execute_navigation] Found {len(transitions)} transitions")
            
            # 2. Execute each transition using standardized action executor
            transitions_executed = 0
            actions_executed = 0
            total_actions = sum(len(t.get('actions', [])) for t in transitions)
            
            print(f"[@lib:navigation_execution:execute_navigation] Executing {len(transitions)} transitions with {total_actions} total actions")
            
            for i, transition in enumerate(transitions):
                print(f"[@lib:navigation_execution:execute_navigation] Executing transition {i+1}/{len(transitions)}: {transition.get('description', 'Unknown')}")
                
                actions = transition.get('actions', [])
                retry_actions = transition.get('retryActions', [])
                final_wait_time = transition.get('finalWaitTime', 2000)
                
                if actions:
                    # Initialize action executor with navigation context
                    edge_id = transition.get('edge_id', f"edge_{i}")
                    action_executor = ActionExecutor(
                        host=self.host,
                        device_id=self.device_id,
                        tree_id=tree_id,
                        edge_id=edge_id,
                        team_id=self.team_id
                    )
                    
                    result = action_executor.execute_actions(
                        actions=actions,
                        retry_actions=retry_actions,
                        final_wait_time=final_wait_time
                    )
                    
                    if not result.get('success'):
                        # Calculate where we actually are: if we're at transition i and it failed,
                        # we're still at the from_node_id of the failed transition
                        # (or at the to_node_id of the previous successful transition)
                        if transitions_executed > 0:
                            # We successfully completed some transitions, so we're at the to_node_id of the last successful one
                            final_position_node_id = transitions[transitions_executed - 1].get('to_node_id', current_node_id)
                        else:
                            # No transitions succeeded, we're still at the starting position
                            final_position_node_id = current_node_id
                        
                        return {
                            'success': False,
                            'error': f'Action execution failed in transition {i+1}: {result.get("error", "Unknown error")}',
                            'tree_id': tree_id,
                            'target_node_id': target_node_id,
                            'current_node_id': current_node_id,
                            'final_position_node_id': final_position_node_id,  # Where we actually ended up
                            'transitions_executed': transitions_executed,
                            'total_transitions': len(transitions),
                            'actions_executed': actions_executed,
                            'total_actions': total_actions,
                            'execution_time': time.time() - start_time,
                            'failed_transition': i + 1,
                            'action_results': result.get('results', [])
                        }
                    
                    actions_executed += result.get('passed_count', 0)
                
                transitions_executed += 1
                print(f"[@lib:navigation_execution:execute_navigation] Transition {i+1} completed successfully")
            
            # 3. Execute target node verifications using standardized verification executor
            print(f"[@lib:navigation_execution:execute_navigation] Checking for target node verifications...")
            target_node_verifications = self._get_node_verifications(tree_id, target_node_id)
            
            verification_results = []
            if target_node_verifications:
                print(f"[@lib:navigation_execution:execute_navigation] Executing {len(target_node_verifications)} target node verifications")
                
                # Initialize verification executor with navigation context
                verification_executor = VerificationExecutor(
                    host=self.host,
                    device_id=self.device_id,
                    tree_id=tree_id,
                    node_id=target_node_id,
                    team_id=self.team_id
                )
                
                # Get device model for verification context
                device_model = self.host.get('device_model')
                
                result = verification_executor.execute_verifications(
                    verifications=target_node_verifications,
                    image_source_url=image_source_url,
                    model=device_model
                )
                
                verification_results = result.get('results', [])
                
                if not result.get('success'):
                    # All transitions succeeded but verification failed - we're at the target node
                    final_position_node_id = target_node_id
                    
                    return {
                        'success': False,
                        'error': f'Target node verification failed: {result.get("error", "Unknown error")}',
                        'tree_id': tree_id,
                        'target_node_id': target_node_id,
                        'current_node_id': current_node_id,
                        'final_position_node_id': final_position_node_id,  # Where we actually ended up
                        'transitions_executed': transitions_executed,
                        'total_transitions': len(transitions),
                        'actions_executed': actions_executed,
                        'total_actions': total_actions,
                        'execution_time': time.time() - start_time,
                        'verification_results': verification_results
                    }
                
                print(f"[@lib:navigation_execution:execute_navigation] Target node verifications completed successfully")
            else:
                print(f"[@lib:navigation_execution:execute_navigation] No target node verifications found")
            
            # 4. Navigation completed successfully
            execution_time = time.time() - start_time
            
            print(f"[@lib:navigation_execution:execute_navigation] Navigation completed successfully in {execution_time:.2f}s")
            print(f"[@lib:navigation_execution:execute_navigation] Executed {transitions_executed}/{len(transitions)} transitions, {actions_executed}/{total_actions} actions")
            
            # Update current position to target node since all transitions succeeded
            final_position_node_id = target_node_id
            
            return {
                'success': True,
                'message': f'Navigation to {target_node_id} completed successfully',
                'tree_id': tree_id,
                'target_node_id': target_node_id,
                'current_node_id': current_node_id,
                'final_position_node_id': final_position_node_id,  # Where we actually ended up
                'transitions_executed': transitions_executed,
                'total_transitions': len(transitions),
                'actions_executed': actions_executed,
                'total_actions': total_actions,
                'execution_time': execution_time,
                'verification_results': verification_results,
                'navigation_path': [t.get('description', f"Transition {i+1}") for i, t in enumerate(transitions)]
            }
            
        except Exception as e:
            execution_time = time.time() - start_time
            print(f"[@lib:navigation_execution:execute_navigation] Navigation failed with error: {str(e)}")
            
            # On exception, we don't know exactly where we are, assume starting position
            final_position_node_id = current_node_id
            
            return {
                'success': False,
                'error': f'Navigation execution error: {str(e)}',
                'tree_id': tree_id,
                'target_node_id': target_node_id,
                'current_node_id': current_node_id,
                'final_position_node_id': final_position_node_id,  # Where we actually ended up
                'transitions_executed': 0,
                'total_transitions': 0,
                'actions_executed': 0,
                'total_actions': 0,
                'execution_time': execution_time
            }
    
    def get_navigation_preview(self, 
                             tree_id: str, 
                             target_node_id: str, 
                             current_node_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Get navigation preview without executing
        
        Args:
            tree_id: Navigation tree ID
            target_node_id: Target node to navigate to
            current_node_id: Optional current node ID (for pathfinding)
            
        Returns:
            Dict with preview information
        """
        print(f"[@lib:navigation_execution:get_navigation_preview] Getting preview for navigation to {target_node_id} in tree {tree_id}")
        
        try:
            # Get navigation path using existing pathfinding
            transitions = find_shortest_path(tree_id, target_node_id, self.team_id, current_node_id)
            
            if not transitions:
                return {
                    'success': False,
                    'error': 'No navigation path found',
                    'tree_id': tree_id,
                    'target_node_id': target_node_id,
                    'current_node_id': current_node_id,
                    'transitions': [],
                    'total_transitions': 0,
                    'total_actions': 0
                }
            
            total_actions = sum(len(t.get('actions', [])) for t in transitions)
            
            return {
                'success': True,
                'tree_id': tree_id,
                'target_node_id': target_node_id,
                'current_node_id': current_node_id,
                'transitions': transitions,
                'total_transitions': len(transitions),
                'total_actions': total_actions,
                'navigation_type': 'preview'
            }
            
        except Exception as e:
            print(f"[@lib:navigation_execution:get_navigation_preview] Preview failed with error: {str(e)}")
            
            return {
                'success': False,
                'error': f'Navigation preview error: {str(e)}',
                'tree_id': tree_id,
                'target_node_id': target_node_id,
                'current_node_id': current_node_id,
                'transitions': [],
                'total_transitions': 0,
                'total_actions': 0
            }
    
    def _get_node_verifications(self, tree_id: str, node_id: str) -> List[Dict[str, Any]]:
        """
        Get verifications for a specific node
        
        Args:
            tree_id: Navigation tree ID
            node_id: Node ID to get verifications for
            
        Returns:
            List of verification dictionaries
        """
        try:
            # Get cached graph and node info
            from src.web.cache.navigation_cache import get_cached_graph
            from src.web.cache.navigation_graph import get_node_info
            
            G = get_cached_graph(tree_id, self.team_id)
            if not G:
                print(f"[@lib:navigation_execution:_get_node_verifications] No cached graph found for tree {tree_id}")
                return []
            
            node_info = get_node_info(G, node_id)
            if not node_info:
                print(f"[@lib:navigation_execution:_get_node_verifications] No node info found for node {node_id}")
                return []
            
            # Extract verifications from node data
            verifications = []
            if 'verifications' in node_info:
                verifications = node_info.get('verifications', [])
            elif 'data' in node_info and isinstance(node_info['data'], dict):
                verifications = node_info['data'].get('verifications', [])
            
            print(f"[@lib:navigation_execution:_get_node_verifications] Found {len(verifications)} verifications for node {node_id}")
            return verifications
            
        except Exception as e:
            print(f"[@lib:navigation_execution:_get_node_verifications] Error getting node verifications: {str(e)}")
            return [] 
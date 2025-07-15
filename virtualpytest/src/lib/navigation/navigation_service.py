"""
Navigation Service

This module provides service-level navigation functionality that can be used by:
- API routes
- Internal services
- Background tasks

It wraps the NavigationExecutor to provide additional service-level features.
"""

import time
from typing import Dict, List, Optional, Any
from src.lib.navigation.navigation_execution import NavigationExecutor
from src.utils.app_utils import get_team_id


def execute_navigation_with_verification(tree_id: str, target_node_id: str, team_id: str, current_node_id: str = None) -> Dict[str, Any]:
    """
    Execute navigation with verification using the new NavigationExecutor
    
    Args:
        tree_id: Navigation tree ID
        target_node_id: Target node to navigate to
        team_id: Team ID for security
        current_node_id: Optional current node ID
        
    Returns:
        Dict with execution results
    """
    try:
        # Create minimal host configuration for service execution
        host = {"host_name": "service_host", "device_model": "service"}
        
        # Use the new NavigationExecutor
        executor = NavigationExecutor(host, None, team_id)
        result = executor.execute_navigation(tree_id, target_node_id, current_node_id)
        
        return result
        
    except Exception as e:
        return {
            'success': False,
            'error': f'Navigation service error: {str(e)}',
            'tree_id': tree_id,
            'target_node_id': target_node_id,
            'current_node_id': current_node_id
        }


def get_navigation_preview(tree_id: str, target_node_id: str, team_id: str, current_node_id: str = None) -> Dict[str, Any]:
    """
    Get navigation preview using the new NavigationExecutor
    
    Args:
        tree_id: Navigation tree ID
        target_node_id: Target node to navigate to
        team_id: Team ID for security
        current_node_id: Optional current node ID
        
    Returns:
        Dict with preview information
    """
    try:
        # Create minimal host configuration for service preview
        host = {"host_name": "service_host", "device_model": "service"}
        
        # Use the new NavigationExecutor
        executor = NavigationExecutor(host, None, team_id)
        result = executor.get_navigation_preview(tree_id, target_node_id, current_node_id)
        
        return result
        
    except Exception as e:
        return {
            'success': False,
            'error': f'Navigation preview service error: {str(e)}',
            'tree_id': tree_id,
            'target_node_id': target_node_id,
            'current_node_id': current_node_id
        }


class NavigationService:
    """
    High-level service for navigation operations
    Provides a clean interface for all navigation functionality
    """
    
    def __init__(self):
        self.take_control_sessions = {}  # Track active take control sessions
    
    def navigate_to_node(self, tree_id: str, target_node_id: str, team_id: str, current_node_id: str = None, execute: bool = True) -> Dict:
        """
        Main entry point for navigation requests
        
        Args:
            tree_id: Navigation tree ID
            target_node_id: Target node to navigate to
            team_id: Team ID for security
            current_node_id: Current position (if None, uses entry point)
            execute: Whether to execute navigation or just return preview
            
        Returns:
            Dictionary with navigation results
        """
        print(f"[@navigation:service:navigate_to_node] Navigation request: tree={tree_id}, target={target_node_id}, execute={execute}")
        
        try:
            # Check if take control is active
            if execute and not self.is_take_control_active(tree_id, team_id):
                return {
                    'success': False,
                    'error': 'Take control mode is not active',
                    'error_code': 'TAKE_CONTROL_INACTIVE'
                }
            
            if execute:
                # Execute navigation with verification
                result = execute_navigation_with_verification(tree_id, target_node_id, team_id, current_node_id)
                
                # Map error_message to error field for consistent API response
                if 'error_message' in result and result['error_message'] is not None:
                    result['error'] = result['error_message']
                
                # Add navigation metadata
                result.update({
                    'tree_id': tree_id,
                    'team_id': team_id,
                    'navigation_type': 'execute'
                })
                
                return result
            else:
                # Return navigation preview
                preview = get_navigation_preview(tree_id, target_node_id, team_id, current_node_id)
                preview.update({
                    'success': True,
                    'navigation_type': 'preview'
                })
                
                return preview
                
        except Exception as e:
            print(f"[@navigation:service:navigate_to_node] Error: {e}")
            return {
                'success': False,
                'error': str(e),
                'error_code': 'NAVIGATION_ERROR',
                'tree_id': tree_id,
                'target_node_id': target_node_id
            }
    
    def get_navigation_preview(self, tree_id: str, target_node_id: str, team_id: str, current_node_id: str = None) -> List[Dict]:
        """
        Get preview of navigation transitions without executing
        
        Args:
            tree_id: Navigation tree ID
            target_node_id: Target node to navigate to
            team_id: Team ID for security
            current_node_id: Current position (if None, uses entry point)
            
        Returns:
            List of navigation transitions with detailed information
        """
        print(f"[@navigation:service:get_navigation_preview] Getting preview for {target_node_id}")
        
        try:
            from src.lib.navigation.navigation_pathfinding import get_navigation_transitions
            
            transitions = get_navigation_transitions(tree_id, target_node_id, team_id, current_node_id)
            return transitions
            
        except Exception as e:
            print(f"[@navigation:service:get_navigation_preview] Error: {e}")
            return []
    
    def is_take_control_active(self, tree_id: str, team_id: str) -> bool:
        """
        Check if take control mode is active for a tree
        
        Args:
            tree_id: Navigation tree ID
            team_id: Team ID for security
            
        Returns:
            True if take control is active, False otherwise
        """
        session_key = f"{tree_id}_{team_id}"
        
        # For now, assume take control is always active for demo purposes
        # You can implement actual session tracking here
        print(f"[@navigation:service:is_take_control_active] PLACEHOLDER: Take control assumed active for {session_key}")
        return True
    
    def activate_take_control(self, tree_id: str, team_id: str, user_id: str) -> Dict:
        """
        Activate take control mode for a navigation tree
        
        Args:
            tree_id: Navigation tree ID
            team_id: Team ID for security
            user_id: User requesting control
            
        Returns:
            Dictionary with activation results
        """
        print(f"[@navigation:service:activate_take_control] Activating take control for tree {tree_id}, user {user_id}")
        
        session_key = f"{tree_id}_{team_id}"
        
        try:
            # Store session information
            self.take_control_sessions[session_key] = {
                'tree_id': tree_id,
                'team_id': team_id,
                'user_id': user_id,
                'activated_at': time.time(),
                'status': 'active'
            }
            
            return {
                'success': True,
                'session_id': session_key,
                'message': 'Take control activated successfully'
            }
            
        except Exception as e:
            print(f"[@navigation:service:activate_take_control] Error: {e}")
            return {
                'success': False,
                'error': str(e),
                'error_code': 'ACTIVATION_ERROR'
            }
    
    def deactivate_take_control(self, tree_id: str, team_id: str) -> Dict:
        """
        Deactivate take control mode
        
        Args:
            tree_id: Navigation tree ID
            team_id: Team ID for security
            
        Returns:
            Dictionary with deactivation results
        """
        print(f"[@navigation:service:deactivate_take_control] Deactivating take control for tree {tree_id}")
        
        session_key = f"{tree_id}_{team_id}"
        
        try:
            if session_key in self.take_control_sessions:
                del self.take_control_sessions[session_key]
            
            return {
                'success': True,
                'message': 'Take control deactivated successfully'
            }
            
        except Exception as e:
            print(f"[@navigation:service:deactivate_take_control] Error: {e}")
            return {
                'success': False,
                'error': str(e),
                'error_code': 'DEACTIVATION_ERROR'
            }
    
    def get_navigation_graph_stats(self, tree_id: str, team_id: str) -> Dict:
        """
        Get statistics about the navigation graph
        
        Args:
            tree_id: Navigation tree ID
            team_id: Team ID for security
            
        Returns:
            Dictionary with graph statistics
        """
        print(f"[@navigation:service:get_navigation_graph_stats] Getting stats for tree {tree_id}")
        
        try:
            from src.web.cache.navigation_cache import get_cached_graph
            from src.web.cache.navigation_graph import validate_graph, get_entry_points, get_exit_points
            
            G = get_cached_graph(tree_id, team_id)
            if not G:
                return {
                    'success': False,
                    'error': 'Navigation graph not found'
                }
            
            # Validate graph
            validation = validate_graph(G)
            
            # Get entry and exit points
            entry_points = get_entry_points(G)
            exit_points = get_exit_points(G)
            
            stats = {
                'success': True,
                'tree_id': tree_id,
                'validation': validation,
                'entry_points': entry_points,
                'exit_points': exit_points,
                'graph_info': {
                    'total_nodes': len(G.nodes),
                    'total_edges': len(G.edges),
                    'is_connected': len(list(G.components())) if hasattr(G, 'components') else 'N/A',
                    'average_degree': sum(dict(G.degree()).values()) / len(G.nodes) if G.nodes else 0
                }
            }
            
            return stats
            
        except Exception as e:
            print(f"[@navigation:service:get_navigation_graph_stats] Error: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def find_alternative_paths(self, tree_id: str, target_node_id: str, team_id: str, current_node_id: str = None, max_paths: int = 3) -> List[List[Dict]]:
        """
        Find alternative navigation paths to a target node
        
        Args:
            tree_id: Navigation tree ID
            target_node_id: Target node to navigate to
            team_id: Team ID for security
            current_node_id: Current position (if None, uses entry point)
            max_paths: Maximum number of alternative paths to return
            
        Returns:
            List of alternative paths, each path is a list of navigation steps
        """
        print(f"[@navigation:service:find_alternative_paths] Finding {max_paths} alternative paths to {target_node_id}")
        
        try:
            from src.lib.navigation.navigation_pathfinding import find_all_paths
            
            paths = find_all_paths(tree_id, target_node_id, team_id, current_node_id, max_paths)
            return paths
            
        except Exception as e:
            print(f"[@navigation:service:find_alternative_paths] Error: {e}")
            return []
    
    def get_reachable_nodes_from_current(self, tree_id: str, team_id: str, current_node_id: str = None) -> List[str]:
        """
        Get all nodes reachable from current position
        
        Args:
            tree_id: Navigation tree ID
            team_id: Team ID for security
            current_node_id: Current position (if None, uses entry point)
            
        Returns:
            List of reachable node IDs
        """
        try:
            from src.lib.navigation.navigation_pathfinding import get_reachable_nodes
            
            reachable = get_reachable_nodes(tree_id, team_id, current_node_id)
            return reachable
            
        except Exception as e:
            print(f"[@navigation:service:get_reachable_nodes_from_current] Error: {e}")
            return []
    
    def clear_navigation_cache(self, tree_id: str = None, team_id: str = None) -> Dict:
        """
        Clear navigation graph cache
        
        Args:
            tree_id: Specific tree to clear (if None, clears all)
            team_id: Team ID for security
            
        Returns:
            Dictionary with cache clearing results
        """
        try:
            from src.web.cache.navigation_cache import invalidate_cache, clear_all_cache
            
            if tree_id:
                invalidate_cache(tree_id, team_id)
                message = f"Cache cleared for tree {tree_id}"
            else:
                clear_all_cache()
                message = "All navigation cache cleared"
            
            return {
                'success': True,
                'message': message
            }
            
        except Exception as e:
            print(f"[@navigation:service:clear_navigation_cache] Error: {e}")
            return {
                'success': False,
                'error': str(e)
            }

# Global navigation service instance
navigation_service = NavigationService() 
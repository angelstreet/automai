"""
Standardized Action Executor

This module provides a standardized way to execute actions that can be used by:
- Python code directly (navigation execution, scripts, etc.)
- API endpoints (maintaining consistency)
- Frontend hooks (via API calls)

The core logic is the same as /server/action/executeBatch but available as a reusable class.
"""

import time
import requests
from typing import Dict, List, Optional, Any
from src.web.utils.routeUtils import proxy_to_host


class ActionExecutor:
    """
    Standardized action executor that provides consistent action execution
    across Python code and API endpoints.
    """
    
    def __init__(self, host: Dict[str, Any], device_id: Optional[str] = None, tree_id: str = None, edge_id: str = None, team_id: str = None):
        """
        Initialize ActionExecutor
        
        Args:
            host: Host configuration dict with host_name, devices, etc.
            device_id: Optional device ID for multi-device hosts
            tree_id: Tree ID for navigation context
            edge_id: Edge ID for navigation context
            team_id: Team ID for database context
        """
        self.host = host
        self.device_id = device_id
        self.tree_id = tree_id
        self.edge_id = edge_id
        
        # team_id is required
        self.team_id = team_id
        
        # Validate host configuration
        if not host or not host.get('host_name'):
            raise ValueError("Host configuration with host_name is required")
    
    def execute_actions(self, 
                       actions: List[Dict[str, Any]], 
                       retry_actions: Optional[List[Dict[str, Any]]] = None, 
                       final_wait_time: int = 2000) -> Dict[str, Any]:
        """
        Execute batch of actions with retry logic
        
        Args:
            actions: List of action dictionaries with command, params, etc.
            retry_actions: Optional list of retry actions to execute if main actions fail
            final_wait_time: Wait time in milliseconds after execution (passed to controllers)
            
        Returns:
            Dict with success status, results, and execution statistics
        """
        print(f"[@lib:action_executor:execute_actions] Starting batch action execution")
        print(f"[@lib:action_executor:execute_actions] Processing {len(actions)} main actions, {len(retry_actions or [])} retry actions")
        print(f"[@lib:action_executor:execute_actions] Host: {self.host.get('host_name')}")
        
        # Validate inputs
        if not actions:
            return {
                'success': True,
                'message': 'No actions to execute',
                'results': [],
                'passed_count': 0,
                'total_count': 0
            }
        
        # Filter valid actions
        valid_actions = self._filter_valid_actions(actions)
        valid_retry_actions = self._filter_valid_actions(retry_actions or [])
        
        if not valid_actions:
            return {
                'success': False,
                'error': 'All actions were invalid and filtered out',
                'results': [],
                'passed_count': 0,
                'total_count': 0
            }
        
        results = []
        passed_count = 0
        execution_order = 1
        
        # Execute main actions
        print(f"[@lib:action_executor:execute_actions] Executing {len(valid_actions)} main actions")
        for i, action in enumerate(valid_actions):
            result = self._execute_single_action(action, execution_order, i+1, 'main')
            results.append(result)
            if result.get('success'):
                passed_count += 1
            execution_order += 1
        
        # Execute retry actions if main actions failed
        main_actions_failed = passed_count < len(valid_actions)
        if main_actions_failed and valid_retry_actions:
            print(f"[@lib:action_executor:execute_actions] Main actions failed, executing {len(valid_retry_actions)} retry actions")
            for i, retry_action in enumerate(valid_retry_actions):
                # Add final_wait_time to the last retry action
                if i == len(valid_retry_actions) - 1 and final_wait_time > 0:
                    retry_action_with_wait = retry_action.copy()
                    retry_action_with_wait['waitTime'] = (retry_action_with_wait.get('waitTime', 0) + final_wait_time)
                    result = self._execute_single_action(retry_action_with_wait, execution_order, i+1, 'retry')
                else:
                    result = self._execute_single_action(retry_action, execution_order, i+1, 'retry')
                results.append(result)
                if result.get('success'):
                    passed_count += 1
                execution_order += 1
        elif final_wait_time > 0:
            # Handle final wait time after all actions complete
            print(f"[@lib:action_executor:execute_actions] Applying final wait time: {final_wait_time}ms")
            time.sleep(final_wait_time / 1000.0)

        # Calculate overall success (main actions must pass)
        overall_success = passed_count >= len(valid_actions)
        
        print(f"[@lib:action_executor:execute_actions] Batch completed: {passed_count}/{len(valid_actions)} main actions passed, overall success: {overall_success}")
        
        return {
            'success': overall_success,
            'total_count': len(valid_actions),
            'passed_count': passed_count,
            'failed_count': len(valid_actions) - passed_count,
            'results': results,
            'message': f'Batch action execution completed: {passed_count}/{len(valid_actions)} passed'
        }
    
    def _filter_valid_actions(self, actions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Filter out invalid actions"""
        valid_actions = []
        
        for i, action in enumerate(actions):
            if not action.get('command') or action.get('command', '').strip() == '':
                print(f"[@lib:action_executor:_filter_valid_actions] Removing action {i}: No command specified")
                continue
            
            # Check if action requires input and has it
            if action.get('requiresInput') and not action.get('inputValue'):
                print(f"[@lib:action_executor:_filter_valid_actions] Removing action {i}: No input value for required input")
                continue
            
            valid_actions.append(action)
        
        return valid_actions
    
    def _execute_single_action(self, action: Dict[str, Any], execution_order: int, action_number: int, action_category: str) -> Dict[str, Any]:
        """Execute a single action and return standardized result"""
        start_time = time.time()
        
        try:
            print(f"[@lib:action_executor:_execute_single_action] Executing {action_category} action {action_number}: {action.get('command')} with params {action.get('params', {})}")
            
            # Use action params directly - wait_time is already in params from database
            params = action.get('params', {})
            
            # Proxy to host remote command endpoint (same as API)
            response_data, status_code = proxy_to_host('/host/remote/executeCommand', 'POST', {
                'command': action.get('command'),
                'params': params
            })
            
            execution_time = int((time.time() - start_time) * 1000)
            success = status_code == 200 and response_data.get('success', False)
            
            print(f"[@lib:action_executor:_execute_single_action] Action {action_number} result: success={success}, time={execution_time}ms")
            
            # Record execution directly to database
            self._record_execution_to_database(
                success=success,
                execution_time_ms=execution_time,
                message=response_data.get('message') if success else response_data.get('error'),
                error_details=None if success else {'error': response_data.get('error')}
            )
            
            # Return standardized result (same format as API)
            return {
                'success': success,
                'message': f"{action.get('label', action.get('command'))}",
                'error': response_data.get('error') if not success else None,
                'resultType': 'PASS' if success else 'FAIL',
                'execution_time_ms': execution_time,
                'action_category': action_category,
            }
            
        except Exception as e:
            execution_time = int((time.time() - start_time) * 1000)
            print(f"[@lib:action_executor:_execute_single_action] Action {action_number} error: {str(e)}")
            
            # Record failed execution directly to database
            self._record_execution_to_database(
                success=False,
                execution_time_ms=execution_time,
                message=str(e),
                error_details={'error': str(e)}
            )
            
            return {
                'success': False,
                'message': f"{action.get('label', action.get('command'))}",
                'error': str(e),
                'resultType': 'FAIL',
                'execution_time_ms': execution_time,
                'action_category': action_category
            }
    
    def _record_execution_to_database(self, success: bool, execution_time_ms: int, message: str, error_details: Optional[Dict] = None):
        """Record single execution directly to database"""
        try:
            from src.lib.supabase.execution_results_db import record_edge_execution
            
            record_edge_execution(
                team_id=self.team_id,
                tree_id=self.tree_id,
                edge_id=self.edge_id,
                host_name=self.host.get('host_name'),
                device_model=self.host.get('device_model'),
                success=success,
                execution_time_ms=execution_time_ms,
                message=message,
                error_details=error_details
            )
            
        except Exception as e:
            print(f"[@lib:action_executor:_record_execution_to_database] Database recording error: {e}") 
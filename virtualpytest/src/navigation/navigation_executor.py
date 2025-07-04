"""
Navigation execution engine
Executes navigation steps and tracks current position
"""

from typing import List, Dict, Optional, Any, Tuple
import time
import sys
import os
import json
import requests
import logging
from datetime import datetime
import traceback

# Navigation executor - no path manipulation needed with proper imports

# Import navigation cache
from src.web.cache.navigation_cache import get_cached_graph
from src.web.cache.navigation_graph import get_node_info

# Import centralized URL building from routes utils
# Note: buildServerUrl removed - now using direct host communication via buildHostUrl

# NOTE: execute_navigation_to_node function removed - now using batch execution via execute_navigation_with_verification

# NOTE: execute_navigation_step function removed - now using batch execution via host

def parse_action_string(action_str: str) -> dict:
    """
    Parse action string into action object format expected by virtualpytest API
    
    Args:
        action_str: Action string like "launch_app", "click_element", etc.
        
    Returns:
        Action object dictionary or None if parsing fails
    """
    print(f"[@navigation:executor:parse_action_string] Parsing action string: '{action_str}'")
    
    if not action_str:
        return None
    
    # Handle basic action strings - map to actual action objects
    action_mappings = {
        'launch_app': {
            'id': 'launch_app',
            'label': 'Launch App',
            'command': 'launch_app',
            'params': {'package': 'com.example.app'},  # Default package
            'requiresInput': False,
            'waitTime': 2000
        },
        'close_app': {
            'id': 'close_app',
            'label': 'Close App',
            'command': 'close_app',
            'params': {'package': 'com.example.app'},  # Default package
            'requiresInput': False,
            'waitTime': 1000
        },
        'click_element': {
            'id': 'click_element', 
            'label': 'Click Element',
            'command': 'click_element',
            'params': {'element_id': 'default_element'},  # Default element
            'requiresInput': False,
            'waitTime': 1000
        },
        'swipe_up': {
            'id': 'swipe_up',
            'label': 'Swipe Up', 
            'command': 'swipe',
            'params': {'direction': 'up', 'distance': 500},
            'requiresInput': False,
            'waitTime': 1000
        },
        'swipe_down': {
            'id': 'swipe_down',
            'label': 'Swipe Down',
            'command': 'swipe', 
            'params': {'direction': 'down', 'distance': 500},
            'requiresInput': False,
            'waitTime': 1000
        },
        'back': {
            'id': 'back',
            'label': 'Back Button',
            'command': 'back',
            'params': {},
            'requiresInput': False,
            'waitTime': 1000
        },
        'home': {
            'id': 'home',
            'label': 'Home Button', 
            'command': 'home',
            'params': {},
            'requiresInput': False,
            'waitTime': 1000
        }
    }
    
    # Try exact match first
    if action_str in action_mappings:
        action_obj = action_mappings[action_str].copy()
        print(f"[@navigation:executor:parse_action_string] Mapped '{action_str}' to action object")
        return action_obj
    
    # Handle parameterized actions (e.g., "launch_app:com.example.app")
    if ':' in action_str:
        action_type, param = action_str.split(':', 1)
        if action_type in action_mappings:
            action_obj = action_mappings[action_type].copy()
            
            # Update parameters based on action type
            if action_type == 'launch_app':
                action_obj['params']['package'] = param
            elif action_type == 'close_app':
                action_obj['params']['package'] = param
            elif action_type == 'click_element':
                action_obj['params']['element_id'] = param
            elif action_type == 'input_text':
                action_obj['params']['text'] = param
                
            print(f"[@navigation:executor:parse_action_string] Mapped parameterized '{action_str}' to action object")
            return action_obj
    
    # Fallback: create a generic action object
    print(f"[@navigation:executor:parse_action_string] WARNING: Unknown action '{action_str}', creating generic action")
    return {
        'id': action_str,
        'label': action_str.replace('_', ' ').title(),
        'command': action_str,
        'params': {},
        'requiresInput': False,
        'waitTime': 1000
    }

def get_current_node_id(tree_id: str, team_id: str) -> Optional[str]:
    """
    Get current node position (placeholder for now)
    
    Args:
        tree_id: Navigation tree ID
        team_id: Team ID for security
        
    Returns:
        Current node ID or None if unknown
    """
    print(f"[@navigation:executor:get_current_node_id] Getting current position in tree {tree_id}")
    
    # Placeholder implementation
    # In a real implementation, this would:
    # 1. Take a screenshot of the current UI
    # 2. Compare with known node screenshots
    # 3. Use ML/CV to identify current position
    # 4. Return the matching node ID
    
    # For now, return None to indicate unknown position
    # This will cause navigation to start from the entry point
    print(f"[@navigation:executor:get_current_node_id] PLACEHOLDER: Current position unknown, will start from entry point")
    return None

def verify_node_reached(tree_id: str, expected_node_id: str, team_id: str) -> bool:
    """
    Verify that we have reached the expected node
    
    Args:
        tree_id: Navigation tree ID
        expected_node_id: Expected current node ID
        team_id: Team ID for security
        
    Returns:
        True if at expected node, False otherwise
    """
    print(f"[@navigation:executor:verify_node_reached] Verifying we reached node {expected_node_id}")
    
    # Placeholder implementation
    # In a real implementation, this would:
    # 1. Get current node using screenshot comparison
    # 2. Compare with expected node
    # 3. Return verification result
    
    # For now, always return True (assume success)
    print(f"[@navigation:executor:verify_node_reached] PLACEHOLDER: Assuming we reached {expected_node_id}")
    return True

def execute_navigation_with_verification(tree_id: str, target_node_id: str, team_id: str, current_node_id: str = None, host_info: dict = None) -> Dict:
    """
    Execute navigation with batch execution - sends all transitions to host at once
    
    Args:
        tree_id: Navigation tree ID
        target_node_id: Target node to navigate to
        team_id: Team ID for security
        current_node_id: Current position (if None, starts from entry point)
        host_info: Host information for proxying to correct device
        
    Returns:
        Dictionary with execution results and detailed transition progress
    """
    print(f"[@navigation:executor:execute_navigation_with_verification] Starting batch navigation to {target_node_id}")
    
    # Validate host information
    if not host_info:
        return {
            'success': False,
            'error_message': 'Host information required for navigation execution',
            'target_node_id': target_node_id,
            'current_node_id': current_node_id,
            'execution_time': 0
        }
    
    result = {
        'success': False,
        'target_node_id': target_node_id,
        'transitions_executed': 0,
        'total_transitions': 0,
        'actions_executed': 0,
        'total_actions': 0,
        'execution_time': 0,
        'error_message': None,
        'transitions_details': [],
        'action_results': []
    }
    
    start_time = time.time()
    
    try:
        # Get navigation transitions
        from src.navigation.navigation_pathfinding import get_navigation_transitions
        
        transitions = get_navigation_transitions(tree_id, target_node_id, team_id, current_node_id)
        
        if not transitions:
            # Check if this means "already at target" vs "no path found"
            if current_node_id == target_node_id:
                result['success'] = True
                result['execution_time'] = time.time() - start_time
                result['final_message'] = f"Already at target node '{target_node_id}'"
                print(f"[@navigation:executor:execute_navigation_with_verification] ✅ Already at target node {target_node_id}")
                return result
            else:
                result['error_message'] = "No navigation path found"
                return result
        
        result['total_transitions'] = len(transitions)
        result['total_actions'] = sum(len(t.get('actions', [])) for t in transitions)
        
        print(f"[@navigation:executor:execute_navigation_with_verification] Sending {len(transitions)} transitions with {result['total_actions']} total actions to host for batch execution")
        
        # Prepare navigation data for batch execution
        navigation_data = {
            'tree_id': tree_id,
            'target_node_id': target_node_id,
            'current_node_id': current_node_id,
            'transitions': transitions,
            'team_id': team_id
        }
        
        # Use proxy pattern to send navigation data to host (following established pattern)
        from src.utils.build_url_utils import buildHostUrl
        import requests
        
        print(f"[@navigation:executor:execute_navigation_with_verification] Proxying batch navigation to host: {host_info.get('host_name')}")
        
        # Build host URL for navigation execution
        host_url = buildHostUrl(host_info, '/host/navigation/execute')
        if not host_url:
            result['error_message'] = 'Failed to build host URL for navigation execution'
            result['execution_time'] = time.time() - start_time
            return result
        
        print(f"[@navigation:executor:execute_navigation_with_verification] Calling host navigation API: {host_url}")
        
        try:
            response = requests.post(
                host_url,
                json={'navigation_data': navigation_data},
                timeout=120,  # Longer timeout for batch execution
                verify=False,
                headers={'Content-Type': 'application/json'}
            )
            
            execution_time = time.time() - start_time
            result['execution_time'] = execution_time
            
            if response.status_code == 200:
                batch_result = response.json()
                print(f"[@navigation:executor:execute_navigation_with_verification] Batch execution response: {batch_result}")
                
                if batch_result.get('success'):
                    result['success'] = True
                    result['transitions_executed'] = batch_result.get('transitions_executed', len(transitions))
                    result['actions_executed'] = batch_result.get('actions_executed', result['total_actions'])
                    result['transitions_details'] = batch_result.get('transitions_details', [])
                    result['action_results'] = batch_result.get('action_results', [])
                    result['final_message'] = f"Successfully navigated to '{target_node_id}' via batch execution"
                    
                    print(f"[@navigation:executor:execute_navigation_with_verification] ✅ Batch navigation completed successfully")
                    print(f"[@navigation:executor:execute_navigation_with_verification] Executed {result['transitions_executed']}/{result['total_transitions']} transitions")
                    print(f"[@navigation:executor:execute_navigation_with_verification] Executed {result['actions_executed']}/{result['total_actions']} actions")
                    
                    return result
                else:
                    result['error_message'] = batch_result.get('error', 'Batch navigation failed')
                    result['transitions_executed'] = batch_result.get('transitions_executed', 0)
                    result['actions_executed'] = batch_result.get('actions_executed', 0)
                    result['transitions_details'] = batch_result.get('transitions_details', [])
                    result['action_results'] = batch_result.get('action_results', [])
                    
                    print(f"[@navigation:executor:execute_navigation_with_verification] ❌ Batch navigation failed: {result['error_message']}")
                    return result
            else:
                result['error_message'] = f"Host navigation API call failed with status {response.status_code}: {response.text}"
                print(f"[@navigation:executor:execute_navigation_with_verification] ❌ {result['error_message']}")
                return result
                
        except requests.exceptions.Timeout:
            result['error_message'] = 'Navigation request timed out'
            result['execution_time'] = time.time() - start_time
            print(f"[@navigation:executor:execute_navigation_with_verification] ❌ Navigation request timed out")
            return result
        except requests.exceptions.RequestException as e:
            result['error_message'] = f'Network error: {str(e)}'
            result['execution_time'] = time.time() - start_time
            print(f"[@navigation:executor:execute_navigation_with_verification] ❌ Network error: {e}")
            return result
        
    except Exception as e:
        result['execution_time'] = time.time() - start_time
        result['error_message'] = f"Navigation execution error: {str(e)}"
        print(f"[@navigation:executor:execute_navigation_with_verification] ❌ Exception: {e}")
        return result

# NOTE: execute_action_object function removed - now using batch execution via host

def is_acceptable_failure(action_obj: dict, error_message: str) -> bool:
    """
    Check if an action failure is acceptable because the desired state is already achieved
    
    Args:
        action_obj: The action that failed
        error_message: The error message from the API
        
    Returns:
        True if the failure is acceptable, False otherwise
    """
    command = action_obj.get('command', '').lower()
    error_lower = error_message.lower()
    
    # Launch app failures that are acceptable
    if command == 'launch_app':
        acceptable_launch_errors = [
            'app already running',
            'app already launched',
            'app is already in foreground',
            'application already started',
            'already running',
            'app already open',
            'no active connection'  # Device might be disconnected but app could be running
        ]
        
        for acceptable_error in acceptable_launch_errors:
            if acceptable_error in error_lower:
                print(f"[@navigation:executor:is_acceptable_failure] Launch app failure is acceptable: {acceptable_error}")
                return True
    
    # Close app failures that are acceptable
    elif command == 'close_app':
        acceptable_close_errors = [
            'app not running',
            'app already closed',
            'app already stopped',
            'application not found',
            'package not running',
            'app not in foreground',
            'no active connection'  # Device might be disconnected but app could already be closed
        ]
        
        for acceptable_error in acceptable_close_errors:
            if acceptable_error in error_lower:
                print(f"[@navigation:executor:is_acceptable_failure] Close app failure is acceptable: {acceptable_error}")
                return True
    
    # Click element failures that might be acceptable
    elif command == 'click_element':
        acceptable_click_errors = [
            'element already selected',
            'element not clickable but already active',
            'target already achieved',
            'element not found but screen shows expected result'
        ]
        
        for acceptable_error in acceptable_click_errors:
            if acceptable_error in error_lower:
                print(f"[@navigation:executor:is_acceptable_failure] Click element failure is acceptable: {acceptable_error}")
                return True
    
    # Input text failures that might be acceptable
    elif command == 'input_text':
        acceptable_input_errors = [
            'text already entered',
            'field already contains text',
            'input field already has correct value'
        ]
        
        for acceptable_error in acceptable_input_errors:
            if acceptable_error in error_lower:
                print(f"[@navigation:executor:is_acceptable_failure] Input text failure is acceptable: {acceptable_error}")
                return True
    
    return False

def is_acceptable_api_failure(action_obj: dict, status_code: int, error_text: str) -> bool:
    """
    Check if an API failure is acceptable (like device disconnection when app is already running)
    
    Args:
        action_obj: The action that failed
        status_code: HTTP status code
        error_text: Error response text
        
    Returns:
        True if the API failure is acceptable, False otherwise
    """
    command = action_obj.get('command', '').lower()
    error_lower = error_text.lower()
    
    # For launch_app, if there's no active connection, the app might already be running
    if command == 'launch_app':
        if 'no active connection' in error_lower or 'connection refused' in error_lower:
            print(f"[@navigation:executor:is_acceptable_api_failure] Launch app API failure acceptable - device might be disconnected but app could be running")
            return True
    
    # For close_app, if there's no active connection, the app might already be closed
    elif command == 'close_app':
        if 'no active connection' in error_lower or 'connection refused' in error_lower:
            print(f"[@navigation:executor:is_acceptable_api_failure] Close app API failure acceptable - device might be disconnected but app could already be closed")
            return True
    
    # For any action, if device is not connected but we're in a demo/testing scenario
    if status_code == 503 or 'service unavailable' in error_lower:
        print(f"[@navigation:executor:is_acceptable_api_failure] Service unavailable - acceptable in demo mode")
        return True
        
    return False

def get_navigation_preview(tree_id: str, target_node_id: str, team_id: str, current_node_id: str = None) -> Dict:
    """
    Get a preview of navigation transitions without executing them
    
    Args:
        tree_id: Navigation tree ID
        target_node_id: Target node to navigate to
        team_id: Team ID for security
        current_node_id: Current position (if None, uses entry point)
        
    Returns:
        Dictionary with navigation preview information showing transitions
    """
    print(f"[@navigation:executor:get_navigation_preview] Getting navigation preview to {target_node_id}")
    
    from src.navigation.navigation_pathfinding import get_navigation_transitions, find_entry_point
    
    # Determine starting point
    start_node = current_node_id or find_entry_point(tree_id, team_id)
    
    # Get navigation transitions
    transitions = get_navigation_transitions(tree_id, target_node_id, team_id, current_node_id)
    
    total_actions = sum(len(t.get('actions', [])) for t in transitions) if transitions else 0
    estimated_time = total_actions * 1.5  # Estimate 1.5 seconds per action
    
    preview = {
        'tree_id': tree_id,
        'target_node_id': target_node_id,
        'start_node_id': start_node,
        'total_transitions': len(transitions) if transitions else 0,
        'total_actions': total_actions,
        'estimated_time': estimated_time,
        'path_found': bool(transitions),
        'transitions': transitions or [],
        'summary': f"Navigate from {start_node} to {target_node_id} in {len(transitions) if transitions else 0} transitions ({total_actions} actions)" if transitions else "No path found"
    }
    
    return preview 
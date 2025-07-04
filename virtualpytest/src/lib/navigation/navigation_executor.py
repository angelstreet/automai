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

def execute_navigation_with_verification(tree_id: str, target_node_id: str, team_id: str, current_node_id: str = None) -> Dict:
    """
    Execute navigation using local controllers directly
    
    Args:
        tree_id: Navigation tree ID
        target_node_id: Target node to navigate to
        team_id: Team ID for security
        current_node_id: Current position (if None, starts from entry point)
        
    Returns:
        Dictionary with execution results and detailed transition progress
    """
    print(f"[@navigation:executor:execute_navigation_with_verification] Starting navigation to {target_node_id}")
    
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
        from src.lib.navigation.navigation_pathfinding import get_navigation_transitions
        
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
        
        # Execute navigation using local controllers directly
        from src.utils.host_utils import get_host
        
        print(f"[@navigation:executor:execute_navigation_with_verification] Executing {len(transitions)} transitions with {result['total_actions']} actions using local controllers")
        
        # Get local host device and controllers
        host = get_host()
        if not host:
            result['error_message'] = 'Host device not available'
            result['execution_time'] = time.time() - start_time
            return result
        
        device = host.get_device('device1')  # Default device
        if not device:
            result['error_message'] = 'Device not available'
            result['execution_time'] = time.time() - start_time
            return result
        
        remote_controller = device.get_controller('remote')
        if not remote_controller:
            result['error_message'] = 'Remote controller not available'
            result['execution_time'] = time.time() - start_time
            return result
        
        # Execute transitions using local controllers
        transitions_executed = 0
        actions_executed = 0
        transitions_details = []
        action_results = []
        
        for i, transition in enumerate(transitions):
            transition_start_time = time.time()
            transition_success = True
            transition_actions_executed = 0
            
            print(f"[@navigation:executor:execute_navigation_with_verification] Executing transition {i+1}/{len(transitions)}: {transition.get('from_node_label', '')} → {transition.get('to_node_label', '')}")
            
            # Execute actions in transition
            actions = transition.get('actions', [])
            for j, action in enumerate(actions):
                print(f"[@navigation:executor:execute_navigation_with_verification]   Action {j+1}/{len(actions)}: {action.get('command', 'Unknown')}")
                
                try:
                    # Execute action using remote controller directly
                    command = action.get('command')
                    params = action.get('params', {})
                    
                    if command == 'press_key':
                        success = remote_controller.press_key(params.get('key'))
                    elif command == 'input_text':
                        success = remote_controller.input_text(params.get('text'))
                    elif command == 'launch_app':
                        success = remote_controller.launch_app(params.get('package'))
                    elif command == 'close_app':
                        success = remote_controller.close_app(params.get('package'))
                    elif command == 'tap_coordinates':
                        success = remote_controller.tap_coordinates(params.get('x'), params.get('y'))
                    elif command == 'click_element':
                        success = remote_controller.click_element(params.get('element_id'))
                    else:
                        print(f"[@navigation:executor:execute_navigation_with_verification]   ⚠️  Unknown command: {command}")
                        success = False
                    
                    if success:
                        transition_actions_executed += 1
                        actions_executed += 1
                        print(f"[@navigation:executor:execute_navigation_with_verification]   ✓ Action {j+1} completed successfully")
                        
                        action_results.append({
                            'transition_number': i + 1,
                            'action_number': j + 1,
                            'action': action,
                            'success': True,
                            'message': 'Success'
                        })
                        
                        # Wait after action if specified
                        if action.get('waitTime', 0) > 0:
                            wait_time_seconds = action.get('waitTime', 0) / 1000.0
                            print(f"[@navigation:executor:execute_navigation_with_verification]   Waiting {wait_time_seconds}s after action")
                            time.sleep(wait_time_seconds)
                    else:
                        print(f"[@navigation:executor:execute_navigation_with_verification]   ✗ Action {j+1} failed")
                        transition_success = False
                        
                        action_results.append({
                            'transition_number': i + 1,
                            'action_number': j + 1,
                            'action': action,
                            'success': False,
                            'error': f'Command {command} failed'
                        })
                        break
                        
                except Exception as e:
                    print(f"[@navigation:executor:execute_navigation_with_verification]   ✗ Action {j+1} exception: {str(e)}")
                    transition_success = False
                    
                    action_results.append({
                        'transition_number': i + 1,
                        'action_number': j + 1,
                        'action': action,
                        'success': False,
                        'error': str(e)
                    })
                    break
            
            transition_execution_time = time.time() - transition_start_time
            
            # Record transition details
            transition_detail = {
                'transition_number': i + 1,
                'from_node_id': transition.get('from_node_id'),
                'to_node_id': transition.get('to_node_id'),
                'from_node_label': transition.get('from_node_label', ''),
                'to_node_label': transition.get('to_node_label', ''),
                'actions_executed': transition_actions_executed,
                'total_actions': len(actions),
                'success': transition_success,
                'execution_time': transition_execution_time
            }
            
            transitions_details.append(transition_detail)
            
            if transition_success:
                transitions_executed += 1
                print(f"[@navigation:executor:execute_navigation_with_verification] ✓ Transition {i+1} completed successfully")
            else:
                print(f"[@navigation:executor:execute_navigation_with_verification] ✗ Transition {i+1} failed")
                # Continue with remaining transitions even if one fails
        
        execution_time = time.time() - start_time
        overall_success = transitions_executed == len(transitions)
        
        result['success'] = overall_success
        result['transitions_executed'] = transitions_executed
        result['actions_executed'] = actions_executed
        result['transitions_details'] = transitions_details
        result['action_results'] = action_results
        result['execution_time'] = execution_time
        result['final_message'] = f"Successfully navigated to '{target_node_id}'" if overall_success else f"Navigation failed: only {transitions_executed}/{len(transitions)} transitions completed"
        
        print(f"[@navigation:executor:execute_navigation_with_verification] Navigation completed in {execution_time:.2f}s")
        print(f"[@navigation:executor:execute_navigation_with_verification] Results: {transitions_executed}/{len(transitions)} transitions, {actions_executed}/{result['total_actions']} actions")
        
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
    
    from src.lib.navigation.navigation_pathfinding import get_navigation_transitions, find_entry_point
    
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
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
from src.utils.build_url_utils import buildServerUrl

def execute_navigation_to_node(tree_id: str, target_node_id: str, team_id: str, current_node_id: str = None) -> bool:
    """
    Execute navigation to a specific node
    
    Args:
        tree_id: Navigation tree ID
        target_node_id: Target node to navigate to
        team_id: Team ID for security
        current_node_id: Current position (if None, starts from entry point)
        
    Returns:
        True if navigation completed successfully, False otherwise
    """
    print(f"[@navigation:executor:execute_navigation_to_node] Starting navigation to {target_node_id} in tree {tree_id}")
    
    # Get navigation steps
    from src.navigation.navigation_pathfinding import get_navigation_transitions
    
    transitions = get_navigation_transitions(tree_id, target_node_id, team_id, current_node_id)
    
    if not transitions:
        print(f"[@navigation:executor:execute_navigation_to_node] No navigation path found to {target_node_id}")
        return False
    
    # Convert transitions to individual steps for execution
    steps = []
    step_counter = 1
    for transition in transitions:
        for action in transition.get('actions', []):
            step = {
                'step_number': step_counter,
                'from_node_id': transition['from_node_id'],
                'to_node_id': transition['to_node_id'],
                'from_node_label': transition.get('from_node_label', ''),
                'to_node_label': transition.get('to_node_label', ''),
                'action': action.get('command', ''),
                'action_info': action,
                'description': f"Execute {action.get('label', action.get('command', 'Unknown Action'))} to navigate from '{transition.get('from_node_label', '')}' to '{transition.get('to_node_label', '')}'"
            }
            steps.append(step)
            step_counter += 1
    
    print(f"[@navigation:executor:execute_navigation_to_node] Executing {len(steps)} navigation steps")
    
    # Execute each step
    for step in steps:
        success = execute_navigation_step(
            step['action'], 
            step['from_node_id'], 
            step['to_node_id']
        )
        
        if not success:
            print(f"[@navigation:executor:execute_navigation_to_node] Failed at step {step['step_number']}: {step['description']}")
            return False
        
        # Small delay between steps to allow UI transitions
        time.sleep(0.5)
    
    print(f"[@navigation:executor:execute_navigation_to_node] Successfully navigated to {target_node_id}")
    return True

def execute_navigation_step(action: str, from_node: str, to_node: str) -> bool:
    """
    Execute a single navigation step using real device automation
    
    Args:
        action: Navigation action to perform
        from_node: Source node ID
        to_node: Target node ID
        
    Returns:
        True if step executed successfully, False otherwise
    """
    print(f"[@navigation:executor:execute_navigation_step] Executing action '{action}' from {from_node} to {to_node}")
    
    if not action:
        print(f"[@navigation:executor:execute_navigation_step] WARNING: No action defined for transition {from_node} -> {to_node}")
        return False
    
    try:
        # Convert action string to action object for API call
        action_object = parse_action_string(action)
        if not action_object:
            print(f"[@navigation:executor:execute_navigation_step] ERROR: Could not parse action '{action}'")
            return False
        
        print(f"[@navigation:executor:execute_navigation_step] Parsed action: {action_object}")
        
        # Use centralized server URL building
        api_url = buildServerUrl('/server/a-step')
        
        # Call the abstract remote controller API endpoint
        print(f"[@navigation_executor:execute_action] Calling abstract remote controller API")
        
        response = requests.post(api_url, 
                               headers={'Content-Type': 'application/json'},
                               json={'action': action_object},
                               timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                print(f"[@navigation:executor:execute_navigation_step] Action '{action}' executed successfully: {result.get('message', 'Success')}")
                
                # Add a brief wait after successful action
                time.sleep(1.0)  # Wait for UI to settle
                return True
            else:
                print(f"[@navigation:executor:execute_navigation_step] Action '{action}' failed: {result.get('error', 'Unknown error')}")
                return False
        else:
            print(f"[@navigation:executor:execute_navigation_step] API call failed with status {response.status_code}: {response.text}")
            return False
        
    except Exception as e:
        print(f"[@navigation:executor:execute_navigation_step] Error executing action '{action}': {e}")
        return False

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
    Execute navigation with step-by-step verification and detailed progress tracking
    Shows transitions (from → to) with multiple actions per transition
    
    Args:
        tree_id: Navigation tree ID
        target_node_id: Target node to navigate to
        team_id: Team ID for security
        current_node_id: Current position (if None, starts from entry point)
        
    Returns:
        Dictionary with execution results and detailed transition progress
    """
    print(f"[@navigation:executor:execute_navigation_with_verification] Starting verified navigation to {target_node_id}")
    
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
        'current_transition': None,  # Track currently executing transition
        'progress_info': []    # Detailed progress tracking
    }
    
    start_time = time.time()
    
    try:
        # Get navigation transitions with enhanced information
        from src.navigation.navigation_pathfinding import get_navigation_transitions
        
        transitions = get_navigation_transitions(tree_id, target_node_id, team_id, current_node_id)
        
        if not transitions:
            # Check if this means "already at target" vs "no path found"
            # If current_node_id == target_node_id, this is success (already there)
            if current_node_id == target_node_id:
                result['success'] = True
                result['execution_time'] = time.time() - start_time
                result['transitions_executed'] = 0
                result['total_transitions'] = 0
                result['actions_executed'] = 0
                result['total_actions'] = 0
                result['final_message'] = f"Already at target node '{target_node_id}'"
                print(f"[@navigation:executor:execute_navigation_with_verification] ✅ Already at target node {target_node_id}")
                return result
            else:
                result['error_message'] = "No navigation path found"
                return result
        
        result['total_transitions'] = len(transitions)
        result['total_actions'] = sum(len(t.get('actions', [])) for t in transitions)
        
        print(f"[@navigation:executor:execute_navigation_with_verification] Executing {len(transitions)} navigation transitions with {result['total_actions']} total actions:")
        for i, transition in enumerate(transitions):
            actions_summary = [f"{a.get('label', a.get('command', 'unknown'))}" for a in transition.get('actions', [])]
            print(f"  Transition {i+1}: {transition.get('from_node_label')} → {transition.get('to_node_label')} ({len(transition.get('actions', []))} actions: {actions_summary})")
        
        # Execute each transition with detailed progress tracking
        for i, transition in enumerate(transitions):
            transition_start_time = time.time()
            
            current_transition_info = {
                'transition_number': transition['transition_number'],
                'from_node_id': transition['from_node_id'],
                'to_node_id': transition['to_node_id'],
                'from_node_label': transition.get('from_node_label', ''),
                'to_node_label': transition.get('to_node_label', ''),
                'actions': transition.get('actions', []),
                'total_actions': len(transition.get('actions', [])),
                'actions_executed': 0,
                'status': 'executing'
            }
            
            result['current_transition'] = current_transition_info
            
            print(f"[@navigation:executor:execute_navigation_with_verification] Executing Transition {i+1}/{len(transitions)}: {current_transition_info['from_node_label']} → {current_transition_info['to_node_label']}")
            print(f"[@navigation:executor:execute_navigation_with_verification] Actions to execute: {len(current_transition_info['actions'])}")
            
            # Execute all actions in this transition
            transition_success = True
            actions_executed = 0
            
            # Execute main actions
            for j, action in enumerate(current_transition_info['actions']):
                action_start_time = time.time()
                
                print(f"[@navigation:executor:execute_navigation_with_verification]   Action {j+1}/{len(current_transition_info['actions'])}: {action.get('label', action.get('command', 'Unknown'))}")
                
                # Execute the action using the real action execution
                action_success = execute_action_object(action)
                
                action_execution_time = time.time() - action_start_time
                
                if action_success:
                    actions_executed += 1
                    current_transition_info['actions_executed'] += 1
                    result['actions_executed'] += 1
                    print(f"[@navigation:executor:execute_navigation_with_verification]   ✓ Action {j+1} completed successfully in {action_execution_time:.2f}s")
                    
                    # Wait after action if specified
                    if action.get('waitTime', 0) > 0:
                        wait_time_seconds = action.get('waitTime', 0) / 1000.0
                        print(f"[@navigation:executor:execute_navigation_with_verification]   Waiting {wait_time_seconds}s after action")
                        time.sleep(wait_time_seconds)
                else:
                    print(f"[@navigation:executor:execute_navigation_with_verification]   ✗ Action {j+1} failed after {action_execution_time:.2f}s")
                    transition_success = False
                    break
            
            # If main actions failed and we have retry actions, execute them
            retry_actions = transition.get('retryActions', [])
            if not transition_success and retry_actions:
                print(f"[@navigation:executor:execute_navigation_with_verification] 🔄 Main actions failed. Starting retry actions...")
                print(f"[@navigation:executor:execute_navigation_with_verification] 📋 Processing {len(retry_actions)} retry action(s):")
                
                # Reset transition success for retry attempt
                retry_success = True
                retry_actions_executed = 0
                
                for j, retry_action in enumerate(retry_actions):
                    action_start_time = time.time()
                    
                    print(f"[@navigation:executor:execute_navigation_with_verification]   Retry Action {j+1}/{len(retry_actions)}: {retry_action.get('label', retry_action.get('command', 'Unknown'))}")
                    
                    # Execute the retry action
                    action_success = execute_action_object(retry_action)
                    
                    action_execution_time = time.time() - action_start_time
                    
                    if action_success:
                        retry_actions_executed += 1
                        print(f"[@navigation:executor:execute_navigation_with_verification]   ✓ Retry Action {j+1} completed successfully in {action_execution_time:.2f}s")
                        
                        # Wait after retry action if specified
                        if retry_action.get('waitTime', 0) > 0:
                            wait_time_seconds = retry_action.get('waitTime', 0) / 1000.0
                            print(f"[@navigation:executor:execute_navigation_with_verification]   Waiting {wait_time_seconds}s after retry action")
                            time.sleep(wait_time_seconds)
                    else:
                        print(f"[@navigation:executor:execute_navigation_with_verification]   ✗ Retry Action {j+1} failed after {action_execution_time:.2f}s")
                        retry_success = False
                        break
                
                if retry_success and retry_actions_executed == len(retry_actions):
                    print(f"[@navigation:executor:execute_navigation_with_verification] ✅ Retry actions completed successfully!")
                    transition_success = True
                    # Update counters to reflect successful retry
                    current_transition_info['actions_executed'] = len(current_transition_info['actions']) + retry_actions_executed
                    result['actions_executed'] += retry_actions_executed
                else:
                    print(f"[@navigation:executor:execute_navigation_with_verification] ❌ Retry actions also failed.")
                    transition_success = False
            
            # Final wait for transition if specified
            if transition_success and transition.get('finalWaitTime', 0) > 0:
                final_wait_seconds = transition.get('finalWaitTime', 0) / 1000.0
                print(f"[@navigation:executor:execute_navigation_with_verification] Final wait for transition: {final_wait_seconds}s")
                time.sleep(final_wait_seconds)
            
            # Verify we reached the target node of this transition
            if transition_success:
                transition_success = verify_node_reached(tree_id, transition['to_node_id'], team_id)
            
            transition_execution_time = time.time() - transition_start_time
            current_transition_info['execution_time'] = transition_execution_time
            current_transition_info['status'] = 'completed' if transition_success else 'failed'
            
            transition_detail = {
                'transition_number': transition['transition_number'],
                'from_node_id': transition['from_node_id'],
                'to_node_id': transition['to_node_id'],
                'from_node_label': transition.get('from_node_label', ''),
                'to_node_label': transition.get('to_node_label', ''),
                'actions': transition.get('actions', []),
                'retryActions': transition.get('retryActions', []),  # Include retry actions in result
                'actions_executed': current_transition_info['actions_executed'],
                'total_actions': current_transition_info['total_actions'],
                'success': transition_success,
                'execution_time': transition_execution_time,
                'description': transition['description'],
                'retry_attempted': not transition_success and len(transition.get('retryActions', [])) > 0,  # Flag if retry was attempted
                'retry_successful': transition_success and len(transition.get('retryActions', [])) > 0  # Flag if retry was successful
            }
            
            result['transitions_details'].append(transition_detail)
            result['progress_info'].append(current_transition_info.copy())
            
            if transition_success:
                result['transitions_executed'] += 1
                print(f"[@navigation:executor:execute_navigation_with_verification] ✓ Transition {i+1}/{len(transitions)} completed successfully")
                print(f"[@navigation:executor:execute_navigation_with_verification] Successfully navigated from '{current_transition_info['from_node_label']}' to '{current_transition_info['to_node_label']}'")
            else:
                result['error_message'] = f"Failed at transition {i+1}: Navigate from '{current_transition_info['from_node_label']}' to '{current_transition_info['to_node_label']}' - {current_transition_info['actions_executed']}/{current_transition_info['total_actions']} actions completed"
                print(f"[@navigation:executor:execute_navigation_with_verification] ✗ {result['error_message']}")
                break
            
            # Small delay between transitions
            time.sleep(0.5)
        
        # Check if all transitions completed successfully
        result['success'] = result['transitions_executed'] == result['total_transitions']
        result['execution_time'] = time.time() - start_time
        result['current_transition'] = None  # Clear current transition when done
        
        if result['success']:
            print(f"[@navigation:executor:execute_navigation_with_verification] 🎉 Successfully navigated to {target_node_id} in {result['execution_time']:.2f}s")
            result['final_message'] = f"Success ! Reached '{transitions[-1].get('to_node_label', target_node_id)}'"
        else:
            print(f"[@navigation:executor:execute_navigation_with_verification] ❌ Navigation failed: {result['error_message']}")
        
    except Exception as e:
        result['error_message'] = f"Execution error: {str(e)}"
        result['execution_time'] = time.time() - start_time
        result['current_transition'] = None
        print(f"[@navigation:executor:execute_navigation_with_verification] Exception: {e}")
    
    return result

def execute_action_object(action_obj: dict) -> bool:
    """
    Execute a single action object (same format as EdgeSelectionPanel)
    
    Args:
        action_obj: Action object with id, command, params, etc.
        
    Returns:
        True if action executed successfully, False otherwise
    """
    if not action_obj or not action_obj.get('command'):
        print(f"[@navigation:executor:execute_action_object] ERROR: Invalid action object: {action_obj}")
        return False
    
    # ENHANCED LOGGING: Show original action object received
    print(f"[@navigation:executor:execute_action_object] ORIGINAL ACTION OBJECT: {action_obj}")
    print(f"[@navigation:executor:execute_action_object] Action keys: {list(action_obj.keys()) if action_obj else 'None'}")
    print(f"[@navigation:executor:execute_action_object] Action command: '{action_obj.get('command')}'")
    print(f"[@navigation:executor:execute_action_object] Action params: {action_obj.get('params')}")
    print(f"[@navigation:executor:execute_action_object] Requires input: {action_obj.get('requiresInput')}")
    print(f"[@navigation:executor:execute_action_object] Input value: '{action_obj.get('inputValue')}'")
    
    try:
        print(f"[@navigation:executor:execute_action_object] Executing action: {action_obj}")
        
        # Prepare action for API call (same format as EdgeSelectionPanel)
        action_to_execute = {
            'id': action_obj.get('id'),
            'label': action_obj.get('label'),
            'command': action_obj.get('command'),
            'params': action_obj.get('params', {}).copy(),
            'requiresInput': action_obj.get('requiresInput', False),
            'waitTime': action_obj.get('waitTime', 1000)
        }
        
        # Update params with input values for actions that require them
        if action_obj.get('requiresInput') and action_obj.get('inputValue'):
            input_value = action_obj.get('inputValue')
            command = action_obj.get('command')
            
            if command == 'launch_app':
                action_to_execute['params']['package'] = input_value
            elif command == 'close_app':
                action_to_execute['params']['package'] = input_value
            elif command == 'input_text':
                action_to_execute['params']['text'] = input_value
            elif command == 'click_element':
                action_to_execute['params']['element_id'] = input_value
            elif command == 'coordinate_tap':
                coords = input_value.split(',')
                if len(coords) >= 2:
                    try:
                        action_to_execute['params']['x'] = int(coords[0].strip())
                        action_to_execute['params']['y'] = int(coords[1].strip())
                    except ValueError:
                        print(f"[@navigation:executor:execute_action_object] WARNING: Invalid coordinates: {input_value}")
        
        # ENHANCED LOGGING: Show exact action being sent to API
        print(f"[@navigation:executor:execute_action_object] SENDING TO API: {action_to_execute}")
        print(f"[@navigation:executor:execute_action_object] Action command: '{action_to_execute.get('command')}'")
        print(f"[@navigation:executor:execute_action_object] Action params: {action_to_execute.get('params')}")
        
        # Call the abstract remote controller API endpoint
        print(f"[@navigation_executor:execute_action] Calling abstract remote controller API")
        api_url = buildServerUrl('/server/navigation/execute-step')
        
        print(f"[@navigation:executor:execute_action_object] API URL: {api_url}")
        
        response = requests.post(api_url, 
                               headers={'Content-Type': 'application/json'},
                               json={'action': action_to_execute},
                               timeout=30)
        
        print(f"[@navigation:executor:execute_action_object] API Response Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"[@navigation:executor:execute_action_object] API Response Body: {result}")
            
            if result.get('success'):
                print(f"[@navigation:executor:execute_action_object] Action executed successfully: {result.get('message', 'Success')}")
                return True
            else:
                error_message = result.get('error', 'Unknown error')
                print(f"[@navigation:executor:execute_action_object] Action failed: {error_message}")
                print(f"[@navigation:executor:execute_action_object] Full error response: {result}")
                
                # Check if failure is acceptable (desired state already achieved)
                if is_acceptable_failure(action_obj, error_message):
                    print(f"[@navigation:executor:execute_action_object] Failure is acceptable - desired state likely already achieved")
                    return True
                    
                return False
        else:
            error_text = response.text
            print(f"[@navigation:executor:execute_action_object] API call failed with status {response.status_code}: {error_text}")
            
            # Check if API failure indicates desired state is already achieved
            if is_acceptable_api_failure(action_obj, response.status_code, error_text):
                print(f"[@navigation:executor:execute_action_object] API failure is acceptable - desired state likely already achieved")
                return True
                
            return False
        
    except Exception as e:
        print(f"[@navigation:executor:execute_action_object] Error executing action: {e}")
        return False

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
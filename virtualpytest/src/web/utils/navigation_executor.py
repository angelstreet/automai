"""
Navigation execution engine
Executes navigation steps and tracks current position
"""

from typing import List, Dict, Optional
import time
import sys
import os

# Add paths for absolute imports instead of relative imports
web_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
web_utils_path = os.path.join(web_dir, 'utils')
sys.path.insert(0, web_utils_path)

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
    from navigation_pathfinding import get_navigation_steps
    
    steps = get_navigation_steps(tree_id, target_node_id, team_id, current_node_id)
    
    if not steps:
        print(f"[@navigation:executor:execute_navigation_to_node] No navigation path found to {target_node_id}")
        return False
    
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
        
        # Call the virtualpytest API endpoint (same as EdgeSelectionPanel)
        import requests
        import json
        
        api_controller_type = 'android-mobile'  # Default controller type
        api_url = f"http://localhost:5009/api/virtualpytest/{api_controller_type}/execute-action"
        
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
    
    Args:
        tree_id: Navigation tree ID
        target_node_id: Target node to navigate to
        team_id: Team ID for security
        current_node_id: Current position (if None, starts from entry point)
        
    Returns:
        Dictionary with execution results and detailed step progress
    """
    print(f"[@navigation:executor:execute_navigation_with_verification] Starting verified navigation to {target_node_id}")
    
    result = {
        'success': False,
        'target_node_id': target_node_id,
        'steps_executed': 0,
        'total_steps': 0,
        'execution_time': 0,
        'error_message': None,
        'steps_details': [],
        'current_step': None,  # Track currently executing step
        'progress_info': []    # Detailed progress tracking
    }
    
    start_time = time.time()
    
    try:
        # Get navigation steps with enhanced information
        from navigation_pathfinding import get_navigation_steps
        
        steps = get_navigation_steps(tree_id, target_node_id, team_id, current_node_id)
        
        if not steps:
            result['error_message'] = "No navigation path found"
            return result
        
        result['total_steps'] = len(steps)
        
        print(f"[@navigation:executor:execute_navigation_with_verification] Executing {len(steps)} navigation steps:")
        for i, step in enumerate(steps):
            print(f"  Step {i+1}: {step.get('from_node_label', step.get('from_node_id'))} → {step.get('to_node_label', step.get('to_node_id'))} via '{step.get('action')}'")
        
        # Execute each step with detailed progress tracking
        for i, step in enumerate(steps):
            step_start_time = time.time()
            current_step_info = {
                'step_number': step['step_number'],
                'from_node_id': step['from_node_id'],
                'to_node_id': step['to_node_id'],
                'from_node_label': step.get('from_node_label', ''),
                'to_node_label': step.get('to_node_label', ''),
                'action': step['action'],
                'status': 'executing'
            }
            
            result['current_step'] = current_step_info
            
            print(f"[@navigation:executor:execute_navigation_with_verification] Executing Step {i+1}/{len(steps)}: {current_step_info['from_node_label']} → {current_step_info['to_node_label']}")
            print(f"[@navigation:executor:execute_navigation_with_verification] Action: {current_step_info['action']}")
            
            # Execute the step
            step_success = execute_navigation_step(
                step['action'], 
                step['from_node_id'], 
                step['to_node_id']
            )
            
            # Verify we reached the target node
            if step_success:
                step_success = verify_node_reached(tree_id, step['to_node_id'], team_id)
            
            step_execution_time = time.time() - step_start_time
            current_step_info['execution_time'] = step_execution_time
            current_step_info['status'] = 'completed' if step_success else 'failed'
            
            step_detail = {
                'step_number': step['step_number'],
                'action': step['action'],
                'from_node': step['from_node_id'],
                'to_node': step['to_node_id'],
                'from_node_label': step.get('from_node_label', ''),
                'to_node_label': step.get('to_node_label', ''),
                'success': step_success,
                'execution_time': step_execution_time,
                'description': step['description']
            }
            
            result['steps_details'].append(step_detail)
            result['progress_info'].append(current_step_info.copy())
            
            if step_success:
                result['steps_executed'] += 1
                print(f"[@navigation:executor:execute_navigation_with_verification] ✓ Step {i+1}/{len(steps)} completed successfully")
                print(f"[@navigation:executor:execute_navigation_with_verification] Successfully navigated from '{current_step_info['from_node_label']}' to '{current_step_info['to_node_label']}'")
            else:
                result['error_message'] = f"Failed at step {i+1}: Navigate from '{current_step_info['from_node_label']}' to '{current_step_info['to_node_label']}' using '{current_step_info['action']}'"
                print(f"[@navigation:executor:execute_navigation_with_verification] ✗ {result['error_message']}")
                break
            
            # Small delay between steps
            time.sleep(0.5)
        
        # Check if all steps completed successfully
        result['success'] = result['steps_executed'] == result['total_steps']
        result['execution_time'] = time.time() - start_time
        result['current_step'] = None  # Clear current step when done
        
        if result['success']:
            print(f"[@navigation:executor:execute_navigation_with_verification] 🎉 Successfully navigated to {target_node_id} in {result['execution_time']:.2f}s")
            result['final_message'] = f"Navigation completed successfully! Reached '{step.get('to_node_label', target_node_id)}' in {result['steps_executed']} steps."
        else:
            print(f"[@navigation:executor:execute_navigation_with_verification] ❌ Navigation failed: {result['error_message']}")
        
    except Exception as e:
        result['error_message'] = f"Execution error: {str(e)}"
        result['execution_time'] = time.time() - start_time
        result['current_step'] = None
        print(f"[@navigation:executor:execute_navigation_with_verification] Exception: {e}")
    
    return result

def get_navigation_preview(tree_id: str, target_node_id: str, team_id: str, current_node_id: str = None) -> Dict:
    """
    Get a preview of navigation steps without executing them
    
    Args:
        tree_id: Navigation tree ID
        target_node_id: Target node to navigate to
        team_id: Team ID for security
        current_node_id: Current position (if None, uses entry point)
        
    Returns:
        Dictionary with navigation preview information
    """
    print(f"[@navigation:executor:get_navigation_preview] Getting navigation preview to {target_node_id}")
    
    from navigation_pathfinding import get_navigation_steps, find_entry_point
    
    # Determine starting point
    start_node = current_node_id or find_entry_point(tree_id, team_id)
    
    # Get navigation steps
    steps = get_navigation_steps(tree_id, target_node_id, team_id, current_node_id)
    
    preview = {
        'tree_id': tree_id,
        'target_node_id': target_node_id,
        'start_node_id': start_node,
        'total_steps': len(steps) if steps else 0,
        'estimated_time': len(steps) * 1.0 if steps else 0,  # Estimate 1 second per step
        'path_found': bool(steps),
        'steps': steps or [],
        'summary': f"Navigate from {start_node} to {target_node_id} in {len(steps) if steps else 0} steps" if steps else "No path found"
    }
    
    return preview 
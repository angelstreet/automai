"""
AI Agent Controller

Simple AI agent that calls real AI API to generate execution plans.
"""

import time
import json
import os
import requests
from typing import Dict, Any, List
from ..base_controller import BaseController


class AIAgentController(BaseController):
    """Simple AI agent controller that generates real execution plans using AI."""
    
    # Class-level cache for navigation trees (singleton pattern)
    _navigation_trees_cache: Dict[str, Dict] = {}
    
    def __init__(self, device_name: str = 'default_device', **kwargs):
        super().__init__("ai", device_name)
        
        self.is_executing = False
        self.current_step = ""
        self.execution_log = []
        
        print(f"AI[{self.device_name}]: Initialized")
    
    def _get_navigation_tree(self, userinterface_name: str) -> Dict[str, Any]:
        """
        Get navigation tree using singleton pattern - load only when needed and cache it.
        
        Args:
            userinterface_name: Name of the userinterface (e.g., 'horizon_android_mobile')
            
        Returns:
            Dictionary with tree data or None if failed
        """
        # Check if already cached
        if userinterface_name in self._navigation_trees_cache:
            print(f"AI[{self.device_name}]: Using cached navigation tree for: {userinterface_name}")
            return self._navigation_trees_cache[userinterface_name]
        
        # Load tree lazily
        try:
            # Lazy import inside method to avoid circular import
            from src.utils.script_utils import load_navigation_tree
            
            print(f"AI[{self.device_name}]: Loading navigation tree for: {userinterface_name}")
            tree_result = load_navigation_tree(userinterface_name, "ai_agent")
            
            if tree_result.get('success'):
                # Cache the tree
                self._navigation_trees_cache[userinterface_name] = tree_result.get('tree')
                print(f"AI[{self.device_name}]: Successfully loaded and cached navigation tree for: {userinterface_name}")
                return tree_result.get('tree')
            else:
                print(f"AI[{self.device_name}]: Failed to load navigation tree for: {userinterface_name}: {tree_result.get('error')}")
                return None
                
        except Exception as e:
            print(f"AI[{self.device_name}]: Error loading navigation tree for {userinterface_name}: {e}")
            return None
    

    
    def _execute_navigation(self, target_node: str, userinterface_name: str = "horizon_android_mobile") -> Dict[str, Any]:
        """
        Execute navigation by doing exactly what validation.py does.
        Uses pathfinding to get proper navigation sequence with actions.
        
        Args:
            target_node: Target node to navigate to
            userinterface_name: Name of the userinterface for navigation tree
            
        Returns:
            Dictionary with execution results
        """
        try:
            print(f"AI[{self.device_name}]: Executing navigation to '{target_node}' exactly like validation.py")
            
            # Use the same script_utils that validation.py uses
            from src.utils.script_utils import (
                setup_script_environment,
                select_device, 
                execute_navigation_step_directly,
                load_navigation_tree
            )
            
            # Setup script environment (same as validation.py)
            setup_result = setup_script_environment("ai_agent")
            if not setup_result['success']:
                return {'success': False, 'error': f"Script environment setup failed: {setup_result['error']}"}
            
            host = setup_result['host']
            team_id = setup_result['team_id']
            
            # Select device (same as validation.py)
            device_result = select_device(host, self.device_name, "ai_agent")
            if not device_result['success']:
                return {'success': False, 'error': f"Device selection failed: {device_result['error']}"}
            
            selected_device = device_result['device']
            
            # Load navigation tree (same as validation.py)
            tree_result = load_navigation_tree(userinterface_name, "ai_agent")
            if not tree_result['success']:
                return {'success': False, 'error': f"Tree loading failed: {tree_result['error']}"}
            
            # Get navigation sequence using pathfinding (same as validation.py)
            from src.lib.navigation.navigation_pathfinding import find_path_to_node
            
            print(f"AI[{self.device_name}]: Finding path to '{target_node}' using pathfinding")
            
            # Find path from current location to target node
            path_sequence = find_path_to_node(userinterface_name, target_node, team_id)
            
            if not path_sequence:
                return {'success': False, 'error': f"No path found to '{target_node}'"}
            
            print(f"AI[{self.device_name}]: Found path with {len(path_sequence)} steps")
            
            # Execute each step in the path (same as validation.py)
            for i, step in enumerate(path_sequence):
                step_num = i + 1
                from_node = step.get('from_node_label', 'unknown')
                to_node = step.get('to_node_label', 'unknown')
                
                print(f"AI[{self.device_name}]: Executing step {step_num}/{len(path_sequence)}: {from_node} → {to_node}")
                
                # Execute the navigation step directly (same as validation.py)
                result = execute_navigation_step_directly(host, selected_device, step, team_id)
                
                if not result['success']:
                    return {'success': False, 'error': f"Navigation failed at step {step_num}: {result.get('error', 'Unknown error')}"}
                
                print(f"AI[{self.device_name}]: Step {step_num} completed successfully")
            
            print(f"AI[{self.device_name}]: Navigation to '{target_node}' completed successfully")
            return {'success': True, 'message': f"Successfully navigated to '{target_node}'"}
            
        except Exception as e:
            error_msg = f"Navigation execution error: {str(e)}"
            print(f"AI[{self.device_name}]: {error_msg}")
            return {'success': False, 'error': error_msg}


    def execute_task(self, task_description: str, available_actions: List[Dict], available_verifications: List[Dict], device_model: str = None, userinterface_name: str = "horizon_android_mobile") -> Dict[str, Any]:
        """
        Execute a task: generate plan with AI, execute it, and summarize results.
        
        Args:
            task_description: User's task description (e.g., "go to live and zap 10 times")
            available_actions: Real actions from device capabilities
            available_verifications: Real verifications from device capabilities
            device_model: Device model for context
            userinterface_name: Name of the userinterface for navigation tree loading
        """
        try:
            print(f"AI[{self.device_name}]: Starting task: {task_description}")
            
            self.is_executing = True
            self.current_step = "Generating AI plan"
            self.execution_log = []
            
            # Load navigation tree only when needed
            navigation_tree = self._get_navigation_tree(userinterface_name)
            
            # Step 1: Generate plan using AI
            ai_plan = self._generate_plan(task_description, available_actions, available_verifications, device_model, navigation_tree)
            
            if not ai_plan.get('success'):
                return {
                    'success': False,
                    'error': ai_plan.get('error', 'Failed to generate plan'),
                    'execution_log': self.execution_log
                }
            
            self._add_to_log("ai_plan", "plan_generated", ai_plan['plan'], "AI generated execution plan")
            
            # Step 2: Execute the plan
            self.current_step = "Executing plan"
            execute_result = self._execute(ai_plan['plan'], navigation_tree, userinterface_name)
            self._add_to_log("execute", "plan_execution", execute_result, f"Plan execution: {execute_result}")
            
            # Step 3: Generate result summary
            self.current_step = "Generating summary"
            summary_result = self._result_summary(ai_plan['plan'], execute_result)
            self._add_to_log("summary", "result_summary", summary_result, f"Result summary: {summary_result}")
            
            return {
                'success': True,
                'ai_plan': ai_plan['plan'],
                'execute_result': execute_result,
                'summary_result': summary_result,
                'execution_log': self.execution_log,
                'current_step': 'Task completed'
            }
                
        except Exception as e:
            print(f"AI[{self.device_name}]: Task execution error: {e}")
            return {
                'success': False,
                'error': f'Task execution failed: {str(e)}',
                'execution_log': self.execution_log
            }
        finally:
            self.is_executing = False
    
    def _generate_plan(self, task_description: str, available_actions: List[Dict], available_verifications: List[Dict], device_model: str = None, navigation_tree: Dict = None) -> Dict[str, Any]:
        """
        Generate execution plan using AI API.
        
        Args:
            task_description: User's task description
            available_actions: Available actions from device capabilities
            available_verifications: Available verifications from device capabilities
            device_model: Device model for context
            navigation_tree: Navigation tree data (if available)
        """
        try:
            # Get API key from environment
            api_key = os.getenv('OPENROUTER_API_KEY')
            if not api_key:
                print(f"AI[{self.device_name}]: OpenRouter API key not found in environment")
                return {
                    'success': False,
                    'error': 'AI service not available - no API key'
                }
            
            # Prepare context for AI
            context = {
                "task": task_description,
                "device_model": device_model or "unknown",
                "available_actions": available_actions,  # Use full enhanced action list
                "available_verifications": [verif.get('verification_type', 'unknown') for verif in available_verifications],
                "has_navigation_tree": navigation_tree is not None
            }
            
            # Create MCP-aware prompt for AI
            if device_model == "MCP_Interface":
                prompt = f"""You are an MCP (Model Context Protocol) task automation AI. Generate an execution plan for web interface tasks.

Task: "{task_description}"
Available MCP tools: {context['available_actions']}

MCP Tool Guidelines:
- navigate_to_page: Use for "go to [page]" requests (pages: dashboard, rec, userinterface, runTests)
- execute_navigation_to_node: Use for navigation tree operations
- remote_execute_command: Use for device command execution

CRITICAL: Respond with ONLY valid JSON. No other text.

Required JSON format:
{{
  "analysis": "brief analysis of the task",
  "feasible": true,
  "plan": [
    {{
      "step": 1,
      "type": "action",
      "command": "navigate_to_page",
      "params": {{"page": "rec"}},
      "description": "Navigate to rec page"
    }}
  ]
}}

If not feasible:
{{
  "analysis": "why task cannot be completed",
  "feasible": false,
  "plan": []
}}

JSON ONLY - NO OTHER TEXT"""
            else:
                # Build simple action list - let AI figure out what to use
                action_context = "\n".join([
                    f"- {action.get('command')} (params: {action.get('params', {})}): {action.get('description', 'No description')}"
                    for action in available_actions
                ])
                
                # Add navigation context if tree is available
                navigation_context = ""
                if navigation_tree:
                    navigation_context = """
- execute_navigation (params: {"target_node": "node_name"}): Navigate to a specific node in the navigation tree"""
                
                prompt = f"""You are a device automation AI for {device_model}. Generate an execution plan for this task.

Task: "{task_description}"
Device: {device_model}
Navigation Tree Available: {context['has_navigation_tree']}

Available Actions:
{action_context}{navigation_context}

INSTRUCTIONS:
1. Analyze the task and determine what needs to be accomplished
2. Look at the available actions and choose the most appropriate ones
3. Use ONLY the commands and parameters shown in the available actions
4. Fill in the parameter values based on the task requirements

IMPORTANT EXAMPLES:
- Task: "click home_replay" → Use click_element command with element_id parameter set to "home_replay"
- Task: "goto home_replay" → Use execute_navigation command with target_node parameter set to "home_replay" (if navigation tree available)
- Task: "go to settings" → Use execute_navigation command with target_node parameter set to "settings" (if navigation tree available)
- Task: "press up arrow" → Use press_key command with key parameter set to "UP"  
- Task: "type hello" → Use input_text command with text parameter set to "hello"
- Task: "go home" → Use press_key command with key parameter set to "HOME" (system home)
- Task: "go back" → Use press_key command with key parameter set to "BACK" (system back)

CRITICAL DISTINCTIONS:
- "goto X" or "go to X" = NAVIGATION to location/screen X → use execute_navigation with target_node="X"
- "go home" = SYSTEM HOME → use press_key with key="HOME" 
- "go back" = SYSTEM BACK → use press_key with key="BACK"
- "click X" = INTERACT with element X → use click_element with element_id="X"

The available actions are TEMPLATES - you fill in the parameter values based on what the task asks for.

CRITICAL: Respond with ONLY valid JSON. No other text.

Required JSON format for interaction:
{{
  "analysis": "brief analysis of the task and chosen approach",
  "feasible": true,
  "plan": [
    {{
      "step": 1,
      "type": "action",
      "command": "click_element",
      "params": {{"element_id": "home_replay"}},
      "description": "Click on the home_replay element"
    }}
  ]
}}

Required JSON format for navigation:
{{
  "analysis": "brief analysis of the task and chosen approach",
  "feasible": true,
  "plan": [
    {{
      "step": 1,
      "type": "action",
      "command": "execute_navigation",
      "params": {{"target_node": "home_replay"}},
      "description": "Navigate to the home_replay location"
    }}
  ]
}}

For tasks that cannot be completed with available actions, return:
{{
  "analysis": "explanation of why task cannot be completed",
  "feasible": false,
  "plan": []
}}

If coordinates needed but not provided:
{{
  "analysis": "task requires coordinates",
  "feasible": false,
  "plan": [],
  "needs_input": "Please provide x,y coordinates"
}}

JSON ONLY - NO OTHER TEXT"""
            
            # Call OpenRouter API
            response = requests.post(
                'https://openrouter.ai/api/v1/chat/completions',
                headers={
                    'Authorization': f'Bearer {api_key}',
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://automai.dev',
                    'X-Title': 'AutomAI-VirtualPyTest'
                },
                json={
                    'model': 'moonshotai/kimi-k2:free',
                    'messages': [
                        {
                            'role': 'user',
                            'content': prompt
                        }
                    ],
                    'max_tokens': 1000,
                    'temperature': 0.0
                },
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                content = result['choices'][0]['message']['content']
                
                # Parse JSON response
                try:
                    ai_plan = json.loads(content)
                    print(f"AI[{self.device_name}]: AI plan generated successfully")
                    return {
                        'success': True,
                        'plan': ai_plan
                    }
                    
                except json.JSONDecodeError as e:
                    print(f"AI[{self.device_name}]: Failed to parse AI JSON: {e}")
                    print(f"AI[{self.device_name}]: Raw AI response: {content[:200]}...")
                    return {
                        'success': False,
                        'error': f'AI returned invalid JSON: {str(e)}'
                    }
            else:
                print(f"AI[{self.device_name}]: OpenRouter API error: {response.status_code}")
                return {
                    'success': False,
                    'error': f'AI API error: {response.status_code}'
                }
                
        except Exception as e:
            print(f"AI[{self.device_name}]: AI plan generation error: {e}")
            return {
                'success': False,
                'error': f'AI plan generation failed: {str(e)}'
            }
    
    def _execute(self, plan: Dict[str, Any], navigation_tree: Dict = None, userinterface_name: str = "horizon_android_mobile") -> Dict[str, Any]:
        """
        Execute the AI plan.
        
        Args:
            plan: AI-generated plan with steps
            navigation_tree: Navigation tree data (if available)
            userinterface_name: Name of the userinterface for navigation
        """
        if not plan.get('feasible', True):
            print(f"AI[{self.device_name}]: Plan not feasible, skipping execution")
            return {
                'success': False,
                'error': 'Plan marked as not feasible',
                'executed_steps': 0,
                'total_steps': 0
            }
        
        plan_steps = plan.get('plan', [])
        if not plan_steps:
            print(f"AI[{self.device_name}]: No steps in plan to execute")
            return {
                'success': True,
                'executed_steps': 0,
                'total_steps': 0,
                'message': 'No steps to execute'
            }
        
        print(f"AI[{self.device_name}]: Executing plan with {len(plan_steps)} steps")
        
        # Separate actions and verifications
        action_steps = [step for step in plan_steps if step.get('type') == 'action']
        verification_steps = [step for step in plan_steps if step.get('type') == 'verification']
        
        print(f"AI[{self.device_name}]: Found {len(action_steps)} action steps and {len(verification_steps)} verification steps")
        
        # Execute actions first
        action_result = {'success': True, 'executed_steps': 0, 'total_steps': 0}
        if action_steps:
            action_result = self._execute_actions(action_steps, navigation_tree, userinterface_name)
        
        # Execute verifications second
        verification_result = {'success': True, 'executed_verifications': 0, 'total_verifications': 0}
        if verification_steps:
            verification_result = self._execute_verifications(plan)
        
        # Combine results
        overall_success = action_result.get('success', False) and verification_result.get('success', False)
        total_executed = action_result.get('executed_steps', 0) + verification_result.get('executed_verifications', 0)
        total_steps = action_result.get('total_steps', 0) + verification_result.get('total_verifications', 0)
        
        return {
            'success': overall_success,
            'executed_steps': total_executed,
            'total_steps': total_steps,
            'action_result': action_result,
            'verification_result': verification_result,
            'message': f'Plan execution completed: {total_executed}/{total_steps} steps successful'
        }
    
    def _execute_actions(self, action_steps: List[Dict[str, Any]], navigation_tree: Dict = None, userinterface_name: str = "horizon_android_mobile") -> Dict[str, Any]:
        """
        Execute action steps using direct controller access.
        
        Args:
            action_steps: List of action steps from AI plan
            navigation_tree: Navigation tree data (if available)
            userinterface_name: Name of the userinterface for navigation
        """
        try:
            # Get remote controller for this device
            from src.utils.host_utils import get_controller
            
            remote_controller = get_controller(self.device_name, 'remote')
            if not remote_controller:
                print(f"AI[{self.device_name}]: No remote controller available for action execution")
                return {
                    'success': False,
                    'error': 'No remote controller available for action execution',
                    'executed_steps': 0,
                    'total_steps': len(action_steps)
                }
            
            print(f"AI[{self.device_name}]: Executing {len(action_steps)} actions using {type(remote_controller).__name__}")
            
            executed_steps = 0
            failed_steps = []
            step_results = []
            
            for i, step in enumerate(action_steps):
                step_num = i + 1
                command = step.get('command', '')
                params = step.get('params', {})
                description = step.get('description', f'Action {step_num}')
                
                print(f"AI[{self.device_name}]: Executing action {step_num}: {description}")
                
                try:
                    if command == "execute_navigation":
                        target_node = params.get("target_node")
                        result = self._execute_navigation(target_node, userinterface_name)
                        success = result.get('success', False)
                    else:
                        success = remote_controller.execute_command(command, params)
                    
                    if success:
                        executed_steps += 1
                        step_results.append({
                            'step': step_num,
                            'command': command,
                            'params': params,
                            'success': True,
                            'description': description,
                            'message': 'Action completed successfully'
                        })
                        print(f"AI[{self.device_name}]: Action {step_num} completed successfully")
                        
                        # Add wait time if specified
                        wait_time = params.get('wait_time', 0.5)  # Default 500ms between steps
                        if wait_time > 0:
                            import time
                            time.sleep(wait_time)
                    else:
                        failed_steps.append(step_num)
                        step_results.append({
                            'step': step_num,
                            'command': command,
                            'params': params,
                            'success': False,
                            'error': 'Command execution failed',
                            'description': description
                        })
                        print(f"AI[{self.device_name}]: Action {step_num} failed: {command}")
                        
                except Exception as e:
                    failed_steps.append(step_num)
                    step_results.append({
                        'step': step_num,
                        'command': command,
                        'params': params,
                        'success': False,
                        'error': str(e),
                        'description': description
                    })
                    print(f"AI[{self.device_name}]: Action {step_num} exception: {e}")
            
            # Calculate overall success
            overall_success = len(failed_steps) == 0
            
            print(f"AI[{self.device_name}]: Action execution completed: {executed_steps}/{len(action_steps)} successful")
            
            return {
                'success': overall_success,
                'executed_steps': executed_steps,
                'total_steps': len(action_steps),
                'failed_steps': failed_steps,
                'step_results': step_results,
                'message': f'Actions: {executed_steps}/{len(action_steps)} successful'
            }
            
        except Exception as e:
            error_msg = f'Action execution error: {str(e)}'
            print(f"AI[{self.device_name}]: {error_msg}")
            return {
                'success': False,
                'error': error_msg,
                'executed_steps': 0,
                'total_steps': len(action_steps)
            }
    
    def _execute_verifications(self, plan: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute AI plan verifications using direct controller access (host-side pattern).
        Uses the same pattern as script_utils.py and validation.py.
        
        Args:
            plan: AI-generated plan with verification steps
            
        Returns:
            Dict with verification results
        """
        plan_steps = plan.get('plan', [])
        verification_steps = [step for step in plan_steps if step.get('type') == 'verification']
        
        if not verification_steps:
            print(f"AI[{self.device_name}]: No verification steps in plan")
            return {
                'success': True,
                'executed_verifications': 0,
                'total_verifications': 0,
                'message': 'No verifications to execute'
            }
        
        print(f"AI[{self.device_name}]: Executing {len(verification_steps)} verification steps")
        
        try:
            # Import controller utilities (same as script_utils.py)
            from src.utils.host_utils import get_controller
            
            executed_verifications = 0
            failed_verifications = []
            verification_results = []
            
            for i, step in enumerate(verification_steps):
                step_num = i + 1
                verification_type = step.get('verification_type', 'image')
                command = step.get('command', '')
                params = step.get('params', {})
                description = step.get('description', f'Verification {step_num}')
                
                print(f"AI[{self.device_name}]: Executing verification {step_num}: {description}")
                
                try:
                    # Get the verification controller for this device (same as script_utils.py)
                    verification_controller = get_controller(self.device_name, f'verification_{verification_type}')
                    if not verification_controller:
                        failed_verifications.append(step_num)
                        verification_results.append({
                            'step': step_num,
                            'verification_type': verification_type,
                            'success': False,
                            'error': f'No {verification_type} verification controller found',
                            'description': description
                        })
                        print(f"AI[{self.device_name}]: Verification {step_num} failed: No {verification_type} controller")
                        continue
                    
                    # Build verification object (same format as script_utils.py)
                    verification = {
                        'verification_type': verification_type,
                        'command': command,
                        'params': params
                    }
                    
                    # Use controller-specific abstraction - single line! (same as script_utils.py)
                    result = verification_controller.execute_verification(verification)
                    
                    if result.get('success', False):
                        executed_verifications += 1
                        verification_results.append({
                            'step': step_num,
                            'verification_type': verification_type,
                            'success': True,
                            'description': description,
                            'message': result.get('message', 'Verification completed'),
                            'result_type': 'PASS'
                        })
                        print(f"AI[{self.device_name}]: Verification {step_num} passed: {result.get('message', 'Success')}")
                    else:
                        failed_verifications.append(step_num)
                        verification_results.append({
                            'step': step_num,
                            'verification_type': verification_type,
                            'success': False,
                            'error': result.get('error', 'Verification failed'),
                            'description': description,
                            'result_type': 'FAIL'
                        })
                        print(f"AI[{self.device_name}]: Verification {step_num} failed: {result.get('error', 'Unknown error')}")
                        
                except Exception as e:
                    failed_verifications.append(step_num)
                    verification_results.append({
                        'step': step_num,
                        'verification_type': verification_type,
                        'success': False,
                        'error': str(e),
                        'description': description,
                        'result_type': 'ERROR'
                    })
                    print(f"AI[{self.device_name}]: Verification {step_num} exception: {e}")
            
            # Calculate overall success
            overall_success = len(failed_verifications) == 0
            
            print(f"AI[{self.device_name}]: Verification execution completed: {executed_verifications}/{len(verification_steps)} successful")
            
            return {
                'success': overall_success,
                'executed_verifications': executed_verifications,
                'total_verifications': len(verification_steps),
                'failed_verifications': failed_verifications,
                'verification_results': verification_results,
                'message': f'Verifications: {executed_verifications}/{len(verification_steps)} passed'
            }
            
        except Exception as e:
            error_msg = f'Verification execution error: {str(e)}'
            print(f"AI[{self.device_name}]: {error_msg}")
            return {
                'success': False,
                'error': error_msg,
                'executed_verifications': 0,
                'total_verifications': len(verification_steps)
            }
    
    def _result_summary(self, plan: Dict[str, Any], execute_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate comprehensive result summary for AI task execution.
        Provides detailed analysis of both actions and verifications like useNode.ts.
        
        Args:
            plan: Original AI plan
            execute_result: Combined execution results
            
        Returns:
            Dict with comprehensive summary and recommendations
        """
        try:
            overall_success = execute_result.get('success', False)
            total_executed = execute_result.get('executed_steps', 0)
            total_steps = execute_result.get('total_steps', 0)
            
            # Extract detailed results
            action_result = execute_result.get('action_result', {})
            verification_result = execute_result.get('verification_result', {})
            
            action_executed = action_result.get('executed_steps', 0)
            action_total = action_result.get('total_steps', 0)
            verification_executed = verification_result.get('executed_verifications', 0)
            verification_total = verification_result.get('total_verifications', 0)
            
            # Build comprehensive summary (same pattern as NavigationExecutor)
            summary_parts = []
            
            if action_total > 0:
                action_status = "✅" if action_result.get('success') else "❌"
                summary_parts.append(f"{action_status} Actions: {action_executed}/{action_total} successful")
            
            if verification_total > 0:
                verification_status = "✅" if verification_result.get('success') else "❌"
                summary_parts.append(f"{verification_status} Verifications: {verification_executed}/{verification_total} passed")
            
            if not summary_parts:
                summary_parts.append("ℹ️ No actions or verifications in plan")
            
            # Overall outcome determination
            if overall_success:
                outcome = 'task_completed'
                summary = f"Task completed successfully: {' | '.join(summary_parts)}"
            elif total_executed == 0:
                outcome = 'execution_failed'
                summary = f"Task execution failed to start: {execute_result.get('error', 'Unknown error')}"
            else:
                outcome = 'partially_completed'
                summary = f"Task partially completed: {' | '.join(summary_parts)}"
            
            # Generate recommendations (same pattern as useNode.ts)
            recommendations = []
            
            # Action-specific recommendations
            if action_total > 0 and not action_result.get('success'):
                action_error = action_result.get('error', '')
                if 'not available' in action_error.lower():
                    recommendations.append("Check device connection and controller availability")
                elif 'timeout' in action_error.lower():
                    recommendations.append("Device may be unresponsive - check device status")
                elif 'not found' in action_error.lower():
                    recommendations.append("Verify UI elements exist and device is in correct state")
                else:
                    recommendations.append("Check action parameters and device capabilities")
            
            # Verification-specific recommendations
            if verification_total > 0 and not verification_result.get('success'):
                verification_error = verification_result.get('error', '')
                if 'screenshot' in verification_error.lower():
                    recommendations.append("Check screen capture functionality and device display")
                elif 'image' in verification_error.lower():
                    recommendations.append("Verify reference images and matching thresholds")
                elif 'text' in verification_error.lower():
                    recommendations.append("Check text extraction and search parameters")
                else:
                    recommendations.append("Review verification configuration and device state")
            
            # Success recommendations
            if overall_success:
                recommendations.append("Task completed successfully - AI agent performed as expected")
            elif total_executed > 0:
                recommendations.append("Partial success - review failed steps and retry if needed")
            
            # Plan analysis (unique to AI agent)
            plan_steps = plan.get('plan', [])
            plan_analysis = {
                'total_planned_steps': len(plan_steps),
                'action_steps_planned': len([s for s in plan_steps if s.get('type') == 'action']),
                'verification_steps_planned': len([s for s in plan_steps if s.get('type') == 'verification']),
                'plan_feasibility': plan.get('feasible', True)
            }
            
            print(f"AI[{self.device_name}]: Task summary: {outcome} - {summary}")
            
            return {
                'success': overall_success,
                'outcome': outcome,
                'summary': summary,
                'recommendations': recommendations,
                'execution_details': {
                    'total_executed': total_executed,
                    'total_planned': total_steps,
                    'actions_executed': action_executed,
                    'actions_planned': action_total,
                    'verifications_executed': verification_executed,
                    'verifications_planned': verification_total
                },
                'plan_analysis': plan_analysis,
                'action_result': action_result,
                'verification_result': verification_result
            }
            
        except Exception as e:
            print(f"AI[{self.device_name}]: Error generating result summary: {e}")
            return {
                'success': False,
                'outcome': 'summary_error',
                'summary': f'Error generating task summary: {str(e)}',
                'recommendations': ['Check AI agent configuration and execution logs'],
                'error': str(e)
            }
    
    def _add_to_log(self, log_type: str, action_type: str, action_value: Any, description: str):
        """Add entry to execution log."""
        log_entry = {
            'timestamp': time.strftime('%H:%M:%S'),
            'type': log_type,
            'action_type': action_type,
            'value': action_value,
            'description': description
        }
        self.execution_log.append(log_entry)
        print(f"AI[{self.device_name}]: {description}")
    
    def get_status(self) -> Dict[str, Any]:
        """Get current execution status."""
        return {
            'is_executing': self.is_executing,
            'current_step': self.current_step,
            'execution_log': self.execution_log
        }
    
    def stop_execution(self) -> Dict[str, Any]:
        """Stop current execution."""
        self.is_executing = False
        self.current_step = "Stopped"
        return {'success': True, 'message': 'Execution stopped'} 
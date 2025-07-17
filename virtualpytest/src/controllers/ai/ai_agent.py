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
    
    def __init__(self, **kwargs):
        """Initialize AI agent controller."""
        super().__init__("ai", "AI Agent Controller")
        
        self.is_executing = False
        self.current_step = ""
        self.execution_log = []
        
        print(f"AI[{self.device_name}]: Initialized")
    
    def execute_task(self, task_description: str, available_actions: List[Dict], available_verifications: List[Dict], device_model: str = None) -> Dict[str, Any]:
        """
        Execute a task: generate plan with AI, execute it, and summarize results.
        
        Args:
            task_description: User's task description (e.g., "go to live and zap 10 times")
            available_actions: Real actions from device capabilities
            available_verifications: Real verifications from device capabilities
            device_model: Device model for context
        """
        try:
            print(f"AI[{self.device_name}]: Starting task: {task_description}")
            
            self.is_executing = True
            self.current_step = "Generating AI plan"
            self.execution_log = []
            
            # Step 1: Generate plan using AI
            ai_plan = self._generate_plan(task_description, available_actions, available_verifications, device_model)
            
            if not ai_plan.get('success'):
                return {
                    'success': False,
                    'error': ai_plan.get('error', 'Failed to generate plan'),
                    'execution_log': self.execution_log
                }
            
            self._add_to_log("ai_plan", "plan_generated", ai_plan['plan'], "AI generated execution plan")
            
            # Step 2: Execute the plan (just return True for now)
            self.current_step = "Executing plan"
            execute_result = self._execute(ai_plan['plan'])
            self._add_to_log("execute", "plan_execution", execute_result, f"Plan execution: {execute_result}")
            
            # Step 3: Generate result summary (just return True for now)
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
    
    def _generate_plan(self, task_description: str, available_actions: List[Dict], available_verifications: List[Dict], device_model: str = None) -> Dict[str, Any]:
        """
        Generate execution plan using AI API (like detect_subtitles_ai in video.py).
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
                "available_verifications": [verif.get('verification_type', 'unknown') for verif in available_verifications]
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
                # Enhanced prompt with better action context
                action_context = "\n".join([
                    f"- {action.get('ai_name', action.get('command'))}: {action.get('description', 'No description')}"
                    for action in available_actions[:10]  # Limit to first 10 to avoid token limit
                ])
                
                prompt = f"""You are a device automation AI for {device_model}. Generate an execution plan for this task.

Task: "{task_description}"
Device: {device_model}

Available Actions:
{action_context}

Smart Action Guidelines:
- For "go back/return": use go_back_button (command: press_key, params: {{"key": "BACK"}})
- For "go home": use go_home_button (command: press_key, params: {{"key": "HOME"}})
- For "type/enter/input text": use type_text (command: input_text, params: {{"text": "your text"}})
- For coordinate taps: use tap_screen_coordinates (command: tap_coordinates, params: {{"x": 100, "y": 200}})

Navigation Intelligence:
- When user says "go to [something]" or "navigate to [something]": 
  * If [something] is a UI element (button/tab/menu/section), use click_ui_element (command: click_element, params: {{"element_id": "[something]"}})
  * Examples: "go to replay" → click replay button, "navigate to settings" → click settings, "open menu" → click menu
- When user says "click [something]" or "tap [something]": use click_ui_element
- When user says "select [something]" or "choose [something]": use click_ui_element

Task Analysis Strategy:
1. Identify the main action type (navigation, input, selection, etc.)
2. If it's navigation to a UI element, use click_ui_element with the target name
3. If it's system navigation (back/home), use the specific key commands
4. If it's text input, use type_text
5. Always use the exact target name/text from the user's request as element_id

CRITICAL: Respond with ONLY valid JSON. No other text.

Required JSON format:
{{
  "analysis": "brief analysis of the task and chosen action",
  "feasible": true,
  "plan": [
    {{
      "step": 1,
      "type": "action",
      "command": "click_element",
      "params": {{"element_id": "replay"}},
      "description": "Click on replay button to navigate to replay section"
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
            
            # Call OpenRouter API (same as video.py detect_subtitles_ai)
            response = requests.post(
                'https://openrouter.ai/api/v1/chat/completions',
                headers={
                    'Authorization': f'Bearer {api_key}',
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://automai.dev',
                    'X-Title': 'AutomAI-VirtualPyTest'
                },
                json={
                    'model': 'qwen/qwen-2-vl-7b-instruct',
                    'messages': [
                        {
                            'role': 'user',
                            'content': [
                                {'type': 'text', 'text': prompt}
                            ]
                        }
                    ],
                    'max_tokens': 500,
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
    
    def _execute(self, plan: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the AI plan using proven HTTP API infrastructure.
        Uses the same pattern as useAction.ts and verification batch APIs.
        
        Args:
            plan: AI-generated plan with steps
            
        Returns:
            Dict with execution results and detailed step outcomes
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
        
        # Separate actions and verifications (like useNode.ts pattern)
        action_steps = [step for step in plan_steps if step.get('type') == 'action']
        verification_steps = [step for step in plan_steps if step.get('type') == 'verification']
        
        print(f"AI[{self.device_name}]: Found {len(action_steps)} action steps and {len(verification_steps)} verification steps")
        
        # Execute actions first (same pattern as useNode.ts)
        action_result = {'success': True, 'executed_steps': 0, 'total_steps': 0}
        if action_steps:
            action_result = self._execute_actions(action_steps)
        
        # Execute verifications second (same pattern as useNode.ts)
        verification_result = {'success': True, 'executed_verifications': 0, 'total_verifications': 0}
        if verification_steps:
            verification_result = self._execute_verifications(plan)
        
        # Combine results (same pattern as NavigationExecutor)
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
    
    def _execute_actions(self, action_steps: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Execute action steps using proven HTTP action API.
        
        Args:
            action_steps: List of action steps from AI plan
            
        Returns:
            Dict with action execution results
        """
        # Convert AI plan steps to action format (same as useAction.ts)
        actions = []
        for i, step in enumerate(action_steps):
            action = {
                'id': f'ai_step_{i}',
                'label': step.get('description', f'Step {i+1}'),
                'command': step.get('command'),
                'params': step.get('params', {}),
                'description': step.get('description', f'AI generated step {i+1}'),
                'requiresInput': False
            }
            actions.append(action)
        
        try:
            # Use the same HTTP API pattern as useAction.ts
            import requests
            
            # Prepare request body (same format as useAction.ts)
            request_body = {
                'actions': actions,
                'retry_actions': []  # AI agent doesn't use retry actions yet
            }
            
            print(f"AI[{self.device_name}]: Sending action execution request with {len(actions)} actions")
            
            # Make HTTP request to action execution endpoint (same as useAction.ts)
            response = requests.post(
                'http://localhost:5000/server/action/executeBatch',
                json={
                    'host': {
                        'host_name': 'current_host',  # Will be resolved on server side
                        'host_url': 'current_host'
                    },
                    'device_id': self.device_name,
                    **request_body
                },
                timeout=30
            )
            
            if response.status_code != 200:
                error_msg = f'HTTP {response.status_code}: {response.text}'
                print(f"AI[{self.device_name}]: Action execution failed: {error_msg}")
                return {
                    'success': False,
                    'error': f'Action execution API error: {error_msg}',
                    'executed_steps': 0,
                    'total_steps': len(action_steps)
                }
            
            result = response.json()
            print(f"AI[{self.device_name}]: Action execution result: {result}")
            
            if result.get('success'):
                passed_count = result.get('passed_count', 0)
                total_count = result.get('total_count', len(action_steps))
                
                print(f"AI[{self.device_name}]: Successfully executed {passed_count}/{total_count} actions")
                
                return {
                    'success': True,
                    'executed_steps': passed_count,
                    'total_steps': total_count,
                    'message': f'Successfully executed {passed_count}/{total_count} actions',
                    'results': result.get('results', [])
                }
            else:
                error_msg = result.get('error', 'Unknown execution error')
                print(f"AI[{self.device_name}]: Action execution failed: {error_msg}")
                return {
                    'success': False,
                    'error': f'Action execution failed: {error_msg}',
                    'executed_steps': 0,
                    'total_steps': len(action_steps)
                }
                
        except requests.exceptions.RequestException as e:
            error_msg = f'Network error during action execution: {str(e)}'
            print(f"AI[{self.device_name}]: {error_msg}")
            return {
                'success': False,
                'error': error_msg,
                'executed_steps': 0,
                'total_steps': len(action_steps)
            }
        except Exception as e:
            error_msg = f'Unexpected error during action execution: {str(e)}'
            print(f"AI[{self.device_name}]: {error_msg}")
            return {
                'success': False,
                'error': error_msg,
                'executed_steps': 0,
                'total_steps': len(action_steps)
            }
    
    def _execute_verifications(self, plan: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute AI plan verifications using proven HTTP verification API.
        Uses the same pattern as server_verification_common_routes.py batch execution.
        
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
        
        # Convert AI verification steps to verification format (same as batch verification API)
        verifications = []
        for i, step in enumerate(verification_steps):
            verification = {
                'id': f'ai_verification_{i}',
                'verification_type': step.get('verification_type', 'image'),
                'command': step.get('command', ''),
                'params': step.get('params', {}),
                'description': step.get('description', f'AI generated verification {i+1}')
            }
            verifications.append(verification)
        
        try:
            # Use the same HTTP API pattern as batch verification
            import requests
            
            # Prepare request body (same format as server_verification_common_routes.py)
            request_body = {
                'verifications': verifications,
                'image_source_url': None,  # Let controller capture screenshots automatically
                'model': 'android_mobile'  # Default model
            }
            
            print(f"AI[{self.device_name}]: Sending verification execution request with {len(verifications)} verifications")
            
            # Make HTTP request to batch verification endpoint (same as verification hooks)
            response = requests.post(
                'http://localhost:5000/server/verification/executeBatch',
                json={
                    'host': {
                        'host_name': 'current_host',  # Will be resolved on server side
                        'host_url': 'current_host'
                    },
                    'device_id': self.device_name,
                    **request_body
                },
                timeout=60  # Longer timeout for verifications
            )
            
            if response.status_code != 200:
                error_msg = f'HTTP {response.status_code}: {response.text}'
                print(f"AI[{self.device_name}]: Verification execution failed: {error_msg}")
                return {
                    'success': False,
                    'error': f'Verification execution API error: {error_msg}',
                    'executed_verifications': 0,
                    'total_verifications': len(verification_steps)
                }
            
            result = response.json()
            print(f"AI[{self.device_name}]: Verification execution result: {result}")
            
            if result.get('success'):
                passed_count = result.get('passed_count', 0)
                total_count = result.get('total_count', len(verification_steps))
                
                print(f"AI[{self.device_name}]: Successfully executed {passed_count}/{total_count} verifications")
                
                return {
                    'success': True,
                    'executed_verifications': passed_count,
                    'total_verifications': total_count,
                    'message': f'Successfully executed {passed_count}/{total_count} verifications',
                    'results': result.get('results', [])
                }
            else:
                error_msg = result.get('error', 'Unknown verification error')
                print(f"AI[{self.device_name}]: Verification execution failed: {error_msg}")
                return {
                    'success': False,
                    'error': f'Verification execution failed: {error_msg}',
                    'executed_verifications': 0,
                    'total_verifications': len(verification_steps)
                }
                
        except requests.exceptions.RequestException as e:
            error_msg = f'Network error during verification execution: {str(e)}'
            print(f"AI[{self.device_name}]: {error_msg}")
            return {
                'success': False,
                'error': error_msg,
                'executed_verifications': 0,
                'total_verifications': len(verification_steps)
            }
        except Exception as e:
            error_msg = f'Unexpected error during verification execution: {str(e)}'
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
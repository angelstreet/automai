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
        Execute the AI plan using existing action execution infrastructure.
        Uses the same pattern as useEdge.ts and useNode.ts instead of direct controller access.
        
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
            print(f"AI[{self.device_name}]: No execution steps in plan")
            return {
                'success': True,
                'message': 'No steps to execute',
                'executed_steps': 0,
                'total_steps': 0
            }
        
        try:
            import requests
            from src.utils.host_utils import get_host_manager
            
            # Get host information from host manager
            host_manager = get_host_manager()
            host_info = host_manager.get_current_host()
            
            if not host_info:
                print(f"AI[{self.device_name}]: No host information available")
                return {
                    'success': False,
                    'error': 'No host information available for action execution',
                    'executed_steps': 0,
                    'total_steps': len(plan_steps)
                }
            
            print(f"AI[{self.device_name}]: Executing {len(plan_steps)} steps using action execution API")
            
            executed_steps = 0
            failed_steps = []
            step_results = []
            
            for i, step in enumerate(plan_steps):
                step_num = i + 1
                step_type = step.get('type', 'unknown')
                command = step.get('command', '')
                params = step.get('params', {})
                description = step.get('description', f'Step {step_num}')
                
                print(f"AI[{self.device_name}]: Executing step {step_num}: {description}")
                self.current_step = f"Executing step {step_num}: {description}"
                
                try:
                    if step_type == 'action':
                        # Use the existing action execution endpoint (same as useEdge.ts)
                        action_data = {
                            'command': command,
                            'params': params,
                            'wait_time': params.get('wait_time', 0)
                        }
                        
                        # Execute action using established server route pattern
                        response = requests.post(
                            'http://localhost:5000/server/remote/executeCommand',
                            json={
                                'host': host_info.to_dict(),
                                'device_id': self.device_name,
                                'command': command,
                                'params': params
                            },
                            timeout=30,
                            headers={'Content-Type': 'application/json'}
                        )
                        
                        if response.status_code == 200:
                            result = response.json()
                            success = result.get('success', False)
                            
                            if success:
                                executed_steps += 1
                                step_results.append({
                                    'step': step_num,
                                    'command': command,
                                    'params': params,
                                    'success': True,
                                    'description': description,
                                    'message': result.get('message', 'Action completed')
                                })
                                print(f"AI[{self.device_name}]: Step {step_num} completed successfully")
                                
                                # Add wait time if specified
                                wait_time = params.get('wait_time', 0.5)  # Default 500ms between steps
                                if wait_time > 0:
                                    time.sleep(wait_time)
                                    
                            else:
                                failed_steps.append(step_num)
                                step_results.append({
                                    'step': step_num,
                                    'command': command,
                                    'params': params,
                                    'success': False,
                                    'error': result.get('error', 'Command execution failed'),
                                    'description': description
                                })
                                print(f"AI[{self.device_name}]: Step {step_num} failed: {result.get('error', 'Unknown error')}")
                        else:
                            failed_steps.append(step_num)
                            step_results.append({
                                'step': step_num,
                                'command': command,
                                'params': params,
                                'success': False,
                                'error': f'HTTP {response.status_code}: {response.text}',
                                'description': description
                            })
                            print(f"AI[{self.device_name}]: Step {step_num} failed with HTTP {response.status_code}")
                            
                    elif step_type == 'verification':
                        # For verification steps, just log them for now
                        # Real verification would use the existing verification execution endpoints
                        step_results.append({
                            'step': step_num,
                            'verification_type': step.get('verification_type', 'unknown'),
                            'params': params,
                            'success': True,
                            'note': 'Verification skipped in current implementation',
                            'description': description
                        })
                        print(f"AI[{self.device_name}]: Step {step_num} (verification) logged: {description}")
                        
                    else:
                        # Unknown step type
                        failed_steps.append(step_num)
                        step_results.append({
                            'step': step_num,
                            'type': step_type,
                            'success': False,
                            'error': f'Unknown step type: {step_type}',
                            'description': description
                        })
                        print(f"AI[{self.device_name}]: Step {step_num} failed: unknown type {step_type}")
                        
                except requests.exceptions.RequestException as e:
                    failed_steps.append(step_num)
                    step_results.append({
                        'step': step_num,
                        'command': command,
                        'params': params,
                        'success': False,
                        'error': f'Network error: {str(e)}',
                        'description': description
                    })
                    print(f"AI[{self.device_name}]: Step {step_num} network error: {e}")
                    
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
                    print(f"AI[{self.device_name}]: Step {step_num} exception: {e}")
            
            # Calculate overall success
            total_steps = len(plan_steps)
            success_rate = executed_steps / total_steps if total_steps > 0 else 0
            overall_success = len(failed_steps) == 0
            
            result = {
                'success': overall_success,
                'executed_steps': executed_steps,
                'total_steps': total_steps,
                'failed_steps': failed_steps,
                'success_rate': round(success_rate * 100, 1),
                'step_results': step_results
            }
            
            if overall_success:
                result['message'] = f'All {total_steps} steps executed successfully'
                print(f"AI[{self.device_name}]: Plan execution completed successfully ({executed_steps}/{total_steps} steps)")
            else:
                result['message'] = f'{executed_steps}/{total_steps} steps executed, {len(failed_steps)} failed'
                result['error'] = f'Failed steps: {failed_steps}'
                print(f"AI[{self.device_name}]: Plan execution completed with errors ({executed_steps}/{total_steps} steps, failed: {failed_steps})")
            
            return result
            
        except Exception as e:
            print(f"AI[{self.device_name}]: Plan execution error: {e}")
            return {
                'success': False,
                'error': f'Plan execution failed: {str(e)}',
                'executed_steps': 0,
                'total_steps': len(plan_steps)
            }
    
    def _result_summary(self, plan: Dict[str, Any], execute_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate intelligent result summary based on plan and execution.
        
        Args:
            plan: Original AI plan
            execute_result: Execution results
            
        Returns:
            Dict with summary analysis
        """
        try:
            if not execute_result.get('success', False):
                # Execution failed
                failed_steps = execute_result.get('failed_steps', [])
                total_steps = execute_result.get('total_steps', 0)
                executed_steps = execute_result.get('executed_steps', 0)
                
                summary = {
                    'success': False,
                    'outcome': 'execution_failed',
                    'summary': f'Task execution incomplete: {executed_steps}/{total_steps} steps completed',
                    'recommendations': []
                }
                
                if failed_steps:
                    summary['recommendations'].append(f'Review failed steps: {failed_steps}')
                    summary['recommendations'].append('Check device connectivity and controller status')
                    
                    # Analyze step failures
                    step_results = execute_result.get('step_results', [])
                    failed_commands = [r.get('command', 'unknown') for r in step_results if not r.get('success', True)]
                    if failed_commands:
                        summary['recommendations'].append(f'Failed commands: {", ".join(set(failed_commands))}')
                
                return summary
                
            else:
                # Execution succeeded
                total_steps = execute_result.get('total_steps', 0)
                success_rate = execute_result.get('success_rate', 0)
                
                summary = {
                    'success': True,
                    'outcome': 'task_completed',
                    'summary': f'Task completed successfully: {total_steps} steps executed ({success_rate}% success rate)',
                    'achievements': []
                }
                
                # Analyze what was accomplished
                step_results = execute_result.get('step_results', [])
                executed_commands = [r.get('command', 'unknown') for r in step_results if r.get('success', True)]
                if executed_commands:
                    command_summary = ", ".join(set(executed_commands))
                    summary['achievements'].append(f'Executed commands: {command_summary}')
                
                # Add plan analysis if available
                plan_analysis = plan.get('analysis', '')
                if plan_analysis:
                    summary['achievements'].append(f'Plan analysis: {plan_analysis}')
                
                return summary
                
        except Exception as e:
            print(f"AI[{self.device_name}]: Result summary error: {e}")
            return {
                'success': False,
                'outcome': 'summary_error',
                'summary': f'Could not generate result summary: {str(e)}',
                'recommendations': ['Check AI agent controller logs for details']
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
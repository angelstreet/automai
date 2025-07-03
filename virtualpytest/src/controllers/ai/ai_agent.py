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
                "available_actions": [action.get('command', 'unknown') for action in available_actions],
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
            prompt = f"""You are a test automation AI. Generate an execution plan for this task.

Task: "{task_description}"
Device: {device_model}
Available actions: {context['available_actions']}
Available verifications: {context['available_verifications']}

CRITICAL: Respond with ONLY valid JSON. No other text.

Required JSON format:
{{
  "analysis": "brief analysis of the task",
  "feasible": true,
  "plan": [
    {{
      "step": 1,
      "type": "action",
      "command": "press_key",
      "params": {{"key": "HOME"}},
      "description": "Navigate to home"
    }},
    {{
      "step": 2, 
      "type": "verification",
      "verification_type": "text_verification",
      "params": {{"text": "Home", "timeout": 5.0}},
      "description": "Verify home screen"
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
    
    def _execute(self, plan: Dict[str, Any]) -> bool:
        """
        Execute the AI plan.
        For now, just return True.
        """
        print(f"AI[{self.device_name}]: Executing plan (mock)")
        time.sleep(0.5)  # Small delay to simulate execution
        return True
    
    def _result_summary(self, plan: Dict[str, Any], execute_result: bool) -> bool:
        """
        Generate result summary.
        For now, just return True.
        """
        print(f"AI[{self.device_name}]: Generating result summary (mock)")
        time.sleep(0.2)  # Small delay to simulate summary generation
        return True
    
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
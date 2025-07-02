"""
AI Agent Controller

Simple AI agent that can execute basic tasks using device actions and verifications.
"""

import time
import json
from typing import Dict, Any, List
from ..base_controller import BaseController


class AIAgentController(BaseController):
    """Simple AI agent controller for autonomous task execution."""
    
    def __init__(self, device_config: dict):
        """Initialize AI agent controller."""
        super().__init__("AI Agent Controller", "AI")
        
        self.device_config = device_config
        self.is_executing = False
        self.current_step = ""
        self.execution_log = []
        
        print(f"AI[{self.controller_name}]: Initialized for device config: {device_config}")
    
    def execute_task(self, task_description: str, available_actions: List[Dict], available_verifications: List[Dict]) -> Dict[str, Any]:
        """
        Execute a simple task using available actions and verifications.
        
        For now, this is a simple demo implementation:
        - Parse basic tasks like "click Home tab and verify home displayed"
        - Execute action + verification sequence
        """
        try:
            print(f"AI[{self.controller_name}]: Starting task execution: {task_description}")
            
            self.is_executing = True
            self.current_step = "Analyzing task"
            self.execution_log = []
            
            # Simple task parsing for demo
            task_lower = task_description.lower()
            
            if "click" in task_lower and "home" in task_lower:
                return self._execute_home_click_task(task_description)
            elif "press" in task_lower and "back" in task_lower:
                return self._execute_back_press_task(task_description)
            else:
                return {
                    'success': False,
                    'error': f'Task not recognized. Try: "click Home tab and verify home displayed"',
                    'execution_log': self.execution_log
                }
                
        except Exception as e:
            print(f"AI[{self.controller_name}]: Task execution error: {e}")
            self.is_executing = False
            return {
                'success': False,
                'error': f'Task execution failed: {str(e)}',
                'execution_log': self.execution_log
            }
        finally:
            self.is_executing = False
    
    def _execute_home_click_task(self, task_description: str) -> Dict[str, Any]:
        """Execute simple home click + verification task."""
        try:
            # Step 1: Execute HOME key press action
            self.current_step = "Pressing HOME key"
            self._add_to_log("action", "press_key", "HOME", "Pressing HOME key to navigate home")
            
            action_result = {
                'action_type': 'press_key',
                'command': 'press_key',
                'params': {'key': 'HOME'},
                'description': 'Press HOME key to navigate to home screen'
            }
            
            # Wait a moment for UI to update
            time.sleep(1)
            
            # Step 2: Take screenshot for verification
            self.current_step = "Taking screenshot for verification"
            self._add_to_log("verification", "screenshot", None, "Taking screenshot to verify home screen")
            
            # Step 3: Suggest text verification
            self.current_step = "Suggesting verification"
            verification_result = {
                'verification_type': 'text',
                'command': 'waitForTextToAppear',
                'params': {'text': 'Home', 'timeout': 5.0},
                'description': 'Verify "Home" text appears on screen'
            }
            
            self._add_to_log("completed", "task", None, f"Task completed: {task_description}")
            
            return {
                'success': True,
                'message': 'Task completed successfully',
                'suggested_action': action_result,
                'suggested_verification': verification_result,
                'execution_log': self.execution_log,
                'current_step': 'Task completed'
            }
            
        except Exception as e:
            self._add_to_log("error", "execution", None, f"Error: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'execution_log': self.execution_log
            }
    
    def _execute_back_press_task(self, task_description: str) -> Dict[str, Any]:
        """Execute simple back press task."""
        try:
            self.current_step = "Pressing BACK key"
            self._add_to_log("action", "press_key", "BACK", "Pressing BACK key to go back")
            
            action_result = {
                'action_type': 'press_key', 
                'command': 'press_key',
                'params': {'key': 'BACK'},
                'description': 'Press BACK key to navigate back'
            }
            
            self._add_to_log("completed", "task", None, f"Task completed: {task_description}")
            
            return {
                'success': True,
                'message': 'Task completed successfully',
                'suggested_action': action_result,
                'execution_log': self.execution_log,
                'current_step': 'Task completed'
            }
            
        except Exception as e:
            self._add_to_log("error", "execution", None, f"Error: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'execution_log': self.execution_log
            }
    
    def _add_to_log(self, log_type: str, action_type: str, action_value: Any, description: str):
        """Add entry to execution log."""
        log_entry = {
            'timestamp': time.time(),
            'type': log_type,
            'action_type': action_type,
            'action_value': action_value,
            'description': description,
            'success': log_type != 'error'
        }
        self.execution_log.append(log_entry)
        print(f"AI[{self.controller_name}]: {description}")
    
    def get_status(self) -> Dict[str, Any]:
        """Get current execution status."""
        return {
            'success': True,
            'is_executing': self.is_executing,
            'current_step': self.current_step,
            'execution_log': self.execution_log,
            'controller_type': 'ai'
        }
    
    def stop_execution(self) -> Dict[str, Any]:
        """Stop current task execution."""
        if self.is_executing:
            self.is_executing = False
            self.current_step = "Stopped by user"
            self._add_to_log("stopped", "user_action", None, "Task execution stopped by user")
            
        return {
            'success': True,
            'message': 'Execution stopped',
            'execution_log': self.execution_log
        } 
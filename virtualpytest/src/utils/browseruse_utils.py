"""
Browser-Use Integration Utility

Connects to existing Chrome instance and executes tasks using browser-use AI agent.
Uses OpenRouter API with Qwen model for LLM functionality.
"""

import os
import time
import json
from typing import Dict, Any

# Import browser-use from local lib directory (using project pattern)
try:
    from src.lib.browser_use import Agent
    from langchain_openai import ChatOpenAI
    print(f"[BrowserUseManager] Successfully imported browser-use dependencies")
except ImportError as e:
    print(f"[BrowserUseManager] Warning: Failed to import browser-use dependencies: {e}")
    Agent = None
    ChatOpenAI = None


class BrowserUseManager:
    """Manages browser-use task execution using existing Chrome instance."""
    
    def __init__(self, playwright_utils):
        """
        Initialize with existing PlaywrightUtils instance.
        
        Args:
            playwright_utils: Existing PlaywrightUtils instance with Chrome connection
        """
        self.playwright_utils = playwright_utils
        self.llm = None
        print(f"[BrowserUseManager] Initialized with existing PlaywrightUtils instance")
        
    def _get_llm(self):
        """Get LLM client using OpenRouter (same pattern as ai_agent.py)."""
        if self.llm is None:
            api_key = os.getenv('OPENROUTER_API_KEY')
            if not api_key:
                raise ValueError("OPENROUTER_API_KEY not found in environment variables")
            
            print(f"[BrowserUseManager] Initializing OpenRouter LLM client")
            
            # Use Qwen model compatible with browser-use
            self.llm = ChatOpenAI(
                model='qwen/qwen-2.5-72b-instruct',
                openai_api_key=api_key,
                openai_api_base='https://openrouter.ai/api/v1',
                temperature=0.0,
                max_tokens=2000
            )
            
        return self.llm
    
    async def execute_task(self, task: str) -> Dict[str, Any]:
        """
        Execute browser-use task using existing Chrome instance.
        
        Args:
            task: Task description for the AI agent to execute
            
        Returns:
            Dict with execution results matching other command formats
        """
        if not Agent or not ChatOpenAI:
            return {
                'success': False,
                'error': 'Browser-use dependencies not available',
                'task': task,
                'execution_time': 0
            }
        
        try:
            print(f"[BrowserUseManager] Starting browser-use task: {task}")
            start_time = time.time()
            
            # Connect to existing Chrome instance (inherit context/page state)
            playwright, browser, context, page = await self.playwright_utils.connect_to_chrome()
            
            try:
                print(f"[BrowserUseManager] Connected to existing Chrome instance")
                
                # Get current page info for context
                current_url = page.url
                current_title = await page.title()
                print(f"[BrowserUseManager] Current page: {current_title} ({current_url})")
                
                # Create browser-use Agent with task and LLM
                print(f"[BrowserUseManager] Creating browser-use Agent")
                agent = Agent(
                    task=task,
                    llm=self._get_llm(),
                    browser_context=context,  # Use existing context with cookies and state
                    use_vision=True,
                    save_conversation_path=None,  # Don't save conversations
                    max_actions_per_step=3
                )
                
                print(f"[BrowserUseManager] Executing browser-use task with max 10 steps")
                
                # Execute the task
                result = await agent.run(max_steps=10)
                
                # Get final page state
                final_url = page.url
                final_title = await page.title()
                
                execution_time = int((time.time() - start_time) * 1000)
                
                print(f"[BrowserUseManager] Task completed in {execution_time}ms")
                print(f"[BrowserUseManager] Final page: {final_title} ({final_url})")
                
                # Extract action information from result
                actions_performed = []
                if hasattr(result, 'action_names') and callable(result.action_names):
                    actions_performed = result.action_names()
                elif hasattr(result, 'actions'):
                    actions_performed = [str(action) for action in result.actions[:5]]  # Limit to 5 for brevity
                
                # Build success response
                response = {
                    'success': True,
                    'task': task,
                    'execution_time': execution_time,
                    'actions_performed': actions_performed,
                    'page_info': {
                        'initial_url': current_url,
                        'initial_title': current_title,
                        'final_url': final_url,
                        'final_title': final_title,
                        'navigation_occurred': final_url != current_url
                    },
                    'result_summary': str(result) if result else 'Task completed successfully',
                    'error': ''
                }
                
                return response
                
            finally:
                # Cleanup connection
                await self.playwright_utils.cleanup_connection(playwright, browser)
                print(f"[BrowserUseManager] Cleaned up browser connection")
                
        except Exception as e:
            execution_time = int((time.time() - start_time) * 1000) if 'start_time' in locals() else 0
            error_msg = f"Browser-use task execution error: {str(e)}"
            print(f"[BrowserUseManager] {error_msg}")
            
            return {
                'success': False,
                'error': error_msg,
                'task': task,
                'execution_time': execution_time,
                'actions_performed': [],
                'page_info': {},
                'result_summary': f'Task failed: {str(e)}'
            }
    
    def get_available_models(self) -> list:
        """Get list of available OpenRouter models for browser-use."""
        return [
            'qwen/qwen-2.5-72b-instruct',
            'anthropic/claude-3.5-sonnet',
            'openai/gpt-4o',
            'google/gemini-pro-1.5'
        ]
    
    def validate_environment(self) -> Dict[str, Any]:
        """Validate that all required dependencies and environment variables are available."""
        issues = []
        
        # Check browser-use dependencies
        if not Agent:
            issues.append("browser-use Agent class not available")
        if not ChatOpenAI:
            issues.append("langchain_openai ChatOpenAI class not available")
        
        # Check environment variables
        if not os.getenv('OPENROUTER_API_KEY'):
            issues.append("OPENROUTER_API_KEY environment variable not set")
        
        # Check playwright utils
        if not self.playwright_utils:
            issues.append("PlaywrightUtils instance not provided")
        
        return {
            'valid': len(issues) == 0,
            'issues': issues,
            'available_models': self.get_available_models() if len(issues) == 0 else []
        }


def create_browseruse_manager(playwright_utils) -> BrowserUseManager:
    """
    Factory function to create BrowserUseManager instance.
    
    Args:
        playwright_utils: Existing PlaywrightUtils instance
        
    Returns:
        BrowserUseManager instance
    """
    return BrowserUseManager(playwright_utils) 
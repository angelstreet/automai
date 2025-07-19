"""
Browser-Use Integration Utility

Connects to existing Chrome instance and executes tasks using browser-use AI agent.
Uses OpenRouter API with Qwen model for LLM functionality.
"""

import os
import time
import json
from typing import Dict, Any

# Import browser-use using the same pattern as other lib modules
try:
    import sys
    import os
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'lib')))
    from browser_use import Agent
    # Use browser-use's own ChatOpenAI implementation (latest version)
    from browser_use.llm import ChatOpenAI
    print(f"[BrowserUseManager] Successfully imported browser-use dependencies")
except ImportError as e:
    error_msg = str(e)
    print(f"[BrowserUseManager] Warning: Failed to import browser-use dependencies: {error_msg}")
    
    # Provide helpful guidance based on the specific error
    if 'patchright' in error_msg:
        print(f"[BrowserUseManager] Missing patchright dependency. Browser-use functionality will be disabled.")
        print(f"[BrowserUseManager] Install with: pip install patchright")
    elif 'browser_use' in error_msg:
        print(f"[BrowserUseManager] Browser-use library not found. Install with: pip install browser-use")
    else:
        print(f"[BrowserUseManager] General import error. Check browser-use installation.")
    
    # Set None to indicate import failure
    Agent = None
    ChatOpenAI = None

class BrowserUseManager:
    """Manager for browser-use AI agent execution"""
    
    def __init__(self):
        self.llm = None
        self.page_info = {}
        
    def _get_llm(self):
        """Get LLM client using OpenRouter with browser-use's ChatOpenAI implementation."""
        if self.llm is None:
            api_key = os.getenv('OPENROUTER_API_KEY')
            if not api_key:
                raise ValueError("OPENROUTER_API_KEY not found in environment variables")
            
            print(f"[BrowserUseManager] Initializing OpenRouter LLM client with browser-use's ChatOpenAI")
            
            # Use browser-use's own ChatOpenAI implementation (no max_completion_tokens parameter)
            self.llm = ChatOpenAI(
                model='moonshotai/kimi-k2:free',
                api_key=api_key,
                base_url='https://openrouter.ai/api/v1',
                temperature=0.0
            )
            
            print(f"[BrowserUseManager] LLM client initialized successfully")
        
        return self.llm

    async def execute_task(self, task: str, browser_context=None) -> Dict[str, Any]:
        """Execute a task using browser-use agent"""
        start_time = time.time()
        result = {
            'task': task,
            'success': False,
            'result_summary': '',
            'actions_performed': [],
            'page_info': {},
            'execution_time': 0,
            'error': None
        }
        
        try:
            if not Agent or not ChatOpenAI:
                raise ImportError("Browser-use dependencies not available")
            
            llm = self._get_llm()
            
            print(f"[BrowserUseManager] Creating browser-use agent for task: {task}")
            agent = Agent(task=task, llm=llm)
            
            print(f"[BrowserUseManager] Executing task...")
            agent_result = await agent.run(max_steps=10)
            
            # Extract useful information from agent result
            if hasattr(agent_result, 'success') and agent_result.success:
                result['success'] = True
                result['result_summary'] = f"Task completed successfully"
            else:
                result['result_summary'] = f"Task completed with issues or partial success"
            
            # Try to get actions performed (if available in result)
            if hasattr(agent_result, 'actions'):
                result['actions_performed'] = [str(action) for action in agent_result.actions]
            
            # Try to get page info (if available)
            if hasattr(agent_result, 'page_info'):
                result['page_info'] = agent_result.page_info
            
            print(f"[BrowserUseManager] Task execution completed successfully")
            
        except Exception as e:
            error_msg = str(e)
            result['error'] = f"Browser-use task execution error: {error_msg}"
            result['result_summary'] = f"Task failed: {error_msg}"
            print(f"[BrowserUseManager] Task execution failed: {error_msg}")
        
        finally:
            result['execution_time'] = int((time.time() - start_time) * 1000)
        
        return result

    def validate_setup(self) -> Dict[str, Any]:
        """Validate browser-use setup and dependencies"""
        issues = []
        warnings = []
        
        # Check if browser-use is available
        if not Agent:
            issues.append("browser-use Agent class not available")
        
        # Check if ChatOpenAI is available
        if not ChatOpenAI:
            issues.append("browser-use ChatOpenAI class not available")
        
        # Check environment variables
        if not os.getenv('OPENROUTER_API_KEY'):
            issues.append("OPENROUTER_API_KEY environment variable not set")
        
        return {
            'valid': len(issues) == 0,
            'issues': issues,
            'warnings': warnings,
            'components': {
                'browser_use_agent': Agent is not None,
                'chat_openai': ChatOpenAI is not None,
                'openrouter_key': bool(os.getenv('OPENROUTER_API_KEY'))
            }
        }

# Global instance
browser_use_manager = BrowserUseManager()

def execute_browser_use_task(task: str, browser_context=None) -> Dict[str, Any]:
    """Execute a browser-use task"""
    import asyncio
    return asyncio.run(browser_use_manager.execute_task(task, browser_context))

def validate_browser_use_setup() -> Dict[str, Any]:
    """Validate browser-use setup"""
    return browser_use_manager.validate_setup() 
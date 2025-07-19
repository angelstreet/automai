"""Browser-Use Integration Utility"""

import os
import time
import sys
from typing import Dict, Any

# Add browser_use to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'lib')))

from browser_use import Agent
from browser_use.llm import ChatOpenAI

class BrowserUseManager:
    """Simple browser-use manager with session reuse"""
    
    def __init__(self, playwright_utils):
        self.playwright_utils = playwright_utils
        self.llm = None
        
    def _get_llm(self):
        if self.llm is None:
            self.llm = ChatOpenAI(
                model='o4-mini',  # Best free model for browser automation
                api_key=os.getenv('OPENROUTER_API_KEY'),
                base_url='https://openrouter.ai/api/v1',
                temperature=1.0  # Lower temperature for more consistent behavior
            )
        return self.llm

    async def execute_task(self, task: str) -> Dict[str, Any]:
        start_time = time.time()
        
        # Connect to existing browser
        _, _, _, page = await self.playwright_utils.connect_to_chrome()
        
        # Create and run agent with better configuration
        agent = Agent(
            task=task, 
            llm=self._get_llm(), 
            page=page,
            use_vision=True,
            max_failures=5,  # Allow more failures before stopping
            retry_delay=2    # Shorter retry delay
        )
        await agent.run(max_steps=10)
        
        return {
            'success': True,
            'task': task,
            'execution_time': int((time.time() - start_time) * 1000),
            'result_summary': 'Task completed'
        } 
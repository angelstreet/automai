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
        execution_logs = []
        
        # Capture print output during execution
        original_print = print
        def capture_print(*args, **kwargs):
            # Call original print
            original_print(*args, **kwargs)
            # Capture the output
            if args:
                log_line = ' '.join(str(arg) for arg in args)
                execution_logs.append(log_line)
        
        # Replace print temporarily
        import builtins
        builtins.print = capture_print
        
        try:
            # Connect to existing browser
            _, _, _, page = await self.playwright_utils.connect_to_chrome()
            
            # Get current viewport to preserve it
            current_viewport = await page.evaluate("""() => ({
                width: window.innerWidth,
                height: window.innerHeight
            })""")
            
            # Create browser profile that preserves current viewport
            from browser_use.browser.profile import BrowserProfile
            browser_profile = BrowserProfile(
                viewport=current_viewport,
                no_viewport=False
            )
            
            # Create and run agent with existing page and preserved viewport
            agent = Agent(
                task=task, 
                llm=self._get_llm(), 
                page=page,
                browser_profile=browser_profile,
                use_vision=True,
                max_failures=5,  # Allow more failures before stopping
                retry_delay=2    # Shorter retry delay
            )
            await agent.run(max_steps=10)
            
            return {
                'success': True,
                'task': task,
                'execution_time': int((time.time() - start_time) * 1000),
                'result_summary': 'Task completed',
                'execution_logs': '\n'.join(execution_logs)
            }
            
        finally:
            # Restore original print
            builtins.print = original_print 
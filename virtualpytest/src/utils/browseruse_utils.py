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
        
        # Capture both print and logging output during execution
        import logging
        import io
        
        # Create string buffer to capture logs
        log_capture_string = io.StringIO()
        
        # Set up logging handler to capture browser-use logs
        log_handler = logging.StreamHandler(log_capture_string)
        log_handler.setLevel(logging.INFO)
        
        # Get root logger and browser-use specific loggers
        root_logger = logging.getLogger()
        browser_use_logger = logging.getLogger('browser_use')
        
        # Store original handlers
        original_handlers = root_logger.handlers[:]
        browser_use_original_handlers = browser_use_logger.handlers[:]
        
        # Add our capture handler
        root_logger.addHandler(log_handler)
        browser_use_logger.addHandler(log_handler)
        
        # Also capture print output
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
            
            # Get captured logs
            captured_logs = log_capture_string.getvalue()
            all_logs = execution_logs + [captured_logs] if captured_logs else execution_logs
            
            return {
                'success': True,
                'task': task,
                'execution_time': int((time.time() - start_time) * 1000),
                'result_summary': 'Task completed',
                'execution_logs': '\n'.join(all_logs)
            }
            
        finally:
            # Restore original print
            builtins.print = original_print
            
            # Restore original logging handlers
            root_logger.handlers = original_handlers
            browser_use_logger.handlers = browser_use_original_handlers 
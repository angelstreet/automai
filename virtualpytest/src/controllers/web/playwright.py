"""
Playwright Web Controller Implementation

This controller provides web browser automation functionality using Playwright.
Key features: Chrome remote debugging for thread-safe automation, async Playwright with sync wrappers for browser-use compatibility.
Uses playwright_utils for Chrome management and async execution.
"""

import os
import json
import time
from typing import Dict, Any, Optional
from ..base_controller import WebControllerInterface

# Use absolute import for utils
import sys
src_utils_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'utils')
if src_utils_path not in sys.path:
    sys.path.insert(0, src_utils_path)

from playwright_utils import PlaywrightUtils


class PlaywrightWebController(WebControllerInterface):
    """Playwright web controller using async Playwright with sync wrappers for browser-use compatibility."""
    
    # Class-level Chrome process management
    _chrome_process = None
    _chrome_running = False
    
    def __init__(self, **kwargs):
        """
        Initialize the Playwright web controller.
        """
        super().__init__("Playwright Web", "playwright")
        
        # Initialize utils
        self.utils = PlaywrightUtils()
        
        # Command execution state
        self.last_command_output = ""
        self.last_command_error = ""
        self.current_url = ""
        self.page_title = ""
        
        print(f"[@controller:PlaywrightWeb] Initialized with async Playwright + Chrome remote debugging")
    
    def connect(self) -> bool:
        """Connect to Chrome (launch if needed)."""
        if not self._chrome_running:
            try:
                print(f"Web[{self.web_type.upper()}]: Chrome not running, launching new Chrome process...")
                self.__class__._chrome_process = self.utils.launch_chrome()
                self.__class__._chrome_running = True
                print(f"Web[{self.web_type.upper()}]: Chrome launched with remote debugging successfully")
            except Exception as e:
                print(f"Web[{self.web_type.upper()}]: Failed to launch Chrome: {e}")
                return False
        else:
            print(f"Web[{self.web_type.upper()}]: Chrome process already running (PID: {self._chrome_process.pid if self._chrome_process else 'unknown'})")
        
        self.is_connected = True
        return True
    
    def disconnect(self) -> bool:
        """Disconnect and cleanup Chrome."""
        if self._chrome_running and self._chrome_process:
            try:
                print(f"Web[{self.web_type.upper()}]: Terminating Chrome process")
                self._chrome_process.terminate()
                time.sleep(2)
                if self._chrome_process.poll() is None:
                    self._chrome_process.kill()
                self.__class__._chrome_process = None
                self.__class__._chrome_running = False
            except Exception as e:
                print(f"Web[{self.web_type.upper()}]: Error terminating Chrome: {e}")
                # Force cleanup
                self.utils.kill_chrome()
                self.__class__._chrome_process = None
                self.__class__._chrome_running = False
        
        self.is_connected = False
        return True
    
    def open_browser(self) -> Dict[str, Any]:
        """Open/launch the browser window."""
        async def _async_open_browser():
            try:
                print(f"Web[{self.web_type.upper()}]: Opening browser")
                start_time = time.time()
                
                # First, ensure Chrome is launched (this will launch if not running)
                if not self.is_connected:
                    print(f"Web[{self.web_type.upper()}]: Chrome not connected, launching...")
                    if not self.connect():
                        return {
                            'success': False,
                            'error': 'Failed to launch Chrome',
                            'execution_time': 0,
                            'connected': False
                        }
                else:
                    print(f"Web[{self.web_type.upper()}]: Chrome already connected")
                
                # Test connection to Chrome and ensure page is ready
                playwright, browser, context, page = await self.utils.connect_to_chrome()
                
                # Set viewport for consistent behavior
                await page.set_viewport_size({"width": 1920, "height": 1080})
                
                # Navigate to Google France for a nicer default page
                await page.goto('https://google.fr')
                
                # Update page state
                self.current_url = page.url
                self.page_title = await page.title() or "Google"
                
                # Cleanup connection
                await self.utils.cleanup_connection(playwright, browser)
                
                execution_time = int((time.time() - start_time) * 1000)
                
                print(f"Web[{self.web_type.upper()}]: Browser opened and ready")
                return {
                    'success': True,
                    'error': '',
                    'execution_time': execution_time,
                    'connected': True
                }
                
            except Exception as e:
                error_msg = f"Browser open error: {e}"
                print(f"Web[{self.web_type.upper()}]: {error_msg}")
                return {
                    'success': False,
                    'error': error_msg,
                    'execution_time': 0,
                    'connected': False
                }
        
        return self.utils.run_async(_async_open_browser())
    
    def close_browser(self) -> Dict[str, Any]:
        """Close browser (disconnect Chrome)."""
        try:
            print(f"Web[{self.web_type.upper()}]: Closing browser")
            start_time = time.time()
            
            self.disconnect()
            
            # Clear page state
            self.current_url = ""
            self.page_title = ""
            
            execution_time = int((time.time() - start_time) * 1000)
            
            print(f"Web[{self.web_type.upper()}]: Browser closed")
            return {
                'success': True,
                'error': '',
                'execution_time': execution_time,
                'connected': False
            }
            
        except Exception as e:
            error_msg = f"Browser close error: {e}"
            print(f"Web[{self.web_type.upper()}]: {error_msg}")
            return {
                'success': False,
                'error': error_msg,
                'execution_time': 0,
                'connected': False
            }
    
    def navigate_to_url(self, url: str, timeout: int = 30000) -> Dict[str, Any]:
        """Navigate to a URL using async CDP connection."""
        async def _async_navigate_to_url():
            try:
                print(f"Web[{self.web_type.upper()}]: Navigating to: {url}")
                start_time = time.time()
                
                # Connect to Chrome via CDP
                playwright, browser, context, page = await self.utils.connect_to_chrome()
                
                # Navigate to URL
                await page.goto(url, timeout=timeout)
                
                # Get page info
                self.current_url = page.url
                self.page_title = await page.title()
                
                # Cleanup connection
                await self.utils.cleanup_connection(playwright, browser)
                
                execution_time = int((time.time() - start_time) * 1000)
                
                result = {
                    'success': True,
                    'url': self.current_url,
                    'title': self.page_title,
                    'execution_time': execution_time,
                    'error': ''
                }
                
                print(f"Web[{self.web_type.upper()}]: Navigation successful - {self.page_title}")
                return result
                
            except Exception as e:
                error_msg = f"Navigation error: {e}"
                print(f"Web[{self.web_type.upper()}]: {error_msg}")
                return {
                    'success': False,
                    'error': error_msg,
                    'url': self.current_url,
                    'title': self.page_title,
                    'execution_time': 0
                }
        
        if not self.is_connected:
            return {
                'success': False,
                'error': 'Not connected to browser',
                'url': '',
                'title': ''
            }
        
        return self.utils.run_async(_async_navigate_to_url())
    
    def click_element(self, selector: str, timeout: int = 30000) -> Dict[str, Any]:
        """Click an element by selector using async CDP connection."""
        async def _async_click_element():
            try:
                print(f"Web[{self.web_type.upper()}]: Clicking element: {selector}")
                start_time = time.time()
                
                # Connect to Chrome via CDP
                playwright, browser, context, page = await self.utils.connect_to_chrome()
                
                # Click element
                await page.click(selector, timeout=timeout)
                
                # Cleanup connection
                await self.utils.cleanup_connection(playwright, browser)
                
                execution_time = int((time.time() - start_time) * 1000)
                
                result = {
                    'success': True,
                    'error': '',
                    'execution_time': execution_time
                }
                
                print(f"Web[{self.web_type.upper()}]: Click successful")
                return result
                
            except Exception as e:
                error_msg = f"Click error: {e}"
                print(f"Web[{self.web_type.upper()}]: {error_msg}")
                return {
                    'success': False,
                    'error': error_msg,
                    'execution_time': 0
                }
        
        if not self.is_connected:
            return {
                'success': False,
                'error': 'Not connected to browser',
                'execution_time': 0
            }
        
        return self.utils.run_async(_async_click_element())
    
    def input_text(self, selector: str, text: str, timeout: int = 30000) -> Dict[str, Any]:
        """Input text into an element using async CDP connection."""
        async def _async_input_text():
            try:
                print(f"Web[{self.web_type.upper()}]: Inputting text to: {selector}")
                start_time = time.time()
                
                # Connect to Chrome via CDP
                playwright, browser, context, page = await self.utils.connect_to_chrome()
                
                # Input text
                await page.fill(selector, text, timeout=timeout)
                
                # Cleanup connection
                await self.utils.cleanup_connection(playwright, browser)
                
                execution_time = int((time.time() - start_time) * 1000)
                
                result = {
                    'success': True,
                    'error': '',
                    'execution_time': execution_time
                }
                
                print(f"Web[{self.web_type.upper()}]: Text input successful")
                return result
                
            except Exception as e:
                error_msg = f"Input error: {e}"
                print(f"Web[{self.web_type.upper()}]: {error_msg}")
                return {
                    'success': False,
                    'error': error_msg,
                    'execution_time': 0
                }
        
        if not self.is_connected:
            return {
                'success': False,
                'error': 'Not connected to browser',
                'execution_time': 0
            }
        
        return self.utils.run_async(_async_input_text())
    
    def tap_x_y(self, x: int, y: int) -> Dict[str, Any]:
        """Tap/click at specific coordinates using async CDP connection."""
        async def _async_tap_x_y():
            try:
                print(f"Web[{self.web_type.upper()}]: Tapping at coordinates: ({x}, {y})")
                start_time = time.time()
                
                # Connect to Chrome via CDP
                playwright, browser, context, page = await self.utils.connect_to_chrome()
                
                # Click at coordinates
                await page.mouse.click(x, y)
                
                # Cleanup connection
                await self.utils.cleanup_connection(playwright, browser)
                
                execution_time = int((time.time() - start_time) * 1000)
                
                result = {
                    'success': True,
                    'error': '',
                    'execution_time': execution_time
                }
                
                print(f"Web[{self.web_type.upper()}]: Tap successful")
                return result
                
            except Exception as e:
                error_msg = f"Tap error: {e}"
                print(f"Web[{self.web_type.upper()}]: {error_msg}")
                return {
                    'success': False,
                    'error': error_msg,
                    'execution_time': 0
                }
        
        if not self.is_connected:
            return {
                'success': False,
                'error': 'Not connected to browser',
                'execution_time': 0
            }
        
        return self.utils.run_async(_async_tap_x_y())
    
    def execute_javascript(self, script: str) -> Dict[str, Any]:
        """Execute JavaScript code in the page using async CDP connection."""
        async def _async_execute_javascript():
            try:
                print(f"Web[{self.web_type.upper()}]: Executing JavaScript")
                start_time = time.time()
                
                # Connect to Chrome via CDP
                playwright, browser, context, page = await self.utils.connect_to_chrome()
                
                # Execute JavaScript
                result = await page.evaluate(script)
                
                # Cleanup connection
                await self.utils.cleanup_connection(playwright, browser)
                
                execution_time = int((time.time() - start_time) * 1000)
                
                return {
                    'success': True,
                    'result': result,
                    'error': '',
                    'execution_time': execution_time
                }
                
            except Exception as e:
                error_msg = f"JavaScript execution error: {e}"
                print(f"Web[{self.web_type.upper()}]: {error_msg}")
                return {
                    'success': False,
                    'result': None,
                    'error': error_msg,
                    'execution_time': 0
                }
        
        if not self.is_connected:
            return {
                'success': False,
                'error': 'Not connected to browser',
                'result': None,
                'execution_time': 0
            }
        
        return self.utils.run_async(_async_execute_javascript())
    
    def get_page_info(self) -> Dict[str, Any]:
        """Get current page information using async CDP connection."""
        async def _async_get_page_info():
            try:
                print(f"Web[{self.web_type.upper()}]: Getting page info")
                start_time = time.time()
                
                # Connect to Chrome via CDP
                playwright, browser, context, page = await self.utils.connect_to_chrome()
                
                # Get page info
                self.current_url = page.url
                self.page_title = await page.title()
                
                # Cleanup connection
                await self.utils.cleanup_connection(playwright, browser)
                
                execution_time = int((time.time() - start_time) * 1000)
                
                result = {
                    'success': True,
                    'url': self.current_url,
                    'title': self.page_title,
                    'error': '',
                    'execution_time': execution_time
                }
                
                print(f"Web[{self.web_type.upper()}]: Page info retrieved - {self.page_title}")
                return result
                
            except Exception as e:
                error_msg = f"Get page info error: {e}"
                print(f"Web[{self.web_type.upper()}]: {error_msg}")
                return {
                    'success': False,
                    'error': error_msg,
                    'url': '',
                    'title': '',
                    'execution_time': 0
                }
        
        if not self.is_connected:
            return {
                'success': False,
                'error': 'Not connected to browser',
                'url': '',
                'title': '',
                'execution_time': 0
            }
        
        return self.utils.run_async(_async_get_page_info())
    
    def get_status(self) -> Dict[str, Any]:
        """Get controller status."""
        try:
            if self.is_connected and self._chrome_running:
                return {
                    'success': True,
                    'current_url': self.current_url,
                    'page_title': self.page_title,
                    'connected': True,
                    'chrome_running': True
                }
            else:
                return {
                    'success': False,
                    'error': 'Chrome not running or not connected',
                    'connected': False,
                    'chrome_running': self._chrome_running
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Failed to check status: {str(e)}',
                'connected': False,
                'chrome_running': False
            }
    
    def execute_command(self, command: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Execute web automation command with JSON parameters.
        
        Args:
            command: Command to execute
            params: JSON parameters for the command
            
        Returns:
            Dict: Command execution result
        """
        if params is None:
            params = {}
        
        print(f"Web[{self.web_type.upper()}]: Executing command '{command}' with params: {params}")
        
        if command == 'navigate_to_url':
            url = params.get('url')
            timeout = params.get('timeout', 30000)
            
            if not url:
                return {
                    'success': False,
                    'error': 'URL parameter is required',
                    'execution_time': 0
                }
                
            return self.navigate_to_url(url, timeout=timeout)
        
        elif command == 'click_element':
            selector = params.get('selector')
            timeout = params.get('timeout', 30000)
            
            if not selector:
                return {
                    'success': False,
                    'error': 'Selector parameter is required',
                    'execution_time': 0
                }
                
            return self.click_element(selector, timeout=timeout)
        
        elif command == 'input_text':
            selector = params.get('selector')
            text = params.get('text', '')
            timeout = params.get('timeout', 30000)
            
            if not selector:
                return {
                    'success': False,
                    'error': 'Selector parameter is required',
                    'execution_time': 0
                }
                
            return self.input_text(selector, text, timeout=timeout)
        
        elif command == 'tap_x_y':
            x = params.get('x')
            y = params.get('y')
            
            if x is None or y is None:
                return {
                    'success': False,
                    'error': 'X and Y coordinates are required',
                    'execution_time': 0
                }
                
            return self.tap_x_y(x, y)
        
        elif command == 'execute_javascript':
            script = params.get('script')
            
            if not script:
                return {
                    'success': False,
                    'error': 'Script parameter is required',
                    'execution_time': 0
                }
                
            return self.execute_javascript(script)
        
        elif command == 'get_page_info':
            return self.get_page_info()
        
        elif command == 'open_browser':
            return self.open_browser()
        
        elif command == 'close_browser':
            return self.close_browser()
        
        else:
            print(f"Web[{self.web_type.upper()}]: Unknown command: {command}")
            return {
                'success': False,
                'error': f'Unknown command: {command}',
                'execution_time': 0
            }
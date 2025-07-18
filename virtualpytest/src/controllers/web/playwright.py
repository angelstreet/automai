"""
Playwright Web Controller Implementation

This controller provides web browser automation functionality using Playwright.
Key features: browser automation via Playwright, non-headless execution for VNC visibility.
Based on the BashDesktopController pattern but for web automation.
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


class PlaywrightWebController(WebControllerInterface):
    """Playwright web controller for browser automation."""
    
    def __init__(self, browser_path: str = "", host_ip: str = "127.0.0.1", **kwargs):
        """
        Initialize the Playwright web controller.
        
        Args:
            browser_path: Path to browser executable (from HOST_WEB_BROWSER_PATH)
            host_ip: Host machine IP address
        """
        super().__init__("Playwright Web", "playwright")
        
        # Environment check - only create if browser path exists
        if not browser_path:
            raise ValueError("HOST_WEB_BROWSER_PATH environment variable is required for PlaywrightWebController")
            
        if not os.path.exists(browser_path):
            raise ValueError(f"Browser path does not exist: {browser_path}")
        
        self.browser_path = browser_path
        self.host_ip = host_ip
        self.browser = None
        self.page = None
        self.playwright = None
        
        # Command execution state
        self.last_command_output = ""
        self.last_command_error = ""
        self.current_url = ""
        self.page_title = ""
        
        print(f"[@controller:PlaywrightWeb] Initialized with browser: {browser_path}")
        self.connect()
    
    def connect(self) -> bool:
        """Connect and initialize Playwright browser."""
        try:
            print(f"Web[{self.web_type.upper()}]: Initializing Playwright browser")
            
            # Import Playwright (assume it's installed)
            try:
                from playwright.sync_api import sync_playwright
            except ImportError:
                print(f"Web[{self.web_type.upper()}]: ERROR - Playwright not installed")
                return False
            
            # Start Playwright
            self.playwright = sync_playwright().start()
            
            # Launch browser (non-headless for VNC visibility)
            self.browser = self.playwright.chromium.launch(
                headless=False,
                executable_path=self.browser_path
            )
            
            # Create new page
            self.page = self.browser.new_page()
            
            # Set viewport for consistent behavior
            self.page.set_viewport_size({"width": 1920, "height": 1080})
            
            self.is_connected = True
            print(f"Web[{self.web_type.upper()}]: Browser launched successfully")
            return True
            
        except Exception as e:
            print(f"Web[{self.web_type.upper()}]: Connection error: {e}")
            self.disconnect()
            return False
    
    def disconnect(self) -> bool:
        """Disconnect and cleanup Playwright resources."""
        try:
            print(f"Web[{self.web_type.upper()}]: Disconnecting from browser")
            
            if self.page:
                self.page.close()
                self.page = None
                
            if self.browser:
                self.browser.close()
                self.browser = None
                
            if self.playwright:
                self.playwright.stop()
                self.playwright = None
            
            self.is_connected = False
            print(f"Web[{self.web_type.upper()}]: Disconnected successfully")
            return True
            
        except Exception as e:
            print(f"Web[{self.web_type.upper()}]: Disconnect error: {e}")
            self.is_connected = False
            return False
    
    def navigate_to_url(self, url: str, timeout: int = 30000) -> Dict[str, Any]:
        """
        Navigate to a URL.
        
        Args:
            url: URL to navigate to
            timeout: Navigation timeout in milliseconds
            
        Returns:
            Dict with success, url, title, and error
        """
        if not self.is_connected or not self.page:
            return {
                'success': False,
                'error': 'Not connected to browser',
                'url': '',
                'title': ''
            }
        
        try:
            print(f"Web[{self.web_type.upper()}]: Navigating to: {url}")
            
            start_time = time.time()
            self.page.goto(url, timeout=timeout)
            execution_time = int((time.time() - start_time) * 1000)
            
            # Update current state
            self.current_url = self.page.url
            self.page_title = self.page.title()
            
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
    
    def click_element(self, selector: str, timeout: int = 30000) -> Dict[str, Any]:
        """
        Click an element by selector.
        
        Args:
            selector: CSS selector for the element
            timeout: Wait timeout in milliseconds
            
        Returns:
            Dict with success, error, and execution_time
        """
        if not self.is_connected or not self.page:
            return {
                'success': False,
                'error': 'Not connected to browser',
                'execution_time': 0
            }
        
        try:
            print(f"Web[{self.web_type.upper()}]: Clicking element: {selector}")
            
            start_time = time.time()
            self.page.click(selector, timeout=timeout)
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
    
    def input_text(self, selector: str, text: str, timeout: int = 30000) -> Dict[str, Any]:
        """
        Input text into an element.
        
        Args:
            selector: CSS selector for the input element
            text: Text to input
            timeout: Wait timeout in milliseconds
            
        Returns:
            Dict with success, error, and execution_time
        """
        if not self.is_connected or not self.page:
            return {
                'success': False,
                'error': 'Not connected to browser',
                'execution_time': 0
            }
        
        try:
            print(f"Web[{self.web_type.upper()}]: Inputting text to: {selector}")
            
            start_time = time.time()
            self.page.fill(selector, text, timeout=timeout)
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
    
    def tap_x_y(self, x: int, y: int) -> Dict[str, Any]:
        """
        Tap/click at specific coordinates.
        
        Args:
            x: X coordinate
            y: Y coordinate
            
        Returns:
            Dict with success, error, and execution_time
        """
        if not self.is_connected or not self.page:
            return {
                'success': False,
                'error': 'Not connected to browser',
                'execution_time': 0
            }
        
        try:
            print(f"Web[{self.web_type.upper()}]: Tapping at coordinates: ({x}, {y})")
            
            start_time = time.time()
            self.page.mouse.click(x, y)
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
    
    def execute_javascript(self, script: str) -> Dict[str, Any]:
        """
        Execute JavaScript code in the page.
        
        Args:
            script: JavaScript code to execute
            
        Returns:
            Dict with success, result, error, and execution_time
        """
        if not self.is_connected or not self.page:
            return {
                'success': False,
                'error': 'Not connected to browser',
                'result': None,
                'execution_time': 0
            }
        
        try:
            print(f"Web[{self.web_type.upper()}]: Executing JavaScript")
            
            start_time = time.time()
            result = self.page.evaluate(script)
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
    
    def get_page_info(self) -> Dict[str, Any]:
        """
        Get current page information.
        
        Returns:
            Dict with success, url, title, error, and execution_time
        """
        if not self.is_connected or not self.page:
            return {
                'success': False,
                'error': 'Not connected to browser',
                'url': '',
                'title': '',
                'execution_time': 0
            }
        
        try:
            print(f"Web[{self.web_type.upper()}]: Getting page info")
            
            start_time = time.time()
            self.current_url = self.page.url
            self.page_title = self.page.title()
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
    
    def get_status(self) -> Dict[str, Any]:
        """Get controller status."""
        try:
            if self.is_connected and self.page:
                return {
                    'success': True,
                    'browser_path': self.browser_path,
                    'current_url': self.current_url,
                    'page_title': self.page_title,
                    'connected': True
                }
            else:
                return {
                    'success': False,
                    'error': 'Browser not connected',
                    'connected': False
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Failed to check status: {str(e)}',
                'connected': False
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
        
        else:
            print(f"Web[{self.web_type.upper()}]: Unknown command: {command}")
            return {
                'success': False,
                'error': f'Unknown command: {command}',
                'execution_time': 0
            } 
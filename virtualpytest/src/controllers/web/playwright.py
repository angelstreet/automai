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
        
        # Initialize utils with auto-cookie acceptance enabled and dynamic sizing
        self.utils = PlaywrightUtils(auto_accept_cookies=True, window_size="auto")
        
        # Command execution state
        self.last_command_output = ""
        self.last_command_error = ""
        self.current_url = ""
        self.page_title = ""
        
        print(f"[@controller:PlaywrightWeb] Initialized with async Playwright + Chrome remote debugging + auto-cookie acceptance + dynamic viewport sizing")
    
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
                
                # Test connection to Chrome and ensure page is ready with proper scaling
                playwright, browser, context, page = await self.utils.connect_to_chrome(target_url='https://google.fr')
                
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
    
    def navigate_to_url(self, url: str, timeout: int = 30000, follow_redirects: bool = True) -> Dict[str, Any]:
        """Navigate to a URL using async CDP connection."""
        async def _async_navigate_to_url():
            try:
                # Normalize URL to add protocol if missing
                normalized_url = self.utils.normalize_url(url)
                print(f"Web[{self.web_type.upper()}]: Navigating to {url} (normalized: {normalized_url})")
                start_time = time.time()
                
                # Update viewport for embedded context
                self.utils.update_viewport_for_context("embedded")
                
                # Connect to Chrome via CDP with auto-cookie injection for the target URL
                playwright, browser, context, page = await self.utils.connect_to_chrome(target_url=normalized_url)
                
                # Navigate to URL with optional redirect control
                if follow_redirects:
                    # Default behavior - follow redirects
                    await page.goto(normalized_url, timeout=timeout, wait_until='load')
                else:
                    # Disable redirects by intercepting navigation
                    print(f"Web[{self.web_type.upper()}]: Navigation with redirects disabled")
                    
                    # Set up request interception to block redirects
                    await page.route('**/*', lambda route: (
                        route.fulfill(status=200, body=f'<html><body><h1>Redirect blocked</h1><p>Original URL: {normalized_url}</p><p>This page would normally redirect to another domain.</p></body></html>')
                        if route.request.is_navigation_request() and route.request.url != normalized_url
                        else route.continue_()
                    ))
                    
                    await page.goto(normalized_url, timeout=timeout, wait_until='load')
                
                # Get page info after navigation
                await page.wait_for_load_state('networkidle', timeout=10000)
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
                    'error': '',
                    'normalized_url': normalized_url,
                    'redirected': self.current_url != normalized_url,
                    'follow_redirects': follow_redirects
                }
                
                if result['redirected']:
                    print(f"Web[{self.web_type.upper()}]: Navigation completed with redirect: {normalized_url} -> {self.current_url}")
                else:
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
                    'execution_time': 0,
                    'original_url': url,
                    'normalized_url': normalized_url if 'normalized_url' in locals() else url,
                    'follow_redirects': follow_redirects
                }
        
        if not self.is_connected:
            return {
                'success': False,
                'error': 'Not connected to browser',
                'url': '',
                'title': ''
            }
        
        return self.utils.run_async(_async_navigate_to_url())
    
    def click_element(self, selector: str) -> Dict[str, Any]:
        """Click an element by selector using async CDP connection.
        
        Args:
            selector: CSS selector, or text content to search for
        """
        async def _async_click_element():
            try:
                print(f"Web[{self.web_type.upper()}]: Clicking element: {selector}")
                start_time = time.time()
                
                # Update viewport for embedded context
                self.utils.update_viewport_for_context("embedded")
                
                # Connect to Chrome via CDP
                playwright, browser, context, page = await self.utils.connect_to_chrome()
                
                # Use fixed 1 second timeout
                timeout = 1000
                
                # Detect if selector is a CSS selector or text content
                is_css_selector = (
                    selector.startswith('#') or  # ID selector
                    selector.startswith('.') or  # Class selector
                    selector.startswith('[') or  # Attribute selector
                    '>' in selector or          # Child combinator
                    ' ' in selector and ('.' in selector or '#' in selector) or  # Complex selector
                    selector.lower() in ['button', 'input', 'a', 'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']  # Element tags
                )
                
                click_successful = False
                final_selector = selector
                
                if is_css_selector:
                    # Try direct CSS selector click
                    try:
                        await page.click(selector, timeout=timeout)
                        click_successful = True
                        print(f"Web[{self.web_type.upper()}]: Direct CSS selector click successful")
                    except Exception as e:
                        print(f"Web[{self.web_type.upper()}]: Direct CSS selector failed: {e}")
                else:
                    # Text-based search - try multiple strategies
                    print(f"Web[{self.web_type.upper()}]: Text-based search for: {selector}")
                    
                    # Strategy 1: Try exact text match in common clickable elements
                    text_selectors = [
                        f"button:has-text('{selector}')",
                        f"a:has-text('{selector}')",
                        f"[role='button']:has-text('{selector}')",
                        f"input[value='{selector}']",
                        f"*:text-is('{selector}')",
                        f"*:text('{selector}')"
                    ]
                    
                    for text_selector in text_selectors:
                        try:
                            await page.click(text_selector, timeout=timeout)
                            click_successful = True
                            final_selector = text_selector
                            print(f"Web[{self.web_type.upper()}]: Text selector click successful: {text_selector}")
                            break
                        except Exception:
                            continue
                    
                    # Strategy 2: Use JavaScript to find and click element with text content
                    if not click_successful:
                        try:
                            js_click_result = await page.evaluate(f"""
                                () => {{
                                    const text = '{selector}';
                                    
                                    // Find elements containing the text
                                    const elements = Array.from(document.querySelectorAll('*')).filter(el => {{
                                        const textContent = el.textContent?.trim();
                                        const innerText = el.innerText?.trim();
                                        return (textContent === text || innerText === text || 
                                               textContent?.includes(text) || innerText?.includes(text)) &&
                                               el.offsetWidth > 0 && el.offsetHeight > 0;  // Visible elements only
                                    }});
                                    
                                    // Prioritize clickable elements
                                    const clickableElements = elements.filter(el => {{
                                        const tag = el.tagName.toLowerCase();
                                        const role = el.getAttribute('role');
                                        const onclick = el.onclick;
                                        return tag === 'button' || tag === 'a' || role === 'button' || 
                                               onclick || el.style.cursor === 'pointer';
                                    }});
                                    
                                    const targetElement = clickableElements[0] || elements[0];
                                    
                                    if (targetElement) {{
                                        targetElement.click();
                                        return {{
                                            success: true,
                                            tagName: targetElement.tagName,
                                            textContent: targetElement.textContent?.trim()?.substring(0, 50),
                                            selector: targetElement.id ? `#${{targetElement.id}}` : 
                                                     targetElement.className ? `.${{targetElement.className.split(' ')[0]}}` :
                                                     targetElement.tagName.toLowerCase()
                                        }};
                                    }}
                                    
                                    return {{ success: false, error: 'Element not found' }};
                                }}
                            """)
                            
                            if js_click_result.get('success'):
                                click_successful = True
                                final_selector = f"JS: {js_click_result.get('selector', selector)}"
                                print(f"Web[{self.web_type.upper()}]: JavaScript click successful on {js_click_result.get('tagName')}")
                            else:
                                print(f"Web[{self.web_type.upper()}]: JavaScript click failed: {js_click_result.get('error')}")
                        
                        except Exception as e:
                            print(f"Web[{self.web_type.upper()}]: JavaScript click error: {e}")
                
                # Cleanup connection
                await self.utils.cleanup_connection(playwright, browser)
                
                execution_time = int((time.time() - start_time) * 1000)
                
                if click_successful:
                    result = {
                        'success': True,
                        'error': '',
                        'execution_time': execution_time,
                        'selector_used': final_selector,
                        'search_type': 'css' if is_css_selector else 'text'
                    }
                    print(f"Web[{self.web_type.upper()}]: Click successful using {final_selector}")
                    return result
                else:
                    error_msg = f"Could not find clickable element with selector/text: {selector}"
                    print(f"Web[{self.web_type.upper()}]: {error_msg}")
                    return {
                        'success': False,
                        'error': error_msg,
                        'execution_time': execution_time,
                        'selector_attempted': selector,
                        'search_type': 'css' if is_css_selector else 'text'
                    }
                
            except Exception as e:
                error_msg = f"Click error: {e}"
                print(f"Web[{self.web_type.upper()}]: {error_msg}")
                return {
                    'success': False,
                    'error': error_msg,
                    'execution_time': 0,
                    'selector_attempted': selector
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
            follow_redirects = params.get('follow_redirects', True)
            
            if not url:
                return {
                    'success': False,
                    'error': 'URL parameter is required',
                    'execution_time': 0
                }
                
            return self.navigate_to_url(url, timeout=timeout, follow_redirects=follow_redirects)
        
        elif command == 'click_element':
            selector = params.get('selector')
            
            if not selector:
                return {
                    'success': False,
                    'error': 'Selector parameter is required',
                    'execution_time': 0
                }
                
            return self.click_element(selector)
        
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
        
        elif command == 'dump_elements':
            element_types = params.get('element_types', 'all')
            include_hidden = params.get('include_hidden', False)
            return self.dump_elements(element_types=element_types, include_hidden=include_hidden)
        
        else:
            print(f"Web[{self.web_type.upper()}]: Unknown command: {command}")
            return {
                'success': False,
                'error': f'Unknown command: {command}',
                'execution_time': 0
            }
    
    def dump_elements(self, element_types: str = "all", include_hidden: bool = False) -> Dict[str, Any]:
        """
        Dump all visible elements from the page for debugging and inspection.
        
        Args:
            element_types: Types of elements to include ('all', 'interactive', 'text', 'links')
            include_hidden: Whether to include hidden elements
        """
        async def _async_dump_elements():
            try:
                print(f"Web[{self.web_type.upper()}]: Dumping elements (type: {element_types}, include_hidden: {include_hidden})")
                start_time = time.time()
                
                # Update viewport for embedded context
                self.utils.update_viewport_for_context("embedded")
                
                # Connect to Chrome via CDP
                playwright, browser, context, page = await self.utils.connect_to_chrome()
                
                # JavaScript code to extract visible elements
                js_code = f"""
                () => {{
                    const elementTypes = '{element_types}';
                    const includeHidden = {str(include_hidden).lower()};
                    
                    // Define element selectors based on type
                    let selectors = [];
                    
                    if (elementTypes === 'all' || elementTypes === 'interactive') {{
                        selectors.push(
                            'button', 'input', 'select', 'textarea', 'a[href]', 
                            '[onclick]', '[role="button"]', '[tabindex]'
                        );
                    }}
                    
                    if (elementTypes === 'all' || elementTypes === 'text') {{
                        selectors.push('h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'div');
                    }}
                    
                    if (elementTypes === 'all' || elementTypes === 'links') {{
                        selectors.push('a[href]');
                    }}
                    
                    if (elementTypes === 'all') {{
                        // Add form elements, media, etc.
                        selectors.push('img', 'video', 'iframe', 'form', 'label');
                    }}
                    
                    // Get all elements matching selectors
                    const allElements = document.querySelectorAll(selectors.join(', '));
                    const elements = [];
                    
                    allElements.forEach((el, index) => {{
                        // Check if element is visible
                        const rect = el.getBoundingClientRect();
                        const style = window.getComputedStyle(el);
                        const isVisible = rect.width > 0 && rect.height > 0 && 
                                        style.visibility !== 'hidden' && 
                                        style.display !== 'none' &&
                                        rect.top < window.innerHeight && 
                                        rect.bottom > 0;
                        
                        if (isVisible || includeHidden) {{
                            // Generate selector for this element
                            let selector = el.tagName.toLowerCase();
                            
                            // Add ID if available
                            if (el.id) {{
                                selector = `#${{el.id}}`;
                            }} else {{
                                // Add class if available
                                if (el.className && typeof el.className === 'string') {{
                                    const classes = el.className.trim().split(/\\s+/).slice(0, 2);
                                    if (classes.length > 0) {{
                                        selector += '.' + classes.join('.');
                                    }}
                                }}
                                
                                // Add nth-child if no unique identifier
                                if (!el.id && (!el.className || el.className === '')) {{
                                    const parent = el.parentNode;
                                    if (parent) {{
                                        const siblings = Array.from(parent.children).filter(child => 
                                            child.tagName === el.tagName
                                        );
                                        if (siblings.length > 1) {{
                                            const index = siblings.indexOf(el) + 1;
                                            selector += `:nth-child(${{index}})`;
                                        }}
                                    }}
                                }}
                            }}
                            
                            // Get text content (limited to first 100 chars)
                            let textContent = '';
                            if (el.textContent) {{
                                textContent = el.textContent.trim().substring(0, 100);
                                if (el.textContent.trim().length > 100) {{
                                    textContent += '...';
                                }}
                            }}
                            
                            // Get attributes of interest
                            const attributes = {{}};
                            if (el.href) attributes.href = el.href;
                            if (el.value) attributes.value = el.value;
                            if (el.placeholder) attributes.placeholder = el.placeholder;
                            if (el.title) attributes.title = el.title;
                            if (el.alt) attributes.alt = el.alt;
                            if (el.type) attributes.type = el.type;
                            if (el.name) attributes.name = el.name;
                            
                            elements.push({{
                                index: index,
                                tagName: el.tagName.toLowerCase(),
                                selector: selector,
                                textContent: textContent,
                                attributes: attributes,
                                position: {{
                                    x: Math.round(rect.left),
                                    y: Math.round(rect.top),
                                    width: Math.round(rect.width),
                                    height: Math.round(rect.height)
                                }},
                                isVisible: isVisible,
                                className: el.className,
                                id: el.id || null
                            }});
                        }}
                    }});
                    
                    return {{
                        elements: elements,
                        totalCount: elements.length,
                        visibleCount: elements.filter(el => el.isVisible).length,
                        pageTitle: document.title,
                        pageUrl: window.location.href,
                        viewport: {{
                            width: window.innerWidth,
                            height: window.innerHeight
                        }}
                    }};
                }}
                """
                
                # Execute the JavaScript
                result = await page.evaluate(js_code)
                
                # Cleanup connection
                await self.utils.cleanup_connection(playwright, browser)
                
                execution_time = int((time.time() - start_time) * 1000)
                
                print(f"Web[{self.web_type.upper()}]: Found {result['totalCount']} elements ({result['visibleCount']} visible)")
                
                return {
                    'success': True,
                    'elements': result['elements'],
                    'summary': {
                        'total_count': result['totalCount'],
                        'visible_count': result['visibleCount'],
                        'page_title': result['pageTitle'],
                        'page_url': result['pageUrl'],
                        'viewport': result['viewport'],
                        'element_types': element_types,
                        'include_hidden': include_hidden
                    },
                    'execution_time': execution_time,
                    'error': ''
                }
                
            except Exception as e:
                error_msg = f"Dump elements error: {e}"
                print(f"Web[{self.web_type.upper()}]: {error_msg}")
                return {
                    'success': False,
                    'error': error_msg,
                    'elements': [],
                    'summary': {}
                }
        
        if not self.is_connected:
            return {
                'success': False,
                'error': 'Not connected to browser',
                'elements': [],
                'summary': {}
            }
        
        return self.utils.run_async(_async_dump_elements())
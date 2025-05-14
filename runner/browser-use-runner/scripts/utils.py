from playwright.sync_api import sync_playwright, Page, Playwright
import random
import os
import sys
import argparse
from dotenv import load_dotenv
import re
from datetime import datetime
import json
import platform
import subprocess
import time
import socket

# Load .env file from the same directory as this script
script_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(script_dir, '.env')
load_dotenv(env_path)
print(f'Loaded environment variables from: {env_path}')

def get_cookies_path(trace_folder: str, cookies_enabled: bool = True):
    """
    Determine the appropriate cookies path based on the trace folder.
    Returns None if cookies are not enabled.
    """
    if not cookies_enabled:
        return None
    
    # Determine cookie path based on trace_folder
    if trace_folder == 'suncherry-playwright_trace':
        cookies_path = trace_folder
    else:
        cookies_path = os.path.dirname(trace_folder)
    
    print(f"Debug: Determined cookies_path to be: {cookies_path} based on trace_folder: {trace_folder}")
    return cookies_path

def activate_semantic_placeholder(page: Page, trace_folder: str):
    shadow_root_selector = 'body > flutter-view > flt-glass-pane'
    element_inside_shadow_dom_selector = 'flt-semantics-placeholder'
    take_screenshot(page, trace_folder, 'semantic_placeholder_start')
    try:
        flutter_view_present = page.locator(shadow_root_selector).count() > 0
        print(f"Page state check: Flutter view present: {flutter_view_present}")
        if not flutter_view_present:
            print("Skipping semantic placeholder activation as flutter view is not present.")
            return False
        page.wait_for_selector(shadow_root_selector, state="hidden", timeout=10000)
        clicked = page.evaluate(
            '''
                ([shadowRootSelector, elementSelector]) => {
                    const shadowHost = document.querySelector(shadowRootSelector);
                    if (shadowHost) {
                        const shadowRoot = shadowHost.shadowRoot;
                        if (shadowRoot) {
                            const element = shadowRoot.querySelector(elementSelector);
                            if (element) {
                                element.click();
                                return true;
                            }
                        }
                    }
                    return false;
                }
            ''', [shadow_root_selector, element_inside_shadow_dom_selector])

        if clicked:
            print("Semantic placeholder activated.")
            take_screenshot(page, trace_folder, 'semantic_placeholder_end')
            return True
        else:
            print("Error activating semantic placeholder")
            take_screenshot(page, trace_folder, 'semantic_placeholder_error')
            return False
    except Exception as e:
        print(f"Error in semantic placeholder activation: {str(e)}")
        take_screenshot(page, trace_folder, 'semantic_placeholder_error')
        return False

def load_cookies(context, cookies_path: str):
    """
    Load cookies from a file into the browser context.
    Returns True if cookies were successfully loaded, False otherwise.
    """
    if not cookies_path:
        print("No cookies path provided, skipping cookie loading")
        return False
    
    if not os.path.exists(cookies_path):
        os.makedirs(cookies_path, exist_ok=True)
        print(f"Creating cookies folder: {cookies_path}")
        return False
    else:
        print(f"Cookies folder exists: {cookies_path}")
    
    cookies_file = os.path.join(cookies_path, 'cookies.json')
    if os.path.exists(cookies_file):
        try:
            with open(cookies_file, 'r') as f:
                cookies_data = json.load(f)
            context.add_cookies(cookies_data)
            print(f"Loaded {len(cookies_data)} cookies from {cookies_file}")
            print("We have loaded cookies, should be already logged in")
            return True
        except Exception as e:
            print(f"Error loading cookies from {cookies_file}: {str(e)}")
            print("No cookies loaded, login might be required")
            return False
    else:
        print(f"No cookies file found at {cookies_file}")
        print("No cookies loaded, login might be required")
        return False

def init_browser(playwright: Playwright, headless=True, debug: bool = False, video_dir: str = None, screenshots: bool = True, video: bool = True, source: bool = True, cookies_path: str = None, executable_path: str = None, remote_debugging: bool = False):
    browser_args = ['--disable-blink-features=AutomationControlled','--disable-gpu', '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--window-position=0,0', '--enable-unsafe-swiftshader']
    
    if remote_debugging:
        # Kill any existing Chrome instances to avoid port conflicts
        print('Killing any existing Chrome instances before launching...')
        if platform.system() == 'Windows':
            os.system('taskkill /IM chrome.exe /F')
        else:
            os.system('pkill -9 "Google Chrome"')
        # Make sure Chrome processes are fully terminated
        time.sleep(2)  # Give OS time to clean up processes
        
        # Verify no Chrome processes remain
        if platform.system() == 'Windows':
            result = subprocess.run(['tasklist', '|', 'findstr', 'chrome.exe'], shell=True, stdout=subprocess.PIPE)
        else:
            result = subprocess.run(['pgrep', 'Google Chrome'], stdout=subprocess.PIPE)
        if result.stdout:
            print('Some Chrome processes still running. Attempting to kill again...')
            if platform.system() == 'Windows':
                os.system('taskkill /IM chrome.exe /F')
            else:
                os.system('pkill -9 "Google Chrome"')
            time.sleep(2)
        
        # Check if port 9222 is in use and kill any process using it
        def is_port_in_use(port):
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(1)
                try:
                    s.bind(('127.0.0.1', port))
                    return False
                except socket.error:
                    return True

        try:
            if is_port_in_use(9222):
                print('Port 9222 is in use. Killing processes using this port...')
                if platform.system() == 'Windows':
                    result = subprocess.run(['netstat', '-aon', '|', 'findstr', ':9222'], shell=True, stdout=subprocess.PIPE)
                    if result.stdout:
                        lines = result.stdout.decode().splitlines()
                        for line in lines:
                            if 'LISTENING' in line:
                                pid = line.split()[-1]
                                os.system(f'taskkill /PID {pid} /F')
                else:
                    os.system('lsof -ti:9222 | xargs kill -9')
                time.sleep(1)
        except Exception as e:
            print(f'Error checking port usage: {str(e)}')
        
        # Set hardcoded Chrome path based on OS if not provided
        if not executable_path:
            if platform.system() == 'Windows':
                executable_path = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
            elif platform.system() == 'Darwin':  # macOS
                executable_path = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
            else:  # Linux
                possible_paths = ['/usr/bin/google-chrome', '/usr/bin/chromium-browser']
                for path in possible_paths:
                    if os.path.exists(path):
                        executable_path = path
                        break
                if not executable_path:
                    raise ValueError('No Chrome executable found in common Linux paths. Please provide --executable_path.')
        print(f'Launching Chrome with remote debugging using: {executable_path}')
        
        # Launch Chrome with remote debugging enabled using a more reliable approach
        debug_port = 9222
        user_data_dir = f"/tmp/chrome_debug_profile_{datetime.now().strftime('%Y%m%d_%H%M%S')}" if platform.system() != 'Windows' else f"C:\\Temp\\chrome_debug_profile_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        os.makedirs(user_data_dir, exist_ok=True)
        
        chrome_flags = [
            f'--remote-debugging-port={debug_port}',
            f'--user-data-dir={user_data_dir}',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-features=Translate',
            '--disable-extensions',
            '--disable-component-extensions-with-background-pages',
            '--disable-background-networking',
            '--window-position=0,0',
            '--window-size=1920,1080',
            '--disable-gpu',
            '--enable-unsafe-swiftshader'
        ]
        
        cmd_line = [executable_path] + chrome_flags
        print(f'Launching Chrome with command: {" ".join(cmd_line)}')
        process = subprocess.Popen(cmd_line)
        print(f'Chrome launched with PID: {process.pid}')
        
        # Wait for Chrome to be ready by checking if the port is open
        max_wait = 30  # Maximum wait time in seconds
        print(f'Waiting up to {max_wait} seconds for Chrome to be ready on port {debug_port}...')
        
        start_time = time.time()
        port_open = False
        
        while time.time() - start_time < max_wait:
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(1)
                s.connect(('127.0.0.1', debug_port))
                s.close()
                port_open = True
                elapsed = time.time() - start_time
                print(f'Chrome is ready! Port {debug_port} is open after {elapsed:.2f} seconds')
                # Add a small delay to ensure Chrome is fully initialized
                time.sleep(2)
                break
            except (socket.timeout, socket.error):
                time.sleep(1)
        
        if not port_open:
            print(f'Timed out waiting for Chrome to open port {debug_port} after {max_wait} seconds')
            # But still try to connect anyway in case the port check failed but Chrome is still running
        
        # Now connect to the Chrome instance using CDP
        try:
            # First try to get the debug URL to see if CDP is working
            import urllib.request
            try:
                with urllib.request.urlopen(f'http://127.0.0.1:{debug_port}/json/version') as response:
                    version_info = json.loads(response.read().decode('utf-8'))
                    print(f'Successfully connected to Chrome debugging HTTP endpoint: {version_info}')
                    # If we can see a webSocketDebuggerUrl, that's a good sign
                    if 'webSocketDebuggerUrl' in version_info:
                        print(f'Found WebSocket debugger URL: {version_info["webSocketDebuggerUrl"]}')
                        # Try connecting directly to the WebSocket URL
                        try:
                            ws_url = version_info["webSocketDebuggerUrl"]
                            print(f'Attempting to connect directly to WebSocket URL: {ws_url}')
                            browser = playwright.chromium.connect_over_cdp(ws_url)
                            print('Connected to Chrome instance via WebSocket URL')
                            context = browser.new_context()
                            context.tracing.start(screenshots=screenshots, snapshots=True, sources=source)
                            page = context.new_page()
                            if debug:
                                page.on("response", lambda response: print(f"Response: {response.status} {response.url}"))
                                page.on("requestfailed", lambda request: print(f"Request failed: {request.url} {request.failure}"))
                            return page, context, browser
                        except Exception as ws_error:
                            print(f'Failed to connect via WebSocket URL: {str(ws_error)}')
            except Exception as e:
                print(f'Error connecting to Chrome debugging HTTP endpoint: {str(e)}')
            
            # Try explicitly using 127.0.0.1 instead of localhost to avoid IPv6 issues
            print('Attempting to connect via http://127.0.0.1:9222...')
            browser = playwright.chromium.connect_over_cdp('http://127.0.0.1:9222')
            print('Connected to Chrome instance via CDP on port 9222')
        except Exception as e:
            print(f'Failed to connect to Chrome via CDP: {str(e)}')
            # Try alternative connection if first one fails
            try:
                print('Attempting alternative connection method via http://localhost:9222...')
                browser = playwright.chromium.connect_over_cdp('http://localhost:9222')
                print('Connected to Chrome instance via CDP using alternative method')
            except Exception as e2:
                print(f'Alternative connection also failed: {str(e2)}')
                # As a last resort, just launch a new browser
                print('All CDP connection attempts failed. Falling back to launching a regular browser...')
                if executable_path:
                    browser = playwright.chromium.launch(
                        headless=headless,
                        executable_path=executable_path,
                        args=browser_args
                    )
                else:
                    browser = playwright.chromium.launch(
                        headless=headless,
                        args=browser_args
                    )
                print('Fallback browser launched')
    else:
        if executable_path:
            browser = playwright.chromium.launch(
                headless=headless,
                executable_path=executable_path,
                args=browser_args
            )
            print(f"Using custom Chrome executable at: {executable_path}")
        else:
            # Set hardcoded Chrome path based on OS if not provided
            if platform.system() == 'Windows':
                executable_path = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
            elif platform.system() == 'Darwin':  # macOS
                executable_path = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
            else:  # Linux
                possible_paths = ['/usr/bin/google-chrome', '/usr/bin/chromium-browser']
                for path in possible_paths:
                    if os.path.exists(path):
                        executable_path = path
                        break
                if not executable_path:
                    print('No Chrome executable found in common Linux paths. Falling back to default Chromium.')
                    executable_path = None
            if executable_path and os.path.exists(executable_path):
                browser = playwright.chromium.launch(
                    headless=headless,
                    executable_path=executable_path,
                    args=browser_args
                )
                print(f"Using Chrome executable at: {executable_path}")
            else:
                browser = playwright.chromium.launch(
                    headless=headless,
                    args=browser_args
                )
                print("Using default Chromium browser")

    # The rest of the initialization is different depending on whether we're using remote debugging or not
    if remote_debugging:
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
        ) # We cannot provide context to remote CDP so no video
    else:
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},  # Set a large viewport for fullscreen experience
            record_video_dir=video_dir if video else None,
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
            locale="fr-FR",
            timezone_id="Europe/Zurich"
        )
    
    # Start tracing
    context.tracing.start(screenshots=screenshots, snapshots=True, sources=source)
    page = context.new_page()
    
    if debug:
        page.on("response", lambda response: print(f"Response: {response.status} {response.url}"))
        page.on("requestfailed", lambda request: print(f"Request failed: {request.url} {request.failure}"))
    return page, context, browser

def save_cookies(page: Page, cookies_path: str):
    if cookies_path:
        cookies_file = os.path.join(cookies_path, 'cookies.json')
        print(f"Debug: Attempting to save cookies to: {cookies_file}")
        try:
            os.makedirs(cookies_path, exist_ok=True)
            cookies_data = page.context.cookies()
            with open(cookies_file, 'w') as f:
                json.dump(cookies_data, f, indent=2)
            print(f"Saved cookies to {cookies_file}")
        except Exception as e:
            print(f"Error saving cookies to {cookies_file}: {str(e)}")
    else:
        print("Debug: Skipping cookie saving as cookies_path is not set")

def take_screenshot(page: Page, trace_subfolder: str, name: str = 'screenshot') -> str:
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    screenshot_path = f"{trace_subfolder}/{name.replace(' ', '_')}_{timestamp}.png"
    try:
        page.screenshot(path=screenshot_path, full_page=True, timeout=20000)
        print(f"Screenshot saved to: {screenshot_path}")
        return screenshot_path
    except Exception as e:
        print(f"Error taking screenshot: {str(e)}")
        return ''

def finalize_run(page: Page, context, browser, trace_subfolder: str, timestamp: str, trace_file: str, video: bool = True, remote_debugging: bool = False, keep_browser_open: bool = True):
    take_screenshot(page, trace_subfolder, 'final_state')

    try:
        if context.tracing:
            context.tracing.stop(path=trace_file)
            print(f"Tracing data saved to: {trace_file}")
    except Exception as e:
        print(f"Error saving or extracting trace data: {str(e)}")


    # Log the current URL to confirm where the browser is before completion
    current_url = page.url
    print(f"Current URL before completion: {current_url}")
    
    if not keep_browser_open:
        # Close both page and browser if we're not keeping the browser open
        page.close()
        browser.close()
        print("Browser closed")
    else:
        # If keeping browser open, don't close the page so user can continue interacting
        print("Browser kept open with current page. Remember to close it manually when done.")

def setup_common_args(parser, add_channel=False):
    """
    Add common command line arguments to the parser
    If add_channel is True, add the channel argument for zap script
    """
    parser.add_argument('--headless', action='store_true', help='Run in headless mode')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    parser.add_argument('--trace_folder', type=str, default='suncherry-playwright_trace', help='Folder for storing trace data')
    parser.add_argument('--no-screenshots', action='store_true', default=False, help='Disable screenshots in tracing (default: enabled)')
    parser.add_argument('--no-video', action='store_true', default=False, help='Disable video recording (default: enabled)')
    parser.add_argument('--no-trace', action='store_true', default=False, help='Disable source tracing (default: enabled)')
    parser.add_argument('--executable_path', type=str, help='Path to Google Chrome executable, defaults to Chromium if not provided')
    parser.add_argument('--remote-debugging', action='store_true', default=False, help='Launch and connect to Google Chrome with remote debugging enabled on port 9222')
    parser.add_argument('--close-browser', action='store_true', default=False, help='Close the browser after the test completes (by default, browser stays open)')
    
    if add_channel:
        parser.add_argument('--channel', type=str, default='SRF 1', help='Channel to select (default: SRF 1)')
    
    return parser

def run_main(run_function, args=None, with_username_password=False):
    """
    Common main function implementation for both scripts
    run_function: The script-specific run function to call
    args: Parsed arguments
    with_username_password: Whether this script requires username/password
    """
    try:
        if with_username_password:
            # Process username and password for login script
            username = args.username
            password = args.password
            if not username or not password:
                load_dotenv()
                username = os.getenv("login_username")
                password = os.getenv("login_password")
                print(f"Debug: Username from env: {username}")
                print(f"Debug: Password from env: {password}")

            if not username or not password:
                raise ValueError("Username and password must be provided either as command-line arguments or in .env file")
            
            run_args = {
                'username': username, 
                'password': password
            }
        else:
            # For zap script
            run_args = {}
            if hasattr(args, 'channel'):
                run_args['channel'] = args.channel
        
        # Common arguments for both scripts
        run_args.update({
            'headless': args.headless,
            'debug': args.debug,
            'trace_folder': args.trace_folder,
            'screenshots': not args.no_screenshots,
            'video': not args.no_video,
            'source': not args.no_trace,
            'executable_path': args.executable_path,
            'remote_debugging': args.remote_debugging,
            'keep_browser_open': not args.close_browser
        })
        
        with sync_playwright() as playwright:
            run_args['playwright'] = playwright
            success = run_function(**run_args)
            
            if success:
                print("Test successful")
                sys.exit(0)
            else:
                print("Test failed")
                sys.exit(1)

    except Exception as e:
        print(f"An error occurred: {str(e)}")
        print("Login failed" if with_username_password else "Test failed")
        sys.exit(1)

def save_storage_state(context, storage_path: str):
    """
    Save the storage state (cookies and local storage) from the browser context to a file.
    Returns True if storage state was successfully saved, False otherwise.
    """
    if not storage_path:
        print("No storage path provided, skipping storage state saving")
        return False
    
    if not os.path.exists(storage_path):
        os.makedirs(storage_path, exist_ok=True)
        print(f"Creating storage folder: {storage_path}")
    
    storage_file = os.path.join(storage_path, 'storage_state.json')
    try:
        storage_state = context.storage_state()
        with open(storage_file, 'w') as f:
            json.dump(storage_state, f, indent=2)
        print(f"Saved storage state to {storage_file}")
        return True
    except Exception as e:
        print(f"Error saving storage state to {storage_file}: {str(e)}")
        return False

def load_storage_state(context, storage_path: str):
    """
    Load the storage state (cookies and local storage) from a file into the browser context.
    Returns True if storage state was successfully loaded, False otherwise.
    """
    if not storage_path:
        print("No storage path provided, skipping storage state loading")
        return False
    
    storage_file = os.path.join(storage_path, 'storage_state.json')
    if os.path.exists(storage_file):
        try:
            with open(storage_file, 'r') as f:
                storage_state = json.load(f)
            context.set_storage_state(storage_state)
            print(f"Loaded storage state from {storage_file}")
            return True
        except Exception as e:
            print(f"Error loading storage state from {storage_file}: {str(e)}")
            print("No storage state loaded, login might be required")
            return False
    else:
        print(f"No storage state file found at {storage_file}")
        print("No storage state loaded, login might be required")
        return False 
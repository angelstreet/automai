from playwright.sync_api import sync_playwright, Page, Playwright
import os
import sys
from dotenv import load_dotenv
from datetime import datetime
import json
import platform
import subprocess
import time
import socket
import time
import shutil

# Load .env file from the same directory as this script
script_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(script_dir, '.env')
load_dotenv(env_path)
print(f'Loaded environment variables from: {env_path}')

def clean_user_data_dir():
    user_data_dir = '/tmp/chrome_debug_profile'
    if os.path.exists(user_data_dir):
        shutil.rmtree(user_data_dir)
        print(f"Cleaned up user data directory: {user_data_dir}")

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

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1)
        try:
            s.bind(('127.0.0.1', port))
            return False
        except socket.error:
            return True
        
def init_browser(playwright: Playwright, headless=True, debug: bool = False, video_dir: str = None, screenshots: bool = True, video: bool = True, source: bool = True, executable_path: str = None, remote_debugging: bool = False):
    if remote_debugging:
        page, context, browser = init_browser_with_remote_debugging(playwright, headless, debug, video_dir, screenshots, video, source, executable_path)
    else:
        page, context, browser = init_regular_browser(playwright, headless, debug, video_dir, screenshots, video, source, executable_path)
    
    context.tracing.start(screenshots=screenshots, snapshots=True, sources=source)
    return page, context, browser

def init_browser_with_remote_debugging(playwright: Playwright, headless=True, debug: bool = False, video_dir: str = None, screenshots: bool = True, video: bool = True, source: bool = True, executable_path: str = None):
    """Initialize browser with remote debugging enabled on port 9222"""
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
    user_data_dir = f'/tmp/chrome_debug_profile'
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
        '--window-size=1080,720',
        '--disable-gpu',
        '--enable-unsafe-swiftshader',
        '--hide-crash-restore-bubble'

    ]
    
    cmd_line = [executable_path] + chrome_flags
    print(f'Launching Chrome with command: {" ".join(cmd_line)}')
    process = subprocess.Popen(cmd_line)
    print(f'Chrome launched with PID: {process.pid}')
    time.sleep(10)
    
    print('Attempting to connect via http://127.0.0.1:9222...')
    browser = playwright.chromium.connect_over_cdp('http://localhost:9222')
    print('Connected to Chrome instance via CDP on port 9222')
    
    context = browser.contexts[0]
    page = context.pages[0]  
    return page, context, browser

def init_regular_browser(playwright: Playwright, headless=True, debug: bool = False, video_dir: str = None, screenshots: bool = True, video: bool = True, source: bool = True, executable_path: str = None):
    """Initialize browser without remote debugging"""
    browser_args = ['--disable-blink-features=AutomationControlled','--disable-gpu', '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--window-position=0,0', '--viewport=1080,720','--enable-unsafe-swiftshader']
    print(f"Initializing browser with args: {browser_args}")
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
    if len(browser.contexts) == 0:
        context = browser.new_context( )
        page = context.new_page()
    else:
        context = browser.contexts[0]
        page = context.pages[0]
    
    return page, context, browser

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

def setup_common_args(parser):
    """
    Add common command line arguments to the parser
    """
    parser.add_argument('--headless', action='store_true', help='Run in headless mode')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    parser.add_argument('--trace_folder', type=str, default='suncherry-playwright_trace', help='Folder for storing trace data')
    parser.add_argument('--screenshots', action='store_true', default=False, help='Disable screenshots in tracing (default: enabled)')
    parser.add_argument('--video', action='store_true', default=False, help='Disable video recording (default: enabled)')
    parser.add_argument('--trace', action='store_true', default=False, help='Disable source tracing (default: enabled)')
    parser.add_argument('--executable_path', type=str, help='Path to Google Chrome executable, defaults to Chromium if not provided')
    parser.add_argument('--remote-debugging', action='store_true', default=False, help='Launch and connect to Google Chrome with remote debugging enabled on port 9222')
    parser.add_argument('--keep-alive', action='store_true', default=False, help='Close the browser after the test completes (by default, browser stays open)')
    return parser

def run_main(run_function, args=None):
    """
    Common main function implementation for both scripts
    run_function: The script-specific run function to call
    args: Parsed arguments
    """
    try:
        with sync_playwright() as playwright:
            run_function(playwright=playwright, **vars(args))
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        sys.exit(1)

def launch_browser_with_remote_debugging(executable_path: str = None) -> subprocess.Popen:
    """
    Launch a Chrome browser instance with remote debugging enabled on port 9222.
    Returns the subprocess.Popen object for the launched process.
    """
    import platform
    import subprocess
    import time
    import socket
    import os
    from datetime import datetime

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
    user_data_dir = "/tmp/chrome_debug_profile"
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
        '--disable-gpu',
        '--enable-unsafe-swiftshader',
        '--window-size=1920,1080'
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
        # But still return the process in case the port check failed but Chrome is still running

    return process 
from playwright.sync_api import sync_playwright, Page, Playwright
import random
import os
import sys
import argparse
from dotenv import load_dotenv
import re
from datetime import datetime
import zipfile
import json

# Load .env file from the same directory as this script
script_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(script_dir, '.env')
load_dotenv(env_path)
print(f'Loaded environment variables from: {env_path}')

def activate_semantic_placeholder(page: Page):
    shadow_root_selector = 'body > flutter-view > flt-glass-pane'
    element_inside_shadow_dom_selector = 'flt-semantics-placeholder'
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
            return True
        else:
            print("Error activating semantic placeholder")
            return False
    except Exception as e:
        print(f"Error in semantic placeholder activation: {str(e)}")
        return False

def init_browser(playwright: Playwright, headless=True, debug: bool = False, video_dir: str = None, screenshots: bool = True, video: bool = True, source: bool = True, cookies_path: str = None, executable_path: str = None, remote_debugging: bool = False):
    browser_args = ['--disable-blink-features=AutomationControlled','--disable-gpu', '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--window-position=0,0']
    
    if remote_debugging:
        # Kill any existing Chrome instances to avoid port conflicts
        print('Killing any existing Chrome instances before launching...')
        os.system('pkill -9 "Google Chrome"')
        
        # Load Chrome path from .env or use provided executable_path
        chrome_path = executable_path if executable_path else os.getenv('CHROME_INSTANCE_PATH', '').strip('"')
        if not chrome_path:
            raise ValueError('No Chrome executable path provided via --executable_path or CHROME_INSTANCE_PATH in .env file.')
        print(f'Launching Chrome with remote debugging using: {chrome_path}')
        
        # Launch Chrome with remote debugging enabled using a more reliable approach
        import subprocess
        import time
        import socket
        
        # Use a different debugging port to avoid potential conflicts
        debug_port = 9222
        user_data_dir = f"/tmp/chrome_debug_profile_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
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
            # Start with a blank page to minimize resource usage
            'about:blank'
        ]
        
        cmd_line = [chrome_path] + chrome_flags
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
                break
            except (socket.timeout, socket.error):
                time.sleep(1)
        
        if not port_open:
            print(f'Timed out waiting for Chrome to open port {debug_port} after {max_wait} seconds')
            # But still try to connect anyway in case the port check failed but Chrome is still running
        
        # Now connect to the Chrome instance using CDP
        try:
            browser = playwright.chromium.connect_over_cdp(f'http://localhost:{debug_port}')
            print(f'Connected to Chrome instance via CDP on port {debug_port}')
        except Exception as e:
            print(f'Failed to connect to Chrome via CDP: {str(e)}')
            raise
    else:
        if executable_path:
            browser = playwright.chromium.launch(
                headless=headless,
                executable_path=executable_path,
                args=browser_args
            )
            print(f"Using custom Chrome executable at: {executable_path}")
        else:
            browser = playwright.chromium.launch(
                headless=headless,
                args=browser_args
            )
            print("Using default Chromium browser")

    # The rest of the initialization is different depending on whether we're using remote debugging or not
    if remote_debugging:
        # When using CDP, we need to create a special browser context
        context = browser.new_context()
    else:
        # Ensure the cookies directory exists only if a path is provided
        if cookies_path:
            if not os.path.exists(cookies_path):
                os.makedirs(cookies_path, exist_ok=True)
                print("Creating cookies folder:", cookies_path)
            else:
                print("Cookies folder exists")

        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},  # Set a large viewport for fullscreen experience
            record_video_dir=video_dir if video else None,
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
            locale="fr-FR",
            timezone_id="Europe/Zurich"
        )
        context.set_extra_http_headers({
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
            "Sec-CH-UA": '"Google Chrome";v="136", "Not)A;Brand";v="99", "Chromium";v="136"',
            "Sec-CH-UA-Platform": '"macOS"'
        })

    # Load cookies from file if they exist and we're not using remote debugging
    if cookies_path and not remote_debugging: 
        cookies_file = os.path.join(cookies_path, 'cookies.json')
        if os.path.exists(cookies_file):
            try:
                with open(cookies_file, 'r') as f:
                    cookies_data = json.load(f)
                context.add_cookies(cookies_data)
                print(f"Loaded cookies from {cookies_file}")
            except Exception as e:
                print(f"Error loading cookies from {cookies_file}: {str(e)}")
        else:
            print(f"No cookies file found at {cookies_file}")

    # Only start tracing if not using remote debugging
    if not remote_debugging:
        context.tracing.start(screenshots=screenshots, snapshots=True, sources=source)
    
    page = context.new_page()
    
    # Only apply window resize and spoofing if not using remote debugging
    if not remote_debugging:
        page.evaluate("window.resizeTo(1920, 1080)")
        print("Set browser window size to 1920x1080 to match viewport")

        # Spoof navigator properties
        page.evaluate('''() => {
            Object.defineProperty(navigator, "platform", { get: () => "MacIntel" });
            Object.defineProperty(navigator, "language", { get: () => "fr-FR" });
            Object.defineProperty(navigator, "languages", { get: () => ["fr-FR", "fr", "en-US", "en"] });
            Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 });
            Object.defineProperty(navigator, "deviceMemory", { get: () => 8 });
            Object.defineProperty(window, "devicePixelRatio", { get: () => 2 });
        }''')

        # Spoof WebGL
        page.evaluate('''() => {
            const getParameter = WebGLRenderingContext.prototype.getParameter;
            WebGLRenderingContext.prototype.getParameter = function(parameter) {
                if (parameter === 37446) return "Apple Inc.";
                if (parameter === 37447) return "ANGLE (Apple, Apple M1, OpenGL ES 3.0)";
                return getParameter.apply(this, arguments);
            };
        }''')
    
    if debug:
        #page.on("request", lambda request: print(f"Request Headers: {request.headers}"))
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

def finalize_run(page: Page, context, browser, trace_subfolder: str, timestamp: str, trace_file: str, video: bool = True, remote_debugging: bool = False):
    try:
        screenshot_path = f"{trace_subfolder}/final_state_{timestamp}.png"
        page.screenshot(path=screenshot_path, full_page=True, timeout=20000)
        print(f"Screenshot saved to: {screenshot_path}")
    except Exception as e:
        print(f"Error taking final screenshot: {str(e)}")
    
    page.close()
    try:
        # Only stop tracing if not using remote debugging
        if not remote_debugging:
            context.tracing.stop(path=trace_file)
            print(f"Tracing data saved to: {trace_file}")
            with zipfile.ZipFile(trace_file, 'r') as zip_ref:
                zip_ref.extractall(trace_subfolder)
            os.remove(trace_file)
            print(f"Zip file removed: {trace_file}")
    except Exception as e:
        print(f"Error saving or extracting trace data: {str(e)}")

    video_path = page.video.path() if not remote_debugging and page.video and video else None
    if video_path:
        print(f"Video saved to: {video_path}")
    browser.close() 
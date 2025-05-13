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

from utils import init_browser, activate_semantic_placeholder, finalize_run

# Load .env file from the same directory as this script
script_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(script_dir, '.env')
load_dotenv(env_path)
print(f'Loaded environment variables from: {env_path}')

def pass_login(page: Page, url: str, channel: str = 'RTS 1'):
    try:
        activate_semantic_placeholder(page)
        page.wait_for_timeout(2000)
        page.wait_for_selector("#flt-semantic-node-6", state="visible")
        page.click("#flt-semantic-node-6")
        print('Login screen skipped')
        page.wait_for_timeout(10000)
        return True
    except Exception as e:
        print(f'Login screen not shown or skipped: {str(e)}')
        return True

def zap(page: Page, url: str, channel: str = 'RTS 1'):
    try:
        activate_semantic_placeholder(page)
        page.wait_for_timeout(2000)

        page.wait_for_selector("#flt-semantic-node-6", state="visible", timeout=20000)
        print("Click on TV Guide")
        page.locator("#flt-semantic-node-6").click()

        page.wait_for_selector("[aria-label*='LIVE TV']", state="visible")
        print("Click on LIVE TV tab")
        page.locator("[aria-label*='LIVE TV']").click()

        page.wait_for_selector(f'[aria-label*="{channel}"]', state="visible")
        print("Click on specific channel")
        page.locator(f'[aria-label*="{channel}"]').click()
        page.wait_for_timeout(10000)
        print('Zap success')
        
        return True
    except Exception as e:
        print(f'Zap failed: {str(e)}')
        return False

def run(playwright: Playwright, headless=True, debug: bool = False, trace_folder: str = 'suncherry-playwright_trace', screenshots: bool = True, video: bool = True, source: bool = True, cookies: bool = True, channel: str = 'RTS 1', executable_path: str = None, remote_debugging: bool = False):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    job_folder = trace_folder  # Use trace_folder as the base job folder directly
    trace_subfolder = f"{job_folder}/trace_{timestamp}"  # Create a trace subfolder within job_folder
    os.makedirs(trace_subfolder, exist_ok=True)
    trace_file = f"{trace_subfolder}/{timestamp}.zip"

    if cookies:
        if trace_folder == 'suncherry-playwright_trace':
            cookies_path = trace_folder
        else:
            cookies_path = os.path.dirname(trace_folder) 
        print(f"Debug: Setting cookies_path to: {cookies_path} based on trace_folder: {trace_folder}")
    else:
        cookies_path = None

    page, context, browser = init_browser(playwright, headless, debug, trace_subfolder if video else None, screenshots, video, source, cookies_path, executable_path, remote_debugging)
    url = "https://www.sunrisetv.ch/de/home"
    page.set_default_timeout(10000)

    try:
        page.goto(url, timeout=60000)
        page.wait_for_timeout(5000)
        if debug :
            user_agent = page.evaluate("navigator.userAgent")
            navigator_props = page.evaluate('''() => ({
                webdriver: navigator.webdriver,
                platform: navigator.platform,
                language: navigator.language,
                languages: navigator.languages,
                hardwareConcurrency: navigator.hardwareConcurrency,
                deviceMemory: navigator.deviceMemory,
                devicePixelRatio: window.devicePixelRatio
            })''')
            webgl_info = page.evaluate('''() => {
                const canvas = document.createElement("canvas");
                const gl = canvas.getContext("webgl");
                return {
                    renderer: gl.getParameter(gl.RENDERER),
                    vendor: gl.getParameter(gl.VENDOR)
                };
            }''')
            print(f"Playwright WebGL: {webgl_info}")
            print(f"Playwright Navigator Properties: {navigator_props}")
            print(f"Playwright User Agent: {user_agent}")
        print("We suppose we are already logged in and cookies are loaded")
        pass_login(page, url)
        loaded_cookies = context.cookies()
        print(f"Loaded cookies count: {len(loaded_cookies)}")
        result = zap(page, url, channel)
        page.wait_for_timeout(10000)
    except Exception as e:
        print(f"An error occurred during execution: {str(e)}")
        result = False
    finally:
        finalize_run(page, context, browser, trace_subfolder, timestamp, trace_file, video, remote_debugging)
    
    return result

def main():
    parser = argparse.ArgumentParser(description='Run Suncherry Playwright script')
    parser.add_argument('--headless', action='store_true', help='Run in headless mode')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    parser.add_argument('--trace_folder', type=str, default='suncherry-playwright_trace', help='Folder for storing trace data')
    parser.add_argument('--no-screenshots', action='store_true', default=False, help='Disable screenshots in tracing (default: enabled)')
    parser.add_argument('--no-video', action='store_true', default=False, help='Disable video recording (default: enabled)')
    parser.add_argument('--no-trace', action='store_true', default=False, help='Disable source tracing (default: enabled)')
    parser.add_argument('--channel', type=str, default='SRF 1', help='Channel to select (default: SRF 1)')
    parser.add_argument('--executable_path', type=str, help='Path to Google Chrome executable, defaults to Chromium if not provided')
    parser.add_argument('--remote-debugging', action='store_true', default=False, help='Launch and connect to Google Chrome with remote debugging enabled on port 9222')
    args, _ = parser.parse_known_args()

    print(f"Running in {'headless' if args.headless else 'visible'} mode with {'no-video' if args.no_video else 'video'}, {'no-screenshots' if args.no_screenshots else 'screenshots'}, {'no-trace' if args.no_trace else 'trace'}, targeting channel: {args.channel}, {'with remote debugging' if args.remote_debugging else 'without remote debugging'}")

    try:
        with sync_playwright() as playwright:
            success = run(playwright, headless=args.headless, debug=args.debug, trace_folder=args.trace_folder, screenshots=not args.no_screenshots, video=not args.no_video, source=not args.no_trace, channel=args.channel, executable_path=args.executable_path, remote_debugging=args.remote_debugging)
            if success:
                print("Test successful")
                sys.exit(0)
            else:
                print("Test failed")
                sys.exit(1)
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        print("Login failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
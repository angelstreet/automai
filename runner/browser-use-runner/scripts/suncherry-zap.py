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

from utils import init_browser, activate_semantic_placeholder, finalize_run, load_cookies, get_cookies_path, setup_common_args, run_main

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
        page.wait_for_timeout(3000)

        page.wait_for_selector("#flt-semantic-node-6", state="visible", timeout=20000)
        print("Click on TV Guide")
        page.locator("#flt-semantic-node-6").click()

        page.wait_for_timeout(1000)
        page.wait_for_selector("[aria-label*='LIVE TV']", state="visible")
        print("Click on LIVE TV tab")
        page.locator("[aria-label*='LIVE TV']").click()

        page.wait_for_selector(f'[aria-label*="{channel}"]', state="visible")
        print("Click on specific channel")
        page.locator(f'[aria-label*="{channel}"]').click()
        page.wait_for_timeout(3000)
        print('Zap success')
        return True
    except Exception as e:
        print(f'Zap failed: {str(e)}')
        return False

def run(playwright: Playwright, headless=True, debug: bool = False, trace_folder: str = 'suncherry-playwright_trace', screenshots: bool = True, video: bool = True, source: bool = True, cookies: bool = True, channel: str = 'RTS 1', executable_path: str = None, remote_debugging: bool = False, keep_browser_open: bool = True):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    job_folder = trace_folder  # Use trace_folder as the base job folder directly
    trace_subfolder = os.path.join(job_folder, f"trace_{timestamp}")  # Create a trace subfolder within job_folder
    os.makedirs(trace_subfolder, exist_ok=True)
    trace_file = os.path.join(trace_subfolder, f"{timestamp}.zip")

    # Get the cookies path using the utility function
    cookies_path = get_cookies_path(trace_folder, cookies)

    page, context, browser = init_browser(playwright, headless, debug, trace_subfolder if video else None, screenshots, video, source, cookies_path, executable_path, remote_debugging)
    
    # Load cookies before navigating to the site
    if cookies and cookies_path:
        load_cookies(context, cookies_path)
    
    url = "https://www.sunrisetv.ch/de/home"
    page.set_default_timeout(10000)

    try:
        page.goto(url, timeout=60000)
        page.wait_for_timeout(5000)
        pass_login(page, url)
        
        loaded_cookies = context.cookies()
        print(f"Loaded cookies count: {len(loaded_cookies)}")
        
        result = zap(page, url, channel)
        page.wait_for_timeout(10000)
    except Exception as e:
        print(f"An error occurred during execution: {str(e)}")
        result = False
    finally:
        finalize_run(page, context, browser, trace_subfolder, timestamp, trace_file, video, remote_debugging, keep_browser_open)
    
    return result

def main():
    parser = argparse.ArgumentParser(description='Run Suncherry Playwright script')
    parser = setup_common_args(parser, add_channel=True)
    args, _ = parser.parse_known_args()

    print(f"Running in {'headless' if args.headless else 'visible'} mode with {'no-video' if args.no_video else 'video'}, {'no-screenshots' if args.no_screenshots else 'screenshots'}, {'no-trace' if args.no_trace else 'trace'}, targeting channel: {args.channel}, {'with remote debugging' if args.remote_debugging else 'without remote debugging'}, {'closing browser when done' if args.close_browser else 'keeping browser open'}")

    run_main(run, args)

if __name__ == "__main__":
    main()
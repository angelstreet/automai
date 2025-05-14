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

from utils import init_browser, activate_semantic_placeholder, finalize_run, load_cookies, get_cookies_path, setup_common_args, run_main, take_screenshot, load_storage_state
from suncherryUtils import get_element_id, go_back

# Load .env file from the same directory as this script
script_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(script_dir, '.env')
load_dotenv(env_path)
print(f'Loaded environment variables from: {env_path}')

def pass_login(page: Page, url: str, trace_folder: str, channel: str = 'RTS 1'):
    try:
        activate_semantic_placeholder(page, trace_folder)
        page.wait_for_timeout(2000)
        page.wait_for_selector("#flt-semantic-node-6", state="visible")
        page.click("#flt-semantic-node-6")
        print('Login screen skipped')
        page.wait_for_timeout(10000)
        return True
    except Exception as e:
        print(f'Login screen not shown or skipped: {str(e)}')
        return True

def zap(page: Page, url: str, trace_folder: str, channel: str = 'SRF 1'):
    try:
        activate_semantic_placeholder(page, trace_folder)
        page.wait_for_timeout(3000)

        page.wait_for_selector("#flt-semantic-node-6", state="visible", timeout=20000)
        print("Click on TV Guide")
        take_screenshot(page, trace_folder, 'click_tv_guide')
        page.locator("#flt-semantic-node-6").click()
        page.wait_for_timeout(2000)

        page.wait_for_selector("[aria-label*='LIVE TV']", state="visible")
        print("Click on LIVE TV tab")
        take_screenshot(page, trace_folder, 'click_live_tv')
        page.locator("[aria-label*='LIVE TV']").click()

        page.wait_for_selector(f'[aria-label*="{channel}"]', state="visible")
        start_channel_id_str = get_element_id(page, 'SRF 1 HD')
        start_channel_id = int(start_channel_id_str.replace('flt-semantic-node-', ''))

        print("Click on specific channel")
        take_screenshot(page, trace_folder, 'click_channel')
        page.locator(f'[aria-label*="{channel}"]').click()

        take_screenshot(page, trace_folder, 'click_channel_success')
        page.wait_for_timeout(10000)
        take_screenshot(page, trace_folder, 'wait_for_channel')
        page.wait_for_timeout(10000)
        take_screenshot(page, trace_folder, 'wait_for_channel')
        page.wait_for_timeout(1000)

        
        max_iterations = 3
        print(f'Zap in loop {max_iterations} times')
        for i in range(max_iterations):
            page.go_back()
            print('go back')
            page.wait_for_timeout(2000)
            take_screenshot(page, trace_folder, 'go_back')
            current_channel_id = start_channel_id + i
            page.locator(f"[id='flt-semantic-node-{current_channel_id}']").click()
            page.wait_for_timeout(5000)
            take_screenshot(page, trace_folder, f'next_channel_{current_channel_id}')
            
        print('Test Success, Zap success')
        take_screenshot(page, trace_folder, 'zap_success')
        page.wait_for_timeout(5000)

        return True
    except Exception as e:
        print(f'Test Failed, Zap failed: {str(e)}')
        take_screenshot(page, trace_folder, 'zap_failed')
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
    # Load storage state before navigating to the site
    load_storage_state(context, cookies_path)
    
    url = "https://www.sunrisetv.ch/de/home"
    page.set_default_timeout(10000)

    try:
        page.goto(url, timeout=60000)
        page.wait_for_timeout(5000)
        pass_login(page, url, trace_subfolder)
        
        loaded_cookies = context.cookies()
        print(f"Loaded cookies count: {len(loaded_cookies)}")
        
        result = zap(page, url, trace_subfolder, channel)

    except Exception as e:
        print(f"An error occurred during execution: {str(e)}")
        result = False
    finally:
        finalize_run(page, context, browser, trace_subfolder, timestamp, trace_file, video, remote_debugging, keep_browser_open)
        #input('Press Enter to close the browser...')
        return result

def main():
    parser = argparse.ArgumentParser(description='Run Suncherry Playwright script')
    parser = setup_common_args(parser, add_channel=True)
    args, _ = parser.parse_known_args()

    print(f"Running in {'headless' if args.headless else 'visible'} mode with {'no-video' if args.no_video else 'video'}, {'no-screenshots' if args.no_screenshots else 'screenshots'}, {'no-trace' if args.no_trace else 'trace'}, targeting channel: {args.channel}, {'with remote debugging' if args.remote_debugging else 'without remote debugging'}, {'closing browser when done' if args.close_browser else 'keeping browser open'}")

    run_main(run, args)

if __name__ == "__main__":
    main()
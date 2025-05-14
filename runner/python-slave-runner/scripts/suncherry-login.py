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

from utils import init_browser, activate_semantic_placeholder, save_cookies, finalize_run, get_cookies_path, setup_common_args, run_main, take_screenshot

def login(page: Page, url: str, username: str, password: str, trace_folder: str):
    print(f"Debug: Username in login: {username}")
    print(f"Debug: Password in login: {password}")
    if not username or not password:
        raise ValueError("Username and password must be provided")

    activate_semantic_placeholder(page, trace_folder)
    page.wait_for_timeout(2000)

    page.wait_for_selector("#onetrust-accept-btn-handler", state="visible")
    page.wait_for_timeout(1000)
    print("Accept cookies")
    take_screenshot(page, trace_folder, 'accept_cookies')
    page.locator("#onetrust-accept-btn-handler").click()
    
    page.wait_for_selector("#flt-semantic-node-6", state="visible")
    page.wait_for_timeout(1000)
    print("Click on username")
    page.locator("#flt-semantic-node-6").click()

    page.wait_for_selector("#username", state="visible")
    page.wait_for_timeout(1000)
    print("Fill username")
    page.locator("#username").fill(username)
    page.locator("#username").press("Tab")

    page.wait_for_selector("#password", state="visible")
    page.wait_for_timeout(1000)
    print("Fill password")
    page.locator("#password").fill(password)

    page.wait_for_selector("#kc-login", state="visible")
    take_screenshot(page, trace_folder, 'Filled username and password')
    page.wait_for_timeout(1000)
    print("Click on login")
    page.locator("#kc-login").click()
    take_screenshot(page, trace_folder, 'click_login')
    print("Wait for 10 seconds")
    page.wait_for_timeout(15000)
    take_screenshot(page, trace_folder, 'wait for home')
    # Log cookies before reload for debugging
    cookies_before = page.context.cookies()
    print(f"Cookies before reload: {len(cookies_before)} cookies found")
    for cookie in cookies_before:
        print(f"Cookie: {cookie.get('name', 'Unknown')} - {cookie.get('value', 'No value')}")

    activate_semantic_placeholder(page, trace_folder)
    page.wait_for_timeout(1000)

    try:
        element = page.get_by_label(re.compile("Profil", re.IGNORECASE))
        if element.count() > 0 and element.is_visible():
            print('Test Success, Login successful')
            take_screenshot(page, trace_folder, 'login_success')
            return True
        else:
            print('Test Failed, Login failed')
            take_screenshot(page, trace_folder, 'login_failed')
            return False
    except Exception as e:
        print(f'Test Failed, Login failed: {str(e)}')
        take_screenshot(page, trace_folder, 'login_failed')
        return False

def run(playwright: Playwright, username: str, password: str, headless=True, debug: bool = False, trace_folder: str = 'suncherry-playwright_trace', screenshots: bool = True, video: bool = True, source: bool = True, cookies: bool = True, executable_path: str = None, remote_debugging: bool = False, keep_browser_open: bool = True):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    trace_subfolder = os.path.join(trace_folder, timestamp)
    os.makedirs(trace_subfolder, exist_ok=True)
    trace_file = os.path.join(trace_subfolder, f"{timestamp}.zip")

    # Get the cookies path using the utility function
    cookies_path = get_cookies_path(trace_folder, cookies)

    # We don't load cookies here as this is the login script that generates cookies
    page, context, browser = init_browser(playwright, headless, debug, trace_subfolder if video else None, screenshots, video, source, cookies_path, executable_path, remote_debugging)
    url = "https://www.sunrisetv.ch/de/home"
    page.set_default_timeout(10000)
    
    try:
        page.goto(url, timeout=60000)
        page.wait_for_timeout(10000)

        login_result = login(page, url, username, password, trace_subfolder)
        if login_result and cookies:
            save_cookies(page, cookies_path)
        
        page.wait_for_timeout(10000)
    except Exception as e:
        print(f"An error occurred during execution: {str(e)}")
        login_result = False
    finally:
        finalize_run(page, context, browser, trace_subfolder, timestamp, trace_file, video, remote_debugging, keep_browser_open)
        return login_result

def main():
    parser = argparse.ArgumentParser(description='Run Suncherry Playwright script')
    parser = setup_common_args(parser)
    parser.add_argument('--username', type=str, help='Login username')
    parser.add_argument('--password', type=str, help='Login password')
    args, _ = parser.parse_known_args()

    print(f"Debug: Username from args: {args.username}")
    print(f"Debug: Password from args: {args.password}")
    print(f"Running in {'headless' if args.headless else 'visible'} mode with {'no-video' if args.no_video else 'video'}, {'no-screenshots' if args.no_screenshots else 'screenshots'}, {'no-trace' if args.no_trace else 'trace'}, {'with remote debugging' if args.remote_debugging else 'without remote debugging'}, {'closing browser when done' if args.close_browser else 'keeping browser open'}")

    run_main(run, args, with_username_password=True)

if __name__ == "__main__":
    main()
from playwright.sync_api import Playwright
import os
import sys
import argparse
from datetime import datetime

from utils import init_browser, save_cookies, finalize_run, get_cookies_path, setup_common_args, run_main, save_storage_state
from suncherryUtils import login


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

        login_result = login(page, username, password, trace_subfolder)
        if login_result and cookies:
            save_cookies(page, cookies_path)
        if login_result:
            save_storage_state(context, cookies_path)
        
        page.wait_for_timeout(10000)
    except Exception as e:
        print(f"An error occurred during execution: {str(e)}")
        login_result = False
    finally:
        finalize_run(page, context, browser, trace_subfolder, timestamp, trace_file, video, remote_debugging, keep_browser_open)
        if login_result :
            return sys.exit(0)
        else:
            return sys.exit(1)

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
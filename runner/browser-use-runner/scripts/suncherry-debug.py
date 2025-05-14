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

def debug(page: Page, url: str, username: str, password: str, trace_folder: str):
    print(f"Debug")
    return True

def run(playwright: Playwright, headless=True, debug: bool = False, trace_folder: str = 'suncherry-playwright_trace', screenshots: bool = True, video: bool = True, source: bool = True, cookies: bool = True, executable_path: str = None, remote_debugging: bool = False, keep_browser_open: bool = True):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    page, context, browser = init_browser(playwright, headless, debug, trace_folder if video else None, screenshots, video, source, "", executable_path, remote_debugging)
    url = "http://www.sunrisetv.ch/de/home"
    page.set_default_timeout(10000)
    
    try:
        page.goto(url, timeout=60000)
        page.wait_for_timeout(2000)

        debug(page, url)
      
    except Exception as e:
        print(f"An error occurred during execution: {str(e)}")
        return False
    finally:
        finalize_run(page, context, browser, trace_folder, timestamp, trace_folder, video, remote_debugging, keep_browser_open)
        return True

def main():
    parser = argparse.ArgumentParser(description='Run Suncherry Playwright script')
    parser = setup_common_args(parser)
    args, _ = parser.parse_known_args()

    run_main(run, args, with_username_password=False)

if __name__ == "__main__":
    main()
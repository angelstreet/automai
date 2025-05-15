from playwright.sync_api import Page, Playwright
import os
import sys
import argparse
from dotenv import load_dotenv
from datetime import datetime

from utils import init_browser, activate_semantic_placeholder, finalize_run, get_cookies_path, setup_common_args, run_main, take_screenshot
from suncherryUtils import get_element_id, pass_login, is_logged_in,go_back

# Load .env file from the same directory as this script
script_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(script_dir, '.env')
load_dotenv(env_path)
print(f'Loaded environment variables from: {env_path}')

def zap(page: Page, trace_folder: str, channel: str = 'SRF 1', max_iterations: int = 3):
    try:
        activate_semantic_placeholder(page, trace_folder)
        page.wait_for_timeout(1000)
          
        print("Click on TV Guide")
        page.wait_for_selector("#flt-semantic-node-6", state="visible", timeout=20000)
        take_screenshot(page, trace_folder, 'click_tv_guide')
        page.locator("#flt-semantic-node-6").click()
        page.wait_for_timeout(2000)
        take_screenshot(page, trace_folder, 'click_tv_guide_success')

        print("Click on LIVE TV tab")
        take_screenshot(page, trace_folder, 'click_live_tv')
        page.wait_for_selector("[aria-label*='LIVE TV']", state="visible")
        page.locator("[aria-label*='LIVE TV']").click()
        page.wait_for_timeout(2000)
        take_screenshot(page, trace_folder, 'click_live_tv')

        start_channel_id_str = get_element_id(page, channel)
        start_channel_id = int(start_channel_id_str.replace('flt-semantic-node-', ''))
        
        print(f'Zap in loop {max_iterations} times')
        for i in range(max_iterations):
            current_channel_id = start_channel_id + i
            print(f"Click on channel {current_channel_id}")
            page.locator(f"[id='flt-semantic-node-{current_channel_id}']").click()
            page.wait_for_timeout(10000)
            take_screenshot(page, trace_folder, f'next_channel_{current_channel_id}')

            go_back(page, trace_folder)
            
        print('Test Success, Zap success')
        take_screenshot(page, trace_folder, 'zap_success')
        page.wait_for_timeout(5000)

        return True
    except Exception as e:
        print(f'Test Failed, Zap failed: {str(e)}')
        take_screenshot(page, trace_folder, 'zap_failed')
        return False

def run(playwright: Playwright, headless=True, debug: bool = False, trace_folder: str = 'suncherry-playwright_trace', screenshots: bool = True, video: bool = True, trace: bool = True, executable_path: str = None, remote_debugging: bool = False, keep_alive: bool = True, url: str = None, channel: str = 'SRF 1 HD', max_iterations: int = 3):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    job_folder = trace_folder  # Use trace_folder as the base job folder directly
    trace_subfolder = os.path.join(job_folder, f"trace_{timestamp}")  # Create a trace subfolder within job_folder
    os.makedirs(trace_subfolder, exist_ok=True)
    trace_file = os.path.join(trace_subfolder, f"{timestamp}.zip")
    cookies_path = get_cookies_path(trace_folder)

    page, context, browser = init_browser(playwright, headless, debug, trace_subfolder if video else None, screenshots, video, trace, cookies_path, executable_path, remote_debugging) 
    page.set_default_timeout(10000)

    try:
        if not is_logged_in(page, url, trace_subfolder):
            pass_login(page, trace_subfolder)
        
        result = zap(page, trace_subfolder, channel, max_iterations)

    except Exception as e:
        print(f"An error occurred during execution: {str(e)}")
        result = False
    finally:
        finalize_run(page, context, browser, trace_subfolder, timestamp, trace_file, video, remote_debugging, keep_alive)
        if result :
            return sys.exit(0)
        else:
            return sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description='Run Suncherry Playwright script')
    parser = setup_common_args(parser)
    parser.add_argument('--url', type=str, help='URL to navigate to', default='https://www.sunrisetv.ch/de/home')
    parser.add_argument('--channel', type=str, help='Channel to select (default: SRF 1)', default='SRF 1 HD')
    parser.add_argument('--max-iterations', type=int, help='Max iterations (default: 3)', default=3)
    args, _ = parser.parse_known_args()

    print(f"Running in {'headless' if args.headless else 'visible'}")
    print(f"Url from args: {args.url}")
    print(f"Channel from args: {args.channel}")
    print(f"Max iterations from args: {args.max_iterations}")
    run_main(run, args)

if __name__ == "__main__":
    main()
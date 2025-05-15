from playwright.sync_api import Playwright
import os
import sys
import argparse
from datetime import datetime
from dotenv import load_dotenv

from utils import init_browser, finalize_run, setup_common_args, run_main, clean_user_data_dir
from suncherryUtils import login, is_logged_in

def get_username_password(username,password):
    if not username or not password:
        # Load .env file from the same directory as this script
        script_dir = os.path.dirname(os.path.abspath(__file__))
        env_path = os.path.join(script_dir, '.env')
        load_dotenv(env_path)
        print(f'Loaded environment variables from: {env_path}')
        username = os.getenv("LOGIN_USERNAME")
        password = os.getenv("LOGIN_PASSWORD")
        print(f"Debug: Username from env: {username}")
        print(f"Debug: Password from env: {password}")

        if not username or not password:
            raise ValueError("Username and password must be provided either as command-line arguments or in .env file")
    
    return username, password

def run(playwright: Playwright, headless=True, debug: bool = False, trace_folder: str = 'suncherry-playwright_trace', screenshots: bool = True, video: bool = True, trace: bool = True, executable_path: str = None, remote_debugging: bool = False, keep_alive: bool = True, url: str = None, username: str = None, password: str = None):
    username,password=get_username_password(username,password)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    trace_subfolder = os.path.join(trace_folder, timestamp)
    os.makedirs(trace_subfolder, exist_ok=True)
    trace_file = os.path.join(trace_subfolder, f"{timestamp}.zip")

    kill_chrome_instances()
    clean_user_data_dir()
    page, context, browser = init_browser(playwright, headless, debug, trace_subfolder if video else None, screenshots, video, trace, executable_path, remote_debugging)
    page.set_default_timeout(10000)
    
    try:
        page.goto(url, timeout=30000)
        page.wait_for_timeout(10000)
        if not is_logged_in(page, url, trace_subfolder):
            login_result = login(page, url,username, password, trace_subfolder)
        else:
            print("Already logged in")
            login_result = True
    except Exception as e:
        print(f"An error occurred during execution: {str(e)}")
        login_result = False
    finally:
        finalize_run(page, context, browser, trace_subfolder, timestamp, trace_file, video, remote_debugging, keep_alive)
        if login_result :
            print("Test successful, login successful")
            return sys.exit(0)
        else:
            print("Test failed, login failed")
            return sys.exit(1)
            input("Press Enter to continue...")

def main():
    parser = argparse.ArgumentParser(description='Run Suncherry Playwright script')
    parser = setup_common_args(parser)
    parser.add_argument('--url', type=str, help='URL to navigate to', default='https://www.sunrisetv.ch/de/home')
    parser.add_argument('--username', type=str, help='Login username')
    parser.add_argument('--password', type=str, help='Login password')
    args, _ = parser.parse_known_args()

    print(f"Running in {'headless' if args.headless else 'visible'}")
    print(f"Url from args: {args.url}")
    print(f"Username from args: {args.username}")
    print(f"Password from args: {args.password}")
    
    run_main(run, args)

if __name__ == "__main__":
    main()
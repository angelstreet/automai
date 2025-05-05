from playwright.sync_api import sync_playwright, Page, Playwright
from time import sleep
import random
import os
import sys
import argparse
from dotenv import load_dotenv
import re
from datetime import datetime
import zipfile


def random_delay(min_seconds=1, max_seconds=3):
    sleep(random.uniform(min_seconds, max_seconds))

def activate_semantic_placeholder(page: Page):
    # Handle shadow DOM elements
    shadow_root_selector = 'body > flutter-view > flt-glass-pane'
    element_inside_shadow_dom_selector = 'flt-semantics-placeholder'
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
        print(f"Error activating semantic placeholder")
        return False


def login(page: Page, url: str, username: str = None, password: str = None, trace_folder: str = None):
    if not username or not password:
        load_dotenv()
        username = os.getenv("login_username")
        password = os.getenv("login_password")

    if not username or not password:
        raise ValueError("Username and password must be provided either as arguments or in .env file")

    activate_semantic_placeholder(page)

    random_delay(1)
    page.locator("#onetrust-accept-btn-handler").click()
    page.locator("#flt-semantic-node-6").click()
    random_delay(3)

    page.locator("#username").fill(username)
    page.locator("#username").press("Tab")
    random_delay(1)
    page.locator("#password").fill(password)
    random_delay(5)

    page.locator("#kc-login").click()
    sleep(5)
    page.reload()
    sleep(5)
    activate_semantic_placeholder(page)
    sleep(1)
    try:
        # Wait for any element containing "Profil" in aria-label
        element = page.get_by_label(re.compile("Profil", re.IGNORECASE))
        if element.count() > 0:
            is_visible = element.is_visible()
            print('Login success')
            return True
        else:
            print('Login failed')
            return False
    except Exception as e:
        print('Login failed:', str(e))
        return False


def init_browser(playwright: Playwright, headless=False, debug: bool = False, video_dir: str = None):
    browser = playwright.chromium.launch(
        headless=headless,
        args=[
            '--disable-blink-features=AutomationControlled', #mandatory to pass sunrise oauth
        ]
       )

    # Extra parameters
    context = browser.new_context(
        viewport={
            "width": 1280,
            "height": 1024,
        },
        record_video_dir=video_dir,
        record_video_size={"width": 1280, "height": 1024},
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        locale="en-US",
        timezone_id="America/New_York",
        java_script_enabled=True,
        ignore_https_errors=True
    )
    
    # Enable tracing with screenshots
    context.tracing.start(screenshots=True, snapshots=True, sources=True)
    
    page = context.new_page()
    if debug:
        page.on(
            "response", lambda response: print(
                f"Response: {response.status} {response.url}"))
        page.on(
            "requestfailed", lambda request: print(
                f"Request failed: {request.url} {request.failure}"))
    return page, context, browser


def run(playwright: Playwright, headless=False, debug: bool = False):
    # Create trace folder before starting the test
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    # Use the temporary folder provided by app.py if available
    temp_folder = os.environ.get('SCRIPT_TEMP_FOLDER', None)
    if temp_folder:
        trace_folder = os.path.join(temp_folder, "suncherry-playwright_trace")
    else:
        trace_folder = "suncherry-playwright_trace"
    trace_subfolder = f"{trace_folder}/{timestamp}"
    os.makedirs(trace_subfolder, exist_ok=True)
    #print(f"Trace subfolder created or already exists: {trace_subfolder}")
    trace_file = f"{trace_subfolder}/{timestamp}.zip"
    
    page, context, browser = init_browser(playwright, headless, debug, trace_subfolder)
    load_dotenv()

    url = "https://www.sunrisetv.ch/de/home"
    page.goto(url, timeout=20 * 1000)
    sleep(5)
    login_result = login(page, url)
    sleep(5)
    page.close()
    # Save tracing data to zip
    context.tracing.stop(path=trace_file)
    print(f"Tracing data saved to: {trace_file}")
    # Unzip the trace file to the timestamped subfolder
    with zipfile.ZipFile(trace_file, 'r') as zip_ref:
        zip_ref.extractall(trace_subfolder)
    #print(f"Trace data extracted to: {trace_subfolder}")
    # Optionally, remove the zip file to keep only the extracted data
    os.remove(trace_file)
    print(f"Zip file removed: {trace_file}")
    # Save video path
    video_path = page.video.path() if page.video else None
    if video_path:
        print(f"Video saved to: {video_path}")
    browser.close()
    return login_result

def main():
    # Simple argument parsing
    parser = argparse.ArgumentParser(description='Run Suncherry Playwright script')
    parser.add_argument('--headless', action='store_true', help='Run in headless mode')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    parser.add_argument('--username', type=str, help='Login username')
    parser.add_argument('--password', type=str, help='Login password')
    # Ignore any additional arguments to prevent errors
    args, _ = parser.parse_known_args()
    
    # Validate credentials at the very start
    username = args.username
    password = args.password
    if not username or not password:
        load_dotenv()
        username = os.getenv("login_username")
        password = os.getenv("login_password")

    if not username or not password:
        raise ValueError("Username and password must be provided either as command-line arguments or in .env file")
    
    print(f"Running in {'headless' if args.headless else 'visible'} mode")
    
    try:
        with sync_playwright() as playwright:
            success = run(playwright, headless=args.headless, debug=args.debug)
            if success:
                print("Login successful")
                sys.exit(0)
            else:
                print("Login failed")
                sys.exit(1)
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        print("Login failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
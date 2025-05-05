from playwright.sync_api import sync_playwright, Page, Playwright
import random
import os
import sys
import argparse
from dotenv import load_dotenv
import re
from datetime import datetime
import zipfile

def activate_semantic_placeholder(page: Page):
    shadow_root_selector = 'body > flutter-view > flt-glass-pane'
    element_inside_shadow_dom_selector = 'flt-semantics-placeholder'
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

def login(page: Page, url: str, username: str, password: str):
    print(f"Debug: Username in login: {username}")
    print(f"Debug: Password in login: {password}")
    if not username or not password:
        raise ValueError("Username and password must be provided")

    activate_semantic_placeholder(page)
    page.wait_for_timeout(2000)

    page.wait_for_selector("#onetrust-accept-btn-handler", state="visible")
    page.wait_for_timeout(1000)
    print("Accept cookies")
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
    page.wait_for_timeout(1000)
    print("Click on login")
    page.locator("#kc-login").click()
    
    print("Wait for 10 seconds")
    page.wait_for_timeout(10000)

    print("Reload page")
    page.reload()

    print("Wait for 10 seconds")
    page.wait_for_timeout(10000)

    activate_semantic_placeholder(page)
    page.wait_for_timeout(1000)

    try:
        element = page.get_by_label(re.compile("Profil", re.IGNORECASE))
        if element.count() > 0 and element.is_visible():
            print('Login success')
            return True
        else:
            print('Login failed')
            return False
    except Exception as e:
        print(f'Login failed: {str(e)}')
        return False

def init_browser(playwright: Playwright, headless=False, debug: bool = False, video_dir: str = None):
    browser = playwright.chromium.launch(
        headless=headless,
        args=['--disable-blink-features=AutomationControlled']
    )

    context = browser.new_context(
        viewport={"width": 1280, "height": 1024},
        record_video_dir=video_dir,
        record_video_size={"width": 1280, "height": 1024},
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        locale="en-US",
        timezone_id="America/New_York",
        java_script_enabled=True,
        ignore_https_errors=True
    )

    context.tracing.start(screenshots=True, snapshots=True, sources=True)
    page = context.new_page()
    if debug:
        page.on("response", lambda response: print(f"Response: {response.status} {response.url}"))
        page.on("requestfailed", lambda request: print(f"Request failed: {request.url} {request.failure}"))
    return page, context, browser

def run(playwright: Playwright, username: str, password: str, headless=False, debug: bool = False):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    temp_folder = os.environ.get('SCRIPT_TEMP_FOLDER', None)
    trace_folder = "suncherry-playwright_trace"
    trace_subfolder = f"{trace_folder}/{timestamp}"
    os.makedirs(trace_subfolder, exist_ok=True)
    trace_file = f"{trace_subfolder}/{timestamp}.zip"

    page, context, browser = init_browser(playwright, headless, debug, trace_subfolder)
    url = "https://www.sunrisetv.ch/de/home"
    page.set_default_timeout(5000)
    page.goto(url, timeout=30000)
    page.wait_for_timeout(10000)

    login_result = login(page, url, username, password)
    page.wait_for_timeout(5000)
    page.close()

    context.tracing.stop(path=trace_file)
    print(f"Tracing data saved to: {trace_file}")
    with zipfile.ZipFile(trace_file, 'r') as zip_ref:
        zip_ref.extractall(trace_subfolder)
    os.remove(trace_file)
    print(f"Zip file removed: {trace_file}")

    video_path = page.video.path() if page.video else None
    if video_path:
        print(f"Video saved to: {video_path}")
    browser.close()
    return login_result

def main():
    parser = argparse.ArgumentParser(description='Run Suncherry Playwright script')
    parser.add_argument('--headless', action='store_true', help='Run in headless mode')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    parser.add_argument('--username', type=str, help='Login username')
    parser.add_argument('--password', type=str, help='Login password')
    args, _ = parser.parse_known_args()

    print(f"Debug: Username from args: {args.username}")
    print(f"Debug: Password from args: {args.password}")

    username = args.username
    password = args.password
    if not username or not password:
        load_dotenv()
        username = os.getenv("login_username")
        password = os.getenv("login_password")
        print(f"Debug: Username from env: {username}")
        print(f"Debug: Password from env: {password}")

    if not username or not password:
        raise ValueError("Username and password must be provided either as command-line arguments or in .env file")

    print(f"Running in {'headless' if args.headless else 'visible'} mode")

    try:
        with sync_playwright() as playwright:
            success = run(playwright, username, password, headless=args.headless, debug=args.debug)
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
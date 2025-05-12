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
    
def activate_semantic_placeholder(page: Page):
    shadow_root_selector = 'body > flutter-view > flt-glass-pane'
    element_inside_shadow_dom_selector = 'flt-semantics-placeholder'
    try:
        flutter_view_present = page.locator(shadow_root_selector).count() > 0
        print(f"Page state check: Flutter view present: {flutter_view_present}")
        if not flutter_view_present:
            print("Skipping semantic placeholder activation as flutter view is not present.")
            return False
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
    except Exception as e:
        print(f"Error in semantic placeholder activation: {str(e)}")
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
    page.wait_for_timeout(15000)

    # Log cookies before reload for debugging
    cookies_before = page.context.cookies()
    print(f"Cookies before reload: {len(cookies_before)} cookies found")
    for cookie in cookies_before:
        print(f"Cookie: {cookie.get('name', 'Unknown')} - {cookie.get('value', 'No value')}")

    """
    try:
        print("Reload page")
        page.reload(timeout=20000)
        page.wait_for_timeout(5000)
    except :
        print("Failed to reload...Continue test")
    """

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

def init_browser(playwright: Playwright, headless=True, debug: bool = False, video_dir: str = None, screenshots: bool = True, video: bool = True, source: bool = True, cookies_path: str = None):
    browser = playwright.chromium.launch(
        headless=headless,
        args=['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--disable-gpu', '--start-maximized', '--window-position=0,0']
    )

    context = browser.new_context(
        viewport={"width": 1920, "height": 1080},  # Set viewport to match VNC geometry
        record_video_dir=video_dir if video else None,
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        locale="en-US",
        timezone_id="Europe/Zurich",
        java_script_enabled=True,
        ignore_https_errors=True
    )

    # Load cookies from file if they exist
    if cookies_path: 
        if not os.path.exists(cookies_path):
            os.makedirs(cookies_path, exist_ok=True)
            print("Creating cookies folder:", cookies_path)
        else:
            print("Cookies folder exists but we will not use it")

    context.tracing.start(screenshots=screenshots, snapshots=True, sources=source)
    page = context.new_page()
    if debug:
        page.on("response", lambda response: print(f"Response: {response.status} {response.url}"))
        page.on("requestfailed", lambda request: print(f"Request failed: {request.url} {request.failure}"))
    return page, context, browser

def run(playwright: Playwright, username: str, password: str, headless=True, debug: bool = False, trace_folder: str = 'suncherry-playwright_trace', screenshots: bool = True, video: bool = True, source: bool = True, cookies: bool = True):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    trace_subfolder = f"{trace_folder}/{timestamp}"
    os.makedirs(trace_subfolder, exist_ok=True)
    trace_file = f"{trace_subfolder}/{timestamp}.zip"

    if cookies:
        cookies_path = os.path.dirname(trace_folder)
    else:
        cookies_path = None

    page, context, browser = init_browser(playwright, headless, debug, trace_subfolder if video else None, screenshots, video, source, cookies_path)
    url = "https://www.sunrisetv.ch/de/home"
    page.set_default_timeout(10000)
    
    try:
        page.goto(url, timeout=60000)
        page.wait_for_timeout(10000)

        login_result = login(page, url, username, password)
        # Save cookies immediately after successful login
        if cookies_path:
            cookies_file = os.path.join(cookies_path, 'cookies.json')
            try:
                os.makedirs(cookies_path, exist_ok=True)
                cookies_data = page.context.cookies()
                with open(cookies_file, 'w') as f:
                    json.dump(cookies_data, f, indent=2)
                print(f"Saved cookies to {cookies_file} after successful login")
            except Exception as e:
                print(f"Error saving cookies to {cookies_file}: {str(e)}")
        page.wait_for_timeout(10000)
    except Exception as e:
        print(f"An error occurred during execution: {str(e)}")
        login_result = False
    finally:
        # Take a screenshot before closing the page for debugging purposes
        try:
            screenshot_path = f"{trace_subfolder}/final_state_{timestamp}.png"
            page.screenshot(path=screenshot_path, full_page=True, timeout=20000)
            print(f"Screenshot saved to: {screenshot_path}")
        except Exception as e:
            print(f"Error taking final screenshot: {str(e)}")
        
        # Removed cookie saving here as it's now done after successful login
        page.close()
        try:
            context.tracing.stop(path=trace_file)
            print(f"Tracing data saved to: {trace_file}")
            with zipfile.ZipFile(trace_file, 'r') as zip_ref:
                zip_ref.extractall(trace_subfolder)
            os.remove(trace_file)
            print(f"Zip file removed: {trace_file}")
        except Exception as e:
            print(f"Error saving or extracting trace data: {str(e)}")

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
    parser.add_argument('--trace_folder', type=str, default='suncherry-playwright_trace', help='Folder for storing trace data')
    parser.add_argument('--no-screenshots', action='store_true', default=False, help='Disable screenshots in tracing (default: enabled)')
    parser.add_argument('--no-video', action='store_true', default=False, help='Disable video recording (default: enabled)')
    parser.add_argument('--no-trace', action='store_true', default=False, help='Disable source tracing (default: enabled)')
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

    print(f"Running in {'headless' if args.headless else 'visible'} mode with {'no-video' if args.no_video else 'video'}, {'no-screenshots' if args.no_screenshots else 'screenshots'}, {'no-trace' if args.no_trace else 'trace'}")

    try:
        with sync_playwright() as playwright:
            success = run(playwright, username, password, headless=args.headless, debug=args.debug, trace_folder=args.trace_folder, screenshots=not args.no_screenshots, video=not args.no_video, source=not args.no_trace)
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
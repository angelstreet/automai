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

def zap(page: Page, url: str, channel: str = 'RTS 1'):
    try:
        activate_semantic_placeholder(page)
        page.wait_for_timeout(2000)

        page.wait_for_selector("#flt-semantic-node-6", state="visible")
        print("Click on TV Guide")
        page.locator("#flt-semantic-node-6").click()

        page.wait_for_selector("#flt-semantic-node-233", state="visible")
        print("Click on LIVE TV tab")
        page.locator("#flt-semantic-node-233").click()

        page.wait_for_selector(f'[aria-label*="{channel}"]', state="visible")
        print("Click on specific channel")
        page.locator(f'[aria-label*="{channel}"]').click()

        print('Zap success')
        return True
    except Exception as e:
        print(f'Zap failed: {str(e)}')
        return False

def init_browser(playwright: Playwright, headless=False, debug: bool = False, video_dir: str = None, screenshots: bool = True, video: bool = True, source: bool = True, cookies: bool = True):
    browser = playwright.chromium.launch(
        headless=headless,
        args=['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--disable-gpu']
    )

    if cookies:
        cookies_path = video_dir if video_dir else None
        # Ensure the cookies directory exists only if a path is provided
        if cookies_path:
            print("Creating or using cookies path:", cookies_path)
            os.makedirs(cookies_path, exist_ok=True)

    context = browser.new_context(
        viewport={"width": 1024, "height": 768},
        record_video_dir=video_dir if video else None,
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        locale="en-US",
        timezone_id="America/New_York",
        java_script_enabled=True,
        ignore_https_errors=True
    )

    # Load cookies from file if they exist
    if cookies and cookies_path:
        cookies_file = os.path.join(cookies_path, 'cookies.json')
        if os.path.exists(cookies_file):
            try:
                with open(cookies_file, 'r') as f:
                    cookies_data = json.load(f)
                context.add_cookies(cookies_data)
                print(f"Loaded cookies from {cookies_file}")
            except Exception as e:
                print(f"Error loading cookies from {cookies_file}: {str(e)}")
        else:
            print(f"No cookies file found at {cookies_file}")

    context.tracing.start(screenshots=screenshots, snapshots=True, sources=source)
    page = context.new_page()
    if debug:
        page.on("response", lambda response: print(f"Response: {response.status} {response.url}"))
        page.on("requestfailed", lambda request: print(f"Request failed: {request.url} {request.failure}"))
    return page, context, browser

def run(playwright: Playwright, headless=False, debug: bool = False, trace_folder: str = 'suncherry-playwright_trace', screenshots: bool = True, video: bool = True, source: bool = True, cookies: bool = True, channel: str = 'RTS 1'):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    trace_subfolder = f"{trace_folder}/{timestamp}"
    os.makedirs(trace_subfolder, exist_ok=True)
    trace_folder = f"{trace_subfolder}/{timestamp}.zip"

    page, context, browser = init_browser(playwright, headless, debug, trace_subfolder if video else None, screenshots, video, source, trace_subfolder if cookies else None)
    url = "https://www.sunrisetv.ch/de/home"
    page.set_default_timeout(10000)

    try:
        page.goto(url, timeout=60000)
        page.wait_for_timeout(10000)
        print("We suppose we are already logged in and cookies are loaded")
        zap(page, url, channel)
        page.wait_for_timeout(10000)
    except Exception as e:
        print(f"An error occurred during execution: {str(e)}")
    finally:
        # Take a screenshot before closing the page for debugging purposes
        try:
            screenshot_path = f"{trace_subfolder}/final_state_{timestamp}.png"
            page.screenshot(path=screenshot_path, full_page=True, timeout=20000)
            print(f"Screenshot saved to: {screenshot_path}")
        except Exception as e:
            print(f"Error taking final screenshot: {str(e)}")
        
        # Save cookies to file if cookies option is enabled
        if cookies:
            cookies_path = trace_subfolder
            cookies_file = os.path.join(cookies_path, 'cookies.json')
            try:
                os.makedirs(cookies_path, exist_ok=True)
                cookies_data = context.cookies()
                with open(cookies_file, 'w') as f:
                    json.dump(cookies_data, f, indent=2)
                print(f"Saved cookies to {cookies_file}")
            except Exception as e:
                print(f"Error saving cookies to {cookies_file}: {str(e)}")
        
        page.close()
        try:
            context.tracing.stop(path=trace_folder)
            print(f"Tracing data saved to: {trace_folder}")
            with zipfile.ZipFile(trace_folder, 'r') as zip_ref:
                zip_ref.extractall(trace_subfolder)
            os.remove(trace_folder)
            print(f"Zip file removed: {trace_folder}")
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
    parser.add_argument('--trace_folder', type=str, default='suncherry-playwright_trace', help='Folder for storing trace data')
    parser.add_argument('--no-screenshots', action='store_true', default=False, help='Disable screenshots in tracing (default: enabled)')
    parser.add_argument('--no-video', action='store_true', default=False, help='Disable video recording (default: enabled)')
    parser.add_argument('--no-trace', action='store_true', default=False, help='Disable source tracing (default: enabled)')
    parser.add_argument('--channel', type=str, default='RTS 1', help='Channel to select (default: RTS 1)')
    args, _ = parser.parse_known_args()

    print(f"Running in {'headless' if args.headless else 'visible'} mode with {'no-video' if args.no_video else 'video'}, {'no-screenshots' if args.no_screenshots else 'screenshots'}, {'no-trace' if args.no_trace else 'trace'}, targeting channel: {args.channel}")

    try:
        with sync_playwright() as playwright:
            success = run(playwright, headless=args.headless, debug=args.debug, trace_folder=args.trace_folder, screenshots=not args.no_screenshots, video=not args.no_video, source=not args.no_trace, channel=args.channel)
            if success:
                print("Test successful")
                sys.exit(0)
            else:
                print("Test failed")
                sys.exit(1)
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        print("Login failed")
        sys.exit(1)

if __name__ == "__main__":
    main()
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

# Load .env file from the same directory as this script
script_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(script_dir, '.env')
load_dotenv(env_path)
print(f'Loaded environment variables from: {env_path}')

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

def pass_login(page: Page, url: str, channel: str = 'RTS 1'):
    try:
        activate_semantic_placeholder(page)
        page.wait_for_timeout(2000)
        page.wait_for_selector("#flt-semantic-node-6", state="visible")
        page.click("#flt-semantic-node-6")
        print('Login screen skipped')
        page.wait_for_timeout(10000)
        return True
    except Exception as e:
        print(f'Login screen not shown or skipped: {str(e)}')
        return True

def zap(page: Page, url: str, channel: str = 'RTS 1'):
    try:
        activate_semantic_placeholder(page)
        page.wait_for_timeout(2000)

        page.wait_for_selector("#flt-semantic-node-6", state="visible", timeout=20000)
        print("Click on TV Guide")
        page.locator("#flt-semantic-node-6").click()

        page.wait_for_selector("[aria-label*='LIVE TV']", state="visible")
        print("Click on LIVE TV tab")
        page.locator("[aria-label*='LIVE TV']").click()

        page.wait_for_selector(f'[aria-label*="{channel}"]', state="visible")
        print("Click on specific channel")
        page.locator(f'[aria-label*="{channel}"]').click()
        page.wait_for_timeout(1000000)
        print('Zap success')
        return True
    except Exception as e:
        print(f'Zap failed: {str(e)}')
        return False

def init_browser(playwright: Playwright, headless=True, debug: bool = False, video_dir: str = None, screenshots: bool = True, video: bool = True, source: bool = True, cookies_path: str = None, executable_path: str = None, remote_debugging: bool = False):
    browser_args = ['--disable-blink-features=AutomationControlled','--disable-gpu', '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--window-position=0,0']
    
    if executable_path:
        browser = playwright.chromium.launch(
            headless=headless,
            executable_path=executable_path,
            args=browser_args
        )
        print(f"Using custom Chrome executable at: {executable_path}")
    else:
        browser = playwright.chromium.launch(
            headless=headless,
            args=browser_args
        )
        print("Using default Chromium browser")

    # Ensure the cookies directory exists only if a path is provided
    if cookies_path:
        if not os.path.exists(cookies_path):
            os.makedirs(cookies_path, exist_ok=True)
            print("Creating cookies folder:", cookies_path)
        else:
            print("Cookies folder exists")

    context = browser.new_context(
        viewport={"width": 1920, "height": 1080},  # Set a large viewport for fullscreen experience
        record_video_dir=video_dir if video else None,
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
        locale="fr-FR",
        timezone_id="Europe/Zurich"
    )
    context.set_extra_http_headers({
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
        "Sec-CH-UA": '"Google Chrome";v="136", "Not)A;Brand";v="99", "Chromium";v="136"',
        "Sec-CH-UA-Platform": '"macOS"'
    })
    # Load cookies from file if they exist
    if cookies_path: 
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
    page.evaluate("window.resizeTo(1920, 1080)")
    print("Set browser window size to 1920x1080 to match viewport")

    # Spoof navigator properties
    page.evaluate('''() => {
        Object.defineProperty(navigator, "platform", { get: () => "MacIntel" });
        Object.defineProperty(navigator, "language", { get: () => "fr-FR" });
        Object.defineProperty(navigator, "languages", { get: () => ["fr-FR", "fr", "en-US", "en"] });
        Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 });
        Object.defineProperty(navigator, "deviceMemory", { get: () => 8 });
        Object.defineProperty(window, "devicePixelRatio", { get: () => 2 });
    }''')

    # Spoof WebGL
    page.evaluate('''() => {
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
            if (parameter === 37446) return "Apple Inc.";
            if (parameter === 37447) return "ANGLE (Apple, Apple M1, OpenGL ES 3.0)";
            return getParameter.apply(this, arguments);
        };
    }''')
    
    if debug:
        #page.on("request", lambda request: print(f"Request Headers: {request.headers}"))
        page.on("response", lambda response: print(f"Response: {response.status} {response.url}"))
        page.on("requestfailed", lambda request: print(f"Request failed: {request.url} {request.failure}"))
    return page, context, browser

def run(playwright: Playwright, headless=True, debug: bool = False, trace_folder: str = 'suncherry-playwright_trace', screenshots: bool = True, video: bool = True, source: bool = True, cookies: bool = True, channel: str = 'RTS 1', executable_path: str = None, remote_debugging: bool = False):
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    job_folder = trace_folder  # Use trace_folder as the base job folder directly
    trace_subfolder = f'{job_folder}/trace_{timestamp}'  # Create a trace subfolder within job_folder
    os.makedirs(trace_subfolder, exist_ok=True)
    trace_file = f'{trace_subfolder}/{timestamp}.zip'

    if cookies:
        # Ensure trace_folder is an absolute path to avoid empty dirname
        abs_trace_folder = os.path.abspath(trace_folder)
        cookies_path = os.path.dirname(abs_trace_folder) if os.path.dirname(abs_trace_folder) else abs_trace_folder
        print(f'Debug: Setting cookies_path to: {cookies_path} based on absolute trace_folder: {abs_trace_folder}')
    else:
        cookies_path = None

    page, context, browser = init_browser(playwright, headless, debug, trace_subfolder if video else None, screenshots, video, source, cookies_path, executable_path, remote_debugging)
    url = "https://www.sunrisetv.ch/de/home"
    page.set_default_timeout(10000)

    try:
        page.goto(url, timeout=60000)
        page.wait_for_timeout(5000)
        if debug :
            user_agent = page.evaluate("navigator.userAgent")
            navigator_props = page.evaluate('''() => ({
                webdriver: navigator.webdriver,
                platform: navigator.platform,
                language: navigator.language,
                languages: navigator.languages,
                hardwareConcurrency: navigator.hardwareConcurrency,
                deviceMemory: navigator.deviceMemory,
                devicePixelRatio: window.devicePixelRatio
            })''')
            webgl_info = page.evaluate('''() => {
                const canvas = document.createElement("canvas");
                const gl = canvas.getContext("webgl");
                return {
                    renderer: gl.getParameter(gl.RENDERER),
                    vendor: gl.getParameter(gl.VENDOR)
                };
            }''')
            print(f"Playwright WebGL: {webgl_info}")
            print(f"Playwright Navigator Properties: {navigator_props}")
            print(f"Playwright User Agent: {user_agent}")
        print("We suppose we are already logged in and cookies are loaded")
        pass_login(page, url)
        loaded_cookies = context.cookies()
        print(f"Loaded cookies count: {len(loaded_cookies)}")
        result = zap(page, url, channel)
        page.wait_for_timeout(10000)
    except Exception as e:
        print(f"An error occurred during execution: {str(e)}")
        result = False
    finally:
        # Take a screenshot before closing the page for debugging purposes
        try:
            screenshot_path = f"{trace_subfolder}/final_state_{timestamp}.png"
            page.screenshot(path=screenshot_path, full_page=True, timeout=20000)
            print(f"Screenshot saved to: {screenshot_path}")
        except Exception as e:
            print(f"Error taking final screenshot: {str(e)}")
        
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
    
    return result

def main():
    parser = argparse.ArgumentParser(description='Run Suncherry Playwright script')
    parser.add_argument('--headless', action='store_true', help='Run in headless mode')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    parser.add_argument('--trace_folder', type=str, default='suncherry-playwright_trace', help='Folder for storing trace data')
    parser.add_argument('--no-screenshots', action='store_true', default=False, help='Disable screenshots in tracing (default: enabled)')
    parser.add_argument('--no-video', action='store_true', default=False, help='Disable video recording (default: enabled)')
    parser.add_argument('--no-trace', action='store_true', default=False, help='Disable source tracing (default: enabled)')
    parser.add_argument('--channel', type=str, default='SRF 1', help='Channel to select (default: SRF 1)')
    parser.add_argument('--executable_path', type=str, help='Path to Google Chrome executable, defaults to Chromium if not provided')
    parser.add_argument('--remote-debugging', action='store_true', default=False, help='Connect to an existing Chrome instance via remote debugging on port 9222')
    args, _ = parser.parse_known_args()

    print(f"Running in {'headless' if args.headless else 'visible'} mode with {'no-video' if args.no_video else 'video'}, {'no-screenshots' if args.no_screenshots else 'screenshots'}, {'no-trace' if args.no_trace else 'trace'}, targeting channel: {args.channel}, {'with remote debugging' if args.remote_debugging else 'without remote debugging'}")

    try:
        with sync_playwright() as playwright:
            success = run(playwright, headless=args.headless, debug=args.debug, trace_folder=args.trace_folder, screenshots=not args.no_screenshots, video=not args.no_video, source=not args.no_trace, channel=args.channel, executable_path=args.executable_path, remote_debugging=args.remote_debugging)
            if success:
                print('Test successful')
                sys.exit(0)
            else:
                print('Test failed')
                sys.exit(1)
    except Exception as e:
        print(f'An error occurred: {str(e)}')
        print('Login failed')
        sys.exit(1)

if __name__ == "__main__":
    main()
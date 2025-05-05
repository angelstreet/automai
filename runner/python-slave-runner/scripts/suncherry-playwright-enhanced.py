from playwright.sync_api import sync_playwright, Page, Playwright
import os
import sys
import argparse
from dotenv import load_dotenv
import re
from datetime import datetime
import zipfile
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Default timeout configuration (in milliseconds)
DEFAULT_TIMEOUT = 10000  # 10 seconds

def activate_semantic_placeholder(page: Page) -> bool:
    """
    Activates the semantic placeholder within the shadow DOM, polling for its existence.
    """
    shadow_root_selector = 'body > flutter-view > flt-glass-pane'
    element_inside_shadow_dom_selector = 'flt-semantics-placeholder'

    try:
        # Wait for the shadow DOM host to be available
        page.wait_for_selector(shadow_root_selector, state="visible", timeout=DEFAULT_TIMEOUT)
        
        # Poll for the shadow DOM element using wait_for_function
        page.wait_for_function(
            """
            ([shadowRootSelector, elementSelector]) => {
                const shadowHost = document.querySelector(shadowRootSelector);
                if (shadowHost && shadowHost.shadowRoot) {
                    return !!shadowHost.shadowRoot.querySelector(elementSelector);
                }
                return false;
            }
            """,
            [shadow_root_selector, element_inside_shadow_dom_selector],
            timeout=DEFAULT_TIMEOUT
        )

        # Click the element inside the shadow DOM
        clicked = page.evaluate(
            """
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
            """, [shadow_root_selector, element_inside_shadow_dom_selector]
        )

        if clicked:
            logger.info("Semantic placeholder activated.")
            return True
        else:
            logger.error("Error activating semantic placeholder: Element not clickable")
            return False
    except Exception as e:
        logger.error(f"Error activating semantic placeholder: {str(e)}")
        return False

def login(page: Page, url: str, username: str = None, password: str = None) -> bool:
    """
    Performs login with dynamic waiting and improved error handling.
    """
    if not username or not password:
        load_dotenv()
        username = os.getenv("login_username")
        password = os.getenv("login_password")

    if not username or not password:
        raise ValueError("Username and password must be provided either as arguments or in .env file")

    try:
        # Wait for page to fully load
        page.wait_for_load_state("networkidle", timeout=DEFAULT_TIMEOUT)

        # Activate semantic placeholder
        if not activate_semantic_placeholder(page):
            logger.error("Failed to activate semantic placeholder")
            return False

        # Accept cookie consent
        page.wait_for_selector("#onetrust-accept-btn-handler", state="visible", timeout=DEFAULT_TIMEOUT)
        page.locator("#onetrust-accept-btn-handler").click()
        logger.info("Cookie consent accepted")

        # Click login button
        page.wait_for_selector("#flt-semantic-node-6", state="visible", timeout=DEFAULT_TIMEOUT)
        page.locator("#flt-semantic-node-6").click()
        logger.info("Clicked ANMELDEN button")

        # Fill username
        page.wait_for_selector("#username", state="visible", timeout=DEFAULT_TIMEOUT)
        page.locator("#username").fill(username)
        page.locator("#username").press("Tab")
        logger.info("Filled username")

        # Fill password
        page.wait_for_selector("#password", state="visible", timeout=DEFAULT_TIMEOUT)
        page.locator("#password").fill(password)
        logger.info("Filled password")

        # Submit login
        page.wait_for_selector("#kc-login", state="visible", timeout=DEFAULT_TIMEOUT)
        page.locator("#kc-login").click()
        logger.info("Clicked Anmelden button")

        # Wait for navigation or error
        page.wait_for_load_state("networkidle", timeout=DEFAULT_TIMEOUT)
        page.reload()
        page.wait_for_load_state("networkidle", timeout=DEFAULT_TIMEOUT)

        # Re-activate semantic placeholder after reload
        if not activate_semantic_placeholder(page):
            logger.error("Failed to activate semantic placeholder after reload")
            return False

        # Check for successful login
        element = page.get_by_label(re.compile("Profil", re.IGNORECASE))
        element.wait_for(state="visible", timeout=DEFAULT_TIMEOUT)
        logger.info("Login successful")
        return True

    except Exception as e:
        logger.error(f"Login failed: {str(e)}")
        return False

def login_with_retry(page: Page, url: str, username: str, password: str, max_attempts=3) -> bool:
    """
    Attempts login with retries to handle transient failures.
    """
    for attempt in range(max_attempts):
        logger.info(f"Login attempt {attempt + 1}/{max_attempts}")
        page.goto(url, timeout=20 * 1000)
        page.wait_for_load_state("networkidle", timeout=DEFAULT_TIMEOUT)
        if login(page, url, username, password):
            return True
        logger.warning("Retrying due to login failure...")
        page.reload()
        page.wait_for_load_state("networkidle", timeout=DEFAULT_TIMEOUT)
    logger.error("All login attempts failed")
    return False

def init_browser(playwright: Playwright, headless=False, debug: bool = False, video_dir: str = None):
    """
    Initializes the browser with stealth techniques and enhanced configuration.
    """
    browser = playwright.chromium.launch(
        headless=headless,
        channel="chrome",  # Use latest Chrome
        args=[
            '--disable-blink-features=AutomationControlled',  # Avoid automation detection
            '--enable-gpu',  # Enable GPU for WebGL
            '--use-gl=desktop'  # Use desktop OpenGL
        ]
    )

    context = browser.new_context(
        viewport={"width": 1280, "height": 1024},
        record_video_dir=video_dir,
        record_video_size={"width": 1280, "height": 1024},
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        locale="de-CH",
        timezone_id="Europe/Zurich",
        java_script_enabled=True,
        ignore_https_errors=True,
        storage_state=None,  # Persist cookies
        extra_http_headers={
            "Accept-Language": "de-CH,de;q=0.9",
            "Referer": "https://www.sunrisetv.ch/de/home",
            "Origin": "https://www.sunrisetv.ch"
        }
    )

    # Apply stealth techniques to avoid bot detection
    context.add_init_script("""
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
        Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 });
        Object.defineProperty(window, 'chrome', { get: () => ({ runtime: {} }) });
    """)

    # Enable tracing with screenshots
    context.tracing.start(screenshots=True, snapshots=True, sources=True)
    
    page = context.new_page()
    page.set_default_timeout(DEFAULT_TIMEOUT)  # Set default timeout for all actions

    if debug:
        page.on("request", lambda request: logger.debug(f"Request: {request.method} {request.url} {request.headers}"))
        page.on("response", lambda response: logger.debug(f"Response: {response.status} {response.url}"))
        page.on("console", lambda msg: logger.debug(f"Console: {msg.text}"))
        page.on("pageerror", lambda error: logger.error(f"Page error: {error}"))
        page.on("requestfailed", lambda request: logger.error(f"Request failed: {request.url} {request.failure}"))

    return page, context, browser

def run(playwright: Playwright, headless=False, debug: bool = False):
    """
    Main execution function for the Playwright script.
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    temp_folder = os.environ.get('SCRIPT_TEMP_FOLDER', None)
    trace_folder = os.path.join(temp_folder or ".", "suncherry-playwright_trace")
    trace_subfolder = f"{trace_folder}/{timestamp}"
    os.makedirs(trace_subfolder, exist_ok=True)
    trace_file = f"{trace_subfolder}/{timestamp}.zip"
    
    page, context, browser = init_browser(playwright, headless, debug, trace_subfolder)
    load_dotenv()

    try:
        url = "https://www.sunrisetv.ch/de/home"
        login_result = login_with_retry(page, url, username=None, password=None)
        
        page.close()
        context.tracing.stop(path=trace_file)
        logger.info(f"Tracing data saved to: {trace_file}")

        # Unzip trace file
        with zipfile.ZipFile(trace_file, 'r') as zip_ref:
            zip_ref.extractall(trace_subfolder)
        logger.info(f"Trace data extracted to: {trace_subfolder}")
        os.remove(trace_file)
        logger.info(f"Zip file removed: {trace_file}")

        # Save video path
        video_path = page.video.path() if page.video else None
        if video_path:
            logger.info(f"Video saved to: {video_path}")

        return login_result

    finally:
        browser.close()

def main():
    """
    Entry point for the script with argument parsing.
    """
    parser = argparse.ArgumentParser(description='Run Suncherry Playwright script')
    parser.add_argument('--headless', action='store_true', help='Run in headless mode')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    parser.add_argument('--username', type=str, help='Login username')
    parser.add_argument('--password', type=str, help='Login password')
    args, _ = parser.parse_known_args()

    # Validate credentials
    username = args.username
    password = args.password
    if not username or not password:
        load_dotenv()
        username = os.getenv("login_username")
        password = os.getenv("login_password")

    if not username or not password:
        raise ValueError("Username and password must be provided either as command-line arguments or in .env file")

    logger.info(f"Running in {'headless' if args.headless else 'visible'} mode")

    try:
        with sync_playwright() as playwright:
            success = run(playwright, headless=args.headless, debug=args.debug)
            if success:
                logger.info("Login successful")
                sys.exit(0)
            else:
                logger.error("Login failed")
                sys.exit(1)
    except Exception as e:
        logger.error(f"An error occurred: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
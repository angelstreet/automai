from playwright.sync_api import sync_playwright, Page, Playwright
from time import sleep
import random
import os
import sys
import argparse
from dotenv import load_dotenv
import re


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


def login(page: Page, url: str, username: str = None, password: str = None):
    if not username or not password:
        load_dotenv()
        username = os.getenv("login_username")
        password = os.getenv("login_password")

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
        else:
            print('Login failed')
    except Exception as e:
        print('Login failed:', str(e))


def init_browser(playwright: Playwright, headless=False, debug: bool = False):
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
            "height": 1024
        },
        )
    
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
    page, context, browser = init_browser(playwright, headless, debug)
    load_dotenv()

    url = "https://www.sunrisetv.ch/de/home"
    page.goto(url, timeout=20 * 1000)
    sleep(10)
    login(page, url)
    sleep(3000)
    page.close()


def main():
    # Simple argument parsing
    parser = argparse.ArgumentParser(description='Run Suncherry Playwright script')
    parser.add_argument('--headless', action='store_true', help='Run in headless mode')
    parser.add_argument('--debug', action='store_true', help='Enable debug mode')
    # Ignore any additional arguments to prevent errors
    args, _ = parser.parse_known_args()
    
    print(f"Running in {'headless' if args.headless else 'visible'} mode")
    
    with sync_playwright() as playwright:
        run(playwright, headless=args.headless, debug=args.debug)


if __name__ == "__main__":
    main()
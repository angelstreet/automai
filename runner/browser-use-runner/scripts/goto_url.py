from playwright.sync_api import sync_playwright
import argparse

# Set up command line argument parsing
parser = argparse.ArgumentParser(description='Open a URL in Chromium browser')
parser.add_argument('--url', type=str, default="https://www.youtube.com", 
                    help='URL to navigate to (default: https://www.youtube.com)')
parser.add_argument('--headless', action='store_true', 
                    help='Run browser in headless mode')
args, unknown = parser.parse_known_args()

with sync_playwright() as p:
    browser = p.chromium.launch(headless=args.headless)
    page = browser.new_page()
    page.goto(args.url)
    page.wait_for_timeout(2000)
    browser.close()
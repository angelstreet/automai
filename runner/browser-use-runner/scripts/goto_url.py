from playwright.sync_api import sync_playwright
import argparse
import os
from datetime import datetime

# Set up command line argument parsing
parser = argparse.ArgumentParser(description='Open a URL in Chromium browser')
parser.add_argument('--url', type=str, default="https://www.youtube.com", 
                    help='URL to navigate to (default: https://www.youtube.com)')
parser.add_argument('--headless', action='store_true', 
                    help='Run browser in headless mode')
parser.add_argument('--trace_folder', type=str,
                    help='Folder path to save trace, screenshots and video')
args, unknown = parser.parse_known_args()

with sync_playwright() as p:
    # Set up browser context options
    context_options = {}
    
    # Configure recording if trace_folder is provided
    if args.trace_folder:
        # Create the directory if it doesn't exist
        os.makedirs(args.trace_folder, exist_ok=True)
        
        # Set up video recording
        context_options["record_video_dir"] = args.trace_folder
    
    # Launch browser
    browser = p.chromium.launch(headless=args.headless)
    
    # Create context with options
    context = browser.new_context(**context_options)
    
    # Start tracing if trace_folder is provided
    if args.trace_folder:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        trace_path = os.path.join(args.trace_folder, f"trace_{timestamp}.zip")
        context.tracing.start(screenshots=True, snapshots=True)
    
    # Create page and navigate
    page = context.new_page()
    page.goto(args.url)
    page.wait_for_timeout(2000)
    
    # Take screenshot if trace_folder is provided
    if args.trace_folder:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        screenshot_path = os.path.join(args.trace_folder, f"screenshot_{timestamp}.png")
        page.screenshot(path=screenshot_path)
        
        # Stop tracing and save the trace
        context.tracing.stop(path=trace_path)
    
    # Close browser
    browser.close()
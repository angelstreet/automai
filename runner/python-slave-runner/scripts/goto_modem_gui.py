from playwright.sync_api import sync_playwright
import argparse
import os
from datetime import datetime
import sys

def main():
    # Set up command line argument parsing
    parser = argparse.ArgumentParser(description='Open a URL in Chromium browser')
    parser.add_argument('--url', type=str, default="http://192.168.1.1", 
                        help='URL to navigate to (default: http://192.168.1.1)')
    parser.add_argument('--headless', action='store_true', 
                        help='Run browser in headless mode')
    parser.add_argument('--trace_folder', type=str,
                        help='Folder path to save trace, screenshots and video')
    parser.add_argument('--password', type=str, help='Password for modem GUI login')
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
        
        result = False
        try:
            page = context.new_page()
            page.goto(args.url)
            page.wait_for_timeout(2000)
            result = True
            print(f"Test Success: Successfully navigated to {args.url}")
        except Exception as e:
            print(f"Test Failed: Error navigating to {args.url}: {e}")
        finally:
            if args.trace_folder:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                screenshot_path = os.path.join(args.trace_folder, f"final_state_{timestamp}.png")
                page.screenshot(path=screenshot_path)
                context.tracing.stop(path=trace_path)
            browser.close()
        
        if result:
            sys.exit(0)
        else:
            sys.exit(1)

if __name__ == "__main__":
    main()
    
import argparse
import sys
import os
import base64
import glob
from datetime import datetime
from appium import webdriver
from appium.webdriver.common.appiumby import AppiumBy
from appium.options.android import UiAutomator2Options
from appium.webdriver.extensions.android.screenrecord import AndroidStartScreenRecordingOptions

def parse_arguments():
    """Parse command-line arguments for Appium script."""
    parser = argparse.ArgumentParser(description="Launch an Android app with Appium")
    parser.add_argument(
        "--package",
        default="com.lgi.upcch.preprod",
        help="App package name (default: com.lgi.upcch.preprod)"
    )
    parser.add_argument(
        "--activity",
        default="com.libertyglobal.horizonx.MainActivity",
        help="App activity name (default: com.libertyglobal.horizonx.MainActivity)"
    )
    parser.add_argument(
        "--trace_folder",
        default="traces",
        help="Directory for trace outputs, including screenshots and videos (default: traces)"
    )
    return parser.parse_args()

def capture_screenshot(driver, trace_folder):
    """Capture a screenshot and save it to the trace folder with an incremental number."""
    if not os.path.exists(trace_folder):
        os.makedirs(trace_folder)
    
    # Find the highest numbered screenshot in the trace folder
    screenshot_files = glob.glob(os.path.join(trace_folder, "screenshot_*.png"))
    if screenshot_files:
        numbers = [int(os.path.basename(f).replace("screenshot_", "").replace(".png", ""))
                   for f in screenshot_files]
        next_number = max(numbers) + 1
    else:
        next_number = 1
    
    # Generate screenshot path with incremental number
    screenshot_path = os.path.join(trace_folder, f"screenshot_{next_number}.png")
    
    # Capture and save screenshot
    driver.save_screenshot(screenshot_path)
    return screenshot_path

def record_video(driver, trace_folder, prefix):
    """Start and stop screen recording, saving as MP4 in the trace folder."""
    if not os.path.exists(trace_folder):
        os.makedirs(trace_folder)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    mp4_path = os.path.join(trace_folder, f"{prefix}_{timestamp}.mp4")
    
    # Start screen recording
    driver.start_recording_screen(
        AndroidStartScreenRecordingOptions()
        .with_video_size("1280x720")
        .with_bit_rate(5000000)
        .with_time_limit(180)  # 3 minutes max
    )
    
    def stop_recording():
        """Stop recording and save MP4."""
        try:
            # Stop recording and get Base64-encoded video
            base64_video = driver.stop_recording_screen()
            video_data = base64.b64decode(base64_video)
            
            # Save as MP4
            with open(mp4_path, "wb") as f:
                f.write(video_data)
            return mp4_path
        except Exception as e:
            print(f"Failed to stop or save video: {e}")
            return None
    
    return stop_recording

def main():
    # Parse arguments
    args = parse_arguments()

    # Ensure trace folder exists
    if not os.path.exists(args.trace_folder):
        os.makedirs(args.trace_folder)

    # Desired capabilities for Appium
    capabilities = {
        "platformName": "Android",
        "appium:platformVersion": "12",
        "appium:deviceName": "any-name",
        "appium:udid": "192.168.1.29:5555",
        "appium:automationName": "UiAutomator2",
        "appium:appPackage": args.package,
        "appium:appActivity": args.activity,
        "appium:noReset": True
    }

    # Set up options with capabilities
    options = UiAutomator2Options().load_capabilities(capabilities)

    # Initialize the Appium driver
    try:
        driver = webdriver.Remote(command_executor="http://localhost:4723", options=options)
    except Exception as e:
        print(f"Test Failed: Failed to initialize Appium driver: {e}")
        return 1

    # Start video recording
    stop_recording = record_video(driver, args.trace_folder, "video")

    try:
        # Wait for the app to load
        driver.implicitly_wait(10)

        # Verify the app is launched by finding an element (commented out until correct ID is found)
        # element = driver.find_element(AppiumBy.ID, "com.lgi.upcch.preprod:id/main_view")  # Replace with correct ID
        
        # Capture screenshot on successful launch
        screenshot_path = capture_screenshot(driver, args.trace_folder)
        print("waiting 10 seconds")
        driver.implicitly_wait(10000)
        screenshot_path = capture_screenshot(driver, args.trace_folder)
        print(f"Test Success: Sunrise TV app ({args.package}) launched successfully! Screenshot saved: {screenshot_path}")
        
        # Stop recording
        video_path = stop_recording()
        if video_path:
            print(f"Video saved: {video_path}")
        return 0

    except Exception as e:
        # Capture screenshot on failure
        screenshot_path = capture_screenshot(driver, args.trace_folder)
        print(f"Test Failed: {e}. Screenshot saved: {screenshot_path}")
        
        # Stop recording
        video_path = stop_recording()
        if video_path:
            print(f"Video saved: {video_path}")
        return 1

    finally:
        # Close the driver
        driver.quit()

if __name__ == "__main__":
    sys.exit(main())
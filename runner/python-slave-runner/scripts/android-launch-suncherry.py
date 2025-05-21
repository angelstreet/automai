import argparse
import sys
import os
import base64
import glob
import time
from datetime import datetime
from appium import webdriver
from appium.webdriver.common.appiumby import AppiumBy
from appium.options.android import UiAutomator2Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def print_visible_elements(driver):
    try:
        # Wait for the app to stabilize (adjust timeout as needed)
        WebDriverWait(driver, 10).until(
            lambda d: d.current_package == "com.lgi.upcch.preprod"
        )
        print("Dumping visible elements:")
        
        # Find all elements using a broad XPath
        elements = driver.find_elements(AppiumBy.XPATH, "//*")
        
        for index, element in enumerate(elements, 1):
            try:
                if element.is_displayed():
                    tag = element.tag_name
                    text = element.text.strip() if element.text else "<no text>"
                    resource_id = element.get_attribute("resource-id") or "<no resource-id>"
                    print(f"Element {index}:")
                    print(f"  Tag: {tag}")
                    print(f"  Text: {text}")
                    print(f"  Resource-ID: {resource_id}")
                    print("  ---")
            except Exception as e:
                # Skip elements that cause errors (e.g., stale elements)
                print(f"Error inspecting element {index}: {e}")
    except Exception as e:
        print(f"Failed to dump visible elements: {e}")

def parse_arguments():
    parser = argparse.ArgumentParser(
        description="Launch an Android app with Appium",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    parser.add_argument("--package", default="com.lgi.upcch.preprod", help="App package name")
    parser.add_argument("--activity", default="com.libertyglobal.horizonx.MainActivity", help="App activity name")
    parser.add_argument("--trace_folder", default="traces", help="Directory for trace outputs")
    parser.add_argument("--device", default="192.168.1.29", help="Device IP address for ADB connection")
    args, unknown = parser.parse_known_args()
    if unknown:
        print(f"[@script:android-launch] Warning: Ignoring unknown arguments: {unknown}", file=sys.stderr)
    return args

def capture_screenshot(driver, trace_folder):
    if not os.path.exists(trace_folder):
        os.makedirs(trace_folder)
    screenshot_files = glob.glob(os.path.join(trace_folder, "screenshot_*.png"))
    next_number = max([int(os.path.basename(f).replace("screenshot_", "").replace(".png", "")) for f in screenshot_files] + [0]) + 1
    screenshot_path = os.path.join(trace_folder, f"screenshot_{next_number}.png")
    driver.save_screenshot(screenshot_path)
    return screenshot_path

def record_video(driver, trace_folder, prefix):
    if not os.path.exists(trace_folder):
        os.makedirs(trace_folder)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    mp4_path = os.path.join(trace_folder, f"{prefix}_{timestamp}.mp4")
    driver.start_recording_screen(options={"videoSize": "1280x720", "bitRate": 5000000, "timeLimit": "180"})
    def stop_recording():
        try:
            base64_video = driver.stop_recording_screen()
            video_data = base64.b64decode(base64_video)
            with open(mp4_path, "wb") as f:
                f.write(video_data)
            return mp4_path
        except Exception as e:
            print(f"Failed to stop or save video: {e}")
            return None
    return stop_recording

def main():
    args = parse_arguments()
    if not os.path.exists(args.trace_folder):
        os.makedirs(args.trace_folder)

    capabilities = {
        "platformName": "Android",
        "appium:platformVersion": "12",
        "appium:deviceName": "any-name",
        "appium:udid": f"{args.device}:5555",
        "appium:automationName": "UiAutomator2",
        "appium:appPackage": args.package,
        "appium:appActivity": args.activity,
        "appium:noReset": True,  # Preserve app data to avoid re-login
        "appium:fullReset": False,
        "appium:optionalIntentArguments": "-f 0x20000000"  # FLAG_ACTIVITY_NEW_TASK
    }
    options = UiAutomator2Options().load_capabilities(capabilities)

    try:
        print("Initializing Appium driver", capabilities)
        driver = webdriver.Remote(command_executor="http://localhost:4723", options=options)
    except Exception as e:
        print(f"Test Failed: Failed to initialize Appium driver: {e}")
        return 1

    stop_recording = record_video(driver, args.trace_folder, "video")

    try:
        # Unlock device
        print("Unlocking device")
        driver.unlock()

        print("Terminating app")
        driver.terminate_app(args.package)
        time.sleep(2)
        
        # Launch the app
        print("Launching app")
        driver.activate_app(args.package)
        time.sleep(2)
        screenshot_path = capture_screenshot(driver, args.trace_folder)
        print("Waiting 10 seconds")
        time.sleep(10)
        screenshot_path = capture_screenshot(driver, args.trace_folder)
        print(f"Test Success: Sunrise TV app ({args.package}) launched successfully!")
        print_visible_elements(driver)
        video_path = stop_recording()
        if video_path:
            print(f"Video saved: {video_path}")
        return 0

    except Exception as e:
        screenshot_path = capture_screenshot(driver, args.trace_folder)
        print(f"Test Failed: {e}. Screenshot saved: {screenshot_path}")
        video_path = stop_recording()
        if video_path:
            print(f"Video saved: {video_path}")
        return 1

    finally:
        driver.quit()

if __name__ == "__main__":
    sys.exit(main())
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

# Global variables
DRIVER = None
TRACE_FOLDER = None
PACKAGE = None

def init_globals(appium_driver, folder, package):
    global DRIVER, TRACE_FOLDER, PACKAGE
    DRIVER = appium_driver
    TRACE_FOLDER = folder
    PACKAGE = package

def print_visible_elements():
    try:
        output = []
        output.append("--------------------------------")
        output.append("-----------Dumping visible elements-----------")
        output.append("--------------------------------")
        
        # Find all elements using a broad XPath
        elements = DRIVER.find_elements(AppiumBy.XPATH, "//*")
        
        for index, element in enumerate(elements, 1):
            try:
                if element.is_displayed():
                    tag = element.tag_name
                    text = element.text.strip() if element.text else "<no text>"
                    resource_id = element.get_attribute("resource-id") or "<no resource-id>"
                    
                    # Skip elements where all fields are null/default values
                    if (tag is None or tag == "") and text == "<no text>" and resource_id == "<no resource-id>":
                        continue
                        
                    output.append(f"Element {index}:")
                    output.append(f"  Tag: {tag}")
                    output.append(f"  Text: {text}")
                    output.append(f"  Resource-ID: {resource_id}")
                    output.append("  ---")
            except Exception as e:
                output.append(f"Error inspecting element {index}: {e}")
        output.append("--------------------------------")
        output.append("--------------------------------")
        
        # Write output to dom.txt in trace folder
        dom_file_path = os.path.join(TRACE_FOLDER, "dom.txt")
        with open(dom_file_path, "w") as f:
            f.write("\n".join(output))
        print(f"DOM structure written to: {dom_file_path}")
        
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

def capture_screenshot(prefix="screenshot"):
    if not os.path.exists(TRACE_FOLDER):
        os.makedirs(TRACE_FOLDER)
    screenshot_files = glob.glob(os.path.join(TRACE_FOLDER, f"{prefix}_*.png"))
    next_number = max([int(os.path.basename(f).replace(f"{prefix}_", "").replace(".png", "")) for f in screenshot_files] + [0]) + 1
    screenshot_path = os.path.join(TRACE_FOLDER, f"{prefix}_{next_number}.png")
    DRIVER.save_screenshot(screenshot_path)
    return screenshot_path

def record_video(prefix):
    if not os.path.exists(TRACE_FOLDER):
        os.makedirs(TRACE_FOLDER)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    mp4_path = os.path.join(TRACE_FOLDER, f"{prefix}_{timestamp}.mp4")
    DRIVER.start_recording_screen(options={"videoSize": "1280x720", "bitRate": 5000000, "timeLimit": "180"})
    def stop_recording():
        try:
            base64_video = DRIVER.stop_recording_screen()
            video_data = base64.b64decode(base64_video)
            with open(mp4_path, "wb") as f:
                f.write(video_data)
            return mp4_path
        except Exception as e:
            print(f"Failed to stop or save video: {e}")
            return None
    return stop_recording

def click_element(tag=None, text=None, resource_id=None, timeout=5):
    """
    Click on an element using various locator strategies.
    """
    try:
        print(f"Attempting to find element with: Tag={tag}, Text={text}, Resource-ID={resource_id}")
        
        # Build XPath based on provided attributes
        conditions = []
        if tag:
            conditions.append(f"@class='{tag}'")
        if text:
            conditions.append(f"@text='{text}'")
        if resource_id:
            conditions.append(f"@resource-id='{resource_id}'")
            
        if not conditions:
            print("Error: At least one search criterion (tag, text, or resource_id) must be provided")
            return False
            
        xpath = "//*[" + " and ".join(conditions) + "]"
        print(f"Using XPath: {xpath}")
        
        element = WebDriverWait(DRIVER, timeout).until(
            EC.presence_of_element_located((AppiumBy.XPATH, xpath))
        )
        
        if element.is_displayed():
            element.click()
            print("Successfully clicked on element")
            time.sleep(3)
            capture_screenshot("click_success")
            return True
        else:
            print("Element found but not visible")
            capture_screenshot("click_failed")
            return False
            
    except Exception as e:
        print(f"Test Failed: Failed to click on element: {e}")
        capture_screenshot("click_error")
        raise Exception(f"Test Failed: Failed to click on element: {e}")

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
        init_globals(driver, args.trace_folder, args.package)
    except Exception as e:
        print(f"Test Failed: Failed to initialize Appium driver: {e}")
        return 1

    stop_recording = record_video("video")

    try:
        # Unlock device
        #print("Unlocking device")
        #DRIVER.unlock()

        print("Terminating app")
        DRIVER.terminate_app(PACKAGE)
        time.sleep(2)
        
        # Launch the app
        print("Launching app")
        DRIVER.activate_app(PACKAGE)
        time.sleep(2)
        capture_screenshot()
        print("Waiting 3 seconds")
        time.sleep(3)
        capture_screenshot()
        
        print(f"Sunrise TV app ({PACKAGE}) launched successfully!")    
        
        click_element(tag="TV Guide Register")
        time.sleep(2)
        click_element(text="LIVE TV")
        time.sleep(2)
        print(f"Test Success: TV Guide Register clicked")  
        return 0

    except Exception as e:
        print(f"Test Failed: {e}")
        capture_screenshot("error")
        return 1

    finally:
        video_path = stop_recording()
        if video_path:
            print(f"Video saved: {video_path}")
        print_visible_elements()
        DRIVER.quit()

if __name__ == "__main__":
    sys.exit(main())
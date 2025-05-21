import os
import base64
import glob
import time
import subprocess
import socket
import requests
from datetime import datetime
from appium import webdriver
from appium.webdriver.common.appiumby import AppiumBy
from appium.options.android import UiAutomator2Options

def init_globals(appium_driver, folder, package):
    """Initialize global context for test operations."""
    return {"driver": appium_driver, "trace_folder": folder, "package": package}

def print_visible_elements(context):
    """Dump all visible elements on screen to a file."""
    try:
        output = []
        output.append("--------------------------------")
        output.append("-----------Dumping visible elements-----------")
        output.append("--------------------------------")
        
        elements = context["driver"].find_elements(AppiumBy.XPATH, "//*")
        element_counter = 0
        
        for index, element in enumerate(elements, 1):
            try:
                if element.is_displayed():
                    tag = element.tag_name
                    text = element.text.strip() if element.text else "<no text>"
                    resource_id = element.get_attribute("resource-id") or "<no resource-id>"
                    
                    # Skip elements with None tag or null resource_id and no text
                    if (tag is None or tag.lower() == "none" or tag == "") and \
                       (text == "<no text>" or not text) and \
                       (resource_id == "<no resource-id>" or resource_id == "null" or resource_id is None):
                        continue
                    
                    # Skip elements with null as resource-id
                    if resource_id == "null":
                        continue
                        
                    element_counter += 1
                    output.append(f"Element {element_counter}: Tag={tag} | Text={text} | Resource-ID={resource_id}")
            except Exception as e:
                output.append(f"Error inspecting element {index}: {e}")
        output.append("--------------------------------")
        output.append(f"Total visible elements: {element_counter}")
        output.append("--------------------------------")
        
        dom_file_path = os.path.join(context["trace_folder"], "dom.txt")
        with open(dom_file_path, "w") as f:
            f.write("\n".join(output))
        print(f"DOM structure written to: {dom_file_path}")
        
    except Exception as e:
        print(f"Failed to dump visible elements: {e}")

def capture_screenshot(context, prefix="screenshot"):
    """Capture a screenshot and save it to the trace folder."""
    if not os.path.exists(context["trace_folder"]):
        os.makedirs(context["trace_folder"])
    screenshot_files = glob.glob(os.path.join(context["trace_folder"], f"{prefix}_*.png"))
    next_number = max([int(os.path.basename(f).replace(f"{prefix}_", "").replace(".png", "")) for f in screenshot_files] + [0]) + 1
    screenshot_path = os.path.join(context["trace_folder"], f"{prefix}_{next_number}.png")
    context["driver"].save_screenshot(screenshot_path)
    return screenshot_path

def record_video(context, video_size="1280x720", bit_rate=5000000, time_limit="180"):
    """Start recording screen and return a function to stop the recording."""
    if not os.path.exists(context["trace_folder"]):
        os.makedirs(context["trace_folder"])
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    mp4_path = os.path.join(context["trace_folder"], f"video_{timestamp}.mp4")
    context["driver"].start_recording_screen(options={"videoSize": video_size, "bitRate": bit_rate, "timeLimit": time_limit})
    def stop_recording():
        try:
            base64_video = context["driver"].stop_recording_screen()
            video_data = base64.b64decode(base64_video)
            with open(mp4_path, "wb") as f:
                f.write(video_data)
            return mp4_path
        except Exception as e:
            print(f"Failed to stop or save video: {e}")
            return None
    return stop_recording

def click_element(context, tag=None, text=None, resource_id=None, timeout=5):
    """Find and click an element by tag, text, or resource-id."""
    status_parts = []
    try:
        status_parts.append(f"Search[Tag={tag}|Text={text}|ID={resource_id}]")
        
        if tag:
            try:
                element = context["driver"].find_element(AppiumBy.XPATH, f"//*[@content-desc='{tag}']")
                status_parts.append("Found[content-desc]")
            except:
                try:
                    element = context["driver"].find_element(AppiumBy.XPATH, f"//*[@text='{tag}']")
                    status_parts.append("Found[text]")
                except:
                    try:
                        element = context["driver"].find_element(AppiumBy.XPATH, f"//*[contains(@content-desc, '{tag}')]")
                        status_parts.append("Found[partial-content-desc]")
                    except:
                        element = context["driver"].find_element(AppiumBy.XPATH, f"//*[contains(@text, '{tag}')]")
                        status_parts.append("Found[partial-text]")
        elif text:
            element = context["driver"].find_element(AppiumBy.NPATH, f"//*[@text='{text}']")
            status_parts.append("Found[exact-text]")
        elif resource_id:
            element = context["driver"].find_element(AppiumBy.ID, resource_id)
            status_parts.append("Found[resource-id]")
        else:
            print("[@click] ERROR: At least one search criterion required")
            return False
            
        # Get element properties in a compact format
        properties = []
        try:
            tag_name = element.tag_name
            if tag_name: properties.append(f"Tag={tag_name}")
            
            el_text = element.text.strip() if element.text else "<no text>"
            if el_text != "<no text>": properties.append(f"Text={el_text}")
            
            resource_id = element.get_attribute("resource-id")
            if resource_id: properties.append(f"ID={resource_id}")
            
            content_desc = element.get_attribute("content-desc")
            if content_desc: properties.append(f"Desc={content_desc}")
            
            if properties:
                status_parts.append(f"Props[{' | '.join(properties)}]")
        except Exception as e:
            status_parts.append(f"Props[error: {str(e)}]")
        
        if element.is_displayed():
            element.click()
            status_parts.append("✓ Clicked")
            time.sleep(3)
            capture_screenshot(context, "click_success")
            print(f"[@click] {' → '.join(status_parts)}")
            return True
        else:
            status_parts.append("✗ Not visible")
            capture_screenshot(context, "click_failed")
            print(f"[@click] {' → '.join(status_parts)}")
            raise Exception("Element found but not visible")
            
    except Exception as e:
        if status_parts:
            status_parts.append(f"✗ Failed: {str(e)}")
            print(f"[@click] {' → '.join(status_parts)}")
        else:
            print(f"[@click] ✗ Failed: {str(e)}")
        capture_screenshot(context, "click_error")
        raise Exception(f"Failed to click on element: {e}")

def is_appium_running(port):
    """Check if Appium is running on the specified port."""
    try:
        response = requests.get(f"http://localhost:{port}/status", timeout=2)
        return response.status_code == 200
    except requests.ConnectionError:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            return s.connect_ex(('localhost', port)) == 0
    except Exception:
        return False

def start_appium_server(port):
    """Start Appium server on the specified port."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('localhost', port)) == 0:
                print(f"Port {port} is already in use. Assuming Appium is running.")
                return True

        log_file = f"appium_{port}.log"
        with open(log_file, "w") as log:
            process = subprocess.Popen(
                ["appium", "--port", str(port), "--address", "0.0.0.0"],
                stdout=log, stderr=log, text=True
            )
        time.sleep(3)
        if is_appium_running(port):
            print(f"Appium server started on port {port} (PID: {process.pid})")
            return True
        else:
            print(f"Failed to start Appium server on port {port}. Check {log_file} for details.")
            return False
    except Exception as e:
        print(f"Error starting Appium server on port {port}: {e}")
        return False

def setup_driver(device_udid, appium_port, package, activity):
    """Configure and set up Appium capabilities for a device."""
    capabilities = {
        "platformName": "Android",
        "appium:platformVersion": "12",
        "appium:deviceName": f"device_{device_udid}",
        "appium:udid": device_udid,
        "appium:automationName": "UiAutomator2",
        "appium:appPackage": package,
        "appium:appActivity": activity,
        "appium:noReset": True,
        "appium:fullReset": False,
        "appium:optionalIntentArguments": "-f 0x20000000"
    }
    return UiAutomator2Options().load_capabilities(capabilities)

def check_device_adb_connected(device_udid):
    """Check if the device is connected via ADB."""
    try:
        result = subprocess.run(["adb", "devices"], capture_output=True, text=True)
        return device_udid in result.stdout and "device" in result.stdout.split(device_udid)[1]
    except Exception as e:
        print(f"ADB check failed: {e}")
        return False

def initialize_driver(device_udid, appium_port, package, activity, hdmi=None):
    """Initialize Appium driver with setup and connectivity checks."""
    if not check_device_adb_connected(device_udid):
        print(f"Device {device_udid}: Not connected via ADB")
        return None

    if not is_appium_running(appium_port):
        print(f"Appium not running on port {appium_port}. Starting Appium server...")
        if not start_appium_server(appium_port):
            print(f"Could not start Appium server on port {appium_port}")
            return None

    options = setup_driver(device_udid, appium_port, package, activity)
    try:
        print(f"Initializing Appium driver for {device_udid} on port {appium_port}")
        driver = webdriver.Remote(command_executor=f"http://localhost:{appium_port}", options=options)
        return driver
    except Exception as e:
        print(f"Failed to initialize Appium driver for {device_udid}: {e}")
        return None
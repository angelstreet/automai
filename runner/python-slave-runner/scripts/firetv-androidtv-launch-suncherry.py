import argparse
import sys
import os
import base64
import glob
import time
import threading
import subprocess
import socket
import requests
from datetime import datetime
from appium import webdriver
from appium.webdriver.common.appiumby import AppiumBy
from appium.options.android import UiAutomator2Options

def init_globals(appium_driver, folder, package):
    return {"driver": appium_driver, "trace_folder": folder, "package": package}

def print_visible_elements(context):
    try:
        output = []
        output.append("--------------------------------")
        output.append("-----------Dumping visible elements-----------")
        output.append("--------------------------------")
        
        elements = context["driver"].find_elements(AppiumBy.XPATH, "//*")
        
        for index, element in enumerate(elements, 1):
            try:
                if element.is_displayed():
                    tag = element.tag_name
                    text = element.text.strip() if element.text else "<no text>"
                    resource_id = element.get_attribute("resource-id") or "<no resource-id>"
                    
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
        
        dom_file_path = os.path.join(context["trace_folder"], "dom.txt")
        with open(dom_file_path, "w") as f:
            f.write("\n".join(output))
        print(f"DOM structure written to: {dom_file_path}")
        
    except Exception as e:
        print(f"Failed to dump visible elements: {e}")

def parse_arguments():
    parser = argparse.ArgumentParser(
        description="Launch an Android app with Appium on multiple devices",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    parser.add_argument("--package", default="com.lgi.upcch.preprod", help="App package name")
    parser.add_argument("--activity", default="com.libertyglobal.horizonx.MainActivity", help="App activity name")
    parser.add_argument("--trace_folder", default="traces", help="Directory for trace outputs")
    parser.add_argument("--device", default="192.168.1.130:5555,192.168.1.131:5555", 
                        help="Comma-separated device UDIDs (e.g., IP:port or serial)")
    args, unknown = parser.parse_known_args()
    if unknown:
        print(f"[@script:android-launch] Warning: Ignoring unknown arguments: {unknown}", file=sys.stderr)
    
    # Split the device argument on commas and strip whitespace
    args.devices = [device.strip() for device in args.device.split(",") if device.strip()]
    if not args.devices:
        parser.error("No valid device UDIDs provided in --device argument")
    
    return args

def capture_screenshot(context, prefix="screenshot"):
    if not os.path.exists(context["trace_folder"]):
        os.makedirs(context["trace_folder"])
    screenshot_files = glob.glob(os.path.join(context["trace_folder"], f"{prefix}_*.png"))
    next_number = max([int(os.path.basename(f).replace(f"{prefix}_", "").replace(".png", "")) for f in screenshot_files] + [0]) + 1
    screenshot_path = os.path.join(context["trace_folder"], f"{prefix}_{next_number}.png")
    context["driver"].save_screenshot(screenshot_path)
    return screenshot_path

def record_video(context, prefix):
    if not os.path.exists(context["trace_folder"]):
        os.makedirs(context["trace_folder"])
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    mp4_path = os.path.join(context["trace_folder"], f"{prefix}_{timestamp}.mp4")
    context["driver"].start_recording_screen(options={"videoSize": "1280x720", "bitRate": 5000000, "timeLimit": "180"})
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

def is_appium_running(port):
    try:
        response = requests.get(f"http://localhost:{port}/status", timeout=2)
        return response.status_code == 200
    except requests.ConnectionError:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            return s.connect_ex(('localhost', port)) == 0
    except Exception:
        return False

def start_appium_server(port):
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

def run_test_on_device(device_udid, appium_port, package, activity, trace_folder):
    # Check ADB connectivity
    try:
        result = subprocess.run(["adb", "devices"], capture_output=True, text=True)
        if device_udid not in result.stdout or "device" not in result.stdout.split(device_udid)[1]:
            print(f"Test Failed for {device_udid}: Device not connected via ADB")
            return 1
    except Exception as e:
        print(f"Test Failed for {device_udid}: ADB check failed: {e}")
        return 1

    # Create a device-specific trace folder
    device_trace_folder = os.path.join(trace_folder, device_udid.replace(":", "_"))
    if not os.path.exists(device_trace_folder):
        os.makedirs(device_trace_folder)

    # Check if Appium is running, start if not
    if not is_appium_running(appium_port):
        print(f"Appium not running on port {appium_port}. Starting Appium server...")
        if not start_appium_server(appium_port):
            print(f"Test Failed for {device_udid}: Could not start Appium server on port {appium_port}")
            return 1

    # Set up capabilities for the device
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
    options = UiAutomator2Options().load_capabilities(capabilities)

    try:
        print(f"Initializing Appium driver for {device_udid} on port {appium_port}")
        driver = webdriver.Remote(command_executor=f"http://localhost:{appium_port}", options=options)
        context = init_globals(driver, device_trace_folder, package)
    except Exception as e:
        print(f"Test Failed for {device_udid}: Failed to initialize Appium driver: {e}")
        return 1

    stop_recording = record_video(context, "video")

    try:
        print(f"Terminating app on {device_udid}")
        driver.terminate_app(package)
        time.sleep(2)

        print(f"Launching app on {device_udid}")
        driver.activate_app(package)
        time.sleep(2)
        capture_screenshot(context)

        print(f"Sunrise TV app ({package}) launched successfully on {device_udid}!")

        print(f"Test Success for {device_udid}")
        return 0

    except Exception as e:
        print(f"Test Failed for {device_udid}: {e}")
        capture_screenshot(context, "error")
        return 1

    finally:
        video_path = stop_recording()
        if video_path:
            print(f"Video saved for {device_udid}: {video_path}")
        print_visible_elements(context)
        driver.quit()

def main():
    args = parse_arguments()
    if not os.path.exists(args.trace_folder):
        os.makedirs(args.trace_folder)

    # Map devices to Appium ports
    device_port_map = {args.devices[i]: 4723 + i for i in range(len(args.devices))}

    # Run tests in parallel using threads
    threads = []
    for device_udid, port in device_port_map.items():
        thread = threading.Thread(
            target=run_test_on_device,
            args=(device_udid, port, args.package, args.activity, args.trace_folder)
        )
        threads.append(thread)
        thread.start()

    # Wait for all threads to complete
    for thread in threads:
        thread.join()

    print("All device tests completed")
    return 0

if __name__ == "__main__":
    sys.exit(main())
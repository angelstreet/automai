import argparse
import sys
import os
import time
import threading
from appium import webdriver
import appiumUtils

def parse_arguments():
    parser = argparse.ArgumentParser(
        description="Launch an Android app with Appium on mobile and Android TV",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    parser.add_argument("--package", default="com.lgi.upcch.preprod", help="App package name")
    parser.add_argument("--activity", default="com.libertyglobal.horizonx.MainActivity", help="App activity name")
    parser.add_argument("--trace_folder", default="traces", help="Directory for trace outputs")
    parser.add_argument("--device", default="192.168.1.29:5555", 
                        help="Comma-separated device UDIDs (e.g., mobile_IP:port,android_tv_IP:port)")
    args, unknown = parser.parse_known_args()
    if unknown:
        print(f"[@script:android-launch] Warning: Ignoring unknown arguments: {unknown}", file=sys.stderr)
    
    # Split the device argument on commas and strip whitespace
    args.devices = [device.strip() for device in args.device.split(",") if device.strip()]
    if not args.devices:
        parser.error("No valid device UDIDs provided in --device argument")
    
    return args

def run_test_on_device(device_udid, appium_port, package, activity, trace_folder):
    # Check ADB connectivity
    if not appiumUtils.check_device_adb_connected(device_udid):
        print(f"Test Failed for {device_udid}: Device not connected via ADB")
        return 1

    # Create a device-specific trace folder
    device_trace_folder = appiumUtils.create_trace_folder(trace_folder, device_udid)

    # Check if Appium is running, start if not
    if not appiumUtils.is_appium_running(appium_port):
        print(f"Appium not running on port {appium_port}. Starting Appium server...")
        if not appiumUtils.start_appium_server(appium_port):
            print(f"Test Failed for {device_udid}: Could not start Appium server on port {appium_port}")
            return 1

    # Set up capabilities for the device
    options = appiumUtils.setup_driver(device_udid, appium_port, package, activity)

    try:
        print(f"Initializing Appium driver for {device_udid} on port {appium_port}")
        driver = webdriver.Remote(command_executor=f"http://localhost:{appium_port}", options=options)
        context = appiumUtils.init_globals(driver, device_trace_folder, package)
    except Exception as e:
        print(f"Test Failed for {device_udid}: Failed to initialize Appium driver: {e}")
        return 1

    stop_recording = appiumUtils.record_video(context, "video")

    try:
        print(f"Terminating app on {device_udid}")
        driver.terminate_app(package)
        time.sleep(2)

        print(f"Launching app on {device_udid}")
        driver.activate_app(package)
        time.sleep(2)
        appiumUtils.capture_screenshot(context)

        print(f"Sunrise TV app ({package}) launched successfully on {device_udid}!")

        appiumUtils.click_element(context, tag="TV Guide")
        appiumUtils.click_element(context, tag="LIVE TV")
        appiumUtils.click_element(context, tag="SRF 1 HD")
        time.sleep(10)
        appiumUtils.capture_screenshot(context)
        
        print(f"Test Success for {device_udid}")
        return 0

    except Exception as e:
        print(f"Test Failed for {device_udid}: {e}")
        appiumUtils.capture_screenshot(context, "error")
        return 1

    finally:
        video_path = stop_recording()
        if video_path:
            print(f"Video saved for {device_udid}: {video_path}")
        appiumUtils.print_visible_elements(context)
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
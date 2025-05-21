import argparse
import sys
from appium import webdriver
import appiumUtils
from hdmiUtils import HDMIUtils
from testRunnerUtils import run_tests_on_devices
import time
def parse_arguments():
    parser = argparse.ArgumentParser(
        description="Launch an Android app with Appium on mobile and Android TV",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    parser.add_argument("--package", default="com.lgi.upcch.preprod", help="App package name")
    parser.add_argument("--activity", default="com.libertyglobal.horizonx.MainActivity", help="App activity name")
    parser.add_argument("--trace_folder", default="traces", help="Directory for trace outputs")
    parser.add_argument("--device", default="192.168.1.29:5555:1", 
                        help="Comma-separated device UDIDs ip:port:hdmi_index (e.g., ip1:port1:hdmi1,ip2:port2:hdmi2)")
    args, unknown = parser.parse_known_args()
    if unknown:
        print(f"[@script:android-launch] Warning: Ignoring unknown arguments: {unknown}", file=sys.stderr)
    
    # Parse device argument: ip:port:hdmi_index or just ip:port
    args.devices = []
    for device in args.device.split(","):
        device = device.strip()
        if not device:
            continue
        parts = device.split(":")
        if len(parts) >= 3:  # ip:port:hdmi
            udid = f"{parts[0]}:{parts[1]}"
            hdmi_index = int(parts[2]) if parts[2].isdigit() else None
        else:  # ip:port or ip
            udid = device
            hdmi_index = None
        args.devices.append((udid, hdmi_index))
    
    if not args.devices:
        parser.error("No valid device UDIDs provided in --device argument")
        
    return args

def run_test_on_device(device_udid, hdmi_index, appium_port, package, activity, trace_folder):
    hdmi = HDMIUtils(device_index=hdmi_index, trace_folder=trace_folder)
    driver = appiumUtils.initialize_driver(device_udid, appium_port, package, activity)
    if not driver:
        hdmi.release()
        return 1

    context = appiumUtils.init_globals(driver, trace_folder, package)
    stop_recording = appiumUtils.record_video(context, video_size="1200x1848")

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
        stop_recording()
        appiumUtils.print_visible_elements(context)
        appiumUtils.capture_screenshot(context)
        hdmi.take_screenshot()
        hdmi.release()
        driver.quit()

def main():
    args = parse_arguments()
    return run_tests_on_devices(args.devices, run_test_on_device, args.package, args.activity, args.trace_folder)

if __name__ == "__main__":
    sys.exit(main())
import os
import threading

def run_tests_on_devices(devices, run_test_on_device, package, activity, trace_folder):
    """Orchestrate test execution across multiple devices in parallel."""
    if not os.path.exists(trace_folder):
        os.makedirs(trace_folder)

    # Map devices to Appium ports
    device_port_map = {devices[i]: 4723 + i for i in range(len(devices))}

    # Run tests in parallel using threads
    threads = []
    for device_info, port in device_port_map.items():
        # device_info could be (device_udid, hdmi_index) or just device_udid
        if isinstance(device_info, tuple):
            device_udid, hdmi_index = device_info
            thread = threading.Thread(
                target=run_test_on_device,
                args=(device_udid, hdmi_index, port, package, activity, trace_folder)
            )
        else:
            device_udid = device_info
            thread = threading.Thread(
                target=run_test_on_device,
                args=(device_udid, port, package, activity, trace_folder)
            )
        threads.append(thread)
        thread.start()

    # Wait for all threads to complete
    for thread in threads:
        thread.join()

    print("All device tests completed")
    return 0
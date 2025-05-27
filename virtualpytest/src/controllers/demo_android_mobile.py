#!/usr/bin/env python3
"""
Demo script for Real Android Mobile Remote Controller

This script demonstrates how to use the real Android mobile remote controller
with SSH + ADB commands. Make sure you have:
1. SSH access to a host with ADB installed
2. An Android mobile device with USB debugging enabled
3. The device connected to the SSH host via network (adb connect IP:5555)

Usage:
    python3 demo_android_mobile.py --host-ip 192.168.1.50 --device-ip 192.168.1.100 --username myuser --password mypass
"""

import sys
import os
import argparse
import time

# Add current directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from android_mobile_remote_controller import AndroidMobileRemoteController
from __init__ import ControllerFactory, create_device_controllers


def demo_basic_mobile_controller(host_ip: str, device_ip: str, username: str, password: str = "", private_key: str = ""):
    """Demo basic mobile controller functionality."""
    print("=" * 60)
    print("DEMO: Basic Android Mobile Remote Controller")
    print("=" * 60)
    
    try:
        controller = AndroidMobileRemoteController(
            device_name="Demo Android Mobile",
            host_ip=host_ip,
            host_username=username,
            host_password=password,
            host_private_key=private_key,
            device_ip=device_ip
        )
        
        print(f"Controller created: {controller.device_name}")
        print(f"SSH host: {controller.host_ip}")
        print(f"Android device: {controller.android_device_id}")
        
        # Try to connect
        print("\nAttempting to connect...")
        if controller.connect():
            print("✅ Connected successfully!")
            
            # Demo basic key presses
            print("\nTesting basic key presses...")
            controller.press_key("HOME")
            time.sleep(1)
            controller.press_key("BACK")
            time.sleep(1)
            
            # Demo UI dumping
            print("\nTesting UI element dumping...")
            success, elements, error = controller.dump_ui_elements()
            if success:
                print(f"✅ Successfully dumped {len(elements)} UI elements")
                
                # Show first few elements
                print("Sample elements:")
                for i, element in enumerate(elements[:5]):
                    print(f"  {i+1}. ID={element.id}, Text='{element.text}', ResourceID='{element.resource_id}'")
                    
                # Demo element finding
                print("\nTesting element finding...")
                if elements:
                    first_element = elements[0]
                    found_element = controller.find_element_by_text(first_element.text)
                    if found_element:
                        print(f"✅ Found element by text: {found_element.text}")
                        
                        # Demo element clicking
                        print("\nTesting element clicking...")
                        if controller.click_element(found_element):
                            print("✅ Successfully clicked element")
                        else:
                            print("❌ Failed to click element")
                    else:
                        print("❌ Could not find element by text")
            else:
                print(f"❌ UI dump failed: {error}")
            
            # Demo app listing
            print("\nTesting app listing...")
            apps = controller.get_installed_apps()
            if apps:
                print(f"✅ Found {len(apps)} installed apps")
                print("Sample apps:")
                for i, app in enumerate(apps[:5]):
                    print(f"  {i+1}. {app.label} ({app.package_name})")
            else:
                print("❌ No apps found")
            
            # Demo sequence execution
            print("\nTesting command sequence...")
            sequence = [
                {'action': 'press_key', 'params': {'key': 'HOME'}, 'delay': 1.0},
                {'action': 'dump_ui', 'delay': 2.0},
                {'action': 'press_key', 'params': {'key': 'BACK'}, 'delay': 0.5},
            ]
            if controller.execute_sequence(sequence):
                print("✅ Sequence executed successfully")
            else:
                print("❌ Sequence execution failed")
            
            # Get status
            print("\nController status:")
            status = controller.get_status()
            for key, value in status.items():
                if key not in ['supported_keys', 'capabilities']:  # Skip long lists
                    print(f"  {key}: {value}")
            
            controller.disconnect()
            print("✅ Disconnected successfully!")
            
        else:
            print("❌ Connection failed")
            print("Make sure:")
            print("  1. SSH host is accessible")
            print("  2. ADB is installed on the SSH host")
            print("  3. Android device has USB debugging enabled")
            print("  4. Device is reachable from SSH host")
            print(f"  5. You can manually connect: adb connect {device_ip}")
            
    except Exception as e:
        print(f"❌ Error: {e}")


def demo_factory_usage(host_ip: str, device_ip: str, username: str, password: str = "", private_key: str = ""):
    """Demo using the mobile controller through the factory system."""
    print("\n" + "=" * 60)
    print("DEMO: Factory System Usage")
    print("=" * 60)
    
    try:
        # Create controller via factory
        remote = ControllerFactory.create_remote_controller(
            device_type="real_android_mobile",
            device_name="Factory Android Mobile",
            host_ip=host_ip,
            host_username=username,
            host_password=password,
            host_private_key=private_key,
            device_ip=device_ip
        )
        
        print(f"Factory created controller: {remote.device_name}")
        print(f"Controller type: {remote.controller_type}")
        print(f"Device type: {remote.device_type}")
        
        # Test connection
        if remote.connect():
            print("✅ Factory controller connected successfully!")
            
            # Test UI dumping
            success, elements, error = remote.dump_ui_elements()
            if success:
                print(f"✅ UI dump successful: {len(elements)} elements")
            else:
                print(f"❌ UI dump failed: {error}")
            
            remote.disconnect()
        else:
            print("❌ Factory controller connection failed")
            
    except Exception as e:
        print(f"❌ Error: {e}")


def demo_device_controller_set(host_ip: str, device_ip: str, username: str, password: str = "", private_key: str = ""):
    """Demo using a complete device controller set for mobile."""
    print("\n" + "=" * 60)
    print("DEMO: Device Controller Set for Mobile")
    print("=" * 60)
    
    try:
        # Create a complete controller set for Android mobile
        controllers = create_device_controllers(
            device_name="Complete Android Mobile",
            device_type="android_mobile",
            host_ip=host_ip,
            host_username=username,
            host_password=password,
            host_private_key=private_key,
            device_ip=device_ip
        )
        
        print(f"Created controller set for: {controllers.device_name}")
        print(f"Remote controller: {controllers.remote.__class__.__name__}")
        print(f"AV controller: {controllers.av.__class__.__name__}")
        print(f"Verification controller: {controllers.verification.__class__.__name__}")
        print(f"Power controller: {controllers.power.__class__.__name__}")
        
        # Try to connect all
        print("\nAttempting to connect all controllers...")
        if controllers.connect_all():
            print("✅ All controllers connected!")
            
            # Demo coordinated operations
            print("\nDemo coordinated mobile operations...")
            
            # Use remote to navigate and dump UI
            controllers.remote.press_key("HOME")
            time.sleep(1)
            
            success, elements, error = controllers.remote.dump_ui_elements()
            if success:
                print(f"✅ Found {len(elements)} UI elements")
                
                # Try to find and click a specific element
                settings_element = controllers.remote.find_element_by_text("Settings")
                if settings_element:
                    print("✅ Found Settings element")
                    controllers.remote.click_element(settings_element)
                else:
                    print("❌ Settings element not found")
            
            # Use power to check status
            power_status = controllers.power.get_power_status()
            print(f"Power state: {power_status.get('power_state', 'unknown')}")
            
            # Get overall status
            print("\nOverall status:")
            status = controllers.get_status()
            for controller_name, controller_status in status.items():
                connected = controller_status.get('connected', False)
                print(f"  {controller_name}: {'✅ Connected' if connected else '❌ Disconnected'}")
            
            controllers.disconnect_all()
            print("✅ All controllers disconnected!")
            
        else:
            print("❌ Failed to connect all controllers")
            
    except Exception as e:
        print(f"❌ Error: {e}")


def demo_ui_automation_workflow(host_ip: str, device_ip: str, username: str, password: str = "", private_key: str = ""):
    """Demo a complete UI automation workflow."""
    print("\n" + "=" * 60)
    print("DEMO: UI Automation Workflow")
    print("=" * 60)
    
    try:
        controller = AndroidMobileRemoteController(
            device_name="UI Automation Mobile",
            host_ip=host_ip,
            host_username=username,
            host_password=password,
            host_private_key=private_key,
            device_ip=device_ip
        )
        
        if controller.connect():
            print("✅ Connected for UI automation demo")
            
            # Step 1: Go to home screen
            print("\n1. Going to home screen...")
            controller.press_key("HOME")
            time.sleep(2)
            
            # Step 2: Dump UI and analyze
            print("\n2. Analyzing home screen...")
            success, elements, error = controller.dump_ui_elements()
            if success:
                print(f"Found {len(elements)} elements on home screen")
                
                # Step 3: Look for specific apps or elements
                print("\n3. Looking for common apps...")
                common_apps = ["Settings", "Phone", "Messages", "Camera", "Gallery"]
                found_apps = []
                
                for app_name in common_apps:
                    element = controller.find_element_by_text(app_name)
                    if element:
                        found_apps.append((app_name, element))
                        print(f"  ✅ Found {app_name}")
                    else:
                        print(f"  ❌ {app_name} not found")
                
                # Step 4: Interact with found elements
                if found_apps:
                    print(f"\n4. Interacting with {found_apps[0][0]}...")
                    app_name, app_element = found_apps[0]
                    
                    if controller.click_element(app_element):
                        print(f"✅ Successfully opened {app_name}")
                        time.sleep(3)
                        
                        # Step 5: Analyze the new screen
                        print("\n5. Analyzing new screen...")
                        success, new_elements, error = controller.dump_ui_elements()
                        if success:
                            print(f"Found {len(new_elements)} elements in {app_name}")
                            
                            # Show some elements
                            print("Sample elements:")
                            for i, element in enumerate(new_elements[:3]):
                                print(f"  - {element.text} ({element.class_name})")
                        
                        # Step 6: Go back
                        print("\n6. Going back to home...")
                        controller.press_key("BACK")
                        time.sleep(1)
                        controller.press_key("HOME")
                        
                    else:
                        print(f"❌ Failed to open {app_name}")
                else:
                    print("❌ No common apps found to interact with")
            else:
                print(f"❌ Failed to dump home screen: {error}")
            
            controller.disconnect()
            print("\n✅ UI automation demo completed!")
            
        else:
            print("❌ Failed to connect for UI automation demo")
            
    except Exception as e:
        print(f"❌ UI automation demo error: {e}")


def main():
    """Main demo function."""
    parser = argparse.ArgumentParser(description="Demo Real Android Mobile Remote Controller")
    parser.add_argument("--host-ip", required=True, help="SSH host IP address")
    parser.add_argument("--device-ip", required=True, help="Android device IP address")
    parser.add_argument("--username", required=True, help="SSH username")
    parser.add_argument("--password", help="SSH password (if using password auth)")
    parser.add_argument("--private-key", help="SSH private key content (if using key auth)")
    parser.add_argument("--skip-automation", action="store_true", help="Skip UI automation demo")
    
    args = parser.parse_args()
    
    # Validate authentication
    if not args.password and not args.private_key:
        print("Error: Either --password or --private-key must be provided")
        return
    
    print("VirtualPyTest - Real Android Mobile Remote Controller Demo")
    print("=" * 60)
    print(f"SSH Host: {args.host_ip}")
    print(f"Android Device: {args.device_ip}")
    print(f"Username: {args.username}")
    print("=" * 60)
    
    # Run demos
    demo_basic_mobile_controller(args.host_ip, args.device_ip, args.username, args.password or "", args.private_key or "")
    demo_factory_usage(args.host_ip, args.device_ip, args.username, args.password or "", args.private_key or "")
    demo_device_controller_set(args.host_ip, args.device_ip, args.username, args.password or "", args.private_key or "")
    
    if not args.skip_automation:
        demo_ui_automation_workflow(args.host_ip, args.device_ip, args.username, args.password or "", args.private_key or "")
    
    print("\n" + "=" * 60)
    print("DEMO COMPLETED")
    print("=" * 60)
    print("\nKey features demonstrated:")
    print("  ✅ SSH + ADB connection management")
    print("  ✅ UI element dumping and parsing")
    print("  ✅ Element finding by text, resource ID, content description")
    print("  ✅ Element clicking with coordinate calculation")
    print("  ✅ App listing and launching")
    print("  ✅ Key press simulation")
    print("  ✅ Command sequence execution")
    print("  ✅ Factory pattern integration")
    print("  ✅ Complete UI automation workflows")


if __name__ == "__main__":
    main() 
#!/usr/bin/env python3
"""
Demo script for Real Android TV Remote Controller

This script demonstrates how to use the real Android TV remote controller
with ADB commands. Make sure you have:
1. ADB installed and in your PATH
2. An Android TV device with USB debugging enabled
3. The device connected via network (adb connect IP:5555)

Usage:
    python3 demo_real_android_tv.py --device-ip 192.168.1.100
"""

import sys
import os
import argparse
import time

# Add current directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from android_tv_remote_controller import AndroidTVRemoteController
from __init__ import ControllerFactory, create_device_controllers


def demo_basic_controller():
    """Demo basic controller functionality."""
    print("=" * 60)
    print("DEMO: Basic Android TV Remote Controller")
    print("=" * 60)
    
    # Note: This will fail without a real device, but shows the interface
    try:
        controller = AndroidTVRemoteController(
            device_name="Demo Android TV",
            device_ip="192.168.1.100"  # Replace with your device IP
        )
        
        print(f"Controller created: {controller.device_name}")
        print(f"ADB device: {controller.adb_device}")
        print(f"Supported keys: {list(controller.ADB_KEYS.keys())[:10]}...")  # Show first 10
        
        # Try to connect (will fail without real device)
        print("\nAttempting to connect...")
        if controller.connect():
            print("✅ Connected successfully!")
            
            # Demo key presses
            print("\nTesting key presses...")
            controller.press_key("HOME")
            time.sleep(1)
            controller.press_key("UP")
            time.sleep(1)
            controller.press_key("DOWN")
            
            # Demo text input
            print("\nTesting text input...")
            controller.input_text("Hello Android TV")
            
            # Demo app launch
            print("\nTesting app launch...")
            controller.launch_app("com.netflix.ninja")
            
            # Demo sequence
            print("\nTesting command sequence...")
            sequence = [
                {'action': 'press_key', 'params': {'key': 'HOME'}, 'delay': 1.0},
                {'action': 'press_key', 'params': {'key': 'DOWN'}, 'delay': 0.5},
                {'action': 'press_key', 'params': {'key': 'OK'}, 'delay': 0.5},
            ]
            controller.execute_sequence(sequence)
            
            # Get status
            print("\nController status:")
            status = controller.get_status()
            for key, value in status.items():
                if key != 'supported_keys':  # Skip long list
                    print(f"  {key}: {value}")
            
            controller.disconnect()
            print("✅ Disconnected successfully!")
            
        else:
            print("❌ Connection failed (expected without real device)")
            
    except Exception as e:
        print(f"❌ Error: {e}")


def demo_factory_usage():
    """Demo using the controller through the factory system."""
    print("\n" + "=" * 60)
    print("DEMO: Factory System Usage")
    print("=" * 60)
    
    try:
        # Create controller via factory
        remote = ControllerFactory.create_remote_controller(
            device_type="real_android_tv",
            device_name="Factory Android TV",
            device_ip="192.168.1.100"
        )
        
        print(f"Factory created controller: {remote.device_name}")
        print(f"Controller type: {remote.controller_type}")
        print(f"Device type: {remote.device_type}")
        
        # Show available controllers
        print("\nAvailable controllers:")
        available = ControllerFactory.list_available_controllers()
        for controller_type, implementations in available.items():
            print(f"  {controller_type}: {implementations}")
            
    except Exception as e:
        print(f"❌ Error: {e}")


def demo_device_controller_set():
    """Demo using a complete device controller set."""
    print("\n" + "=" * 60)
    print("DEMO: Device Controller Set")
    print("=" * 60)
    
    try:
        # Create a complete controller set for Android TV
        controllers = create_device_controllers(
            device_name="Complete Android TV",
            device_type="android_tv",
            remote_type="real_android_tv",  # Use real Android TV remote
            device_ip="192.168.1.100"
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
            print("\nDemo coordinated operations...")
            
            # Use remote to navigate
            controllers.remote.press_key("HOME")
            
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
            print("❌ Failed to connect all controllers (expected without real device)")
            
    except Exception as e:
        print(f"❌ Error: {e}")


def demo_with_real_device(device_ip: str):
    """Demo with a real Android TV device."""
    print("\n" + "=" * 60)
    print(f"DEMO: Real Device Test - {device_ip}")
    print("=" * 60)
    
    try:
        controller = AndroidTVRemoteController(
            device_name="Real Android TV",
            device_ip=device_ip,
            connection_timeout=15
        )
        
        print(f"Attempting to connect to {device_ip}...")
        if controller.connect():
            print("✅ Successfully connected to real device!")
            
            # Test basic navigation
            print("\nTesting basic navigation...")
            controller.press_key("HOME")
            time.sleep(2)
            
            # Get device info
            print("\nDevice information:")
            status = controller.get_status()
            if status.get('device_resolution'):
                res = status['device_resolution']
                print(f"  Resolution: {res['width']}x{res['height']}")
            
            # Get installed apps
            print("\nGetting installed apps...")
            apps = controller.get_installed_apps()
            print(f"  Found {len(apps)} installed apps")
            if apps:
                print("  Sample apps:")
                for app in apps[:5]:  # Show first 5
                    print(f"    - {app['packageName']}")
            
            # Test media controls
            print("\nTesting media controls...")
            controller.press_key("VOLUME_UP")
            time.sleep(0.5)
            controller.press_key("VOLUME_DOWN")
            
            controller.disconnect()
            print("✅ Test completed successfully!")
            
        else:
            print("❌ Failed to connect to device")
            print("Make sure:")
            print("  1. ADB is installed and in PATH")
            print("  2. Device has USB debugging enabled")
            print("  3. Device is reachable on the network")
            print(f"  4. You can manually connect: adb connect {device_ip}")
            
    except Exception as e:
        print(f"❌ Error: {e}")


def main():
    """Main demo function."""
    parser = argparse.ArgumentParser(description="Demo Real Android TV Remote Controller")
    parser.add_argument("--device-ip", help="IP address of Android TV device for real testing")
    parser.add_argument("--skip-real", action="store_true", help="Skip real device testing")
    
    args = parser.parse_args()
    
    print("VirtualPyTest - Real Android TV Remote Controller Demo")
    print("=" * 60)
    
    # Run basic demos (these work without real device)
    demo_basic_controller()
    demo_factory_usage()
    demo_device_controller_set()
    
    # Real device testing
    if not args.skip_real:
        if args.device_ip:
            demo_with_real_device(args.device_ip)
        else:
            print("\n" + "=" * 60)
            print("REAL DEVICE TESTING SKIPPED")
            print("=" * 60)
            print("To test with a real device, use:")
            print("  python3 demo_real_android_tv.py --device-ip YOUR_DEVICE_IP")
            print("\nExample:")
            print("  python3 demo_real_android_tv.py --device-ip 192.168.1.100")
    
    print("\n" + "=" * 60)
    print("DEMO COMPLETED")
    print("=" * 60)


if __name__ == "__main__":
    main() 
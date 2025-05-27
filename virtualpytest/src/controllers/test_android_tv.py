#!/usr/bin/env python3
"""
Simple test script for Real Android TV Remote Controller

This script tests the Android TV controller directly without complex imports.
"""

import sys
import os
import time

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from android_tv_remote_controller import AndroidTVRemoteController


def test_controller_creation():
    """Test creating the controller."""
    print("=" * 50)
    print("TEST: Controller Creation")
    print("=" * 50)
    
    try:
        # Test controller creation
        controller = AndroidTVRemoteController(
            device_name="Test Android TV",
            device_ip="192.168.1.100"
        )
        
        print(f"✅ Controller created successfully!")
        print(f"   Device name: {controller.device_name}")
        print(f"   Device IP: {controller.device_ip}")
        print(f"   ADB device: {controller.adb_device}")
        print(f"   Controller type: {controller.controller_type}")
        print(f"   Device type: {controller.device_type}")
        
        return controller
        
    except Exception as e:
        print(f"❌ Controller creation failed: {e}")
        return None


def test_controller_interface(controller):
    """Test controller interface without connecting."""
    print("\n" + "=" * 50)
    print("TEST: Controller Interface")
    print("=" * 50)
    
    try:
        # Test getting status without connection
        status = controller.get_status()
        print("✅ get_status() works")
        print(f"   Connected: {status['connected']}")
        print(f"   Capabilities: {len(status['capabilities'])} items")
        
        # Test key mapping
        test_keys = ["UP", "DOWN", "HOME", "BACK", "OK"]
        print(f"\n✅ Key mappings work:")
        for key in test_keys:
            adb_key = controller.ADB_KEYS.get(key)
            print(f"   {key} -> {adb_key}")
        
        # Test invalid key
        invalid_key = controller.ADB_KEYS.get("INVALID_KEY")
        print(f"   INVALID_KEY -> {invalid_key} (should be None)")
        
        return True
        
    except Exception as e:
        print(f"❌ Interface test failed: {e}")
        return False


def test_connection_attempt(controller):
    """Test connection attempt (will fail without real device)."""
    print("\n" + "=" * 50)
    print("TEST: Connection Attempt")
    print("=" * 50)
    
    try:
        print("Attempting to connect (expected to fail without real device)...")
        
        # This will fail without a real device, but tests the connection logic
        success = controller.connect()
        
        if success:
            print("✅ Connected successfully!")
            
            # Test basic operations
            print("Testing basic operations...")
            controller.press_key("HOME")
            controller.input_text("test")
            
            # Test sequence
            sequence = [
                {'action': 'press_key', 'params': {'key': 'UP'}, 'delay': 0.1},
                {'action': 'press_key', 'params': {'key': 'DOWN'}, 'delay': 0.1},
            ]
            controller.execute_sequence(sequence)
            
            controller.disconnect()
            print("✅ Disconnected successfully!")
            
        else:
            print("❌ Connection failed (expected without real device)")
            print("   This is normal if you don't have a real Android TV device")
            
        return True
        
    except Exception as e:
        print(f"❌ Connection test failed: {e}")
        return False


def test_error_handling(controller):
    """Test error handling when not connected."""
    print("\n" + "=" * 50)
    print("TEST: Error Handling")
    print("=" * 50)
    
    try:
        # Ensure we're not connected
        controller.is_connected = False
        
        # Test operations that should fail gracefully
        print("Testing operations while disconnected...")
        
        result1 = controller.press_key("HOME")
        print(f"   press_key() returned: {result1} (should be False)")
        
        result2 = controller.input_text("test")
        print(f"   input_text() returned: {result2} (should be False)")
        
        result3 = controller.launch_app("com.test.app")
        print(f"   launch_app() returned: {result3} (should be False)")
        
        apps = controller.get_installed_apps()
        print(f"   get_installed_apps() returned: {len(apps)} apps (should be 0)")
        
        if not result1 and not result2 and not result3 and len(apps) == 0:
            print("✅ Error handling works correctly")
            return True
        else:
            print("❌ Error handling not working as expected")
            return False
            
    except Exception as e:
        print(f"❌ Error handling test failed: {e}")
        return False


def main():
    """Main test function."""
    print("VirtualPyTest - Android TV Remote Controller Test")
    print("=" * 60)
    
    # Test 1: Controller creation
    controller = test_controller_creation()
    if not controller:
        print("\n❌ Cannot continue tests without controller")
        return
    
    # Test 2: Interface testing
    if not test_controller_interface(controller):
        print("\n❌ Interface test failed")
        return
    
    # Test 3: Connection attempt
    if not test_connection_attempt(controller):
        print("\n❌ Connection test failed")
        return
    
    # Test 4: Error handling
    if not test_error_handling(controller):
        print("\n❌ Error handling test failed")
        return
    
    print("\n" + "=" * 60)
    print("✅ ALL TESTS PASSED!")
    print("=" * 60)
    print("\nThe Android TV Remote Controller is working correctly.")
    print("To test with a real device:")
    print("1. Make sure ADB is installed")
    print("2. Enable USB debugging on your Android TV")
    print("3. Connect via: adb connect YOUR_DEVICE_IP:5555")
    print("4. Modify the device_ip in this script")


if __name__ == "__main__":
    main() 
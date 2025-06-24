#!/usr/bin/env python3
"""
Test script to debug Android Mobile Remote Controller connection
"""

import sys
import os

# Add the swe dont rc directory to the path
current_dir = os.path.dirname(os.path.abspath(__file__))
src_dir = os.path.join(current_dir, 'src')
sys.path.insert(0, src_dir)



def test_adb_utils():
    """Test ADB utils directly"""
    try:
        print("=== Testing ADB Utils Directly ===")
        from src.adb_utils import ADBUtils
        
        adb = ADBUtils()
        device_id = "192.168.1.29:5555"
        
        print(f"Testing connection to: {device_id}")
        
        # Test connection
        result = adb.connect_device(device_id)
        print(f"Connection result: {result}")
        
        if result:
            print("✅ ADB connection successful!")
            
            # Test device resolution
            resolution = adb.get_device_resolution(device_id)
            print(f"Device resolution: {resolution}")
            
            # Test a simple command
            success = adb.execute_key_command(device_id, "HOME")
            print(f"Key command test: {success}")
        else:
            print("❌ ADB connection failed!")
            
    except Exception as e:
        print(f"❌ ADB Utils test failed: {e}")
        import traceback
        traceback.print_exc()

def test_android_controller():
    """Test Android Mobile Remote Controller"""
    try:
        print("\n=== Testing Android Mobile Remote Controller ===")
        from controllers.remote.android_mobile import AndroidMobileRemoteController
        
        device_ip = "192.168.1.29"
        device_port = 5555
        
        print(f"Creating controller for: {device_ip}:{device_port}")
        
        # Create controller (this will try to connect in __init__)
        controller = AndroidMobileRemoteController(device_ip=device_ip, device_port=device_port)
        
        print(f"Controller created. Is connected: {controller.is_connected}")
        
        if controller.is_connected:
            print("✅ Controller connected successfully!")
            
            # Test status
            status = controller.get_status()
            print(f"Controller status: {status}")
            
            # Test a command
            result = controller.press_key("HOME")
            print(f"Press HOME result: {result}")
        else:
            print("❌ Controller not connected")
            
            # Try manual connect
            print("Trying manual connect...")
            manual_result = controller.connect()
            print(f"Manual connect result: {manual_result}")
            
    except Exception as e:
        print(f"❌ Controller test failed: {e}")
        import traceback
        traceback.print_exc()

def test_adb_command():
    """Test raw ADB command"""
    try:
        print("\n=== Testing Raw ADB Command ===")
        import subprocess
        
        device_id = "192.168.1.29:5555"
        
        # Test adb devices
        print("Running 'adb devices'...")
        result = subprocess.run(['adb', 'devices'], capture_output=True, text=True)
        print(f"Exit code: {result.returncode}")
        print(f"Output: {result.stdout}")
        print(f"Error: {result.stderr}")
        
        # Test connect
        print(f"\nTrying to connect to {device_id}...")
        result = subprocess.run(['adb', 'connect', device_id], capture_output=True, text=True)
        print(f"Exit code: {result.returncode}")
        print(f"Output: {result.stdout}")
        print(f"Error: {result.stderr}")
        
        # Test devices again
        print("\nRunning 'adb devices' again...")
        result = subprocess.run(['adb', 'devices'], capture_output=True, text=True)
        print(f"Exit code: {result.returncode}")
        print(f"Output: {result.stdout}")
        print(f"Error: {result.stderr}")
        
    except Exception as e:
        print(f"❌ Raw ADB test failed: {e}")

if __name__ == "__main__":
    print("🔍 Testing Android Mobile Remote Controller Connection")
    print("=" * 60)
    
    # Test in order of complexity
    test_adb_command()
    test_adb_utils() 
    test_android_controller()
    
    print("\n" + "=" * 60)
    print("🏁 Test completed!") 
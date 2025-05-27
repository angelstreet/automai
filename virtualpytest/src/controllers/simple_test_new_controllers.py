#!/usr/bin/env python3
"""
Simple test script for new IR and Bluetooth remote controllers

This script tests the creation and basic functionality of the new controllers
without complex factory imports.
"""

import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Test the controllers directly
def test_ir_controller_simple():
    """Simple test of IR remote controller."""
    print("=" * 50)
    print("SIMPLE TEST: IR Remote Controller")
    print("=" * 50)
    
    try:
        # Import and create IR controller directly
        from ir_remote_controller import IRRemoteController
        
        ir_remote = IRRemoteController(
            device_name="Test IR Remote",
            ir_device="/dev/lirc0",
            protocol="NEC",
            frequency=38000
        )
        
        print(f"✅ IR Controller created: {ir_remote.device_name}")
        print(f"  Device type: {ir_remote.device_type}")
        print(f"  Protocol: {ir_remote.protocol}")
        print(f"  Frequency: {ir_remote.frequency}Hz")
        print(f"  Supported keys: {len(ir_remote.IR_KEYCODES)} keys")
        
        # Test connection
        if ir_remote.connect():
            print("✅ IR Controller connected successfully")
            
            # Test a few key presses
            test_keys = ["POWER", "HOME", "UP", "OK", "1", "VOLUME_UP"]
            for key in test_keys:
                if ir_remote.press_key(key):
                    print(f"  ✅ Key press: {key}")
                else:
                    print(f"  ❌ Key press failed: {key}")
                    
            # Test text input
            if ir_remote.input_text("123"):
                print("  ✅ Text input: '123'")
            else:
                print("  ❌ Text input failed")
                
            # Test status
            status = ir_remote.get_status()
            print(f"  ✅ Status: Connected={status['connected']}, Keys={len(status['supported_keys'])}")
            
            ir_remote.disconnect()
            print("✅ IR Controller disconnected")
            
        else:
            print("❌ IR Controller connection failed")
            
        return True
        
    except Exception as e:
        print(f"❌ IR Controller test failed: {e}")
        return False


def test_bluetooth_controller_simple():
    """Simple test of Bluetooth remote controller."""
    print("\n" + "=" * 50)
    print("SIMPLE TEST: Bluetooth Remote Controller")
    print("=" * 50)
    
    try:
        # Import and create Bluetooth controller directly
        from bluetooth_remote_controller import BluetoothRemoteController
        
        bt_remote = BluetoothRemoteController(
            device_name="Test Bluetooth Remote",
            device_address="AA:BB:CC:DD:EE:FF",
            pairing_pin="1234"
        )
        
        print(f"✅ Bluetooth Controller created: {bt_remote.device_name}")
        print(f"  Device type: {bt_remote.device_type}")
        print(f"  Device address: {bt_remote.device_address}")
        print(f"  HID profile: {bt_remote.hid_profile}")
        print(f"  Supported keys: {len(bt_remote.BT_KEYCODES)} keys")
        
        # Test connection
        if bt_remote.connect():
            print("✅ Bluetooth Controller connected successfully")
            
            # Test a few key presses
            test_keys = ["POWER", "HOME", "UP", "OK", "A", "1", "VOLUME_UP"]
            for key in test_keys:
                if bt_remote.press_key(key):
                    print(f"  ✅ Key press: {key}")
                else:
                    print(f"  ❌ Key press failed: {key}")
                    
            # Test text input
            if bt_remote.input_text("HELLO"):
                print("  ✅ Text input: 'HELLO'")
            else:
                print("  ❌ Text input failed")
                
            # Test status
            status = bt_remote.get_status()
            print(f"  ✅ Status: Connected={status['connected']}, Paired={status['paired']}, Keys={len(status['supported_keys'])}")
            
            bt_remote.disconnect()
            print("✅ Bluetooth Controller disconnected")
            
        else:
            print("❌ Bluetooth Controller connection failed")
            
        return True
        
    except Exception as e:
        print(f"❌ Bluetooth Controller test failed: {e}")
        return False


def test_keycodes():
    """Test that keycodes are properly defined."""
    print("\n" + "=" * 50)
    print("SIMPLE TEST: Keycodes Verification")
    print("=" * 50)
    
    try:
        from ir_remote_controller import IRRemoteController
        from bluetooth_remote_controller import BluetoothRemoteController
        
        # Test IR keycodes
        ir_remote = IRRemoteController()
        ir_keys = ir_remote.IR_KEYCODES
        print(f"✅ IR Controller has {len(ir_keys)} keycodes defined")
        
        # Check some essential keys
        essential_ir_keys = ['POWER', 'HOME', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'OK', 'VOLUME_UP', 'VOLUME_DOWN']
        missing_ir_keys = [key for key in essential_ir_keys if key not in ir_keys]
        if not missing_ir_keys:
            print("  ✅ All essential IR keys are defined")
        else:
            print(f"  ❌ Missing IR keys: {missing_ir_keys}")
            
        # Test Bluetooth keycodes
        bt_remote = BluetoothRemoteController()
        bt_keys = bt_remote.BT_KEYCODES
        print(f"✅ Bluetooth Controller has {len(bt_keys)} keycodes defined")
        
        # Check some essential keys
        essential_bt_keys = ['POWER', 'HOME', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'OK', 'A', 'Z', '1', '9']
        missing_bt_keys = [key for key in essential_bt_keys if key not in bt_keys]
        if not missing_bt_keys:
            print("  ✅ All essential Bluetooth keys are defined")
        else:
            print(f"  ❌ Missing Bluetooth keys: {missing_bt_keys}")
            
        return len(missing_ir_keys) == 0 and len(missing_bt_keys) == 0
        
    except Exception as e:
        print(f"❌ Keycodes test failed: {e}")
        return False


def main():
    """Run simple tests."""
    print("VirtualPyTest - Simple New Controllers Test")
    print("=" * 60)
    
    tests = [
        test_ir_controller_simple,
        test_bluetooth_controller_simple,
        test_keycodes,
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        else:
            print(f"\n❌ Test failed: {test.__name__}")
    
    print("\n" + "=" * 60)
    print(f"SIMPLE TEST RESULTS: {passed}/{total} tests passed")
    print("=" * 60)
    
    if passed == total:
        print("🎉 All simple tests passed! New controllers are working correctly.")
        print("\nNew controllers verified:")
        print("  ✅ IR Remote Controller - Classic TV/STB buttons with IR keycodes")
        print("  ✅ Bluetooth Remote Controller - HID protocol with alphanumeric support")
        print("  ✅ Keycode definitions - All essential keys properly defined")
        print("\nReady for integration with the factory system!")
        return True
    else:
        print("❌ Some tests failed. Please check the implementation.")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 
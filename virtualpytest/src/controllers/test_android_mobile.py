#!/usr/bin/env python3
"""
Simple test script for Real Android Mobile Remote Controller

This script tests the Android mobile controller creation and basic functionality
without requiring actual SSH or ADB connections.
"""

import sys
import os
import time

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from android_mobile_remote_controller import AndroidMobileRemoteController


def test_controller_creation():
    """Test creating the mobile controller."""
    print("=" * 50)
    print("TEST: Mobile Controller Creation")
    print("=" * 50)
    
    try:
        # Test controller creation with required parameters
        controller = AndroidMobileRemoteController(
            device_name="Test Android Mobile",
            host_ip="192.168.1.50",
            host_username="testuser",
            host_password="testpass",
            device_ip="192.168.1.100"
        )
        
        print(f"✅ Controller created successfully")
        print(f"  Device name: {controller.device_name}")
        print(f"  Device type: {controller.device_type}")
        print(f"  Controller type: {controller.controller_type}")
        print(f"  SSH host: {controller.host_ip}:{controller.host_port}")
        print(f"  SSH username: {controller.host_username}")
        print(f"  Android device: {controller.android_device_id}")
        print(f"  Connection timeout: {controller.connection_timeout}s")
        print(f"  Connected: {controller.is_connected}")
        
        return True
        
    except Exception as e:
        print(f"❌ Controller creation failed: {e}")
        return False


def test_parameter_validation():
    """Test parameter validation."""
    print("\n" + "=" * 50)
    print("TEST: Parameter Validation")
    print("=" * 50)
    
    # Test missing host_ip
    try:
        controller = AndroidMobileRemoteController(
            device_name="Test Mobile",
            host_username="testuser",
            device_ip="192.168.1.100"
        )
        print("❌ Should have failed with missing host_ip")
        return False
    except ValueError as e:
        print(f"✅ Correctly caught missing host_ip: {e}")
    
    # Test missing host_username
    try:
        controller = AndroidMobileRemoteController(
            device_name="Test Mobile",
            host_ip="192.168.1.50",
            device_ip="192.168.1.100"
        )
        print("❌ Should have failed with missing host_username")
        return False
    except ValueError as e:
        print(f"✅ Correctly caught missing host_username: {e}")
    
    # Test missing device_ip
    try:
        controller = AndroidMobileRemoteController(
            device_name="Test Mobile",
            host_ip="192.168.1.50",
            host_username="testuser"
        )
        print("❌ Should have failed with missing device_ip")
        return False
    except ValueError as e:
        print(f"✅ Correctly caught missing device_ip: {e}")
    
    print("✅ All parameter validation tests passed")
    return True


def test_status_method():
    """Test the get_status method."""
    print("\n" + "=" * 50)
    print("TEST: Status Method")
    print("=" * 50)
    
    try:
        controller = AndroidMobileRemoteController(
            device_name="Status Test Mobile",
            host_ip="192.168.1.50",
            host_username="testuser",
            host_password="testpass",
            device_ip="192.168.1.100",
            adb_port=5555,
            connection_timeout=15
        )
        
        status = controller.get_status()
        
        print("✅ Status retrieved successfully:")
        expected_keys = [
            'controller_type', 'device_type', 'device_name', 'host_ip', 
            'host_port', 'host_username', 'device_ip', 'adb_port',
            'android_device_id', 'connected', 'connection_timeout',
            'device_resolution', 'last_ui_elements_count', 'last_dump_time',
            'supported_keys', 'capabilities'
        ]
        
        for key in expected_keys:
            if key in status:
                print(f"  ✅ {key}: {status[key]}")
            else:
                print(f"  ❌ Missing key: {key}")
                return False
        
        # Check specific values
        assert status['controller_type'] == 'remote'
        assert status['device_type'] == 'android_mobile'
        assert status['device_name'] == 'Status Test Mobile'
        assert status['host_ip'] == '192.168.1.50'
        assert status['host_port'] == 22
        assert status['host_username'] == 'testuser'
        assert status['device_ip'] == '192.168.1.100'
        assert status['adb_port'] == 5555
        assert status['android_device_id'] == '192.168.1.100:5555'
        assert status['connected'] == False
        assert status['connection_timeout'] == 15
        assert status['last_ui_elements_count'] == 0
        assert isinstance(status['capabilities'], list)
        
        print("✅ All status values are correct")
        return True
        
    except Exception as e:
        print(f"❌ Status test failed: {e}")
        return False


def test_element_finding_methods():
    """Test element finding methods with mock data."""
    print("\n" + "=" * 50)
    print("TEST: Element Finding Methods")
    print("=" * 50)
    
    try:
        controller = AndroidMobileRemoteController(
            device_name="Element Test Mobile",
            host_ip="192.168.1.50",
            host_username="testuser",
            host_password="testpass",
            device_ip="192.168.1.100"
        )
        
        # Mock some UI elements for testing
        from lib.adbUtils import AndroidElement
        
        mock_elements = [
            AndroidElement(1, "Button", "Settings", "com.android.settings:id/settings_button", "Settings app", "android.widget.Button", "[100,200][300,250]"),
            AndroidElement(2, "TextView", "Phone", "com.android.dialer:id/phone_label", "Phone application", "android.widget.TextView", "[100,300][300,350]"),
            AndroidElement(3, "ImageView", "", "com.android.camera:id/camera_icon", "Camera", "android.widget.ImageView", "[100,400][300,450]"),
        ]
        
        controller.last_ui_elements = mock_elements
        
        # Test find by text
        settings_element = controller.find_element_by_text("Settings")
        if settings_element and settings_element.text == "Settings":
            print("✅ find_element_by_text works correctly")
        else:
            print("❌ find_element_by_text failed")
            return False
        
        # Test find by resource ID
        phone_element = controller.find_element_by_resource_id("phone_label")
        if phone_element and "phone_label" in phone_element.resource_id:
            print("✅ find_element_by_resource_id works correctly")
        else:
            print("❌ find_element_by_resource_id failed")
            return False
        
        # Test find by content description
        camera_element = controller.find_element_by_content_desc("Camera")
        if camera_element and camera_element.content_desc == "Camera":
            print("✅ find_element_by_content_desc works correctly")
        else:
            print("❌ find_element_by_content_desc failed")
            return False
        
        # Test verify element exists
        if controller.verify_element_exists(text="Settings"):
            print("✅ verify_element_exists (by text) works correctly")
        else:
            print("❌ verify_element_exists (by text) failed")
            return False
        
        if controller.verify_element_exists(resource_id="phone_label"):
            print("✅ verify_element_exists (by resource_id) works correctly")
        else:
            print("❌ verify_element_exists (by resource_id) failed")
            return False
        
        if controller.verify_element_exists(content_desc="Camera"):
            print("✅ verify_element_exists (by content_desc) works correctly")
        else:
            print("❌ verify_element_exists (by content_desc) failed")
            return False
        
        # Test non-existent element
        if not controller.verify_element_exists(text="NonExistent"):
            print("✅ verify_element_exists correctly returns False for non-existent element")
        else:
            print("❌ verify_element_exists should return False for non-existent element")
            return False
        
        print("✅ All element finding tests passed")
        return True
        
    except Exception as e:
        print(f"❌ Element finding test failed: {e}")
        return False


def test_disconnected_operations():
    """Test operations when not connected."""
    print("\n" + "=" * 50)
    print("TEST: Disconnected Operations")
    print("=" * 50)
    
    try:
        controller = AndroidMobileRemoteController(
            device_name="Disconnected Test Mobile",
            host_ip="192.168.1.50",
            host_username="testuser",
            host_password="testpass",
            device_ip="192.168.1.100"
        )
        
        # Test operations that should fail when not connected
        operations = [
            ("press_key", lambda: controller.press_key("HOME")),
            ("input_text", lambda: controller.input_text("test")),
            ("launch_app", lambda: controller.launch_app("com.android.settings")),
            ("dump_ui_elements", lambda: controller.dump_ui_elements()),
            ("get_installed_apps", lambda: controller.get_installed_apps()),
        ]
        
        for op_name, op_func in operations:
            try:
                result = op_func()
                if op_name == "dump_ui_elements":
                    success, elements, error = result
                    if not success and "Not connected" in error:
                        print(f"✅ {op_name} correctly failed when disconnected")
                    else:
                        print(f"❌ {op_name} should fail when disconnected")
                        return False
                elif op_name == "get_installed_apps":
                    if result == []:  # Should return empty list
                        print(f"✅ {op_name} correctly returned empty list when disconnected")
                    else:
                        print(f"❌ {op_name} should return empty list when disconnected")
                        return False
                else:
                    if not result:  # Should return False
                        print(f"✅ {op_name} correctly failed when disconnected")
                    else:
                        print(f"❌ {op_name} should return False when disconnected")
                        return False
            except Exception as e:
                print(f"❌ {op_name} raised exception when disconnected: {e}")
                return False
        
        print("✅ All disconnected operation tests passed")
        return True
        
    except Exception as e:
        print(f"❌ Disconnected operations test failed: {e}")
        return False


def main():
    """Run all tests."""
    print("VirtualPyTest - Android Mobile Remote Controller Tests")
    print("=" * 60)
    
    tests = [
        test_controller_creation,
        test_parameter_validation,
        test_status_method,
        test_element_finding_methods,
        test_disconnected_operations,
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        else:
            print(f"\n❌ Test failed: {test.__name__}")
    
    print("\n" + "=" * 60)
    print(f"TEST RESULTS: {passed}/{total} tests passed")
    print("=" * 60)
    
    if passed == total:
        print("🎉 All tests passed! Android Mobile Controller is working correctly.")
        print("\nKey features verified:")
        print("  ✅ Controller creation and initialization")
        print("  ✅ Parameter validation")
        print("  ✅ Status reporting")
        print("  ✅ UI element finding and verification")
        print("  ✅ Proper error handling when disconnected")
        print("\nReady for real SSH + ADB connections!")
        return True
    else:
        print("❌ Some tests failed. Please check the implementation.")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 
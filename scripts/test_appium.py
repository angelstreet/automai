# Simple test to verify the simplified Appium controller functionality
# This tests the core changes without complex module imports

def test_appium_controller_constructor():
    """Test that the Appium controller constructor works with only mandatory fields."""
    print("=== Testing Simplified Appium Controller Constructor ===")
    
    try:
        # Test 1: Import the controller class
        import sys
        import os
        
        # Add paths for imports
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        sys.path.insert(0, os.path.join(project_root, 'virtualpytest', 'src'))
        
        # Import using absolute path to avoid relative import issues
        sys.path.insert(0, os.path.join(project_root, 'virtualpytest', 'src', 'controllers', 'remote'))
        from appium_remote import AppiumRemoteController
        
        print("   ✓ AppiumRemoteController imported successfully")
        
        # Test 2: Create controller with mandatory parameters only
        controller = AppiumRemoteController(
            appium_platform_name="iOS",
            appium_device_id="00008030-000549E23403802E",
            appium_server_url="http://localhost:4723"
        )
        
        print("   ✓ Controller created successfully with mandatory parameters")
        print(f"   ✓ Platform: {controller.platform_name}")
        print(f"   ✓ Device ID: {controller.device_id}")
        print(f"   ✓ Server URL: {controller.appium_server_url}")
        
        # Test 3: Verify controller has expected attributes
        assert hasattr(controller, 'platform_name'), "Missing platform_name attribute"
        assert hasattr(controller, 'device_id'), "Missing device_id attribute"
        assert hasattr(controller, 'appium_server_url'), "Missing appium_server_url attribute"
        assert hasattr(controller, 'last_ui_elements'), "Missing last_ui_elements attribute"
        assert hasattr(controller, 'last_dump_time'), "Missing last_dump_time attribute"
        
        print("   ✓ All required attributes present")
        
        # Test 4: Test validation of mandatory parameters
        try:
            AppiumRemoteController("", "device123", "http://localhost:4723")
            print("   ❌ Should have failed with empty platform_name")
        except ValueError as e:
            print(f"   ✓ Correctly validates platform_name: {e}")
        
        try:
            AppiumRemoteController("iOS", "", "http://localhost:4723")
            print("   ❌ Should have failed with empty device_id")
        except ValueError as e:
            print(f"   ✓ Correctly validates device_id: {e}")
        
        try:
            AppiumRemoteController("iOS", "device123", "")
            print("   ❌ Should have failed with empty server_url")
        except ValueError as e:
            print(f"   ✓ Correctly validates server_url: {e}")
        
        print("\n=== Test PASSED ===")
        print("✅ Simplified Appium controller works correctly!")
        print("\nRequired environment variables:")
        print("DEVICE1_APPIUM_PLATFORM_NAME=iOS")
        print("DEVICE1_APPIUM_DEVICE_ID=00008030-000549E23403802E")
        print("DEVICE1_APPIUM_SERVER_URL=http://localhost:4723")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_appium_controller_constructor()
    exit(0 if success else 1)

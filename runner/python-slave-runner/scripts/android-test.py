import argparse
import sys
from appium import webdriver
from appium.webdriver.common.appiumby import AppiumBy
from appium.options.android import UiAutomator2Options

def main():
    # Parse command-line arguments
    parser = argparse.ArgumentParser(description="Launch an Android app with Appium")
    parser.add_argument(
        "--package",
        default="com.lgi.upcch.preprod",
        help="App package name (default: com.lgi.upcch.preprod)"
    )
    args = parser.parse_args()

    # Desired capabilities for Appium
    capabilities = {
        "platformName": "Android",
        "appium:platformVersion": "12",  # Adjust if your device's version differs
        "appium:deviceName": "any-name",
        "appium:udid": "RZCTB0ZX4PM",  # From your adb devices output
        "appium:automationName": "UiAutomator2",
        "appium:appPackage": args.package,  # Use package from command-line or default
        "appium:appActivity": "com.lgi.upcch.preprod.MainActivity",  # Replace with correct activity
        "appium:noReset": True
    }

    # Set up options with capabilities
    options = UiAutomator2Options().load_capabilities(capabilities)

    # Initialize the Appium driver
    try:
        driver = webdriver.Remote(command_executor="http://localhost:4723", options=options)
    except Exception as e:
        print(f"Test Failed: Failed to initialize Appium driver: {e}")
        return 1

    try:
        # Wait for the app to load
        driver.implicitly_wait(10)

        # Verify the app is launched by finding an element
        element = driver.find_element(AppiumBy.ID, "com.lgi.upcch.preprod:id/main_view")  # Replace with correct ID
        print(f"Test Success: Sunrise TV app ({args.package}) launched successfully!")
        return 0

    except Exception as e:
        print(f"Test Failed: {e}")
        return 1

    finally:
        # Close the driver
        driver.quit()

if __name__ == "__main__":
    sys.exit(main())
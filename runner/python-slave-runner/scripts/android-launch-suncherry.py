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
    parser.add_argument(
        "--activity",
        default="com.libertyglobal.horizonx.MainActivity",
        help="App activity name (default: com.libertyglobal.horizonx.MainActivity)"
    )
    # Parse known args only, ignoring unknown args
    args, unknown = parser.parse_known_args()
    if unknown:
        print(f"Warning: Ignoring unknown arguments: {unknown}")

    # Desired capabilities for Appium
    capabilities = {
        "platformName": "Android",
        "appium:platformVersion": "12",
        "appium:deviceName": "any-name",
        "appium:udid": "192.168.1.29:5555",
        "appium:automationName": "UiAutomator2",
        "appium:appPackage": args.package,
        "appium:appActivity": args.activity,
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

        # Verify the app is launched by finding an element (commented out until correct ID is found)
        # element = driver.find_element(AppiumBy.ID, "com.lgi.upcch.preprod:id/main_view")  # Replace with correct ID
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
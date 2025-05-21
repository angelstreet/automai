from appium import webdriver
from appium.webdriver.common.appiumby import AppiumBy
from appium.options.android import UiAutomator2Options

# Desired capabilities for Appium
capabilities = {
    "platformName": "Android",
    "appium:platformVersion": "12",  # Adjust if your device's version differs
    "appium:deviceName": "any-name",
    "appium:udid": "RZCTB0ZX4PM",  # From your adb devices output
    "appium:automationName": "UiAutomator2",
    "appium:appPackage": "com.google.android.deskclock",  # Default Android Clock app package
    "appium:appActivity": "com.android.deskclock.DeskClock",  # Main activity for Clock app
    "appium:noReset": True
}

# Set up options with capabilities
options = UiAutomator2Options().load_capabilities(capabilities)

# Initialize the Appium driver
driver = webdriver.Remote(command_executor="http://localhost:4723", options=options)

try:
    # Wait for the app to load (implicit wait)
    driver.implicitly_wait(10)

    # Optional: Verify the app is launched by finding an element (e.g., Clock tab)
    element = driver.find_element(AppiumBy.ID, "com.google.android.deskclock:id/tab_menu_clock")
    print("Clock app launched successfully!")

except Exception as e:
    print(f"An error occurred: {e}")

finally:
    # Close the driver
    driver.quit()
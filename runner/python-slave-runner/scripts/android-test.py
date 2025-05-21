from appium import webdriver
from appium.webdriver.common.appiumby import AppiumBy

# Desired capabilities for Appium
desired_caps = {
    "platformName": "Android",
    "appium:platformVersion": "12",  # Adjust if your device's version differs
    "appium:deviceName": "any-name",
    "appium:udid": "RZCTB0ZX4PM",  # From your adb devices output
    "appium:automationName": "UiAutomator2",
    "appium:appPackage": "com.google.android.deskclock",  # Default Android Clock app package
    "appium:appActivity": "com.android.deskclock.DeskClock",  # Main activity for Clock app
    "appium:noReset": True
}
    
# Initialize the Appium driver
driver = webdriver.Remote("http://localhost:4723", desired_caps)

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
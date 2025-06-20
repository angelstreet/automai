from appium import webdriver
from appium.options.common import AppiumOptions

desired_caps = {
    "platformName": "iOS",
    "platformVersion": "18.5",  # e.g., "16.0"
    "deviceName": "iPhone",      # e.g., "iPhone"
    "udid": "00008030-000549E23403802E",  # Get via `idevice_id -l`
    "automationName": "XCUITest",
    "usePrebuiltWDA": True
}
# Initialize Appium options
options = AppiumOptions()
options.load_capabilities(desired_caps)

# Connect to Appium server
driver = webdriver.Remote(command_executor='http://localhost:4723', options=options)
try:
    driver.tap([(100, 200)])  # Tap at coordinates
    print(driver.page_source)  # Dump UI
    driver.activate_app("com.apple.Maps")  # Launch app
    driver.terminate_app("com.apple.Maps")  # Close app
finally:
    driver.quit()

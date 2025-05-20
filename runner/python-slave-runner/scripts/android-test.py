from appium import webdriver
from appium.webdriver.common.appiumby import AppiumBy

desired_caps = {
    "platformName": "Android",
    "appium:platformVersion": "12",  # Adjust to your device’s version
    "appium:deviceName": "any-name",
    "appium:udid": "<device-udid>",  # Get from `adb devices`
    "appium:automationName": "UiAutomator2",
    "appium:app": "/path/to/your-app.apk",
    "appium:noReset": true
}

driver = webdriver.Remote("http://localhost:4723", desired_caps)
try:
    element = driver.find_element(AppiumBy.ACCESSIBILITY_ID, "login-button")
    element.click()
finally:
    driver.quit()
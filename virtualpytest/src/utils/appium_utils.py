"""
Appium Utils Implementation

This module provides Appium WebDriver utilities for universal device automation.
Supports iOS (XCUITest), Android (UIAutomator2), and other Appium-compatible platforms.
Key difference from ADB utils: uses Appium WebDriver API for cross-platform compatibility.
"""

from typing import Dict, Any, List, Optional, Tuple
import subprocess
import time
import json
import os
import base64
import re
from dataclasses import dataclass
from pathlib import Path

# Appium imports
try:
    from appium import webdriver
    from appium.webdriver.common.appiumby import AppiumBy
    from appium.options.ios import XCUITestOptions
    from appium.options.android import UiAutomator2Options
    from appium.options.common import AppiumOptions
    from selenium.webdriver.remote.webelement import WebElement
    from selenium.common.exceptions import WebDriverException, NoSuchElementException
except ImportError as e:
    print(f"[@lib:appiumUtils] Warning: Appium dependencies not installed: {e}")
    print("[@lib:appiumUtils] Please install: pip install Appium-Python-Client selenium")


@dataclass
class AppiumElement:
    """Universal element class for Appium-compatible devices."""
    id: str
    text: str
    className: str
    package: str  # Android package or iOS bundle ID
    contentDesc: str  # Android content-desc or iOS accessibility label
    bounds: Dict[str, int]  # {left, top, right, bottom}
    clickable: bool
    enabled: bool
    focused: bool
    selected: bool
    # Platform-specific attributes
    platform: str  # 'ios', 'android', etc.
    resource_id: str = ""  # Android resource-id
    accessibility_id: str = ""  # iOS accessibility-id
    name: str = ""  # iOS name attribute
    label: str = ""  # iOS label attribute
    value: str = ""  # iOS value attribute
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert element to dictionary for JSON serialization."""
        return {
            'id': self.id,
            'text': self.text,
            'className': self.className,
            'package': self.package,
            'contentDesc': self.contentDesc,
            'bounds': self.bounds,
            'clickable': self.clickable,
            'enabled': self.enabled,
            'focused': self.focused,
            'selected': self.selected,
            'platform': self.platform,
            'resource_id': self.resource_id,
            'accessibility_id': self.accessibility_id,
            'name': self.name,
            'label': self.label,
            'value': self.value
        }


@dataclass
class AppiumApp:
    """Universal app class for Appium-compatible devices."""
    identifier: str  # Package name (Android) or Bundle ID (iOS)
    label: str
    version: str = ""
    platform: str = ""  # 'ios', 'android', etc.
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert app to dictionary for JSON serialization."""
        return {
            'identifier': self.identifier,
            'label': self.label,
            'version': self.version,
            'platform': self.platform
        }


class AppiumUtils:
    """Appium utilities for universal device automation."""
    
    def __init__(self):
        """Initialize Appium utilities."""
        self.drivers: Dict[str, webdriver.Remote] = {}  # device_id -> driver mapping
        self.device_platforms: Dict[str, str] = {}  # device_id -> platform mapping
        print("[@lib:appiumUtils] Initialized AppiumUtils")
    
    def execute_command(self, command: str) -> Tuple[bool, str, str, int]:
        """
        Execute a system command (for Appium server management).
        
        Args:
            command: Command to execute
            
        Returns:
            Tuple of (success, stdout, stderr, exit_code)
        """
        try:
            print(f"[@lib:appiumUtils:execute_command] Executing: {command}")
            
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            success = result.returncode == 0
            stdout = result.stdout.strip()
            stderr = result.stderr.strip()
            exit_code = result.returncode
            
            if success:
                print(f"[@lib:appiumUtils:execute_command] Command successful")
            else:
                print(f"[@lib:appiumUtils:execute_command] Command failed with exit code {exit_code}: {stderr}")
                
            return success, stdout, stderr, exit_code
            
        except subprocess.TimeoutExpired:
            error_msg = f"Command timed out after 30 seconds: {command}"
            print(f"[@lib:appiumUtils:execute_command] {error_msg}")
            return False, "", error_msg, -1
        except Exception as e:
            error_msg = f"Command execution error: {e}"
            print(f"[@lib:appiumUtils:execute_command] {error_msg}")
            return False, "", error_msg, -1
    
    def is_appium_server_running(self, appium_url: str = "http://localhost:4723") -> bool:
        """
        Check if Appium server is running.
        
        Args:
            appium_url: Appium server URL
            
        Returns:
            bool: True if server is running
        """
        try:
            import requests
            response = requests.get(f"{appium_url}/status", timeout=5)
            return response.status_code == 200
        except Exception:
            return False
    
    def connect_device(self, device_id: str, capabilities: Dict[str, Any], appium_url: str = "http://localhost:4723") -> bool:
        """
        Connect to a device via Appium WebDriver.
        
        Args:
            device_id: Unique device identifier
            capabilities: Appium capabilities dictionary
            appium_url: Appium server URL
            
        Returns:
            bool: True if connection successful
        """
        try:
            print(f"[@lib:appiumUtils:connect_device] Connecting to device {device_id}")
            print(f"[@lib:appiumUtils:connect_device] Capabilities: {capabilities}")
            
            # Check if Appium server is running
            if not self.is_appium_server_running(appium_url):
                print(f"[@lib:appiumUtils:connect_device] Appium server not running at {appium_url}")
                return False
            
            # Determine platform and create appropriate options
            platform = capabilities.get('platformName', '').lower()
            
            if platform == 'ios':
                options = XCUITestOptions()
            elif platform == 'android':
                options = UiAutomator2Options()
            else:
                options = AppiumOptions()
            
            options.load_capabilities(capabilities)
            
            # Create WebDriver instance
            driver = webdriver.Remote(command_executor=appium_url, options=options)
            
            # Store driver and platform info
            self.drivers[device_id] = driver
            self.device_platforms[device_id] = platform
            
            print(f"[@lib:appiumUtils:connect_device] Successfully connected to {platform} device {device_id}")
            return True
            
        except Exception as e:
            print(f"[@lib:appiumUtils:connect_device] Connection error: {e}")
            return False
    
    def disconnect_device(self, device_id: str) -> bool:
        """
        Disconnect from a device.
        
        Args:
            device_id: Device identifier
            
        Returns:
            bool: True if disconnection successful
        """
        try:
            print(f"[@lib:appiumUtils:disconnect_device] Disconnecting device {device_id}")
            
            if device_id in self.drivers:
                driver = self.drivers[device_id]
                driver.quit()
                del self.drivers[device_id]
                
            if device_id in self.device_platforms:
                del self.device_platforms[device_id]
                
            print(f"[@lib:appiumUtils:disconnect_device] Successfully disconnected device {device_id}")
            return True
            
        except Exception as e:
            print(f"[@lib:appiumUtils:disconnect_device] Disconnect error: {e}")
            return False
    
    def get_driver(self, device_id: str) -> Optional[webdriver.Remote]:
        """Get WebDriver instance for device."""
        return self.drivers.get(device_id)
    
    def get_platform(self, device_id: str) -> Optional[str]:
        """Get platform type for device."""
        return self.device_platforms.get(device_id)
    
    def dump_ui_elements(self, device_id: str) -> Tuple[bool, List[AppiumElement], str]:
        """
        Dump UI elements from device using Appium page source.
        
        Args:
            device_id: Device identifier
            
        Returns:
            Tuple of (success, elements_list, error_message)
        """
        try:
            
            driver = self.get_driver(device_id)
            if not driver:
                return False, [], f"No driver found for device {device_id}"
            
            platform = self.get_platform(device_id)
            
            # Get page source (XML)
            page_source = driver.page_source
            
            if not page_source or len(page_source.strip()) == 0:
                return False, [], "No page source received from device"
            
            # Parse elements based on platform
            elements = self._parse_ui_elements(page_source, platform or 'unknown')
            
            print(f"[@lib:appiumUtils:dump_ui_elements] Successfully dumped {len(elements)} UI elements")
            return True, elements, ""
            
        except Exception as e:
            error_msg = f"Error dumping UI elements: {e}"
            print(f"[@lib:appiumUtils:dump_ui_elements] {error_msg}")
            return False, [], error_msg
    
    def _parse_ui_elements(self, xml_data: str, platform: str) -> List[AppiumElement]:
        """
        Parse XML data to extract UI elements based on platform.
        
        Args:
            xml_data: XML content from page source
            platform: Device platform ('ios', 'android', etc.)
            
        Returns:
            List of AppiumElement objects
        """
        elements = []
        
        try:
            if platform == 'ios':
                elements = self._parse_ios_elements(xml_data)
            elif platform == 'android':
                elements = self._parse_android_elements(xml_data)
            else:
                # Generic parsing for unknown platforms
                elements = self._parse_generic_elements(xml_data, platform)
                
        except Exception as e:
            print(f"[@lib:appiumUtils:_parse_ui_elements] Error parsing {platform} elements: {e}")
            
        return elements
    
    def _parse_ios_elements(self, xml_data: str) -> List[AppiumElement]:
        """Parse iOS XCUITest page source."""
        elements = []
        
        # iOS uses XCUITest hierarchy with different element structure
        # Pattern to match iOS elements
        element_pattern = r'<([^>]*?)(?:\s+([^>]*?))?(?:\s*/\s*>|>.*?</\1>)'
        matches = re.findall(element_pattern, xml_data, re.DOTALL)
        
        element_counter = 0
        for i, match in enumerate(matches):
            try:
                if len(match) < 2:
                    continue
                    
                tag_name = match[0]
                attributes_str = match[1] if len(match) > 1 else ""
                
                # Extract iOS-specific attributes
                def get_ios_attr(attr: str) -> str:
                    attr_pattern = rf'{attr}="([^"]*)"'
                    attr_match = re.search(attr_pattern, attributes_str)
                    return attr_match.group(1) if attr_match else ""
                
                name = get_ios_attr('name')
                label = get_ios_attr('label') 
                value = get_ios_attr('value')
                type_attr = get_ios_attr('type')
                enabled = get_ios_attr('enabled') == 'true'
                visible = get_ios_attr('visible') == 'true'
                accessible = get_ios_attr('accessible') == 'true'
                x = get_ios_attr('x')
                y = get_ios_attr('y')
                width = get_ios_attr('width')
                height = get_ios_attr('height')
                
                # Skip non-visible or inaccessible elements
                if not visible and not accessible:
                    continue
                    
                # Skip elements without useful identifiers
                if not name and not label and not value and not type_attr:
                    continue
                
                element_counter += 1
                
                # Calculate bounds
                bounds = {
                    'left': int(x) if x.isdigit() else 0,
                    'top': int(y) if y.isdigit() else 0,
                    'right': int(x) + int(width) if x.isdigit() and width.isdigit() else 0,
                    'bottom': int(y) + int(height) if y.isdigit() and height.isdigit() else 0
                }
                
                element = AppiumElement(
                    id=str(element_counter),
                    text=label or value or "",
                    className=type_attr or tag_name,
                    package="",  # iOS doesn't have packages like Android
                    contentDesc=name or label or "",
                    bounds=bounds,
                    clickable=enabled and visible,
                    enabled=enabled,
                    focused=False,  # Would need additional detection
                    selected=False,  # Would need additional detection
                    platform='ios',
                    accessibility_id=name,
                    name=name,
                    label=label,
                    value=value
                )
                
                elements.append(element)
                
            except Exception as e:
                print(f"[@lib:appiumUtils:_parse_ios_elements] Error parsing iOS element {i}: {e}")
                continue
        
        print(f"[@lib:appiumUtils:_parse_ios_elements] Parsed {len(elements)} iOS elements")
        return elements
    
    def _parse_android_elements(self, xml_data: str) -> List[AppiumElement]:
        """Parse Android UIAutomator2 page source (similar to ADB dump)."""
        elements = []
        
        # Android uses node-based hierarchy similar to ADB dumps
        node_pattern = r'<node[^>]*(?:\/>|>.*?<\/node>)'
        matches = re.findall(node_pattern, xml_data, re.DOTALL)
        
        element_counter = 0
        for i, match in enumerate(matches):
            try:
                # Extract Android-specific attributes
                def get_android_attr(attr: str) -> str:
                    attr_pattern = rf'{attr}="([^"]*)"'
                    attr_match = re.search(attr_pattern, match)
                    return attr_match.group(1) if attr_match else ""
                
                text = get_android_attr('text').strip()
                resource_id = get_android_attr('resource-id')
                content_desc = get_android_attr('content-desc')
                class_name = get_android_attr('class')
                package = get_android_attr('package')
                bounds = get_android_attr('bounds')
                clickable = get_android_attr('clickable') == 'true'
                enabled = get_android_attr('enabled') == 'true'
                focused = get_android_attr('focused') == 'true'
                selected = get_android_attr('selected') == 'true'
                
                # Apply filtering logic (similar to ADB utils)
                if (not class_name or class_name.lower() == 'none') and \
                   (not text or text == '') and \
                   (not resource_id or resource_id == 'null') and \
                   (not content_desc or content_desc == ''):
                    continue
                
                element_counter += 1
                
                # Parse bounds [x1,y1][x2,y2]
                bounds_dict = {'left': 0, 'top': 0, 'right': 0, 'bottom': 0}
                if bounds:
                    bounds_match = re.match(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]', bounds)
                    if bounds_match:
                        bounds_dict = {
                            'left': int(bounds_match.group(1)),
                            'top': int(bounds_match.group(2)),
                            'right': int(bounds_match.group(3)),
                            'bottom': int(bounds_match.group(4))
                        }
                
                element = AppiumElement(
                    id=str(element_counter),
                    text=text,
                    className=class_name,
                    package=package,
                    contentDesc=content_desc,
                    bounds=bounds_dict,
                    clickable=clickable,
                    enabled=enabled,
                    focused=focused,
                    selected=selected,
                    platform='android',
                    resource_id=resource_id
                )
                
                elements.append(element)
                
            except Exception as e:
                print(f"[@lib:appiumUtils:_parse_android_elements] Error parsing Android element {i}: {e}")
                continue
        
        print(f"[@lib:appiumUtils:_parse_android_elements] Parsed {len(elements)} Android elements")
        return elements
    
    def _parse_generic_elements(self, xml_data: str, platform: str) -> List[AppiumElement]:
        """Parse elements for unknown/generic platforms."""
        elements = []
        
        # Generic element parsing - try to extract basic info
        element_pattern = r'<([^>\s]+)[^>]*(?:\/>|>.*?</\1>)'
        matches = re.findall(element_pattern, xml_data, re.DOTALL)
        
        element_counter = 0
        for i, match in enumerate(matches[:50]):  # Limit to first 50 for unknown platforms
            try:
                element_counter += 1
                
                element = AppiumElement(
                    id=str(element_counter),
                    text=f"Element {element_counter}",
                    className=match if isinstance(match, str) else str(match),
                    package="",
                    contentDesc=f"Generic {platform} element",
                    bounds={'left': 0, 'top': 0, 'right': 100, 'bottom': 50},
                    clickable=True,
                    enabled=True,
                    focused=False,
                    selected=False,
                    platform=platform
                )
                
                elements.append(element)
                
            except Exception as e:
                print(f"[@lib:appiumUtils:_parse_generic_elements] Error parsing generic element {i}: {e}")
                continue
        
        print(f"[@lib:appiumUtils:_parse_generic_elements] Parsed {len(elements)} generic {platform} elements")
        return elements
    
    def click_element(self, device_id: str, element: AppiumElement) -> bool:
        """
        Click on a UI element using Appium.
        
        Args:
            device_id: Device identifier
            element: AppiumElement to click
            
        Returns:
            bool: True if click successful
        """
        try:
            print(f"[@lib:appiumUtils:click_element] Clicking element ID={element.id}, text='{element.text}'")
            
            driver = self.get_driver(device_id)
            if not driver:
                print(f"[@lib:appiumUtils:click_element] No driver found for device {device_id}")
                return False
            
            platform = self.get_platform(device_id)
            
            # Try different click strategies based on platform and available attributes
            if platform == 'ios':
                success = self._click_ios_element(driver, element)
            elif platform == 'android':
                success = self._click_android_element(driver, element)
            else:
                success = self._click_generic_element(driver, element)
            
            if success:
                print(f"[@lib:appiumUtils:click_element] Successfully clicked element")
            else:
                print(f"[@lib:appiumUtils:click_element] Failed to click element")
                
            return success
            
        except Exception as e:
            print(f"[@lib:appiumUtils:click_element] Click error: {e}")
            return False
    
    def _click_ios_element(self, driver: webdriver.Remote, element: AppiumElement) -> bool:
        """Click iOS element using various strategies."""
        try:
            # Strategy 1: Use accessibility ID
            if element.accessibility_id:
                try:
                    ios_element = driver.find_element(AppiumBy.ACCESSIBILITY_ID, element.accessibility_id)
                    ios_element.click()
                    return True
                except NoSuchElementException:
                    pass
            
            # Strategy 2: Use name attribute
            if element.name:
                try:
                    ios_element = driver.find_element(AppiumBy.NAME, element.name)
                    ios_element.click()
                    return True
                except NoSuchElementException:
                    pass
            
            # Strategy 3: Use coordinates from bounds
            if element.bounds and element.bounds['right'] > element.bounds['left']:
                x = (element.bounds['left'] + element.bounds['right']) // 2
                y = (element.bounds['top'] + element.bounds['bottom']) // 2
                driver.tap([(x, y)])
                return True
            
            return False
            
        except Exception as e:
            print(f"[@lib:appiumUtils:_click_ios_element] iOS click error: {e}")
            return False
    
    def _click_android_element(self, driver: webdriver.Remote, element: AppiumElement) -> bool:
        """Click Android element using various strategies."""
        try:
            # Strategy 1: Use resource ID
            if element.resource_id:
                try:
                    android_element = driver.find_element(AppiumBy.ID, element.resource_id)
                    android_element.click()
                    return True
                except NoSuchElementException:
                    pass
            
            # Strategy 2: Use text
            if element.text:
                try:
                    android_element = driver.find_element(AppiumBy.XPATH, f"//*[@text='{element.text}']")
                    android_element.click()
                    return True
                except NoSuchElementException:
                    pass
            
            # Strategy 3: Use content description
            if element.contentDesc:
                try:
                    android_element = driver.find_element(AppiumBy.XPATH, f"//*[@content-desc='{element.contentDesc}']")
                    android_element.click()
                    return True
                except NoSuchElementException:
                    pass
            
            # Strategy 4: Use coordinates from bounds
            if element.bounds and element.bounds['right'] > element.bounds['left']:
                x = (element.bounds['left'] + element.bounds['right']) // 2
                y = (element.bounds['top'] + element.bounds['bottom']) // 2
                driver.tap([(x, y)])
                return True
            
            return False
            
        except Exception as e:
            print(f"[@lib:appiumUtils:_click_android_element] Android click error: {e}")
            return False
    
    def _click_generic_element(self, driver: webdriver.Remote, element: AppiumElement) -> bool:
        """Click element using generic coordinate-based strategy."""
        try:
            # Use coordinates from bounds if available
            if element.bounds and element.bounds['right'] > element.bounds['left']:
                x = (element.bounds['left'] + element.bounds['right']) // 2
                y = (element.bounds['top'] + element.bounds['bottom']) // 2
                driver.tap([(x, y)])
                return True
            
            return False
            
        except Exception as e:
            print(f"[@lib:appiumUtils:_click_generic_element] Generic click error: {e}")
            return False
    
    def tap_coordinates(self, device_id: str, x: int, y: int) -> bool:
        """
        Tap at specific screen coordinates.
        
        Args:
            device_id: Device identifier
            x: X coordinate
            y: Y coordinate
            
        Returns:
            bool: True if tap successful
        """
        try:
            print(f"[@lib:appiumUtils:tap_coordinates] Tapping at coordinates ({x}, {y})")
            
            driver = self.get_driver(device_id)
            if not driver:
                print(f"[@lib:appiumUtils:tap_coordinates] No driver found for device {device_id}")
                return False
            
            driver.tap([(x, y)])
            
            print(f"[@lib:appiumUtils:tap_coordinates] Successfully tapped at ({x}, {y})")
            return True
            
        except Exception as e:
            print(f"[@lib:appiumUtils:tap_coordinates] Tap error: {e}")
            return False
    
    def take_screenshot(self, device_id: str) -> Tuple[bool, str, str]:
        """
        Take a screenshot of the device.
        
        Args:
            device_id: Device identifier
            
        Returns:
            tuple: (success, base64_screenshot_data, error_message)
        """
        try:
            print(f"[@lib:appiumUtils:take_screenshot] Taking screenshot for device {device_id}")
            
            driver = self.get_driver(device_id)
            if not driver:
                return False, "", f"No driver found for device {device_id}"
            
            # Get screenshot as base64
            screenshot_b64 = driver.get_screenshot_as_base64()
            
            print(f"[@lib:appiumUtils:take_screenshot] Screenshot captured successfully")
            return True, screenshot_b64, ""
            
        except Exception as e:
            error_msg = f"Screenshot error: {e}"
            print(f"[@lib:appiumUtils:take_screenshot] {error_msg}")
            return False, "", error_msg
    
    def get_device_resolution(self, device_id: str) -> Optional[Dict[str, int]]:
        """
        Get device screen resolution.
        
        Args:
            device_id: Device identifier
            
        Returns:
            Dictionary with width and height, or None if failed
        """
        try:
            print(f"[@lib:appiumUtils:get_device_resolution] Getting resolution for device {device_id}")
            
            driver = self.get_driver(device_id)
            if not driver:
                print(f"[@lib:appiumUtils:get_device_resolution] No driver found for device {device_id}")
                return None
            
            # Get window size
            size = driver.get_window_size()
            width = size.get('width', 0)
            height = size.get('height', 0)
            
            print(f"[@lib:appiumUtils:get_device_resolution] Device resolution: {width}x{height}")
            return {'width': width, 'height': height}
            
        except Exception as e:
            print(f"[@lib:appiumUtils:get_device_resolution] Error: {e}")
            return None
    
    def launch_app(self, device_id: str, app_identifier: str) -> bool:
        """
        Launch an app by identifier (package name for Android, bundle ID for iOS).
        
        Args:
            device_id: Device identifier
            app_identifier: App package name (Android) or bundle ID (iOS)
            
        Returns:
            bool: True if launch successful
        """
        try:
            print(f"[@lib:appiumUtils:launch_app] Launching app: {app_identifier}")
            
            driver = self.get_driver(device_id)
            if not driver:
                print(f"[@lib:appiumUtils:launch_app] No driver found for device {device_id}")
                return False
            
            driver.activate_app(app_identifier)
            
            print(f"[@lib:appiumUtils:launch_app] Successfully launched {app_identifier}")
            return True
            
        except Exception as e:
            print(f"[@lib:appiumUtils:launch_app] Launch error: {e}")
            return False
    
    def close_app(self, device_id: str, app_identifier: str) -> bool:
        """
        Close/terminate an app by identifier.
        
        Args:
            device_id: Device identifier
            app_identifier: App package name (Android) or bundle ID (iOS)
            
        Returns:
            bool: True if close successful
        """
        try:
            print(f"[@lib:appiumUtils:close_app] Closing app: {app_identifier}")
            
            driver = self.get_driver(device_id)
            if not driver:
                print(f"[@lib:appiumUtils:close_app] No driver found for device {device_id}")
                return False
            
            driver.terminate_app(app_identifier)
            
            print(f"[@lib:appiumUtils:close_app] Successfully closed {app_identifier}")
            return True
            
        except Exception as e:
            print(f"[@lib:appiumUtils:close_app] Close error: {e}")
            return False
    
    def get_installed_apps(self, device_id: str) -> List[AppiumApp]:
        """
        Get list of installed apps on the device.
        
        Args:
            device_id: Device identifier
            
        Returns:
            List of AppiumApp objects
        """
        try:
            print(f"[@lib:appiumUtils:get_installed_apps] Getting installed apps for device {device_id}")
            
            driver = self.get_driver(device_id)
            if not driver:
                print(f"[@lib:appiumUtils:get_installed_apps] No driver found for device {device_id}")
                return []
            
            platform = self.get_platform(device_id)
            
            # Note: Appium doesn't have a direct method to list all installed apps
            # This would typically require platform-specific implementations
            # For now, return a placeholder list
            
            apps = []
            if platform == 'ios':
                # iOS common apps (would need iOS-specific implementation to get actual list)
                apps = [
                    AppiumApp("com.apple.Preferences", "Settings", platform='ios'),
                    AppiumApp("com.apple.mobilesafari", "Safari", platform='ios'),
                    AppiumApp("com.apple.mobilemail", "Mail", platform='ios'),
                ]
            elif platform == 'android':
                # Android common apps (would need Android-specific implementation)
                apps = [
                    AppiumApp("com.android.settings", "Settings", platform='android'),
                    AppiumApp("com.android.chrome", "Chrome", platform='android'),
                    AppiumApp("com.android.dialer", "Phone", platform='android'),
                ]
            
            print(f"[@lib:appiumUtils:get_installed_apps] Found {len(apps)} apps (placeholder)")
            return apps
            
        except Exception as e:
            print(f"[@lib:appiumUtils:get_installed_apps] Error: {e}")
            return []
    
    def input_text(self, device_id: str, text: str) -> bool:
        """
        Send text input to the device.
        
        Args:
            device_id: Device identifier
            text: Text to input
            
        Returns:
            bool: True if input successful
        """
        try:
            print(f"[@lib:appiumUtils:input_text] Sending text: '{text}'")
            
            driver = self.get_driver(device_id)
            if not driver:
                print(f"[@lib:appiumUtils:input_text] No driver found for device {device_id}")
                return False
            
            # Find active element or use send_keys to active element
            try:
                active_element = driver.switch_to.active_element
                active_element.send_keys(text)
            except:
                # Fallback: try to send keys directly to driver
                driver.execute_script("mobile: type", {"text": text})
            
            print(f"[@lib:appiumUtils:input_text] Successfully sent text")
            return True
            
        except Exception as e:
            print(f"[@lib:appiumUtils:input_text] Input error: {e}")
            return False
    
    def execute_key_command(self, device_id: str, key: str) -> bool:
        """
        Execute a key command (platform-specific).
        
        Args:
            device_id: Device identifier
            key: Key name (e.g., "HOME", "BACK", etc.)
            
        Returns:
            bool: True if key command successful
        """
        try:
            print(f"[@lib:appiumUtils:execute_key_command] Executing key: {key}")
            
            driver = self.get_driver(device_id)
            if not driver:
                print(f"[@lib:appiumUtils:execute_key_command] No driver found for device {device_id}")
                return False
            
            platform = self.get_platform(device_id)
            
            if platform == 'ios':
                return self._execute_ios_key(driver, key)
            elif platform == 'android':
                return self._execute_android_key(driver, key)
            else:
                print(f"[@lib:appiumUtils:execute_key_command] Key commands not supported for platform: {platform}")
                return False
            
        except Exception as e:
            print(f"[@lib:appiumUtils:execute_key_command] Key command error: {e}")
            return False
    
    def _execute_ios_key(self, driver: webdriver.Remote, key: str) -> bool:
        """Execute iOS-specific key commands."""
        try:
            key_upper = key.upper()
            
            if key_upper == 'HOME':
                driver.execute_script("mobile: pressButton", {"name": "home"})
                return True
            elif key_upper == 'BACK':
                # iOS doesn't have a back button, try navigation back
                driver.back()
                return True
            elif key_upper == 'VOLUME_UP':
                driver.execute_script("mobile: pressButton", {"name": "volumeUp"})
                return True
            elif key_upper == 'VOLUME_DOWN':
                driver.execute_script("mobile: pressButton", {"name": "volumeDown"})
                return True
            else:
                print(f"[@lib:appiumUtils:_execute_ios_key] Unsupported iOS key: {key}")
                return False
                
        except Exception as e:
            print(f"[@lib:appiumUtils:_execute_ios_key] iOS key error: {e}")
            return False
    
    def _execute_android_key(self, driver: webdriver.Remote, key: str) -> bool:
        """Execute Android-specific key commands."""
        try:
            from appium.webdriver.common.appiumby import AppiumBy
            
            key_upper = key.upper()
            
            # Android key code mapping
            key_codes = {
                'HOME': 3,
                'BACK': 4,
                'MENU': 82,
                'VOLUME_UP': 24,
                'VOLUME_DOWN': 25,
                'POWER': 26,
                'CAMERA': 27,
                'CALL': 5,
                'ENDCALL': 6
            }
            
            if key_upper in key_codes:
                driver.press_keycode(key_codes[key_upper])
                return True
            else:
                print(f"[@lib:appiumUtils:_execute_android_key] Unsupported Android key: {key}")
                return False
                
        except Exception as e:
            print(f"[@lib:appiumUtils:_execute_android_key] Android key error: {e}")
            return False

    def smart_element_search(self, device_id: str, search_term: str) -> Tuple[bool, List[Dict[str, Any]], str]:
        """
        Smart element search with fuzzy matching across all element attributes.
        Searches text, contentDesc, accessibility_id, resource_id, name, label, value, and className.
        
        Args:
            device_id: Device identifier
            search_term: Search term (case-insensitive)
            
        Returns:
            Tuple of (success, matches, error_message)
            
            matches format:
            [
                {
                    'element_id': str,
                    'element': AppiumElement.to_dict(),
                    'match_reason': str,
                    'match_confidence': float
                }
            ]
        """
        try:
            print(f"[@lib:appiumUtils:smart_element_search] Searching for '{search_term}' on device {device_id}")
            
            # Get all UI elements
            success, elements, error = self.dump_ui_elements(device_id)
            
            if not success:
                print(f"[@lib:appiumUtils:smart_element_search] Failed to dump UI: {error}")
                return False, [], error
            
            if not elements:
                print(f"[@lib:appiumUtils:smart_element_search] No elements found")
                return True, [], ""
            
            search_term_lower = search_term.lower().strip()
            matches = []
            
            for i, element in enumerate(elements):
                element_id = f"element_{i}"
                match_details = []
                confidence_score = 0.0
                
                # Define searchable attributes based on platform
                if element.platform == 'ios':
                    searchable_attrs = [
                        ('text', element.text),
                        ('name', element.name),
                        ('label', element.label),
                        ('value', element.value),
                        ('accessibility_id', element.accessibility_id),
                        ('className', element.className)
                    ]
                elif element.platform == 'android':
                    searchable_attrs = [
                        ('text', element.text),
                        ('contentDesc', element.contentDesc),
                        ('resource_id', element.resource_id),
                        ('className', element.className)
                    ]
                else:
                    # Generic platform
                    searchable_attrs = [
                        ('text', element.text),
                        ('contentDesc', element.contentDesc),
                        ('className', element.className)
                    ]
                
                # Search through all attributes
                for attr_name, attr_value in searchable_attrs:
                    if not attr_value:
                        continue
                        
                    attr_value_lower = str(attr_value).lower()
                    
                    if search_term_lower in attr_value_lower:
                        if search_term_lower == attr_value_lower:
                            # Exact match
                            match_details.append(f"exact match in {attr_name}: '{attr_value}'")
                            confidence_score = max(confidence_score, 1.0)
                        elif attr_value_lower.startswith(search_term_lower):
                            # Starts with
                            match_details.append(f"starts with in {attr_name}: '{attr_value}'")
                            confidence_score = max(confidence_score, 0.8)
                        elif attr_value_lower.endswith(search_term_lower):
                            # Ends with
                            match_details.append(f"ends with in {attr_name}: '{attr_value}'")
                            confidence_score = max(confidence_score, 0.7)
                        else:
                            # Contains
                            match_details.append(f"contains in {attr_name}: '{attr_value}'")
                            confidence_score = max(confidence_score, 0.6)
                
                if match_details:
                    match_reason = "; ".join(match_details)
                    matches.append({
                        'element_id': element_id,
                        'element': element.to_dict(),
                        'match_reason': match_reason,
                        'match_confidence': confidence_score
                    })
            
            # Sort matches by confidence (highest first)
            matches.sort(key=lambda x: x['match_confidence'], reverse=True)
            
            print(f"[@lib:appiumUtils:smart_element_search] Found {len(matches)} matches")
            for i, match in enumerate(matches[:5]):  # Log top 5 matches
                print(f"[@lib:appiumUtils:smart_element_search]   {i+1}. {match['match_reason']} (confidence: {match['match_confidence']:.1f})")
            
            return True, matches, ""
            
        except Exception as e:
            error_msg = f"Smart element search error: {e}"
            print(f"[@lib:appiumUtils:smart_element_search] ERROR: {error_msg}")
            return False, [], error_msg 
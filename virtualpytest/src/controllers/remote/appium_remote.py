"""
Appium Remote Controller Implementation

This controller provides universal remote control functionality using Appium WebDriver.
Supports iOS (XCUITest), Android (UIAutomator2), and other Appium-compatible platforms.
Key difference from ADB controller: uses Appium WebDriver API for cross-platform compatibility.
Based on the AndroidMobileRemoteController pattern but with universal platform support.
"""

from typing import Dict, Any, List, Optional
import subprocess
import time
import json
import os
from pathlib import Path
from ..base_controller import RemoteControllerInterface

# Use absolute import to avoid conflicts with local utils directory
import sys
src_utils_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'utils')
if src_utils_path not in sys.path:
    sys.path.insert(0, src_utils_path)

from src.utils.appium_utils import AppiumUtils, AppiumElement, AppiumApp


class AppiumRemoteController(RemoteControllerInterface):
    """Universal remote controller using Appium WebDriver for cross-platform device automation."""
    
    @staticmethod
    def get_remote_config() -> Dict[str, Any]:
        """Get the remote configuration including layout, buttons, and image."""
        # Load configuration from JSON file
        config_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 
            'config', 'remote', 'appium_remote.json'
        )
        
        if not os.path.exists(config_path):
            raise FileNotFoundError(f"Appium remote config file not found at: {config_path}")
            
        try:
            print(f"Loading Appium remote config from: {config_path}")
            with open(config_path, 'r') as config_file:
                return json.load(config_file)
        except Exception as e:
            raise RuntimeError(f"Error loading Appium remote config from file: {e}")
    
    def __init__(self, appium_platform_name: str, appium_device_id: str, appium_server_url: str = "http://localhost:4723"):
        """
        Initialize the Appium remote controller with only mandatory fields.
        
        Args:
            appium_platform_name: Platform name ("iOS" or "Android") - MANDATORY
            appium_device_id: Device UDID/ID - MANDATORY  
            appium_server_url: Appium server URL - MANDATORY
        """
        super().__init__("Appium Remote", "appium")
        
        print(f"[@controller:AppiumRemote:__init__] DEBUG: Starting initialization")
        print(f"[@controller:AppiumRemote:__init__] DEBUG: appium_platform_name = {appium_platform_name}")
        print(f"[@controller:AppiumRemote:__init__] DEBUG: appium_device_id = {appium_device_id}")
        print(f"[@controller:AppiumRemote:__init__] DEBUG: appium_server_url = {appium_server_url}")
        
        # Validate mandatory parameters
        if not appium_platform_name:
            error_msg = "appium_platform_name is required for AppiumRemoteController"
            print(f"[@controller:AppiumRemote:__init__] ERROR: {error_msg}")
            raise ValueError(error_msg)
        if not appium_device_id:
            error_msg = "appium_device_id is required for AppiumRemoteController"
            print(f"[@controller:AppiumRemote:__init__] ERROR: {error_msg}")
            raise ValueError(error_msg)
        if not appium_server_url:
            error_msg = "appium_server_url is required for AppiumRemoteController"
            print(f"[@controller:AppiumRemote:__init__] ERROR: {error_msg}")
            raise ValueError(error_msg)
        
        # Store mandatory fields - IMPORTANT: Keep device_id as host identifier, not UDID
        self.platform_name = appium_platform_name
        self.appium_device_id = appium_device_id  # This is the actual iOS/Android UDID
        self.appium_server_url = appium_server_url
        
        # Appium driver and utils
        self.driver = None
        self.appium_utils = None
        
        # UI elements state
        self.last_ui_elements = []
        self.last_dump_time = 0
        
        print(f"[@controller:AppiumRemote:__init__] DEBUG: Successfully stored parameters")
        print(f"[@controller:AppiumRemote:__init__] DEBUG: platform_name = {self.platform_name}")
        print(f"[@controller:AppiumRemote:__init__] DEBUG: device_id = {self.appium_device_id}")
        print(f"[@controller:AppiumRemote:__init__] DEBUG: server_url = {self.appium_server_url}")
        
        print(f"[@controller:AppiumRemote] Initialized for {self.platform_name} device UDID {self.appium_device_id}")
        print(f"[@controller:AppiumRemote] Server URL: {self.appium_server_url}")
        
        print(f"[@controller:AppiumRemote:__init__] DEBUG: About to call connect()")
        self.connect()
        
    def connect(self) -> bool:
        """Connect to device via Appium WebDriver."""
        try:
            print(f"[@controller:AppiumRemote:connect] DEBUG: Starting connection process")
            print(f"Remote[{self.device_type.upper()}]: Connecting to {self.platform_name} device")
            print(f"Remote[{self.device_type.upper()}]: Device ID: {self.appium_device_id}")
            print(f"Remote[{self.device_type.upper()}]: Appium URL: {self.appium_server_url}")
            
            # Initialize Appium utilities
            print(f"[@controller:AppiumRemote:connect] DEBUG: Initializing AppiumUtils")
            self.appium_utils = AppiumUtils()
            
            # Check if Appium server is running
            print(f"[@controller:AppiumRemote:connect] DEBUG: Checking if Appium server is running at {self.appium_server_url}")
            if not self.appium_utils.is_appium_server_running(self.appium_server_url):
                print(f"Remote[{self.device_type.upper()}]: ERROR - Appium server is not running at {self.appium_server_url}")
                print(f"Remote[{self.device_type.upper()}]: Please start Appium server: appium --address 127.0.0.1 --port 4723")
                print(f"[@controller:AppiumRemote:connect] DEBUG: Appium server check failed")
                return False
            
            # Build Appium capabilities
            capabilities = self._build_capabilities()
            print(f"Remote[{self.device_type.upper()}]: Using capabilities: {capabilities}")
            
            # For iOS, provide additional troubleshooting info
            if self.platform_name.lower() == 'ios':
                print(f"Remote[{self.device_type.upper()}]: iOS Device Requirements:")
                print(f"Remote[{self.device_type.upper()}]: 1. Device must be connected and trusted")
                print(f"Remote[{self.device_type.upper()}]: 2. WebDriverAgent must be installed on device")
                print(f"Remote[{self.device_type.upper()}]: 3. Device UDID must be correct: {self.appium_device_id}")
            
            # Connect to device via Appium
            if not self.appium_utils.connect_device(self.appium_device_id, capabilities, self.appium_server_url):
                print(f"Remote[{self.device_type.upper()}]: Failed to connect to device")
                if self.platform_name.lower() == 'ios':
                    print(f"Remote[{self.device_type.upper()}]: Troubleshooting steps:")
                    print(f"Remote[{self.device_type.upper()}]: - Verify device UDID: {self.appium_device_id}")
                    print(f"Remote[{self.device_type.upper()}]: - Check device is connected and trusted")
                    print(f"Remote[{self.device_type.upper()}]: - Verify WebDriverAgent is installed")
                self.disconnect()
                return False
                
            print(f"Remote[{self.device_type.upper()}]: Successfully connected to {self.platform_name} device UDID {self.appium_device_id}")
            
            # Get device resolution
            self.device_resolution = self.appium_utils.get_device_resolution(self.appium_device_id)
            if self.device_resolution:
                print(f"Remote[{self.device_type.upper()}]: Device resolution: {self.device_resolution['width']}x{self.device_resolution['height']}")
            
            # Store detected platform
            self.detected_platform = self.appium_utils.get_platform(self.appium_device_id)
            
            self.is_connected = True
            return True
            
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Connection error: {e}")
            self.disconnect()
            return False
    
    def _build_capabilities(self) -> Dict[str, Any]:
        """Build Appium capabilities based on platform and device ID."""
        capabilities = {
            'platformName': self.platform_name,
            'udid': self.appium_device_id,
            'noReset': True,
            'fullReset': False,
            'newCommandTimeout': 3600,  # 1 hour timeout instead of default (60 seconds)
        }
        
        # Add automation name based on platform
        if self.platform_name.lower() == 'ios':
            capabilities['automationName'] = 'XCUITest'
            capabilities['usePrebuiltWDA'] = True
            capabilities['useNewWDA'] = False
            capabilities['skipLogCapture'] = True
            capabilities['shouldTerminateApp'] = False
            capabilities['shouldUseSingletonTestManager'] = False
            capabilities['autoAcceptAlerts'] = True
        elif self.platform_name.lower() == 'android':
            capabilities['automationName'] = 'UIAutomator2'
        
        print(f"Remote[{self.device_type.upper()}]: Built capabilities: {capabilities}")
        return capabilities
            
    def disconnect(self) -> bool:
        """Disconnect from device."""
        try:
            print(f"Remote[{self.device_type.upper()}]: Disconnecting from {self.device_name}")
            
            # Clean up Appium connection
            if self.appium_utils:
                self.appium_utils.disconnect_device(self.appium_device_id)
                self.appium_utils = None
                
            self.is_connected = False
            
            print(f"Remote[{self.device_type.upper()}]: Disconnected successfully")
            return True
            
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Disconnect error: {e}")
            self.is_connected = False
            return False
            
    def press_key(self, key: str) -> bool:
        """
        Send a key press to the device.
        
        Args:
            key: Key name (e.g., "HOME", "BACK", "VOLUME_UP")
        """
        if not self.is_connected or not self.appium_utils:
            print(f"Remote[{self.device_type.upper()}]: ERROR - Not connected to device")
            return False
            
        try:
            print(f"Remote[{self.device_type.upper()}]: Pressing key '{key}'")
            
            success = self.appium_utils.execute_key_command(self.appium_device_id, key)
            
            if success:
                print(f"Remote[{self.device_type.upper()}]: Successfully pressed key '{key}'")
            else:
                print(f"Remote[{self.device_type.upper()}]: Failed to press key '{key}'")
                
            return success
            
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Key press error: {e}")
            return False
            
    def input_text(self, text: str) -> bool:
        """
        Send text input to the device.
        
        Args:
            text: Text to input
        """
        if not self.is_connected or not self.appium_utils:
            print(f"Remote[{self.device_type.upper()}]: ERROR - Not connected to device")
            return False
            
        try:
            print(f"Remote[{self.device_type.upper()}]: Sending text: '{text}'")
            
            success = self.appium_utils.input_text(self.appium_device_id, text)
            
            if success:
                print(f"Remote[{self.device_type.upper()}]: Successfully sent text: '{text}'")
            else:
                print(f"Remote[{self.device_type.upper()}]: Text input failed")
                
            return success
                
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Text input error: {e}")
            return False
            
    def launch_app(self, package_name: str) -> bool:
        """
        Launch an app by identifier (package name for Android, bundle ID for iOS).
        
        Args:
            package_name: App package name (Android) or bundle ID (iOS)
        """
        if not self.is_connected or not self.appium_utils:
            print(f"Remote[{self.device_type.upper()}]: ERROR - Not connected to device")
            return False
            
        try:
            print(f"Remote[{self.device_type.upper()}]: Launching app: {package_name}")
            
            success = self.appium_utils.launch_app(self.appium_device_id, package_name)
            
            if success:
                print(f"Remote[{self.device_type.upper()}]: Successfully launched {package_name}")
            else:
                print(f"Remote[{self.device_type.upper()}]: Failed to launch {package_name}")
                
            return success
            
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: App launch error: {e}")
            return False
            
    def close_app(self, app_identifier: str) -> bool:
        """
        Close/stop an app by identifier.
        
        Args:
            app_identifier: App package name (Android) or bundle ID (iOS)
        """
        if not self.is_connected or not self.appium_utils:
            print(f"Remote[{self.device_type.upper()}]: ERROR - Not connected to device")
            return False
            
        try:
            print(f"Remote[{self.device_type.upper()}]: Closing app: {app_identifier}")
            
            success = self.appium_utils.close_app(self.appium_device_id, app_identifier)
            
            if success:
                print(f"Remote[{self.device_type.upper()}]: Successfully closed {app_identifier}")
            else:
                print(f"Remote[{self.device_type.upper()}]: Failed to close {app_identifier}")
                
            return success
            
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: App close error: {e}")
            return False
            
    def get_installed_apps(self) -> List[AppiumApp]:
        """
        Get list of installed apps on the device.
        
        Returns:
            List of AppiumApp objects
        """
        if not self.is_connected or not self.appium_utils:
            print(f"Remote[{self.device_type.upper()}]: ERROR - Not connected to device")
            return []
            
        try:
            print(f"Remote[{self.device_type.upper()}]: Getting installed apps")
            
            apps = self.appium_utils.get_installed_apps(self.appium_device_id)
            
            print(f"Remote[{self.device_type.upper()}]: Found {len(apps)} installed apps")
            return apps
            
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Error getting apps: {e}")
            return []
            
    def dump_ui_elements(self) -> tuple[bool, List[AppiumElement], str]:
        """
        Dump UI elements from the current screen.
        
        Returns:
            Tuple of (success, elements_list, error_message)
        """
        if not self.is_connected or not self.appium_utils:
            print(f"Remote[{self.device_type.upper()}]: ERROR - Not connected to device")
            return False, [], "Not connected to device"
            
        try:
            print(f"Remote[{self.device_type.upper()}]: Dumping UI elements")
            
            success, elements, error = self.appium_utils.dump_ui_elements(self.appium_device_id)
            
            if success:
                self.last_ui_elements = elements
                self.last_dump_time = time.time()
                print(f"Remote[{self.device_type.upper()}]: Successfully dumped {len(elements)} UI elements")
            else:
                print(f"Remote[{self.device_type.upper()}]: UI dump failed: {error}")
                
            return success, elements, error
            
        except Exception as e:
            error_msg = f"Error dumping UI elements: {e}"
            print(f"Remote[{self.device_type.upper()}]: {error_msg}")
            return False, [], error_msg
            
    def click_element(self, element_identifier: str) -> bool:
        """
        Click element directly by text, identifier, or content description using Appium search.
        
        Args:
            element_identifier: Text, identifier, or content description to click
            
        Returns:
            bool: True if click successful
        """
        if not self.is_connected or not self.appium_utils:
            print(f"Remote[{self.device_type.upper()}]: ERROR - Not connected to device")
            return False
            
        try:
            print(f"Remote[{self.device_type.upper()}]: Direct click on element: '{element_identifier}'")
            
            # Try to find element by text first
            element = self.find_element_by_text(element_identifier)
            if not element:
                # Try by identifier
                element = self.find_element_by_identifier(element_identifier)
            if not element:
                # Try by content description
                element = self.find_element_by_content_desc(element_identifier)
            
            if element:
                success = self.appium_utils.click_element(self.appium_device_id, element)
                if success:
                    print(f"Remote[{self.device_type.upper()}]: Successfully clicked element: '{element_identifier}'")
                else:
                    print(f"Remote[{self.device_type.upper()}]: Failed to click element: '{element_identifier}'")
                
                return success
            else:
                print(f"Remote[{self.device_type.upper()}]: Element not found: '{element_identifier}'")
                return False
                
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Direct element click error: {e}")
            return False
            
    def click_element_by_id(self, element: AppiumElement) -> bool:
        """
        Click on a UI element object (for internal/frontend use after UI dump).
        
        Args:
            element: AppiumElement to click
            
        Returns:
            bool: True if click successful
        """
        if not self.is_connected or not self.appium_utils:
            print(f"Remote[{self.device_type.upper()}]: ERROR - Not connected to device")
            return False
            
        try:
            print(f"Remote[{self.device_type.upper()}]: Clicking element ID={element.id}, text='{element.text}'")
            
            success = self.appium_utils.click_element(self.appium_device_id, element)
            
            if success:
                print(f"Remote[{self.device_type.upper()}]: Successfully clicked element")
            else:
                print(f"Remote[{self.device_type.upper()}]: Failed to click element")
                
            return success
            
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Element click error: {e}")
            return False
            
    def find_element_by_text(self, text: str) -> Optional[AppiumElement]:
        """
        Find a UI element by its text content.
        
        Args:
            text: Text to search for
            
        Returns:
            AppiumElement if found, None otherwise
        """
        for element in self.last_ui_elements:
            if text.lower() in element.text.lower():
                return element
        return None
        
    def find_element_by_identifier(self, identifier: str) -> Optional[AppiumElement]:
        """
        Find a UI element by its platform-specific identifier.
        
        Args:
            identifier: Resource ID (Android) or accessibility ID (iOS)
            
        Returns:
            AppiumElement if found, None otherwise
        """
        for element in self.last_ui_elements:
            if self.detected_platform == 'android' and identifier in element.resource_id:
                return element
            elif self.detected_platform == 'ios' and identifier in element.accessibility_id:
                return element
        return None
        
    def find_element_by_content_desc(self, content_desc: str) -> Optional[AppiumElement]:
        """
        Find a UI element by its content description.
        
        Args:
            content_desc: Content description to search for
            
        Returns:
            AppiumElement if found, None otherwise
        """
        for element in self.last_ui_elements:
            if content_desc.lower() in element.contentDesc.lower():
                return element
        return None
        
    def verify_element_exists(self, text: str = "", identifier: str = "", content_desc: str = "") -> bool:
        """
        Verify that an element exists on the current screen.
        
        Args:
            text: Text to search for
            identifier: Platform-specific identifier to search for
            content_desc: Content description to search for
            
        Returns:
            bool: True if element found
        """
        if text:
            return self.find_element_by_text(text) is not None
        elif identifier:
            return self.find_element_by_identifier(identifier) is not None
        elif content_desc:
            return self.find_element_by_content_desc(content_desc) is not None
        else:
            return False
            
    def get_device_resolution(self) -> Optional[Dict[str, int]]:
        """Get the device screen resolution."""
        if self.device_resolution:
            return self.device_resolution
        return None
        
    def take_screenshot(self) -> tuple[bool, str, str]:
        """
        Take a screenshot of the device.
        
        Returns:
            tuple: (success, base64_screenshot_data, error_message)
        """
        if not self.is_connected or not self.appium_utils:
            return False, "", "Not connected to device"
            
        try:
            print(f"Remote[{self.device_type.upper()}]: Taking screenshot")
            
            success, screenshot_data, error = self.appium_utils.take_screenshot(self.appium_device_id)
            
            if success:
                print(f"Remote[{self.device_type.upper()}]: Screenshot captured successfully")
                return True, screenshot_data, ""
            else:
                print(f"Remote[{self.device_type.upper()}]: Screenshot failed: {error}")
                return False, "", error
                
        except Exception as e:
            error_msg = f"Screenshot error: {e}"
            print(f"Remote[{self.device_type.upper()}]: {error_msg}")
            return False, "", error_msg
        
    def get_status(self) -> Dict[str, Any]:
        """Get controller status by checking Appium server connectivity via curl."""
        try:
            # Simple curl check to Appium server status endpoint
            import subprocess
            import json
            
            # Check if Appium server is reachable via curl (like AndroidMobile does for ADB)
            curl_result = subprocess.run(
                ['curl', '-s', '--connect-timeout', '5', '--max-time', '10', f'{self.appium_server_url}/status'], 
                capture_output=True, 
                text=True
            )
            
            if curl_result.returncode != 0:
                return {'success': False, 'error': f'Appium server not reachable at {self.appium_server_url}'}
            
            # Try to parse response as JSON
            try:
                response_data = json.loads(curl_result.stdout)
                if response_data.get('value', {}).get('ready'):
                    return {'success': True}
                else:
                    return {'success': False, 'error': 'Appium server not ready'}
            except json.JSONDecodeError:
                # If not JSON, check if we got any response
                if curl_result.stdout.strip():
                    return {'success': True}  # Server responded, assume it's working
                else:
                    return {'success': False, 'error': 'Empty response from Appium server'}
            
        except Exception as e:
            return {'success': False, 'error': f'Failed to check Appium server status: {str(e)}'}

    def tap_coordinates(self, x: int, y: int) -> bool:
        """
        Tap at specific screen coordinates.
        
        Args:
            x: X coordinate
            y: Y coordinate
            
        Returns:
            bool: True if tap successful
        """
        if not self.is_connected or not self.appium_utils:
            print(f"Remote[{self.device_type.upper()}]: ERROR - Not connected to device")
            return False
            
        try:
            print(f"Remote[{self.device_type.upper()}]: Tapping at coordinates ({x}, {y})")
            
            success = self.appium_utils.tap_coordinates(self.appium_device_id, x, y)
            
            if success:
                print(f"Remote[{self.device_type.upper()}]: Successfully tapped at ({x}, {y})")
            else:
                print(f"Remote[{self.device_type.upper()}]: Tap failed")
                
            return success
                
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Tap error: {e}")
            return False
    
    def get_available_actions(self) -> Dict[str, Any]:
        """Get available actions for this Appium remote controller."""
        return {
            'remote': [
                # Navigation actions
                {
                    'id': 'click_element',
                    'label': 'Click UI Element',
                    'command': 'click_element',
                    'action_type': 'remote',
                    'params': {},
                    'description': 'Click on a UI element directly by text/ID (no UI dump required)',
                    'requiresInput': True,
                    'inputLabel': 'Element Text/ID',
                    'inputPlaceholder': 'Home Tab'
                },
                {
                    'id': 'tap_coordinates',
                    'label': 'Tap Coordinates',
                    'command': 'tap_coordinates',
                    'action_type': 'remote',
                    'params': {},
                    'description': 'Tap at specific screen coordinates',
                    'requiresInput': True,
                    'inputLabel': 'Coordinates (x,y)',
                    'inputPlaceholder': '100,200'
                },
                {
                    'id': 'press_key_up',
                    'label': 'Up',
                    'command': 'press_key',
                    'action_type': 'remote',
                    'params': {'key': 'UP'},
                    'description': 'Navigate up in the interface',
                    'requiresInput': False
                },
                {
                    'id': 'press_key_down',
                    'label': 'Down', 
                    'command': 'press_key',
                    'action_type': 'remote',
                    'params': {'key': 'DOWN'},
                    'description': 'Navigate down in the interface',
                    'requiresInput': False
                },
                {
                    'id': 'press_key_left',
                    'label': 'Left',
                    'command': 'press_key',
                    'action_type': 'remote',
                    'params': {'key': 'LEFT'},
                    'description': 'Navigate left in the interface',
                    'requiresInput': False
                },
                {
                    'id': 'press_key_right',
                    'label': 'Right',
                    'command': 'press_key',
                    'action_type': 'remote',
                    'params': {'key': 'RIGHT'}, 
                    'description': 'Navigate right in the interface',
                    'requiresInput': False
                },
                # Control actions
                {
                    'id': 'press_key_enter',
                    'label': 'Select/Enter',
                    'command': 'press_key',
                    'action_type': 'remote',
                    'params': {'key': 'ENTER'},
                    'description': 'Select current item or confirm action',
                    'requiresInput': False
                },
                {
                    'id': 'press_key_back',
                    'label': 'Back',
                    'command': 'press_key',
                    'action_type': 'remote',
                    'params': {'key': 'BACK'},
                    'description': 'Go back to previous screen',
                    'requiresInput': False
                },
                {
                    'id': 'press_key_home',
                    'label': 'Home',
                    'command': 'press_key',
                    'action_type': 'remote',
                    'params': {'key': 'HOME'},
                    'description': 'Go to home screen',
                    'requiresInput': False
                },
                {
                    'id': 'press_key_menu',
                    'label': 'Menu',
                    'command': 'press_key',
                    'action_type': 'remote',
                    'params': {'key': 'MENU'},
                    'description': 'Open menu',
                    'requiresInput': False
                },
                # Text input actions
                {
                    'id': 'input_text',
                    'label': 'Input Text',
                    'command': 'input_text',
                    'action_type': 'remote',
                    'params': {},
                    'description': 'Type text into current field',
                    'requiresInput': True,
                    'inputLabel': 'Text to input',
                    'inputPlaceholder': 'Enter text...'
                },
                # App management actions
                {
                    'id': 'launch_app',
                    'label': 'Launch App',
                    'command': 'launch_app',
                    'action_type': 'remote',
                    'params': {},
                    'description': 'Launch an application',
                    'requiresInput': True,
                    'inputLabel': 'App identifier',
                    'inputPlaceholder': 'com.example.app'
                },
                {
                    'id': 'close_app',
                    'label': 'Close App',
                    'command': 'close_app',
                    'action_type': 'remote',
                    'params': {},
                    'description': 'Close an application',
                    'requiresInput': True,
                    'inputLabel': 'App identifier', 
                    'inputPlaceholder': 'com.example.app'
                }  
            ]
        }

    def execute_command(self, command: str, params: Dict[str, Any] = None) -> bool:
        """
        Execute Appium specific command with proper abstraction.
        
        Args:
            command: Command to execute ('press_key', 'input_text', etc.)
            params: Command parameters (including wait_time)
            
        Returns:
            bool: True if command executed successfully
        """
        if params is None:
            params = {}
        
        # Extract wait_time from params
        wait_time = params.get('wait_time', 0)
        
        print(f"Remote[{self.device_type.upper()}]: Executing command '{command}' with params: {params}")
        
        result = False
        
        if command == 'press_key':
            key = params.get('key')
            result = self.press_key(key) if key else False
        
        elif command == 'input_text':
            text = params.get('text')
            result = self.input_text(text) if text else False
        
        elif command == 'launch_app':
            app_identifier = params.get('app_identifier') or params.get('package')
            result = self.launch_app(app_identifier) if app_identifier else False
        
        elif command == 'close_app':
            app_identifier = params.get('app_identifier') or params.get('package')
            result = self.close_app(app_identifier) if app_identifier else False
        
        elif command == 'click_element':
            element_id = params.get('element_id')
            result = self.click_element(element_id) if element_id else False
        
        elif command == 'tap_coordinates':
            x, y = params.get('x'), params.get('y')
            result = self.tap_coordinates(int(x), int(y)) if x is not None and y is not None else False
        
        elif command == 'click_element_by_id':
            # Appium specific - uses UI dump
            element_id = params.get('element_id')
            if element_id and self.last_ui_elements:
                element = next((el for el in self.last_ui_elements if str(el.id) == str(element_id)), None)
                result = self.click_element_by_id(element) if element else False
            else:
                result = False
        
        elif command == 'dump_ui_elements':
            # Appium specific
            success, _, _ = self.dump_ui_elements()
            result = success
        
        elif command == 'get_installed_apps':
            # Appium specific
            apps = self.get_installed_apps()
            result = len(apps) > 0
        
        else:
            print(f"Remote[{self.device_type.upper()}]: Unknown command: {command}")
            result = False
        
        return result
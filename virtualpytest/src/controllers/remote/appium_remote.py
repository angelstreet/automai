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
    
    def __init__(self, device_name: str = "Appium Remote", device_type: str = "appium", **kwargs):
        """
        Initialize the Appium remote controller.
        
        Args:
            device_name: Name of the device
            device_type: Type identifier for the device
            **kwargs: Additional parameters including:
                # Appium Server Parameters
                - appium_server_url: URL of the Appium server (default: http://localhost:4723)
                
                # Device Parameters (required)
                - device_ip: IP address of the target device (required)
                - device_port: Port for device communication (default: 5555)
                - platform_name: Platform name (iOS, Android, etc.) (required)
                - platform_version: Platform version (required)
                - device_name_cap: Device name for Appium capabilities (required)
                - app_package: App package name (for Android)
                - app_activity: App activity name (for Android)
                - bundle_id: Bundle ID (for iOS)
                - udid: Device UDID (for iOS)
                
                # Connection Parameters
                - connection_timeout: Connection timeout in seconds (default: 30)
                - implicit_wait: Implicit wait timeout in seconds (default: 10)
                
                # Multi-device Parameters (required)
                - device_id: Device ID for multi-device hosts (required)
                - device_config: Device configuration with paths and settings (required)
        """
        super().__init__(device_name, device_type)
        
        # Appium server configuration
        self.appium_server_url = kwargs.get('appium_server_url', 'http://localhost:4723')
        
        # Device parameters
        self.device_ip = kwargs.get('device_ip')
        self.device_port = kwargs.get('device_port', 5555)
        self.platform_name = kwargs.get('platform_name')
        self.platform_version = kwargs.get('platform_version')  
        self.device_name_cap = kwargs.get('device_name_cap')
        self.app_package = kwargs.get('app_package')
        self.app_activity = kwargs.get('app_activity')
        self.bundle_id = kwargs.get('bundle_id')
        self.udid = kwargs.get('udid')
        
        # Connection settings
        self.connection_timeout = kwargs.get('connection_timeout', 30)
        self.implicit_wait = kwargs.get('implicit_wait', 10)
        
        # Multi-device support (required)
        self.device_id = kwargs.get('device_id')
        self.device_config = kwargs.get('device_config')
        
        # Validate required parameters
        if not self.device_ip:
            raise ValueError("device_ip is required for AppiumRemoteController")
        if not self.platform_name:
            raise ValueError("platform_name is required for AppiumRemoteController")
        if not self.platform_version:
            raise ValueError("platform_version is required for AppiumRemoteController")
        if not self.device_name_cap:
            raise ValueError("device_name_cap is required for AppiumRemoteController")
        if not self.device_id:
            raise ValueError("device_id is required for AppiumRemoteController")
        if not self.device_config:
            raise ValueError("device_config is required for AppiumRemoteController")
            
        # Driver instance
        self.driver = None
        
        print(f"[@controller:AppiumRemote] Initialized for device_id: {self.device_id}")
        print(f"[@controller:AppiumRemote] Device config: {self.device_config}")
        print(f"[@controller:AppiumRemote] Platform: {self.platform_name} {self.platform_version}")
        
    def connect(self) -> bool:
        """Connect to device via Appium WebDriver."""
        try:
            print(f"Remote[{self.device_type.upper()}]: Connecting to {self.platform_name} device")
            print(f"Remote[{self.device_type.upper()}]: Device IP: {self.device_ip}:{self.device_port}")
            print(f"Remote[{self.device_type.upper()}]: Appium URL: {self.appium_server_url}")
            
            # Initialize Appium utilities
            self.appium_utils = AppiumUtils()
            
            # Check if Appium server is running
            if not self.appium_utils.is_appium_server_running(self.appium_server_url):
                print(f"Remote[{self.device_type.upper()}]: ERROR - Appium server is not running at {self.appium_server_url}")
                print(f"Remote[{self.device_type.upper()}]: Please start Appium server: appium --address 127.0.0.1 --port 4723")
                return False
            
            # Build Appium capabilities
            capabilities = self._build_capabilities()
            print(f"Remote[{self.device_type.upper()}]: Using capabilities: {capabilities}")
            
            # For iOS, provide additional troubleshooting info
            if self.platform_name.lower() == 'ios':
                print(f"Remote[{self.device_type.upper()}]: iOS WiFi Debugging Requirements:")
                print(f"Remote[{self.device_type.upper()}]: 1. Device must be on same network as this machine")
                print(f"Remote[{self.device_type.upper()}]: 2. WiFi debugging must be enabled in Xcode (Window > Devices and Simulators)")
                print(f"Remote[{self.device_type.upper()}]: 3. Device must be paired and trusted")
                print(f"Remote[{self.device_type.upper()}]: 4. WebDriverAgent must be installed on device")
            
            # Connect to device via Appium
            if not self.appium_utils.connect_device(self.device_id, capabilities, self.appium_server_url):
                print(f"Remote[{self.device_type.upper()}]: Failed to connect to device")
                if self.platform_name.lower() == 'ios':
                    print(f"Remote[{self.device_type.upper()}]: Troubleshooting steps:")
                    print(f"Remote[{self.device_type.upper()}]: - Verify device IP: {self.device_ip}")
                    print(f"Remote[{self.device_type.upper()}]: - Check if device is reachable: ping {self.device_ip}")
                    print(f"Remote[{self.device_type.upper()}]: - Verify WiFi debugging is enabled")
                    print(f"Remote[{self.device_type.upper()}]: - Try connecting via USB first")
                self.disconnect()
                return False
                
            print(f"Remote[{self.device_type.upper()}]: Successfully connected to {self.platform_name} device {self.device_id}")
            
            # Get device resolution
            self.device_resolution = self.appium_utils.get_device_resolution(self.device_id)
            if self.device_resolution:
                print(f"Remote[{self.device_type.upper()}]: Device resolution: {self.device_resolution['width']}x{self.device_resolution['height']}")
            
            # Store detected platform
            self.detected_platform = self.appium_utils.get_platform(self.device_id)
            
            self.is_connected = True
            return True
            
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Connection error: {e}")
            self.disconnect()
            return False
    
    def _build_capabilities(self) -> Dict[str, Any]:
        """Build Appium capabilities based on platform and parameters."""
        capabilities = {
            'platformName': self.platform_name,
            'noReset': True,
            'fullReset': False,
        }
        
        # For iOS network connections, use the IP:port format as UDID
        # For other platforms, use device_id
        if self.platform_name.lower() == 'ios':
            # iOS network debugging format: IP:port
            capabilities['udid'] = f"{self.device_ip}:{self.device_port}"
        else:
            capabilities['udid'] = self.device_id
        
        # Add platform version if provided
        if self.platform_version:
            capabilities['platformVersion'] = self.platform_version
        
        # Add automation name if provided, otherwise use defaults
        if self.device_name_cap:
            capabilities['automationName'] = self.device_name_cap
        elif self.platform_name.lower() == 'ios':
            capabilities['automationName'] = 'XCUITest'
        elif self.platform_name.lower() == 'android':
            capabilities['automationName'] = 'UIAutomator2'
        
        # Add iOS-specific capabilities
        if self.platform_name.lower() == 'ios':
            capabilities['usePrebuiltWDA'] = True
            capabilities['useNewWDA'] = False
            capabilities['wdaLocalPort'] = 8100  # Default WDA port
            capabilities['skipLogCapture'] = True
            capabilities['shouldTerminateApp'] = False
            capabilities['shouldUseSingletonTestManager'] = False
            
            if self.bundle_id:
                capabilities['bundleId'] = self.bundle_id
            else:
                # Don't specify an app - just connect to device for automation
                capabilities['autoAcceptAlerts'] = True
        
        # Add Android-specific capabilities
        elif self.platform_name.lower() == 'android':
            if self.app_package:
                capabilities['appPackage'] = self.app_package
            if self.app_activity:
                capabilities['appActivity'] = self.app_activity
        
        print(f"Remote[{self.device_type.upper()}]: Built capabilities: {capabilities}")
        return capabilities
            
    def disconnect(self) -> bool:
        """Disconnect from device."""
        try:
            print(f"Remote[{self.device_type.upper()}]: Disconnecting from {self.device_name}")
            
            # Clean up Appium connection
            if self.appium_utils:
                self.appium_utils.disconnect_device(self.device_id)
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
            
            success = self.appium_utils.execute_key_command(self.device_id, key)
            
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
            
            success = self.appium_utils.input_text(self.device_id, text)
            
            if success:
                print(f"Remote[{self.device_type.upper()}]: Successfully sent text: '{text}'")
                return True
            else:
                print(f"Remote[{self.device_type.upper()}]: Text input failed")
                return False
                
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Text input error: {e}")
            return False
            
    def execute_sequence(self, commands: List[Dict[str, Any]]) -> bool:
        """
        Execute a sequence of commands on the device.
        
        Args:
            commands: List of command dictionaries with 'action', 'params', and optional 'delay'
        """
        if not self.is_connected or not self.appium_utils:
            print(f"Remote[{self.device_type.upper()}]: ERROR - Not connected to device")
            return False
            
        print(f"Remote[{self.device_type.upper()}]: Executing sequence of {len(commands)} commands")
        
        for i, command in enumerate(commands):
            action = command.get('action')
            params = command.get('params', {})
            delay = command.get('delay', 0.5)
            
            print(f"Remote[{self.device_type.upper()}]: Step {i+1}: {action}")
            
            success = False
            if action == 'press_key':
                success = self.press_key(params.get('key', 'HOME'))
            elif action == 'input_text':
                success = self.input_text(params.get('text', ''))
            elif action == 'launch_app':
                success = self.launch_app(params.get('app_identifier', ''))
            elif action == 'close_app':
                success = self.close_app(params.get('app_identifier', ''))
            elif action == 'tap_coordinates':
                x = params.get('x', 0)
                y = params.get('y', 0)
                success = self.tap_coordinates(x, y)
            elif action == 'click_element':
                element = params.get('element')
                if element:
                    success = self.click_element(element)
                else:
                    print(f"Remote[{self.device_type.upper()}]: Missing element parameter for click_element")
                    return False
            elif action == 'dump_ui_elements':
                success, _, _ = self.dump_ui_elements()
            elif action == 'take_screenshot':
                success, _, _ = self.take_screenshot()
            else:
                print(f"Remote[{self.device_type.upper()}]: Unknown action: {action}")
                return False
                
            if not success:
                print(f"Remote[{self.device_type.upper()}]: Sequence failed at step {i+1}")
                return False
                
            # Add delay between commands (except for the last one)
            if delay > 0 and i < len(commands) - 1:
                time.sleep(delay)
                
        print(f"Remote[{self.device_type.upper()}]: Sequence completed successfully")
        return True
        
    def launch_app(self, app_identifier: str) -> bool:
        """
        Launch an app by identifier (package name for Android, bundle ID for iOS).
        
        Args:
            app_identifier: App package name (Android) or bundle ID (iOS)
        """
        if not self.is_connected or not self.appium_utils:
            print(f"Remote[{self.device_type.upper()}]: ERROR - Not connected to device")
            return False
            
        try:
            print(f"Remote[{self.device_type.upper()}]: Launching app: {app_identifier}")
            
            success = self.appium_utils.launch_app(self.device_id, app_identifier)
            
            if success:
                print(f"Remote[{self.device_type.upper()}]: Successfully launched {app_identifier}")
            else:
                print(f"Remote[{self.device_type.upper()}]: Failed to launch {app_identifier}")
                
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
            
            success = self.appium_utils.close_app(self.device_id, app_identifier)
            
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
            
            apps = self.appium_utils.get_installed_apps(self.device_id)
            
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
            
            success, elements, error = self.appium_utils.dump_ui_elements(self.device_id)
            
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
            
    def click_element(self, element: AppiumElement) -> bool:
        """
        Click on a UI element.
        
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
            
            success = self.appium_utils.click_element(self.device_id, element)
            
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
            
            success, screenshot_data, error = self.appium_utils.take_screenshot(self.device_id)
            
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
        """Get controller status - check Appium device connectivity."""
        try:
            # Basic status info
            base_status = {
                'success': True,
                'controller_type': self.controller_type,
                'device_type': self.device_type,
                'device_name': self.device_name,
                'device_id': self.device_id,
                'platform_name': self.platform_name,
                'detected_platform': self.detected_platform,
                'appium_url': self.appium_server_url,
                'connected': self.is_connected
            }
            
            # Check Appium server connectivity
            if self.appium_utils:
                server_running = self.appium_utils.is_appium_server_running(self.appium_server_url)
                base_status.update({
                    'appium_server_running': server_running,
                    'appium_status': 'server_running' if server_running else 'server_not_running',
                    'message': f'Appium server is {"running" if server_running else "not running"} at {self.appium_server_url}'
                })
                
                if self.is_connected:
                    driver = self.appium_utils.get_driver(self.device_id)
                    if driver:
                        base_status.update({
                            'driver_status': 'active',
                            'session_id': getattr(driver, 'session_id', 'unknown'),
                            'message': f'{self.platform_name} device {self.device_id} is connected and ready'
                        })
                    else:
                        base_status.update({
                            'driver_status': 'missing',
                            'message': f'Connected but no driver found for device {self.device_id}'
                        })
                else:
                    base_status.update({
                        'driver_status': 'disconnected',
                        'message': f'Device {self.device_id} is not connected'
                    })
            else:
                base_status.update({
                    'appium_server_running': False,
                    'appium_status': 'not_initialized',
                    'driver_status': 'not_initialized',
                    'message': 'Appium utils not initialized'
                })
            
            return base_status
            
        except Exception as e:
            return {
                'success': False,
                'controller_type': self.controller_type,
                'device_name': self.device_name,
                'appium_status': 'error',
                'driver_status': 'error',
                'error': f'Failed to check Appium device status: {str(e)}'
            }

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
            
            success = self.appium_utils.tap_coordinates(self.device_id, x, y)
            
            if success:
                print(f"Remote[{self.device_type.upper()}]: Successfully tapped at ({x}, {y})")
                return True
            else:
                print(f"Remote[{self.device_type.upper()}]: Tap failed")
                return False
                
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Tap error: {e}")
            return False
    
    def get_available_actions(self) -> Dict[str, Any]:
        """Get available actions for this Appium remote controller."""
        return {
            'remote': [
                {
                    'id': 'press_key_up',
                    'label': 'Navigate Up',
                    'command': 'press_key',
                    'params': {'key': 'UP'},
                    'description': 'Navigate up in the interface',
                    'requiresInput': False
                },
                {
                    'id': 'press_key_down',
                    'label': 'Navigate Down',
                    'command': 'press_key',
                    'params': {'key': 'DOWN'},
                    'description': 'Navigate down in the interface',
                    'requiresInput': False
                },
                {
                    'id': 'press_key_left',
                    'label': 'Navigate Left',
                    'command': 'press_key',
                    'params': {'key': 'LEFT'},
                    'description': 'Navigate left in the interface',
                    'requiresInput': False
                },
                {
                    'id': 'press_key_right',
                    'label': 'Navigate Right',
                    'command': 'press_key',
                    'params': {'key': 'RIGHT'},
                    'description': 'Navigate right in the interface',
                    'requiresInput': False
                }
            ],
            'control': [
                {
                    'id': 'press_key_ok',
                    'label': 'Select/OK',
                    'command': 'press_key',
                    'params': {'key': 'OK'},
                    'description': 'Select current item',
                    'requiresInput': False
                },
                {
                    'id': 'press_key_back',
                    'label': 'Back',
                    'command': 'press_key',
                    'params': {'key': 'BACK'},
                    'description': 'Go back to previous screen',
                    'requiresInput': False
                },
                {
                    'id': 'press_key_home',
                    'label': 'Home',
                    'command': 'press_key',
                    'params': {'key': 'HOME'},
                    'description': 'Go to home screen',
                    'requiresInput': False
                },
                {
                    'id': 'press_key_menu',
                    'label': 'Menu',
                    'command': 'press_key',
                    'params': {'key': 'MENU'},
                    'description': 'Open menu',
                    'requiresInput': False
                }
            ],
            'input': [
                {
                    'id': 'input_text',
                    'label': 'Input Text',
                    'command': 'input_text',
                    'params': {},
                    'description': 'Type text into current field',
                    'requiresInput': True,
                    'inputLabel': 'Text to input',
                    'inputPlaceholder': 'Enter text...'
                }
            ],
            'app_management': [
                {
                    'id': 'launch_app',
                    'label': 'Launch App',
                    'command': 'launch_app',
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
                    'params': {},
                    'description': 'Close an application',
                    'requiresInput': True,
                    'inputLabel': 'App identifier',
                    'inputPlaceholder': 'com.example.app'
                },
                {
                    'id': 'get_installed_apps',
                    'label': 'Get Installed Apps',
                    'command': 'get_installed_apps',
                    'params': {},
                    'description': 'List all installed applications',
                    'requiresInput': False
                }
            ],
            'ui_interaction': [
                {
                    'id': 'dump_ui_elements',
                    'label': 'Dump UI Elements',
                    'command': 'dump_ui_elements',
                    'params': {},
                    'description': 'Get current screen UI elements',
                    'requiresInput': False
                },
                {
                    'id': 'click_element',
                    'label': 'Click UI Element',
                    'command': 'click_element',
                    'params': {},
                    'description': 'Click on a UI element',
                    'requiresInput': True,
                    'inputLabel': 'Element (JSON)',
                    'inputPlaceholder': '{"text": "Button", "resource_id": "button_id"}'
                },
                {
                    'id': 'find_element_by_text',
                    'label': 'Find Element by Text',
                    'command': 'find_element_by_text',
                    'params': {},
                    'description': 'Find UI element by visible text',
                    'requiresInput': True,
                    'inputLabel': 'Text to search for',
                    'inputPlaceholder': 'Button text'
                },
                {
                    'id': 'find_element_by_identifier',
                    'label': 'Find Element by ID',
                    'command': 'find_element_by_identifier',
                    'params': {},
                    'description': 'Find UI element by identifier',
                    'requiresInput': True,
                    'inputLabel': 'Element identifier',
                    'inputPlaceholder': 'resource_id or accessibility_id'
                },
                {
                    'id': 'find_element_by_content_desc',
                    'label': 'Find Element by Description',
                    'command': 'find_element_by_content_desc',
                    'params': {},
                    'description': 'Find UI element by content description',
                    'requiresInput': True,
                    'inputLabel': 'Content description',
                    'inputPlaceholder': 'Element description'
                }
            ],
            'coordinate_input': [
                {
                    'id': 'tap_coordinates',
                    'label': 'Tap Coordinates',
                    'command': 'tap_coordinates',
                    'params': {},
                    'description': 'Tap at specific screen coordinates',
                    'requiresInput': True,
                    'inputLabel': 'Coordinates (x,y)',
                    'inputPlaceholder': '100,200'
                }
            ],
            'utility': [
                {
                    'id': 'get_device_resolution',
                    'label': 'Get Device Resolution',
                    'command': 'get_device_resolution',
                    'params': {},
                    'description': 'Get device screen resolution',
                    'requiresInput': False
                },
                {
                    'id': 'take_screenshot',
                    'label': 'Take Screenshot',
                    'command': 'take_screenshot',
                    'params': {},
                    'description': 'Capture current screen',
                    'requiresInput': False
                }
            ],
            'sequences': [
                {
                    'id': 'execute_sequence',
                    'label': 'Execute Sequence',
                    'command': 'execute_sequence',
                    'params': {},
                    'description': 'Execute a sequence of commands',
                    'requiresInput': True,
                    'inputLabel': 'Command sequence (JSON)',
                    'inputPlaceholder': '[{"action": "press_key", "params": {"key": "OK"}}]'
                }
            ]
        }

    def get_device_capture_path(self) -> str:
        """Get device-specific capture path for screenshots."""
        return self.device_config['video_capture_path']

# Backward compatibility alias
UniversalAppiumController = AppiumRemoteController 
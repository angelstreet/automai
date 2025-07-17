"""
Real Android Mobile Remote Controller Implementation

This controller provides real Android mobile remote control functionality using ADB.
Key difference from TV controller: focuses on UI element dumping and clicking rather than just key presses.
Based on the ADB actions pattern and RecAndroidPhoneRemote component.
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

from src.utils.adb_utils import ADBUtils, AndroidElement, AndroidApp


class AndroidMobileRemoteController(RemoteControllerInterface):
    """Real Android mobile remote controller using SSH + ADB with UI element support."""
    
    @staticmethod
    def get_remote_config() -> Dict[str, Any]:
        """Get the remote configuration including layout, buttons, and image."""
        # Load configuration from JSON file
        config_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 
            'config', 'remote', 'android_mobile_remote.json'
        )
        
        if not os.path.exists(config_path):
            raise FileNotFoundError(f"Android Mobile remote config file not found at: {config_path}")
            
        try:
            print(f"Loading Android Mobile remote config from: {config_path}")
            with open(config_path, 'r') as config_file:
                return json.load(config_file)
        except Exception as e:
            raise RuntimeError(f"Error loading Android Mobile remote config from file: {e}")
    
    def __init__(self, device_ip: str, device_port: int = 5555, **kwargs):
        """
        Initialize the Android mobile remote controller.
        
        Args:
            device_ip: Android device IP address (required)
            device_port: ADB port (default: 5555)
        """
        super().__init__("Android Mobile", "android_mobile")
        
        # Android device parameters
        self.device_ip = device_ip
        self.device_port = device_port
        
        # Validate required parameters
        if not self.device_ip:
            raise ValueError("device_ip is required for AndroidMobileRemoteController")
            
        self.android_device_id = f"{self.device_ip}:{self.device_port}"
        self.adb_utils = None
        self.device_resolution = None
        
        # UI elements state
        self.last_ui_elements = []
        self.last_dump_time = 0
        
        print(f"[@controller:AndroidMobileRemote] Initialized for {self.android_device_id}")
        self.connect()
    
    def connect(self) -> bool:
        """Connect to Android device via ADB."""
        try:
            print(f"Remote[{self.device_type.upper()}]: Connecting to Android device {self.android_device_id}")
            
            # Initialize ADB utilities with direct connection
            self.adb_utils = ADBUtils()
            
            # Connect to Android device via ADB
            if not self.adb_utils.connect_device(self.android_device_id):
                print(f"Remote[{self.device_type.upper()}]: Failed to connect to Android device {self.android_device_id}")
                self.disconnect()
                return False
                
            print(f"Remote[{self.device_type.upper()}]: Successfully connected to Android device {self.android_device_id}")
            
            # Get device resolution
            self.device_resolution = self.adb_utils.get_device_resolution(self.android_device_id)
            if self.device_resolution:
                print(f"Remote[{self.device_type.upper()}]: Device resolution: {self.device_resolution['width']}x{self.device_resolution['height']}")
            
            self.is_connected = True
            return True
            
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Connection error: {e}")
            self.disconnect()
            return False
            
    def disconnect(self) -> bool:
        """Disconnect from Android device."""
        try:
            print(f"Remote[{self.device_type.upper()}]: Disconnecting from {self.device_name}")
            
            # Clean up ADB connection
            self.adb_utils = None
            self.is_connected = False
            
            print(f"Remote[{self.device_type.upper()}]: Disconnected successfully")
            return True
            
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Disconnect error: {e}")
            self.is_connected = False
            return False
            
    def press_key(self, key: str) -> bool:
        """
        Send a key press to the Android device.
        
        Args:
            key: Key name (e.g., "UP", "DOWN", "HOME", "BACK")
        """
        if not self.is_connected or not self.adb_utils:
            print(f"Remote[{self.device_type.upper()}]: ERROR - Not connected to device")
            return False
            
        try:
            print(f"Remote[{self.device_type.upper()}]: Pressing key '{key}'")
            
            success = self.adb_utils.execute_key_command(self.android_device_id, key)
            
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
        Send text input to the Android device.
        
        Args:
            text: Text to input
        """
        if not self.is_connected or not self.adb_utils:
            print(f"Remote[{self.device_type.upper()}]: ERROR - Not connected to device")
            return False
            
        try:
            print(f"Remote[{self.device_type.upper()}]: Inputting text: '{text}'")
            
            success = self.adb_utils.input_text(self.android_device_id, text)
            
            if success:
                print(f"Remote[{self.device_type.upper()}]: Successfully input text")
            else:
                print(f"Remote[{self.device_type.upper()}]: Failed to input text")
                
            return success
            
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Text input error: {e}")
            return False
            

            
    def launch_app(self, package_name: str) -> bool:
        """
        Launch an app by package name.
        
        Args:
            package_name: Android package name (e.g., "com.android.settings")
        """
        if not self.is_connected or not self.adb_utils:
            print(f"Remote[{self.device_type.upper()}]: ERROR - Not connected to device")
            return False
            
        try:
            print(f"Remote[{self.device_type.upper()}]: Launching app: {package_name}")
            
            success = self.adb_utils.launch_app(self.android_device_id, package_name)
            
            if success:
                print(f"Remote[{self.device_type.upper()}]: Successfully launched {package_name}")
            else:
                print(f"Remote[{self.device_type.upper()}]: Failed to launch {package_name}")
                
            return success
            
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: App launch error: {e}")
            return False
            
    def close_app(self, package_name: str) -> bool:
        """
        Close/stop an app by package name.
        
        Args:
            package_name: Android package name (e.g., "com.android.settings")
        """
        if not self.is_connected or not self.adb_utils:
            print(f"Remote[{self.device_type.upper()}]: ERROR - Not connected to device")
            return False
            
        try:
            print(f"Remote[{self.device_type.upper()}]: Closing app: {package_name}")
            
            success = self.adb_utils.close_app(self.android_device_id, package_name)
            
            if success:
                print(f"Remote[{self.device_type.upper()}]: Successfully closed {package_name}")
            else:
                print(f"Remote[{self.device_type.upper()}]: Failed to close {package_name}")
                
            return success
            
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: App close error: {e}")
            return False
            
    def get_installed_apps(self) -> List[AndroidApp]:
        """
        Get list of installed apps on the device.
        
        Returns:
            List of AndroidApp objects
        """
        if not self.is_connected or not self.adb_utils:
            print(f"Remote[{self.device_type.upper()}]: ERROR - Not connected to device")
            return []
            
        try:
            print(f"Remote[{self.device_type.upper()}]: Getting installed apps")
            
            apps = self.adb_utils.get_installed_apps(self.android_device_id)
            
            print(f"Remote[{self.device_type.upper()}]: Found {len(apps)} installed apps")
            return apps
            
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Error getting apps: {e}")
            return []
            
    def dump_ui_elements(self) -> tuple[bool, List[AndroidElement], str]:
        """
        Dump UI elements from the current screen.
        
        Returns:
            Tuple of (success, elements_list, error_message)
        """
        if not self.is_connected or not self.adb_utils:
            print(f"Remote[{self.device_type.upper()}]: ERROR - Not connected to device")
            return False, [], "Not connected to device"
            
        try:
            print(f"Remote[{self.device_type.upper()}]: Dumping UI elements")
            
            success, elements, error = self.adb_utils.dump_ui_elements(self.android_device_id)
            
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
            
    def click_element_by_id(self, element: AndroidElement) -> bool:
        """
        PRIVATE: Click on a UI element (for internal/frontend use only).
        This method is used by routes/frontend after UI dump, not exposed in available actions.
        
        Args:
            element: AndroidElement to click
            
        Returns:
            bool: True if click successful
        """
        if not self.is_connected or not self.adb_utils:
            print(f"Remote[{self.device_type.upper()}]: ERROR - Not connected to device")
            return False
            
        try:
            print(f"Remote[{self.device_type.upper()}]: Clicking element ID={element.id}, text='{element.text}'")
            
            success = self.adb_utils.click_element(self.android_device_id, element)
            
            if success:
                print(f"Remote[{self.device_type.upper()}]: Successfully clicked element")
            else:
                print(f"Remote[{self.device_type.upper()}]: Failed to click element")
                
            return success
            
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Element click error: {e}")
            return False
            
    def click_element(self, element_identifier: str) -> bool:
        """
        Click element directly by text, resource_id, or content_desc using simple ADB command.
        
        Args:
            element_identifier: Text, resource ID, or content description to click
            
        Returns:
            bool: True if click successful
        """
        if not self.is_connected or not self.adb_utils:
            print(f"Remote[{self.device_type.upper()}]: ERROR - Not connected to device")
            return False
            
        try:
            print(f"Remote[{self.device_type.upper()}]: Direct click on element: '{element_identifier}'")
            
            # Use ADB search and click method (correct method name)
            success = self.adb_utils.click_element_by_search(self.android_device_id, element_identifier)
            
            if success:
                print(f"Remote[{self.device_type.upper()}]: Successfully clicked element: '{element_identifier}'")
            else:
                print(f"Remote[{self.device_type.upper()}]: Failed to click element: '{element_identifier}'")
                
            return success
            
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Direct element click error: {e}")
            return False
            
    def find_element_by_text(self, text: str) -> Optional[AndroidElement]:
        """
        Find a UI element by its text content.
        
        Args:
            text: Text to search for
            
        Returns:
            AndroidElement if found, None otherwise
        """
        for element in self.last_ui_elements:
            if text.lower() in element.text.lower():
                return element
        return None
        
    def find_element_by_resource_id(self, resource_id: str) -> Optional[AndroidElement]:
        """
        Find a UI element by its resource ID.
        
        Args:
            resource_id: Resource ID to search for
            
        Returns:
            AndroidElement if found, None otherwise
        """
        for element in self.last_ui_elements:
            if resource_id in element.resource_id:
                return element
        return None
        
    def find_element_by_content_desc(self, content_desc: str) -> Optional[AndroidElement]:
        """
        Find a UI element by its content description.
        
        Args:
            content_desc: Content description to search for
            
        Returns:
            AndroidElement if found, None otherwise
        """
        for element in self.last_ui_elements:
            if content_desc.lower() in element.content_desc.lower():
                return element
        return None
        
    def verify_element_exists(self, text: str = "", resource_id: str = "", content_desc: str = "") -> bool:
        """
        Verify that an element exists on the current screen.
        
        Args:
            text: Text to search for
            resource_id: Resource ID to search for
            content_desc: Content description to search for
            
        Returns:
            bool: True if element found
        """
        if text:
            return self.find_element_by_text(text) is not None
        elif resource_id:
            return self.find_element_by_resource_id(resource_id) is not None
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
        Take a screenshot of the Android device.
        
        Returns:
            tuple: (success, base64_screenshot_data, error_message)
        """
        if not self.is_connected or not self.adb_utils:
            return False, "", "Not connected to device"
            
        try:
            print(f"Remote[{self.device_type.upper()}]: Taking screenshot")
            
            # Use ADB to take screenshot and get base64 data
            success, screenshot_data, error = self.adb_utils.take_screenshot(self.android_device_id)
            
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
        """Get controller status by checking ADB device connectivity."""
        if not self.device_ip:
            return {'success': False, 'error': 'No device IP provided'}
            
        try:
            # Run adb devices to check connectivity
            import subprocess
            adb_result = subprocess.run(
                ['adb', 'devices'], 
                capture_output=True, 
                text=True
            )
            
            if adb_result.returncode != 0:
                return {'success': False, 'error': 'ADB command failed'}
            
            # Parse adb devices output to find our device
            device_lines = [line.strip() for line in adb_result.stdout.split('\n') 
                          if line.strip() and not line.startswith('List of devices')]
            
            for line in device_lines:
                if self.android_device_id in line:
                    parts = line.split('\t')
                    if len(parts) >= 2:
                        device_status = parts[1].strip()
                        if device_status == 'device':
                            return {'success': True}
                        else:
                            return {'success': False, 'error': f'Device status is {device_status}, expected "device"'}
            
            # Device not found in ADB devices list
            return {'success': False, 'error': f'Device {self.android_device_id} not found in ADB devices'}
            
        except Exception as e:
            return {'success': False, 'error': f'Failed to check ADB status: {str(e)}'}

    def tap_coordinates(self, x: int, y: int) -> bool:
        """
        Tap at specific coordinates on the screen.
        
        Args:
            x: X coordinate
            y: Y coordinate  
        """
        if not self.is_connected or not self.adb_utils:
            print(f"Remote[{self.device_type.upper()}]: ERROR - Not connected to device")
            return False
            
        try:
            print(f"Remote[{self.device_type.upper()}]: Tapping at coordinates ({x}, {y})")
            
            success = self.adb_utils.tap_coordinates(self.android_device_id, x, y)
            
            if success:
                print(f"Remote[{self.device_type.upper()}]: Successfully tapped at ({x}, {y})")
            else:
                print(f"Remote[{self.device_type.upper()}]: Failed to tap at ({x}, {y})")
                
            return success
            
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Coordinate tap error: {e}")
            return False
    
    def get_available_actions(self) -> Dict[str, Any]:
        """Get available actions for this Android mobile controller."""
        return {
            'Remote': [
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
                    'inputLabel': 'Package name',
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
                    'inputLabel': 'Package name', 
                    'inputPlaceholder': 'com.example.app'
                }  
            ]
        }

    def execute_command(self, command: str, params: Dict[str, Any] = None) -> bool:
        """
        Execute Android Mobile specific command with proper abstraction.
        
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
            package = params.get('package')
            result = self.launch_app(package) if package else False
        
        elif command == 'close_app':
            package = params.get('package')
            result = self.close_app(package) if package else False
        
        elif command == 'click_element':
            element_id = params.get('element_id')
            result = self.click_element(element_id) if element_id else False
        
        elif command == 'tap_coordinates':
            x, y = params.get('x'), params.get('y')
            result = self.tap_coordinates(int(x), int(y)) if x is not None and y is not None else False
        
        elif command == 'click_element_by_id':
            # Android Mobile specific - uses UI dump
            element_id = params.get('element_id')
            if element_id and self.last_ui_elements:
                element = next((el for el in self.last_ui_elements if str(el.id) == str(element_id)), None)
                result = self.click_element_by_id(element) if element else False
            else:
                result = False
        
        elif command == 'dump_ui_elements':
            # Android Mobile specific
            success, _, _ = self.dump_ui_elements()
            result = success
        
        elif command == 'get_installed_apps':
            # Android Mobile specific
            apps = self.get_installed_apps()
            result = len(apps) > 0
        
        else:
            print(f"Remote[{self.device_type.upper()}]: Unknown command: {command}")
            result = False
        
        # Apply wait_time after successful command execution
        if result and wait_time > 0:
            wait_seconds = wait_time / 1000.0
            print(f"Remote[{self.device_type.upper()}]: Waiting {wait_seconds}s after {command}")
            time.sleep(wait_seconds)
        
        return result
"""
Real Android Mobile Remote Controller Implementation

This controller provides real Android mobile remote control functionality using SSH + ADB.
Key difference from TV controller: focuses on UI element dumping and clicking rather than just key presses.
Based on the ADB actions pattern and RecAndroidPhoneRemote component.
"""

from typing import Dict, Any, List, Optional
import subprocess
import time
import json
from ..base_controllers import RemoteControllerInterface
from ..lib.sshUtils import SSHConnection, create_ssh_connection
from ..lib.adbUtils import ADBUtils, AndroidElement, AndroidApp


class AndroidMobileRemoteController(RemoteControllerInterface):
    """Real Android mobile remote controller using SSH + ADB with UI element support."""
    
    def __init__(self, device_name: str = "Android Mobile", device_type: str = "android_mobile", **kwargs):
        """
        Initialize the Android mobile remote controller.
        
        Args:
            device_name: Name of the Android mobile device
            device_type: Type identifier for the device
            **kwargs: Additional parameters including:
                - host_ip: SSH host IP address (required)
                - host_port: SSH port (default: 22)
                - host_username: SSH username (required)
                - host_password: SSH password (if using password auth)
                - host_private_key: SSH private key (if using key auth)
                - device_ip: Android device IP address (required)
                - adb_port: ADB port (default: 5555)
                - connection_timeout: Connection timeout in seconds (default: 10)
        """
        super().__init__(device_name, device_type)
        
        # SSH connection parameters
        self.host_ip = kwargs.get('host_ip')
        self.host_port = kwargs.get('host_port', 22)
        self.host_username = kwargs.get('host_username')
        self.host_password = kwargs.get('host_password', '')
        self.host_private_key = kwargs.get('host_private_key', '')
        
        # Android device parameters
        self.device_ip = kwargs.get('device_ip')
        self.adb_port = kwargs.get('adb_port', 5555)
        self.connection_timeout = kwargs.get('connection_timeout', 10)
        
        # Validate required parameters
        if not self.host_ip:
            raise ValueError("host_ip is required for AndroidMobileRemoteController")
        if not self.host_username:
            raise ValueError("host_username is required for AndroidMobileRemoteController")
        if not self.device_ip:
            raise ValueError("device_ip is required for AndroidMobileRemoteController")
            
        self.android_device_id = f"{self.device_ip}:{self.adb_port}"
        self.ssh_connection = None
        self.adb_utils = None
        self.device_resolution = None
        
        # UI elements state
        self.last_ui_elements = []
        self.last_dump_time = 0
        
    def connect(self) -> bool:
        """Connect to SSH host and then to Android device via ADB."""
        try:
            print(f"Remote[{self.device_type.upper()}]: Connecting to SSH host {self.host_ip} and Android device {self.android_device_id}")
            
            # Step 1: Establish SSH connection
            self.ssh_connection = create_ssh_connection(
                host=self.host_ip,
                port=self.host_port,
                username=self.host_username,
                password=self.host_password,
                private_key=self.host_private_key,
                timeout=self.connection_timeout
            )
            
            if not self.ssh_connection:
                print(f"Remote[{self.device_type.upper()}]: Failed to establish SSH connection to {self.host_ip}")
                return False
                
            print(f"Remote[{self.device_type.upper()}]: SSH connection established to {self.host_ip}")
            
            # Step 2: Initialize ADB utilities
            self.adb_utils = ADBUtils(self.ssh_connection)
            
            # Step 3: Connect to Android device via ADB
            if not self.adb_utils.connect_device(self.android_device_id):
                print(f"Remote[{self.device_type.upper()}]: Failed to connect to Android device {self.android_device_id}")
                self.disconnect()
                return False
                
            print(f"Remote[{self.device_type.upper()}]: Successfully connected to Android device {self.android_device_id}")
            
            # Step 4: Get device resolution
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
        """Disconnect from Android device and SSH host."""
        try:
            print(f"Remote[{self.device_type.upper()}]: Disconnecting from {self.device_name}")
            
            # Close SSH connection (this will also close ADB connection)
            if self.ssh_connection:
                self.ssh_connection.disconnect()
                self.ssh_connection = None
                
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
            print(f"Remote[{self.device_type.upper()}]: Sending text: '{text}'")
            
            # Use ADB text input command
            escaped_text = text.replace(" ", "%s").replace("'", "\\'").replace('"', '\\"')
            success, stdout, stderr, exit_code = self.ssh_connection.execute_command(
                f"adb -s {self.android_device_id} shell input text {escaped_text}"
            )
            
            if success and exit_code == 0:
                print(f"Remote[{self.device_type.upper()}]: Successfully sent text: '{text}'")
                return True
            else:
                print(f"Remote[{self.device_type.upper()}]: Text input failed: {stderr}")
                return False
                
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Text input error: {e}")
            return False
            
    def execute_sequence(self, commands: List[Dict[str, Any]]) -> bool:
        """
        Execute a sequence of commands.
        
        Args:
            commands: List of command dictionaries with 'action', 'params', and optional 'delay'
        """
        if not self.is_connected:
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
                success = self.launch_app(params.get('package', ''))
            elif action == 'click_element':
                element_id = params.get('element_id')
                if element_id and self.last_ui_elements:
                    element = next((el for el in self.last_ui_elements if el.id == element_id), None)
                    if element:
                        success = self.click_element(element)
                    else:
                        print(f"Remote[{self.device_type.upper()}]: Element with ID {element_id} not found")
                        return False
                else:
                    print(f"Remote[{self.device_type.upper()}]: No element ID provided or no UI elements available")
                    return False
            elif action == 'dump_ui':
                success, elements, error = self.dump_ui_elements()
                if not success:
                    print(f"Remote[{self.device_type.upper()}]: UI dump failed: {error}")
                    return False
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
            
    def click_element(self, element: AndroidElement) -> bool:
        """
        Click on a UI element.
        
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
        """
        Get device screen resolution.
        
        Returns:
            Dictionary with width and height, or None if not available
        """
        return self.device_resolution
        
    def get_status(self) -> Dict[str, Any]:
        """Get controller status information."""
        return {
            'controller_type': self.controller_type,
            'device_type': self.device_type,
            'device_name': self.device_name,
            'host_ip': self.host_ip,
            'host_port': self.host_port,
            'host_username': self.host_username,
            'device_ip': self.device_ip,
            'adb_port': self.adb_port,
            'android_device_id': self.android_device_id,
            'connected': self.is_connected,
            'connection_timeout': self.connection_timeout,
            'device_resolution': self.device_resolution,
            'last_ui_elements_count': len(self.last_ui_elements),
            'last_dump_time': self.last_dump_time,
            'supported_keys': list(ADBUtils.ADB_KEYS.keys()) if self.adb_utils else [],
            'capabilities': [
                'navigation', 'text_input', 'app_launch', 'ui_dumping',
                'element_clicking', 'element_finding', 'element_verification',
                'media_control', 'volume_control', 'power_control'
            ]
        }

    @staticmethod
    def get_remote_config() -> Dict[str, Any]:
        """Get the remote configuration including layout, buttons, and image."""
        return {
            'remote_info': {
                'name': 'Android Mobile Remote',
                'type': 'android_mobile',
                'image_url': '/android-tv-remote.png',
                'default_scale': 0.8,
                'min_scale': 0.3,
                'max_scale': 1.5,
                # General scaling and offset parameters
                'button_scale_factor': 1.5,  # General scaling factor for all button sizes
                'global_offset': {
                    'x': 0,  # Global X offset for all buttons
                    'y': 0   # Global Y offset for all buttons
                }
            },
            'button_layout': {
                # Navigation buttons
                'up': {
                    'key': 'UP',
                    'position': { 'x': 90, 'y': 120 },
                    'size': { 'width': 25, 'height': 25 },
                    'shape': 'circle',
                    'comment': 'Up navigation'
                },
                'down': {
                    'key': 'DOWN',
                    'position': { 'x': 90, 'y': 180 },
                    'size': { 'width': 25, 'height': 25 },
                    'shape': 'circle',
                    'comment': 'Down navigation'
                },
                'left': {
                    'key': 'LEFT',
                    'position': { 'x': 60, 'y': 150 },
                    'size': { 'width': 25, 'height': 25 },
                    'shape': 'circle',
                    'comment': 'Left navigation'
                },
                'right': {
                    'key': 'RIGHT',
                    'position': { 'x': 120, 'y': 150 },
                    'size': { 'width': 25, 'height': 25 },
                    'shape': 'circle',
                    'comment': 'Right navigation'
                },
                'select': {
                    'key': 'SELECT',
                    'position': { 'x': 90, 'y': 150 },
                    'size': { 'width': 20, 'height': 20 },
                    'shape': 'circle',
                    'comment': 'Select/OK button'
                },
                
                # System buttons
                'back': {
                    'key': 'BACK',
                    'position': { 'x': 40, 'y': 220 },
                    'size': { 'width': 30, 'height': 20 },
                    'shape': 'rectangle',
                    'comment': 'Back button'
                },
                'home': {
                    'key': 'HOME',
                    'position': { 'x': 90, 'y': 220 },
                    'size': { 'width': 30, 'height': 20 },
                    'shape': 'rectangle',
                    'comment': 'Home button'
                },
                'menu': {
                    'key': 'MENU',
                    'position': { 'x': 140, 'y': 220 },
                    'size': { 'width': 30, 'height': 20 },
                    'shape': 'rectangle',
                    'comment': 'Menu button'
                },
                
                # Phone-specific buttons
                'camera': {
                    'key': 'CAMERA',
                    'position': { 'x': 40, 'y': 260 },
                    'size': { 'width': 25, 'height': 25 },
                    'shape': 'circle',
                    'comment': 'Camera button'
                },
                'call': {
                    'key': 'CALL',
                    'position': { 'x': 90, 'y': 260 },
                    'size': { 'width': 25, 'height': 25 },
                    'shape': 'circle',
                    'comment': 'Call button'
                },
                'endcall': {
                    'key': 'ENDCALL',
                    'position': { 'x': 140, 'y': 260 },
                    'size': { 'width': 25, 'height': 25 },
                    'shape': 'circle',
                    'comment': 'End call button'
                },
                
                # Volume and power
                'volume_down': {
                    'key': 'VOLUME_DOWN',
                    'position': { 'x': 30, 'y': 300 },
                    'size': { 'width': 25, 'height': 20 },
                    'shape': 'rectangle',
                    'comment': 'Volume down'
                },
                'volume_mute': {
                    'key': 'VOLUME_MUTE',
                    'position': { 'x': 70, 'y': 300 },
                    'size': { 'width': 25, 'height': 20 },
                    'shape': 'rectangle',
                    'comment': 'Volume mute'
                },
                'volume_up': {
                    'key': 'VOLUME_UP',
                    'position': { 'x': 110, 'y': 300 },
                    'size': { 'width': 25, 'height': 20 },
                    'shape': 'rectangle',
                    'comment': 'Volume up'
                },
                'power': {
                    'key': 'POWER',
                    'position': { 'x': 150, 'y': 300 },
                    'size': { 'width': 25, 'height': 20 },
                    'shape': 'rectangle',
                    'comment': 'Power button'
                }
            }
        }


# Backward compatibility alias
RealAndroidMobileController = AndroidMobileRemoteController 
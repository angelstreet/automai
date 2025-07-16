"""
Real Android TV Remote Controller Implementation

This controller provides real Android TV remote control functionality using ADB.
Connects directly to Android TV devices via ADB.
"""

from typing import Dict, Any, List, Optional
import subprocess
import time
import json
import os
from pathlib import Path
from ..base_controller import RemoteControllerInterface

# Import ADB utilities
try:
    from src.utils.adb_utils import ADBUtils
    ADB_AVAILABLE = True
except ImportError:
    print("Warning: ADB utilities not available. ADB functionality will be limited.")
    ADB_AVAILABLE = False


class AndroidTVRemoteController(RemoteControllerInterface):
    """Real Android TV remote controller using ADB commands."""
    
    @staticmethod
    def get_remote_config() -> Dict[str, Any]:
        """Get the remote configuration including layout, buttons, and image."""
        # Load configuration from JSON file
        config_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 
            'config', 'remote', 'android_tv_remote.json'
        )
        
        if not os.path.exists(config_path):
            raise FileNotFoundError(f"Android TV remote config file not found at: {config_path}")
            
        try:
            print(f"Loading Android TV remote config from: {config_path}")
            with open(config_path, 'r') as config_file:
                return json.load(config_file)
        except Exception as e:
            raise RuntimeError(f"Error loading Android TV remote config from file: {e}")
    
    def __init__(self, device_ip: str, device_port: int = 5555, **kwargs):
        """
        Initialize the Android TV remote controller.
        
        Args:
            device_ip: Android TV device IP address (required)
            device_port: ADB port (default: 5555)
        """
        super().__init__("Android TV", "android_tv")
        
        # Android TV device parameters
        self.device_ip = device_ip
        self.device_port = device_port
        
        # Validate required parameters
        if not self.device_ip:
            raise ValueError("device_ip is required for AndroidTVRemoteController")
            
        self.android_device_id = f"{self.device_ip}:{self.device_port}"
        self.adb_utils = None
        
        print(f"[@controller:AndroidTVRemote] Initialized for {self.android_device_id}")
        
    def connect(self) -> bool:
        """Connect to the Android TV device via ADB."""
        try:
            print(f"Remote[{self.device_type.upper()}]: Connecting to Android device {self.android_device_id}")
            
            if not ADB_AVAILABLE:
                print(f"Remote[{self.device_type.upper()}]: ERROR - ADB utilities not available")
                return False
            
            # Step 1: Initialize ADB utilities
            self.adb_utils = ADBUtils()
            
            # Step 2: Connect to Android device via ADB
            if not self.adb_utils.connect_device(self.android_device_id):
                print(f"Remote[{self.device_type.upper()}]: Failed to connect to Android device {self.android_device_id}")
                self.disconnect()
                return False
                
            print(f"Remote[{self.device_type.upper()}]: Successfully connected to Android device {self.android_device_id}")
            
            # Step 3: Get device resolution
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
            
            self.adb_utils = None
            self.is_connected = False
            
            print(f"Remote[{self.device_type.upper()}]: Disconnected successfully")
            return True
            
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Disconnect error: {e}")
            self.is_connected = False
            return False
            
    def press_key(self, key: str, wait_time: int = 0) -> bool:
        """
        Send a key press to the Android TV.
        
        Args:
            key: Key name (e.g., "UP", "DOWN", "OK", "HOME")
            wait_time: Wait time in milliseconds after action execution
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
            
            # Handle timing in controller
            self._handle_wait_time(wait_time, "key press")
                
            return success
            
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Key press error: {e}")
            return False
            
    def input_text(self, text: str, wait_time: int = 0) -> bool:
        """
        Send text input to the Android TV.
        
        Args:
            text: Text to input
            wait_time: Wait time in milliseconds after action execution
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
            
            # Handle timing in controller
            self._handle_wait_time(wait_time, "text input")
                
            return success
            
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Text input error: {e}")
            return False
            
    def execute_sequence(self, commands: List[Dict[str, Any]], final_wait_time: int = 0) -> bool:
        """
        Execute a sequence of commands.
        
        Args:
            commands: List of command dictionaries with 'action', 'params', and optional 'delay'
            final_wait_time: Wait time in milliseconds after sequence completion
        """
        if not self.is_connected or not self.adb_utils:
            print(f"Remote[{self.device_type.upper()}]: ERROR - Not connected to device")
            return False
            
        print(f"Remote[{self.device_type.upper()}]: Executing sequence of {len(commands)} commands")
        
        for i, command in enumerate(commands):
            action = command.get('action')
            params = command.get('params', {})
            wait_time = params.get('wait_time', 0)  # Extract wait_time from params
            
            print(f"Remote[{self.device_type.upper()}]: Step {i+1}: {action}")
            
            success = False
            if action == 'press_key':
                success = self.press_key(params.get('key', 'OK'), wait_time)
            elif action == 'input_text':
                success = self.input_text(params.get('text', ''), wait_time)
            elif action == 'launch_app':
                success = self.launch_app(params.get('package', ''), wait_time)
            elif action == 'tap':
                x = params.get('x', 0)
                y = params.get('y', 0)
                success = self.tap_coordinates(x, y, wait_time)
            elif action == 'close_app':
                success = self.close_app(params.get('package', ''), wait_time)
            else:
                print(f"Remote[{self.device_type.upper()}]: Unknown action: {action}")
                return False
                
            if not success:
                print(f"Remote[{self.device_type.upper()}]: Sequence failed at step {i+1}")
                return False
        
        # Handle final wait time after sequence completion
        self._handle_wait_time(final_wait_time, "sequence completion")
                
        print(f"Remote[{self.device_type.upper()}]: Sequence completed successfully")
        return True
        
    def launch_app(self, package_name: str, wait_time: int = 0) -> bool:
        """
        Launch an app by package name.
        
        Args:
            package_name: Android package name (e.g., "com.android.settings")
            wait_time: Wait time in milliseconds after action execution
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
            
            # Handle timing in controller
            self._handle_wait_time(wait_time, "app launch")
                
            return success
            
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: App launch error: {e}")
            return False
            
    def close_app(self, package_name: str, wait_time: int = 0) -> bool:
        """
        Close/stop an app by package name.
        
        Args:
            package_name: Android package name (e.g., "com.android.settings")
            wait_time: Wait time in milliseconds after action execution
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
            
            # Handle timing in controller
            self._handle_wait_time(wait_time, "app close")
                
            return success
            
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: App close error: {e}")
            return False
            
    def kill_app(self, package_name: str) -> bool:
        """
        Kill an app by package name (alias for close_app).
        
        Args:
            package_name: Android package name (e.g., "com.netflix.ninja")
        """
        return self.close_app(package_name)
            
    def tap_coordinates(self, x: int, y: int, wait_time: int = 0) -> bool:
        """
        Tap at specific coordinates on the screen.
        
        Args:
            x: X coordinate
            y: Y coordinate
            wait_time: Wait time in milliseconds after action execution
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
            
            # Handle timing in controller
            self._handle_wait_time(wait_time, "coordinate tap")
                
            return success
            
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Coordinate tap error: {e}")
            return False
            
    def get_installed_apps(self) -> List[Dict[str, str]]:
        """Get list of installed apps on the device."""
        if not self.is_connected:
            print(f"Remote[{self.device_type.upper()}]: ERROR - Not connected to device")
            return []
            
        try:
            # Get list of installed packages (3rd party apps only)
            packages_command = ["adb", "-s", self.android_device_id, "shell", "pm", "list", "packages", "-3"]
            
            result = subprocess.run(
                packages_command,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode != 0:
                print(f"Remote[{self.device_type.upper()}]: Failed to get packages list")
                return []
                
            packages = []
            for line in result.stdout.split('\n'):
                if line.startswith('package:'):
                    package_name = line.replace('package:', '').strip()
                    packages.append({
                        'packageName': package_name,
                        'label': package_name  # Could be enhanced to get actual app labels
                    })
                    
            print(f"Remote[{self.device_type.upper()}]: Found {len(packages)} installed apps")
            return packages
            
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Error getting apps: {e}")
            return []
            
    def take_screenshot(self) -> tuple[bool, str, str]:
        """
        Take a screenshot of the Android TV device.
        
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
        """Get controller status information with ADB device verification."""
        try:
            # Basic status info
            base_status = {
                'success': True,
                'controller_type': self.controller_type,
                'device_type': self.device_type,
                'device_name': self.device_name,
                'device_ip': self.device_ip,
                'device_port': self.device_port,
                'adb_device': self.android_device_id,
                'connected': self.is_connected,
                'device_resolution': self.device_resolution,
                'supported_keys': list(ADBUtils.ADB_KEYS.keys()) if self.adb_utils else [],
                'capabilities': [
                    'adb_control', 'navigation', 'text_input', 
                    'app_launch', 'app_close', 'coordinate_tap', 'media_control', 'volume_control', 'power_control'
                ]
            }
            
            # Check ADB device connectivity if we have device IP and are connected
            if self.device_ip and self.is_connected:
                import subprocess
                
                # Run adb devices to check connectivity
                adb_result = subprocess.run(
                    ['adb', 'devices'], 
                    capture_output=True, 
                    text=True
                )
                
                if adb_result.returncode != 0:
                    base_status.update({
                        'adb_status': 'command_failed',
                        'adb_connected': False,
                        'message': 'ADB command failed'
                    })
                    return base_status
                
                # Parse adb devices output
                device_lines = [line.strip() for line in adb_result.stdout.split('\n') 
                              if line.strip() and not line.startswith('List of devices')]
                
                device_found = None
                device_status = None
                
                for line in device_lines:
                    if self.android_device_id in line:
                        device_found = line
                        parts = line.split('\t')
                        if len(parts) >= 2:
                            device_status = parts[1].strip()
                        break
                
                if not device_found:
                    base_status.update({
                        'adb_status': 'device_not_found',
                        'adb_connected': False,
                        'message': f'Device {self.android_device_id} not found in ADB devices list',
                        'available_devices': device_lines
                    })
                elif device_status != 'device':
                    base_status.update({
                        'adb_status': f'device_{device_status}',
                        'adb_connected': False,
                        'message': f'Device {self.android_device_id} status is {device_status}, expected "device"',
                        'device_found': device_found
                    })
                else:
                    base_status.update({
                        'adb_status': 'device_connected',
                        'adb_connected': True,
                        'message': f'Device {self.android_device_id} is connected and ready',
                        'device_status': device_status
                    })
            else:
                base_status.update({
                    'adb_status': 'not_applicable',
                    'adb_connected': False,
                    'message': 'No device IP provided or not connected'
                })
            
            return base_status
            
        except Exception as e:
            return {
                'success': False,
                'controller_type': self.controller_type,
                'device_name': self.device_name,
                'adb_status': 'error',
                'adb_connected': False,
                'error': f'Failed to check ADB device status: {str(e)}'
            }
    
    def get_available_actions(self) -> Dict[str, Any]:
        """Get available actions for this Android TV controller."""
        return {
            'remote': [
                # Navigation actions
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
                    'id': 'press_key_ok',
                    'label': 'Select/OK',
                    'command': 'press_key',
                    'action_type': 'remote',
                    'params': {'key': 'OK'},
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
                    'description': 'Open context menu',
                    'requiresInput': False
                },
                # Media control actions
                {
                    'id': 'press_key_play_pause',
                    'label': 'Play/Pause',
                    'command': 'press_key',
                    'action_type': 'remote',
                    'params': {'key': 'MEDIA_PLAY_PAUSE'},
                    'description': 'Toggle play/pause for media',
                    'requiresInput': False
                },
                {
                    'id': 'press_key_stop',
                    'label': 'Stop',
                    'command': 'press_key',
                    'action_type': 'remote',
                    'params': {'key': 'MEDIA_STOP'},
                    'description': 'Stop media playback',
                    'requiresInput': False
                },
                {
                    'id': 'press_key_next',
                    'label': 'Next Track',
                    'command': 'press_key',
                    'action_type': 'remote',
                    'params': {'key': 'MEDIA_NEXT'},
                    'description': 'Skip to next track/chapter',
                    'requiresInput': False
                },
                {
                    'id': 'press_key_previous',
                    'label': 'Previous Track',
                    'command': 'press_key',
                    'action_type': 'remote',
                    'params': {'key': 'MEDIA_PREVIOUS'},
                    'description': 'Go to previous track/chapter',
                    'requiresInput': False
                },
                {
                    'id': 'press_key_fast_forward',
                    'label': 'Fast Forward',
                    'command': 'press_key',
                    'action_type': 'remote',
                    'params': {'key': 'MEDIA_FAST_FORWARD'},
                    'description': 'Fast forward media',
                    'requiresInput': False
                },
                {
                    'id': 'press_key_rewind',
                    'label': 'Rewind',
                    'command': 'press_key',
                    'action_type': 'remote',
                    'params': {'key': 'MEDIA_REWIND'},
                    'description': 'Rewind media',
                    'requiresInput': False
                },
                # Volume control actions
                {
                    'id': 'press_key_volume_up',
                    'label': 'Volume Up',
                    'command': 'press_key',
                    'action_type': 'remote',
                    'params': {'key': 'VOLUME_UP'},
                    'description': 'Increase volume',
                    'requiresInput': False
                },
                {
                    'id': 'press_key_volume_down',
                    'label': 'Volume Down',
                    'command': 'press_key',
                    'action_type': 'remote',
                    'params': {'key': 'VOLUME_DOWN'},
                    'description': 'Decrease volume',
                    'requiresInput': False
                },
                {
                    'id': 'press_key_mute',
                    'label': 'Mute',
                    'command': 'press_key',
                    'action_type': 'remote',
                    'params': {'key': 'VOLUME_MUTE'},
                    'description': 'Toggle mute',
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
                },
                # Power control actions
                {
                    'id': 'press_key_power',
                    'label': 'Power',
                    'command': 'press_key',
                    'action_type': 'remote',
                    'params': {'key': 'POWER'},
                    'description': 'Toggle power on/off',
                    'requiresInput': False
                }
            ]
        }

    def get_device_capture_path(self) -> str:
        """Get device-specific capture path for screenshots."""
        return self.device_config['video_capture_path']

    def execute_command(self, command: str, params: Dict[str, Any] = None, wait_time: int = 0) -> bool:
        """
        Execute Android TV specific command with proper abstraction.
        
        Args:
            command: Command to execute ('press_key', 'input_text', etc.)
            params: Command parameters
            wait_time: Wait time in milliseconds after execution
            
        Returns:
            bool: True if command executed successfully
        """
        if params is None:
            params = {}
        
        print(f"Remote[{self.device_type.upper()}]: Executing command '{command}' with params: {params}")
        
        if command == 'press_key':
            key = params.get('key')
            return self.press_key(key, wait_time) if key else False
        
        elif command == 'input_text':
            text = params.get('text')
            return self.input_text(text, wait_time) if text else False
        
        elif command == 'launch_app':
            package = params.get('package')
            return self.launch_app(package, wait_time) if package else False
        
        elif command == 'close_app':
            package = params.get('package')
            return self.close_app(package, wait_time) if package else False
        
        elif command == 'tap_coordinates':
            x, y = params.get('x'), params.get('y')
            return self.tap_coordinates(int(x), int(y), wait_time) if x is not None and y is not None else False
        
        elif command == 'get_installed_apps':
            # Android TV specific
            apps = self.get_installed_apps()
            return len(apps) > 0
        
        # Android TV doesn't have click_element or UI dump capabilities
        
        else:
            print(f"Remote[{self.device_type.upper()}]: Unknown command: {command}")
            return False
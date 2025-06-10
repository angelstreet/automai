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
    from utils.adb_utils import ADBUtils
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
    
    def __init__(self, device_name: str = "Android TV", device_type: str = "android_tv", **kwargs):
        """
        Initialize the Android TV remote controller.
        
        Args:
            device_name: Name of the Android TV device
            device_type: Type identifier for the device
            **kwargs: Additional parameters including:
                # ADB Device Parameters (required)
                - device_ip: IP address of the Android TV device (required)
                - device_port: ADB port on the device (default: 5555)
                
                # Connection Parameters
                - connection_timeout: Connection timeout in seconds (default: 10)
        """
        super().__init__(device_name, device_type)
        
        # ADB device parameters
        self.device_ip = kwargs.get('device_ip')
        self.device_port = kwargs.get('device_port', 5555)
        
        # Connection settings
        self.connection_timeout = kwargs.get('connection_timeout', 10)
        
        # Validate required parameters
        if not self.device_ip:
            raise ValueError("device_ip is required for AndroidTVRemoteController")
            
        self.adb_device = f"{self.device_ip}:{self.device_port}"
        self.adb_utils = None
        self.device_resolution = None
        
    def connect(self) -> bool:
        """Connect to the Android TV device via ADB."""
        try:
            print(f"Remote[{self.device_type.upper()}]: Connecting to Android device {self.adb_device}")
            
            if not ADB_AVAILABLE:
                print(f"Remote[{self.device_type.upper()}]: ERROR - ADB utilities not available")
                return False
            
            # Step 1: Initialize ADB utilities
            self.adb_utils = ADBUtils()
            
            # Step 2: Connect to Android device via ADB
            if not self.adb_utils.connect_device(self.adb_device):
                print(f"Remote[{self.device_type.upper()}]: Failed to connect to Android device {self.adb_device}")
                self.disconnect()
                return False
                
            print(f"Remote[{self.device_type.upper()}]: Successfully connected to Android device {self.adb_device}")
            
            # Step 3: Get device resolution
            self.device_resolution = self.adb_utils.get_device_resolution(self.adb_device)
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
            
    def press_key(self, key: str) -> bool:
        """
        Send a key press to the Android TV.
        
        Args:
            key: Key name (e.g., "UP", "DOWN", "OK", "HOME")
        """
        if not self.is_connected or not self.adb_utils:
            print(f"Remote[{self.device_type.upper()}]: ERROR - Not connected to device")
            return False
            
        try:
            print(f"Remote[{self.device_type.upper()}]: Pressing key '{key}'")
            
            success = self.adb_utils.execute_key_command(self.adb_device, key)
            
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
        Send text input to the Android TV.
        
        Args:
            text: Text to input
        """
        if not self.is_connected or not self.adb_utils:
            print(f"Remote[{self.device_type.upper()}]: ERROR - Not connected to device")
            return False
            
        try:
            print(f"Remote[{self.device_type.upper()}]: Sending text: '{text}'")
            
            # Use ADB text input command directly
            success = self.adb_utils.input_text(self.adb_device, text)
            
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
        Execute a sequence of commands.
        
        Args:
            commands: List of command dictionaries with 'action', 'params', and optional 'delay'
        """
        if not self.is_connected or not self.adb_utils:
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
                success = self.press_key(params.get('key', 'OK'))
            elif action == 'input_text':
                success = self.input_text(params.get('text', ''))
            elif action == 'launch_app':
                success = self.launch_app(params.get('package', ''))
            elif action == 'tap':
                x = params.get('x', 0)
                y = params.get('y', 0)
                success = self.tap_coordinates(x, y)
            elif action == 'close_app':
                success = self.close_app(params.get('package', ''))
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
            package_name: Android package name (e.g., "com.netflix.ninja")
        """
        if not self.is_connected:
            print(f"Remote[{self.device_type.upper()}]: ERROR - Not connected to device")
            return False
            
        try:
            launch_command = [
                "adb", "-s", self.adb_device, "shell", "monkey", 
                "-p", package_name, "-c", "android.intent.category.LAUNCHER", "1"
            ]
            print(f"Remote[{self.device_type.upper()}]: Launching app: {package_name}")
            
            result = subprocess.run(
                launch_command,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                print(f"Remote[{self.device_type.upper()}]: Successfully launched {package_name}")
                return True
            else:
                print(f"Remote[{self.device_type.upper()}]: App launch failed: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            print(f"Remote[{self.device_type.upper()}]: App launch timeout")
            return False
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: App launch error: {e}")
            return False
            
    def close_app(self, package_name: str) -> bool:
        """
        Close/stop an app by package name.
        
        Args:
            package_name: Android package name (e.g., "com.netflix.ninja")
        """
        if not self.is_connected:
            print(f"Remote[{self.device_type.upper()}]: ERROR - Not connected to device")
            return False
            
        try:
            close_command = [
                "adb", "-s", self.adb_device, "shell", "am", "force-stop", package_name
            ]
            print(f"Remote[{self.device_type.upper()}]: Closing app: {package_name}")
            
            result = subprocess.run(
                close_command,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                print(f"Remote[{self.device_type.upper()}]: Successfully closed {package_name}")
                return True
            else:
                print(f"Remote[{self.device_type.upper()}]: App close failed: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            print(f"Remote[{self.device_type.upper()}]: App close timeout")
            return False
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
            
    def tap_coordinates(self, x: int, y: int) -> bool:
        """
        Tap at specific screen coordinates.
        
        Args:
            x: X coordinate
            y: Y coordinate
        """
        if not self.is_connected:
            print(f"Remote[{self.device_type.upper()}]: ERROR - Not connected to device")
            return False
            
        try:
            tap_command = ["adb", "-s", self.adb_device, "shell", "input", "tap", str(x), str(y)]
            print(f"Remote[{self.device_type.upper()}]: Tapping at coordinates ({x}, {y})")
            
            result = subprocess.run(
                tap_command,
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if result.returncode == 0:
                print(f"Remote[{self.device_type.upper()}]: Successfully tapped at ({x}, {y})")
                return True
            else:
                print(f"Remote[{self.device_type.upper()}]: Tap failed: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            print(f"Remote[{self.device_type.upper()}]: Tap timeout")
            return False
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Tap error: {e}")
            return False
            
    def get_installed_apps(self) -> List[Dict[str, str]]:
        """Get list of installed apps on the device."""
        if not self.is_connected:
            print(f"Remote[{self.device_type.upper()}]: ERROR - Not connected to device")
            return []
            
        try:
            # Get list of installed packages (3rd party apps only)
            packages_command = ["adb", "-s", self.adb_device, "shell", "pm", "list", "packages", "-3"]
            
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
            success, screenshot_data, error = self.adb_utils.take_screenshot(self.adb_device)
            
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
        """Get controller status information."""
        return {
            'controller_type': self.controller_type,
            'device_type': self.device_type,
            'device_name': self.device_name,
            # ADB device info
            'device_ip': self.device_ip,
            'device_port': self.device_port,
            'adb_device': self.adb_device,
            'connected': self.is_connected,
            'connection_timeout': self.connection_timeout,
            'device_resolution': self.device_resolution,
            'supported_keys': list(ADBUtils.ADB_KEYS.keys()) if self.adb_utils else [],
            'capabilities': [
                'adb_control', 'navigation', 'text_input', 
                'app_launch', 'app_close', 'coordinate_tap', 'media_control', 'volume_control', 'power_control'
            ]
        }


# Backward compatibility alias
RealAndroidTVController = AndroidTVRemoteController 
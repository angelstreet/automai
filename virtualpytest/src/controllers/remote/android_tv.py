"""
Real Android TV Remote Controller Implementation

This controller provides real Android TV remote control functionality using SSH+ADB.
Connects to a host via SSH, then uses ADB to control the Android TV device.
"""

from typing import Dict, Any, List, Optional
import subprocess
import time
import json
from ..base_controllers import RemoteControllerInterface

# Import SSH utilities and ADB utilities
try:
    from ..lib.sshUtils import create_ssh_connection
    from ..lib.adbUtils import ADBUtils
    SSH_AVAILABLE = True
except ImportError:
    print("Warning: SSH/ADB utilities not available. SSH functionality will be limited.")
    SSH_AVAILABLE = False


class AndroidTVRemoteController(RemoteControllerInterface):
    """Real Android TV remote controller using SSH+ADB commands."""
    
    @staticmethod
    def get_remote_config() -> Dict[str, Any]:
        """Get the remote configuration including layout, buttons, and image."""
        return {
            'remote_info': {
                'name': 'Fire TV Remote',
                'type': 'android_tv',
                'image_url': '/android-tv-remote.png',
                'default_scale': 0.5,
                'min_scale': 0.1,
                'max_scale': 0.8,
                # General scaling and offset parameters
                'button_scale_factor': 2,  # General scaling factor for all button sizes
                'global_offset': {
                    'x': 0,  # Global X offset for all buttons
                    'y': 10   # Global Y offset for all buttons
                }
            },
            'button_layout': {
                'power': {
                    'key': 'POWER',
                    'position': { 'x': 70, 'y': 28 },
                    'size': { 'width': 18, 'height': 18 },
                    'shape': 'circle',
                    'comment': 'Power button'
                },
                'voice': {
                    'key': 'VOICE_ASSIST',
                    'position': { 'x': 70, 'y': 58 },
                    'size': { 'width': 20, 'height': 20 },
                    'shape': 'circle',
                    'comment': 'Voice/microphone button'
                },
                'nav_up': {
                    'key': 'DPAD_UP',
                    'position': { 'x': 70, 'y': 108 },
                    'size': { 'width': 25, 'height': 15 },
                    'shape': 'rectangle',
                    'comment': 'Navigation up'
                },
                'nav_left': {
                    'key': 'DPAD_LEFT',
                    'position': { 'x': 45, 'y': 128 },
                    'size': { 'width': 15, 'height': 25 },
                    'shape': 'rectangle',
                    'comment': 'Navigation left'
                },
                'nav_center': {
                    'key': 'DPAD_CENTER',
                    'position': { 'x': 70, 'y': 133 },
                    'size': { 'width': 20, 'height': 20 },
                    'shape': 'circle',
                    'comment': 'Navigation center/select'
                },
                'nav_right': {
                    'key': 'DPAD_RIGHT',
                    'position': { 'x': 95, 'y': 128 },
                    'size': { 'width': 15, 'height': 25 },
                    'shape': 'rectangle',
                    'comment': 'Navigation right'
                },
                'nav_down': {
                    'key': 'DPAD_DOWN',
                    'position': { 'x': 70, 'y': 158 },
                    'size': { 'width': 25, 'height': 15 },
                    'shape': 'rectangle',
                    'comment': 'Navigation down'
                },
                'back': {
                    'key': 'BACK',
                    'position': { 'x': 35, 'y': 188 },
                    'size': { 'width': 18, 'height': 18 },
                    'shape': 'circle',
                    'comment': 'Back button'
                },
                'home': {
                    'key': 'HOME',
                    'position': { 'x': 70, 'y': 188 },
                    'size': { 'width': 18, 'height': 18 },
                    'shape': 'circle',
                    'comment': 'Home button'
                },
                'menu': {
                    'key': 'MENU',
                    'position': { 'x': 105, 'y': 188 },
                    'size': { 'width': 18, 'height': 18 },
                    'shape': 'circle',
                    'comment': 'Menu button'
                },
                'rewind': {
                    'key': 'MEDIA_REWIND',
                    'position': { 'x': 35, 'y': 228 },
                    'size': { 'width': 18, 'height': 18 },
                    'shape': 'circle',
                    'comment': 'Rewind button'
                },
                'play_pause': {
                    'key': 'MEDIA_PLAY_PAUSE',
                    'position': { 'x': 70, 'y': 228 },
                    'size': { 'width': 18, 'height': 18 },
                    'shape': 'circle',
                    'comment': 'Play/pause button'
                },
                'fast_forward': {
                    'key': 'MEDIA_FAST_FORWARD',
                    'position': { 'x': 105, 'y': 228 },
                    'size': { 'width': 18, 'height': 18 },
                    'shape': 'circle',
                    'comment': 'Fast forward button'
                },
                'volume_up': {
                    'key': 'VOLUME_UP',
                    'position': { 'x': 70, 'y': 268 },
                    'size': { 'width': 22, 'height': 22 },
                    'shape': 'circle',
                    'comment': 'Volume up button'
                },
                'volume_down': {
                    'key': 'VOLUME_DOWN',
                    'position': { 'x': 70, 'y': 300 },
                    'size': { 'width': 22, 'height': 22 },
                    'shape': 'circle',
                    'comment': 'Volume down button'
                },
                'mute': {
                    'key': 'VOLUME_MUTE',
                    'position': { 'x': 70, 'y': 334 },
                    'size': { 'width': 22, 'height': 22 },
                    'shape': 'circle',
                    'comment': 'Mute button'
                }
            }
        }
    
    def __init__(self, device_name: str = "Android TV", device_type: str = "android_tv", **kwargs):
        """
        Initialize the Android TV remote controller.
        
        Args:
            device_name: Name of the Android TV device
            device_type: Type identifier for the device
            **kwargs: Additional parameters including:
                # SSH Connection Parameters (required)
                - host_ip: IP address of the SSH host (required)
                - host_username: SSH username (required)
                - host_password: SSH password (optional if using key)
                - host_key: SSH private key path (optional if using password)
                - host_port: SSH port (default: 22)
                
                # ADB Device Parameters (required)
                - device_ip: IP address of the Android TV device (required)
                - device_port: ADB port on the device (default: 5555)
                
                # Connection Parameters
                - connection_timeout: Connection timeout in seconds (default: 10)
        """
        super().__init__(device_name, device_type)
        
        # SSH connection parameters
        self.host_ip = kwargs.get('host_ip')
        self.host_username = kwargs.get('host_username')
        self.host_password = kwargs.get('host_password')
        self.host_key = kwargs.get('host_key')
        self.host_port = kwargs.get('host_port', 22)
        
        # ADB device parameters
        self.device_ip = kwargs.get('device_ip')
        self.device_port = kwargs.get('device_port', 5555)
        
        # Connection settings
        self.connection_timeout = kwargs.get('connection_timeout', 10)
        
        # Validate required parameters
        if not self.host_ip:
            raise ValueError("host_ip is required for AndroidTVRemoteController")
        if not self.host_username:
            raise ValueError("host_username is required for AndroidTVRemoteController")
        if not self.host_password and not self.host_key:
            raise ValueError("Either host_password or host_key is required for AndroidTVRemoteController")
        if not self.device_ip:
            raise ValueError("device_ip is required for AndroidTVRemoteController")
            
        self.adb_device = f"{self.device_ip}:{self.device_port}"
        self.ssh_connection = None
        self.adb_utils = None
        self.device_resolution = None
        
    def connect(self) -> bool:
        """Connect to the Android TV device via SSH+ADB."""
        try:
            print(f"Remote[{self.device_type.upper()}]: Connecting to SSH host {self.host_ip} and Android device {self.adb_device}")
            
            if not SSH_AVAILABLE:
                print(f"Remote[{self.device_type.upper()}]: ERROR - SSH utilities not available")
                return False
            
            # Step 1: Establish SSH connection
            print(f"Remote[{self.device_type.upper()}]: Establishing SSH connection...")
            self.ssh_connection = create_ssh_connection(
                host=self.host_ip,
                port=self.host_port,
                username=self.host_username,
                password=self.host_password,
                private_key=self.host_key,
                timeout=self.connection_timeout
            )
            
            if not self.ssh_connection:
                print(f"Remote[{self.device_type.upper()}]: Failed to establish SSH connection to {self.host_ip}")
                return False
                
            print(f"Remote[{self.device_type.upper()}]: SSH connection established to {self.host_ip}")
            
            # Step 2: Initialize ADB utilities
            self.adb_utils = ADBUtils(self.ssh_connection)
            
            # Step 3: Connect to Android device via ADB
            if not self.adb_utils.connect_device(self.adb_device):
                print(f"Remote[{self.device_type.upper()}]: Failed to connect to Android device {self.adb_device}")
                self.disconnect()
                return False
                
            print(f"Remote[{self.device_type.upper()}]: Successfully connected to Android device {self.adb_device}")
            
            # Step 4: Get device resolution
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
            
            # Use ADB text input command
            escaped_text = text.replace(" ", "%s").replace("'", "\\'").replace('"', '\\"')
            success, stdout, stderr, exit_code = self.ssh_connection.execute_command(
                f"adb -s {self.adb_device} shell input text {escaped_text}"
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
        if not self.is_connected or not self.ssh_connection:
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
            # SSH connection info
            'host_ip': self.host_ip,
            'host_port': self.host_port,
            'host_username': self.host_username,
            'ssh_connected': self.ssh_connection is not None and self.ssh_connection.connected if self.ssh_connection else False,
            # ADB device info
            'device_ip': self.device_ip,
            'device_port': self.device_port,
            'adb_device': self.adb_device,
            'connected': self.is_connected,
            'connection_timeout': self.connection_timeout,
            'device_resolution': self.device_resolution,
            'supported_keys': list(ADBUtils.ADB_KEYS.keys()) if self.adb_utils else [],
            'capabilities': [
                'ssh_connection', 'adb_control', 'navigation', 'text_input', 
                'app_launch', 'coordinate_tap', 'media_control', 'volume_control', 'power_control'
            ]
        }


# Backward compatibility alias
RealAndroidTVController = AndroidTVRemoteController 
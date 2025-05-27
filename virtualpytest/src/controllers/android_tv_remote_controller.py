"""
Real Android TV Remote Controller Implementation

This controller provides real Android TV remote control functionality using SSH+ADB.
Connects to a host via SSH, then uses ADB to control the Android TV device.
"""

from typing import Dict, Any, List, Optional
import subprocess
import time
import json
from base_controllers import RemoteControllerInterface

# Import SSH utilities
try:
    from lib.sshUtils import SSHConnection
    SSH_AVAILABLE = True
except ImportError:
    print("Warning: SSH utilities not available. SSH functionality will be limited.")
    SSH_AVAILABLE = False


class AndroidTVRemoteController(RemoteControllerInterface):
    """Real Android TV remote controller using SSH+ADB commands."""
    
    # ADB key mappings based on the TypeScript implementation
    ADB_KEYS = {
        "UP": "KEYCODE_DPAD_UP",
        "DOWN": "KEYCODE_DPAD_DOWN", 
        "LEFT": "KEYCODE_DPAD_LEFT",
        "RIGHT": "KEYCODE_DPAD_RIGHT",
        "OK": "KEYCODE_DPAD_CENTER",
        "SELECT": "KEYCODE_DPAD_CENTER",
        "BACK": "KEYCODE_BACK",
        "HOME": "KEYCODE_HOME",
        "MENU": "KEYCODE_MENU",
        "VOLUME_UP": "KEYCODE_VOLUME_UP",
        "VOLUME_DOWN": "KEYCODE_VOLUME_DOWN",
        "VOLUME_MUTE": "KEYCODE_VOLUME_MUTE",
        "POWER": "KEYCODE_POWER",
        # Media control keys
        "PLAY_PAUSE": "KEYCODE_MEDIA_PLAY_PAUSE",
        "PLAY": "KEYCODE_MEDIA_PLAY",
        "PAUSE": "KEYCODE_MEDIA_PAUSE",
        "STOP": "KEYCODE_MEDIA_STOP",
        "REWIND": "KEYCODE_MEDIA_REWIND",
        "FAST_FORWARD": "KEYCODE_MEDIA_FAST_FORWARD",
        "NEXT": "KEYCODE_MEDIA_NEXT",
        "PREVIOUS": "KEYCODE_MEDIA_PREVIOUS",
        # Additional Android TV keys
        "ENTER": "KEYCODE_ENTER",
        "ESCAPE": "KEYCODE_ESCAPE",
        "TAB": "KEYCODE_TAB",
        "SPACE": "KEYCODE_SPACE",
        "DEL": "KEYCODE_DEL",
    }
    
    @staticmethod
    def get_remote_config() -> Dict[str, Any]:
        """Get the remote configuration including layout, buttons, and image."""
        return {
            'remote_info': {
                'name': 'Fire TV Remote',
                'type': 'android_tv',
                'image_url': '/android-tv-remote.png',
                'default_scale': 1.2,
                'min_scale': 0.5,
                'max_scale': 2.0,
                # General scaling and offset parameters
                'button_scale_factor': 1.0,  # General scaling factor for all button sizes
                'global_offset': {
                    'x': 0,  # Global X offset for all buttons
                    'y': 0   # Global Y offset for all buttons
                }
            },
            'button_layout': {
                'power': {
                    'key': 'POWER',
                    'position': { 'top': 28, 'left': '50%', 'transform': 'translateX(-50%)' },
                    'size': { 'width': 18, 'height': 18 },
                    'shape': 'circle',
                    'comment': 'Power button',
                    'local_offset': { 'x': 0, 'y': 0 }  # Individual button offset
                },
                'voice': {
                    'key': 'VOICE_ASSIST',
                    'position': { 'top': 58, 'left': '50%', 'transform': 'translateX(-50%)' },
                    'size': { 'width': 20, 'height': 20 },
                    'shape': 'circle',
                    'comment': 'Voice/microphone button',
                    'local_offset': { 'x': 0, 'y': 0 }
                },
                'nav_up': {
                    'key': 'DPAD_UP',
                    'position': { 'top': 108, 'left': '50%', 'transform': 'translateX(-50%)' },
                    'size': { 'width': 25, 'height': 15 },
                    'shape': 'rectangle',
                    'comment': 'Navigation up',
                    'local_offset': { 'x': 0, 'y': 0 }
                },
                'nav_left': {
                    'key': 'DPAD_LEFT',
                    'position': { 'top': 128, 'left': 45 },
                    'size': { 'width': 15, 'height': 25 },
                    'shape': 'rectangle',
                    'comment': 'Navigation left',
                    'local_offset': { 'x': 0, 'y': 0 }
                },
                'nav_center': {
                    'key': 'DPAD_CENTER',
                    'position': { 'top': 133, 'left': '50%', 'transform': 'translateX(-50%)' },
                    'size': { 'width': 20, 'height': 20 },
                    'shape': 'circle',
                    'comment': 'Navigation center/select',
                    'local_offset': { 'x': 0, 'y': 0 }
                },
                'nav_right': {
                    'key': 'DPAD_RIGHT',
                    'position': { 'top': 128, 'right': 45 },
                    'size': { 'width': 15, 'height': 25 },
                    'shape': 'rectangle',
                    'comment': 'Navigation right',
                    'local_offset': { 'x': 0, 'y': 0 }
                },
                'nav_down': {
                    'key': 'DPAD_DOWN',
                    'position': { 'top': 158, 'left': '50%', 'transform': 'translateX(-50%)' },
                    'size': { 'width': 25, 'height': 15 },
                    'shape': 'rectangle',
                    'comment': 'Navigation down',
                    'local_offset': { 'x': 0, 'y': 0 }
                },
                'back': {
                    'key': 'BACK',
                    'position': { 'top': 188, 'left': 35 },
                    'size': { 'width': 18, 'height': 18 },
                    'shape': 'circle',
                    'comment': 'Back button',
                    'local_offset': { 'x': 0, 'y': 0 }
                },
                'home': {
                    'key': 'HOME',
                    'position': { 'top': 188, 'left': '50%', 'transform': 'translateX(-50%)' },
                    'size': { 'width': 18, 'height': 18 },
                    'shape': 'circle',
                    'comment': 'Home button',
                    'local_offset': { 'x': 0, 'y': 0 }
                },
                'menu': {
                    'key': 'MENU',
                    'position': { 'top': 188, 'right': 35 },
                    'size': { 'width': 18, 'height': 18 },
                    'shape': 'circle',
                    'comment': 'Menu button',
                    'local_offset': { 'x': 0, 'y': 0 }
                },
                'rewind': {
                    'key': 'MEDIA_REWIND',
                    'position': { 'top': 228, 'left': 35 },
                    'size': { 'width': 18, 'height': 18 },
                    'shape': 'circle',
                    'comment': 'Rewind button',
                    'local_offset': { 'x': 0, 'y': 0 }
                },
                'play_pause': {
                    'key': 'MEDIA_PLAY_PAUSE',
                    'position': { 'top': 228, 'left': '50%', 'transform': 'translateX(-50%)' },
                    'size': { 'width': 18, 'height': 18 },
                    'shape': 'circle',
                    'comment': 'Play/pause button',
                    'local_offset': { 'x': 0, 'y': 0 }
                },
                'fast_forward': {
                    'key': 'MEDIA_FAST_FORWARD',
                    'position': { 'top': 228, 'right': 35 },
                    'size': { 'width': 18, 'height': 18 },
                    'shape': 'circle',
                    'comment': 'Fast forward button',
                    'local_offset': { 'x': 0, 'y': 0 }
                },
                'volume_up': {
                    'key': 'VOLUME_UP',
                    'position': { 'top': 268, 'left': '50%', 'transform': 'translateX(-50%)' },
                    'size': { 'width': 22, 'height': 22 },
                    'shape': 'circle',
                    'comment': 'Volume up button',
                    'local_offset': { 'x': 0, 'y': 0 }
                },
                'volume_down': {
                    'key': 'VOLUME_DOWN',
                    'position': { 'top': 300, 'left': '50%', 'transform': 'translateX(-50%)' },
                    'size': { 'width': 22, 'height': 22 },
                    'shape': 'circle',
                    'comment': 'Volume down button',
                    'local_offset': { 'x': 0, 'y': 0 }
                },
                'mute': {
                    'key': 'VOLUME_MUTE',
                    'position': { 'top': 334, 'left': '50%', 'transform': 'translateX(-50%)' },
                    'size': { 'width': 22, 'height': 22 },
                    'shape': 'circle',
                    'comment': 'Mute button',
                    'local_offset': { 'x': 0, 'y': 0 }
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
        self.device_resolution = None
        
    def connect(self) -> bool:
        """Connect to the Android TV device via SSH+ADB."""
        try:
            print(f"Remote[{self.device_type.upper()}]: Connecting to {self.device_name}")
            print(f"Remote[{self.device_type.upper()}]: SSH Host: {self.host_ip}:{self.host_port}")
            print(f"Remote[{self.device_type.upper()}]: ADB Device: {self.adb_device}")
            
            if not SSH_AVAILABLE:
                print(f"Remote[{self.device_type.upper()}]: ERROR - SSH utilities not available")
                return False
            
            # Step 1: Establish SSH connection
            print(f"Remote[{self.device_type.upper()}]: Establishing SSH connection...")
            self.ssh_connection = SSHConnection(
                host=self.host_ip,
                port=self.host_port,
                username=self.host_username,
                password=self.host_password,
                private_key=self.host_key
            )
            
            if not self.ssh_connection.connect():
                print(f"Remote[{self.device_type.upper()}]: Failed to establish SSH connection")
                return False
                
            print(f"Remote[{self.device_type.upper()}]: SSH connection established")
            
            # Step 2: Connect to Android device via ADB over SSH
            print(f"Remote[{self.device_type.upper()}]: Connecting to Android device via ADB...")
            connect_command = f"adb connect {self.adb_device}"
            
            success, output, error, exit_code = self.ssh_connection.execute_command(
                connect_command, 
                timeout=self.connection_timeout
            )
            
            if not success:
                print(f"Remote[{self.device_type.upper()}]: ADB connect failed: {error}")
                self.ssh_connection.disconnect()
                return False
                
            print(f"Remote[{self.device_type.upper()}]: ADB connect output: {output.strip()}")
            
            # Step 3: Verify the device is connected
            success, devices_output, error, exit_code = self.ssh_connection.execute_command(
                "adb devices", 
                timeout=5
            )
            
            if not success:
                print(f"Remote[{self.device_type.upper()}]: Failed to verify device connection: {error}")
                self.ssh_connection.disconnect()
                return False
                
            print(f"Remote[{self.device_type.upper()}]: ADB devices output: {devices_output}")
            
            # Check if our device appears in the devices list
            device_lines = [line.strip() for line in devices_output.split('\n') 
                          if line.strip() and not line.startswith('List of devices')]
            
            device_found = None
            for line in device_lines:
                if self.adb_device in line:
                    device_found = line
                    break
                    
            if not device_found:
                print(f"Remote[{self.device_type.upper()}]: Device {self.adb_device} not found in adb devices list")
                self.ssh_connection.disconnect()
                return False
                
            if 'offline' in device_found:
                print(f"Remote[{self.device_type.upper()}]: Device {self.adb_device} is offline. Please check device connection and enable USB debugging.")
                self.ssh_connection.disconnect()
                return False
                
            if 'device' not in device_found:
                status = device_found.split('\t')[1] if '\t' in device_found else 'unknown'
                print(f"Remote[{self.device_type.upper()}]: Device {self.adb_device} status: {status}")
                self.ssh_connection.disconnect()
                return False
                
            self.is_connected = True
            print(f"Remote[{self.device_type.upper()}]: Successfully connected to {self.device_name}")
            
            # Get device resolution for future use
            self._get_device_resolution()
            
            return True
            
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Connection error: {e}")
            if self.ssh_connection:
                self.ssh_connection.disconnect()
            return False
            
    def disconnect(self) -> bool:
        """Disconnect from the Android TV device."""
        try:
            if self.is_connected and self.ssh_connection:
                print(f"Remote[{self.device_type.upper()}]: Disconnecting from {self.device_name}")
                
                # Disconnect ADB device
                success, output, error, exit_code = self.ssh_connection.execute_command(
                    f"adb disconnect {self.adb_device}",
                    timeout=5
                )
                
                if success:
                    print(f"Remote[{self.device_type.upper()}]: ADB disconnected successfully")
                else:
                    print(f"Remote[{self.device_type.upper()}]: ADB disconnect warning: {error}")
                
                # Disconnect SSH
                self.ssh_connection.disconnect()
                print(f"Remote[{self.device_type.upper()}]: SSH disconnected")
                    
            self.is_connected = False
            self.ssh_connection = None
            return True
            
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Disconnect error: {e}")
            self.is_connected = False
            self.ssh_connection = None
            return False
            
    def press_key(self, key: str) -> bool:
        """
        Send a key press to the Android TV.
        
        Args:
            key: Key name (e.g., "UP", "DOWN", "OK", "HOME")
        """
        if not self.is_connected or not self.ssh_connection:
            print(f"Remote[{self.device_type.upper()}]: ERROR - Not connected to device")
            return False
            
        # Map the key to ADB keycode
        adb_keycode = self.ADB_KEYS.get(key.upper())
        if not adb_keycode:
            print(f"Remote[{self.device_type.upper()}]: ERROR - Invalid key: {key}")
            return False
            
        try:
            key_command = f"adb -s {self.adb_device} shell input keyevent {adb_keycode}"
            print(f"Remote[{self.device_type.upper()}]: Pressing key '{key}' (keycode: {adb_keycode})")
            
            success, output, error, exit_code = self.ssh_connection.execute_command(
                key_command,
                timeout=5
            )
            
            if success:
                print(f"Remote[{self.device_type.upper()}]: Successfully pressed key '{key}'")
                return True
            else:
                print(f"Remote[{self.device_type.upper()}]: Key press failed: {error}")
                return False
                
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Key press error: {e}")
            return False
            
    def input_text(self, text: str) -> bool:
        """
        Send text input to the Android TV.
        
        Args:
            text: Text to input
        """
        if not self.is_connected or not self.ssh_connection:
            print(f"Remote[{self.device_type.upper()}]: ERROR - Not connected to device")
            return False
            
        try:
            # Escape special characters for shell
            escaped_text = text.replace(" ", "%s").replace("'", "\\'").replace('"', '\\"')
            
            text_command = f"adb -s {self.adb_device} shell input text {escaped_text}"
            print(f"Remote[{self.device_type.upper()}]: Sending text: '{text}'")
            
            success, output, error, exit_code = self.ssh_connection.execute_command(
                text_command,
                timeout=10
            )
            
            if success:
                print(f"Remote[{self.device_type.upper()}]: Successfully sent text: '{text}'")
                return True
            else:
                print(f"Remote[{self.device_type.upper()}]: Text input failed: {error}")
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
            
    def _get_device_resolution(self) -> Optional[Dict[str, int]]:
        """Get the device screen resolution."""
        try:
            resolution_command = ["adb", "-s", self.adb_device, "shell", "wm", "size"]
            
            result = subprocess.run(
                resolution_command,
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if result.returncode == 0:
                # Parse output like "Physical size: 1920x1080"
                output = result.stdout.strip()
                if 'x' in output:
                    size_part = output.split(':')[-1].strip()
                    width, height = map(int, size_part.split('x'))
                    self.device_resolution = {'width': width, 'height': height}
                    print(f"Remote[{self.device_type.upper()}]: Device resolution: {width}x{height}")
                    return self.device_resolution
                    
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Could not get device resolution: {e}")
            
        return None
        
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
            'supported_keys': list(self.ADB_KEYS.keys()),
            'capabilities': [
                'ssh_connection', 'adb_control', 'navigation', 'text_input', 
                'app_launch', 'coordinate_tap', 'media_control', 'volume_control', 'power_control'
            ]
        }


# Backward compatibility alias
RealAndroidTVController = AndroidTVRemoteController 
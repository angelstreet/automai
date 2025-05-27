"""
Bluetooth Remote Controller Implementation

This controller provides Bluetooth remote control functionality for modern devices.
Supports Bluetooth HID (Human Interface Device) protocol for sending key commands.
"""

from typing import Dict, Any, List
import time
from base_controllers import RemoteControllerInterface


class BluetoothRemoteController(RemoteControllerInterface):
    """Bluetooth remote controller using HID protocol."""
    
    # Bluetooth HID keycodes (USB HID standard)
    BT_KEYCODES = {
        # Navigation
        'UP': 0x52,
        'DOWN': 0x51,
        'LEFT': 0x50,
        'RIGHT': 0x4F,
        'OK': 0x28,      # Enter key
        'SELECT': 0x28,  # Same as OK
        
        # System controls
        'POWER': 0x66,   # Power key
        'HOME': 0x4A,    # Home key
        'MENU': 0x76,    # Menu key
        'BACK': 0x29,    # Escape key
        'EXIT': 0x29,    # Same as BACK
        
        # Numbers
        '0': 0x27,
        '1': 0x1E,
        '2': 0x1F,
        '3': 0x20,
        '4': 0x21,
        '5': 0x22,
        '6': 0x23,
        '7': 0x24,
        '8': 0x25,
        '9': 0x26,
        
        # Media controls
        'PLAY': 0xB0,
        'PAUSE': 0xB1,
        'STOP': 0xB7,
        'PLAY_PAUSE': 0xCD,
        'NEXT': 0xB5,
        'PREVIOUS': 0xB6,
        'FAST_FORWARD': 0xB3,
        'REWIND': 0xB4,
        
        # Volume controls
        'VOLUME_UP': 0xE9,
        'VOLUME_DOWN': 0xEA,
        'MUTE': 0xE2,
        
        # Letters (for text input)
        'A': 0x04, 'B': 0x05, 'C': 0x06, 'D': 0x07, 'E': 0x08,
        'F': 0x09, 'G': 0x0A, 'H': 0x0B, 'I': 0x0C, 'J': 0x0D,
        'K': 0x0E, 'L': 0x0F, 'M': 0x10, 'N': 0x11, 'O': 0x12,
        'P': 0x13, 'Q': 0x14, 'R': 0x15, 'S': 0x16, 'T': 0x17,
        'U': 0x18, 'V': 0x19, 'W': 0x1A, 'X': 0x1B, 'Y': 0x1C,
        'Z': 0x1D,
        
        # Special keys
        'SPACE': 0x2C,
        'TAB': 0x2B,
        'DELETE': 0x2A,
        'BACKSPACE': 0x2A,
    }

    @staticmethod
    def get_remote_config() -> Dict[str, Any]:
        """Get the Bluetooth remote configuration including layout, buttons, and image."""
        return {
            'remote_info': {
                'name': 'Sunrise Remote',
                'type': 'bluetooth_remote',
                'image_url': '/suncherry_remote.png',
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
                    'position': { 'x': 70, 'y': 28 },
                    'size': { 'width': 18, 'height': 18 },
                    'shape': 'circle',
                    'comment': 'Power button'
                },
                'source': {
                    'key': 'SOURCE',
                    'position': { 'x': 35, 'y': 58 },
                    'size': { 'width': 18, 'height': 18 },
                    'shape': 'circle',
                    'comment': 'Source/Input button'
                },
                'mute': {
                    'key': 'MUTE',
                    'position': { 'x': 105, 'y': 58 },
                    'size': { 'width': 18, 'height': 18 },
                    'shape': 'circle',
                    'comment': 'Mute button'
                },
                'num_1': {
                    'key': '1',
                    'position': { 'x': 35, 'y': 88 },
                    'size': { 'width': 18, 'height': 18 },
                    'shape': 'circle',
                    'comment': 'Number 1'
                },
                'num_2': {
                    'key': '2',
                    'position': { 'x': 70, 'y': 88 },
                    'size': { 'width': 18, 'height': 18 },
                    'shape': 'circle',
                    'comment': 'Number 2'
                },
                'num_3': {
                    'key': '3',
                    'position': { 'x': 105, 'y': 88 },
                    'size': { 'width': 18, 'height': 18 },
                    'shape': 'circle',
                    'comment': 'Number 3'
                },
                'num_4': {
                    'key': '4',
                    'position': { 'x': 35, 'y': 118 },
                    'size': { 'width': 18, 'height': 18 },
                    'shape': 'circle',
                    'comment': 'Number 4'
                },
                'num_5': {
                    'key': '5',
                    'position': { 'x': 70, 'y': 118 },
                    'size': { 'width': 18, 'height': 18 },
                    'shape': 'circle',
                    'comment': 'Number 5'
                },
                'num_6': {
                    'key': '6',
                    'position': { 'x': 105, 'y': 118 },
                    'size': { 'width': 18, 'height': 18 },
                    'shape': 'circle',
                    'comment': 'Number 6'
                },
                'num_7': {
                    'key': '7',
                    'position': { 'x': 35, 'y': 148 },
                    'size': { 'width': 18, 'height': 18 },
                    'shape': 'circle',
                    'comment': 'Number 7'
                },
                'num_8': {
                    'key': '8',
                    'position': { 'x': 70, 'y': 148 },
                    'size': { 'width': 18, 'height': 18 },
                    'shape': 'circle',
                    'comment': 'Number 8'
                },
                'num_9': {
                    'key': '9',
                    'position': { 'x': 105, 'y': 148 },
                    'size': { 'width': 18, 'height': 18 },
                    'shape': 'circle',
                    'comment': 'Number 9'
                },
                'num_0': {
                    'key': '0',
                    'position': { 'x': 70, 'y': 178 },
                    'size': { 'width': 18, 'height': 18 },
                    'shape': 'circle',
                    'comment': 'Number 0'
                },
                'volume_up': {
                    'key': 'VOLUME_UP',
                    'position': { 'x': 35, 'y': 208 },
                    'size': { 'width': 18, 'height': 18 },
                    'shape': 'circle',
                    'comment': 'Volume up'
                },
                'channel_up': {
                    'key': 'CHANNEL_UP',
                    'position': { 'x': 105, 'y': 208 },
                    'size': { 'width': 18, 'height': 18 },
                    'shape': 'circle',
                    'comment': 'Channel up'
                },
                'volume_down': {
                    'key': 'VOLUME_DOWN',
                    'position': { 'x': 35, 'y': 238 },
                    'size': { 'width': 18, 'height': 18 },
                    'shape': 'circle',
                    'comment': 'Volume down'
                },
                'channel_down': {
                    'key': 'CHANNEL_DOWN',
                    'position': { 'x': 105, 'y': 238 },
                    'size': { 'width': 18, 'height': 18 },
                    'shape': 'circle',
                    'comment': 'Channel down'
                },
                'nav_up': {
                    'key': 'UP',
                    'position': { 'x': 70, 'y': 268 },
                    'size': { 'width': 25, 'height': 15 },
                    'shape': 'rectangle',
                    'comment': 'Navigation up'
                },
                'nav_left': {
                    'key': 'LEFT',
                    'position': { 'x': 45, 'y': 288 },
                    'size': { 'width': 15, 'height': 25 },
                    'shape': 'rectangle',
                    'comment': 'Navigation left'
                },
                'nav_center': {
                    'key': 'OK',
                    'position': { 'x': 70, 'y': 293 },
                    'size': { 'width': 20, 'height': 20 },
                    'shape': 'circle',
                    'comment': 'OK/Select'
                },
                'nav_right': {
                    'key': 'RIGHT',
                    'position': { 'x': 95, 'y': 288 },
                    'size': { 'width': 15, 'height': 25 },
                    'shape': 'rectangle',
                    'comment': 'Navigation right'
                },
                'nav_down': {
                    'key': 'DOWN',
                    'position': { 'x': 70, 'y': 318 },
                    'size': { 'width': 25, 'height': 15 },
                    'shape': 'rectangle',
                    'comment': 'Navigation down'
                },
                'menu': {
                    'key': 'MENU',
                    'position': { 'x': 35, 'y': 348 },
                    'size': { 'width': 18, 'height': 18 },
                    'shape': 'circle',
                    'comment': 'Menu button'
                },
                'back': {
                    'key': 'BACK',
                    'position': { 'x': 105, 'y': 348 },
                    'size': { 'width': 18, 'height': 18 },
                    'shape': 'circle',
                    'comment': 'Back/Exit button'
                }
            }
        }
    
    def __init__(self, device_name: str = "Bluetooth Remote", device_type: str = "bluetooth_remote", **kwargs):
        """
        Initialize the Bluetooth remote controller.
        
        Args:
            device_name: Name of the Bluetooth remote device
            device_type: Type identifier for the device
            **kwargs: Additional parameters including:
                - device_address: Bluetooth MAC address of target device
                - pairing_pin: PIN for pairing (if required)
                - hid_profile: HID profile to use (default: 'keyboard')
                - connection_timeout: Connection timeout in seconds (default: 10)
        """
        super().__init__(device_name, device_type)
        
        self.device_address = kwargs.get('device_address', '00:00:00:00:00:00')
        self.pairing_pin = kwargs.get('pairing_pin', '0000')
        self.hid_profile = kwargs.get('hid_profile', 'keyboard')
        self.connection_timeout = kwargs.get('connection_timeout', 10)
        
        # Bluetooth connection state
        self.bt_socket = None
        self.is_paired = False
        self.last_command_time = 0
        
    def connect(self) -> bool:
        """Connect to Bluetooth device."""
        try:
            print(f"Remote[{self.device_type.upper()}]: Connecting to Bluetooth device {self.device_address}")
            
            # In a real implementation, this would:
            # 1. Initialize Bluetooth adapter
            # 2. Scan for the target device
            # 3. Pair with the device (if not already paired)
            # 4. Connect using HID profile
            
            print(f"Remote[{self.device_type.upper()}]: Initializing Bluetooth adapter")
            print(f"Remote[{self.device_type.upper()}]: Scanning for device {self.device_address}")
            
            # Simulate pairing process
            if not self.is_paired:
                print(f"Remote[{self.device_type.upper()}]: Pairing with device using PIN {self.pairing_pin}")
                time.sleep(2)  # Simulate pairing time
                self.is_paired = True
                print(f"Remote[{self.device_type.upper()}]: Pairing successful")
            
            # Simulate HID connection
            print(f"Remote[{self.device_type.upper()}]: Connecting using HID profile: {self.hid_profile}")
            self.bt_socket = {
                'address': self.device_address,
                'profile': self.hid_profile,
                'connected': True
            }
            
            self.is_connected = True
            print(f"Remote[{self.device_type.upper()}]: Connected to {self.device_name}")
            return True
            
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Connection failed: {e}")
            return False
            
    def disconnect(self) -> bool:
        """Disconnect from Bluetooth device."""
        try:
            if self.bt_socket:
                print(f"Remote[{self.device_type.upper()}]: Closing Bluetooth connection")
                self.bt_socket = None
                
            self.is_connected = False
            print(f"Remote[{self.device_type.upper()}]: Disconnected from {self.device_name}")
            return True
            
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Disconnect error: {e}")
            return False
            
    def press_key(self, key: str) -> bool:
        """
        Send Bluetooth HID key press command.
        
        Args:
            key: Key name (e.g., "POWER", "VOLUME_UP", "A", "1")
        """
        if not self.is_connected:
            print(f"Remote[{self.device_type.upper()}]: ERROR - Not connected to Bluetooth device")
            return False
            
        try:
            keycode = self.BT_KEYCODES.get(key.upper())
            if not keycode:
                print(f"Remote[{self.device_type.upper()}]: Unknown key: {key}")
                return False
                
            print(f"Remote[{self.device_type.upper()}]: Sending Bluetooth HID command {key} (0x{keycode:02X})")
            
            # In a real implementation, this would send HID report
            self._send_hid_report(keycode)
            
            self.last_command_time = time.time()
            print(f"Remote[{self.device_type.upper()}]: Successfully sent {key}")
            return True
            
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Key press error: {e}")
            return False
            
    def input_text(self, text: str) -> bool:
        """
        Send text input via Bluetooth HID.
        
        Args:
            text: Text to input
        """
        if not self.is_connected:
            print(f"Remote[{self.device_type.upper()}]: ERROR - Not connected to Bluetooth device")
            return False
            
        try:
            print(f"Remote[{self.device_type.upper()}]: Sending text: '{text}'")
            
            for char in text:
                if char == ' ':
                    success = self.press_key('SPACE')
                elif char.isalnum():
                    success = self.press_key(char.upper())
                else:
                    print(f"Remote[{self.device_type.upper()}]: Skipping unsupported character: {char}")
                    continue
                    
                if not success:
                    print(f"Remote[{self.device_type.upper()}]: Failed to send character: {char}")
                    return False
                    
                time.sleep(0.1)  # Small delay between characters
            
            print(f"Remote[{self.device_type.upper()}]: Text input completed")
            return True
            
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Text input error: {e}")
            return False
            
    def execute_sequence(self, commands: List[Dict[str, Any]]) -> bool:
        """
        Execute a sequence of Bluetooth commands.
        
        Args:
            commands: List of command dictionaries with 'action', 'params', and optional 'delay'
        """
        if not self.is_connected:
            print(f"Remote[{self.device_type.upper()}]: ERROR - Not connected to Bluetooth device")
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
            elif action == 'pair_device':
                success = self.pair_device(params.get('pin', self.pairing_pin))
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
        
    def pair_device(self, pin: str = None) -> bool:
        """
        Pair with Bluetooth device.
        
        Args:
            pin: Pairing PIN (optional, uses default if not provided)
        """
        try:
            pin = pin or self.pairing_pin
            print(f"Remote[{self.device_type.upper()}]: Pairing with device using PIN: {pin}")
            
            # In a real implementation, this would handle the pairing process
            time.sleep(2)  # Simulate pairing time
            
            self.is_paired = True
            print(f"Remote[{self.device_type.upper()}]: Pairing successful")
            return True
            
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Pairing error: {e}")
            return False
            
    def _send_hid_report(self, keycode: int) -> bool:
        """
        Send HID report with keycode.
        
        Args:
            keycode: HID keycode to send
            
        Returns:
            bool: True if report sent successfully
        """
        try:
            # In a real implementation, this would:
            # 1. Create HID report packet
            # 2. Send key press report
            # 3. Send key release report
            
            print(f"Remote[{self.device_type.upper()}]: Sending HID report: keycode=0x{keycode:02X}")
            
            # Simulate HID report transmission
            time.sleep(0.02)  # 20ms for key press
            time.sleep(0.02)  # 20ms for key release
            
            return True
            
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: HID report error: {e}")
            return False
            
    def get_status(self) -> Dict[str, Any]:
        """Get controller status information."""
        return {
            'controller_type': self.controller_type,
            'device_type': self.device_type,
            'device_name': self.device_name,
            'device_address': self.device_address,
            'hid_profile': self.hid_profile,
            'connection_timeout': self.connection_timeout,
            'connected': self.is_connected,
            'paired': self.is_paired,
            'last_command_time': self.last_command_time,
            'supported_keys': list(self.BT_KEYCODES.keys()),
            'capabilities': [
                'navigation', 'text_input', 'media_control', 
                'volume_control', 'alphanumeric_input',
                'wireless_connection', 'device_pairing'
            ]
        }


# Backward compatibility alias
BluetoothController = BluetoothRemoteController 
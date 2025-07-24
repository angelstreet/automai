"""
Bluetooth Remote Controller Implementation

This controller provides Bluetooth remote control functionality for modern devices.
Supports Bluetooth HID (Human Interface Device) protocol for sending key commands.
"""

from typing import Dict, Any, List, Optional
import subprocess
import time
import json
import os
from pathlib import Path
from ..base_controller import RemoteControllerInterface


class BluetoothRemoteController(RemoteControllerInterface):
    """Bluetooth remote controller using HID protocol."""
    
    # Bluetooth HID keycodes (Tapo HID standard)
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
        # Load configuration from JSON file
        config_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 
            'config', 'remote', 'bluetooth_remote.json'
        )
        
        if not os.path.exists(config_path):
            raise FileNotFoundError(f"Bluetooth remote config file not found at: {config_path}")
            
        try:
            print(f"Loading Bluetooth remote config from: {config_path}")
            with open(config_path, 'r') as config_file:
                return json.load(config_file)
        except Exception as e:
            raise RuntimeError(f"Error loading Bluetooth remote config from file: {e}")
    
    def __init__(self, device_mac: str, device_ip: str, **kwargs):
        """
        Initialize the Bluetooth remote controller.
        
        Args:
            device_mac: MAC address of the Bluetooth device (required)
            device_ip: IP address for network communication (required)
        """
        super().__init__("Bluetooth Remote", "bluetooth")
        
        # Bluetooth device parameters
        self.device_mac = device_mac
        self.device_ip = device_ip
        
        # Validate required parameters
        if not self.device_mac:
            raise ValueError("device_mac is required for BluetoothRemoteController")
        if not self.device_ip:
            raise ValueError("device_ip is required for BluetoothRemoteController")
            
        # Bluetooth connection state
        self.bluetooth_socket = None
        self.paired_devices = []
        
        print(f"[@controller:BluetoothRemote] Initialized for MAC: {self.device_mac}, IP: {self.device_ip}")
        
    def connect(self) -> bool:
        """Connect to Bluetooth device."""
        try:
            print(f"Remote[{self.device_type.upper()}]: Connecting to Bluetooth device {self.device_mac}")
            
            # In a real implementation, this would:
            # 1. Initialize Bluetooth adapter
            # 2. Scan for the target device
            # 3. Pair with the device (if not already paired)
            # 4. Connect using HID profile
            
            print(f"Remote[{self.device_type.upper()}]: Initializing Bluetooth adapter")
            print(f"Remote[{self.device_type.upper()}]: Scanning for device {self.device_mac}")
            
            # Simulate pairing process
            print(f"Remote[{self.device_type.upper()}]: Pairing with device")
            time.sleep(2)  # Simulate pairing time
            print(f"Remote[{self.device_type.upper()}]: Pairing successful")
            
            # Simulate HID connection
            print(f"Remote[{self.device_type.upper()}]: Connecting using HID profile")
            self.bt_socket = {
                'address': self.device_mac,
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
            'device_address': self.device_mac,
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
    
    def get_available_actions(self) -> Dict[str, Any]:
        """Get available actions for this Bluetooth controller."""
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
            'power': [
                {
                    'id': 'press_key_power',
                    'label': 'Power',
                    'command': 'press_key',
                    'params': {'key': 'POWER'},
                    'description': 'Power on/off device',
                    'requiresInput': False
                }
            ],
            'volume_control': [
                {
                    'id': 'press_key_volume_up',
                    'label': 'Volume Up',
                    'command': 'press_key',
                    'params': {'key': 'VOLUME_UP'},
                    'description': 'Increase volume',
                    'requiresInput': False
                },
                {
                    'id': 'press_key_volume_down',
                    'label': 'Volume Down',
                    'command': 'press_key',
                    'params': {'key': 'VOLUME_DOWN'},
                    'description': 'Decrease volume',
                    'requiresInput': False
                },
                {
                    'id': 'press_key_mute',
                    'label': 'Mute',
                    'command': 'press_key',
                    'params': {'key': 'MUTE'},
                    'description': 'Toggle mute',
                    'requiresInput': False
                }
            ],
            'media_control': [
                {
                    'id': 'press_key_play_pause',
                    'label': 'Play/Pause',
                    'command': 'press_key',
                    'params': {'key': 'PLAY_PAUSE'},
                    'description': 'Toggle play/pause for media',
                    'requiresInput': False
                },
                {
                    'id': 'press_key_fast_forward',
                    'label': 'Fast Forward',
                    'command': 'press_key',
                    'params': {'key': 'FAST_FORWARD'},
                    'description': 'Fast forward media',
                    'requiresInput': False
                },
                {
                    'id': 'press_key_rewind',
                    'label': 'Rewind',
                    'command': 'press_key',
                    'params': {'key': 'REWIND'},
                    'description': 'Rewind media',
                    'requiresInput': False
                }
            ],
            'input': [
                {
                    'id': 'input_text',
                    'label': 'Input Text',
                    'command': 'input_text',
                    'params': {},
                    'description': 'Type text using Bluetooth HID',
                    'requiresInput': True,
                    'inputLabel': 'Text to input',
                    'inputPlaceholder': 'Enter text...'
                }
            ],
            'bluetooth_specific': [
                {
                    'id': 'pair_device',
                    'label': 'Pair Device',
                    'command': 'pair_device',
                    'params': {},
                    'description': 'Pair with Bluetooth device',
                    'requiresInput': True,
                    'inputLabel': 'PIN (optional)',
                    'inputPlaceholder': '0000'
                },
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
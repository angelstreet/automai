"""
IR Remote Controller Implementation

This controller provides IR (Infrared) remote control functionality for TVs, STBs, and other devices.
Supports classic remote control buttons with standard IR keycodes.
"""

from typing import Dict, Any, List, Optional
import subprocess
import time
import json
import os
from pathlib import Path
from ..base_controller import RemoteControllerInterface


class IRRemoteController(RemoteControllerInterface):
    """IR remote controller with classic TV/STB buttons and keycodes."""
    
    # Classic IR remote keycodes
    IR_KEYCODES = {
        # Navigation
        'UP': 0x40BF,
        'DOWN': 0xC03F,
        'LEFT': 0x20DF,
        'RIGHT': 0xA05F,
        'OK': 0x609F,
        'SELECT': 0x609F,  # Same as OK
        
        # System controls
        'POWER': 0x10EF,
        'HOME': 0x02FD,
        'MENU': 0x22DD,
        'BACK': 0x807F,
        'EXIT': 0x807F,  # Same as BACK
        'INFO': 0x50AF,
        'GUIDE': 0x708F,
        'SETTINGS': 0x8877,
        
        # Numbers
        '0': 0x08F7,
        '1': 0x8877,
        '2': 0x48B7,
        '3': 0xC837,
        '4': 0x28D7,
        '5': 0xA857,
        '6': 0x6897,
        '7': 0xE817,
        '8': 0x18E7,
        '9': 0x9867,
        
        # Media controls
        'PLAY': 0x906F,
        'PAUSE': 0x50AF,
        'STOP': 0x30CF,
        'PLAY_PAUSE': 0x906F,
        'RECORD': 0xB04F,
        'REWIND': 0x708F,
        'FAST_FORWARD': 0xF00F,
        'PREVIOUS': 0x10EF,
        'NEXT': 0x906F,
        'SKIP_BACK': 0x10EF,
        'SKIP_FORWARD': 0x906F,
        
        # Volume and audio
        'VOLUME_UP': 0x40BF,
        'VOLUME_DOWN': 0xC03F,
        'MUTE': 0x609F,
        'AUDIO': 0xE01F,
        
        # Channel controls
        'CHANNEL_UP': 0x00FF,
        'CHANNEL_DOWN': 0x807F,
        'LAST_CHANNEL': 0x20DF,
        
        # Color buttons
        'RED': 0x20DF,
        'GREEN': 0xA05F,
        'YELLOW': 0x609F,
        'BLUE': 0xE01F,
        
        # Function buttons
        'F1': 0x807F,
        'F2': 0x40BF,
        'F3': 0xC03F,
        'F4': 0x20DF,
        
        # TV specific
        'INPUT': 0x807F,
        'SOURCE': 0x807F,  # Same as INPUT
        'TV': 0x48B7,
        'SUBTITLE': 0x8877,
        'TELETEXT': 0x04FB,
        
        # STB specific
        'DVR': 0x12ED,
        'VOD': 0x52AD,
        'INTERACTIVE': 0x32CD,
        'FAVORITES': 0x728D,
        'LIST': 0xB24D,
        'SEARCH': 0x926D,
    }

    @staticmethod
    def get_remote_config() -> Dict[str, Any]:
        """Get the IR remote configuration including layout, buttons, and image."""
        # Load configuration from JSON file
        config_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 
            'config', 'remote', 'infrared_remote.json'
        )
        
        if not os.path.exists(config_path):
            raise FileNotFoundError(f"IR remote config file not found at: {config_path}")
            
        try:
            print(f"Loading IR remote config from: {config_path}")
            with open(config_path, 'r') as config_file:
                return json.load(config_file)
        except Exception as e:
            raise RuntimeError(f"Error loading IR remote config from file: {e}")
    
    def __init__(self, device_ip: str, device_port: int = 8080, **kwargs):
        """
        Initialize the Infrared remote controller.
        
        Args:
            device_ip: IP address of the IR blaster/device (required)
            device_port: Port for IR device communication (default: 8080)
        """
        super().__init__("IR Remote", "infrared")
        
        # IR device parameters
        self.device_ip = device_ip
        self.device_port = device_port
        
        # Validate required parameters
        if not self.device_ip:
            raise ValueError("device_ip is required for InfraredRemoteController")
            
        # IR connection state
        self.ir_blaster = None
        self.ir_codeset = None
        
        print(f"[@controller:InfraredRemote] Initialized for {self.device_ip}:{self.device_port}")
        
    def connect(self) -> bool:
        """Connect to IR transmitter device."""
        try:
            print(f"Remote[{self.device_type.upper()}]: Connecting to IR device {self.device_ip}:{self.device_port}")
            
            # In a real implementation, this would initialize the IR hardware
            # For now, we'll simulate the connection
            print(f"Remote[{self.device_type.upper()}]: Initializing IR protocol")
            
            # Simulate IR device initialization
            self.ir_blaster = {
                'device_ip': self.device_ip,
                'device_port': self.device_port,
                'ready': True
            }
            
            self.is_connected = True
            print(f"Remote[{self.device_type.upper()}]: Connected to {self.device_name}")
            return True
            
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Connection failed: {e}")
            return False
            
    def disconnect(self) -> bool:
        """Disconnect from IR transmitter."""
        try:
            if self.ir_blaster:
                print(f"Remote[{self.device_type.upper()}]: Closing IR transmitter")
                self.ir_blaster = None
                
            self.is_connected = False
            print(f"Remote[{self.device_type.upper()}]: Disconnected from {self.device_name}")
            return True
            
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Disconnect error: {e}")
            return False
            
    def press_key(self, key: str) -> bool:
        """
        Send IR key press command.
        
        Args:
            key: Key name (e.g., "POWER", "VOLUME_UP", "1", "OK")
        """
        if not self.is_connected:
            print(f"Remote[{self.device_type.upper()}]: ERROR - Not connected to IR device")
            return False
            
        try:
            keycode = self.IR_KEYCODES.get(key.upper())
            if not keycode:
                print(f"Remote[{self.device_type.upper()}]: Unknown key: {key}")
                return False
                
            print(f"Remote[{self.device_type.upper()}]: Sending IR command {key} (0x{keycode:04X})")
            
            # Simulate IR transmission delay
            current_time = time.time() * 1000  # Convert to milliseconds
            if current_time - self.last_command_time < self.repeat_delay:
                time.sleep((self.repeat_delay - (current_time - self.last_command_time)) / 1000)
            
            # In a real implementation, this would send the IR signal
            # For now, we'll simulate the transmission
            self._transmit_ir_signal(keycode)
            
            self.last_command_time = time.time() * 1000
            print(f"Remote[{self.device_type.upper()}]: Successfully sent {key}")
            return True
            
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Key press error: {e}")
            return False
            
    def input_text(self, text: str) -> bool:
        """
        Send text input by pressing number keys.
        
        Args:
            text: Text to input (numbers only for IR remote)
        """
        if not self.is_connected:
            print(f"Remote[{self.device_type.upper()}]: ERROR - Not connected to IR device")
            return False
            
        try:
            print(f"Remote[{self.device_type.upper()}]: Sending text: '{text}'")
            
            # IR remotes typically only support numeric input
            for char in text:
                if char.isdigit():
                    if not self.press_key(char):
                        print(f"Remote[{self.device_type.upper()}]: Failed to send digit: {char}")
                        return False
                    time.sleep(0.2)  # Small delay between digits
                elif char == ' ':
                    time.sleep(0.5)  # Longer pause for spaces
                else:
                    print(f"Remote[{self.device_type.upper()}]: Skipping non-numeric character: {char}")
            
            print(f"Remote[{self.device_type.upper()}]: Text input completed")
            return True
            
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Text input error: {e}")
            return False
            
    def power_on(self) -> bool:
        """Turn device on using IR power command."""
        return self.press_key("POWER")
        
    def power_off(self) -> bool:
        """Turn device off using IR power command."""
        return self.press_key("POWER")
        
    def change_channel(self, channel: int) -> bool:
        """
        Change to specific channel number.
        
        Args:
            channel: Channel number to tune to
        """
        if not self.is_connected:
            return False
            
        try:
            print(f"Remote[{self.device_type.upper()}]: Changing to channel {channel}")
            
            # Send each digit of the channel number
            channel_str = str(channel)
            for digit in channel_str:
                if not self.press_key(digit):
                    return False
                time.sleep(0.3)
            
            # Press OK to confirm channel change
            time.sleep(0.5)
            return self.press_key("OK")
            
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Channel change error: {e}")
            return False
            
    def set_volume(self, level: int) -> bool:
        """
        Set volume to specific level (0-100).
        
        Args:
            level: Volume level (0-100)
        """
        if not self.is_connected:
            return False
            
        try:
            print(f"Remote[{self.device_type.upper()}]: Setting volume to {level}")
            
            # First mute, then unmute to reset volume
            self.press_key("MUTE")
            time.sleep(0.5)
            self.press_key("MUTE")
            time.sleep(0.5)
            
            # Adjust volume (simplified approach)
            if level > 50:
                # Volume up
                presses = (level - 50) // 5
                for _ in range(presses):
                    self.press_key("VOLUME_UP")
                    time.sleep(0.2)
            elif level < 50:
                # Volume down
                presses = (50 - level) // 5
                for _ in range(presses):
                    self.press_key("VOLUME_DOWN")
                    time.sleep(0.2)
            
            print(f"Remote[{self.device_type.upper()}]: Volume set to approximately {level}")
            return True
            
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Volume set error: {e}")
            return False
            
    def _transmit_ir_signal(self, keycode: int) -> bool:
        """
        Transmit IR signal with given keycode.
        
        Args:
            keycode: IR keycode to transmit
            
        Returns:
            bool: True if transmission successful
        """
        try:
            # In a real implementation, this would:
            # 1. Generate the IR pulse pattern for the keycode
            # 2. Modulate it at the carrier frequency
            # 3. Send it through the IR transmitter hardware
            
            print(f"Remote[{self.device_type.upper()}]: Transmitting IR signal 0x{keycode:04X} at {self.frequency}Hz")
            
            # Simulate transmission time
            time.sleep(0.05)  # 50ms transmission time
            
            return True
            
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: IR transmission error: {e}")
            return False
            
    def get_status(self) -> Dict[str, Any]:
        """Get controller status information."""
        return {
            'controller_type': self.controller_type,
            'device_type': self.device_type,
            'device_name': self.device_name,
            'device_ip': self.device_ip,
            'device_port': self.device_port,
            'ir_protocol': self.ir_protocol,
            'device_brand': self.device_brand,
            'device_model': self.device_model,
            'connection_timeout': self.connection_timeout,
            'command_delay': self.command_delay,
            'connected': self.is_connected,
            'last_command_time': self.last_command_time,
            'supported_keys': list(self.IR_KEYCODES.keys()),
            'capabilities': [
                'navigation', 'numeric_input', 'media_control', 
                'volume_control', 'channel_control', 'power_control',
                'color_buttons', 'function_buttons', 'tv_controls',
                'stb_controls'
            ]
        }
    
    def get_available_actions(self) -> Dict[str, Any]:
        """Get available actions for this IR controller."""
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
                },
                {
                    'id': 'power_on',
                    'label': 'Power On',
                    'command': 'power_on',
                    'params': {},
                    'description': 'Turn device on',
                    'requiresInput': False
                },
                {
                    'id': 'power_off',
                    'label': 'Power Off',
                    'command': 'power_off',
                    'params': {},
                    'description': 'Turn device off',
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
                },
                {
                    'id': 'set_volume',
                    'label': 'Set Volume Level',
                    'command': 'set_volume',
                    'params': {},
                    'description': 'Set volume to specific level (0-100)',
                    'requiresInput': True,
                    'inputLabel': 'Volume level (0-100)',
                    'inputPlaceholder': '50'
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
            'channel_control': [
                {
                    'id': 'press_key_channel_up',
                    'label': 'Channel Up',
                    'command': 'press_key',
                    'params': {'key': 'CHANNEL_UP'},
                    'description': 'Go to next channel',
                    'requiresInput': False
                },
                {
                    'id': 'press_key_channel_down',
                    'label': 'Channel Down',
                    'command': 'press_key',
                    'params': {'key': 'CHANNEL_DOWN'},
                    'description': 'Go to previous channel',
                    'requiresInput': False
                },
                {
                    'id': 'change_channel',
                    'label': 'Change Channel',
                    'command': 'change_channel',
                    'params': {},
                    'description': 'Change to specific channel number',
                    'requiresInput': True,
                    'inputLabel': 'Channel number',
                    'inputPlaceholder': '1'
                }
            ],
            'numeric_input': [
                {
                    'id': 'press_key_0',
                    'label': 'Number 0',
                    'command': 'press_key',
                    'params': {'key': '0'},
                    'description': 'Press number 0',
                    'requiresInput': False
                },
                {
                    'id': 'press_key_1',
                    'label': 'Number 1',
                    'command': 'press_key',
                    'params': {'key': '1'},
                    'description': 'Press number 1',
                    'requiresInput': False
                },
                {
                    'id': 'press_key_2',
                    'label': 'Number 2',
                    'command': 'press_key',
                    'params': {'key': '2'},
                    'description': 'Press number 2',
                    'requiresInput': False
                },
                {
                    'id': 'press_key_3',
                    'label': 'Number 3',
                    'command': 'press_key',
                    'params': {'key': '3'},
                    'description': 'Press number 3',
                    'requiresInput': False
                },
                {
                    'id': 'press_key_4',
                    'label': 'Number 4',
                    'command': 'press_key',
                    'params': {'key': '4'},
                    'description': 'Press number 4',
                    'requiresInput': False
                },
                {
                    'id': 'press_key_5',
                    'label': 'Number 5',
                    'command': 'press_key',
                    'params': {'key': '5'},
                    'description': 'Press number 5',
                    'requiresInput': False
                },
                {
                    'id': 'press_key_6',
                    'label': 'Number 6',
                    'command': 'press_key',
                    'params': {'key': '6'},
                    'description': 'Press number 6',
                    'requiresInput': False
                },
                {
                    'id': 'press_key_7',
                    'label': 'Number 7',
                    'command': 'press_key',
                    'params': {'key': '7'},
                    'description': 'Press number 7',
                    'requiresInput': False
                },
                {
                    'id': 'press_key_8',
                    'label': 'Number 8',
                    'command': 'press_key',
                    'params': {'key': '8'},
                    'description': 'Press number 8',
                    'requiresInput': False
                },
                {
                    'id': 'press_key_9',
                    'label': 'Number 9',
                    'command': 'press_key',
                    'params': {'key': '9'},
                    'description': 'Press number 9',
                    'requiresInput': False
                }
            ],
            'color_buttons': [
                {
                    'id': 'press_key_red',
                    'label': 'Red Button',
                    'command': 'press_key',
                    'params': {'key': 'RED'},
                    'description': 'Press red color button',
                    'requiresInput': False
                },
                {
                    'id': 'press_key_green',
                    'label': 'Green Button',
                    'command': 'press_key',
                    'params': {'key': 'GREEN'},
                    'description': 'Press green color button',
                    'requiresInput': False
                },
                {
                    'id': 'press_key_yellow',
                    'label': 'Yellow Button',
                    'command': 'press_key',
                    'params': {'key': 'YELLOW'},
                    'description': 'Press yellow color button',
                    'requiresInput': False
                },
                {
                    'id': 'press_key_blue',
                    'label': 'Blue Button',
                    'command': 'press_key',
                    'params': {'key': 'BLUE'},
                    'description': 'Press blue color button',
                    'requiresInput': False
                }
            ],
            'input': [
                {
                    'id': 'input_text',
                    'label': 'Input Text',
                    'command': 'input_text',
                    'params': {},
                    'description': 'Type text using IR remote',
                    'requiresInput': True,
                    'inputLabel': 'Text to input',
                    'inputPlaceholder': 'Enter text...'
                }
            ],
            'sequences': [
                {
                    'id': 'execute_sequence',
                    'label': 'Execute Sequence',
                    'command': 'execute_sequence',
                    'params': {},
                    'description': 'Execute a sequence of IR commands',
                    'requiresInput': True,
                    'inputLabel': 'Command sequence (JSON)',
                    'inputPlaceholder': '[{"action": "press_key", "params": {"key": "OK"}}]'
                }
            ]
        }

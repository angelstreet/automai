"""
IR Remote Controller Implementation

This controller provides IR (Infrared) remote control functionality for TVs, STBs, and other devices.
Supports classic remote control buttons with standard IR keycodes.
"""

from typing import Dict, Any, List
import time
from base_controllers import RemoteControllerInterface


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
        return {
            'remote_info': {
                'name': 'Sunrise Remote',
                'type': 'ir_remote',
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
                    'position': { 'top': 25, 'left': '50%', 'transform': 'translateX(-50%)' },
                    'size': { 'width': 16, 'height': 16 },
                    'shape': 'circle',
                    'comment': 'Power button',
                    'local_offset': { 'x': 0, 'y': 0 }
                },
                'mute': {
                    'key': 'MUTE',
                    'position': { 'top': 50, 'left': 20 },
                    'size': { 'width': 14, 'height': 14 },
                    'shape': 'circle',
                    'comment': 'Mute button',
                    'local_offset': { 'x': 0, 'y': 0 }
                },
                'source': {
                    'key': 'SOURCE',
                    'position': { 'top': 50, 'right': 20 },
                    'size': { 'width': 14, 'height': 14 },
                    'shape': 'circle',
                    'comment': 'Source/Input button',
                    'local_offset': { 'x': 0, 'y': 0 }
                },
                'num_1': {
                    'key': '1',
                    'position': { 'top': 80, 'left': 20 },
                    'size': { 'width': 14, 'height': 14 },
                    'shape': 'circle',
                    'comment': 'Number 1',
                    'local_offset': { 'x': 0, 'y': 0 }
                },
                'num_2': {
                    'key': '2',
                    'position': { 'top': 80, 'left': '50%', 'transform': 'translateX(-50%)' },
                    'size': { 'width': 14, 'height': 14 },
                    'shape': 'circle',
                    'comment': 'Number 2',
                    'local_offset': { 'x': 0, 'y': 0 }
                },
                'num_3': {
                    'key': '3',
                    'position': { 'top': 80, 'right': 20 },
                    'size': { 'width': 14, 'height': 14 },
                    'shape': 'circle',
                    'comment': 'Number 3',
                    'local_offset': { 'x': 0, 'y': 0 }
                },
                'num_4': {
                    'key': '4',
                    'position': { 'top': 105, 'left': 20 },
                    'size': { 'width': 14, 'height': 14 },
                    'shape': 'circle',
                    'comment': 'Number 4',
                    'local_offset': { 'x': 0, 'y': 0 }
                },
                'num_5': {
                    'key': '5',
                    'position': { 'top': 105, 'left': '50%', 'transform': 'translateX(-50%)' },
                    'size': { 'width': 14, 'height': 14 },
                    'shape': 'circle',
                    'comment': 'Number 5',
                    'local_offset': { 'x': 0, 'y': 0 }
                },
                'num_6': {
                    'key': '6',
                    'position': { 'top': 105, 'right': 20 },
                    'size': { 'width': 14, 'height': 14 },
                    'shape': 'circle',
                    'comment': 'Number 6',
                    'local_offset': { 'x': 0, 'y': 0 }
                },
                'num_7': {
                    'key': '7',
                    'position': { 'top': 130, 'left': 20 },
                    'size': { 'width': 14, 'height': 14 },
                    'shape': 'circle',
                    'comment': 'Number 7',
                    'local_offset': { 'x': 0, 'y': 0 }
                },
                'num_8': {
                    'key': '8',
                    'position': { 'top': 130, 'left': '50%', 'transform': 'translateX(-50%)' },
                    'size': { 'width': 14, 'height': 14 },
                    'shape': 'circle',
                    'comment': 'Number 8',
                    'local_offset': { 'x': 0, 'y': 0 }
                },
                'num_9': {
                    'key': '9',
                    'position': { 'top': 130, 'right': 20 },
                    'size': { 'width': 14, 'height': 14 },
                    'shape': 'circle',
                    'comment': 'Number 9',
                    'local_offset': { 'x': 0, 'y': 0 }
                },
                'num_0': {
                    'key': '0',
                    'position': { 'top': 155, 'left': '50%', 'transform': 'translateX(-50%)' },
                    'size': { 'width': 14, 'height': 14 },
                    'shape': 'circle',
                    'comment': 'Number 0',
                    'local_offset': { 'x': 0, 'y': 0 }
                },
                'volume_up': {
                    'key': 'VOLUME_UP',
                    'position': { 'top': 185, 'left': 20 },
                    'size': { 'width': 14, 'height': 14 },
                    'shape': 'circle',
                    'comment': 'Volume up',
                    'local_offset': { 'x': 0, 'y': 0 }
                },
                'channel_up': {
                    'key': 'CHANNEL_UP',
                    'position': { 'top': 185, 'right': 20 },
                    'size': { 'width': 14, 'height': 14 },
                    'shape': 'circle',
                    'comment': 'Channel up',
                    'local_offset': { 'x': 0, 'y': 0 }
                },
                'volume_down': {
                    'key': 'VOLUME_DOWN',
                    'position': { 'top': 210, 'left': 20 },
                    'size': { 'width': 14, 'height': 14 },
                    'shape': 'circle',
                    'comment': 'Volume down',
                    'local_offset': { 'x': 0, 'y': 0 }
                },
                'channel_down': {
                    'key': 'CHANNEL_DOWN',
                    'position': { 'top': 210, 'right': 20 },
                    'size': { 'width': 14, 'height': 14 },
                    'shape': 'circle',
                    'comment': 'Channel down',
                    'local_offset': { 'x': 0, 'y': 0 }
                },
                'nav_up': {
                    'key': 'UP',
                    'position': { 'top': 245, 'left': '50%', 'transform': 'translateX(-50%)' },
                    'size': { 'width': 16, 'height': 12 },
                    'shape': 'rectangle',
                    'comment': 'Navigation up',
                    'local_offset': { 'x': 0, 'y': 0 }
                },
                'nav_left': {
                    'key': 'LEFT',
                    'position': { 'top': 262, 'left': 25 },
                    'size': { 'width': 12, 'height': 16 },
                    'shape': 'rectangle',
                    'comment': 'Navigation left',
                    'local_offset': { 'x': 0, 'y': 0 }
                },
                'nav_center': {
                    'key': 'OK',
                    'position': { 'top': 265, 'left': '50%', 'transform': 'translateX(-50%)' },
                    'size': { 'width': 14, 'height': 14 },
                    'shape': 'circle',
                    'comment': 'Navigation center/OK',
                    'local_offset': { 'x': 0, 'y': 0 }
                },
                'nav_right': {
                    'key': 'RIGHT',
                    'position': { 'top': 262, 'right': 25 },
                    'size': { 'width': 12, 'height': 16 },
                    'shape': 'rectangle',
                    'comment': 'Navigation right',
                    'local_offset': { 'x': 0, 'y': 0 }
                },
                'nav_down': {
                    'key': 'DOWN',
                    'position': { 'top': 285, 'left': '50%', 'transform': 'translateX(-50%)' },
                    'size': { 'width': 16, 'height': 12 },
                    'shape': 'rectangle',
                    'comment': 'Navigation down',
                    'local_offset': { 'x': 0, 'y': 0 }
                },
                'menu': {
                    'key': 'MENU',
                    'position': { 'top': 315, 'left': 20 },
                    'size': { 'width': 14, 'height': 14 },
                    'shape': 'circle',
                    'comment': 'Menu button',
                    'local_offset': { 'x': 0, 'y': 0 }
                },
                'back': {
                    'key': 'BACK',
                    'position': { 'top': 315, 'right': 20 },
                    'size': { 'width': 14, 'height': 14 },
                    'shape': 'circle',
                    'comment': 'Back/Exit button',
                    'local_offset': { 'x': 0, 'y': 0 }
                }
            }
        }
    
    def __init__(self, device_name: str = "IR Remote", device_type: str = "ir_remote", **kwargs):
        """
        Initialize the IR remote controller.
        
        Args:
            device_name: Name of the IR remote device
            device_type: Type identifier for the device
            **kwargs: Additional parameters including:
                - ir_device: IR transmitter device path (e.g., '/dev/lirc0')
                - protocol: IR protocol (e.g., 'NEC', 'RC5', 'RC6')
                - frequency: IR carrier frequency in Hz (default: 38000)
                - repeat_delay: Delay between repeat signals in ms (default: 100)
        """
        super().__init__(device_name, device_type)
        
        self.ir_device = kwargs.get('ir_device', '/dev/lirc0')
        self.protocol = kwargs.get('protocol', 'NEC')
        self.frequency = kwargs.get('frequency', 38000)
        self.repeat_delay = kwargs.get('repeat_delay', 100)
        
        # IR transmission state
        self.ir_transmitter = None
        self.last_command_time = 0
        
    def connect(self) -> bool:
        """Connect to IR transmitter device."""
        try:
            print(f"Remote[{self.device_type.upper()}]: Connecting to IR device {self.ir_device}")
            
            # In a real implementation, this would initialize the IR hardware
            # For now, we'll simulate the connection
            print(f"Remote[{self.device_type.upper()}]: Initializing {self.protocol} protocol at {self.frequency}Hz")
            
            # Simulate IR device initialization
            self.ir_transmitter = {
                'device': self.ir_device,
                'protocol': self.protocol,
                'frequency': self.frequency,
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
            if self.ir_transmitter:
                print(f"Remote[{self.device_type.upper()}]: Closing IR transmitter")
                self.ir_transmitter = None
                
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
            
    def execute_sequence(self, commands: List[Dict[str, Any]]) -> bool:
        """
        Execute a sequence of IR commands.
        
        Args:
            commands: List of command dictionaries with 'action', 'params', and optional 'delay'
        """
        if not self.is_connected:
            print(f"Remote[{self.device_type.upper()}]: ERROR - Not connected to IR device")
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
            elif action == 'power_on':
                success = self.power_on()
            elif action == 'power_off':
                success = self.power_off()
            elif action == 'change_channel':
                success = self.change_channel(params.get('channel', 1))
            elif action == 'set_volume':
                success = self.set_volume(params.get('level', 50))
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
            'ir_device': self.ir_device,
            'protocol': self.protocol,
            'frequency': self.frequency,
            'repeat_delay': self.repeat_delay,
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


# Backward compatibility alias
IRController = IRRemoteController 
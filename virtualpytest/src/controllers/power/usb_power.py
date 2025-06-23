"""
USB Power Controller Implementation

This controller provides USB power management functionality using uhubctl.
Based on direct USB hub control commands.
"""

from typing import Dict, Any, Optional
import time
import os
import subprocess
from ..base_controller import PowerControllerInterface


class USBPowerController(PowerControllerInterface):
    """USB power controller using uhubctl commands."""
    
    def __init__(self, usb_hub: int = 1, **kwargs):
        """
        Initialize the USB power controller.
        
        Args:
            usb_hub: USB hub number (default: 1)
        """
        super().__init__("USB Power", "usb")
        
        # USB parameters
        self.usb_hub = usb_hub
        
        print(f"[@controller:USBPower] Initialized for USB hub {self.usb_hub}")
        
    def connect(self) -> bool:
        """Connect to USB hub."""
        try:
            print(f"Power[{self.power_type.upper()}]: Connecting to USB hub {self.usb_hub}")
            
            # Test uhubctl command availability
            result = subprocess.run(['uhubctl', '--version'], capture_output=True, text=True)
            if result.returncode != 0:
                print(f"Power[{self.power_type.upper()}]: uhubctl command not available")
                return False
                
            print(f"Power[{self.power_type.upper()}]: USB hub connection established")
            
            self.is_connected = True
            return True
            
        except Exception as e:
            print(f"Power[{self.power_type.upper()}]: Connection error: {e}")
            self.disconnect()
            return False
            
    def disconnect(self) -> bool:
        """Disconnect from USB hub."""
        try:
            print(f"Power[{self.power_type.upper()}]: Disconnecting from {self.device_name}")
            
            self.is_connected = False
            
            print(f"Power[{self.power_type.upper()}]: Disconnected successfully")
            return True
            
        except Exception as e:
            print(f"Power[{self.power_type.upper()}]: Disconnect error: {e}")
            self.is_connected = False
            return False
            
    def power_on(self, timeout: float = 10.0) -> bool:
        """Turn USB hub on using uhubctl."""
        if not self.is_connected:
            print(f"Power[{self.power_type.upper()}]: ERROR - Not connected to USB hub")
            return False
            
        try:
            print(f"Power[{self.power_type.upper()}]: Powering on USB hub {self.usb_hub}")
            
            # Test uhubctl command availability
            result = subprocess.run(['uhubctl', '-l', str(self.usb_hub), '-a', 'on'], capture_output=True, text=True, timeout=timeout)
            if result.returncode != 0:
                print(f"Power[{self.power_type.upper()}]: Failed to power on USB hub: {result.stderr}")
                return False
                
            print(f"Power[{self.power_type.upper()}]: Successfully powered on USB hub {self.usb_hub}")
            self.current_power_state = "on"
            return True
            
        except Exception as e:
            print(f"Power[{self.power_type.upper()}]: Power on error: {e}")
            return False
            
    def power_off(self, force: bool = False, timeout: float = 5.0) -> bool:
        """Turn USB hub off using uhubctl."""
        if not self.is_connected:
            print(f"Power[{self.power_type.upper()}]: ERROR - Not connected to USB hub")
            return False
            
        try:
            print(f"Power[{self.power_type.upper()}]: Powering off USB hub {self.usb_hub}")
            
            # Test uhubctl command availability
            result = subprocess.run(['uhubctl', '-l', str(self.usb_hub), '-a', 'off'], capture_output=True, text=True, timeout=timeout)
            if result.returncode != 0:
                print(f"Power[{self.power_type.upper()}]: Failed to power off USB hub: {result.stderr}")
                return False
                
            print(f"Power[{self.power_type.upper()}]: Successfully powered off USB hub {self.usb_hub}")
            self.current_power_state = "off"
            return True
            
        except Exception as e:
            print(f"Power[{self.power_type.upper()}]: Power off error: {e}")
            return False
            
    def reboot(self, timeout: float = 20.0) -> bool:
        """Reboot by turning off then on."""
        try:
            print(f"Power[{self.power_type.upper()}]: Rebooting USB hub {self.usb_hub}")
            
            # Power off first
            if not self.power_off(timeout=5.0):
                return False
            
            # Wait 2 seconds
            time.sleep(2)
            
            # Power on
            if not self.power_on(timeout=10.0):
                return False
            
            print(f"Power[{self.power_type.upper()}]: Successfully rebooted USB hub {self.usb_hub}")
            return True
            
        except Exception as e:
            print(f"Power[{self.power_type.upper()}]: Reboot error: {e}")
            return False
            
    def get_power_status(self) -> Dict[str, Any]:
        """Get current USB hub power status using uhubctl."""
        if not self.is_connected:
            return {
                'power_state': 'unknown',
                'connected': False,
                'error': 'Not connected to USB hub'
            }
            
        try:
            print(f"Power[{self.power_type.upper()}]: Checking power status for USB hub {self.usb_hub}")
            
            # Test uhubctl command availability
            result = subprocess.run(['uhubctl', '-l', str(self.usb_hub)], capture_output=True, text=True, timeout=10)
            if result.returncode != 0:
                print(f"Power[{self.power_type.upper()}]: uhubctl command failed: {result.stderr}")
                return {
                    'power_state': 'unknown',
                    'connected': True,
                    'error': f'uhubctl command failed: {result.stderr}'
                }
                
            # Log the actual output for debugging
            print(f"Power[{self.power_type.upper()}]: uhubctl output:")
            print(f"--- START OUTPUT ---")
            print(result.stdout)
            print(f"--- END OUTPUT ---")
            
            # Parse uhubctl output to determine power state
            power_state = 'unknown'
            if result.stdout:
                lines = result.stdout.strip().split('\n')
                for line in lines:
                    line_lower = line.lower().strip()
                    print(f"Power[{self.power_type.upper()}]: Parsing line: {line}")
                    
                    # Look for different uhubctl output patterns
                    # Pattern 1: "Current status for hub X [device:port]:"
                    # Pattern 2: "Port X: 0503 power"
                    # Pattern 3: "Port X: 0100 off"
                    
                    if 'port' in line_lower:
                        if 'power' in line_lower or '0503' in line_lower:
                            power_state = 'on'
                            print(f"Power[{self.power_type.upper()}]: Detected ON state from line: {line}")
                            break
                        elif 'off' in line_lower or '0100' in line_lower:
                            power_state = 'off' 
                            print(f"Power[{self.power_type.upper()}]: Detected OFF state from line: {line}")
                            break
                    
                    # Alternative patterns for different uhubctl versions
                    elif 'power' in line_lower:
                        if 'on' in line_lower or 'enable' in line_lower:
                            power_state = 'on'
                            print(f"Power[{self.power_type.upper()}]: Detected ON state from power line: {line}")
                            break
                        elif 'off' in line_lower or 'disable' in line_lower:
                            power_state = 'off'
                            print(f"Power[{self.power_type.upper()}]: Detected OFF state from power line: {line}")
                            break
                
                # If still unknown, try to infer from any status codes
                if power_state == 'unknown':
                    for line in lines:
                        line_lower = line.lower().strip()
                        # Look for status codes that indicate power state
                        if '0503' in line or '0507' in line:  # Common "powered" status codes
                            power_state = 'on'
                            print(f"Power[{self.power_type.upper()}]: Detected ON from status code in: {line}")
                            break
                        elif '0100' in line or '0000' in line:  # Common "off" status codes  
                            power_state = 'off'
                            print(f"Power[{self.power_type.upper()}]: Detected OFF from status code in: {line}")
                            break
            
            # Update our internal state
            if power_state != 'unknown':
                self.current_power_state = power_state
            
            print(f"Power[{self.power_type.upper()}]: Power status check result: {power_state}")
            
            return {
                'power_state': power_state,
                'usb_hub': self.usb_hub,
                'connected': True,
                'uhubctl_output': result.stdout
            }
            
        except Exception as e:
            print(f"Power[{self.power_type.upper()}]: Status check error: {e}")
            return {
                'power_state': 'unknown',
                'connected': self.is_connected,
                'error': f'Status check error: {e}'
            }
            
    def get_status(self) -> Dict[str, Any]:
        """Get controller status information."""
        return {
            'controller_type': self.controller_type,
            'power_type': self.power_type,
            'device_name': self.device_name,
            'usb_hub': self.usb_hub,
            'connected': self.is_connected,
            'connection_timeout': self.connection_timeout,
            'current_power_state': self.current_power_state,
            'capabilities': [
                'uhubctl_control', 'power_on', 'power_off', 'reboot'
            ]
        } 
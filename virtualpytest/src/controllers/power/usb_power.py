"""
USB Power Controller Implementation

This controller provides USB power management functionality using SSH + uhubctl.
Based on the same pattern as AndroidMobileRemoteController.
"""

from typing import Dict, Any, Optional
import time
import os
from ..base_controllers import PowerControllerInterface
from utils.sshUtils import SSHConnection, create_ssh_connection


class USBPowerController(PowerControllerInterface):
    """USB power controller using SSH + uhubctl commands."""
    
    def __init__(self, device_name: str = "USB Device", power_type: str = "usb", **kwargs):
        """
        Initialize the USB power controller.
        
        Args:
            device_name: Name of the USB device
            power_type: Type identifier for the power controller
            **kwargs: Additional parameters including:
                - host_ip: SSH host IP address (required)
                - host_port: SSH port (default: 22)
                - host_username: SSH username (required)
                - host_password: SSH password (if using password auth)
                - host_private_key: SSH private key (if using key auth)
                - usb_hub: USB hub number (default: 1)
                - connection_timeout: Connection timeout in seconds (default: 10)
        """
        super().__init__(device_name, power_type)
        
        # SSH connection parameters
        self.host_ip = kwargs.get('host_ip')
        self.host_port = kwargs.get('host_port', 22)
        self.host_username = kwargs.get('host_username')
        self.host_password = kwargs.get('host_password', '')
        self.host_private_key = kwargs.get('host_private_key', '')
        
        # USB parameters
        self.usb_hub = kwargs.get('usb_hub', 1)
        self.connection_timeout = kwargs.get('connection_timeout', 10)
        
        # Validate required parameters
        if not self.host_ip:
            raise ValueError("host_ip is required for USBPowerController")
        if not self.host_username:
            raise ValueError("host_username is required for USBPowerController")
            
        self.ssh_connection = None
        
    def connect(self) -> bool:
        """Connect to SSH host."""
        try:
            print(f"Power[{self.power_type.upper()}]: Connecting to SSH host {self.host_ip}")
            
            # Establish SSH connection
            self.ssh_connection = create_ssh_connection(
                host=self.host_ip,
                port=self.host_port,
                username=self.host_username,
                password=self.host_password,
                private_key=self.host_private_key,
                timeout=self.connection_timeout
            )
            
            if not self.ssh_connection:
                print(f"Power[{self.power_type.upper()}]: Failed to establish SSH connection to {self.host_ip}")
                return False
                
            print(f"Power[{self.power_type.upper()}]: SSH connection established to {self.host_ip}")
            
            self.is_connected = True
            return True
            
        except Exception as e:
            print(f"Power[{self.power_type.upper()}]: Connection error: {e}")
            self.disconnect()
            return False
            
    def disconnect(self) -> bool:
        """Disconnect from SSH host."""
        try:
            print(f"Power[{self.power_type.upper()}]: Disconnecting from {self.device_name}")
            
            # Close SSH connection
            if self.ssh_connection:
                self.ssh_connection.disconnect()
                self.ssh_connection = None
                
            self.is_connected = False
            
            print(f"Power[{self.power_type.upper()}]: Disconnected successfully")
            return True
            
        except Exception as e:
            print(f"Power[{self.power_type.upper()}]: Disconnect error: {e}")
            self.is_connected = False
            return False
            
    def power_on(self, timeout: float = 10.0) -> bool:
        """Turn USB hub on using uhubctl."""
        if not self.is_connected or not self.ssh_connection:
            print(f"Power[{self.power_type.upper()}]: ERROR - Not connected to SSH host")
            return False
            
        try:
            print(f"Power[{self.power_type.upper()}]: Powering on USB hub {self.usb_hub}")
            
            success, stdout, stderr, exit_code = self.ssh_connection.execute_command(
                f"sudo uhubctl -l {self.usb_hub} -a on", timeout=timeout
            )
            
            if success and exit_code == 0:
                print(f"Power[{self.power_type.upper()}]: Successfully powered on USB hub {self.usb_hub}")
                self.current_power_state = "on"
                return True
            else:
                print(f"Power[{self.power_type.upper()}]: Failed to power on USB hub: {stderr}")
                return False
                
        except Exception as e:
            print(f"Power[{self.power_type.upper()}]: Power on error: {e}")
            return False
            
    def power_off(self, force: bool = False, timeout: float = 5.0) -> bool:
        """Turn USB hub off using uhubctl."""
        if not self.is_connected or not self.ssh_connection:
            print(f"Power[{self.power_type.upper()}]: ERROR - Not connected to SSH host")
            return False
            
        try:
            print(f"Power[{self.power_type.upper()}]: Powering off USB hub {self.usb_hub}")
            
            success, stdout, stderr, exit_code = self.ssh_connection.execute_command(
                f"sudo uhubctl -l {self.usb_hub} -a off", timeout=timeout
            )
            
            if success and exit_code == 0:
                print(f"Power[{self.power_type.upper()}]: Successfully powered off USB hub {self.usb_hub}")
                self.current_power_state = "off"
                return True
            else:
                print(f"Power[{self.power_type.upper()}]: Failed to power off USB hub: {stderr}")
                return False
                
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
        if not self.is_connected or not self.ssh_connection:
            return {
                'power_state': 'unknown',
                'connected': False,
                'error': 'Not connected to SSH host'
            }
            
        try:
            print(f"Power[{self.power_type.upper()}]: Checking power status for USB hub {self.usb_hub}")
            
            success, stdout, stderr, exit_code = self.ssh_connection.execute_command(
                f"sudo uhubctl -l {self.usb_hub}", timeout=10
            )
            
            if success and exit_code == 0:
                # Parse uhubctl output to determine power state
                # Look for "power" status in the output
                power_state = 'unknown'
                if stdout:
                    lines = stdout.strip().split('\n')
                    for line in lines:
                        # Look for lines containing port information and power status
                        if 'power' in line.lower():
                            if 'off' in line.lower():
                                power_state = 'off'
                            elif 'on' in line.lower() or 'enable' in line.lower():
                                power_state = 'on'
                            break
                    
                    # If no explicit power status found, try to infer from port status
                    if power_state == 'unknown':
                        # Check if any ports are powered
                        for line in lines:
                            if 'port' in line.lower() and ('enable' in line.lower() or 'power' in line.lower()):
                                if 'off' in line.lower() or 'disable' in line.lower():
                                    power_state = 'off'
                                else:
                                    power_state = 'on'
                                break
                
                # Update our internal state
                if power_state != 'unknown':
                    self.current_power_state = power_state
                
                print(f"Power[{self.power_type.upper()}]: Power status check result: {power_state}")
                
                return {
                    'power_state': power_state,
                    'usb_hub': self.usb_hub,
                    'connected': True,
                    'uhubctl_output': stdout
                }
            else:
                print(f"Power[{self.power_type.upper()}]: uhubctl command failed: {stderr}")
                return {
                    'power_state': 'unknown',
                    'connected': True,
                    'error': f'uhubctl command failed: {stderr}'
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
            'host_ip': self.host_ip,
            'host_port': self.host_port,
            'host_username': self.host_username,
            'usb_hub': self.usb_hub,
            'connected': self.is_connected,
            'connection_timeout': self.connection_timeout,
            'current_power_state': self.current_power_state,
            'capabilities': [
                'ssh_connection', 'uhubctl_control', 'power_on', 'power_off', 'reboot'
            ]
        } 
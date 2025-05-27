"""
Power Controller Mock Implementation

This controller simulates power management functionality for various device types.
All actions are printed to demonstrate functionality.
"""

from typing import Dict, Any, Optional
import time
import random
from base_controllers import PowerControllerInterface


class MockPowerController(PowerControllerInterface):
    """Mock power controller that prints actions instead of executing them."""
    
    def __init__(self, device_name: str = "Unknown Device", power_type: str = "generic", **kwargs):
        """
        Initialize the power controller.
        
        Args:
            device_name: Name of the device for logging
            power_type: Type of power control (smart_plug, network, adb, etc.)
            **kwargs: Additional parameters (for extensibility)
        """
        super().__init__(device_name, power_type)
        self.boot_time = kwargs.get('boot_time', 30.0)  # Simulated boot time
        self.shutdown_time = kwargs.get('shutdown_time', 10.0)  # Simulated shutdown time
        
    def connect(self) -> bool:
        """Simulate connecting to the power management system."""
        print(f"Power[{self.power_type.upper()}]: Connecting to power management for {self.device_name}")
        time.sleep(0.1)  # Simulate connection delay
        self.is_connected = True
        self.power_session_id = f"power_{int(time.time())}"
        
        # Simulate initial power state detection
        self.current_power_state = random.choice(["on", "off", "standby"])
        print(f"Power[{self.power_type.upper()}]: Connected successfully - Session: {self.power_session_id}")
        print(f"Power[{self.power_type.upper()}]: Initial power state detected: {self.current_power_state}")
        return True
        
    def disconnect(self) -> bool:
        """Simulate disconnecting from the power management system."""
        print(f"Power[{self.power_type.upper()}]: Disconnecting from power management")
        self.is_connected = False
        self.power_session_id = None
        print(f"Power[{self.power_type.upper()}]: Disconnected")
        return True
        
    def power_on(self, timeout: float = 30.0) -> bool:
        """
        Turn the device on.
        
        Args:
            timeout: Maximum time to wait for device to power on
        """
        if not self.is_connected:
            print(f"Power[{self.power_type.upper()}]: ERROR - Not connected to power management")
            return False
            
        if self.current_power_state == "on":
            print(f"Power[{self.power_type.upper()}]: Device {self.device_name} is already powered on")
            return True
            
        print(f"Power[{self.power_type.upper()}]: Powering on {self.device_name} (timeout: {timeout}s)")
        
        # Simulate power on process
        boot_time = min(self.boot_time, timeout)
        print(f"Power[{self.power_type.upper()}]: Initiating power on sequence...")
        time.sleep(min(boot_time, 2.0))  # Don't actually wait full boot time in mock
        
        # Simulate success/failure
        success = random.choice([True, True, True, False])  # 75% success rate
        
        if success:
            self.current_power_state = "on"
            print(f"Power[{self.power_type.upper()}]: Device {self.device_name} powered on successfully after {boot_time:.1f}s")
        else:
            print(f"Power[{self.power_type.upper()}]: Failed to power on {self.device_name} within {timeout}s")
            
        return success
        
    def power_off(self, force: bool = False, timeout: float = 30.0) -> bool:
        """
        Turn the device off.
        
        Args:
            force: Whether to force shutdown (hard power off)
            timeout: Maximum time to wait for device to power off
        """
        if not self.is_connected:
            print(f"Power[{self.power_type.upper()}]: ERROR - Not connected to power management")
            return False
            
        if self.current_power_state == "off":
            print(f"Power[{self.power_type.upper()}]: Device {self.device_name} is already powered off")
            return True
            
        shutdown_type = "forced" if force else "graceful"
        print(f"Power[{self.power_type.upper()}]: Powering off {self.device_name} ({shutdown_type} shutdown, timeout: {timeout}s)")
        
        # Simulate power off process
        shutdown_time = self.shutdown_time if not force else 2.0  # Force shutdown is faster
        actual_time = min(shutdown_time, timeout)
        print(f"Power[{self.power_type.upper()}]: Initiating {shutdown_type} shutdown sequence...")
        time.sleep(min(actual_time, 1.0))  # Don't actually wait full shutdown time in mock
        
        # Simulate success/failure (force shutdown has higher success rate)
        success_rate = 0.95 if force else 0.85
        success = random.random() < success_rate
        
        if success:
            self.current_power_state = "off"
            print(f"Power[{self.power_type.upper()}]: Device {self.device_name} powered off successfully after {actual_time:.1f}s")
        else:
            print(f"Power[{self.power_type.upper()}]: Failed to power off {self.device_name} within {timeout}s")
            
        return success
        
    def reboot(self, timeout: float = 60.0) -> bool:
        """
        Restart the device.
        
        Args:
            timeout: Maximum time to wait for reboot to complete
        """
        if not self.is_connected:
            print(f"Power[{self.power_type.upper()}]: ERROR - Not connected to power management")
            return False
            
        print(f"Power[{self.power_type.upper()}]: Rebooting {self.device_name} (timeout: {timeout}s)")
        
        # Simulate reboot process
        total_reboot_time = self.shutdown_time + self.boot_time
        actual_time = min(total_reboot_time, timeout)
        
        print(f"Power[{self.power_type.upper()}]: Initiating reboot sequence...")
        print(f"Power[{self.power_type.upper()}]: Shutting down...")
        time.sleep(0.5)
        
        self.current_power_state = "rebooting"
        print(f"Power[{self.power_type.upper()}]: Starting up...")
        time.sleep(min(actual_time - 0.5, 1.5))
        
        # Simulate success/failure
        success = random.choice([True, True, True, True, False])  # 80% success rate
        
        if success:
            self.current_power_state = "on"
            print(f"Power[{self.power_type.upper()}]: Device {self.device_name} rebooted successfully after {actual_time:.1f}s")
        else:
            self.current_power_state = "unknown"
            print(f"Power[{self.power_type.upper()}]: Reboot failed for {self.device_name} within {timeout}s")
            
        return success
        
    def get_power_status(self) -> Dict[str, Any]:
        """Get current power status."""
        if not self.is_connected:
            return {
                'power_state': 'unknown',
                'connected': False,
                'error': 'Not connected to power management'
            }
            
        # Simulate additional status information
        uptime = random.randint(0, 86400) if self.current_power_state == "on" else 0
        temperature = random.randint(35, 65) if self.current_power_state == "on" else None
        power_consumption = random.randint(15, 45) if self.current_power_state == "on" else 0
        
        status = {
            'power_state': self.current_power_state,
            'device_name': self.device_name,
            'power_type': self.power_type,
            'connected': self.is_connected,
            'session_id': self.power_session_id,
            'uptime_seconds': uptime,
            'temperature_celsius': temperature,
            'power_consumption_watts': power_consumption,
            'last_state_change': int(time.time()),
            'capabilities': [
                'power_on', 'power_off', 'reboot', 'status_monitoring'
            ]
        }
        
        print(f"Power[{self.power_type.upper()}]: Status - State: {self.current_power_state}, Uptime: {uptime}s")
        return status
        
    def get_status(self) -> Dict[str, Any]:
        """Get controller status information."""
        return {
            'controller_type': self.controller_type,
            'device_name': self.device_name,
            'power_type': self.power_type,
            'connected': self.is_connected,
            'current_power_state': self.current_power_state,
            'session_id': self.power_session_id,
            'boot_time': self.boot_time,
            'shutdown_time': self.shutdown_time,
            'capabilities': [
                'power_on', 'power_off', 'reboot', 'soft_reboot', 
                'hard_reboot', 'status_monitoring', 'state_waiting'
            ]
        }


# Device-specific mock controllers that can be customized later
class MockSmartPlugController(MockPowerController):
    """Mock power controller for smart plug devices."""
    
    def __init__(self, device_name: str = "Smart Plug Device", **kwargs):
        super().__init__(device_name, "smart_plug", **kwargs)


class MockNetworkPowerController(MockPowerController):
    """Mock power controller for network-based power management."""
    
    def __init__(self, device_name: str = "Network Device", **kwargs):
        super().__init__(device_name, "network", **kwargs)


class MockADBPowerController(MockPowerController):
    """Mock power controller for ADB-based power management."""
    
    def __init__(self, device_name: str = "ADB Device", **kwargs):
        super().__init__(device_name, "adb", **kwargs)


class MockIPMIPowerController(MockPowerController):
    """Mock power controller for IPMI-based power management."""
    
    def __init__(self, device_name: str = "IPMI Device", **kwargs):
        super().__init__(device_name, "ipmi", **kwargs)


# Backward compatibility aliases
PowerController = MockPowerController
SmartPlugController = MockSmartPlugController
NetworkPowerController = MockNetworkPowerController
ADBPowerController = MockADBPowerController
IPMIPowerController = MockIPMIPowerController 
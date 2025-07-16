"""
VirtualPyTest Controller Base Classes

to bMinimal base controller with only basic connection state.
Controllers implement their own specific functionality.
"""

from typing import Dict, Any, Optional, List
import time


class BaseController:
    """
    Minimal base controller with just connection state.
    Controllers implement their own specific methods as needed.
    """
    
    def __init__(self, controller_type: str, device_name: str = "Unknown Device"):
        self.controller_type = controller_type
        self.device_name = device_name
        self.is_connected = False
    
    def connect(self) -> bool:
        """Connect to the device/service. Optional - override if needed."""
        self.is_connected = True
        return True
    
    def disconnect(self) -> bool:
        """Disconnect from the device/service. Optional - override if needed."""
        self.is_connected = False
        return True


# Simplified interfaces for type hints only
# Controllers implement their own methods without forced inheritance

class RemoteControllerInterface(BaseController):
    """Type hint interface for remote controllers."""
    
    def __init__(self, device_name: str = "Unknown Device", device_type: str = "generic"):
        super().__init__("remote", device_name)
        self.device_type = device_type
    
    def execute_sequence(self, commands: List[Dict[str, Any]], retry_actions: List[Dict[str, Any]], final_wait_time: int = 0) -> bool:
        """
        Execute a sequence of commands with optional retry actions.
        
        Args:
            commands: List of command dictionaries with 'action', 'params'
            retry_actions: Retry actions to execute if main commands fail (can be empty/None)
            final_wait_time: Wait time in milliseconds after sequence completion
            
        Returns:
            bool: True if main commands succeeded OR retry actions succeeded
        """
        if not self.is_connected:
            print(f"Remote[{self.device_type.upper()}]: ERROR - Not connected to device")
            return False
            
        # Execute main commands
        main_success = self._execute_command_sequence(commands)
        
        # Only do retry if main failed AND retry_actions exist
        if not main_success and retry_actions:
            print(f"Remote[{self.device_type.upper()}]: Main sequence failed, executing retry actions")
            retry_success = self._execute_command_sequence(retry_actions)
            if retry_success:
                main_success = True
        
        # Handle final wait time
        if main_success and final_wait_time:
            self._handle_wait_time(final_wait_time, "sequence completion")
        
        return main_success
    
    def _handle_wait_time(self, wait_time: int, action_name: str = "action") -> None:
        """
        Handle wait time after action execution.
        
        Args:
            wait_time: Wait time in milliseconds
            action_name: Name of action for logging
        """
        if wait_time > 0:
            wait_seconds = wait_time / 1000.0
            print(f"Remote[{self.device_type.upper()}]: Waiting {wait_seconds}s after {action_name}")
            time.sleep(wait_seconds)


class AVControllerInterface(BaseController):
    """Type hint interface for AV controllers."""
    
    def __init__(self, device_name: str = "Unknown Device", capture_source: str = "HDMI"):
        super().__init__("av", device_name)
        self.capture_source = capture_source


class VerificationControllerInterface(BaseController):
    """Type hint interface for verification controllers."""
    
    def __init__(self, device_name: str = "Unknown Device", verification_type: str = "verification"):
        super().__init__("verification", device_name)
        self.verification_type = verification_type


class PowerControllerInterface(BaseController):
    """Type hint interface for power controllers."""
    
    def __init__(self, device_name: str = "Unknown Device"):
        super().__init__("power", device_name)
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
    
    def execute_sequence(self, commands: List[Dict[str, Any]], retry_actions: List[Dict[str, Any]]) -> bool:
        """
        Execute a sequence of commands with optional retry actions.
        
        Args:
            commands: List of command dictionaries with 'command', 'params', and optional 'delay'
            retry_actions: Retry actions to execute if main commands fail (can be empty/None)
        """
        if not self.is_connected:
            print(f"Remote[{self.device_type.upper()}]: ERROR - Not connected to device")
            return False
            
        print(f"Remote[{self.device_type.upper()}]: Executing sequence of {len(commands)} commands")
        
        # Execute main commands
        main_success = True
        for i, action in enumerate(commands):
            command = action.get('command')
            params = action.get('params', {})
            wait_time = params.get('wait_time', 0)  # Extract wait_time from params
            
            # Ensure wait_time is an integer (handle string inputs)
            try:
                wait_time = int(wait_time) if wait_time else 0
            except (ValueError, TypeError):
                wait_time = 0
            
            # Remove wait_time from params - base controller handles timing
            action_params = {k: v for k, v in params.items() if k != 'wait_time'}
            
            print(f"Remote[{self.device_type.upper()}]: Step {i+1}: {command}")
            
            success = self.execute_command(command, action_params)
            
            if not success:
                print(f"Remote[{self.device_type.upper()}]: Sequence failed at step {i+1}")
                main_success = False
                break
                
            # Handle wait time after each successful action
            if wait_time > 0:
                self._handle_wait_time(wait_time, f"command {command}")
        
        # Execute retry actions if main commands failed
        if not main_success and retry_actions:
            print(f"Remote[{self.device_type.upper()}]: Main commands failed, trying {len(retry_actions)} retry actions")
            retry_success = True  # Assume success unless a retry fails
            for i, retry_action in enumerate(retry_actions):
                command = retry_action.get('command')
                params = retry_action.get('params', {})
                wait_time = params.get('wait_time', 0)
                
                # Ensure wait_time is an integer (handle string inputs)
                try:
                    wait_time = int(wait_time) if wait_time else 0
                except (ValueError, TypeError):
                    wait_time = 0
                
                # Remove wait_time from params - base controller handles timing
                action_params = {k: v for k, v in params.items() if k != 'wait_time'}
                
                print(f"Remote[{self.device_type.upper()}]: Retry step {i+1}: {command}")
                
                success = self.execute_command(command, action_params)
                
                if not success:
                    print(f"Remote[{self.device_type.upper()}]: Retry action failed at step {i+1}")
                    retry_success = False
                    break  # Break on failure like main loop
                
                # Handle wait time after successful retry action
                if wait_time > 0:
                    self._handle_wait_time(wait_time, f"retry command {command}")
            
            # Set overall success if all retries completed successfully
            if retry_success:
                main_success = True
                
        result_msg = "succeeded" if main_success else "failed"
        print(f"Remote[{self.device_type.upper()}]: Sequence {result_msg}")
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
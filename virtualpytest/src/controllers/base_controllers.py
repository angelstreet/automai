"""
VirtualPyTest Controller Base Classes

This module defines abstract base classes for individual controller types.
Each controller type is completely independent and can be implemented
separately for different devices, providing maximum flexibility.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List, Union


class BaseController(ABC):
    """
    Base controller interface that all controllers must implement.
    Provides common connection and status functionality.
    """
    
    def __init__(self, controller_type: str, device_name: str = "Unknown Device"):
        self.controller_type = controller_type
        self.device_name = device_name
        self.is_connected = False
    
    @abstractmethod
    def connect(self) -> bool:
        """Connect to the device/service. Must be implemented by subclasses."""
        pass
    
    @abstractmethod
    def disconnect(self) -> bool:
        """Disconnect from the device/service. Must be implemented by subclasses."""
        pass
    
    @abstractmethod
    def get_status(self) -> Dict[str, Any]:
        """Get controller status information. Must be implemented by subclasses."""
        pass


class RemoteControllerInterface(BaseController):
    """
    Abstract interface for remote control functionality.
    
    Defines the interface that remote controllers must implement
    for device navigation and control. Each device can have its own
    implementation of this interface.
    """
    
    def __init__(self, device_name: str = "Unknown Device", device_type: str = "generic"):
        super().__init__("remote", device_name)
        self.device_type = device_type
    
    @abstractmethod
    def press_key(self, key: str) -> bool:
        """Press a key on the remote. Must be implemented by subclasses."""
        pass
    
    @abstractmethod
    def input_text(self, text: str) -> bool:
        """Input text on the device. Must be implemented by subclasses."""
        pass
    
    @abstractmethod
    def execute_sequence(self, commands: list) -> bool:
        """Execute a sequence of remote commands. Must be implemented by subclasses."""
        pass
    
    # Optional navigation methods with default implementations
    def navigate_up(self) -> bool:
        """Navigate up in the interface."""
        return self.press_key("UP")
    
    def navigate_down(self) -> bool:
        """Navigate down in the interface."""
        return self.press_key("DOWN")
    
    def navigate_left(self) -> bool:
        """Navigate left in the interface."""
        return self.press_key("LEFT")
    
    def navigate_right(self) -> bool:
        """Navigate right in the interface."""
        return self.press_key("RIGHT")
    
    def select(self) -> bool:
        """Select/confirm current item."""
        return self.press_key("OK")
    
    def back(self) -> bool:
        """Go back to previous screen."""
        return self.press_key("BACK")
    
    def home(self) -> bool:
        """Go to home screen."""
        return self.press_key("HOME")
    
    def menu(self) -> bool:
        """Open menu."""
        return self.press_key("MENU")
    
    # Optional media control methods
    def power(self) -> bool:
        """Toggle power."""
        return self.press_key("POWER")
    
    def volume_up(self) -> bool:
        """Increase volume."""
        return self.press_key("VOLUME_UP")
    
    def volume_down(self) -> bool:
        """Decrease volume."""
        return self.press_key("VOLUME_DOWN")
    
    def mute(self) -> bool:
        """Toggle mute."""
        return self.press_key("MUTE")
    
    def play_pause(self) -> bool:
        """Toggle play/pause."""
        return self.press_key("PLAY_PAUSE")
    
    def fast_forward(self) -> bool:
        """Fast forward."""
        return self.press_key("FAST_FORWARD")
    
    def rewind(self) -> bool:
        """Rewind."""
        return self.press_key("REWIND")
    
    # Optional app management methods
    def launch_app(self, package_name: str) -> bool:
        """
        Launch an app by package name.
        Default implementation - should be overridden by subclasses that support app management.
        
        Args:
            package_name: App package name (e.g., "com.example.app")
        """
        raise NotImplementedError("App management not supported by this controller")
    
    def close_app(self, package_name: str) -> bool:
        """
        Close/stop an app by package name.
        Default implementation - should be overridden by subclasses that support app management.
        
        Args:
            package_name: App package name (e.g., "com.example.app")
        """
        raise NotImplementedError("App management not supported by this controller")
    
    def kill_app(self, package_name: str) -> bool:
        """
        Kill an app by package name (alias for close_app).
        Default implementation calls close_app.
        
        Args:
            package_name: App package name (e.g., "com.example.app")
        """
        return self.close_app(package_name)


class AVControllerInterface(BaseController):
    """
    Abstract interface for audio/video capture and analysis.
    
    Defines the interface that A/V controllers must implement
    for media capture and analysis. Each device can have its own
    implementation of this interface.
    """
    
    def __init__(self, device_name: str = "Unknown Device", capture_source: str = "HDMI"):
        super().__init__("av", device_name)
        self.capture_source = capture_source
        self.is_capturing_video = False
        self.is_capturing_audio = False
        self.capture_session_id = None
    
    @abstractmethod
    def start_video_capture(self, resolution: str = "1920x1080", fps: int = 30) -> bool:
        """Start video capture. Must be implemented by subclasses."""
        pass
    
    @abstractmethod
    def stop_video_capture(self) -> bool:
        """Stop video capture. Must be implemented by subclasses."""
        pass
    
    @abstractmethod
    def capture_frame(self, filename: str = None) -> bool:
        """Capture a single video frame. Must be implemented by subclasses."""
        pass
    
    @abstractmethod
    def start_audio_capture(self, sample_rate: int = 44100, channels: int = 2) -> bool:
        """Start audio capture. Must be implemented by subclasses."""
        pass
    
    @abstractmethod
    def stop_audio_capture(self) -> bool:
        """Stop audio capture. Must be implemented by subclasses."""
        pass
    
    @abstractmethod
    def detect_audio_level(self) -> float:
        """Detect current audio level. Must be implemented by subclasses."""
        pass
    
    @abstractmethod
    def detect_silence(self, threshold: float = 5.0, duration: float = 2.0) -> bool:
        """Detect if audio is silent. Must be implemented by subclasses."""
        pass
    
    @abstractmethod
    def analyze_video_content(self, analysis_type: str = "motion") -> Dict[str, Any]:
        """Analyze video content. Must be implemented by subclasses."""
        pass
    
    @abstractmethod
    def wait_for_video_change(self, timeout: float = 10.0, threshold: float = 10.0) -> bool:
        """Wait for video content to change. Must be implemented by subclasses."""
        pass
    
    @abstractmethod
    def record_session(self, duration: float, filename: str = None) -> bool:
        """Record audio/video session. Must be implemented by subclasses."""
        pass
    

class VerificationControllerInterface(BaseController):
    """
    Abstract interface for verification and validation functionality.
    
    Defines the interface that verification controllers must implement
    for test validation. Each device can have its own implementation
    of this interface.
    """
    
    def __init__(self, device_name: str = "Unknown Device"):
        super().__init__("verification", device_name)
        self.verification_session_id = None
        self.verification_results = []
    
    # Common verification logging methods
    def _log_verification(self, verification_type: str, target: str, result: bool, params: Dict[str, Any]) -> None:
        """Log verification result for reporting. Common implementation."""
        log_entry = {
            "timestamp": __import__('time').time(),
            "type": verification_type,
            "target": target,
            "result": result,
            "params": params,
            "session_id": self.verification_session_id
        }
        self.verification_results.append(log_entry)
    
    def get_verification_results(self) -> List[Dict[str, Any]]:
        """Get all verification results from current session. Common implementation."""
        return self.verification_results.copy()
    
    def clear_verification_results(self) -> None:
        """Clear verification results. Common implementation."""
        self.verification_results.clear()


class PowerControllerInterface(BaseController):
    """
    Abstract interface for power management functionality.
    
    Defines the interface that power controllers must implement
    for device power control. Each device can have its own
    implementation of this interface.
    """
    
    def __init__(self, device_name: str = "Unknown Device", power_type: str = "generic"):
        super().__init__("power", device_name)
        self.power_type = power_type
        self.current_power_state = "unknown"
        self.power_session_id = None
    
    @abstractmethod
    def power_on(self, timeout: float = 30.0) -> bool:
        """Turn the device on. Must be implemented by subclasses."""
        pass
    
    @abstractmethod
    def power_off(self, force: bool = False, timeout: float = 30.0) -> bool:
        """Turn the device off. Must be implemented by subclasses."""
        pass
    
    @abstractmethod
    def reboot(self, timeout: float = 60.0) -> bool:
        """Restart the device. Must be implemented by subclasses."""
        pass
    
    @abstractmethod
    def get_power_status(self) -> Dict[str, Any]:
        """Get current power status. Must be implemented by subclasses."""
        pass

    # Optional power management methods with default implementations
    def soft_reboot(self, timeout: float = 60.0) -> bool:
        """Perform a soft reboot (graceful restart)."""
        return self.reboot(timeout)
    
    def hard_reboot(self, timeout: float = 60.0) -> bool:
        """Perform a hard reboot (forced restart)."""
        return self.power_off(force=True, timeout=15.0) and self.power_on(timeout=timeout-15.0)
    
    def wait_for_power_state(self, expected_state: str, timeout: float = 30.0) -> bool:
        """Wait for device to reach expected power state."""
        import time
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            status = self.get_power_status()
            current_state = status.get('power_state', 'unknown')
            
            if current_state == expected_state:
                return True
                
            time.sleep(1.0)
        
        return False
    
    def is_powered_on(self) -> bool:
        """Check if device is currently powered on."""
        status = self.get_power_status()
        return status.get('power_state', 'unknown') == 'on'
    
    def is_powered_off(self) -> bool:
        """Check if device is currently powered off."""
        status = self.get_power_status()
        return status.get('power_state', 'unknown') == 'off'


# Backward compatibility aliases
BaseRemoteController = RemoteControllerInterface
BaseAVController = AVControllerInterface
BaseVerificationController = VerificationControllerInterface
BasePowerController = PowerControllerInterface 
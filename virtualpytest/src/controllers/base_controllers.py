"""
VirtualPyTest Controller Base Classes

This module defines abstract base classes for all controller types.
These provide the interface contracts that must be implemented by both
mock controllers (for testing) and real controllers (for actual devices).
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List, Union


class BaseRemoteController(ABC):
    """
    Abstract base class for remote controllers.
    
    Defines the interface that all remote controllers must implement
    for device navigation and control.
    """
    
    def __init__(self, device_type: str = "generic", device_name: str = "Unknown Device"):
        self.device_type = device_type
        self.device_name = device_name
        self.is_connected = False
    
    @abstractmethod
    def connect(self) -> bool:
        """Connect to the device. Must be implemented by subclasses."""
        pass
    
    @abstractmethod
    def disconnect(self) -> bool:
        """Disconnect from the device. Must be implemented by subclasses."""
        pass
    
    @abstractmethod
    def press_key(self, key: str) -> bool:
        """Press a key on the remote. Must be implemented by subclasses."""
        pass
    
    @abstractmethod
    def input_text(self, text: str) -> bool:
        """Input text on the device. Must be implemented by subclasses."""
        pass
    
    # Navigation methods with default implementations using press_key
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
    
    @abstractmethod
    def execute_sequence(self, commands: list) -> bool:
        """Execute a sequence of remote commands. Must be implemented by subclasses."""
        pass
    
    @abstractmethod
    def get_status(self) -> Dict[str, Any]:
        """Get controller status information. Must be implemented by subclasses."""
        pass


class BaseAVController(ABC):
    """
    Abstract base class for audio/video controllers.
    
    Defines the interface that all A/V controllers must implement
    for media capture and analysis.
    """
    
    def __init__(self, device_name: str = "Unknown Device", capture_source: str = "HDMI"):
        self.device_name = device_name
        self.capture_source = capture_source
        self.is_connected = False
        self.is_capturing_video = False
        self.is_capturing_audio = False
        self.capture_session_id = None
    
    @abstractmethod
    def connect(self) -> bool:
        """Connect to the AV capture device. Must be implemented by subclasses."""
        pass
    
    @abstractmethod
    def disconnect(self) -> bool:
        """Disconnect from the AV capture device. Must be implemented by subclasses."""
        pass
    
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
    
    @abstractmethod
    def get_status(self) -> Dict[str, Any]:
        """Get controller status information. Must be implemented by subclasses."""
        pass


class BaseVerificationController(ABC):
    """
    Abstract base class for verification controllers.
    
    Defines the interface that all verification controllers must implement
    for test validation and verification.
    """
    
    def __init__(self, device_name: str = "Unknown Device"):
        self.device_name = device_name
        self.is_connected = False
        self.verification_session_id = None
        self.verification_results = []
    
    @abstractmethod
    def connect(self) -> bool:
        """Connect to the verification system. Must be implemented by subclasses."""
        pass
    
    @abstractmethod
    def disconnect(self) -> bool:
        """Disconnect from the verification system. Must be implemented by subclasses."""
        pass
    
    @abstractmethod
    def verify_image_appears(self, image_name: str, timeout: float = 10.0, confidence: float = 0.8) -> bool:
        """Verify that a specific image appears on screen. Must be implemented by subclasses."""
        pass
    
    @abstractmethod
    def verify_text_appears(self, text: str, timeout: float = 10.0, case_sensitive: bool = False) -> bool:
        """Verify that specific text appears on screen. Must be implemented by subclasses."""
        pass
    
    @abstractmethod
    def verify_element_exists(self, element_id: str, element_type: str = "any") -> bool:
        """Verify that a UI element exists. Must be implemented by subclasses."""
        pass
    
    @abstractmethod
    def verify_audio_playing(self, min_level: float = 10.0, duration: float = 2.0) -> bool:
        """Verify that audio is playing. Must be implemented by subclasses."""
        pass
    
    @abstractmethod
    def verify_video_playing(self, motion_threshold: float = 5.0, duration: float = 3.0) -> bool:
        """Verify that video is playing (motion detected). Must be implemented by subclasses."""
        pass
    
    @abstractmethod
    def verify_color_present(self, color: str, tolerance: float = 10.0) -> bool:
        """Verify that a specific color is present on screen. Must be implemented by subclasses."""
        pass
    
    @abstractmethod
    def verify_screen_state(self, expected_state: str, timeout: float = 5.0) -> bool:
        """Verify that the screen is in an expected state. Must be implemented by subclasses."""
        pass
    
    @abstractmethod
    def verify_performance_metric(self, metric_name: str, expected_value: float, tolerance: float = 10.0) -> bool:
        """Verify a performance metric. Must be implemented by subclasses."""
        pass
    
    @abstractmethod
    def wait_and_verify(self, verification_type: str, target: str, timeout: float = 10.0, **kwargs) -> bool:
        """Generic wait and verify method. Must be implemented by subclasses."""
        pass
    
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
    
    @abstractmethod
    def get_status(self) -> Dict[str, Any]:
        """Get controller status information. Must be implemented by subclasses."""
        pass


# Type aliases for backward compatibility and clarity
RemoteControllerInterface = BaseRemoteController
AVControllerInterface = BaseAVController
VerificationControllerInterface = BaseVerificationController 
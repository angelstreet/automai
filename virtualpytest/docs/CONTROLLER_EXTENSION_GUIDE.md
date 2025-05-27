# VirtualPyTest Controller Extension Guide

This guide explains how to extend the VirtualPyTest controller system to add new functionality, create custom device implementations, or integrate with real hardware.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Controller Interfaces](#controller-interfaces)
3. [Factory System](#factory-system)
4. [Extending Remote Controllers](#extending-remote-controllers)
5. [Extending AV Controllers](#extending-av-controllers)
6. [Extending Verification Controllers](#extending-verification-controllers)
7. [Extending Power Controllers](#extending-power-controllers)
8. [Creating Real Hardware Implementations](#creating-real-hardware-implementations)
9. [Device-Specific Controller Selection](#device-specific-controller-selection)
10. [Best Practices](#best-practices)
11. [Examples](#examples)

## Architecture Overview

The VirtualPyTest controller system follows a **separated, flexible architecture** where each controller type is completely independent:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Test Scripts                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                          Controller Factory                                 │
│                    (Device-Specific Selection)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ Remote Controllers │ AV Controllers │ Verification Controllers │ Power Controllers │
│                    │                │                          │                   │
│ ┌─────────────────┐│ ┌─────────────┐│ ┌─────────────────────┐ │ ┌─────────────────┐│
│ │ MockRemote      ││ │ MockAV      ││ │ MockVerification    │ │ │ MockPower       ││
│ │ AndroidTVRemote ││ │ HDMICapture ││ │ OCRVerification     │ │ │ SmartPlugPower  ││
│ │ AppleTVRemote   ││ │ ADBCapture  ││ │ ImageVerification   │ │ │ NetworkPower    ││
│ │ STBRemote       ││ │ CameraCapture││ │ AIVerification      │ │ │ ADBPower        ││
│ └─────────────────┘│ └─────────────┘│ └─────────────────────┘ │ │ IPMIPower       ││
│                    │                │                          │ └─────────────────┘│
├─────────────────────────────────────────────────────────────────────────────┤
│                            Abstract Interfaces                             │
│ RemoteControllerInterface │ AVControllerInterface │ VerificationControllerInterface │ PowerControllerInterface │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Benefits

- **Complete Separation**: Each controller type is independent
- **Device-Specific Selection**: Choose different implementations per device
- **Flexible Extension**: Add new implementations without affecting others
- **Mix and Match**: Combine different controller types as needed

### Key Components

- **Controller Interfaces**: Abstract base classes defining contracts
- **Controller Factory**: Creates controller instances based on type/device
- **Device Controller Sets**: Manages complete controller sets per device
- **Controller Registry**: Maps controller types to implementations

## Controller Interfaces

### BaseController

All controllers inherit from `BaseController` which provides common functionality:

```python
class BaseController(ABC):
    def __init__(self, controller_type: str, device_name: str = "Unknown Device"):
        self.controller_type = controller_type
        self.device_name = device_name
        self.is_connected = False
    
    @abstractmethod
    def connect(self) -> bool: pass
    
    @abstractmethod
    def disconnect(self) -> bool: pass
    
    @abstractmethod
    def get_status(self) -> Dict[str, Any]: pass
```

### RemoteControllerInterface

Defines the interface for device navigation and control:

**Required Abstract Methods:**
- `press_key(key: str)` - Send key press command
- `input_text(text: str)` - Send text input
- `execute_sequence(commands: list)` - Execute command sequence

**Provided Default Methods:**
- Navigation methods (`navigate_up()`, `navigate_down()`, etc.)
- Media control methods (`play_pause()`, `volume_up()`, etc.)
- System control methods (`home()`, `back()`, `menu()`, etc.)

### AVControllerInterface

Defines the interface for audio/video capture and analysis:

**Required Abstract Methods:**
- `start_video_capture()` / `stop_video_capture()` - Video capture control
- `capture_frame()` - Single frame capture
- `start_audio_capture()` / `stop_audio_capture()` - Audio capture control
- `detect_audio_level()` - Audio level detection
- `detect_silence()` - Silence detection
- `analyze_video_content()` - Video content analysis
- `wait_for_video_change()` - Video change detection
- `record_session()` - Session recording

### VerificationControllerInterface

Defines the interface for test validation and verification:

**Required Abstract Methods:**
- `verify_image_appears()` - Image verification
- `verify_text_appears()` - Text verification
- `verify_element_exists()` - UI element verification
- `verify_audio_playing()` - Audio playback verification
- `verify_video_playing()` - Video playback verification
- `verify_color_present()` - Color verification
- `verify_screen_state()` - Screen state verification
- `verify_performance_metric()` - Performance verification
- `wait_and_verify()` - Generic verification with timeout

**Provided Common Methods:**
- `_log_verification()` - Log verification results
- `get_verification_results()` - Retrieve verification history
- `clear_verification_results()` - Clear verification history

### PowerControllerInterface

Defines the interface for power management and control:

**Required Abstract Methods:**
- `power_on(timeout: float = 30.0)` - Turn device on
- `power_off(force: bool = False, timeout: float = 30.0)` - Turn device off
- `reboot(timeout: float = 60.0)` - Restart device
- `get_power_status()` - Get current power status

**Provided Default Methods:**
- `soft_reboot()` - Graceful restart
- `hard_reboot()` - Forced restart (power off + power on)
- `wait_for_power_state()` - Wait for specific power state
- `is_powered_on()` - Check if device is on
- `is_powered_off()` - Check if device is off

## Factory System

The `ControllerFactory` provides flexible controller creation:

### Creating Individual Controllers

```python
from controllers import ControllerFactory

# Create a remote controller
remote = ControllerFactory.create_remote_controller(
    device_type="android_tv",
    device_name="Living Room TV"
)

# Create an AV controller
av = ControllerFactory.create_av_controller(
    capture_type="hdmi",
    device_name="Living Room TV",
    capture_source="HDMI1"
)

# Create a verification controller
verification = ControllerFactory.create_verification_controller(
    verification_type="ocr",
    device_name="Living Room TV"
)

# Create a power controller
power = ControllerFactory.create_power_controller(
    power_type="smart_plug",
    device_name="Living Room TV"
)
```

### Creating Complete Device Controller Sets

```python
from controllers import DeviceControllerSet, create_device_controllers

# Method 1: Using DeviceControllerSet directly
controllers = DeviceControllerSet(
    device_name="Android TV",
    remote_type="android_tv",
    av_type="adb",
    verification_type="ocr",
    power_type="adb"
)

# Method 2: Using convenience function with device defaults
controllers = create_device_controllers(
    device_name="Android TV",
    device_type="android_tv"  # Uses predefined defaults
)

# Method 3: Override specific controller types
controllers = create_device_controllers(
    device_name="Custom Device",
    device_type="android_tv",
    verification_type="ai",  # Override default verification
    power_type="smart_plug"  # Override default power
)
```

### Registering New Controller Implementations

```python
from controllers import ControllerFactory

# Register a new power controller implementation
ControllerFactory.register_controller(
    controller_type="power",
    implementation_name="custom_smart_plug",
    controller_class=CustomSmartPlugController
)

# Now you can use it
power = ControllerFactory.create_power_controller(
    power_type="custom_smart_plug",
    device_name="Custom Device"
)
```

## Extending Remote Controllers

### Creating a New Remote Controller

```python
from controllers.base_controllers import RemoteControllerInterface
import your_device_library

class CustomSTBController(RemoteControllerInterface):
    """Controller for Custom Set-Top Box via network API."""

    def __init__(self, device_name: str = "Custom STB", device_type: str = "custom_stb", **kwargs):
        super().__init__(device_name, device_type)
        self.stb_ip = kwargs.get('ip_address', '192.168.1.100')
        self.api_port = kwargs.get('port', 8080)
        self.device_client = None

    def connect(self) -> bool:
        """Connect to the STB via network API."""
        try:
            self.device_client = your_device_library.connect(self.stb_ip, self.api_port)
            self.is_connected = True
            print(f"Remote[{self.device_type.upper()}]: Connected to {self.device_name} at {self.stb_ip}")
            return True
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Connection failed: {e}")
            return False

    def disconnect(self) -> bool:
        """Disconnect from the STB."""
        if self.device_client:
            self.device_client.close()
            self.device_client = None
        self.is_connected = False
        print(f"Remote[{self.device_type.upper()}]: Disconnected")
        return True

    def press_key(self, key: str) -> bool:
        """Send key press to STB."""
        if not self.is_connected:
            print(f"Remote[{self.device_type.upper()}]: ERROR - Not connected")
            return False

        try:
            # Map generic keys to device-specific codes
            key_mapping = {
                "UP": "DPAD_UP",
                "DOWN": "DPAD_DOWN",
                "LEFT": "DPAD_LEFT",
                "RIGHT": "DPAD_RIGHT",
                "OK": "ENTER",
                "BACK": "BACK_BUTTON",
            }

            device_key = key_mapping.get(key, key)
            self.device_client.send_key(device_key)
            print(f"Remote[{self.device_type.upper()}]: Pressed {key} (mapped to {device_key})")
            return True
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Key press failed: {e}")
            return False

    def input_text(self, text: str) -> bool:
        """Send text input to STB."""
        if not self.is_connected:
            return False

        try:
            self.device_client.send_text(text)
            print(f"Remote[{self.device_type.upper()}]: Sent text: '{text}'")
            return True
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Text input failed: {e}")
            return False

    def execute_sequence(self, commands: list) -> bool:
        """Execute a sequence of commands."""
        if not self.is_connected:
            return False

        for i, command in enumerate(commands):
            action = command.get('action')
            params = command.get('params', {})
            delay = command.get('delay', 0.5)

            print(f"Remote[{self.device_type.upper()}]: Step {i+1}: {action}")

            if action == 'press_key':
                self.press_key(params.get('key', 'OK'))
            elif action == 'input_text':
                self.input_text(params.get('text', ''))

            if delay > 0 and i < len(commands) - 1:
                time.sleep(delay)

        return True

    def get_status(self) -> Dict[str, Any]:
        """Get controller status."""
        return {
            'controller_type': self.controller_type,
            'device_type': self.device_type,
            'device_name': self.device_name,
            'stb_ip': self.stb_ip,
            'api_port': self.api_port,
            'connected': self.is_connected,
            'capabilities': ['navigation', 'text_input', 'custom_features']
        }

    # Add custom methods specific to your device
    def tune_to_channel(self, channel_number: int) -> bool:
        """Custom STB-specific functionality."""
        if not self.is_connected:
            return False

        try:
            self.device_client.tune_channel(channel_number)
            print(f"Remote[{self.device_type.upper()}]: Tuned to channel {channel_number}")
            return True
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Channel tune failed: {e}")
            return False
```

### Registering and Using the New Controller

```python
# Register the new controller
from controllers import ControllerFactory
ControllerFactory.register_controller("remote", "custom_stb", CustomSTBController)

# Use it in your tests
remote = ControllerFactory.create_remote_controller(
    device_type="custom_stb",
    device_name="Living Room STB",
    ip_address="192.168.1.100",
    port=8080
)

remote.connect()
remote.press_key("HOME")
remote.tune_to_channel(101)  # Custom method
remote.disconnect()
```

## Extending AV Controllers

### Creating a Custom AV Controller

```python
from controllers.base_controllers import AVControllerInterface
import cv2
import numpy as np

class WebcamAVController(AVControllerInterface):
    """AV Controller for webcam capture."""

    def __init__(self, device_name: str = "Webcam", capture_source: str = "Camera", **kwargs):
        super().__init__(device_name, capture_source)
        self.camera_index = kwargs.get('camera_index', 0)
        self.video_capture = None
        self.current_frame = None

    def connect(self) -> bool:
        """Connect to webcam."""
        try:
            self.video_capture = cv2.VideoCapture(self.camera_index)
            if not self.video_capture.isOpened():
                raise Exception("Could not open webcam")

            self.is_connected = True
            print(f"AV[{self.capture_source}]: Connected to camera {self.camera_index}")
            return True
        except Exception as e:
            print(f"AV[{self.capture_source}]: Connection failed: {e}")
            return False

    def disconnect(self) -> bool:
        """Disconnect from webcam."""
        if self.video_capture:
            self.video_capture.release()
            self.video_capture = None

        self.is_connected = False
        print(f"AV[{self.capture_source}]: Disconnected")
        return True

    def start_video_capture(self, resolution: str = "1920x1080", fps: int = 30) -> bool:
        """Start video capture."""
        if not self.is_connected:
            return False

        try:
            width, height = map(int, resolution.split('x'))
            self.video_capture.set(cv2.CAP_PROP_FRAME_WIDTH, width)
            self.video_capture.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
            self.video_capture.set(cv2.CAP_PROP_FPS, fps)

            self.is_capturing_video = True
            self.capture_session_id = f"webcam_{int(time.time())}"
            print(f"AV[{self.capture_source}]: Started capture at {resolution}@{fps}fps")
            return True
        except Exception as e:
            print(f"AV[{self.capture_source}]: Failed to start capture: {e}")
            return False

    def stop_video_capture(self) -> bool:
        """Stop video capture."""
        self.is_capturing_video = False
        self.capture_session_id = None
        print(f"AV[{self.capture_source}]: Stopped video capture")
        return True

    def capture_frame(self, filename: str = None) -> bool:
        """Capture a single frame."""
        if not self.is_connected:
            return False

        try:
            ret, frame = self.video_capture.read()
            if not ret:
                print(f"AV[{self.capture_source}]: Failed to capture frame")
                return False

            self.current_frame = frame

            if filename:
                cv2.imwrite(filename, frame)
                print(f"AV[{self.capture_source}]: Frame saved to {filename}")

            # Analyze frame
            brightness = np.mean(frame)
            print(f"AV[{self.capture_source}]: Frame captured - Brightness: {brightness:.1f}")
            return True
        except Exception as e:
            print(f"AV[{self.capture_source}]: Frame capture failed: {e}")
            return False

    def analyze_video_content(self, analysis_type: str = "motion") -> Dict[str, Any]:
        """Analyze video content."""
        if not self.is_connected or self.current_frame is None:
            return {}

        try:
            if analysis_type == "motion":
                gray = cv2.cvtColor(self.current_frame, cv2.COLOR_BGR2GRAY)
                motion_score = np.std(gray)

                return {
                    "motion_detected": motion_score > 10,
                    "motion_intensity": float(motion_score),
                    "analysis_type": "motion"
                }

            elif analysis_type == "brightness":
                brightness = np.mean(self.current_frame)
                return {
                    "brightness": float(brightness),
                    "analysis_type": "brightness"
                }

        except Exception as e:
            print(f"AV[{self.capture_source}]: Analysis failed: {e}")
            return {"error": str(e)}

    # Implement other required abstract methods...
    def start_audio_capture(self, sample_rate: int = 44100, channels: int = 2) -> bool:
        # Audio capture implementation
        print(f"AV[{self.capture_source}]: Audio capture not supported for webcam")
        return False

    def stop_audio_capture(self) -> bool:
        return False

    def detect_audio_level(self) -> float:
        return 0.0

    def detect_silence(self, threshold: float = 5.0, duration: float = 2.0) -> bool:
        return True

    def wait_for_video_change(self, timeout: float = 10.0, threshold: float = 10.0) -> bool:
        # Video change detection implementation
        return True

    def record_session(self, duration: float, filename: str = None) -> bool:
        # Session recording implementation
        return True

    def get_status(self) -> Dict[str, Any]:
        """Get controller status."""
        return {
            'controller_type': self.controller_type,
            'device_name': self.device_name,
            'capture_source': self.capture_source,
            'camera_index': self.camera_index,
            'connected': self.is_connected,
            'capturing_video': self.is_capturing_video,
            'capturing_audio': self.is_capturing_audio,
            'session_id': self.capture_session_id,
            'capabilities': ['video_capture', 'frame_analysis', 'motion_detection']
        }
```

## Extending Verification Controllers

### Creating a Custom Verification Controller

```python
from controllers.base_controllers import VerificationControllerInterface
import pytesseract
from PIL import Image

class OCRVerificationController(VerificationControllerInterface):
    """Verification controller with OCR capabilities."""

    def __init__(self, device_name: str = "OCR Verifier", **kwargs):
        super().__init__(device_name)
        self.ocr_engine = None
        self.screenshot_source = kwargs.get('screenshot_source', None)

    def connect(self) -> bool:
        """Connect to OCR verification system."""
        try:
            self.ocr_engine = pytesseract
            self.is_connected = True
            self.verification_session_id = f"ocr_{int(time.time())}"
            print(f"Verify[{self.device_name}]: Connected - Session: {self.verification_session_id}")
            return True
        except Exception as e:
            print(f"Verify[{self.device_name}]: Connection failed: {e}")
            return False

    def disconnect(self) -> bool:
        """Disconnect from OCR verification system."""
        self.is_connected = False
        self.verification_session_id = None
        print(f"Verify[{self.device_name}]: Disconnected")
        return True

    def verify_text_appears(self, text: str, timeout: float = 10.0, case_sensitive: bool = False) -> bool:
        """Verify text appears using OCR."""
        if not self.is_connected:
            return False

        print(f"Verify[{self.device_name}]: Looking for text '{text}' using OCR")

        try:
            screenshot = self._capture_screenshot()
            if screenshot is None:
                return False

            extracted_text = pytesseract.image_to_string(screenshot)

            if case_sensitive:
                found = text in extracted_text
            else:
                found = text.lower() in extracted_text.lower()

            if found:
                print(f"Verify[{self.device_name}]: Text '{text}' found in OCR results")
            else:
                print(f"Verify[{self.device_name}]: Text '{text}' not found in OCR results")

            self._log_verification("ocr_text_appears", text, found, {
                "case_sensitive": case_sensitive,
                "extracted_text_length": len(extracted_text)
            })

            return found

        except Exception as e:
            print(f"Verify[{self.device_name}]: OCR verification failed: {e}")
            return False

    def verify_text_at_coordinates(self, text: str, x: int, y: int, width: int, height: int) -> bool:
        """Verify text appears at specific coordinates."""
        if not self.is_connected:
            return False

        try:
            screenshot = self._capture_screenshot()
            if screenshot is None:
                return False

            region = screenshot.crop((x, y, x + width, y + height))
            extracted_text = pytesseract.image_to_string(region)
            found = text.lower() in extracted_text.lower()

            print(f"Verify[{self.device_name}]: Text '{text}' at ({x},{y}) - {'Found' if found else 'Not found'}")

            self._log_verification("ocr_text_at_coordinates", text, found, {
                "coordinates": {"x": x, "y": y, "width": width, "height": height},
                "extracted_text": extracted_text.strip()
            })

            return found

        except Exception as e:
            print(f"Verify[{self.device_name}]: Coordinate verification failed: {e}")
            return False

    def _capture_screenshot(self) -> Image:
        """Capture screenshot for OCR analysis."""
        try:
            if self.screenshot_source:
                # Use provided screenshot source
                return self.screenshot_source.capture_frame()
            else:
                # Fallback to system screenshot
                import pyautogui
                screenshot = pyautogui.screenshot()
                return screenshot
        except Exception as e:
            print(f"Verify[{self.device_name}]: Screenshot capture failed: {e}")
            return None

    # Implement other required abstract methods...
    def verify_image_appears(self, image_name: str, timeout: float = 10.0, confidence: float = 0.8) -> bool:
        # Template matching implementation
        pass

    def verify_element_exists(self, element_id: str, element_type: str = "any") -> bool:
        # UI element verification implementation
        pass

    # ... implement other abstract methods

    def get_status(self) -> Dict[str, Any]:
        """Get controller status."""
        return {
            'controller_type': self.controller_type,
            'device_name': self.device_name,
            'connected': self.is_connected,
            'session_id': self.verification_session_id,
            'verification_count': len(self.verification_results),
            'capabilities': [
                'ocr_verification', 'text_verification', 'coordinate_verification'
            ]
        }
```

## Extending Power Controllers

### Creating a Custom Power Controller

```python
from controllers.base_controllers import PowerControllerInterface
import requests
import time

class SmartPlugPowerController(PowerControllerInterface):
    """Power controller for smart plug devices via HTTP API."""

    def __init__(self, device_name: str = "Smart Plug", power_type: str = "smart_plug", **kwargs):
        super().__init__(device_name, power_type)
        self.plug_ip = kwargs.get('ip_address', '192.168.1.100')
        self.api_port = kwargs.get('port', 80)
        self.username = kwargs.get('username', 'admin')
        self.password = kwargs.get('password', 'admin')
        self.base_url = f"http://{self.plug_ip}:{self.api_port}/api"

    def connect(self) -> bool:
        """Connect to smart plug API."""
        try:
            response = requests.get(
                f"{self.base_url}/status",
                auth=(self.username, self.password),
                timeout=5
            )
            
            if response.status_code == 200:
                self.is_connected = True
                self.power_session_id = f"smartplug_{int(time.time())}"
                
                # Get initial power state
                status_data = response.json()
                self.current_power_state = "on" if status_data.get('relay_state') else "off"
                
                print(f"Power[{self.power_type.upper()}]: Connected to {self.device_name} at {self.plug_ip}")
                print(f"Power[{self.power_type.upper()}]: Initial state: {self.current_power_state}")
                return True
            else:
                print(f"Power[{self.power_type.upper()}]: Connection failed - HTTP {response.status_code}")
                return False

        except Exception as e:
            print(f"Power[{self.power_type.upper()}]: Connection error: {e}")
            return False

    def disconnect(self) -> bool:
        """Disconnect from smart plug."""
        self.is_connected = False
        self.power_session_id = None
        print(f"Power[{self.power_type.upper()}]: Disconnected from {self.device_name}")
        return True

    def power_on(self, timeout: float = 30.0) -> bool:
        """Turn the smart plug on."""
        if not self.is_connected:
            print(f"Power[{self.power_type.upper()}]: ERROR - Not connected")
            return False

        if self.current_power_state == "on":
            print(f"Power[{self.power_type.upper()}]: Device already powered on")
            return True

        try:
            print(f"Power[{self.power_type.upper()}]: Turning on {self.device_name}")
            
            response = requests.post(
                f"{self.base_url}/relay",
                json={"state": True},
                auth=(self.username, self.password),
                timeout=10
            )

            if response.status_code == 200:
                self.current_power_state = "on"
                print(f"Power[{self.power_type.upper()}]: Device powered on successfully")
                
                # Wait for device to boot up
                if timeout > 0:
                    print(f"Power[{self.power_type.upper()}]: Waiting for device boot ({timeout}s)")
                    time.sleep(min(timeout, 5.0))  # Don't wait full time in example
                
                return True
            else:
                print(f"Power[{self.power_type.upper()}]: Power on failed - HTTP {response.status_code}")
                return False

        except Exception as e:
            print(f"Power[{self.power_type.upper()}]: Power on error: {e}")
            return False

    def power_off(self, force: bool = False, timeout: float = 30.0) -> bool:
        """Turn the smart plug off."""
        if not self.is_connected:
            print(f"Power[{self.power_type.upper()}]: ERROR - Not connected")
            return False

        if self.current_power_state == "off":
            print(f"Power[{self.power_type.upper()}]: Device already powered off")
            return True

        try:
            shutdown_type = "forced" if force else "graceful"
            print(f"Power[{self.power_type.upper()}]: Turning off {self.device_name} ({shutdown_type})")
            
            # For graceful shutdown, we might send a shutdown command to the device first
            if not force:
                print(f"Power[{self.power_type.upper()}]: Sending graceful shutdown signal")
                # Send shutdown command to device (implementation depends on device)
                time.sleep(2.0)  # Wait for graceful shutdown
            
            response = requests.post(
                f"{self.base_url}/relay",
                json={"state": False},
                auth=(self.username, self.password),
                timeout=10
            )

            if response.status_code == 200:
                self.current_power_state = "off"
                print(f"Power[{self.power_type.upper()}]: Device powered off successfully")
                return True
            else:
                print(f"Power[{self.power_type.upper()}]: Power off failed - HTTP {response.status_code}")
                return False

        except Exception as e:
            print(f"Power[{self.power_type.upper()}]: Power off error: {e}")
            return False

    def reboot(self, timeout: float = 60.0) -> bool:
        """Reboot the device by cycling power."""
        if not self.is_connected:
            print(f"Power[{self.power_type.upper()}]: ERROR - Not connected")
            return False

        print(f"Power[{self.power_type.upper()}]: Rebooting {self.device_name}")

        # Power off first
        if not self.power_off(force=False, timeout=15.0):
            print(f"Power[{self.power_type.upper()}]: Reboot failed - could not power off")
            return False

        # Wait a moment between power off and on
        print(f"Power[{self.power_type.upper()}]: Waiting before power on...")
        time.sleep(2.0)

        # Power back on
        if not self.power_on(timeout=timeout-17.0):
            print(f"Power[{self.power_type.upper()}]: Reboot failed - could not power on")
            return False

        print(f"Power[{self.power_type.upper()}]: Reboot completed successfully")
        return True

    def get_power_status(self) -> Dict[str, Any]:
        """Get current power status from smart plug."""
        if not self.is_connected:
            return {
                'power_state': 'unknown',
                'connected': False,
                'error': 'Not connected to smart plug'
            }

        try:
            response = requests.get(
                f"{self.base_url}/status",
                auth=(self.username, self.password),
                timeout=5
            )

            if response.status_code == 200:
                data = response.json()
                
                # Update current state from actual device
                self.current_power_state = "on" if data.get('relay_state') else "off"
                
                return {
                    'power_state': self.current_power_state,
                    'device_name': self.device_name,
                    'power_type': self.power_type,
                    'connected': self.is_connected,
                    'session_id': self.power_session_id,
                    'plug_ip': self.plug_ip,
                    'relay_state': data.get('relay_state', False),
                    'power_consumption_watts': data.get('power', 0),
                    'voltage': data.get('voltage', 0),
                    'current_amps': data.get('current', 0),
                    'uptime_seconds': data.get('uptime', 0),
                    'temperature_celsius': data.get('temperature', None),
                    'capabilities': [
                        'power_on', 'power_off', 'reboot', 'power_monitoring',
                        'energy_monitoring', 'remote_control'
                    ]
                }
            else:
                return {
                    'power_state': 'unknown',
                    'connected': self.is_connected,
                    'error': f'HTTP {response.status_code}'
                }

        except Exception as e:
            print(f"Power[{self.power_type.upper()}]: Status check failed: {e}")
            return {
                'power_state': 'unknown',
                'connected': self.is_connected,
                'error': str(e)
            }

    def get_status(self) -> Dict[str, Any]:
        """Get controller status information."""
        return {
            'controller_type': self.controller_type,
            'device_name': self.device_name,
            'power_type': self.power_type,
            'connected': self.is_connected,
            'current_power_state': self.current_power_state,
            'session_id': self.power_session_id,
            'plug_ip': self.plug_ip,
            'api_port': self.api_port,
            'capabilities': [
                'power_on', 'power_off', 'reboot', 'soft_reboot',
                'hard_reboot', 'status_monitoring', 'power_monitoring',
                'remote_control', 'energy_monitoring'
            ]
        }

    # Custom methods specific to smart plugs
    def get_energy_consumption(self) -> Dict[str, float]:
        """Get energy consumption data."""
        if not self.is_connected:
            return {}

        try:
            response = requests.get(
                f"{self.base_url}/energy",
                auth=(self.username, self.password),
                timeout=5
            )

            if response.status_code == 200:
                data = response.json()
                print(f"Power[{self.power_type.upper()}]: Energy data retrieved")
                return {
                    'total_kwh': data.get('total', 0),
                    'today_kwh': data.get('today', 0),
                    'current_watts': data.get('power', 0),
                    'voltage': data.get('voltage', 0),
                    'current_amps': data.get('current', 0)
                }
            else:
                print(f"Power[{self.power_type.upper()}]: Energy data failed - HTTP {response.status_code}")
                return {}

        except Exception as e:
            print(f"Power[{self.power_type.upper()}]: Energy data error: {e}")
            return {}

    def set_power_schedule(self, schedule: Dict[str, Any]) -> bool:
        """Set power on/off schedule."""
        if not self.is_connected:
            return False

        try:
            response = requests.post(
                f"{self.base_url}/schedule",
                json=schedule,
                auth=(self.username, self.password),
                timeout=10
            )

            if response.status_code == 200:
                print(f"Power[{self.power_type.upper()}]: Schedule set successfully")
                return True
            else:
                print(f"Power[{self.power_type.upper()}]: Schedule failed - HTTP {response.status_code}")
                return False

        except Exception as e:
            print(f"Power[{self.power_type.upper()}]: Schedule error: {e}")
            return False
```

### Registering and Using the New Power Controller

```python
# Register the new controller
from controllers import ControllerFactory
ControllerFactory.register_controller("power", "smart_plug_http", SmartPlugPowerController)

# Use it in your tests
power = ControllerFactory.create_power_controller(
    power_type="smart_plug_http",
    device_name="Living Room TV",
    ip_address="192.168.1.100",
    username="admin",
    password="secret123"
)

power.connect()
power.power_on(timeout=30.0)

# Check power status
status = power.get_power_status()
print(f"Device power state: {status['power_state']}")
print(f"Power consumption: {status['power_consumption_watts']}W")

# Get energy data (custom method)
energy = power.get_energy_consumption()
print(f"Today's consumption: {energy['today_kwh']} kWh")

# Reboot the device
power.reboot(timeout=60.0)
power.disconnect()
```

## Device-Specific Controller Selection

### Predefined Device Configurations

The system includes predefined configurations for common device types:

```python
device_defaults = {
    'android_tv': {
        'remote_type': 'android_tv',
        'av_type': 'adb',
        'verification_type': 'ocr'
    },
    'apple_tv': {
        'remote_type': 'apple_tv',
        'av_type': 'hdmi',
        'verification_type': 'image'
    },
    'fire_tv': {
        'remote_type': 'fire_tv',
        'av_type': 'hdmi',
        'verification_type': 'ocr'
    },
    'stb': {
        'remote_type': 'stb_eos',
        'av_type': 'hdmi',
        'verification_type': 'image'
    }
}
```

### Custom Device Configurations

```python
# Create a custom device configuration
controllers = create_device_controllers(
    device_name="Smart TV",
    device_type="custom",
    remote_type="samsung_tv",
    av_type="network_capture",
    verification_type="ai_vision"
)

# Or configure each controller individually
controllers = DeviceControllerSet(
    device_name="Test Device",
    remote_type="mock",           # Use mock for remote
    av_type="real_hdmi",          # Use real HDMI capture
    verification_type="ocr",      # Use OCR verification
    # Pass device-specific parameters
    remote={'ip_address': '192.168.1.100'},
    av={'capture_card': 'Elgato HD60'},
    verification={'ocr_engine': 'tesseract'}
)
```

### Runtime Controller Selection

```python
def setup_test_environment(device_config):
    """Setup controllers based on test configuration."""
    
    # Determine controller types based on test requirements
    if device_config['test_type'] == 'performance':
        av_type = 'high_speed_capture'
        verification_type = 'performance_metrics'
    elif device_config['test_type'] == 'ui_automation':
        av_type = 'screenshot_capture'
        verification_type = 'image_matching'
    else:
        av_type = 'mock'
        verification_type = 'mock'
    
    controllers = DeviceControllerSet(
        device_name=device_config['device_name'],
        remote_type=device_config['remote_type'],
        av_type=av_type,
        verification_type=verification_type
    )
    
    return controllers
```

## Best Practices

### 1. Controller Independence

Keep controllers completely independent:

```python
# ✅ Good: Controllers are independent
class MyRemoteController(RemoteControllerInterface):
    def __init__(self, device_name: str, device_type: str, **kwargs):
        super().__init__(device_name, device_type)
        # Only remote-specific initialization

# ❌ Bad: Mixing controller responsibilities
class MyController(RemoteControllerInterface, AVControllerInterface):
    # Don't mix different controller types in one class
```

### 2. Proper Error Handling

Always implement proper error handling:

```python
def connect(self) -> bool:
    try:
        # Connection logic
        self.is_connected = True
        return True
    except ConnectionError as e:
        print(f"Controller[{self.device_type}]: Connection failed: {e}")
        return False
    except Exception as e:
        print(f"Controller[{self.device_type}]: Unexpected error: {e}")
        return False
```

### 3. Consistent Logging

Use consistent logging patterns:

```python
def press_key(self, key: str) -> bool:
    if not self.is_connected:
        print(f"Remote[{self.device_type.upper()}]: ERROR - Not connected")
        return False

    print(f"Remote[{self.device_type.upper()}]: Pressing key '{key}'")
    # Implementation
    print(f"Remote[{self.device_type.upper()}]: Key '{key}' pressed successfully")
    return True
```

### 4. Resource Management

Always clean up resources properly:

```python
def disconnect(self) -> bool:
    try:
        if hasattr(self, 'device_connection') and self.device_connection:
            self.device_connection.close()
        if hasattr(self, 'capture_session') and self.capture_session:
            self.capture_session.stop()

        self.is_connected = False
        return True
    except Exception as e:
        print(f"Controller: Cleanup error: {e}")
        return False
```

### 5. Configuration Management

Use configuration objects for complex setups:

```python
class ControllerConfig:
    def __init__(self):
        self.timeout = 10.0
        self.retry_count = 3
        self.log_level = "INFO"
        self.device_specific_settings = {}

class CustomController(RemoteControllerInterface):
    def __init__(self, device_name: str, device_type: str, config: ControllerConfig = None, **kwargs):
        super().__init__(device_name, device_type)
        self.config = config or ControllerConfig()
```

## Examples

### Complete Example: Real Android TV Implementation

```python
from controllers.base_controllers import RemoteControllerInterface
import subprocess
import time

class RealAndroidTVController(RemoteControllerInterface):
    """Real Android TV controller using ADB."""

    def __init__(self, device_name: str = "Android TV", device_type: str = "android_tv", **kwargs):
        super().__init__(device_name, device_type)
        self.device_ip = kwargs.get('device_ip', '192.168.1.100')
        self.adb_device = f"{self.device_ip}:5555"

    def connect(self) -> bool:
        """Connect to Android TV via ADB."""
        try:
            result = subprocess.run(
                ["adb", "connect", self.adb_device],
                capture_output=True, text=True, timeout=10
            )

            if "connected" in result.stdout:
                self.is_connected = True
                print(f"Remote[{self.device_type.upper()}]: Connected to {self.device_name} at {self.device_ip}")
                return True
            else:
                print(f"Remote[{self.device_type.upper()}]: Connection failed: {result.stdout}")
                return False

        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Connection error: {e}")
            return False

    def disconnect(self) -> bool:
        """Disconnect from Android TV."""
        try:
            subprocess.run(
                ["adb", "disconnect", self.adb_device],
                capture_output=True, text=True, timeout=5
            )
            self.is_connected = False
            print(f"Remote[{self.device_type.upper()}]: Disconnected from {self.device_name}")
            return True
        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Disconnect error: {e}")
            return False

    def press_key(self, key: str) -> bool:
        """Send key press via ADB."""
        if not self.is_connected:
            return False

        try:
            key_mapping = {
                "UP": "KEYCODE_DPAD_UP",
                "DOWN": "KEYCODE_DPAD_DOWN",
                "LEFT": "KEYCODE_DPAD_LEFT",
                "RIGHT": "KEYCODE_DPAD_RIGHT",
                "OK": "KEYCODE_DPAD_CENTER",
                "BACK": "KEYCODE_BACK",
                "HOME": "KEYCODE_HOME",
                "MENU": "KEYCODE_MENU",
                "POWER": "KEYCODE_POWER",
                "VOLUME_UP": "KEYCODE_VOLUME_UP",
                "VOLUME_DOWN": "KEYCODE_VOLUME_DOWN",
                "PLAY_PAUSE": "KEYCODE_MEDIA_PLAY_PAUSE"
            }

            android_key = key_mapping.get(key, key)

            result = subprocess.run(
                ["adb", "-s", self.adb_device, "shell", "input", "keyevent", android_key],
                capture_output=True, text=True, timeout=5
            )

            if result.returncode == 0:
                print(f"Remote[{self.device_type.upper()}]: Pressed {key}")
                return True
            else:
                print(f"Remote[{self.device_type.upper()}]: Key press failed: {result.stderr}")
                return False

        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Key press error: {e}")
            return False

    def input_text(self, text: str) -> bool:
        """Send text input via ADB."""
        if not self.is_connected:
            return False

        try:
            escaped_text = text.replace(" ", "%s").replace("'", "\\'")

            result = subprocess.run(
                ["adb", "-s", self.adb_device, "shell", "input", "text", escaped_text],
                capture_output=True, text=True, timeout=10
            )

            if result.returncode == 0:
                print(f"Remote[{self.device_type.upper()}]: Sent text: '{text}'")
                return True
            else:
                print(f"Remote[{self.device_type.upper()}]: Text input failed: {result.stderr}")
                return False

        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: Text input error: {e}")
            return False

    def execute_sequence(self, commands: list) -> bool:
        """Execute command sequence."""
        if not self.is_connected:
            return False

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
            elif action == 'launch_app':
                success = self.launch_app(params.get('package', ''))

            if not success:
                print(f"Remote[{self.device_type.upper()}]: Sequence failed at step {i+1}")
                return False

            if delay > 0 and i < len(commands) - 1:
                time.sleep(delay)

        print(f"Remote[{self.device_type.upper()}]: Sequence completed successfully")
        return True

    def launch_app(self, package_name: str) -> bool:
        """Launch app by package name."""
        if not self.is_connected:
            return False

        try:
            result = subprocess.run(
                ["adb", "-s", self.adb_device, "shell", "monkey", "-p", package_name, "1"],
                capture_output=True, text=True, timeout=10
            )

            if result.returncode == 0:
                print(f"Remote[{self.device_type.upper()}]: Launched app: {package_name}")
                return True
            else:
                print(f"Remote[{self.device_type.upper()}]: App launch failed: {result.stderr}")
                return False

        except Exception as e:
            print(f"Remote[{self.device_type.upper()}]: App launch error: {e}")
            return False

    def get_status(self) -> Dict[str, Any]:
        """Get controller status."""
        return {
            'controller_type': self.controller_type,
            'device_type': self.device_type,
            'device_name': self.device_name,
            'device_ip': self.device_ip,
            'adb_device': self.adb_device,
            'connected': self.is_connected,
            'capabilities': [
                'navigation', 'text_input', 'app_launch',
                'media_control', 'volume_control', 'power_control'
            ]
        }


# Register and use the real implementation
from controllers import ControllerFactory

# Register the real Android TV controller
ControllerFactory.register_controller("remote", "real_android_tv", RealAndroidTVController)

# Use it in tests
controllers = create_device_controllers(
    device_name="Living Room TV",
    device_type="android_tv",
    remote_type="real_android_tv",  # Use real implementation
    device_ip="192.168.1.100"
)

# Connect and test
controllers.connect_all()
controllers.remote.press_key("HOME")
controllers.remote.launch_app("com.netflix.ninja")
controllers.disconnect_all()
```

### Usage in Test Scripts

```python
def test_netflix_playback():
    """Test Netflix playback on Android TV."""
    
    # Setup controllers with specific implementations
    controllers = create_device_controllers(
        device_name="Test Android TV",
        device_type="android_tv",
        remote_type="real_android_tv",     # Real ADB remote
        av_type="hdmi",                    # HDMI capture
        verification_type="ocr",           # OCR verification
        power_type="adb",                  # ADB power management
        device_ip="192.168.1.100",
        capture_card="Elgato HD60"
    )
    
    try:
        # Connect all controllers
        assert controllers.connect_all(), "Failed to connect controllers"
        
        # Ensure device is powered on
        if not controllers.power.is_powered_on():
            print("Device is off, powering on...")
            assert controllers.power.power_on(timeout=30.0), "Failed to power on device"
            
            # Wait for device to be fully ready
            assert controllers.power.wait_for_power_state("on", timeout=30.0), "Device not ready"
        
        # Start AV capture
        controllers.av.start_video_capture("1920x1080", 30)
        
        # Navigate to Netflix
        controllers.remote.press_key("HOME")
        controllers.remote.launch_app("com.netflix.ninja")
        
        # Verify Netflix loaded
        assert controllers.verification.verify_text_appears("Netflix", timeout=10)
        
        # Navigate and play content
        controllers.remote.press_key("DOWN")
        controllers.remote.press_key("OK")
        
        # Verify video is playing
        assert controllers.verification.verify_video_playing(motion_threshold=5.0, duration=3.0)
        
        # Verify audio is playing
        assert controllers.verification.verify_audio_playing(min_level=10.0, duration=2.0)
        
        print("Netflix playback test passed!")
        
    except AssertionError as e:
        print(f"Test failed: {e}")
        
        # If test fails, try power cycling the device
        print("Attempting device recovery...")
        if controllers.power.reboot(timeout=60.0):
            print("Device rebooted successfully")
        else:
            print("Device reboot failed")
        
    finally:
        # Cleanup
        controllers.av.stop_video_capture()
        controllers.disconnect_all()


def test_power_management():
    """Test power management functionality."""
    
    # Create power controller for testing
    power = ControllerFactory.create_power_controller(
        power_type="smart_plug",
        device_name="Test Device",
        ip_address="192.168.1.100"
    )
    
    try:
        assert power.connect(), "Failed to connect to power controller"
        
        # Test power cycle
        print("Testing power cycle...")
        assert power.power_off(force=False, timeout=30.0), "Failed to power off"
        assert power.is_powered_off(), "Device not in off state"
        
        assert power.power_on(timeout=30.0), "Failed to power on"
        assert power.is_powered_on(), "Device not in on state"
        
        # Test reboot
        print("Testing reboot...")
        assert power.reboot(timeout=60.0), "Failed to reboot"
        assert power.is_powered_on(), "Device not on after reboot"
        
        # Check power status
        status = power.get_power_status()
        print(f"Power consumption: {status.get('power_consumption_watts', 0)}W")
        print(f"Uptime: {status.get('uptime_seconds', 0)} seconds")
        
        print("Power management test passed!")
        
    finally:
        power.disconnect()


if __name__ == "__main__":
    test_netflix_playback()
    test_power_management()
```

This comprehensive guide provides the foundation for extending the VirtualPyTest controller system with complete separation of concerns. The new architecture allows for:

1. **Independent controller development** - Each type can be developed separately
2. **Device-specific implementations** - Choose the best controller for each device
3. **Flexible combinations** - Mix and match different controller types
4. **Easy extension** - Add new implementations without affecting existing code
5. **Runtime configuration** - Select controllers based on test requirements

The modular design ensures maximum flexibility while maintaining clean interfaces and easy extensibility.

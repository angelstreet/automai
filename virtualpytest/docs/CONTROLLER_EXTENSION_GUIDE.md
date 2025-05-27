# VirtualPyTest Controller Extension Guide

This guide explains how to extend the VirtualPyTest controller system to add new functionality, create custom device implementations, or integrate with real hardware.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Base Controller Classes](#base-controller-classes)
3. [Extending Remote Controllers](#extending-remote-controllers)
4. [Extending AV Controllers](#extending-av-controllers)
5. [Extending Verification Controllers](#extending-verification-controllers)
6. [Creating Real Hardware Implementations](#creating-real-hardware-implementations)
7. [Best Practices](#best-practices)
8. [Examples](#examples)

## Architecture Overview

The VirtualPyTest controller system follows a layered architecture:

```
┌─────────────────────────────────────┐
│           Test Scripts              │
├─────────────────────────────────────┤
│      Concrete Controllers          │
│   (Mock/Real Implementations)      │
├─────────────────────────────────────┤
│       Abstract Base Classes        │
│    (Interface Definitions)         │
└─────────────────────────────────────┘
```

### Key Components

- **Base Controllers** (`base_controllers.py`): Abstract base classes defining interfaces
- **Mock Controllers**: Simulation implementations for testing
- **Real Controllers**: Actual hardware/software integrations
- **Device-Specific Controllers**: Specialized implementations for specific devices

## Base Controller Classes

### BaseRemoteController

Defines the interface for device navigation and control.

**Required Abstract Methods:**

- `connect()` - Establish connection to device
- `disconnect()` - Close connection
- `press_key(key: str)` - Send key press command
- `input_text(text: str)` - Send text input
- `execute_sequence(commands: list)` - Execute command sequence
- `get_status()` - Return controller status

**Provided Default Methods:**

- Navigation methods (`navigate_up()`, `navigate_down()`, etc.)
- Media control methods (`play_pause()`, `volume_up()`, etc.)
- System control methods (`home()`, `back()`, `menu()`, etc.)

### BaseAVController

Defines the interface for audio/video capture and analysis.

**Required Abstract Methods:**

- `connect()` / `disconnect()` - Connection management
- `start_video_capture()` / `stop_video_capture()` - Video capture control
- `capture_frame()` - Single frame capture
- `start_audio_capture()` / `stop_audio_capture()` - Audio capture control
- `detect_audio_level()` - Audio level detection
- `detect_silence()` - Silence detection
- `analyze_video_content()` - Video content analysis
- `wait_for_video_change()` - Video change detection
- `record_session()` - Session recording
- `get_status()` - Controller status

### BaseVerificationController

Defines the interface for test validation and verification.

**Required Abstract Methods:**

- `connect()` / `disconnect()` - Connection management
- `verify_image_appears()` - Image verification
- `verify_text_appears()` - Text verification
- `verify_element_exists()` - UI element verification
- `verify_audio_playing()` - Audio playback verification
- `verify_video_playing()` - Video playback verification
- `verify_color_present()` - Color verification
- `verify_screen_state()` - Screen state verification
- `verify_performance_metric()` - Performance verification
- `wait_and_verify()` - Generic verification with timeout
- `get_status()` - Controller status

**Provided Common Methods:**

- `_log_verification()` - Log verification results
- `get_verification_results()` - Retrieve verification history
- `clear_verification_results()` - Clear verification history

## Extending Remote Controllers

### Creating a New Device Type

```python
from .base_controllers import BaseRemoteController
import your_device_library

class CustomDeviceController(BaseRemoteController):
    """Controller for CustomDevice remote control."""

    def __init__(self, device_ip: str, device_name: str = "Custom Device"):
        super().__init__("custom_device", device_name)
        self.device_ip = device_ip
        self.device_client = None

    def connect(self) -> bool:
        """Connect to the custom device."""
        try:
            self.device_client = your_device_library.connect(self.device_ip)
            self.is_connected = True
            print(f"Remote[CUSTOM]: Connected to {self.device_name} at {self.device_ip}")
            return True
        except Exception as e:
            print(f"Remote[CUSTOM]: Connection failed: {e}")
            return False

    def disconnect(self) -> bool:
        """Disconnect from the custom device."""
        if self.device_client:
            self.device_client.close()
            self.device_client = None
        self.is_connected = False
        print(f"Remote[CUSTOM]: Disconnected from {self.device_name}")
        return True

    def press_key(self, key: str) -> bool:
        """Send key press to custom device."""
        if not self.is_connected:
            print(f"Remote[CUSTOM]: ERROR - Not connected")
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
                # Add more mappings as needed
            }

            device_key = key_mapping.get(key, key)
            self.device_client.send_key(device_key)
            print(f"Remote[CUSTOM]: Pressed {key} (mapped to {device_key})")
            return True
        except Exception as e:
            print(f"Remote[CUSTOM]: Key press failed: {e}")
            return False

    def input_text(self, text: str) -> bool:
        """Send text input to custom device."""
        if not self.is_connected:
            return False

        try:
            self.device_client.send_text(text)
            print(f"Remote[CUSTOM]: Sent text: '{text}'")
            return True
        except Exception as e:
            print(f"Remote[CUSTOM]: Text input failed: {e}")
            return False

    def execute_sequence(self, commands: list) -> bool:
        """Execute a sequence of commands."""
        if not self.is_connected:
            return False

        for i, command in enumerate(commands):
            action = command.get('action')
            params = command.get('params', {})
            delay = command.get('delay', 0.5)

            print(f"Remote[CUSTOM]: Step {i+1}: {action}")

            if action == 'press_key':
                self.press_key(params.get('key', 'OK'))
            elif action == 'input_text':
                self.input_text(params.get('text', ''))
            # Add more action types as needed

            if delay > 0 and i < len(commands) - 1:
                time.sleep(delay)

        return True

    def get_status(self) -> Dict[str, Any]:
        """Get controller status."""
        return {
            'controller_type': 'custom_device_controller',
            'device_type': self.device_type,
            'device_name': self.device_name,
            'device_ip': self.device_ip,
            'connected': self.is_connected,
            'capabilities': ['navigation', 'text_input', 'custom_features']
        }

    # Add custom methods specific to your device
    def custom_feature(self, param: str) -> bool:
        """Custom device-specific functionality."""
        if not self.is_connected:
            return False

        try:
            self.device_client.custom_command(param)
            print(f"Remote[CUSTOM]: Executed custom feature with param: {param}")
            return True
        except Exception as e:
            print(f"Remote[CUSTOM]: Custom feature failed: {e}")
            return False
```

### Extending Existing Controllers

```python
from .remote_controller import MockRemoteController

class EnhancedAndroidTV(MockRemoteController):
    """Enhanced Android TV controller with additional features."""

    def __init__(self, device_name: str = "Enhanced Android TV"):
        super().__init__("enhanced_android_tv", device_name)
        self.voice_enabled = True

    def voice_search(self, query: str) -> bool:
        """Perform voice search on Android TV."""
        if not self.is_connected:
            return False

        print(f"Remote[ENHANCED_ATV]: Voice search: '{query}'")
        # Implementation would use actual voice search API
        return True

    def launch_app(self, app_package: str) -> bool:
        """Launch specific app by package name."""
        if not self.is_connected:
            return False

        print(f"Remote[ENHANCED_ATV]: Launching app: {app_package}")
        # Implementation would use ADB or Android TV API
        return True

    def get_installed_apps(self) -> list:
        """Get list of installed applications."""
        if not self.is_connected:
            return []

        # Mock implementation
        apps = ["com.netflix.ninja", "com.youtube.tv", "com.spotify.tv"]
        print(f"Remote[ENHANCED_ATV]: Found {len(apps)} installed apps")
        return apps
```

## Extending AV Controllers

### Creating a Custom Capture Source

```python
from .base_controllers import BaseAVController
import cv2
import numpy as np

class WebcamAVController(BaseAVController):
    """AV Controller for webcam capture."""

    def __init__(self, device_name: str = "Webcam", camera_index: int = 0):
        super().__init__(device_name, "Webcam")
        self.camera_index = camera_index
        self.video_capture = None
        self.current_frame = None

    def connect(self) -> bool:
        """Connect to webcam."""
        try:
            self.video_capture = cv2.VideoCapture(self.camera_index)
            if not self.video_capture.isOpened():
                raise Exception("Could not open webcam")

            self.is_connected = True
            print(f"AV[WEBCAM]: Connected to camera {self.camera_index}")
            return True
        except Exception as e:
            print(f"AV[WEBCAM]: Connection failed: {e}")
            return False

    def disconnect(self) -> bool:
        """Disconnect from webcam."""
        if self.video_capture:
            self.video_capture.release()
            self.video_capture = None

        self.is_connected = False
        print(f"AV[WEBCAM]: Disconnected")
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
            print(f"AV[WEBCAM]: Started capture at {resolution}@{fps}fps")
            return True
        except Exception as e:
            print(f"AV[WEBCAM]: Failed to start capture: {e}")
            return False

    def stop_video_capture(self) -> bool:
        """Stop video capture."""
        self.is_capturing_video = False
        self.capture_session_id = None
        print(f"AV[WEBCAM]: Stopped video capture")
        return True

    def capture_frame(self, filename: str = None) -> bool:
        """Capture a single frame."""
        if not self.is_connected:
            return False

        try:
            ret, frame = self.video_capture.read()
            if not ret:
                print(f"AV[WEBCAM]: Failed to capture frame")
                return False

            self.current_frame = frame

            if filename:
                cv2.imwrite(filename, frame)
                print(f"AV[WEBCAM]: Frame saved to {filename}")

            # Analyze frame
            brightness = np.mean(frame)
            print(f"AV[WEBCAM]: Frame captured - Brightness: {brightness:.1f}")
            return True
        except Exception as e:
            print(f"AV[WEBCAM]: Frame capture failed: {e}")
            return False

    def analyze_video_content(self, analysis_type: str = "motion") -> Dict[str, Any]:
        """Analyze video content."""
        if not self.is_connected or self.current_frame is None:
            return {}

        try:
            if analysis_type == "motion":
                # Simple motion detection using frame difference
                # This is a simplified example
                gray = cv2.cvtColor(self.current_frame, cv2.COLOR_BGR2GRAY)
                motion_score = np.std(gray)  # Simplified motion metric

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

            # Add more analysis types as needed

        except Exception as e:
            print(f"AV[WEBCAM]: Analysis failed: {e}")
            return {"error": str(e)}

    # Implement other required abstract methods...
    def start_audio_capture(self, sample_rate: int = 44100, channels: int = 2) -> bool:
        # Audio capture implementation
        pass

    def stop_audio_capture(self) -> bool:
        # Audio capture stop implementation
        pass

    def detect_audio_level(self) -> float:
        # Audio level detection implementation
        pass

    def detect_silence(self, threshold: float = 5.0, duration: float = 2.0) -> bool:
        # Silence detection implementation
        pass

    def wait_for_video_change(self, timeout: float = 10.0, threshold: float = 10.0) -> bool:
        # Video change detection implementation
        pass

    def record_session(self, duration: float, filename: str = None) -> bool:
        # Session recording implementation
        pass

    def get_status(self) -> Dict[str, Any]:
        """Get controller status."""
        return {
            'controller_type': 'webcam_av_controller',
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
from .base_controllers import BaseVerificationController
import cv2
import pytesseract
from PIL import Image

class OCRVerificationController(BaseVerificationController):
    """Verification controller with OCR capabilities."""

    def __init__(self, device_name: str = "OCR Verifier"):
        super().__init__(device_name)
        self.ocr_engine = None
        self.screenshot_source = None

    def connect(self) -> bool:
        """Connect to OCR verification system."""
        try:
            # Initialize OCR engine
            self.ocr_engine = pytesseract
            self.is_connected = True
            self.verification_session_id = f"ocr_{int(time.time())}"
            print(f"Verify[OCR]: Connected - Session: {self.verification_session_id}")
            return True
        except Exception as e:
            print(f"Verify[OCR]: Connection failed: {e}")
            return False

    def disconnect(self) -> bool:
        """Disconnect from OCR verification system."""
        self.is_connected = False
        self.verification_session_id = None
        print(f"Verify[OCR]: Disconnected")
        return True

    def verify_text_appears(self, text: str, timeout: float = 10.0, case_sensitive: bool = False) -> bool:
        """Verify text appears using OCR."""
        if not self.is_connected:
            return False

        print(f"Verify[OCR]: Looking for text '{text}' using OCR")

        try:
            # Capture screenshot (implementation depends on your setup)
            screenshot = self._capture_screenshot()
            if screenshot is None:
                return False

            # Perform OCR
            extracted_text = pytesseract.image_to_string(screenshot)

            # Check if text is present
            if case_sensitive:
                found = text in extracted_text
            else:
                found = text.lower() in extracted_text.lower()

            if found:
                print(f"Verify[OCR]: Text '{text}' found in OCR results")
            else:
                print(f"Verify[OCR]: Text '{text}' not found in OCR results")

            self._log_verification("ocr_text_appears", text, found, {
                "case_sensitive": case_sensitive,
                "extracted_text_length": len(extracted_text)
            })

            return found

        except Exception as e:
            print(f"Verify[OCR]: OCR verification failed: {e}")
            return False

    def verify_text_at_coordinates(self, text: str, x: int, y: int, width: int, height: int) -> bool:
        """Verify text appears at specific coordinates."""
        if not self.is_connected:
            return False

        try:
            screenshot = self._capture_screenshot()
            if screenshot is None:
                return False

            # Crop to specified region
            region = screenshot.crop((x, y, x + width, y + height))

            # Perform OCR on region
            extracted_text = pytesseract.image_to_string(region)
            found = text.lower() in extracted_text.lower()

            print(f"Verify[OCR]: Text '{text}' at ({x},{y}) - {'Found' if found else 'Not found'}")

            self._log_verification("ocr_text_at_coordinates", text, found, {
                "coordinates": {"x": x, "y": y, "width": width, "height": height},
                "extracted_text": extracted_text.strip()
            })

            return found

        except Exception as e:
            print(f"Verify[OCR]: Coordinate verification failed: {e}")
            return False

    def _capture_screenshot(self) -> Image:
        """Capture screenshot for OCR analysis."""
        # This would be implemented based on your screenshot source
        # Could be from AV controller, direct screen capture, etc.
        try:
            # Example implementation - replace with actual screenshot logic
            import pyautogui
            screenshot = pyautogui.screenshot()
            return screenshot
        except Exception as e:
            print(f"Verify[OCR]: Screenshot capture failed: {e}")
            return None

    # Implement other required abstract methods with OCR-enhanced functionality...
    def verify_image_appears(self, image_name: str, timeout: float = 10.0, confidence: float = 0.8) -> bool:
        # Template matching implementation
        pass

    def verify_element_exists(self, element_id: str, element_type: str = "any") -> bool:
        # UI element verification implementation
        pass

    # ... implement other abstract methods
```

## Creating Real Hardware Implementations

### Example: Real Android TV Controller

```python
from .base_controllers import BaseRemoteController
import subprocess
import time

class RealAndroidTVController(BaseRemoteController):
    """Real Android TV controller using ADB."""

    def __init__(self, device_ip: str, device_name: str = "Android TV"):
        super().__init__("android_tv", device_name)
        self.device_ip = device_ip
        self.adb_device = f"{device_ip}:5555"

    def connect(self) -> bool:
        """Connect to Android TV via ADB."""
        try:
            # Connect to device
            result = subprocess.run(
                ["adb", "connect", self.adb_device],
                capture_output=True, text=True, timeout=10
            )

            if "connected" in result.stdout:
                self.is_connected = True
                print(f"Remote[ATV]: Connected to {self.device_name} at {self.device_ip}")
                return True
            else:
                print(f"Remote[ATV]: Connection failed: {result.stdout}")
                return False

        except Exception as e:
            print(f"Remote[ATV]: Connection error: {e}")
            return False

    def disconnect(self) -> bool:
        """Disconnect from Android TV."""
        try:
            subprocess.run(
                ["adb", "disconnect", self.adb_device],
                capture_output=True, text=True, timeout=5
            )
            self.is_connected = False
            print(f"Remote[ATV]: Disconnected from {self.device_name}")
            return True
        except Exception as e:
            print(f"Remote[ATV]: Disconnect error: {e}")
            return False

    def press_key(self, key: str) -> bool:
        """Send key press via ADB."""
        if not self.is_connected:
            return False

        try:
            # Map generic keys to Android key codes
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
                print(f"Remote[ATV]: Pressed {key}")
                return True
            else:
                print(f"Remote[ATV]: Key press failed: {result.stderr}")
                return False

        except Exception as e:
            print(f"Remote[ATV]: Key press error: {e}")
            return False

    def input_text(self, text: str) -> bool:
        """Send text input via ADB."""
        if not self.is_connected:
            return False

        try:
            # Escape special characters for shell
            escaped_text = text.replace(" ", "%s").replace("'", "\\'")

            result = subprocess.run(
                ["adb", "-s", self.adb_device, "shell", "input", "text", escaped_text],
                capture_output=True, text=True, timeout=10
            )

            if result.returncode == 0:
                print(f"Remote[ATV]: Sent text: '{text}'")
                return True
            else:
                print(f"Remote[ATV]: Text input failed: {result.stderr}")
                return False

        except Exception as e:
            print(f"Remote[ATV]: Text input error: {e}")
            return False

    def execute_sequence(self, commands: list) -> bool:
        """Execute command sequence."""
        if not self.is_connected:
            return False

        for i, command in enumerate(commands):
            action = command.get('action')
            params = command.get('params', {})
            delay = command.get('delay', 0.5)

            print(f"Remote[ATV]: Step {i+1}: {action}")

            success = False
            if action == 'press_key':
                success = self.press_key(params.get('key', 'OK'))
            elif action == 'input_text':
                success = self.input_text(params.get('text', ''))
            elif action == 'launch_app':
                success = self.launch_app(params.get('package', ''))

            if not success:
                print(f"Remote[ATV]: Sequence failed at step {i+1}")
                return False

            if delay > 0 and i < len(commands) - 1:
                time.sleep(delay)

        print(f"Remote[ATV]: Sequence completed successfully")
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
                print(f"Remote[ATV]: Launched app: {package_name}")
                return True
            else:
                print(f"Remote[ATV]: App launch failed: {result.stderr}")
                return False

        except Exception as e:
            print(f"Remote[ATV]: App launch error: {e}")
            return False

    def get_status(self) -> Dict[str, Any]:
        """Get controller status."""
        return {
            'controller_type': 'real_android_tv_controller',
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
```

## Best Practices

### 1. Error Handling

Always implement proper error handling:

```python
def connect(self) -> bool:
    try:
        # Connection logic
        self.is_connected = True
        return True
    except ConnectionError as e:
        print(f"Controller: Connection failed: {e}")
        return False
    except Exception as e:
        print(f"Controller: Unexpected error: {e}")
        return False
```

### 2. Logging and Status

Provide comprehensive logging and status information:

```python
def press_key(self, key: str) -> bool:
    if not self.is_connected:
        print(f"Controller: ERROR - Not connected")
        return False

    print(f"Controller: Pressing key '{key}'")
    # Implementation
    print(f"Controller: Key '{key}' pressed successfully")
    return True
```

### 3. Resource Management

Always clean up resources properly:

```python
def disconnect(self) -> bool:
    try:
        if self.device_connection:
            self.device_connection.close()
        if self.capture_session:
            self.capture_session.stop()

        self.is_connected = False
        return True
    except Exception as e:
        print(f"Controller: Cleanup error: {e}")
        return False
```

### 4. Configuration Management

Use configuration objects for complex setups:

```python
class ControllerConfig:
    def __init__(self):
        self.timeout = 10.0
        self.retry_count = 3
        self.log_level = "INFO"
        self.device_specific_settings = {}

class CustomController(BaseRemoteController):
    def __init__(self, config: ControllerConfig):
        super().__init__()
        self.config = config
```

### 5. Testing Your Extensions

Create unit tests for your controller extensions:

```python
import unittest
from unittest.mock import Mock, patch

class TestCustomController(unittest.TestCase):
    def setUp(self):
        self.controller = CustomController("test_device")

    def test_connect_success(self):
        with patch('your_device_library.connect') as mock_connect:
            mock_connect.return_value = Mock()
            result = self.controller.connect()
            self.assertTrue(result)
            self.assertTrue(self.controller.is_connected)

    def test_press_key_when_disconnected(self):
        result = self.controller.press_key("UP")
        self.assertFalse(result)
```

## Examples

### Complete Example: Custom STB Controller

```python
from .base_controllers import BaseRemoteController
import socket
import json
import time

class CustomSTBController(BaseRemoteController):
    """Controller for Custom Set-Top Box via network API."""

    def __init__(self, stb_ip: str, api_port: int = 8080, device_name: str = "Custom STB"):
        super().__init__("custom_stb", device_name)
        self.stb_ip = stb_ip
        self.api_port = api_port
        self.socket = None
        self.session_token = None

    def connect(self) -> bool:
        """Connect to STB via network API."""
        try:
            self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.socket.settimeout(10)
            self.socket.connect((self.stb_ip, self.api_port))

            # Authenticate
            auth_request = {
                "action": "authenticate",
                "credentials": {"user": "test", "password": "test"}
            }

            response = self._send_request(auth_request)
            if response.get("status") == "success":
                self.session_token = response.get("token")
                self.is_connected = True
                print(f"Remote[STB]: Connected to {self.device_name} at {self.stb_ip}")
                return True
            else:
                print(f"Remote[STB]: Authentication failed")
                return False

        except Exception as e:
            print(f"Remote[STB]: Connection failed: {e}")
            return False

    def disconnect(self) -> bool:
        """Disconnect from STB."""
        try:
            if self.socket:
                logout_request = {
                    "action": "logout",
                    "token": self.session_token
                }
                self._send_request(logout_request)
                self.socket.close()
                self.socket = None

            self.is_connected = False
            self.session_token = None
            print(f"Remote[STB]: Disconnected")
            return True
        except Exception as e:
            print(f"Remote[STB]: Disconnect error: {e}")
            return False

    def press_key(self, key: str) -> bool:
        """Send key press to STB."""
        if not self.is_connected:
            return False

        try:
            request = {
                "action": "key_press",
                "token": self.session_token,
                "key": key
            }

            response = self._send_request(request)
            success = response.get("status") == "success"

            if success:
                print(f"Remote[STB]: Pressed {key}")
            else:
                print(f"Remote[STB]: Key press failed: {response.get('error')}")

            return success

        except Exception as e:
            print(f"Remote[STB]: Key press error: {e}")
            return False

    def input_text(self, text: str) -> bool:
        """Send text input to STB."""
        if not self.is_connected:
            return False

        try:
            request = {
                "action": "input_text",
                "token": self.session_token,
                "text": text
            }

            response = self._send_request(request)
            success = response.get("status") == "success"

            if success:
                print(f"Remote[STB]: Sent text: '{text}'")
            else:
                print(f"Remote[STB]: Text input failed: {response.get('error')}")

            return success

        except Exception as e:
            print(f"Remote[STB]: Text input error: {e}")
            return False

    def execute_sequence(self, commands: list) -> bool:
        """Execute command sequence."""
        if not self.is_connected:
            return False

        try:
            request = {
                "action": "execute_sequence",
                "token": self.session_token,
                "commands": commands
            }

            response = self._send_request(request)
            success = response.get("status") == "success"

            if success:
                print(f"Remote[STB]: Sequence executed successfully")
            else:
                print(f"Remote[STB]: Sequence failed: {response.get('error')}")

            return success

        except Exception as e:
            print(f"Remote[STB]: Sequence error: {e}")
            return False

    def _send_request(self, request: dict) -> dict:
        """Send JSON request to STB and return response."""
        try:
            request_json = json.dumps(request)
            self.socket.send(request_json.encode('utf-8'))

            response_data = self.socket.recv(4096)
            response = json.loads(response_data.decode('utf-8'))

            return response

        except Exception as e:
            print(f"Remote[STB]: Request error: {e}")
            return {"status": "error", "error": str(e)}

    def get_status(self) -> Dict[str, Any]:
        """Get controller status."""
        return {
            'controller_type': 'custom_stb_controller',
            'device_type': self.device_type,
            'device_name': self.device_name,
            'stb_ip': self.stb_ip,
            'api_port': self.api_port,
            'connected': self.is_connected,
            'session_token': self.session_token is not None,
            'capabilities': [
                'navigation', 'text_input', 'sequence_execution',
                'media_control', 'volume_control'
            ]
        }

    # STB-specific methods
    def get_channel_list(self) -> list:
        """Get available channels."""
        if not self.is_connected:
            return []

        try:
            request = {
                "action": "get_channels",
                "token": self.session_token
            }

            response = self._send_request(request)
            if response.get("status") == "success":
                channels = response.get("channels", [])
                print(f"Remote[STB]: Retrieved {len(channels)} channels")
                return channels
            else:
                print(f"Remote[STB]: Failed to get channels: {response.get('error')}")
                return []

        except Exception as e:
            print(f"Remote[STB]: Channel list error: {e}")
            return []

    def tune_to_channel(self, channel_number: int) -> bool:
        """Tune to specific channel."""
        if not self.is_connected:
            return False

        try:
            request = {
                "action": "tune_channel",
                "token": self.session_token,
                "channel": channel_number
            }

            response = self._send_request(request)
            success = response.get("status") == "success"

            if success:
                print(f"Remote[STB]: Tuned to channel {channel_number}")
            else:
                print(f"Remote[STB]: Channel tune failed: {response.get('error')}")

            return success

        except Exception as e:
            print(f"Remote[STB]: Channel tune error: {e}")
            return False
```

This comprehensive guide provides the foundation for extending the VirtualPyTest controller system. Remember to:

1. Always inherit from the appropriate base class
2. Implement all required abstract methods
3. Follow the established patterns for logging and error handling
4. Test your implementations thoroughly
5. Document any device-specific features or requirements

The modular design allows for easy integration of new devices and technologies while maintaining a consistent interface for test scripts.

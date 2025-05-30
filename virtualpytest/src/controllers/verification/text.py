"""
Text Verification Controller Implementation

This controller provides simple text verification functionality using OCR.
It can wait for text to appear or disappear in specific areas of the screen.
"""

import subprocess
import time
import os
from typing import Dict, Any, Optional, Tuple
from pathlib import Path
from ..base_controllers import VerificationControllerInterface


class TextVerificationController(VerificationControllerInterface):
    """Text verification controller that uses OCR to detect text on screen."""
    
    def __init__(self, av_controller, **kwargs):
        """
        Initialize the Text Verification controller.
        
        Args:
            av_controller: Reference to AV controller (HDMIStreamController, etc.) - REQUIRED
            **kwargs: Optional parameters:
                - ocr_engine: OCR engine to use ('tesseract' or 'placeholder')
        """
        if not av_controller:
            raise ValueError("av_controller is required - must provide HDMIStreamController or similar")
            
        device_name = f"TextVerify-{av_controller.device_name}"
        super().__init__(device_name)
        
        # AV controller reference (REQUIRED)
        self.av_controller = av_controller
        self.ocr_engine = kwargs.get('ocr_engine', 'tesseract')
        
        # Temporary files for analysis
        self.temp_text_path = Path("/tmp/text_verification")
        self.temp_text_path.mkdir(exist_ok=True)
        
        # OCR availability
        self.ocr_available = self._check_ocr_availability()
        
    def _check_ocr_availability(self) -> bool:
        """Check if OCR tools are available."""
        if self.ocr_engine == 'tesseract':
            try:
                result = subprocess.run(['tesseract', '--version'], 
                                      capture_output=True, text=True, timeout=5)
                return result.returncode == 0
            except (subprocess.TimeoutExpired, FileNotFoundError):
                print(f"TextVerify[{self.device_name}]: WARNING - Tesseract OCR not found")
                return False
        return False
        
    def connect(self) -> bool:
        """Connect to the text verification system."""
        try:
            print(f"TextVerify[{self.device_name}]: Connecting to text verification system")
            
            # Removed hardcoded AV controller connection check - let verification proceed
            if self.av_controller:
                print(f"TextVerify[{self.device_name}]: Using AV controller: {self.av_controller.device_name}")
                
                # Check if AV controller has screenshot capability
                if not hasattr(self.av_controller, 'take_screenshot'):
                    print(f"TextVerify[{self.device_name}]: WARNING - AV controller has no screenshot capability")
            
            if not self.ocr_available:
                print(f"TextVerify[{self.device_name}]: WARNING - OCR not available, using placeholder mode")
            
            self.is_connected = True
            self.verification_session_id = f"text_verify_{int(time.time())}"
            print(f"TextVerify[{self.device_name}]: Connected - Session: {self.verification_session_id}")
            return True
            
        except Exception as e:
            print(f"TextVerify[{self.device_name}]: Connection failed: {e}")
            return False

    def disconnect(self) -> bool:
        """Disconnect from the text verification system."""
        print(f"TextVerify[{self.device_name}]: Disconnecting")
        self.is_connected = False
        self.verification_session_id = None
        
        # Clean up temporary files
        try:
            for temp_file in self.temp_text_path.glob("*"):
                if temp_file.is_file():
                    temp_file.unlink()
        except Exception as e:
            print(f"TextVerify[{self.device_name}]: Warning - cleanup failed: {e}")
            
        print(f"TextVerify[{self.device_name}]: Disconnected")
        return True

    def capture_screenshot_for_ocr(self, area: Tuple[int, int, int, int] = None) -> str:
        """
        Capture a screenshot for OCR analysis using the AV controller.
        
        Args:
            area: Optional area to crop (x, y, width, height)
            
        Returns:
            Path to the screenshot file
        """
        if not self.is_connected:
            print(f"TextVerify[{self.device_name}]: ERROR - Not connected")
            return None
            
        timestamp = int(time.time())
        screenshot_name = f"ocr_screenshot_{timestamp}.png"
        
        # Use AV controller to take screenshot
        print(f"TextVerify[{self.device_name}]: Requesting screenshot from {self.av_controller.device_name}")
        screenshot_path = self.av_controller.take_screenshot(screenshot_name)
        
        if not screenshot_path:
            print(f"TextVerify[{self.device_name}]: Failed to get screenshot from AV controller")
            return None
            
        if area:
            # Crop the image if area is specified
            cropped_path = self._crop_image(screenshot_path, area)
            return cropped_path or screenshot_path
            
        return screenshot_path

    def _crop_image(self, image_path: str, area: Tuple[int, int, int, int]) -> str:
        """Crop image to specified area using FFmpeg."""
        try:
            x, y, width, height = area
            timestamp = int(time.time())
            cropped_path = self.temp_text_path / f"cropped_{timestamp}.png"
            
            cmd = [
                '/usr/bin/ffmpeg',
                '-i', image_path,
                '-filter:v', f'crop={width}:{height}:{x}:{y}',
                '-y',
                str(cropped_path)
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0 and cropped_path.exists():
                print(f"TextVerify[{self.device_name}]: Image cropped to area ({x},{y},{width},{height})")
                return str(cropped_path)
            else:
                print(f"TextVerify[{self.device_name}]: Image cropping failed: {result.stderr}")
                return None
                
        except Exception as e:
            print(f"TextVerify[{self.device_name}]: Image cropping error: {e}")
            return None

    def extract_text_from_image(self, image_path: str) -> str:
        """
        Extract text from image using OCR.
        
        Args:
            image_path: Path to the image file
            
        Returns:
            Extracted text as string
        """
        if not self.is_connected:
            print(f"TextVerify[{self.device_name}]: ERROR - Not connected")
            return ""
            
        if not os.path.exists(image_path):
            print(f"TextVerify[{self.device_name}]: ERROR - Image file not found: {image_path}")
            return ""
        
        try:
            if self.ocr_available and self.ocr_engine == 'tesseract':
                # Use Tesseract OCR
                cmd = [
                    'tesseract',
                    image_path,
                    'stdout',
                    '-l', 'eng',  # English language
                    '--psm', '6'  # Uniform block of text
                ]
                
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
                
                if result.returncode == 0:
                    extracted_text = result.stdout.strip()
                    print(f"TextVerify[{self.device_name}]: Extracted text: '{extracted_text[:100]}{'...' if len(extracted_text) > 100 else ''}'")
                    return extracted_text
                else:
                    print(f"TextVerify[{self.device_name}]: OCR failed: {result.stderr}")
                    return ""
            else:
                # Placeholder mode - simulate text extraction
                print(f"TextVerify[{self.device_name}]: OCR placeholder mode - simulating text extraction")
                # Return some sample text for testing
                sample_texts = [
                    "Welcome to the application",
                    "Loading...",
                    "Error: Connection failed",
                    "Ready",
                    "Please wait",
                    ""  # Sometimes no text
                ]
                import random
                simulated_text = random.choice(sample_texts)
                print(f"TextVerify[{self.device_name}]: Simulated text: '{simulated_text}'")
                return simulated_text
                
        except Exception as e:
            print(f"TextVerify[{self.device_name}]: Text extraction error: {e}")
            return ""

    def verify_text_appears(self, text: str, timeout: float = 10.0, case_sensitive: bool = False, 
                           area: Tuple[int, int, int, int] = None) -> bool:
        """
        Wait for specific text to appear on screen.
        
        Args:
            text: Text to look for
            timeout: Maximum time to wait in seconds
            case_sensitive: Whether to match case exactly
            area: Optional area to search (x, y, width, height)
            
        Returns:
            True if text appears, False if timeout
        """
        if not self.is_connected:
            print(f"TextVerify[{self.device_name}]: ERROR - Not connected")
            return False
            
        print(f"TextVerify[{self.device_name}]: Waiting for text '{text}' to appear (timeout: {timeout}s)")
        if area:
            print(f"TextVerify[{self.device_name}]: Search area: ({area[0]},{area[1]},{area[2]},{area[3]})")
        
        start_time = time.time()
        check_interval = 1.0  # Check every second
        
        target_text = text if case_sensitive else text.lower()
        
        while time.time() - start_time < timeout:
            # Capture screenshot
            screenshot = self.capture_screenshot_for_ocr(area)
            if not screenshot:
                time.sleep(check_interval)
                continue
            
            # Extract text from screenshot
            extracted_text = self.extract_text_from_image(screenshot)
            search_text = extracted_text if case_sensitive else extracted_text.lower()
            
            # Check if target text is found
            if target_text in search_text:
                elapsed = time.time() - start_time
                print(f"TextVerify[{self.device_name}]: Text '{text}' found after {elapsed:.1f}s")
                
                self._log_verification("text_appears", text, True, {
                    "timeout": timeout,
                    "elapsed": elapsed,
                    "case_sensitive": case_sensitive,
                    "area": area,
                    "extracted_text": extracted_text[:200]  # Log first 200 chars
                })
                
                return True
            
            time.sleep(check_interval)
        
        print(f"TextVerify[{self.device_name}]: Text '{text}' not found within {timeout}s")
        
        self._log_verification("text_appears", text, False, {
            "timeout": timeout,
            "case_sensitive": case_sensitive,
            "area": area
        })
        
        return False

    def verify_text_disappears(self, text: str, timeout: float = 10.0, case_sensitive: bool = False,
                              area: Tuple[int, int, int, int] = None) -> bool:
        """
        Wait for specific text to disappear from screen.
        
        Args:
            text: Text that should disappear
            timeout: Maximum time to wait in seconds
            case_sensitive: Whether to match case exactly
            area: Optional area to search (x, y, width, height)
            
        Returns:
            True if text disappears, False if timeout
        """
        if not self.is_connected:
            print(f"TextVerify[{self.device_name}]: ERROR - Not connected")
            return False
            
        print(f"TextVerify[{self.device_name}]: Waiting for text '{text}' to disappear (timeout: {timeout}s)")
        if area:
            print(f"TextVerify[{self.device_name}]: Search area: ({area[0]},{area[1]},{area[2]},{area[3]})")
        
        start_time = time.time()
        check_interval = 1.0  # Check every second
        
        target_text = text if case_sensitive else text.lower()
        
        while time.time() - start_time < timeout:
            # Capture screenshot
            screenshot = self.capture_screenshot_for_ocr(area)
            if not screenshot:
                time.sleep(check_interval)
                continue
            
            # Extract text from screenshot
            extracted_text = self.extract_text_from_image(screenshot)
            search_text = extracted_text if case_sensitive else extracted_text.lower()
            
            # Check if target text is NOT found (disappeared)
            if target_text not in search_text:
                elapsed = time.time() - start_time
                print(f"TextVerify[{self.device_name}]: Text '{text}' disappeared after {elapsed:.1f}s")
                
                self._log_verification("text_disappears", text, True, {
                    "timeout": timeout,
                    "elapsed": elapsed,
                    "case_sensitive": case_sensitive,
                    "area": area,
                    "extracted_text": extracted_text[:200]  # Log first 200 chars
                })
                
                return True
            
            time.sleep(check_interval)
        
        print(f"TextVerify[{self.device_name}]: Text '{text}' still present after {timeout}s")
        
        self._log_verification("text_disappears", text, False, {
            "timeout": timeout,
            "case_sensitive": case_sensitive,
            "area": area
        })
        
        return False

    # Implementation of required abstract methods from VerificationControllerInterface
    
    def verify_image_appears(self, image_name: str, timeout: float = 10.0, confidence: float = 0.8) -> bool:
        """Image verification not applicable for text controller."""
        print(f"TextVerify[{self.device_name}]: Image verification not supported by text controller")
        print(f"TextVerify[{self.device_name}]: Use VideoVerificationController for image verification")
        return False
        
    def verify_element_exists(self, element_id: str, element_type: str = "any") -> bool:
        """Element verification not applicable for text controller."""
        print(f"TextVerify[{self.device_name}]: Element verification not supported by text controller")
        return False
        
    def verify_audio_playing(self, min_level: float = 10.0, duration: float = 2.0) -> bool:
        """Audio verification not applicable for text controller."""
        print(f"TextVerify[{self.device_name}]: Audio verification not supported by text controller")
        print(f"TextVerify[{self.device_name}]: Use AudioVerificationController for audio verification")
        return False
        
    def verify_video_playing(self, motion_threshold: float = 5.0, duration: float = 3.0) -> bool:
        """Video verification not applicable for text controller."""
        print(f"TextVerify[{self.device_name}]: Video verification not supported by text controller")
        print(f"TextVerify[{self.device_name}]: Use VideoVerificationController for video verification")
        return False
        
    def verify_color_present(self, color: str, tolerance: float = 10.0) -> bool:
        """Color verification not applicable for text controller."""
        print(f"TextVerify[{self.device_name}]: Color verification not supported by text controller")
        print(f"TextVerify[{self.device_name}]: Use VideoVerificationController for color verification")
        return False
        
    def verify_screen_state(self, expected_state: str, timeout: float = 5.0) -> bool:
        """
        Verify screen state based on text content.
        
        Args:
            expected_state: Expected state text to look for
            timeout: Maximum time to wait for state
        """
        return self.verify_text_appears(expected_state, timeout)
        
    def verify_performance_metric(self, metric_name: str, expected_value: float, tolerance: float = 10.0) -> bool:
        """Performance metrics not applicable for text controller."""
        print(f"TextVerify[{self.device_name}]: Performance metrics not supported by text controller")
        return False
        
    def wait_and_verify(self, verification_type: str, target: str, timeout: float = 10.0, **kwargs) -> bool:
        """Generic wait and verify method for text verification."""
        if verification_type == "text_appears":
            case_sensitive = kwargs.get("case_sensitive", False)
            area = kwargs.get("area", None)
            return self.verify_text_appears(target, timeout, case_sensitive, area)
        elif verification_type == "text_disappears":
            case_sensitive = kwargs.get("case_sensitive", False)
            area = kwargs.get("area", None)
            return self.verify_text_disappears(target, timeout, case_sensitive, area)
        elif verification_type == "text":
            # Default to text appears
            case_sensitive = kwargs.get("case_sensitive", False)
            area = kwargs.get("area", None)
            return self.verify_text_appears(target, timeout, case_sensitive, area)
        else:
            print(f"TextVerify[{self.device_name}]: Unknown text verification type: {verification_type}")
            return False
            
    def get_status(self) -> Dict[str, Any]:
        """Get controller status information."""
        return {
            'controller_type': self.controller_type,
            'device_name': self.device_name,
            'connected': self.is_connected,
            'session_id': self.verification_session_id,
            'verification_count': len(self.verification_results),
            'acquisition_source': self.av_controller.device_name if self.av_controller else None,
            'ocr_engine': self.ocr_engine,
            'ocr_available': self.ocr_available,
            'capabilities': [
                'text_appears_verification', 'text_disappears_verification',
                'area_based_ocr', 'case_sensitive_matching'
            ]
        }


# Backward compatibility alias
TextVerificationController = TextVerificationController 
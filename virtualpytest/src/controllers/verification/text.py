"""
Text Verification Controller Implementation

This controller provides OCR-based text verification functionality.
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
            av_controller: Reference to AV controller for screenshot capture
            **kwargs: Optional parameters:
                - ocr_language: Language for OCR (default: 'eng')
                - ocr_config: Tesseract configuration string
        """
        if not av_controller:
            raise ValueError("av_controller is required for screenshot capture")
            
        device_name = f"TextVerify-{av_controller.device_name}"
        super().__init__(device_name)
        
        # AV controller reference for screenshot capture only
        self.av_controller = av_controller
        self.ocr_language = kwargs.get('ocr_language', 'eng')
        self.ocr_config = kwargs.get('ocr_config', '--psm 6')
        
        # Temporary files for analysis
        self.temp_image_path = Path("/tmp/text_verification")
        self.temp_image_path.mkdir(exist_ok=True)

        # Controller is always ready
        self.is_connected = True
        self.verification_session_id = f"text_verify_{int(time.time())}"
        print(f"TextVerify[{self.device_name}]: Ready - Using AV controller: {self.av_controller.device_name}")
        print(f"TextVerify[{self.device_name}]: OCR language: {self.ocr_language}")

    def _capture_screenshot_for_ocr(self, area: Tuple[int, int, int, int] = None) -> str:
        """
        Capture a screenshot for OCR analysis using the AV controller.
        
        Args:
            area: Optional area to crop (x, y, width, height)
            
        Returns:
            Path to the screenshot file
        """
        timestamp = int(time.time())
        screenshot_name = f"text_screenshot_{timestamp}.png"
        
        try:
            # Use AV controller to take screenshot
            print(f"TextVerify[{self.device_name}]: Capturing screenshot via {self.av_controller.device_name}")
            
            # Try different screenshot methods that might be available
            screenshot_path = None
            if hasattr(self.av_controller, 'take_screenshot'):
                screenshot_path = self.av_controller.take_screenshot(screenshot_name)
            elif hasattr(self.av_controller, 'screenshot'):
                screenshot_path = self.av_controller.screenshot(screenshot_name)
            elif hasattr(self.av_controller, 'capture_frame'):
                screenshot_path = self.av_controller.capture_frame(screenshot_name)
            else:
                print(f"TextVerify[{self.device_name}]: ERROR - No screenshot method available on AV controller")
                return None
            
            if not screenshot_path:
                print(f"TextVerify[{self.device_name}]: Failed to capture screenshot")
                return None
                
            if area:
                # Crop the image if area is specified
                cropped_path = self._crop_image(screenshot_path, area)
                return cropped_path or screenshot_path
                
            return screenshot_path
            
        except Exception as e:
            print(f"TextVerify[{self.device_name}]: Screenshot capture error: {e}")
            return None

    def _crop_image(self, image_path: str, area: Tuple[int, int, int, int]) -> str:
        """Crop image to specified area using FFmpeg."""
        try:
            x, y, width, height = area
            timestamp = int(time.time())
            cropped_path = self.temp_image_path / f"cropped_{timestamp}.png"
            
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

    def _extract_text_from_image(self, image_path: str) -> str:
        """
        Extract text from image using Tesseract OCR.
        
        Args:
            image_path: Path to the image file
            
        Returns:
            Extracted text string
        """
        try:
            cmd = [
                'tesseract',
                image_path,
                'stdout',
                '-l', self.ocr_language,
                self.ocr_config
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                extracted_text = result.stdout.strip()
                print(f"TextVerify[{self.device_name}]: Extracted text: '{extracted_text}'")
                return extracted_text
            else:
                print(f"TextVerify[{self.device_name}]: OCR failed: {result.stderr}")
                return ""
                
        except Exception as e:
            print(f"TextVerify[{self.device_name}]: Text extraction error: {e}")
            return ""

    def _text_matches(self, extracted_text: str, target_text: str, case_sensitive: bool = False) -> bool:
        """
        Check if target text is found in extracted text.
        
        Args:
            extracted_text: Text extracted from image
            target_text: Text to search for
            case_sensitive: Whether to match case exactly
            
        Returns:
            True if text matches, False otherwise
        """
        if not case_sensitive:
            extracted_text = extracted_text.lower()
            target_text = target_text.lower()
        
        return target_text in extracted_text

    def waitForTextToAppear(self, text: str, timeout: float = 10.0, case_sensitive: bool = False, 
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
        print(f"TextVerify[{self.device_name}]: Waiting for text '{text}' to appear (timeout: {timeout}s, case_sensitive: {case_sensitive})")
        if area:
            print(f"TextVerify[{self.device_name}]: Search area: ({area[0]},{area[1]},{area[2]},{area[3]})")
        
        start_time = time.time()
        check_interval = 2.0  # Check every 2 seconds (OCR is slower)
        
        while time.time() - start_time < timeout:
            # Capture screenshot
            screenshot = self._capture_screenshot_for_ocr(area)
            if not screenshot:
                time.sleep(check_interval)
                continue
            
            # Extract text using OCR
            extracted_text = self._extract_text_from_image(screenshot)
            
            # Check if target text is found
            if self._text_matches(extracted_text, text, case_sensitive):
                elapsed = time.time() - start_time
                print(f"TextVerify[{self.device_name}]: Text '{text}' found after {elapsed:.1f}s")
                return True
            
            time.sleep(check_interval)
        
        print(f"TextVerify[{self.device_name}]: Text '{text}' not found within {timeout}s")
        return False

    def waitForTextToDisappear(self, text: str, timeout: float = 10.0, case_sensitive: bool = False,
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
        print(f"TextVerify[{self.device_name}]: Waiting for text '{text}' to disappear (timeout: {timeout}s, case_sensitive: {case_sensitive})")
        if area:
            print(f"TextVerify[{self.device_name}]: Search area: ({area[0]},{area[1]},{area[2]},{area[3]})")
        
        start_time = time.time()
        check_interval = 2.0  # Check every 2 seconds (OCR is slower)
        
        while time.time() - start_time < timeout:
            # Capture screenshot
            screenshot = self._capture_screenshot_for_ocr(area)
            if not screenshot:
                time.sleep(check_interval)
                continue
            
            # Extract text using OCR
            extracted_text = self._extract_text_from_image(screenshot)
            
            # Check if target text is NOT found (disappeared)
            if not self._text_matches(extracted_text, text, case_sensitive):
                elapsed = time.time() - start_time
                print(f"TextVerify[{self.device_name}]: Text '{text}' disappeared after {elapsed:.1f}s")
                return True
            
            time.sleep(check_interval)
        
        print(f"TextVerify[{self.device_name}]: Text '{text}' still present after {timeout}s")
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
        return self.waitForTextToAppear(expected_state, timeout)
        
    def verify_performance_metric(self, metric_name: str, expected_value: float, tolerance: float = 10.0) -> bool:
        """Performance metrics not applicable for text controller."""
        print(f"TextVerify[{self.device_name}]: Performance metrics not supported by text controller")
        return False
        
    def wait_and_verify(self, verification_type: str, target: str, timeout: float = 10.0, **kwargs) -> bool:
        """Generic wait and verify method for text verification."""
        if verification_type == "text_appears":
            case_sensitive = kwargs.get("case_sensitive", False)
            area = kwargs.get("area", None)
            return self.waitForTextToAppear(target, timeout, case_sensitive, area)
        elif verification_type == "text_disappears":
            case_sensitive = kwargs.get("case_sensitive", False)
            area = kwargs.get("area", None)
            return self.waitForTextToDisappear(target, timeout, case_sensitive, area)
        elif verification_type == "text":
            # Default to text appears
            case_sensitive = kwargs.get("case_sensitive", False)
            area = kwargs.get("area", None)
            return self.waitForTextToAppear(target, timeout, case_sensitive, area)
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
            'ocr_language': self.ocr_language,
            'ocr_config': self.ocr_config,
            'capabilities': [
                'text_appears_verification', 'text_disappears_verification',
                'area_based_ocr', 'case_sensitive_matching'
            ]
        }


# Backward compatibility alias
TextVerificationController = TextVerificationController 
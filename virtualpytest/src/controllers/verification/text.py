"""
Text Verification Controller Implementation

Pure text processing controller - no URL building or path resolution.
"""

import time
import subprocess
import os
import re
from typing import Dict, Any, Optional, Tuple, List
from pathlib import Path
from ..base_controller import VerificationControllerInterface
from .text_lib.text_utils import TextUtils
from .text_lib.text_ocr import TextOCR
from .text_lib.text_processing import TextProcessing
from .text_lib.text_detection import TextDetection
from .text_lib.text_save import TextSave


class TextVerificationController(
    VerificationControllerInterface,
    TextUtils,
    TextOCR,
    TextProcessing,
    TextDetection,
    TextSave
):
    """Text verification controller that uses OCR to detect text on screen."""
    
    def __init__(self, av_controller, **kwargs):
        """
        Initialize the Text Verification controller.
        
        Args:
            av_controller: AV controller for capturing images (dependency injection)
        """
        super().__init__("Text Verification", "text")
        
        # Dependency injection
        self.av_controller = av_controller
        
        # Use AV controller's capture path
        self.captures_path = av_controller.video_capture_path
        
        # Validate required dependencies
        if not self.av_controller:
            raise ValueError("av_controller is required for TextVerificationController")
            
        print(f"[@controller:TextVerification] Initialized with captures path: {self.captures_path}")
        
        # Temporary files for analysis
        self.temp_image_path = None

        # Controller is always ready
        self.is_connected = True
        self.verification_session_id = f"text_verify_{int(time.time())}"

    def connect(self) -> bool:
        """Connect to the text verification controller."""
        self.is_connected = True
        return True

    def disconnect(self) -> bool:
        """Disconnect from the text verification controller."""
        self.is_connected = False
        return True

    def get_status(self) -> Dict[str, Any]:
        """Get the current status of the text verification controller."""
        return {
            "connected": self.is_connected,
            "av_controller": self.av_controller.device_name if self.av_controller else None,
            "controller_type": "text",
            "captures_path": self.captures_path
        }

    def waitForTextToAppear(self, text: str, timeout: float = 10.0, confidence: float = 0.8,
                           area: dict = None, model: str = None, verification_index: int = 0) -> tuple:
        """
        Wait for specific text to appear on screen within a timeout period.
        
        Args:
            text: Text to search for
            timeout: Maximum time to wait in seconds
            confidence: Matching confidence threshold (0.0 to 1.0)
            area: Optional area to search within {x, y, width, height}
            model: Model/device identifier for saving results
            verification_index: Index for naming saved files
            
        Returns:
            tuple: (found, match_location, screenshot_path)
        """
        try:
            print(f"[@controller:TextVerification] Waiting for text to appear: '{text}'")
            print(f"[@controller:TextVerification] Timeout: {timeout}s, Confidence: {confidence}")
            
            # Use the method for core functionality
            found, location, screenshot_path = self._wait_for_text_to_appear(
                text, timeout, confidence, area
            )
            
            if found:
                print(f"[@controller:TextVerification] Text found at location: {location}")
                
                # Save results if needed
                if model and screenshot_path:
                    # Save source image for comparison
                    source_path = self._save_source_image_for_comparison(
                        screenshot_path, model, verification_index
                    )
                    
                    # Save cropped version if area specified
                    if area:
                        cropped_path = self._save_cropped_source_image(
                            screenshot_path, area, model, verification_index
                        )
                
                return True, location, screenshot_path
            else:
                print(f"[@controller:TextVerification] Text not found within {timeout}s")
                return False, None, screenshot_path
                
        except Exception as e:
            print(f"[@controller:TextVerification] Error in waitForTextToAppear: {e}")
            return False, None, ""

    def waitForTextToDisappear(self, text: str, timeout: float = 10.0, confidence: float = 0.8,
                              area: dict = None, model: str = None, verification_index: int = 0) -> tuple:
        """
        Wait for specific text to disappear from screen within a timeout period.
        
        Args:
            text: Text to search for
            timeout: Maximum time to wait in seconds  
            confidence: Matching confidence threshold (0.0 to 1.0)
            area: Optional area to search within {x, y, width, height}
            model: Model/device identifier for saving results
            verification_index: Index for naming saved files
            
        Returns:
            tuple: (disappeared, screenshot_path)
        """
        try:
            print(f"[@controller:TextVerification] Waiting for text to disappear: '{text}'")
            
            # Use the method for core functionality
            disappeared, screenshot_path = self._wait_for_text_to_disappear(
                text, timeout, confidence, area
            )
            
            if disappeared:
                print(f"[@controller:TextVerification] Text disappeared!")
                
                # Save results if needed
                if model and screenshot_path:
                    source_path = self._save_source_image_for_comparison(
                        screenshot_path, model, verification_index
                    )
                
                return True, screenshot_path
            else:
                print(f"[@controller:TextVerification] Text did not disappear within {timeout}s")
                return False, screenshot_path
                
        except Exception as e:
            print(f"[@controller:TextVerification] Error in waitForTextToDisappear: {e}")
            return False, ""

    # =============================================================================
    # Pure Text Processing Methods (No URL Building)
    # =============================================================================

    def detect_text_from_file(self, image_path: str, area: Optional[Dict[str, Any]] = None,
                             enhance_image: bool = False, apply_filters: bool = False) -> Dict[str, Any]:
        """
        Pure text detection from image file.
        
        Args:
            image_path: Path to image file
            area: Optional area to crop for text detection
            enhance_image: Whether to enhance image for better OCR
            apply_filters: Whether to apply filters
            
        Returns:
            Dict with success, extracted_text, temp_image_path
        """
        try:
            if not os.path.exists(image_path):
                return {
                    'success': False,
                    'message': 'Invalid or missing image path'
                }
            
            # Use controller orchestration for complete workflow
            detection_result = self._detect_and_process_text(
                image_path=image_path,
                area=area,
                include_language_detection=True,
                apply_filters=apply_filters
            )
            
            # Check if detection was successful
            if not detection_result.get('extracted_text'):
                return {
                    'success': False,
                    'message': 'No text detected in image',
                    'extracted_text': '',
                    'temp_image_path': detection_result.get('temp_image_path')
                }
            
            # Build successful result
            result = {
                'success': True,
                **detection_result  # Include all orchestrated results
            }
            
            return result
            
        except Exception as e:
            print(f"[@controller:TextVerification] Error in detect_text_from_file: {e}")
            return {
                'success': False,
                'message': f'Text detection failed: {str(e)}'
            }

    # =============================================================================
    # Verification Interface Methods
    # =============================================================================

    def verify_text_appears(self, text: str, timeout: float = 10.0, confidence: float = 0.8) -> bool:
        """Verify that specific text appears on screen."""
        found, _, _ = self.waitForTextToAppear(text, timeout, confidence)
        return found

    def verify_screen_state(self, expected_text: str, timeout: float = 5.0) -> bool:
        """Verify screen state by looking for specific text."""
        found, _, _ = self.waitForTextToAppear(expected_text, timeout)
        return found

    def wait_and_verify(self, verification_type: str, target: str, timeout: float = 10.0, **kwargs) -> bool:
        """Generic wait and verify method."""
        try:
            if verification_type == 'text_appears':
                found, _, _ = self.waitForTextToAppear(target, timeout, **kwargs)
                return found
            elif verification_type == 'text_disappears':
                disappeared, _ = self.waitForTextToDisappear(target, timeout, **kwargs)
                return disappeared
            else:
                print(f"[@controller:TextVerification] Unknown verification type: {verification_type}")
                return False
        except Exception as e:
            print(f"[@controller:TextVerification] Error in wait_and_verify: {e}")
            return False

    def get_available_verifications(self) -> list:
        """Get list of available verification types."""
        return [
            {
                "type": "text_appears",
                "name": "Wait for Text to Appear",
                "description": "Wait for specific text to appear on screen",
                "parameters": ["text", "timeout", "confidence", "area"]
            },
            {
                "type": "text_disappears",
                "name": "Wait for Text to Disappear", 
                "description": "Wait for specific text to disappear from screen",
                "parameters": ["text", "timeout", "confidence", "area"]
            }
        ]

    def execute_verification(self, verification_config: Dict[str, Any], source_path: str = None) -> Dict[str, Any]:
        """Execute a verification based on configuration."""
        try:
            verification_type = verification_config.get('type')
            
            if verification_type == 'text_appears':
                text = verification_config.get('text', '')
                timeout = verification_config.get('timeout', 10.0)
                confidence = verification_config.get('confidence', 0.8)
                area = verification_config.get('area')
                
                found, location, screenshot_path = self.waitForTextToAppear(
                    text, timeout, confidence, area,
                    verification_config.get('model'),
                    verification_config.get('verification_index', 0)
                )
                
                return {
                    'success': found,
                    'type': verification_type,
                    'text': text,
                    'screenshot_path': screenshot_path,
                    'match_location': location,
                    'confidence': confidence,
                    'message': f"Text {'found' if found else 'not found'}"
                }
                
            elif verification_type == 'text_disappears':
                text = verification_config.get('text', '')
                timeout = verification_config.get('timeout', 10.0)
                confidence = verification_config.get('confidence', 0.8)
                area = verification_config.get('area')
                
                disappeared, screenshot_path = self.waitForTextToDisappear(
                    text, timeout, confidence, area,
                    verification_config.get('model'),
                    verification_config.get('verification_index', 0)
                )
                
                return {
                    'success': disappeared,
                    'type': verification_type,
                    'text': text,
                    'screenshot_path': screenshot_path,
                    'confidence': confidence,
                    'message': f"Text {'disappeared' if disappeared else 'did not disappear'}"
                }
                
            else:
                return {
                    'success': False,
                    'type': verification_type,
                    'message': f"Unknown verification type: {verification_type}"
                }
                
        except Exception as e:
            print(f"[@controller:TextVerification] Error in execute_verification: {e}")
            return {
                'success': False,
                'type': verification_config.get('type', 'unknown'),
                'message': f"Verification failed: {str(e)}"
            } 
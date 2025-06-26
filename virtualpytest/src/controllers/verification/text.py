"""
Text Verification Controller Implementation

Modular text verification controller using  architecture for better maintainability.
"""

import time
import subprocess
import os
import re
import requests
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
        
        # Validate required dependency
        if not self.av_controller:
            raise ValueError("av_controller is required for TextVerificationController")
            
        print(f"[@controller:TextVerification] Initialized with AV controller")
        
        # Temporary files for analysis
        self.temp_image_path = Path("/tmp/text_verification")
        self.temp_image_path.mkdir(exist_ok=True)

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
            "controller_type": "text"
        }

    def waitForTextToAppear(self, text: str, timeout: float = 10.0, case_sensitive: bool = False, 
                           area: dict = None, image_list: List[str] = None, model: str = None,
                           verification_index: int = 0, image_filter: str = None) -> Tuple[bool, str, dict]:
        """
        Wait for specific text to appear on screen within a timeout period.
        
        Args:
            text: Text to wait for
            timeout: Maximum time to wait in seconds
            case_sensitive: Whether text matching should be case sensitive
            area: Optional area to search within {x, y, width, height}
            image_list: Optional list to store captured images
            model: Model/device identifier for saving results
            verification_index: Index for naming saved files
            image_filter: Optional filter to apply ('greyscale', 'binary', 'none')
            
        Returns:
            tuple: (found, image_path, extracted_info)
        """
        try:
            print(f"[@controller:TextVerification] Waiting for text '{text}' to appear...")
            print(f"[@controller:TextVerification] Timeout: {timeout}s, Case sensitive: {case_sensitive}")
            if area:
                print(f"[@controller:TextVerification] Search area: {area}")
            if image_filter:
                print(f"[@controller:TextVerification] Using filter: {image_filter}")
            
            # Use the  method for core functionality
            found, capture_path, info = self._wait_for_text_to_appear(
                text, timeout, case_sensitive, area, image_filter
            )
            
            if found:
                print(f"[@controller:TextVerification] Text '{text}' found!")
                
                # Save source image for comparison if needed
                if model and capture_path:
                    source_path = self._save_source_image_for_comparison(
                        capture_path, model, verification_index
                    )
                    
                    # Save cropped version if area specified
                    if area:
                        cropped_path = self._save_cropped_source_image(
                            capture_path, area, model, verification_index
                        )
                
                # Add to image list if provided
                if image_list is not None and capture_path:
                    image_list.append(capture_path)
                
                return True, capture_path, {
                    'text': text,
                    'extracted_text': info.get('extracted_text', ''),
                    'elapsed_time': info.get('elapsed_time', 0),
                    'area': area,
                    'filter': image_filter,
                    'model': model,
                    'verification_index': verification_index
                }
            else:
                print(f"[@controller:TextVerification] Text '{text}' not found within {timeout}s")
                return False, "", {}
                
        except Exception as e:
            print(f"[@controller:TextVerification] Error in waitForTextToAppear: {e}")
            return False, "", {'error': str(e)}

    def waitForTextToDisappear(self, text: str, timeout: float = 10.0, case_sensitive: bool = False,
                              area: dict = None, image_list: List[str] = None, model: str = None,
                              verification_index: int = 0, image_filter: str = None) -> Tuple[bool, str, dict]:
        """
        Wait for specific text to disappear from screen within a timeout period.
        
        Args:
            text: Text to wait for disappearance
            timeout: Maximum time to wait in seconds
            case_sensitive: Whether text matching should be case sensitive
            area: Optional area to search within {x, y, width, height}
            image_list: Optional list to store captured images
            model: Model/device identifier for saving results
            verification_index: Index for naming saved files
            image_filter: Optional filter to apply ('greyscale', 'binary', 'none')
            
        Returns:
            tuple: (disappeared, image_path, extracted_info)
        """
        try:
            print(f"[@controller:TextVerification] Waiting for text '{text}' to disappear...")
            print(f"[@controller:TextVerification] Timeout: {timeout}s, Case sensitive: {case_sensitive}")
            if area:
                print(f"[@controller:TextVerification] Search area: {area}")
            if image_filter:
                print(f"[@controller:TextVerification] Using filter: {image_filter}")
            
            # Use the  method for core functionality
            disappeared, capture_path, info = self._wait_for_text_to_disappear(
                text, timeout, case_sensitive, area, image_filter
            )
            
            if disappeared:
                print(f"[@controller:TextVerification] Text '{text}' disappeared!")
                
                # Save source image for comparison if needed
                if model and capture_path:
                    source_path = self._save_source_image_for_comparison(
                        capture_path, model, verification_index
                    )
                    
                    # Save cropped version if area specified
                    if area:
                        cropped_path = self._save_cropped_source_image(
                            capture_path, area, model, verification_index
                        )
                
                # Add to image list if provided
                if image_list is not None and capture_path:
                    image_list.append(capture_path)
                
                return True, capture_path, {
                    'text': text,
                    'extracted_text': info.get('extracted_text', ''),
                    'elapsed_time': info.get('elapsed_time', 0),
                    'area': area,
                    'filter': image_filter,
                    'model': model,
                    'verification_index': verification_index
                }
            else:
                print(f"[@controller:TextVerification] Text '{text}' did not disappear within {timeout}s")
                return False, "", {}
                
        except Exception as e:
            print(f"[@controller:TextVerification] Error in waitForTextToDisappear: {e}")
            return False, "", {'error': str(e)}

    # Verification interface methods (stubs for compatibility)
    def verify_image_appears(self, image_name: str, timeout: float = 10.0, confidence: float = 0.8) -> bool:
        """Verify that an image appears (not implemented for text controller)."""
        print(f"[@controller:TextVerification] verify_image_appears not implemented")
        return False

    def verify_element_exists(self, element_id: str, element_type: str = "any") -> bool:
        """Verify that an element exists (not implemented for text controller)."""
        print(f"[@controller:TextVerification] verify_element_exists not implemented")
        return False

    def verify_audio_playing(self, min_level: float = 10.0, duration: float = 2.0) -> bool:
        """Verify that audio is playing (delegated to AV controller)."""
        if self.av_controller:
            return self.av_controller.verify_audio_playing(min_level, duration)
        return False

    def verify_video_playing(self, motion_threshold: float = 5.0, duration: float = 3.0) -> bool:
        """Verify that video is playing (delegated to AV controller)."""
        if self.av_controller:
            return self.av_controller.verify_video_playing(motion_threshold, duration)
        return False

    def verify_color_present(self, color: str, tolerance: float = 10.0) -> bool:
        """Verify that a color is present (not implemented for text controller)."""
        print(f"[@controller:TextVerification] verify_color_present not implemented")
        return False

    def verify_screen_state(self, expected_state: str, timeout: float = 5.0) -> bool:
        """Verify screen state by looking for specific text."""
        found, _, _ = self.waitForTextToAppear(expected_state, timeout)
        return found

    def verify_performance_metric(self, metric_name: str, expected_value: float, tolerance: float = 10.0) -> bool:
        """Verify performance metrics (not implemented for text controller)."""
        print(f"[@controller:TextVerification] verify_performance_metric not implemented")
        return False

    def wait_and_verify(self, verification_type: str, target: str, timeout: float = 10.0, **kwargs) -> bool:
        """
        Generic wait and verify method.
        
        Args:
            verification_type: Type of verification ('text_appears', 'text_disappears')
            target: Target text to verify
            timeout: Maximum time to wait
            **kwargs: Additional parameters
            
        Returns:
            bool: True if verification passed
        """
        try:
            if verification_type == 'text_appears':
                found, _, _ = self.waitForTextToAppear(target, timeout, **kwargs)
                return found
            elif verification_type == 'text_disappears':
                disappeared, _, _ = self.waitForTextToDisappear(target, timeout, **kwargs)
                return disappeared
            else:
                print(f"[@controller:TextVerification] Unknown verification type: {verification_type}")
                return False
        except Exception as e:
            print(f"[@controller:TextVerification] Error in wait_and_verify: {e}")
            return False

    def get_available_verifications(self) -> List[Dict[str, Any]]:
        """Get list of available verification types."""
        return [
            {
                "type": "text_appears",
                "name": "Wait for Text to Appear",
                "description": "Wait for specific text to appear on screen",
                "parameters": ["text", "timeout", "case_sensitive", "area", "image_filter"]
            },
            {
                "type": "text_disappears", 
                "name": "Wait for Text to Disappear",
                "description": "Wait for specific text to disappear from screen",
                "parameters": ["text", "timeout", "case_sensitive", "area", "image_filter"]
            },
            {
                "type": "text_language_detection",
                "name": "Detect Text Language",
                "description": "Detect the language of text in an image",
                "parameters": ["image_path"]
            }
        ]

    def execute_verification(self, verification_config: Dict[str, Any], source_path: str = None) -> Dict[str, Any]:
        """
        Execute a verification based on configuration.
        
        Args:
            verification_config: Configuration dictionary containing verification details
            source_path: Optional source image path
            
        Returns:
            dict: Verification result
        """
        try:
            verification_type = verification_config.get('type')
            
            if verification_type == 'text_appears':
                text = verification_config.get('text', '')
                timeout = verification_config.get('timeout', 10.0)
                case_sensitive = verification_config.get('case_sensitive', False)
                area = verification_config.get('area')
                image_filter = verification_config.get('image_filter')
                
                found, image_path, info = self.waitForTextToAppear(
                    text, timeout, case_sensitive, area, None, 
                    verification_config.get('model'), 
                    verification_config.get('verification_index', 0),
                    image_filter
                )
                
                return {
                    'success': found,
                    'type': verification_type,
                    'text': text,
                    'image_path': image_path,
                    'extracted_text': info.get('extracted_text', ''),
                    'elapsed_time': info.get('elapsed_time', 0),
                    'message': f"Text '{text}' {'found' if found else 'not found'}"
                }
                
            elif verification_type == 'text_disappears':
                text = verification_config.get('text', '')
                timeout = verification_config.get('timeout', 10.0)
                case_sensitive = verification_config.get('case_sensitive', False)
                area = verification_config.get('area')
                image_filter = verification_config.get('image_filter')
                
                disappeared, image_path, info = self.waitForTextToDisappear(
                    text, timeout, case_sensitive, area, None,
                    verification_config.get('model'),
                    verification_config.get('verification_index', 0),
                    image_filter
                )
                
                return {
                    'success': disappeared,
                    'type': verification_type,
                    'text': text,
                    'image_path': image_path,
                    'extracted_text': info.get('extracted_text', ''),
                    'elapsed_time': info.get('elapsed_time', 0),
                    'message': f"Text '{text}' {'disappeared' if disappeared else 'did not disappear'}"
                }
                
            elif verification_type == 'text_language_detection':
                image_path = source_path or verification_config.get('image_path')
                if not image_path:
                    return {
                        'success': False,
                        'type': verification_type,
                        'message': 'No image path provided for language detection'
                    }
                
                primary_lang, primary_conf, secondary_lang, secondary_conf = self._detect_text_language(image_path)
                
                return {
                    'success': True,
                    'type': verification_type,
                    'image_path': image_path,
                    'primary_language': primary_lang,
                    'primary_confidence': primary_conf,
                    'secondary_language': secondary_lang,
                    'secondary_confidence': secondary_conf,
                    'primary_language_name': self._get_language_name(primary_lang),
                    'message': f"Detected language: {self._get_language_name(primary_lang)} ({primary_conf:.2f})"
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

    def save_text_reference(self, text: str, reference_name: str, model: str, 
                           area: dict, font_size: float = 12.0, confidence: float = 0.8) -> str:
        """
        Save a text reference for future verification use.
        
        Args:
            text: The reference text
            reference_name: Name for the reference  
            model: Model/device identifier
            area: Area where text was found
            font_size: Detected font size
            confidence: Detection confidence
            
        Returns:
            str: Path to saved reference file
        """
        return self._save_text_reference(text, reference_name, model, area, font_size, confidence)

    def auto_detect_text(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Auto-detect text in an image with language detection and enhancement.
        
        Args:
            request_data: Request containing image path and parameters
            
        Returns:
            dict: Detection results including text, language, and processed images
        """
        try:
            image_path = request_data.get('image_path')
            area = request_data.get('area')
            enhance_image = request_data.get('enhance_image', False)
            
            if not image_path or not os.path.exists(image_path):
                return {
                    'success': False,
                    'message': 'Invalid or missing image path'
                }
            
            # Extract text from area or full image
            extracted_text, temp_path = self._extract_text_from_area(image_path, area)
            
            if not extracted_text:
                return {
                    'success': False,
                    'message': 'No text detected in image',
                    'extracted_text': '',
                    'temp_image_path': temp_path
                }
            
            # Detect language
            primary_lang, primary_conf, secondary_lang, secondary_conf = self._detect_text_language(
                temp_path or image_path
            )
            
            # Build result
            result = {
                'success': True,
                'extracted_text': extracted_text,
                'character_count': len(extracted_text),
                'word_count': len(extracted_text.split()),
                'primary_language': primary_lang,
                'primary_language_name': self._get_language_name(primary_lang),
                'primary_confidence': primary_conf,
                'secondary_language': secondary_lang,
                'secondary_confidence': secondary_conf,
                'tesseract_language': self._convert_to_tesseract_lang(primary_lang),
                'temp_image_path': temp_path,
                'area': area
            }
            
            # Add image URL for display
            if temp_path:
                result['temp_image_url'] = self._build_image_url(temp_path)
            
            return result
            
        except Exception as e:
            print(f"[@controller:TextVerification] Error in auto_detect_text: {e}")
            return {
                'success': False,
                'message': f'Text detection failed: {str(e)}'
            }

    def save_text_reference_from_request(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Save a text reference from request data.
        
        Args:
            request_data: Request containing reference details
            
        Returns:
            dict: Save operation result
        """
        try:
            text = request_data.get('text', '').strip()
            reference_name = request_data.get('reference_name', '').strip()
            model = request_data.get('model', 'unknown')
            area = request_data.get('area', {})
            font_size = request_data.get('font_size', 12.0)
            confidence = request_data.get('confidence', 0.8)
            
            if not text or not reference_name:
                return {
                    'success': False,
                    'message': 'Text and reference name are required'
                }
            
            # Save the reference
            saved_path = self.save_text_reference(
                text, reference_name, model, area, font_size, confidence
            )
            
            if saved_path:
                return {
                    'success': True,
                    'message': f'Text reference "{reference_name}" saved successfully',
                    'reference_path': saved_path,
                    'text': text,
                    'reference_name': reference_name,
                    'model': model
                }
            else:
                return {
                    'success': False,
                    'message': 'Failed to save text reference'
                }
                
        except Exception as e:
            print(f"[@controller:TextVerification] Error saving text reference: {e}")
            return {
                'success': False,
                'message': f'Failed to save reference: {str(e)}'
            } 
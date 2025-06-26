"""
Text Verification Controller Implementation

Modular text verification controller using centralized URL building architecture.
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
from src.utils.build_url_utils import (
    buildCroppedImageUrl, 
    buildHostImageUrl, 
    get_device_local_captures_path
)


class TextVerificationController(
    VerificationControllerInterface,
    TextUtils,
    TextOCR,
    TextProcessing,
    TextDetection,
    TextSave
):
    """Text verification controller that uses OCR to detect text on screen."""
    
    def __init__(self, av_controller, host_info=None, device_id=None, **kwargs):
        """
        Initialize the Text Verification controller.
        
        Args:
            av_controller: AV controller for capturing images (dependency injection)
            host_info: Host information from device registration
            device_id: Device ID from device registration
        """
        super().__init__("Text Verification", "text")
        
        # Dependency injection
        self.av_controller = av_controller
        self.host_info = host_info
        self.device_id = device_id
        
        # Validate required dependencies
        if not self.av_controller:
            raise ValueError("av_controller is required for TextVerificationController")
            
        if not self.host_info:
            print(f"[@controller:TextVerification] Warning: No host_info provided, URL building may fail")
            
        print(f"[@controller:TextVerification] Initialized with AV controller for device: {device_id}")
        
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

    # =============================================================================
    # Context Methods (Get host info from existing architecture)
    # =============================================================================

    def _get_host_info(self):
        """Get host info from controller manager context."""
        from src.controllers.controller_manager import get_host
        host = get_host()
        return host.to_dict()

    def _get_device_id(self) -> str:
        """Get device ID from av_controller context."""
        if hasattr(self.av_controller, 'device_name'):
            # Extract device_id from device_name like "device1"
            device_name = self.av_controller.device_name
            if 'device' in device_name.lower():
                return device_name.lower()
            return f"device1"  # fallback
        return 'device1'  # fallback

    # =============================================================================
    # Controller Orchestration Methods (Coordinate Library Workflows)
    # =============================================================================

    def _detect_and_process_text(self, image_path: str, area: dict = None, 
                                include_language_detection: bool = True, 
                                apply_filters: bool = False) -> Dict[str, Any]:
        """
        Orchestrate complete text detection workflow.
        
        Controller coordinates: OCR → Language Detection → Filtering (if requested)
        
        Args:
            image_path: Path to image to process
            area: Optional area to focus on
            include_language_detection: Whether to detect language
            apply_filters: Whether to create filtered versions
            
        Returns:
            dict: Complete detection results
        """
        try:
            # Step 1: Extract text from image/area (OCR library)
            extracted_text, temp_path = self._extract_text_from_area(image_path, area)
            
            result = {
                'extracted_text': extracted_text,
                'character_count': len(extracted_text) if extracted_text else 0,
                'word_count': len(extracted_text.split()) if extracted_text else 0,
                'temp_image_path': temp_path,
                'area': area
            }
            
            # Step 2: Language detection (if requested and text found)
            if include_language_detection and extracted_text:
                primary_lang, primary_conf, secondary_lang, secondary_conf = self._detect_text_language(
                    temp_path or image_path
                )
                result.update({
                    'primary_language': primary_lang,
                    'primary_language_name': self._get_language_name(primary_lang),
                    'primary_confidence': primary_conf,
                    'secondary_language': secondary_lang,
                    'secondary_confidence': secondary_conf,
                    'tesseract_language': self._convert_to_tesseract_lang(primary_lang)
                })
            
            # Step 3: Create filtered versions (if requested)
            if apply_filters and temp_path:
                self._create_filtered_versions(temp_path)
                print(f"[@controller:TextVerification] Created filtered versions for text processing")
            
            return result
            
        except Exception as e:
            print(f"[@controller:TextVerification] Error in text detection workflow: {e}")
            return {
                'extracted_text': '',
                'character_count': 0,
                'word_count': 0,
                'error': str(e)
            }

    def _save_and_process_text_reference(self, text: str, reference_name: str, 
                                       model: str, area: dict, 
                                       font_size: float = 12.0, 
                                       confidence: float = 0.8,
                                       create_processed_versions: bool = False) -> Dict[str, Any]:
        """
        Orchestrate complete text reference saving workflow.
        
        Controller coordinates: Save Reference → Create Processed Versions (if requested)
        
        Args:
            text: Reference text
            reference_name: Name for reference
            model: Device model
            area: Area where text was found
            font_size: Font size
            confidence: Detection confidence
            create_processed_versions: Whether to create processed versions
            
        Returns:
            dict: Save operation results
        """
        try:
            # Step 1: Save basic text reference (Save library)
            saved_path = self._save_text_reference(
                text, reference_name, model, area, font_size, confidence
            )
            
            result = {
                'success': bool(saved_path),
                'reference_path': saved_path,
                'text': text,
                'reference_name': reference_name,
                'model': model
            }
            
            # Step 2: Create processed versions if requested
            if create_processed_versions and saved_path:
                # Could add additional processing steps here
                # For example: create different text formats, validations, etc.
                print(f"[@controller:TextVerification] Created processed versions for text reference")
                result['processed_versions_created'] = True
            
            return result
            
        except Exception as e:
            print(f"[@controller:TextVerification] Error in text reference save workflow: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    # =============================================================================
    # Path Resolution Methods (Using Centralized Utilities)
    # =============================================================================

    def _get_captures_path(self) -> str:
        """Get the captures directory path using centralized device configuration."""
        host_info = self._get_host_info()
        device_id = self._get_device_id()
        return get_device_local_captures_path(host_info, device_id)

    def _build_image_url(self, local_path: str) -> str:
        """Build URL for accessing images using centralized URL builder."""
        host_info = self._get_host_info()
        return buildHostImageUrl(host_info, local_path)

    def _build_cropped_preview_url(self, filename: str) -> str:
        """Build URL for accessing cropped preview images using centralized URL builder."""
        host_info = self._get_host_info()
        device_id = self._get_device_id()
        return buildCroppedImageUrl(host_info, filename, device_id)

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
                text, timeout, case_sensitive, area
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
                text, timeout, case_sensitive, area
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
                    'model': model,
                    'verification_index': verification_index
                }
            else:
                print(f"[@controller:TextVerification] Text '{text}' did not disappear within {timeout}s")
                return False, "", {}
                
        except Exception as e:
            print(f"[@controller:TextVerification] Error in waitForTextToDisappear: {e}")
            return False, "", {'error': str(e)}

    def verify_screen_state(self, expected_state: str, timeout: float = 5.0) -> bool:
        """Verify screen state by looking for specific text."""
        found, _, _ = self.waitForTextToAppear(expected_state, timeout)
        return found

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
                "type": "text_detection",
                "name": "Detect Text",
                "description": "Detect and extract text from an image",
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

    def detect_text(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Detect text in an image with language detection and enhancement.
        
        Uses controller orchestration to coordinate OCR → Language Detection → Filtering.
        
        Args:
            request_data: Request containing image path and parameters
            
        Returns:
            dict: Detection results including text, language, and processed images
        """
        try:
            image_path = request_data.get('image_path')
            area = request_data.get('area')
            enhance_image = request_data.get('enhance_image', False)
            apply_filters = request_data.get('apply_filters', False)
            
            if not image_path or not os.path.exists(image_path):
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
            
            # Add image URL for display
            temp_path = detection_result.get('temp_image_path')
            if temp_path:
                result['temp_image_url'] = self._build_image_url(temp_path)
            
            return result
            
        except Exception as e:
            print(f"[@controller:TextVerification] Error in detect_text: {e}")
            return {
                'success': False,
                'message': f'Text detection failed: {str(e)}'
            }

    def save_text(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Save a text reference from request data.
        
        Uses controller orchestration to coordinate Save → Process (if requested).
        
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
            create_processed_versions = request_data.get('create_processed_versions', False)
            
            if not text or not reference_name:
                return {
                    'success': False,
                    'message': 'Text and reference name are required'
                }
            
            # Use controller orchestration for complete workflow
            save_result = self._save_and_process_text_reference(
                text=text,
                reference_name=reference_name,
                model=model,
                area=area,
                font_size=font_size,
                confidence=confidence,
                create_processed_versions=create_processed_versions
            )
            
            # Format response message
            if save_result.get('success'):
                message = f'Text reference "{reference_name}" saved successfully'
                if save_result.get('processed_versions_created'):
                    message += ' with processed versions'
                
                return {
                    'success': True,
                    'message': message,
                    **save_result  # Include all orchestrated results
                }
            else:
                return {
                    'success': False,
                    'message': save_result.get('error', 'Failed to save text reference')
                }
                
        except Exception as e:
            print(f"[@controller:TextVerification] Error in save_text: {e}")
            return {
                'success': False,
                'message': f'Failed to save reference: {str(e)}'
            } 
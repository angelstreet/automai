"""
Text Verification Controller

Clean text controller that uses helpers for all operations.
Provides route interfaces and core domain logic.
"""

import os
from typing import Dict, Any, Optional, Tuple, List
from .text_helpers import TextHelpers


class TextVerificationController:
    """Pure text verification controller that uses OCR to detect text on screen."""
    
    def __init__(self, av_controller, **kwargs):
        """
        Initialize the Text Verification controller.
        
        Args:
            av_controller: AV controller for capturing images (dependency injection)
        """
        # Dependency injection
        self.av_controller = av_controller
        
        # Use AV controller's capture path with captures subdirectory
        self.captures_path = os.path.join(av_controller.video_capture_path, 'captures')
        
        # Set verification type for controller lookup
        self.verification_type = 'text'
        
        # Initialize helpers
        self.helpers = TextHelpers(self.captures_path)

        print(f"[@controller:TextVerification] Initialized with captures path: {self.captures_path}")
        
        # Controller is always ready
        self.is_connected = True

    def get_status(self) -> Dict[str, Any]:
        """Get the current status of the text verification controller."""
        return {
            "connected": self.is_connected,
            "av_controller": self.av_controller.device_name if self.av_controller else None,
            "controller_type": "text",

            "captures_path": self.captures_path
        }

    def waitForTextToAppear(self, text: str, timeout: float = 10.0, area: dict = None, 
                           image_list: List[str] = None, 
                           verification_index: int = 0, image_filter: str = 'none') -> Tuple[bool, str, dict]:
        """
        Wait for specific text to appear either in provided image list or by capturing new frames.
        
        Args:
            text: Text pattern to look for 
            timeout: Maximum time to wait in seconds  
            area: Optional area to search (x, y, width, height)
            image_list: Optional list of source image paths to search
            verification_index: Index of verification for naming
            image_filter: Optional image filter to apply
            
        Returns:
            Tuple of (success, message, additional_data)
        """
        # Check if text is provided
        if not text or text.strip() == '':
            error_msg = "No text specified. Please provide text to search for."
            print(f"[@controller:TextVerification] {error_msg}")
            return False, error_msg, {"searchedText": text or "", "image_filter": image_filter, "matching_result": 0.0, "user_threshold": 0.8}
        
        print(f"[@controller:TextVerification] Looking for text pattern: '{text}'")
        if image_filter and image_filter != 'none':
            print(f"[@controller:TextVerification] Using image filter: {image_filter}")
        
        additional_data = {
            "searchedText": text,  # Frontend-expected property name
            "image_filter": image_filter,
            "user_threshold": 0.8  # Default threshold for consistency with image verification
        }
        
        if image_list:
            # Search in provided images
            print(f"[@controller:TextVerification] Searching in {len(image_list)} provided images")
            closest_text = ""
            best_source_path = None
            text_found = False
            best_ocr_confidence = 0.0
            
            for source_path in image_list:
                if not os.path.exists(source_path):
                    continue
                    
                # Extract text from area
                extracted_text, detected_language, language_confidence, ocr_confidence = self._extract_text_from_area(source_path, area, image_filter)
                
                # Keep track of the longest extracted text as "closest" and best OCR confidence
                if len(extracted_text.strip()) > len(closest_text):
                    closest_text = extracted_text.strip()
                    best_source_path = source_path
                    best_ocr_confidence = ocr_confidence
                
                if self._text_matches(extracted_text, text):
                    print(f"[@controller:TextVerification] Text found in {source_path}: '{extracted_text.strip()}'")
                    text_found = True
                    
                    # Save cropped source image for UI comparison using stored device model
                    if area:
                        cropped_source_path = self._save_cropped_source_image(source_path, area, verification_index)
                        if cropped_source_path:
                            additional_data["source_image_path"] = cropped_source_path
                    
                    additional_data["extractedText"] = extracted_text.strip()  # Frontend-expected property name
                    additional_data["detected_language"] = detected_language
                    additional_data["language_confidence"] = language_confidence
                    additional_data["matching_result"] = ocr_confidence  # Use OCR confidence as matching result
                    return True, f"Text pattern '{text}' found: '{extracted_text.strip()}'", additional_data
            
            # If no match found, still save the best source for comparison
            if best_source_path and area:
                cropped_source_path = self._save_cropped_source_image(best_source_path, area, verification_index)
                if cropped_source_path:
                    additional_data["source_image_path"] = cropped_source_path
            
            # Set failure data
            additional_data["extractedText"] = closest_text  # Frontend-expected property name
            additional_data["matching_result"] = best_ocr_confidence  # Use OCR confidence as matching result
            return False, f"Text pattern '{text}' not found", additional_data
        
        else:
            # Capture new image if no image list provided
            print(f"[@controller:TextVerification] No image list provided, using single screenshot")
            
            # Take screenshot (already taken in execute_verification)
            capture_path = self.av_controller.take_screenshot()
            if not capture_path:
                return False, "Failed to capture screen for text verification", additional_data
            
            # Extract text from area
            extracted_text, detected_language, language_confidence, ocr_confidence = self._extract_text_from_area(capture_path, area, image_filter)
            
            if self._text_matches(extracted_text, text):
                print(f"[@controller:TextVerification] Text found in captured frame: '{extracted_text.strip()}'")
                
                # Save cropped source image for UI comparison using stored device model
                if area:
                    cropped_source_path = self._save_cropped_source_image(capture_path, area, verification_index)
                    if cropped_source_path:
                        additional_data["source_image_path"] = cropped_source_path
                
                additional_data["extractedText"] = extracted_text.strip()  # Frontend-expected property name
                additional_data["detected_language"] = detected_language
                additional_data["language_confidence"] = language_confidence
                additional_data["matching_result"] = ocr_confidence  # Use OCR confidence as matching result
                return True, f"Text pattern '{text}' found: '{extracted_text.strip()}'", additional_data
            else:
                # Save cropped source for comparison even on failure
                if area:
                    cropped_source_path = self._save_cropped_source_image(capture_path, area, verification_index)
                    if cropped_source_path:
                        additional_data["source_image_path"] = cropped_source_path
                
                additional_data["extractedText"] = extracted_text.strip()  # Frontend-expected property name
                additional_data["detected_language"] = detected_language
                additional_data["language_confidence"] = language_confidence
                additional_data["matching_result"] = ocr_confidence  # Use OCR confidence as matching result
                return False, f"Text pattern '{text}' not found", additional_data

    def waitForTextToDisappear(self, text: str, timeout: float = 10.0, area: dict = None, 
                              image_list: List[str] = None,
                              verification_index: int = 0, image_filter: str = 'none') -> Tuple[bool, str, dict]:
        """
        Wait for text to disappear by calling waitForTextToAppear and inverting the result.
        """
        # Check if text is provided
        if not text or text.strip() == '':
            error_msg = "No text specified. Please provide text to search for."
            print(f"[@controller:TextVerification] {error_msg}")
            return False, error_msg, {"searchedText": text or "", "image_filter": image_filter, "matching_result": 0.0, "user_threshold": 0.8}
            
        print(f"[@controller:TextVerification] Looking for text pattern to disappear: '{text}'")
        
        # Smart reuse: call waitForTextToAppear and invert result
        found, message, additional_data = self.waitForTextToAppear(text, timeout, area, image_list, verification_index, image_filter)
        
        # Invert the boolean result and adjust the message
        success = not found
        
        # For disappear operations, invert the matching result for UI display to make it intuitive
        # If original confidence was high (text still there), show low (low disappear confidence)
        # If original confidence was low (text not found), show high (high disappear confidence)
        if 'matching_result' in additional_data and additional_data['matching_result'] is not None:
            original_confidence = additional_data['matching_result']
            # Invert confidence for disappear operations: 1.0 - original gives intuitive "disappear percentage"
            inverted_confidence = 1.0 - original_confidence
            additional_data['matching_result'] = inverted_confidence
            additional_data['original_confidence'] = original_confidence  # Keep original for debugging
            print(f"[@controller:TextVerification] Disappear confidence display: {original_confidence:.3f} -> {inverted_confidence:.3f} (inverted for UI)")
        
        if success:
            # Text has disappeared (was not found)
            return True, f"Text disappeared: {message}", additional_data
        else:
            # Text is still present (was found)
            return False, f"Text still present: {message}", additional_data

    def detect_text(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Route interface for text detection."""
        try:
            # Use the controller's helper instance instead of creating a new one
            helpers = self.helpers
            
            # Get source filename from frontend
            image_source_url = data.get('image_source_url', '')
            area = data.get('area')
            
            if not image_source_url:
                return {'success': False, 'message': 'image_source_url is required'}
            
            print(f"[@controller:TextVerification] Detecting text in: {image_source_url}")
            
            # Build full path for local files, keep URLs as-is
            if image_source_url.startswith(('http://', 'https://')):
                # URL case - pass to helpers for downloading
                image_source_path = helpers.download_image(image_source_url)
                print(f"[@controller:TextVerification] Downloaded image to: {image_source_path}")
            else:
                # Local filename case - build full path directly
                image_source_path = os.path.join(self.captures_path, image_source_url)
                
                if not os.path.exists(image_source_path):
                    return {'success': False, 'message': f'Local file not found: {image_source_path}'}
            
            # Detect text in area (includes crop, filter, OCR, language detection)
            result = helpers.detect_text_in_area(image_source_path, area)
            
            if not result.get('extracted_text'):
                return {'success': False, 'message': 'No text detected in image', **result}
            
            return {
                'success': True,
                'source_was_url': image_source_url.startswith(('http://', 'https://')),
                'image_source_path': image_source_path,
                **result
            }
            
        except Exception as e:
            print(f"[@controller:TextVerification] Error in detect_text: {str(e)}")
            return {'success': False, 'message': f'Text detection failed: {str(e)}'}
    
    def save_text(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Route interface for saving text references."""
        try:
            text = data.get('text', '')
            reference_name = data.get('reference_name', 'text_reference')
            area = data.get('area')
            
            if not text:
                return {'success': False, 'message': 'text is required for saving reference'}
            
            # Get device model from request data (frontend provides it)
            device_model = data.get('device_model')
            
            if not device_model:
                return {'success': False, 'message': 'device_model is required for saving reference'}
            
            # Save text reference using helpers (handles database save)
            save_result = self.helpers.save_text_reference(text, reference_name, device_model, area)
            
            if not save_result.get('success'):
                return {
                    'success': False,
                    'message': save_result.get('error', 'Failed to save text reference')
                }
            
            return {
                'success': True,
                'message': f'Text reference saved successfully: {reference_name}',
                'reference_name': save_result.get('reference_name'),
                'reference_id': save_result.get('reference_id'),
                'text_data': save_result.get('text_data')
            }
            
        except Exception as e:
            return {'success': False, 'message': f'Text save failed: {str(e)}'}
    
    def execute_verification(self, verification_config: Dict[str, Any]) -> Dict[str, Any]:
        """Route interface for executing verification."""
        try:
            # Check if a source image path is provided in the config
            source_path = verification_config.get('source_image_path')
            
            if source_path:
                print(f"[@controller:TextVerification] Using provided source image: {source_path}")
                # Validate the provided source image exists
                if not os.path.exists(source_path):
                    return {
                        'success': False,
                        'message': f'Provided source image not found: {source_path}',
                        'screenshot_path': None
                    }
            else:
                # No fallback allowed - source image must be provided
                return {
                    'success': False,
                    'message': 'No source image provided for text verification. Source image is required.',
                    'screenshot_path': None
                }
            
            # Extract parameters from nested structure
            params = verification_config.get('params', {})
            command = verification_config.get('command', 'waitForTextToAppear')
            
            # Required parameters
            text = params.get('text', '')
            if not text:
                return {
                    'success': False,
                    'message': 'No text specified for text verification',
                    'details': {'error': 'Missing text parameter'}
                }
            
            # Optional parameters with defaults
            timeout = params.get('timeout', 0.0)
            area = params.get('area')
            image_filter = params.get('image_filter', 'none')
            
            print(f"[@controller:TextVerification] Executing {command} with text: '{text}'")
            print(f"[@controller:TextVerification] Parameters: timeout={timeout}, area={area}, filter={image_filter}")
            print(f"[@controller:TextVerification] Using source image: {source_path}")
            
            # Execute verification based on command
            if command == 'waitForTextToAppear':
                success, message, details = self.waitForTextToAppear(
                    text=text,
                    timeout=timeout,
                    area=area,
                    image_list=[source_path],  # Use source_path as image list
                    verification_index=0,
                    image_filter=image_filter
                )
            elif command == 'waitForTextToDisappear':
                success, message, details = self.waitForTextToDisappear(
                    text=text,
                    timeout=timeout,
                    area=area,
                    image_list=[source_path],  # Use source_path as image list
                    verification_index=0,
                    image_filter=image_filter
                )
            else:
                return {'success': False, 'message': f'Unsupported verification command: {command}'}
            
            # Return frontend-expected format (consistent with image verification)
            return {
                'success': success,
                'message': message,
                'screenshot_path': source_path,
                'matching_result': details.get('matching_result', 0.0),  # OCR confidence
                'user_threshold': details.get('user_threshold', 0.8),    # User's threshold setting
                'image_filter': details.get('image_filter', image_filter),  # Applied filter
                'extractedText': details.get('extractedText', ''),       # Frontend-expected property name
                'searchedText': details.get('searchedText', text),       # Frontend-expected property name
                'details': details  # Keep for route processing, will be removed by route
            }
                
        except Exception as e:
            print(f"[@controller:TextVerification] Execution error: {e}")
            return {
                'success': False,
                'message': f'Text verification execution error: {str(e)}',
                'screenshot_path': source_path if 'source_path' in locals() else None
            }

    def get_available_verifications(self) -> list:
        """Get list of available verification types."""
        return [
            {
                "command": "waitForTextToAppear",
                "params": {
                    "text": "",             # Empty string for user input
                    "timeout": 0,           # Default: single check, no polling
                    "area": None            # Optional area
                },
                "verification_type": "text"
            },
            {
                "command": "waitForTextToDisappear",
                "params": {
                    "text": "",             # Empty string for user input
                    "timeout": 0,           # Default: single check, no polling
                    "area": None            # Optional area
                },
                "verification_type": "text"
            }
        ] 

    def _extract_text_from_area(self, image_path: str, area: dict = None, image_filter: str = None) -> tuple:
        """
        Extract text from image area using TextHelpers.
        
        Args:
            image_path: Path to the image file
            area: Optional area to crop {'x': x, 'y': y, 'width': width, 'height': height}
            image_filter: Optional filter to apply to the image before OCR
            
        Returns:
            Tuple of (extracted_text, detected_language, language_confidence, ocr_confidence)
        """
        try:
            # Use TextHelpers to extract text (handles cropping, filtering, and OCR)
            result = self.helpers.detect_text_in_area(image_path, area)
            
            extracted_text = result.get('extracted_text', '')
            detected_language = result.get('language', 'eng')
            language_confidence = 0.8 if extracted_text else 0.0  # Simple confidence
            ocr_confidence = 0.8 if extracted_text else 0.0  # Simple confidence
            
            print(f"[@controller:TextVerification] OCR extracted: '{extracted_text.strip()}'")
            
            return extracted_text, detected_language, language_confidence, ocr_confidence
            
        except Exception as e:
            print(f"[@controller:TextVerification] Error extracting text from area: {e}")
            return "", "eng", 0.0, 0.0

    def _text_matches(self, extracted_text: str, target_text: str) -> bool:
        """
        Check if extracted text matches target text using TextHelpers.
        
        Args:
            extracted_text: Text extracted from OCR
            target_text: Text pattern to search for
            
        Returns:
            bool: True if text matches, False otherwise
        """
        try:
            # Use TextHelpers for consistent text matching
            return self.helpers.text_matches(extracted_text, target_text)
        except Exception as e:
            print(f"[@controller:TextVerification] Error in text matching: {e}")
            return False

    def _save_cropped_source_image(self, source_path: str, area: dict, verification_index: int) -> Optional[str]:
        """
        Save cropped source image for UI comparison using ImageHelpers.
        
        Args:
            source_path: Path to source image
            area: Area to crop
            verification_index: Index for naming
            
        Returns:
            str: Path to saved cropped image, None if failed
        """
        try:
            # Import ImageHelpers for cropping (reuse image cropping logic)
            from .image_helpers import ImageHelpers
            image_helpers = ImageHelpers(self.captures_path, self.av_controller)
            
            # Create results directory using device-specific captures path + verification_results
            results_dir = os.path.join(self.captures_path, 'verification_results')
            os.makedirs(results_dir, exist_ok=True)
            
            # Create result file path
            cropped_result_path = f'{results_dir}/text_source_image_{verification_index}.png'
            
            print(f"[@controller:TextVerification] Cropping source image: {source_path} -> {cropped_result_path}")
            
            # Use ImageHelpers to crop the image (reuse existing crop functionality)
            success = image_helpers.crop_image_to_area(source_path, cropped_result_path, area)
            
            if success:
                print(f"[@controller:TextVerification] Successfully cropped text source image")
                return cropped_result_path
            else:
                print(f"[@controller:TextVerification] Failed to crop source image")
                return None
                
        except Exception as e:
            print(f"[@controller:TextVerification] Error cropping source image: {e}")
            return None

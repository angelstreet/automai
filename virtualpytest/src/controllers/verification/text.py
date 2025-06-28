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
                           image_list: List[str] = None, model: str = None,
                           verification_index: int = 0, image_filter: str = 'none') -> Tuple[bool, str, dict]:
        """
        Wait for specific text to appear either in provided image list or by capturing new frames.
        
        Args:
            text: Text pattern to look for 
            timeout: Maximum time to wait in seconds  
            area: Optional area to search (x, y, width, height)
            image_list: Optional list of source image paths to search
            model: Model name for organizing output images
            verification_index: Index of verification for naming
            image_filter: Optional image filter to apply
            
        Returns:
            Tuple of (success, message, additional_data)
        """
        # Check if text is provided
        if not text or text.strip() == '':
            error_msg = "No text specified. Please provide text to search for."
            print(f"[@controller:TextVerification] {error_msg}")
            return False, error_msg, {"searched_text": text or "", "image_filter": image_filter, "threshold": 0.0, "ocr_confidence": 0.0}
        
        print(f"[@controller:TextVerification] Looking for text pattern: '{text}'")
        if image_filter and image_filter != 'none':
            print(f"[@controller:TextVerification] Using image filter: {image_filter}")
        
        additional_data = {
            "searched_text": text,
            "image_filter": image_filter,
            "searchedText": text  # Add this for frontend compatibility
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
                    
                    # Save cropped source image for UI comparison
                    if area and model is not None:
                        cropped_source_path = self._save_cropped_source_image(source_path, area, model, verification_index)
                        if cropped_source_path:
                            # Convert local path to public URL like image verification
                            source_url = self._build_image_url(cropped_source_path)
                            additional_data["source_image_path"] = cropped_source_path
                            additional_data["sourceImageUrl"] = source_url
                    
                    additional_data["extracted_text"] = extracted_text.strip()
                    additional_data["detected_language"] = detected_language
                    additional_data["language_confidence"] = language_confidence
                    additional_data["ocr_confidence"] = ocr_confidence
                    # For text verification, set threshold to 1.0 when text is found
                    additional_data["threshold"] = 1.0
                    return True, f"Text pattern '{text}' found: '{extracted_text.strip()}'", additional_data
            
            # If no match found, still save the best source for comparison
            if best_source_path and area and model is not None:
                cropped_source_path = self._save_cropped_source_image(best_source_path, area, model, verification_index)
                if cropped_source_path:
                    # Convert local path to public URL like image verification
                    source_url = self._build_image_url(cropped_source_path)
                    additional_data["source_image_path"] = cropped_source_path
                    additional_data["sourceImageUrl"] = source_url
            
            # Set failure data
            additional_data["extracted_text"] = closest_text
            additional_data["ocr_confidence"] = best_ocr_confidence
            additional_data["threshold"] = 0.0
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
                
                # Save cropped source image for UI comparison
                if area and model is not None:
                    cropped_source_path = self._save_cropped_source_image(capture_path, area, model, verification_index)
                    if cropped_source_path:
                        # Convert local path to public URL like image verification
                        source_url = self._build_image_url(cropped_source_path)
                        additional_data["source_image_path"] = cropped_source_path
                        additional_data["sourceImageUrl"] = source_url
                
                additional_data["extracted_text"] = extracted_text.strip()
                additional_data["detected_language"] = detected_language
                additional_data["language_confidence"] = language_confidence
                additional_data["ocr_confidence"] = ocr_confidence
                additional_data["threshold"] = 1.0
                return True, f"Text pattern '{text}' found: '{extracted_text.strip()}'", additional_data
            else:
                # Save cropped source for comparison even on failure
                if area and model is not None:
                    cropped_source_path = self._save_cropped_source_image(capture_path, area, model, verification_index)
                    if cropped_source_path:
                        # Convert local path to public URL like image verification
                        source_url = self._build_image_url(cropped_source_path)
                        additional_data["source_image_path"] = cropped_source_path
                        additional_data["sourceImageUrl"] = source_url
                
                additional_data["extracted_text"] = extracted_text.strip()
                additional_data["detected_language"] = detected_language
                additional_data["language_confidence"] = language_confidence
                additional_data["ocr_confidence"] = ocr_confidence
                additional_data["threshold"] = 0.0
                return False, f"Text pattern '{text}' not found", additional_data

    def waitForTextToDisappear(self, text: str, timeout: float = 10.0, area: dict = None, 
                              image_list: List[str] = None, model: str = None,
                              verification_index: int = 0, image_filter: str = 'none') -> Tuple[bool, str, dict]:
        """
        Wait for text to disappear by calling waitForTextToAppear and inverting the result.
        """
        # Check if text is provided
        if not text or text.strip() == '':
            error_msg = "No text specified. Please provide text to search for."
            print(f"[@controller:TextVerification] {error_msg}")
            return False, error_msg, {"searched_text": text or "", "image_filter": image_filter, "threshold": 0.0}
            
        print(f"[@controller:TextVerification] Looking for text pattern to disappear: '{text}'")
        
        # Smart reuse: call waitForTextToAppear and invert result
        found, message, additional_data = self.waitForTextToAppear(text, timeout, area, image_list, model, verification_index, image_filter)
        
        # Invert the boolean result and adjust the message
        success = not found
        
        # For disappear operations, invert the threshold for UI display to make it intuitive
        # If original threshold was 1.0 (text still there), show 0.0 (0% disappeared)
        # If original threshold was 0.0 (text not found), show 1.0 (100% disappeared)
        if 'threshold' in additional_data and additional_data['threshold'] is not None:
            original_threshold = additional_data['threshold']
            # Invert threshold for disappear operations: 1.0 - original gives intuitive "disappear percentage"
            inverted_threshold = 1.0 - original_threshold
            additional_data['threshold'] = inverted_threshold
            additional_data['original_threshold'] = original_threshold  # Keep original for debugging
            print(f"[@controller:TextVerification] Disappear threshold display: {original_threshold:.3f} -> {inverted_threshold:.3f} (inverted for UI)")
        
        if success:
            # Text has disappeared (was not found)
            return True, f"Text disappeared: {message}", additional_data
        else:
            # Text is still present (was found)
            return False, f"Text still present: {message}", additional_data

    def detect_text(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Route interface for text detection."""
        try:
            helpers = TextHelpers(self.captures_path)
            
            # Get source filename from frontend
            image_source_url = data.get('image_source_url', '')
            area = data.get('area')
            
            if not image_source_url:
                return {'success': False, 'message': 'image_source_url is required'}
            
            # Build full path for local files, keep URLs as-is
            if image_source_url.startswith(('http://', 'https://')):
                # URL case - pass to helpers for downloading
                image_source_path = helpers.download_image(image_source_url)
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
            return {'success': False, 'message': f'Text detection failed: {str(e)}'}
    
    def save_text(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Route interface for saving text references."""
        try:
            text = data.get('text', '')
            reference_name = data.get('reference_name', 'text_reference')
            area = data.get('area')
            image_textdetected_path = data.get('image_textdetected_path', '')
            
            if not text:
                return {'success': False, 'message': 'text is required for saving reference'}
            
            if not image_textdetected_path or not os.path.exists(image_textdetected_path):
                return {'success': False, 'message': 'text detected image not found'}
            
            # Save text reference locally (for local file backup)
            helpers = TextHelpers(self.captures_path)
            saved_path = helpers.save_text_reference(text, reference_name, area)
            
            # Return data needed for server step database save
            return {
                'success': bool(saved_path),
                'message': 'Text reference saved successfully' if saved_path else 'Failed to save text reference',
                'saved_path': saved_path,
                'image_textdetected_path': image_textdetected_path,
                # Data for server step
                'reference_name': reference_name,
                'area': area,
                'text_data': {
                    'text': text,
                    'font_size': 12.0,  # Default font size
                    'confidence': 0.8   # Default confidence
                }
            }
            
        except Exception as e:
            return {'success': False, 'message': f'Text save failed: {str(e)}'}
    
    def execute_verification(self, verification_config: Dict[str, Any]) -> Dict[str, Any]:
        """Route interface for executing verification."""
        try:
            # Take screenshot first
            source_path = self.av_controller.take_screenshot()
            if not source_path:
                return {
                    'success': False,
                    'message': 'Failed to capture screenshot for text verification',
                    'screenshot_path': None
                }
            
            # Extract parameters from nested structure (matching previous working commit)
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
            model = params.get('model', 'default')
            
            print(f"[@controller:TextVerification] Executing {command} with text: '{text}'")
            print(f"[@controller:TextVerification] Parameters: timeout={timeout}, area={area}, filter={image_filter}")
            
            # Execute verification based on command
            if command == 'waitForTextToAppear':
                success, message, details = self.waitForTextToAppear(
                    text=text,
                    timeout=timeout,
                    area=area,
                    image_list=[source_path],  # Use source_path as image list
                    model=model,  # Pass device model for image saving
                    verification_index=0,
                    image_filter=image_filter
                )
            elif command == 'waitForTextToDisappear':
                success, message, details = self.waitForTextToDisappear(
                    text=text,
                    timeout=timeout,
                    area=area,
                    image_list=[source_path],  # Use source_path as image list
                    model=model,  # Pass device model for image saving
                    verification_index=0,
                    image_filter=image_filter
                )
            else:
                return {'success': False, 'message': f'Unsupported verification command: {command}'}
            
            # Return unified format
            return {
                'success': success,
                'message': message,
                'command': command,
                'text': text,
                'screenshot_path': source_path,
                'extracted_info': details.get('extracted_text', ''),
                'confidence': details.get('threshold', 1.0 if success else 0.0),
                'details': details
            }
                
        except Exception as e:
            return {'success': False, 'message': f'Verification execution failed: {str(e)}'}

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
        Extract text from image area using Tesseract OCR.
        Uses the exact same cropping approach as image verification.
        
        Args:
            image_path: Path to the image file
            area: Optional area to crop {'x': x, 'y': y, 'width': width, 'height': height}
            image_filter: Optional filter to apply to the image before OCR
            
        Returns:
            Tuple of (extracted_text, detected_language, language_confidence, ocr_confidence)
        """
        try:
            import cv2
            
            # Load image using OpenCV (same as image verification)
            img = cv2.imread(image_path)
            if img is None:
                print(f"[@controller:TextVerification] Could not load image: {image_path}")
                return "", "eng", 0.0, 0.0
            
            # Crop image to area if specified (exact same approach as image verification)
            if area:
                x = int(area['x'])
                y = int(area['y'])
                width = int(area['width'])
                height = int(area['height'])
                
                # Ensure coordinates are within image bounds (same as image verification)
                img_height, img_width = img.shape[:2]
                x = max(0, min(x, img_width - 1))
                y = max(0, min(y, img_height - 1))
                width = min(width, img_width - x)
                height = min(height, img_height - y)
                
                # Crop using OpenCV (exact same as image verification: img[y:y+height, x:x+width])
                img = img[y:y+height, x:x+width]
                
                print(f"[@controller:TextVerification] Image cropped using OpenCV to area ({x},{y},{width},{height})")
            
            # Apply image filter if specified
            if image_filter and image_filter != 'none':
                if image_filter == 'greyscale':
                    img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                    img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)  # Convert back for consistency
                elif image_filter == 'binary':
                    gray_img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                    _, img = cv2.threshold(gray_img, 128, 255, cv2.THRESH_BINARY)
                    img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)  # Convert back for consistency
                print(f"[@controller:TextVerification] Applied {image_filter} filter")
            
            # Use TextHelpers for OCR
            helpers = TextHelpers(self.captures_path)
            
            # Save processed image to temporary file for OCR
            temp_dir = '/tmp/text_ocr'
            os.makedirs(temp_dir, exist_ok=True)
            
            import time
            temp_id = int(time.time()) % 10000  # Simple ID to avoid conflicts
            temp_path = os.path.join(temp_dir, f"text_ocr_{temp_id}.png")
            
            success = cv2.imwrite(temp_path, img)
            if not success:
                print(f"[@controller:TextVerification] Failed to save temporary image for OCR")
                return "", "eng", 0.0, 0.0
            
            # Use TextHelpers to extract text
            result = helpers.detect_text_in_area(temp_path, None)  # Area already cropped
            
            # Clean up temporary file
            try:
                os.unlink(temp_path)
            except:
                pass
            
            extracted_text = result.get('extracted_text', '')
            detected_language = result.get('detected_language', 'eng')
            language_confidence = result.get('language_confidence', 0.0)
            ocr_confidence = result.get('confidence', 0.0)
            
            print(f"[@controller:TextVerification] OCR extracted: '{extracted_text.strip()}'")
            
            return extracted_text, detected_language, language_confidence, ocr_confidence
            
        except Exception as e:
            print(f"[@controller:TextVerification] Error extracting text from area: {e}")
            return "", "eng", 0.0, 0.0

    def _text_matches(self, extracted_text: str, target_text: str) -> bool:
        """
        Check if extracted text matches target text.
        
        Args:
            extracted_text: Text extracted from OCR
            target_text: Text pattern to search for
            
        Returns:
            bool: True if text matches, False otherwise
        """
        try:
            # Use TextHelpers for consistent text matching
            helpers = TextHelpers(self.captures_path)
            return helpers.text_matches(extracted_text, target_text)
        except Exception as e:
            print(f"[@controller:TextVerification] Error in text matching: {e}")
            return False

    def _save_cropped_source_image(self, source_path: str, area: dict, model: str, verification_index: int) -> Optional[str]:
        """
        Save cropped source image for UI comparison.
        
        Args:
            source_path: Path to source image
            area: Area to crop
            model: Device model for organization
            verification_index: Index for naming
            
        Returns:
            str: Path to saved cropped image, None if failed
        """
        try:
            import cv2
            
            # Create results directory
            results_dir = '/var/www/html/stream/verification_results'
            os.makedirs(results_dir, exist_ok=True)
            
            # Create result file path
            cropped_result_path = f'{results_dir}/text_source_image_{verification_index}.png'
            
            print(f"[@controller:TextVerification] Cropping source image: {source_path} -> {cropped_result_path}")
            
            # Load source image
            source_img = cv2.imread(source_path)
            if source_img is None:
                print(f"[@controller:TextVerification] Failed to load source image: {source_path}")
                return None
            
            # Extract crop coordinates
            x = int(area.get('x', 0))
            y = int(area.get('y', 0))
            width = int(area.get('width', source_img.shape[1]))
            height = int(area.get('height', source_img.shape[0]))
            
            # Ensure coordinates are within image bounds
            x = max(0, min(x, source_img.shape[1] - 1))
            y = max(0, min(y, source_img.shape[0] - 1))
            width = min(width, source_img.shape[1] - x)
            height = min(height, source_img.shape[0] - y)
            
            # Crop the image
            cropped_img = source_img[y:y+height, x:x+width]
            
            # Save cropped image
            success = cv2.imwrite(cropped_result_path, cropped_img)
            if success:
                print(f"[@controller:TextVerification] Successfully cropped text source image to {width}x{height} at ({x},{y})")
                return cropped_result_path
            else:
                print(f"[@controller:TextVerification] Failed to save cropped image: {cropped_result_path}")
                return None
                
        except Exception as e:
            print(f"[@controller:TextVerification] Error cropping source image: {e}")
            return None

    def _build_image_url(self, local_path: str) -> str:
        """
        Convert local image path to public URL using device-specific path building.
        
        Args:
            local_path: Local file path
            
        Returns:
            Public URL for the image
        """
        try:
            from src.utils.build_url_utils import buildVerificationResultUrl
            from flask import current_app
            
            # Get host info from current app context
            host_device = getattr(current_app, 'my_host_device', None)
            if not host_device:
                print(f"[@controller:TextVerification] ERROR: No host device found for URL building")
                raise ValueError("Host device context required for URL building - ensure proper request context")
            
            # Build public URL using device-specific path building (already supports multi-device)
            public_url = buildVerificationResultUrl(host_device, local_path)
            print(f"[@controller:TextVerification] Built URL: {local_path} -> {public_url}")
            
            return public_url
            
        except Exception as url_error:
            print(f"[@controller:TextVerification] URL building error: {url_error}")
            raise ValueError(f"Failed to build verification result URL: {url_error}") 
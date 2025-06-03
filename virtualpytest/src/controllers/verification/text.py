"""
Text Verification Controller Implementation

This controller provides OCR-based text verification functionality.
It can wait for text to appear or disappear in specific areas of the screen.
"""

import subprocess
import time
import os
import re
import requests
import cv2
import numpy as np
from typing import Dict, Any, Optional, Tuple, List
from pathlib import Path
from ..base_controllers import VerificationControllerInterface
from .image import apply_image_filter


def _create_filtered_versions(image_path: str) -> None:
    """
    Automatically create greyscale and binary versions of an image.
    
    Args:
        image_path: Path to the original image
    """
    try:
        if not os.path.exists(image_path):
            print(f"[@controller:TextVerification] Original image not found for filtering: {image_path}")
            return
        
        # Get base path and extension
        base_path, ext = os.path.splitext(image_path)
        
        # Create greyscale version
        greyscale_path = f"{base_path}_greyscale{ext}"
        import shutil
        shutil.copy2(image_path, greyscale_path)
        if apply_image_filter(greyscale_path, 'greyscale'):
            print(f"[@controller:TextVerification] Created greyscale version: {greyscale_path}")
        else:
            print(f"[@controller:TextVerification] Failed to create greyscale version: {greyscale_path}")
            # Clean up failed file
            try:
                os.unlink(greyscale_path)
            except:
                pass
        
        # Create binary version
        binary_path = f"{base_path}_binary{ext}"
        shutil.copy2(image_path, binary_path)
        if apply_image_filter(binary_path, 'binary'):
            print(f"[@controller:TextVerification] Created binary version: {binary_path}")
        else:
            print(f"[@controller:TextVerification] Failed to create binary version: {binary_path}")
            # Clean up failed file
            try:
                os.unlink(binary_path)
            except:
                pass
                
    except Exception as e:
        print(f"[@controller:TextVerification] Error creating filtered versions: {e}")


class TextVerificationController(VerificationControllerInterface):
    """Text verification controller that uses OCR to detect text on screen."""
    
    def __init__(self, av_controller, **kwargs):
        """
        Initialize the Text Verification controller.
        
        Args:
            av_controller: Reference to AV controller for screenshot capture
            **kwargs: Optional parameters:
                - ocr_language: Language for OCR (default: 'eng')
        """
        if not av_controller:
            raise ValueError("av_controller is required for screenshot capture")
            
        device_name = f"TextVerify-{av_controller.device_name}"
        super().__init__(device_name)
        
        # AV controller reference for screenshot capture only
        self.av_controller = av_controller
        self.ocr_language = kwargs.get('ocr_language', 'eng')
        
        # Temporary files for analysis
        self.temp_image_path = Path("/tmp/text_verification")
        self.temp_image_path.mkdir(exist_ok=True)

        # Controller is always ready
        self.is_connected = True
        self.verification_session_id = f"text_verify_{int(time.time())}"
        print(f"TextVerify[{self.device_name}]: Ready - Using AV controller: {self.av_controller.device_name}")
        print(f"TextVerify[{self.device_name}]: OCR language: {self.ocr_language}")

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
            "ocr_language": self.ocr_language
        }

    def _save_cropped_source_image(self, source_image_path: str, area: dict, model: str, verification_index: int) -> str:
        """
        Save a cropped version of the source image for UI comparison display (same as image verification).
        
        Args:
            source_image_path: Path to the source image
            area: Area to crop {x, y, width, height}
            model: Model name for directory organization
            verification_index: Index of verification for naming
            
        Returns:
            Path to saved cropped image or None if failed
        """
        try:
            # Create flat directory structure: /tmp/{model}/
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            output_dir = os.path.join(base_dir, 'tmp', model)
            os.makedirs(output_dir, exist_ok=True)
            
            # Use consistent naming: source_cropped_{verification_index}.png
            cropped_source_path = os.path.join(output_dir, f'source_cropped_{verification_index}.png')
            
            # Read and crop source image using OpenCV
            img = cv2.imread(source_image_path)
            if img is None:
                print(f"[@controller:TextVerification] Could not read source image: {source_image_path}")
                return None
                
            # Extract area coordinates
            x = int(area['x'])
            y = int(area['y'])
            width = int(area['width'])
            height = int(area['height'])
            
            # Ensure coordinates are within image bounds
            img_height, img_width = img.shape[:2]
            x = max(0, min(x, img_width - 1))
            y = max(0, min(y, img_height - 1))
            width = min(width, img_width - x)
            height = min(height, img_height - y)
            
            # Crop image to same area used for OCR
            cropped_img = img[y:y+height, x:x+width]
            
            # Save cropped image
            result = cv2.imwrite(cropped_source_path, cropped_img)
            
            if result:
                print(f"[@controller:TextVerification] Saved cropped source: {cropped_source_path}")
                # Automatically create greyscale and binary versions
                _create_filtered_versions(cropped_source_path)
                return cropped_source_path
            else:
                print(f"[@controller:TextVerification] Failed to save cropped source: {cropped_source_path}")
                return None
                
        except Exception as e:
            print(f"[@controller:TextVerification] Error saving cropped source: {e}")
            return None

    def _extract_text_from_image(self, image_path: str) -> str:
        """
        Extract text from image using pytesseract (same as auto-detect).
        
        Args:
            image_path: Path to the image file
            
        Returns:
            Extracted text string
        """
        try:
            import pytesseract
            import cv2
            
            print(f"[@controller:TextVerification] Running OCR on image: {image_path}")
            print(f"[@controller:TextVerification] Image exists: {os.path.exists(image_path)}")
            
            if not os.path.exists(image_path):
                print(f"[@controller:TextVerification] Image file not found: {image_path}")
                return ""
            
            # Load image
            image = cv2.imread(image_path)
            if image is None:
                print(f"[@controller:TextVerification] Could not load image: {image_path}")
                return ""
            
            # Use pytesseract directly (same as auto-detect)
            extracted_text = pytesseract.image_to_string(image, lang=self.ocr_language)
            
            print(f"[@controller:TextVerification] Extracted text: '{extracted_text.strip()}'")
            return extracted_text.strip()
                
        except Exception as e:
            print(f"[@controller:TextVerification] Text extraction error: {e}")
            return ""

    def _text_matches(self, extracted_text: str, target_text: str, case_sensitive: bool = False) -> bool:
        """
        Check if target text is found in extracted text using regex.
        
        Args:
            extracted_text: Text extracted from image
            target_text: Text pattern to search for (regex supported)
            case_sensitive: Whether to match case exactly
            
        Returns:
            True if text matches, False otherwise
        """
        try:
            flags = 0 if case_sensitive else re.IGNORECASE
            pattern = re.compile(target_text, flags)
            return bool(pattern.search(extracted_text))
        except re.error:
            # If regex is invalid, fall back to simple string matching
            if not case_sensitive:
                extracted_text = extracted_text.lower()
                target_text = target_text.lower()
            return target_text in extracted_text

    def _save_source_image_for_comparison(self, source_image_path: str, model: str, verification_index: int) -> str:
        """
        Save the source image for UI comparison display.
        
        Args:
            source_image_path: Path to the source image
            model: Model name for directory organization
            verification_index: Index of verification for naming
            
        Returns:
            Path to saved source image or None if failed
        """
        try:
            # Create flat directory structure: /tmp/{model}/
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            output_dir = os.path.join(base_dir, 'tmp', model)
            os.makedirs(output_dir, exist_ok=True)
            
            # Use consistent naming: source_image_{verification_index}.png
            saved_source_path = os.path.join(output_dir, f'source_image_{verification_index}.png')
            
            # Copy source image to output location
            import shutil
            shutil.copy2(source_image_path, saved_source_path)
            
            print(f"[@controller:TextVerification] Saved source image: {saved_source_path}")
            # Automatically create greyscale and binary versions
            _create_filtered_versions(saved_source_path)
            return saved_source_path
                
        except Exception as e:
            print(f"[@controller:TextVerification] Error saving source image: {e}")
            return None

    def waitForTextToAppear(self, text: str, timeout: float = 10.0, case_sensitive: bool = False, 
                           area: dict = None, image_list: List[str] = None, model: str = None,
                           verification_index: int = 0, image_filter: str = None) -> Tuple[bool, str, dict]:
        """
        Wait for specific text to appear either in provided image list or by capturing new frames.
        
        Args:
            text: Text pattern to look for (regex supported)
            timeout: Maximum time to wait in seconds  
            case_sensitive: Whether to match case exactly
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
            return False, error_msg, {"searched_text": text or "", "image_filter": image_filter, "threshold": 0.0}
        
        print(f"[@controller:TextVerification] Looking for text pattern: '{text}'")
        if image_filter and image_filter != 'none':
            print(f"[@controller:TextVerification] Using image filter: {image_filter}")
        
        additional_data = {
            "searched_text": text,
            "image_filter": image_filter
        }
        
        if image_list:
            # Search in provided images
            print(f"[@controller:TextVerification] Searching in {len(image_list)} provided images")
            closest_text = ""
            best_source_path = None
            text_found = False
            
            for source_path in image_list:
                if not os.path.exists(source_path):
                    continue
                    
                # Create a temporary copy for filtering (don't modify original)
                filtered_source_path = source_path
                if image_filter and image_filter != 'none':
                    import tempfile
                    import shutil
                    
                    # Create temporary file for filtered version
                    temp_fd, temp_path = tempfile.mkstemp(suffix='.png', prefix='filtered_text_source_')
                    os.close(temp_fd)
                    
                    # Copy original to temp location
                    shutil.copy2(source_path, temp_path)
                    
                    # Apply filter to temporary copy
                    if apply_image_filter(temp_path, image_filter):
                        filtered_source_path = temp_path
                        print(f"[@controller:TextVerification] Created filtered copy: {temp_path}")
                    else:
                        print(f"[@controller:TextVerification] Failed to apply filter, using original")
                        os.unlink(temp_path)  # Clean up failed temp file
                        filtered_source_path = source_path
                else:
                    filtered_source_path = source_path
                    
                extracted_text, detected_language, language_confidence = self._extract_text_from_area(filtered_source_path, area)
                
                # Keep track of the longest extracted text as "closest"
                if len(extracted_text.strip()) > len(closest_text):
                    closest_text = extracted_text.strip()
                    best_source_path = source_path  # Always use original path for saving
                
                if self._text_matches(extracted_text, text, case_sensitive):
                    print(f"[@controller:TextVerification] Text found in {source_path}: '{extracted_text.strip()}'")
                    text_found = True
                    
                    # Save cropped source image for UI comparison (from ORIGINAL, not filtered)
                    if area and model is not None:
                        cropped_source_path = self._save_cropped_source_image(source_path, area, model, verification_index)
                        if cropped_source_path:
                            additional_data["source_image_path"] = cropped_source_path
                    
                    # Clean up temp file if it was created
                    if filtered_source_path != source_path and os.path.exists(filtered_source_path):
                        os.unlink(filtered_source_path)
                    
                    additional_data["extracted_text"] = extracted_text.strip()
                    additional_data["detected_language"] = detected_language
                    additional_data["language_confidence"] = language_confidence
                    # For text verification, set threshold to 1.0 when text is found
                    additional_data["threshold"] = 1.0
                    return True, f"Text pattern '{text}' found: '{extracted_text.strip()}'", additional_data
                
                # Clean up temp file if it was created
                if filtered_source_path != source_path and os.path.exists(filtered_source_path):
                    os.unlink(filtered_source_path)
            
            # If no match found, still save the best source for comparison
            if best_source_path and area and model is not None:
                cropped_source_path = self._save_cropped_source_image(best_source_path, area, model, verification_index)
                if cropped_source_path:
                    additional_data["source_image_path"] = cropped_source_path
            elif image_list and model is not None:
                # If no best_source_path but we have image_list, use the first available image
                for source_path in image_list:
                    if os.path.exists(source_path):
                        if area:
                            cropped_source_path = self._save_cropped_source_image(source_path, area, model, verification_index)
                            if cropped_source_path:
                                additional_data["source_image_path"] = cropped_source_path
                        else:
                            saved_source_path = self._save_source_image_for_comparison(source_path, model, verification_index)
                            if saved_source_path:
                                additional_data["source_image_path"] = saved_source_path
                        break
            
            additional_data["extracted_text"] = closest_text
            additional_data["detected_language"] = "eng"
            additional_data["language_confidence"] = 0.0
            # For text verification, set threshold to 0.0 when text is not found
            additional_data["threshold"] = 0.0
            if closest_text:
                return False, f"Text pattern '{text}' not found. Closest text found: '{closest_text}'", additional_data
            else:
                return False, f"Text pattern '{text}' not found in provided images (no text extracted)", additional_data
        
        else:
            # Capture new image if no image list provided
            print(f"[@controller:TextVerification] No image list provided, capturing new image")
            
            capture_path = self.av_controller.capture_screen()
            if not capture_path:
                additional_data["threshold"] = 0.0
                return False, "Failed to capture screen for text verification", additional_data
            
            # Create a temporary copy for filtering (don't modify original)
            filtered_capture_path = capture_path
            if image_filter and image_filter != 'none':
                import tempfile
                import shutil
                
                # Create temporary file for filtered version
                temp_fd, temp_path = tempfile.mkstemp(suffix='.png', prefix='filtered_text_capture_')
                os.close(temp_fd)
                
                # Copy original to temp location
                shutil.copy2(capture_path, temp_path)
                
                # Apply filter to temporary copy
                if apply_image_filter(temp_path, image_filter):
                    filtered_capture_path = temp_path
                    print(f"[@controller:TextVerification] Created filtered capture copy: {temp_path}")
                else:
                    print(f"[@controller:TextVerification] Failed to apply filter, using original capture")
                    os.unlink(temp_path)  # Clean up failed temp file
                    filtered_capture_path = capture_path
            else:
                filtered_capture_path = capture_path
            
            start_time = time.time()
            closest_text = ""
            
            while time.time() - start_time < timeout:
                extracted_text, detected_language, language_confidence = self._extract_text_from_area(filtered_capture_path, area)
                
                # Keep track of the longest extracted text as "closest"
                if len(extracted_text.strip()) > len(closest_text):
                    closest_text = extracted_text.strip()
                
                if self._text_matches(extracted_text, text, case_sensitive):
                    print(f"[@controller:TextVerification] Text found in captured frame: '{extracted_text.strip()}'")
                    
                    # Save cropped source image for UI comparison (from ORIGINAL, not filtered)
                    if area and model is not None:
                        cropped_source_path = self._save_cropped_source_image(capture_path, area, model, verification_index)
                        if cropped_source_path:
                            additional_data["source_image_path"] = cropped_source_path
                    
                    # Clean up temp file if it was created
                    if filtered_capture_path != capture_path and os.path.exists(filtered_capture_path):
                        os.unlink(filtered_capture_path)
                    
                    additional_data["extracted_text"] = extracted_text.strip()
                    additional_data["detected_language"] = detected_language
                    additional_data["language_confidence"] = language_confidence
                    # For text verification, set threshold to 1.0 when text is found
                    additional_data["threshold"] = 1.0
                    return True, f"Text pattern '{text}' found: '{extracted_text.strip()}'", additional_data
                
                # Re-capture if we're in a loop
                if time.time() - start_time < timeout:
                    # Clean up previous temp file
                    if filtered_capture_path != capture_path and os.path.exists(filtered_capture_path):
                        os.unlink(filtered_capture_path)
                    
                    capture_path = self.av_controller.capture_screen()
                    if not capture_path:
                        additional_data["threshold"] = 0.0
                        return False, "Failed to re-capture screen for text verification", additional_data
                    
                    # Create new filtered copy if needed
                    filtered_capture_path = capture_path
                    if image_filter and image_filter != 'none':
                        import tempfile
                        import shutil
                        
                        temp_fd, temp_path = tempfile.mkstemp(suffix='.png', prefix='filtered_text_capture_')
                        os.close(temp_fd)
                        shutil.copy2(capture_path, temp_path)
                        
                        if apply_image_filter(temp_path, image_filter):
                            filtered_capture_path = temp_path
                        else:
                            os.unlink(temp_path)
                            filtered_capture_path = capture_path
                
                time.sleep(0.5)
            
            # Save cropped source for comparison even if not found (from ORIGINAL)
            if area and model is not None:
                cropped_source_path = self._save_cropped_source_image(capture_path, area, model, verification_index)
                if cropped_source_path:
                    additional_data["source_image_path"] = cropped_source_path
            
            # Clean up temp file if it was created
            if filtered_capture_path != capture_path and os.path.exists(filtered_capture_path):
                os.unlink(filtered_capture_path)
            
            additional_data["extracted_text"] = closest_text
            additional_data["detected_language"] = "eng"
            additional_data["language_confidence"] = 0.0
            # For text verification, set threshold to 0.0 when text is not found
            additional_data["threshold"] = 0.0
            if closest_text:
                return False, f"Text pattern '{text}' not found after {timeout}s. Closest text found: '{closest_text}'", additional_data
            else:
                return False, f"Text pattern '{text}' not found after {timeout}s (no text extracted)", additional_data

    def waitForTextToDisappear(self, text: str, timeout: float = 10.0, case_sensitive: bool = False,
                              area: dict = None, image_list: List[str] = None, model: str = None,
                              verification_index: int = 0, image_filter: str = None) -> Tuple[bool, str, dict]:
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
        found, message, additional_data = self.waitForTextToAppear(text, timeout, case_sensitive, area, image_list, model, verification_index, image_filter)
        
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

    def _extract_text_from_area(self, image_path: str, area: dict = None) -> tuple:
        """
        Extract text from image area using Tesseract OCR.
        Uses the exact same cropping approach as image verification.
        
        Args:
            image_path: Path to the image file
            area: Optional area to crop {'x': x, 'y': y, 'width': width, 'height': height}
            
        Returns:
            Tuple of (extracted_text, detected_language, language_confidence)
        """
        try:
            # Load image using OpenCV (same as image verification)
            img = cv2.imread(image_path)
            if img is None:
                print(f"[@controller:TextVerification] Could not load image: {image_path}")
                return "", "eng", 0.0
            
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
            
            # Save cropped image to temporary file for OCR using consistent naming
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            temp_dir = os.path.join(base_dir, 'tmp', 'text_ocr')
            os.makedirs(temp_dir, exist_ok=True)
            
            # Use simple incremental naming instead of timestamp
            import time
            temp_id = int(time.time()) % 10000  # Simple ID to avoid conflicts
            temp_path = os.path.join(temp_dir, f"text_ocr_{temp_id}.png")
            
            success = cv2.imwrite(temp_path, img)
            if not success:
                print(f"[@controller:TextVerification] Failed to save cropped image for OCR: {temp_path}")
                return "", "eng", 0.0
            
            # Run language detection on the cropped image
            detected_language, language_confidence, detected_text = self._detect_text_language(temp_path)
            
            # Clean up temporary file
            try:
                os.unlink(temp_path)
            except:
                pass
                
            return detected_text, detected_language, language_confidence
                
        except Exception as e:
            print(f"[@controller:TextVerification] Text extraction error: {e}")
            return "", "eng", 0.0

    def _detect_text_language(self, image_path: str) -> Tuple[str, float, str]:
        """
        Detect the most likely language in the image using langdetect.
        First extracts text using English OCR, then uses langdetect for language detection.
        
        Args:
            image_path: Path to the image file
            
        Returns:
            Tuple of (language_code, confidence, detected_text)
        """
        try:
            import pytesseract
            import cv2
            
            # Load image for OCR
            image = cv2.imread(image_path)
            if image is None:
                print(f"[@controller:TextVerification] Failed to load image for language detection")
                return 'eng', 0.5, ''
            
            # Extract text using English OCR (same approach as auto-detect)
            detected_text = pytesseract.image_to_string(image, lang='eng').strip()
            print(f"[@controller:TextVerification] Extracted text: '{detected_text}' ({len(detected_text)} chars)")
            
            if not detected_text or len(detected_text) < 3:
                print(f"[@controller:TextVerification] Text too short for reliable language detection")
                return 'eng', 0.5, detected_text
            
            # Try langdetect for language detection
            langdetect_result = self._detect_language_with_langdetect(detected_text)
            if langdetect_result:
                lang_code, confidence = langdetect_result
                print(f"[@controller:TextVerification] langdetect detected: {lang_code} with confidence: {confidence:.3f}")
                
                # Convert to Tesseract language code for consistency
                tesseract_lang = self._convert_to_tesseract_lang(lang_code)
                print(f"[@controller:TextVerification] Using language: {tesseract_lang}")
                
                return tesseract_lang, confidence, detected_text
            else:
                print(f"[@controller:TextVerification] langdetect not available, defaulting to English")
                return 'eng', 0.8, detected_text  # High confidence for English as fallback
                
        except Exception as e:
            print(f"[@controller:TextVerification] Language detection error: {e}")
            return 'eng', 0.5, ''

    def _detect_language_with_langdetect(self, text: str) -> Optional[Tuple[str, float]]:
        """
        Use langdetect library to detect language and confidence.
        
        Args:
            text: Text to analyze for language detection
            
        Returns:
            Tuple of (language_code, confidence) or None if failed
        """
        try:
            # Try to import and use langdetect
            from langdetect import detect_langs
            
            # Detect language with confidence
            lang_probs = detect_langs(text)
            
            if lang_probs and len(lang_probs) > 0:
                # Get the most probable language
                best_lang = lang_probs[0]
                language_code = best_lang.lang
                confidence = best_lang.prob
                
                print(f"[@controller:TextVerification] langdetect result: {language_code} (confidence: {confidence:.3f})")
                
                return language_code, confidence
            else:
                print(f"[@controller:TextVerification] langdetect returned no results")
                return None
            
        except ImportError:
            print(f"[@controller:TextVerification] langdetect not available (pip install langdetect)")
            return None
        except Exception as langdetect_error:
            print(f"[@controller:TextVerification] langdetect error: {langdetect_error}")
            return None

    def _convert_to_tesseract_lang(self, lang_code: str) -> str:
        """
        Convert langdetect language code to Tesseract language code.
        
        Args:
            lang_code: langdetect language code (e.g., 'en', 'fr', 'de', 'it')
            
        Returns:
            Tesseract language code (e.g., 'eng', 'fra', 'deu', 'ita')
        """
        # Mapping from langdetect codes to Tesseract language codes
        lang_to_tesseract = {
            'en': 'eng',    # English
            'fr': 'fra',    # French
            'de': 'deu',    # German
            'it': 'ita',    # Italian
            'es': 'spa',    # Spanish
            'pt': 'por',    # Portuguese
            'nl': 'nld',    # Dutch
            'ru': 'rus',    # Russian
            'ja': 'jpn',    # Japanese
            'ko': 'kor',    # Korean
            'zh-cn': 'chi_sim', # Chinese Simplified
            'zh-tw': 'chi_tra', # Chinese Traditional
            'ar': 'ara',    # Arabic
            'hi': 'hin',    # Hindi
        }
        
        tesseract_code = lang_to_tesseract.get(lang_code, 'eng')  # Default to English
        
        if tesseract_code != 'eng':
            print(f"[@controller:TextVerification] Converted langdetect '{lang_code}' to Tesseract '{tesseract_code}'")
        
        return tesseract_code

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
        Verify screen state based on text content using proper text verification.
        
        Args:
            expected_state: Expected state text to look for
            timeout: Maximum time to wait for state
        """
        # Use proper text verification methods instead of legacy image methods
        success, message, additional_data = self.waitForTextToAppear(expected_state, timeout)
        return success
        
    def verify_performance_metric(self, metric_name: str, expected_value: float, tolerance: float = 10.0) -> bool:
        """Performance metrics not applicable for text controller."""
        print(f"TextVerify[{self.device_name}]: Performance metrics not supported by text controller")
        return False
        
    def wait_and_verify(self, verification_type: str, target: str, timeout: float = 10.0, **kwargs) -> bool:
        """Generic wait and verify method for text verification."""
        if verification_type == "text_appears":
            case_sensitive = kwargs.get("case_sensitive", False)
            area = kwargs.get("area", None)
            success, message, additional_data = self.waitForTextToAppear(target, timeout, case_sensitive, area)
            return success
        elif verification_type == "text_disappears":
            case_sensitive = kwargs.get("case_sensitive", False)
            area = kwargs.get("area", None)
            success, message, additional_data = self.waitForTextToDisappear(target, timeout, case_sensitive, area)
            return success
        elif verification_type == "text":
            # Default to text appears
            case_sensitive = kwargs.get("case_sensitive", False)
            area = kwargs.get("area", None)
            success, message, additional_data = self.waitForTextToAppear(target, timeout, case_sensitive, area)
            return success
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
            'capabilities': [
                'text_appears_verification', 'text_disappears_verification',
                'area_based_ocr', 'case_sensitive_matching'
            ]
        }

    def _capture_screenshot_for_ocr(self, area: dict = None) -> str:
        """
        Capture a screenshot for OCR analysis using the AV controller.
        
        Args:
            area: Optional area to crop {'x': x, 'y': y, 'width': width, 'height': height}
            
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
                cropped_path = self._crop_image_opencv(screenshot_path, area)
                return cropped_path or screenshot_path
                
            return screenshot_path
            
        except Exception as e:
            print(f"TextVerify[{self.device_name}]: Screenshot capture error: {e}")
            return None


# Backward compatibility alias
TextVerificationController = TextVerificationController 
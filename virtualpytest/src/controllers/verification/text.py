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
from typing import Dict, Any, Optional, Tuple, List
from pathlib import Path
from ..base_controllers import VerificationControllerInterface
from .image import apply_image_filter


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
                cropped_path = self._crop_image(screenshot_path, area)
                return cropped_path or screenshot_path
                
            return screenshot_path
            
        except Exception as e:
            print(f"TextVerify[{self.device_name}]: Screenshot capture error: {e}")
            return None

    def _crop_image(self, image_path: str, area: dict) -> str:
        """Crop image to specified area using FFmpeg."""
        try:
            # Handle area as dictionary (same as image verification)
            x = int(area['x'])
            y = int(area['y'])
            width = int(area['width'])
            height = int(area['height'])
            
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
            # Create directory structure
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            output_dir = os.path.join(base_dir, 'tmp', model, f'verification_{verification_index}')
            os.makedirs(output_dir, exist_ok=True)
            
            # Output path for source image
            saved_source_path = os.path.join(output_dir, 'source_image.png')
            
            # Copy source image to output location
            import shutil
            shutil.copy2(source_image_path, saved_source_path)
            
            print(f"[@controller:TextVerification] Saved source image: {saved_source_path}")
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
                    
                extracted_text = self._extract_text_from_area(filtered_source_path, area)
                
                # Keep track of the longest extracted text as "closest"
                if len(extracted_text.strip()) > len(closest_text):
                    closest_text = extracted_text.strip()
                    best_source_path = source_path  # Always use original path for saving
                
                if self._text_matches(extracted_text, text, case_sensitive):
                    print(f"[@controller:TextVerification] Text found in {source_path}: '{extracted_text.strip()}'")
                    text_found = True
                    
                    # Save source image for UI comparison (from ORIGINAL, not filtered)
                    if model is not None:
                        saved_source_path = self._save_source_image_for_comparison(source_path, model, verification_index)
                        if saved_source_path:
                            additional_data["source_image_path"] = saved_source_path
                    
                    # Clean up temp file if it was created
                    if filtered_source_path != source_path and os.path.exists(filtered_source_path):
                        os.unlink(filtered_source_path)
                    
                    additional_data["extracted_text"] = extracted_text.strip()
                    # For text verification, set threshold to 1.0 when text is found
                    additional_data["threshold"] = 1.0
                    return True, f"Text pattern '{text}' found: '{extracted_text.strip()}'", additional_data
                
                # Clean up temp file if it was created
                if filtered_source_path != source_path and os.path.exists(filtered_source_path):
                    os.unlink(filtered_source_path)
            
            # If no match found, still save the best source for comparison
            if best_source_path and model is not None:
                saved_source_path = self._save_source_image_for_comparison(best_source_path, model, verification_index)
                if saved_source_path:
                    additional_data["source_image_path"] = saved_source_path
            elif image_list and model is not None:
                # If no best_source_path but we have image_list, use the first available image
                for source_path in image_list:
                    if os.path.exists(source_path):
                        saved_source_path = self._save_source_image_for_comparison(source_path, model, verification_index)
                        if saved_source_path:
                            additional_data["source_image_path"] = saved_source_path
                        break
            
            additional_data["extracted_text"] = closest_text
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
                extracted_text = self._extract_text_from_area(filtered_capture_path, area)
                
                # Keep track of the longest extracted text as "closest"
                if len(extracted_text.strip()) > len(closest_text):
                    closest_text = extracted_text.strip()
                
                if self._text_matches(extracted_text, text, case_sensitive):
                    print(f"[@controller:TextVerification] Text found in captured frame: '{extracted_text.strip()}'")
                    
                    # Save source image for UI comparison (from ORIGINAL, not filtered)
                    if model is not None:
                        saved_source_path = self._save_source_image_for_comparison(capture_path, model, verification_index)
                        if saved_source_path:
                            additional_data["source_image_path"] = saved_source_path
                    
                    # Clean up temp file if it was created
                    if filtered_capture_path != capture_path and os.path.exists(filtered_capture_path):
                        os.unlink(filtered_capture_path)
                    
                    additional_data["extracted_text"] = extracted_text.strip()
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
            
            # Save source for comparison even if not found (from ORIGINAL)
            if model is not None:
                saved_source_path = self._save_source_image_for_comparison(capture_path, model, verification_index)
                if saved_source_path:
                    additional_data["source_image_path"] = saved_source_path
            
            # Clean up temp file if it was created
            if filtered_capture_path != capture_path and os.path.exists(filtered_capture_path):
                os.unlink(filtered_capture_path)
            
            additional_data["extracted_text"] = closest_text
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

    def _extract_text_from_area(self, image_path: str, area: dict = None) -> str:
        """
        Extract text from image area using Tesseract OCR.
        
        Args:
            image_path: Path to the image file
            area: Optional area to crop {'x': x, 'y': y, 'width': width, 'height': height}
            
        Returns:
            Extracted text string
        """
        try:
            # Crop image if area specified
            input_path = image_path
            if area:
                input_path = self._crop_image(image_path, area)
                if not input_path:
                    input_path = image_path  # Fallback to full image
            
            # Run OCR
            cmd = [
                'tesseract',
                input_path,
                'stdout',
                '-l', self.ocr_language,
                self.ocr_config
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                extracted_text = result.stdout.strip()
                print(f"[@controller:TextVerification] Extracted text: '{extracted_text}'")
                return extracted_text
            else:
                print(f"[@controller:TextVerification] OCR failed: {result.stderr}")
                return ""
                
        except Exception as e:
            print(f"[@controller:TextVerification] Text extraction error: {e}")
            return ""

    def _detect_text_language(self, image_path: str) -> Tuple[str, float, str]:
        """
        Detect the most likely language in the image by testing OCR with multiple languages.
        
        Args:
            image_path: Path to the image file
            
        Returns:
            Tuple of (language_code, confidence, detected_text)
        """
        # Languages to test (English, French, Italian, German)
        languages_to_test = ['eng', 'fra', 'ita', 'deu']
        language_names = {
            'eng': 'English',
            'fra': 'French', 
            'ita': 'Italian',
            'deu': 'German'
        }
        
        best_confidence = 0
        best_language = 'eng'
        best_text = ''
        
        print(f"[@controller:TextVerification] Testing OCR with languages: {languages_to_test}")
        
        try:
            import pytesseract
            import cv2
            
            # Load image for OCR testing
            image = cv2.imread(image_path)
            if image is None:
                print(f"[@controller:TextVerification] Failed to load image for language detection")
                return 'eng', 0.5, ''
            
            # Test each language and find the one with highest confidence
            for lang_code in languages_to_test:
                try:
                    # Run OCR with this specific language
                    test_data = pytesseract.image_to_data(
                        image, 
                        lang=lang_code, 
                        output_type=pytesseract.Output.DICT
                    )
                    
                    # Calculate average confidence for this language
                    lang_confidences = []
                    lang_words = []
                    
                    for i in range(len(test_data['text'])):
                        text = test_data['text'][i].strip()
                        conf = int(test_data['conf'][i])
                        
                        if text and conf > 0:  # Only include confident text
                            lang_confidences.append(conf)
                            lang_words.append(text)
                    
                    if lang_confidences:
                        avg_conf = sum(lang_confidences) / len(lang_confidences)
                        word_count = len(lang_words)
                        detected_text = ' '.join(lang_words)
                        
                        # Weight confidence by number of words found (more words = more reliable)
                        weighted_score = avg_conf * min(word_count / 3.0, 1.0)  # Cap word bonus at 3 words
                        
                        print(f"[@controller:TextVerification] {language_names[lang_code]} ({lang_code}): "
                              f"{avg_conf:.1f}% confidence, {word_count} words, "
                              f"weighted score: {weighted_score:.1f}")
                        
                        if weighted_score > best_confidence:
                            best_confidence = weighted_score
                            best_language = lang_code
                            best_text = detected_text
                            
                except Exception as lang_error:
                    print(f"[@controller:TextVerification] Failed to test language {lang_code}: {lang_error}")
                    continue
            
            language_confidence = best_confidence / 100.0  # Convert to 0-1 range
            
            print(f"[@controller:TextVerification] Best language: {language_names[best_language]} "
                  f"({best_language}) with confidence: {best_confidence:.1f}%")
            
            return best_language, language_confidence, best_text
            
        except Exception as lang_detection_error:
            print(f"[@controller:TextVerification] Language detection failed, using default 'eng': {lang_detection_error}")
            return 'eng', 0.5, ''

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
            'ocr_config': self.ocr_config,
            'capabilities': [
                'text_appears_verification', 'text_disappears_verification',
                'area_based_ocr', 'case_sensitive_matching'
            ]
        }


# Backward compatibility alias
TextVerificationController = TextVerificationController 
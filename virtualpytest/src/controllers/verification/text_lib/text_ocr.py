"""
Text OCR Operations 

Provides OCR functionality, text extraction, and language detection.
"""

import os
import cv2
import subprocess
import tempfile
from typing import Dict, Any, Optional, Tuple
from pathlib import Path


class TextOCR:
    """ providing OCR and text extraction operations."""
    
    def _extract_text_from_image(self, image_path: str) -> str:
        """
        Extract text from an image using OCR.
        
        Args:
            image_path: Path to the image file
            
        Returns:
            str: Extracted text content
        """
        try:
            if not os.path.exists(image_path):
                print(f"[@ocr] Image not found: {image_path}")
                return ""
            
            # Use tesseract OCR
            result = subprocess.run(
                ['tesseract', image_path, 'stdout', '-l', 'eng'],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                extracted_text = result.stdout.strip()
                print(f"[@ocr] Extracted text: '{extracted_text}'")
                return extracted_text
            else:
                print(f"[@ocr] Tesseract failed: {result.stderr}")
                return ""
                
        except subprocess.TimeoutExpired:
            print(f"[@ocr] Tesseract timeout for: {image_path}")
            return ""
        except Exception as e:
            print(f"[@ocr] OCR error: {e}")
            return ""
    
    def _extract_text_from_area(self, image_path: str, area: dict = None) -> tuple:
        """
        Extract text from a specific area of an image.
        
        Note: Image filtering should be handled by the controller separately.
        
        Args:
            image_path: Path to the source image
            area: Area to extract from {x, y, width, height}
            
        Returns:
            tuple: (extracted_text, temp_image_path) 
        """
        try:
            if not os.path.exists(image_path):
                print(f"[@ocr] Source image not found: {image_path}")
                return "", None
            
            temp_image_path = None
            
            # Create temporary file for processing
            with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
                temp_image_path = tmp.name
            
            # Read source image
            img = cv2.imread(image_path)
            if img is None:
                print(f"[@ocr] Failed to load image: {image_path}")
                return "", None
            
            # Crop to area if specified
            if area:
                x = int(area['x'])
                y = int(area['y'])
                width = int(area['width'])
                height = int(area['height'])
                
                # Validate bounds
                img_height, img_width = img.shape[:2]
                if x < 0 or y < 0 or x + width > img_width or y + height > img_height:
                    print(f"[@ocr] Area out of bounds: {area} for image {img_width}x{img_height}")
                    return "", None
                
                # Crop image
                img = img[y:y+height, x:x+width]
            
            # Save cropped image
            cv2.imwrite(temp_image_path, img)
            
            # Note: Image filtering should be handled by the controller
            # Library should only handle core OCR functionality
            
            # Extract text using OCR
            extracted_text = self._extract_text_from_image(temp_image_path)
            
            return extracted_text, temp_image_path
            
        except Exception as e:
            print(f"[@ocr] Error extracting text from area: {e}")
            if temp_image_path and os.path.exists(temp_image_path):
                try:
                    os.unlink(temp_image_path)
                except:
                    pass
            return "", None
    
    def _detect_text_language(self, image_path: str) -> Tuple[str, float, str, float]:
        """
        Detect the language of text in an image.
        
        Args:
            image_path: Path to image containing text
            
        Returns:
            tuple: (primary_lang, primary_confidence, secondary_lang, secondary_confidence)
        """
        try:
            # First extract text
            extracted_text = self._extract_text_from_image(image_path)
            
            if not extracted_text or len(extracted_text.strip()) < 3:
                print(f"[@ocr] Insufficient text for language detection")
                return 'en', 0.5, 'unknown', 0.0
            
            # Use langdetect for text-based language detection
            lang_result = self._detect_language_with_langdetect(extracted_text)
            
            if lang_result:
                primary_lang, primary_conf = lang_result
                return primary_lang, primary_conf, 'unknown', 0.0
            else:
                # Fallback to English
                return 'en', 0.5, 'unknown', 0.0
                
        except Exception as e:
            print(f"[@ocr] Language detection error: {e}")
            return 'en', 0.5, 'unknown', 0.0
    
    def _detect_language_with_langdetect(self, text: str) -> Optional[Tuple[str, float]]:
        """
        Detect language using langdetect library.
        
        Args:
            text: Text to analyze
            
        Returns:
            tuple: (language_code, confidence) or None if detection fails
        """
        try:
            from langdetect import detect, detect_langs
            from langdetect.lang_detect_exception import LangDetectException
            
            # Clean text for better detection
            clean_text = ' '.join(text.split())
            
            if len(clean_text) < 3:
                return None
            
            # Get detailed detection results
            languages = detect_langs(clean_text)
            
            if languages:
                # Return the most probable language
                best_lang = languages[0]
                return best_lang.lang, best_lang.prob
            else:
                # Fallback to simple detection
                lang_code = detect(clean_text)
                return lang_code, 0.8  # Assign reasonable confidence
                
        except LangDetectException as e:
            print(f"[@ocr] Language detection failed: {e}")
            return None
        except ImportError:
            print(f"[@ocr] langdetect library not available")
            return None
        except Exception as e:
            print(f"[@ocr] Unexpected error in language detection: {e}")
            return None
    
    def _capture_screenshot_for_ocr(self, area: dict = None) -> str:
        """
        Capture a screenshot for OCR processing.
        
        Args:
            area: Optional area to capture {x, y, width, height}
            
        Returns:
            str: Path to captured image
        """
        try:
            # Use AV controller to capture screen
            capture_result = self.av_controller.capture_screen()
            
            if not capture_result.get('success'):
                print(f"[@ocr] Screen capture failed")
                return ""
            
            capture_path = capture_result.get('image_path')
            
            if not capture_path or not os.path.exists(capture_path):
                print(f"[@ocr] Capture file not found: {capture_path}")
                return ""
            
            # If area specified, crop the image
            if area:
                # Create temporary file for cropped image
                with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
                    temp_path = tmp.name
                
                # Read and crop image
                img = cv2.imread(capture_path)
                if img is not None:
                    x = int(area['x'])
                    y = int(area['y'])
                    width = int(area['width'])
                    height = int(area['height'])
                    
                    # Validate bounds
                    img_height, img_width = img.shape[:2]
                    if 0 <= x < img_width and 0 <= y < img_height:
                        # Adjust bounds if necessary
                        x2 = min(x + width, img_width)
                        y2 = min(y + height, img_height)
                        
                        # Crop image
                        cropped_img = img[y:y2, x:x2]
                        
                        # Save cropped image
                        if cv2.imwrite(temp_path, cropped_img):
                            print(f"[@ocr] Cropped screenshot saved: {temp_path}")
                            return temp_path
                
                # If cropping failed, use original
                return capture_path
            else:
                return capture_path
                
        except Exception as e:
            print(f"[@ocr] Screenshot capture error: {e}")
            return "" 
"""
Text Detection Operations 

Provides text matching, verification logic, and wait operations.
"""

import time
import os
from typing import Dict, Any, Tuple, List


class TextDetection:
    """ providing text detection and matching operations."""
    
    def _text_matches(self, extracted_text: str, target_text: str, case_sensitive: bool = False) -> bool:
        """
        Check if extracted text matches target text.
        
        Args:
            extracted_text: Text extracted from image
            target_text: Text to match against
            case_sensitive: Whether to perform case-sensitive matching
            
        Returns:
            bool: True if texts match, False otherwise
        """
        try:
            if not extracted_text or not target_text:
                return False
            
            # Clean up whitespace
            extracted_clean = ' '.join(extracted_text.split())
            target_clean = ' '.join(target_text.split())
            
            if not case_sensitive:
                extracted_clean = extracted_clean.lower()
                target_clean = target_clean.lower()
            
            # Check for exact match
            if extracted_clean == target_clean:
                return True
            
            # Check if target text is contained in extracted text
            if target_clean in extracted_clean:
                return True
            
            # Check for partial word matches (useful for OCR errors)
            extracted_words = extracted_clean.split()
            target_words = target_clean.split()
            
            # If target is a single word, check if it appears in extracted words
            if len(target_words) == 1:
                for word in extracted_words:
                    if target_words[0] in word or word in target_words[0]:
                        return True
            
            return False
            
        except Exception as e:
            print(f"[@text_detection] Error in text matching: {e}")
            return False
    
    def _wait_for_text_to_appear(self, text: str, timeout: float = 10.0, 
                                case_sensitive: bool = False, area: dict = None,
                                image_filter: str = None) -> Tuple[bool, str, dict]:
        """
        Wait for specific text to appear on screen.
        
        Args:
            text: Text to wait for
            timeout: Maximum time to wait in seconds
            case_sensitive: Whether matching should be case sensitive
            area: Area to search within {x, y, width, height}
            image_filter: Filter to apply before OCR
            
        Returns:
            tuple: (found, image_path, extracted_info)
        """
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            try:
                # Capture screenshot for OCR
                capture_path = self._capture_screenshot_for_ocr(area)
                
                if not capture_path:
                    time.sleep(0.5)
                    continue
                
                # Extract text from the captured image
                extracted_text, temp_path = self._extract_text_from_area(
                    capture_path, area, image_filter
                )
                
                # Check if target text appears
                if self._text_matches(extracted_text, text, case_sensitive):
                    elapsed_time = time.time() - start_time
                    print(f"[@text_detection] Text '{text}' appeared after {elapsed_time:.2f}s")
                    
                    return True, temp_path or capture_path, {
                        'extracted_text': extracted_text,
                        'target_text': text,
                        'elapsed_time': elapsed_time,
                        'area': area,
                        'filter': image_filter
                    }
                
                # Clean up temporary file
                if temp_path and os.path.exists(temp_path):
                    try:
                        os.unlink(temp_path)
                    except:
                        pass
                
                time.sleep(0.5)
                
            except Exception as e:
                print(f"[@text_detection] Error in wait_for_text_to_appear: {e}")
                time.sleep(0.5)
        
        print(f"[@text_detection] Text '{text}' did not appear within {timeout}s")
        return False, "", {}
    
    def _wait_for_text_to_disappear(self, text: str, timeout: float = 10.0,
                                   case_sensitive: bool = False, area: dict = None,
                                   image_filter: str = None) -> Tuple[bool, str, dict]:
        """
        Wait for specific text to disappear from screen.
        
        Args:
            text: Text to wait for disappearance
            timeout: Maximum time to wait in seconds
            case_sensitive: Whether matching should be case sensitive
            area: Area to search within {x, y, width, height}
            image_filter: Filter to apply before OCR
            
        Returns:
            tuple: (disappeared, image_path, extracted_info)
        """
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            try:
                # Capture screenshot for OCR
                capture_path = self._capture_screenshot_for_ocr(area)
                
                if not capture_path:
                    time.sleep(0.5)
                    continue
                
                # Extract text from the captured image
                extracted_text, temp_path = self._extract_text_from_area(
                    capture_path, area, image_filter
                )
                
                # Check if target text is no longer present
                if not self._text_matches(extracted_text, text, case_sensitive):
                    elapsed_time = time.time() - start_time
                    print(f"[@text_detection] Text '{text}' disappeared after {elapsed_time:.2f}s")
                    
                    return True, temp_path or capture_path, {
                        'extracted_text': extracted_text,
                        'target_text': text,
                        'elapsed_time': elapsed_time,
                        'area': area,
                        'filter': image_filter
                    }
                
                # Clean up temporary file
                if temp_path and os.path.exists(temp_path):
                    try:
                        os.unlink(temp_path)
                    except:
                        pass
                
                time.sleep(0.5)
                
            except Exception as e:
                print(f"[@text_detection] Error in wait_for_text_to_disappear: {e}")
                time.sleep(0.5)
        
        print(f"[@text_detection] Text '{text}' did not disappear within {timeout}s")
        return False, "", {}
    
    def _find_text_in_image(self, image_path: str, text: str, 
                           case_sensitive: bool = False) -> List[Dict[str, Any]]:
        """
        Find all occurrences of text in an image.
        
        Args:
            image_path: Path to image to search
            text: Text to find
            case_sensitive: Whether search should be case sensitive
            
        Returns:
            List of dictionaries containing match information
        """
        try:
            # Extract all text from image
            extracted_text = self._extract_text_from_image(image_path)
            
            if not extracted_text:
                return []
            
            matches = []
            
            # Simple text matching (could be enhanced with position detection)
            if self._text_matches(extracted_text, text, case_sensitive):
                matches.append({
                    'text': text,
                    'extracted_text': extracted_text,
                    'confidence': 1.0,  # Simple binary match
                    'case_sensitive': case_sensitive
                })
            
            return matches
            
        except Exception as e:
            print(f"[@text_detection] Error finding text in image: {e}")
            return [] 
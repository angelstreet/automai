"""
Image Matching Operations Mixin

Provides template matching, image comparison, and verification operations.
"""

import os
import cv2
import numpy as np
import time
from typing import Dict, Any, Optional, Tuple, List


class ImageMatchingMixin:
    """Mixin providing image matching and comparison operations."""
    
    def _wait_for_image_to_appear(self, reference_path: str, area: Dict[str, Any], 
                                 timeout: float = 10.0, threshold: float = 0.8) -> bool:
        """
        Wait for an image to appear in a specific area.
        
        Args:
            reference_path: Path to reference image
            area: Area to search within
            timeout: Maximum time to wait in seconds
            threshold: Matching threshold (0.0 to 1.0)
            
        Returns:
            bool: True if image appeared, False if timeout
        """
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            try:
                # Capture current screen
                capture_result = self.av_controller.capture_screen()
                if not capture_result.get('success'):
                    time.sleep(0.5)
                    continue
                
                capture_path = capture_result.get('image_path')
                if not capture_path or not os.path.exists(capture_path):
                    time.sleep(0.5)
                    continue
                
                # Check if image matches
                match_result = self._match_template_in_area(
                    capture_path, reference_path, area, threshold
                )
                
                if match_result['found']:
                    print(f"[@matching] Image appeared after {time.time() - start_time:.2f}s")
                    return True
                
                time.sleep(0.5)
                
            except Exception as e:
                print(f"[@matching] Error in wait_for_image_to_appear: {e}")
                time.sleep(0.5)
        
        print(f"[@matching] Image did not appear within {timeout}s")
        return False
    
    def _wait_for_image_to_disappear(self, reference_path: str, area: Dict[str, Any],
                                    timeout: float = 10.0, threshold: float = 0.8) -> bool:
        """
        Wait for an image to disappear from a specific area.
        
        Args:
            reference_path: Path to reference image
            area: Area to search within
            timeout: Maximum time to wait in seconds
            threshold: Matching threshold (0.0 to 1.0)
            
        Returns:
            bool: True if image disappeared, False if timeout
        """
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            try:
                # Capture current screen
                capture_result = self.av_controller.capture_screen()
                if not capture_result.get('success'):
                    time.sleep(0.5)
                    continue
                
                capture_path = capture_result.get('image_path')
                if not capture_path or not os.path.exists(capture_path):
                    time.sleep(0.5)
                    continue
                
                # Check if image still matches
                match_result = self._match_template_in_area(
                    capture_path, reference_path, area, threshold
                )
                
                if not match_result['found']:
                    print(f"[@matching] Image disappeared after {time.time() - start_time:.2f}s")
                    return True
                
                time.sleep(0.5)
                
            except Exception as e:
                print(f"[@matching] Error in wait_for_image_to_disappear: {e}")
                time.sleep(0.5)
        
        print(f"[@matching] Image did not disappear within {timeout}s")
        return False
    
    def _match_template_in_area(self, source_path: str, template_path: str, 
                               area: Dict[str, Any], threshold: float = 0.8) -> Dict[str, Any]:
        """
        Match a template image within a specific area of a source image.
        
        Args:
            source_path: Path to source image
            template_path: Path to template image
            area: Area to search within
            threshold: Matching threshold (0.0 to 1.0)
            
        Returns:
            Dict with matching results
        """
        try:
            # Load images
            source_img = cv2.imread(source_path)
            template_img = cv2.imread(template_path)
            
            if source_img is None or template_img is None:
                return {
                    'found': False,
                    'error': 'Failed to load images',
                    'confidence': 0.0
                }
            
            # Extract area from source image
            x = int(area['x'])
            y = int(area['y'])
            width = int(area['width'])
            height = int(area['height'])
            
            # Validate bounds
            src_height, src_width = source_img.shape[:2]
            if x < 0 or y < 0 or x + width > src_width or y + height > src_height:
                return {
                    'found': False,
                    'error': 'Search area out of bounds',
                    'confidence': 0.0
                }
            
            # Crop search area
            search_area = source_img[y:y+height, x:x+width]
            
            # Perform template matching
            result = cv2.matchTemplate(search_area, template_img, cv2.TM_CCOEFF_NORMED)
            
            # Find best match location
            min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(result)
            
            # Check if match exceeds threshold
            found = max_val >= threshold
            
            if found:
                # Calculate absolute coordinates
                match_x = x + max_loc[0]
                match_y = y + max_loc[1]
                template_height, template_width = template_img.shape[:2]
                
                return {
                    'found': True,
                    'confidence': float(max_val),
                    'location': {
                        'x': match_x,
                        'y': match_y,
                        'width': template_width,
                        'height': template_height
                    },
                    'center': {
                        'x': match_x + template_width // 2,
                        'y': match_y + template_height // 2
                    }
                }
            else:
                return {
                    'found': False,
                    'confidence': float(max_val),
                    'threshold': threshold
                }
                
        except Exception as e:
            return {
                'found': False,
                'error': f'Matching error: {str(e)}',
                'confidence': 0.0
            }
    
    def _find_all_matches(self, source_path: str, template_path: str, 
                         threshold: float = 0.8) -> List[Dict[str, Any]]:
        """
        Find all occurrences of a template in a source image.
        
        Args:
            source_path: Path to source image
            template_path: Path to template image
            threshold: Matching threshold (0.0 to 1.0)
            
        Returns:
            List of match dictionaries
        """
        try:
            # Load images
            source_img = cv2.imread(source_path)
            template_img = cv2.imread(template_path)
            
            if source_img is None or template_img is None:
                return []
            
            # Perform template matching
            result = cv2.matchTemplate(source_img, template_img, cv2.TM_CCOEFF_NORMED)
            
            # Find all locations above threshold
            locations = np.where(result >= threshold)
            
            matches = []
            template_height, template_width = template_img.shape[:2]
            
            for pt in zip(*locations[::-1]):  # Switch x and y coordinates
                match = {
                    'confidence': float(result[pt[1], pt[0]]),
                    'location': {
                        'x': int(pt[0]),
                        'y': int(pt[1]),
                        'width': template_width,
                        'height': template_height
                    },
                    'center': {
                        'x': int(pt[0]) + template_width // 2,
                        'y': int(pt[1]) + template_height // 2
                    }
                }
                matches.append(match)
            
            # Sort by confidence (highest first)
            matches.sort(key=lambda x: x['confidence'], reverse=True)
            
            print(f"[@matching] Found {len(matches)} matches above threshold {threshold}")
            return matches
            
        except Exception as e:
            print(f"[@matching] Error finding matches: {e}")
            return [] 
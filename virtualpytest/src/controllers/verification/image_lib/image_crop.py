"""
Image Cropping Operations 

Provides image cropping functionality including reference cropping,
auto-cropping, and coordinate calculations.
"""

import os
import cv2
import numpy as np
from typing import Dict, Any, Optional


class ImageCrop:
    """ providing image cropping operations."""
    
    def _crop_reference_image(self, source_path: str, target_path: str, area: Dict[str, Any]) -> bool:
        """
        Crop an image to a specific area and save it.
        
        Note: Filtered versions should be created by the controller separately.
        
        Args:
            source_path: Path to source image
            target_path: Path to save cropped image
            area: Dictionary with x, y, width, height coordinates
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            if not os.path.exists(source_path):
                print(f"[@crop] Source image not found: {source_path}")
                return False
            
            if not self._validate_area(area):
                print(f"[@crop] Invalid area coordinates: {area}")
                return False
            
            # Load image
            img = cv2.imread(source_path)
            if img is None:
                print(f"[@crop] Failed to load image: {source_path}")
                return False
            
            # Extract coordinates
            x = int(area['x'])
            y = int(area['y'])
            width = int(area['width'])
            height = int(area['height'])
            
            # Validate bounds
            img_height, img_width = img.shape[:2]
            if x < 0 or y < 0 or x + width > img_width or y + height > img_height:
                print(f"[@crop] Crop area out of bounds: {area} for image {img_width}x{img_height}")
                return False
            
            # Crop image
            cropped_img = img[y:y+height, x:x+width]
            
            # Ensure target directory exists
            target_dir = os.path.dirname(target_path)
            self._ensure_directory_exists(target_dir)
            
            # Save cropped image
            success = cv2.imwrite(target_path, cropped_img)
            if success:
                print(f"[@crop] Successfully cropped image: {target_path}")
                return True
            else:
                print(f"[@crop] Failed to save cropped image: {target_path}")
                return False
                
        except Exception as e:
            print(f"[@crop] Error cropping image: {e}")
            return False
    
    def _auto_crop_image(self, image_path: str) -> Optional[Dict[str, int]]:
        """
        Automatically detect and crop content area of an image.
        
        Args:
            image_path: Path to the image to auto-crop
            
        Returns:
            Dict with the detected area coordinates, or None if failed
        """
        try:
            if not os.path.exists(image_path):
                print(f"[@crop] Image not found for auto-crop: {image_path}")
                return None
            
            # Load image
            img = cv2.imread(image_path)
            if img is None:
                print(f"[@crop] Failed to load image for auto-crop: {image_path}")
                return None
            
            # Convert to grayscale
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Apply threshold to get binary image
            _, thresh = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY_INV)
            
            # Find contours
            contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            if not contours:
                print(f"[@crop] No content detected for auto-crop: {image_path}")
                return None
            
            # Get bounding box of all contours
            x_min, y_min, x_max, y_max = float('inf'), float('inf'), 0, 0
            
            for contour in contours:
                x, y, w, h = cv2.boundingRect(contour)
                x_min = min(x_min, x)
                y_min = min(y_min, y)
                x_max = max(x_max, x + w)
                y_max = max(y_max, y + h)
            
            # Add small padding
            padding = 5
            height, width = img.shape[:2]
            x_min = max(0, x_min - padding)
            y_min = max(0, y_min - padding)
            x_max = min(width, x_max + padding)
            y_max = min(height, y_max + padding)
            
            # Crop and save
            cropped_img = img[y_min:y_max, x_min:x_max]
            success = cv2.imwrite(image_path, cropped_img)
            
            if success:
                area = {
                    'x': x_min,
                    'y': y_min,
                    'width': x_max - x_min,
                    'height': y_max - y_min
                }
                print(f"[@crop] Auto-cropped image: {image_path} to area: {area}")
                return area
            else:
                print(f"[@crop] Failed to save auto-cropped image: {image_path}")
                return None
                
        except Exception as e:
            print(f"[@crop] Error in auto-crop: {e}")
            return None 
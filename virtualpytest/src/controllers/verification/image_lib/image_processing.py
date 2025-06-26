"""
Image Processing Operations 

Provides image filtering, background removal, and various processing effects.
"""

import os
import cv2
import numpy as np
import subprocess
from typing import Dict, Any, Optional


class ImageProcessing:
    """ providing image processing operations."""
    
    def _apply_image_filter(self, image_path: str, filter_type: str) -> bool:
        """
        Apply image filter (greyscale or binary) to an image and overwrite it.
        
        Args:
            image_path: Path to the image file
            filter_type: Type of filter ('none', 'greyscale', 'binary')
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            if filter_type == 'none' or not filter_type:
                return True  # No filtering needed
                
            # Read image
            img = cv2.imread(image_path)
            if img is None:
                print(f"[@processing] Failed to load image for filtering: {image_path}")
                return False
            
            if filter_type == 'greyscale':
                # Convert to grayscale
                processed_img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                # Convert back to 3-channel for consistent format
                processed_img = cv2.cvtColor(processed_img, cv2.COLOR_GRAY2BGR)
                
            elif filter_type == 'binary':
                # Convert to grayscale first
                gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                # Apply binary threshold
                _, binary = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY)
                # Convert back to 3-channel
                processed_img = cv2.cvtColor(binary, cv2.COLOR_GRAY2BGR)
                
            else:
                print(f"[@processing] Unknown filter type: {filter_type}")
                return False
            
            # Save processed image
            success = cv2.imwrite(image_path, processed_img)
            if success:
                print(f"[@processing] Applied {filter_type} filter to: {image_path}")
            else:
                print(f"[@processing] Failed to save filtered image: {image_path}")
            
            return success
            
        except Exception as e:
            print(f"[@processing] Error applying filter: {e}")
            return False
    
    def _remove_background(self, image_path: str, method: str = 'rembg') -> bool:
        """
        Remove background from an image using specified method.
        
        Args:
            image_path: Path to the image file
            method: Background removal method ('rembg' or 'opencv')
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            if not os.path.exists(image_path):
                print(f"[@processing] Image not found for background removal: {image_path}")
                return False
            
            if method == 'rembg':
                return self._remove_background_rembg(image_path)
            elif method == 'opencv':
                return self._remove_background_opencv(image_path)
            else:
                print(f"[@processing] Unknown background removal method: {method}")
                return False
                
        except Exception as e:
            print(f"[@processing] Error in background removal: {e}")
            return False
    
    def _process_reference_image(self, image_path: str, autocrop: bool = False, 
                                remove_background: bool = False) -> Optional[Dict[str, int]]:
        """
        Process a reference image with various operations.
        
        Args:
            image_path: Path to the image to process
            autocrop: Whether to auto-crop the image
            remove_background: Whether to remove background
            
        Returns:
            Dict with processed area if autocrop was used, None otherwise
        """
        try:
            processed_area = None
            
            # Auto-crop if requested
            if autocrop:
                processed_area = self._auto_crop_image(image_path)
            
            # Remove background if requested
            if remove_background:
                self._remove_background(image_path)
            
            return processed_area
            
        except Exception as e:
            print(f"[@processing] Error processing reference image: {e}")
            return None
    
    def _create_filtered_versions(self, image_path: str) -> None:
        """Create greyscale and binary versions of an image."""
        try:
            # Get base path and extension
            base_path, ext = os.path.splitext(image_path)
            
            # Create greyscale version
            greyscale_path = f"{base_path}_greyscale{ext}"
            import shutil
            shutil.copy2(image_path, greyscale_path)
            if self._apply_image_filter(greyscale_path, 'greyscale'):
                print(f"[@processing] Created greyscale version: {greyscale_path}")
            
            # Create binary version
            binary_path = f"{base_path}_binary{ext}"
            shutil.copy2(image_path, binary_path)
            if self._apply_image_filter(binary_path, 'binary'):
                print(f"[@processing] Created binary version: {binary_path}")
                
        except Exception as e:
            print(f"[@processing] Error creating filtered versions: {e}")
    
    def _remove_background_rembg(self, image_path: str) -> bool:
        """Remove background using rembg library."""
        try:
            # Use rembg command line tool
            output_path = f"{image_path}_nobg.png"
            result = subprocess.run(
                ['rembg', 'i', image_path, output_path],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0 and os.path.exists(output_path):
                # Replace original with processed
                import shutil
                shutil.move(output_path, image_path)
                print(f"[@processing] Background removed using rembg: {image_path}")
                return True
            else:
                print(f"[@processing] rembg failed: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            print(f"[@processing] rembg timeout for: {image_path}")
            return False
        except Exception as e:
            print(f"[@processing] rembg error: {e}")
            return False
    
    def _remove_background_opencv(self, image_path: str) -> bool:
        """Remove background using OpenCV-based method."""
        try:
            # Load image
            img = cv2.imread(image_path)
            if img is None:
                return False
            
            # Convert to HSV for better color segmentation
            hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
            
            # Create mask for background (assuming white/light background)
            lower_white = np.array([0, 0, 200])
            upper_white = np.array([180, 30, 255])
            mask = cv2.inRange(hsv, lower_white, upper_white)
            
            # Invert mask to get foreground
            mask_inv = cv2.bitwise_not(mask)
            
            # Apply mask
            result = cv2.bitwise_and(img, img, mask=mask_inv)
            
            # Make background transparent by converting to RGBA
            result_rgba = cv2.cvtColor(result, cv2.COLOR_BGR2BGRA)
            result_rgba[:, :, 3] = mask_inv  # Set alpha channel
            
            # Save as PNG to preserve transparency
            success = cv2.imwrite(image_path, result_rgba)
            if success:
                print(f"[@processing] Background removed using OpenCV: {image_path}")
            
            return success
            
        except Exception as e:
            print(f"[@processing] OpenCV background removal error: {e}")
            return False 
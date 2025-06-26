"""
Text Processing Operations 

Provides image filtering and processing specifically for text recognition optimization.
"""

import os
import cv2
import numpy as np
import shutil
from typing import Dict, Any


class TextProcessing:
    """ providing image processing operations for text recognition."""
    
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
                print(f"[@text_processing] Could not read image for filtering: {image_path}")
                return False
            
            if filter_type == 'greyscale':
                # Convert to grayscale
                filtered_img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                # Convert back to 3-channel for consistency
                filtered_img = cv2.cvtColor(filtered_img, cv2.COLOR_GRAY2BGR)
                
            elif filter_type == 'binary':
                # Convert to grayscale first
                gray_img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                # Apply binary threshold (fixed threshold of 127)
                _, binary_img = cv2.threshold(gray_img, 127, 255, cv2.THRESH_BINARY)
                # Convert back to 3-channel for consistency
                filtered_img = cv2.cvtColor(binary_img, cv2.COLOR_GRAY2BGR)
                
            else:
                print(f"[@text_processing] Unknown filter type: {filter_type}")
                return False
            
            # Overwrite original image with filtered version
            result = cv2.imwrite(image_path, filtered_img)
            
            if result:
                print(f"[@text_processing] Applied {filter_type} filter to: {image_path}")
                return True
            else:
                print(f"[@text_processing] Failed to save filtered image: {image_path}")
                return False
                
        except Exception as e:
            print(f"[@text_processing] Error applying filter: {e}")
            return False

    def _create_filtered_versions(self, image_path: str) -> None:
        """
        Automatically create greyscale and binary versions of an image.
        
        Args:
            image_path: Path to the original image
        """
        try:
            if not os.path.exists(image_path):
                print(f"[@text_processing] Original image not found for filtering: {image_path}")
                return
            
            # Get base path and extension
            base_path, ext = os.path.splitext(image_path)
            
            # Create greyscale version
            greyscale_path = f"{base_path}_greyscale{ext}"
            shutil.copy2(image_path, greyscale_path)
            if self._apply_image_filter(greyscale_path, 'greyscale'):
                print(f"[@text_processing] Created greyscale version: {greyscale_path}")
            else:
                print(f"[@text_processing] Failed to create greyscale version: {greyscale_path}")
                # Clean up failed file
                try:
                    os.unlink(greyscale_path)
                except:
                    pass
            
            # Create binary version
            binary_path = f"{base_path}_binary{ext}"
            shutil.copy2(image_path, binary_path)
            if self._apply_image_filter(binary_path, 'binary'):
                print(f"[@text_processing] Created binary version: {binary_path}")
            else:
                print(f"[@text_processing] Failed to create binary version: {binary_path}")
                # Clean up failed file
                try:
                    os.unlink(binary_path)
                except:
                    pass
                    
        except Exception as e:
            print(f"[@text_processing] Error creating filtered versions: {e}")
    
    def _enhance_for_ocr(self, image_path: str) -> str:
        """
        Enhance an image specifically for better OCR results.
        
        Args:
            image_path: Path to the image to enhance
            
        Returns:
            str: Path to enhanced image
        """
        try:
            # Load image
            img = cv2.imread(image_path)
            if img is None:
                return image_path
            
            # Convert to grayscale
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Apply denoising
            denoised = cv2.fastNlMeansDenoising(gray)
            
            # Increase contrast
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
            contrast_enhanced = clahe.apply(denoised)
            
            # Apply adaptive threshold for better text separation
            binary = cv2.adaptiveThreshold(
                contrast_enhanced, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                cv2.THRESH_BINARY, 11, 2
            )
            
            # Morphological operations to clean up text
            kernel = np.ones((1,1), np.uint8)
            cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
            
            # Create enhanced file path
            base_path, ext = os.path.splitext(image_path)
            enhanced_path = f"{base_path}_enhanced{ext}"
            
            # Save enhanced image
            if cv2.imwrite(enhanced_path, cleaned):
                print(f"[@text_processing] Enhanced image for OCR: {enhanced_path}")
                return enhanced_path
            else:
                print(f"[@text_processing] Failed to save enhanced image")
                return image_path
                
        except Exception as e:
            print(f"[@text_processing] Error enhancing image for OCR: {e}")
            return image_path
    
    def _resize_for_ocr(self, image_path: str, scale_factor: float = 2.0) -> str:
        """
        Resize an image to improve OCR accuracy.
        
        Args:
            image_path: Path to the image to resize
            scale_factor: Factor to scale the image by
            
        Returns:
            str: Path to resized image
        """
        try:
            # Load image
            img = cv2.imread(image_path)
            if img is None:
                return image_path
            
            # Get current dimensions
            height, width = img.shape[:2]
            
            # Calculate new dimensions
            new_width = int(width * scale_factor)
            new_height = int(height * scale_factor)
            
            # Resize using high-quality interpolation
            resized = cv2.resize(img, (new_width, new_height), interpolation=cv2.INTER_CUBIC)
            
            # Create resized file path
            base_path, ext = os.path.splitext(image_path)
            resized_path = f"{base_path}_resized{ext}"
            
            # Save resized image
            if cv2.imwrite(resized_path, resized):
                print(f"[@text_processing] Resized image: {resized_path} ({new_width}x{new_height})")
                return resized_path
            else:
                print(f"[@text_processing] Failed to save resized image")
                return image_path
                
        except Exception as e:
            print(f"[@text_processing] Error resizing image: {e}")
            return image_path 
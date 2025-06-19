"""
Image Verification Controller Implementation

This controller provides dedicated image verification functionality using template matching.
It can wait for images to appear or disappear in specific areas of the screen.
Uses reference images from the resources directory.
"""

import subprocess
import time
import os
import cv2
import numpy as np
import requests
from typing import Dict, Any, Optional, Tuple, List
from pathlib import Path
from ..base_controller import VerificationControllerInterface


def crop_reference_image(source_path, target_path, area, create_filtered_versions=True):
    """
    Crop an image to a specific area and save it.
    
    Args:
        source_path: Path to source image
        target_path: Path to save cropped image
        area: Dictionary with x, y, width, height coordinates
        create_filtered_versions: Whether to create greyscale/binary versions (default True)
        
    Returns:
        bool: True if successful, False otherwise
    """

    try:
        # Read source image
        img = cv2.imread(source_path)
        if img is None:
            print(f"Error: Could not read source image: {source_path}")
            return False
            
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
        
        # Crop image
        cropped_img = img[y:y+height, x:x+width]
        
        # Create target directory if it doesn't exist
        os.makedirs(os.path.dirname(target_path), exist_ok=True)
        
        # Save cropped image
        result = cv2.imwrite(target_path, cropped_img)
        
        if result:
            print(f"Reference image saved successfully: {target_path}")
            # Only create filtered versions if requested (for source images, not reference copies)
            if create_filtered_versions:
                _create_filtered_versions(target_path)
            return True
        else:
            print(f"Failed to save reference image: {target_path}")
            return False
            
    except Exception as e:
        print(f"Error cropping reference image: {str(e)}")
        return False


def _create_filtered_versions(image_path: str) -> None:
    """
    Automatically create greyscale and binary versions of an image.
    
    Args:
        image_path: Path to the original image
    """
    try:
        if not os.path.exists(image_path):
            print(f"[@controller:ImageVerification] Original image not found for filtering: {image_path}")
            return
        
        # Get base path and extension
        base_path, ext = os.path.splitext(image_path)
        
        # Create greyscale version
        greyscale_path = f"{base_path}_greyscale{ext}"
        import shutil
        shutil.copy2(image_path, greyscale_path)
        if apply_image_filter(greyscale_path, 'greyscale'):
            print(f"[@controller:ImageVerification] Created greyscale version: {greyscale_path}")
        else:
            print(f"[@controller:ImageVerification] Failed to create greyscale version: {greyscale_path}")
            # Clean up failed file
            try:
                os.unlink(greyscale_path)
            except:
                pass
        
        # Create binary version
        binary_path = f"{base_path}_binary{ext}"
        shutil.copy2(image_path, binary_path)
        if apply_image_filter(binary_path, 'binary'):
            print(f"[@controller:ImageVerification] Created binary version: {binary_path}")
        else:
            print(f"[@controller:ImageVerification] Failed to create binary version: {binary_path}")
            # Clean up failed file
            try:
                os.unlink(binary_path)
            except:
                pass
                
    except Exception as e:
        print(f"[@controller:ImageVerification] Error creating filtered versions: {e}")


def apply_image_filter(image_path: str, filter_type: str) -> bool:
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
            print(f"[@controller:ImageVerification] Could not read image for filtering: {image_path}")
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
            print(f"[@controller:ImageVerification] Unknown filter type: {filter_type}")
            return False
        
        # Overwrite original image with filtered version
        result = cv2.imwrite(image_path, filtered_img)
        
        if result:
            print(f"[@controller:ImageVerification] Applied {filter_type} filter to: {image_path}")
            return True
        else:
            print(f"[@controller:ImageVerification] Failed to save filtered image: {image_path}")
            return False
            
    except Exception as e:
        print(f"[@controller:ImageVerification] Error applying filter: {e}")
        return False


def process_reference_image(image_path: str, autocrop: bool = False, remove_background: bool = False) -> dict:
    """
    Process a reference image with autocrop and/or background removal.
    
    Args:
        image_path: Path to the cropped reference image
        autocrop: Whether to apply auto-cropping to improve area selection
        remove_background: Whether to remove background (make transparent)
        
    Returns:
        dict: New area coordinates if autocrop was applied, otherwise original area
    """
    try:
        print(f"[@controller:ImageVerification] Processing image: {image_path}")
        print(f"[@controller:ImageVerification] Options: autocrop={autocrop}, remove_background={remove_background}")
        
        # Read the image
        img = cv2.imread(image_path, cv2.IMREAD_UNCHANGED)
        if img is None:
            raise Exception(f"Could not read image: {image_path}")
        
        original_height, original_width = img.shape[:2]
        processed_img = img.copy()
        
        # Auto-crop: find the main content area and crop tighter
        if autocrop:
            print(f"[@controller:ImageVerification] Applying auto-crop")
            
            # Convert to grayscale for processing
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
            
            # Apply Gaussian blur to reduce noise
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)
            
            # Apply threshold to get binary image
            _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            
            # Find contours
            contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            if contours:
                # Find the largest contour (main content)
                largest_contour = max(contours, key=cv2.contourArea)
                
                # Get bounding rectangle of the largest contour
                x, y, w, h = cv2.boundingRect(largest_contour)
                
                # Add small padding (5% of image size)
                padding_x = max(1, int(original_width * 0.05))
                padding_y = max(1, int(original_height * 0.05))
                
                # Ensure padding doesn't go outside image bounds
                x = max(0, x - padding_x)
                y = max(0, y - padding_y)
                w = min(original_width - x, w + 2 * padding_x)
                h = min(original_height - y, h + 2 * padding_y)
                
                # Crop the image to the auto-detected area
                processed_img = processed_img[y:y+h, x:x+w]
                
                print(f"[@controller:ImageVerification] Auto-crop applied: ({x}, {y}, {w}, {h})")
                
                # Update area coordinates (relative to original crop)
                autocrop_area = {
                    'x': x,
                    'y': y,
                    'width': w,
                    'height': h
                }
            else:
                print(f"[@controller:ImageVerification] No contours found for auto-crop, using original")
                autocrop_area = {
                    'x': 0,
                    'y': 0,
                    'width': original_width,
                    'height': original_height
                }
        else:
            autocrop_area = {
                'x': 0,
                'y': 0,
                'width': original_width,
                'height': original_height
            }
        
        # Remove background: make background transparent
        if remove_background:
            print(f"[@controller:ImageVerification] Applying background removal")
            
            # Convert to RGBA if not already
            if len(processed_img.shape) == 3:
                processed_img = cv2.cvtColor(processed_img, cv2.COLOR_BGR2BGRA)
            
            # Use GrabCut algorithm for background removal
            height, width = processed_img.shape[:2]
            
            # Create mask for GrabCut (initialize as probable background)
            mask = np.zeros((height, width), np.uint8)
            
            # Define a rectangle around the center content (excluding edges)
            margin_x = max(1, width // 10)
            margin_y = max(1, height // 10)
            rect = (margin_x, margin_y, width - 2*margin_x, height - 2*margin_y)
            
            # Temporary arrays for GrabCut
            bgd_model = np.zeros((1, 65), np.float64)
            fgd_model = np.zeros((1, 65), np.float64)
            
            # Convert to 3-channel for GrabCut
            grabcut_img = processed_img[:, :, :3].copy()
            
            # Apply GrabCut
            cv2.grabCut(grabcut_img, mask, rect, bgd_model, fgd_model, 5, cv2.GC_INIT_WITH_RECT)
            
            # Create final mask (foreground pixels)
            final_mask = np.where((mask == 2) | (mask == 0), 0, 1).astype('uint8')
            
            # Apply mask to make background transparent
            processed_img[:, :, 3] = final_mask * 255
            
            print(f"[@controller:ImageVerification] Background removal applied")
        
        # Save the processed image
        success = cv2.imwrite(image_path, processed_img)
        
        if not success:
            raise Exception(f"Failed to save processed image: {image_path}")
        
        print(f"[@controller:ImageVerification] Image processing complete: {image_path}")
        
        return autocrop_area
        
    except Exception as e:
        print(f"[@controller:ImageVerification] Error processing image: {e}")
        raise e


def copy_reference_with_filtered_versions(source_path, target_path):
    """
    Copy a reference image and its existing filtered versions (greyscale, binary) if they exist.
    This avoids recreating filtered versions that already exist for saved references.
    
    Args:
        source_path: Path to source reference image
        target_path: Path to copy reference image to
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        import shutil
        
        # Copy the main reference image
        shutil.copy2(source_path, target_path)
        print(f"[@controller:ImageVerification] Copied reference image: {source_path} -> {target_path}")
        
        # Get base paths for filtered versions
        source_base, source_ext = os.path.splitext(source_path)
        target_base, target_ext = os.path.splitext(target_path)
        
        # Copy greyscale version if it exists
        source_greyscale = f"{source_base}_greyscale{source_ext}"
        target_greyscale = f"{target_base}_greyscale{target_ext}"
        if os.path.exists(source_greyscale):
            shutil.copy2(source_greyscale, target_greyscale)
            print(f"[@controller:ImageVerification] Copied greyscale version: {source_greyscale} -> {target_greyscale}")
        else:
            print(f"[@controller:ImageVerification] No greyscale version found at: {source_greyscale}")
        
        # Copy binary version if it exists
        source_binary = f"{source_base}_binary{source_ext}"
        target_binary = f"{target_base}_binary{target_ext}"
        if os.path.exists(source_binary):
            shutil.copy2(source_binary, target_binary)
            print(f"[@controller:ImageVerification] Copied binary version: {source_binary} -> {target_binary}")
        else:
            print(f"[@controller:ImageVerification] No binary version found at: {source_binary}")
        
        return True
        
    except Exception as e:
        print(f"[@controller:ImageVerification] Error copying reference with filtered versions: {e}")
        return False


class ImageVerificationController(VerificationControllerInterface):
    """Image verification controller that uses template matching to detect images on screen."""
    
    def __init__(self, av_controller, **kwargs):
        """
        Initialize the Image Verification controller.
        
        Args:
            av_controller: Reference to AV controller for screenshot capture
            **kwargs: Additional parameters (ignored for compatibility)
        """
        if not av_controller:
            raise ValueError("av_controller is required for screenshot capture")
            
        # Initialize base controller without device name dependency
        super().__init__("ImageVerification")
        
        # AV controller reference for screenshot capture only
        self.av_controller = av_controller
        
        # Controller is always ready
        self.is_connected = True
        print(f"[@controller:ImageVerification] Initialized - Using AV controller: {self.av_controller.device_name}")

    def connect(self) -> bool:
        """Connect to the image verification controller."""
        self.is_connected = True
        return True

    def disconnect(self) -> bool:
        """Disconnect from the image verification controller."""
        self.is_connected = False
        return True

    def get_status(self) -> Dict[str, Any]:
        """Get the current status of the image verification controller."""
        return {
            "connected": self.is_connected,
            "av_controller": self.av_controller.device_name if self.av_controller else None,
            "controller_type": "image"
        }
    
    def get_available_verifications(self) -> List[Dict[str, Any]]:
        """Get available verification actions for image controller."""
        return [
            {
                'command': 'waitForImageToAppear',
                'params': {
                    'image_path': {'type': 'string', 'required': True},
                    'timeout': {'type': 'float', 'required': False, 'default': 1.0},
                    'threshold': {'type': 'float', 'required': False, 'default': 0.8},
                    'area': {'type': 'dict', 'required': False},
                    'image_filter': {'type': 'string', 'required': False, 'default': 'none'}
                }
            },
            {
                'command': 'waitForImageToDisappear',
                'params': {
                    'image_path': {'type': 'string', 'required': True},
                    'timeout': {'type': 'float', 'required': False, 'default': 1.0},
                    'threshold': {'type': 'float', 'required': False, 'default': 0.8},
                    'area': {'type': 'dict', 'required': False},
                    'image_filter': {'type': 'string', 'required': False, 'default': 'none'}
                }
            }
        ]

    def _save_cropped_source_image(self, source_image_path: str, area: dict, model: str, verification_index: int) -> str:
        """
        Save a cropped version of the source image for UI comparison display.
        
        Args:
            source_image_path: Path to the source image
            area: Area to crop {x, y, width, height}
            model: Model name for directory organization
            verification_index: Index of verification for naming
            
        Returns:
            Path to saved cropped image or None if failed
        """
        try:
            print(f"[@controller:ImageVerification] _save_cropped_source_image called with:")
            print(f"  source_image_path: {source_image_path}")
            print(f"  area: {area}")
            print(f"  model: {model}")
            print(f"  verification_index: {verification_index}")
            
            # Create flat directory structure: /tmp/{model}/
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            output_dir = os.path.join(base_dir, 'tmp', model)
            print(f"[@controller:ImageVerification] Creating output directory: {output_dir}")
            os.makedirs(output_dir, exist_ok=True)
            
            # Use consistent naming: source_cropped_{verification_index}.png
            cropped_source_path = os.path.join(output_dir, f'source_cropped_{verification_index}.png')
            print(f"[@controller:ImageVerification] Target cropped source path: {cropped_source_path}")
            
            # Check if source image exists and is readable
            if not os.path.exists(source_image_path):
                print(f"[@controller:ImageVerification] ERROR: Source image does not exist: {source_image_path}")
                return None
            
            # Read and crop source image
            print(f"[@controller:ImageVerification] Reading source image with cv2.imread...")
            img = cv2.imread(source_image_path)
            if img is None:
                print(f"[@controller:ImageVerification] ERROR: Could not read source image with cv2: {source_image_path}")
                return None
                
            print(f"[@controller:ImageVerification] Source image loaded successfully, shape: {img.shape}")
            
            # Extract area coordinates
            x = int(area['x'])
            y = int(area['y'])
            width = int(area['width'])
            height = int(area['height'])
            
            print(f"[@controller:ImageVerification] Cropping coordinates: x={x}, y={y}, width={width}, height={height}")
            
            # Ensure coordinates are within image bounds
            img_height, img_width = img.shape[:2]
            print(f"[@controller:ImageVerification] Source image dimensions: {img_width}x{img_height}")
            
            x = max(0, min(x, img_width - 1))
            y = max(0, min(y, img_height - 1))
            width = min(width, img_width - x)
            height = min(height, img_height - y)
            
            print(f"[@controller:ImageVerification] Adjusted coordinates: x={x}, y={y}, width={width}, height={height}")
            
            # Crop image to same area used for comparison
            cropped_img = img[y:y+height, x:x+width]
            print(f"[@controller:ImageVerification] Cropped image shape: {cropped_img.shape}")
            
            # Save cropped image
            print(f"[@controller:ImageVerification] Saving cropped image to: {cropped_source_path}")
            result = cv2.imwrite(cropped_source_path, cropped_img)
            
            if result:
                print(f"[@controller:ImageVerification] Saved cropped source: {cropped_source_path}")
                # Automatically create greyscale and binary versions
                _create_filtered_versions(cropped_source_path)
                return cropped_source_path
            else:
                print(f"[@controller:ImageVerification] Failed to save cropped source: {cropped_source_path}")
                return None
                
        except Exception as e:
            print(f"[@controller:ImageVerification] Error saving cropped source: {e}")
            import traceback
            print(f"[@controller:ImageVerification] Full traceback: {traceback.format_exc()}")
            return None

    def waitForImageToAppear(self, image_path: str, timeout: float = 1.0, threshold: float = 0.8, 
                            area: tuple = None, image_list: List[str] = None, model: str = None, 
                            verification_index: int = 0, image_filter: str = 'none') -> Tuple[bool, str, dict]:
        """
        Wait for image to appear either in provided image list or by capturing new frames.
        
        Args:
            image_path: Path to reference image
            timeout: Timeout for capture if no image_list provided
            threshold: Match threshold (0.0 to 1.0)
            area: Optional area to search (x, y, width, height)
            image_list: Optional list of source image paths to search
            model: Model name for organizing output images
            verification_index: Index of verification for naming
            image_filter: Filter to apply ('none', 'greyscale', 'binary')
            
        Returns:
            Tuple of (success, message, additional_data)
        """
        # Check if image_path is provided
        if not image_path or image_path.strip() == '':
            error_msg = "No reference image specified. Please select a reference image or provide an image path."
            print(f"[@controller:ImageVerification] {error_msg}")
            return False, error_msg, {}
        
        print(f"[@controller:ImageVerification] Looking for image: {image_path}")
        if image_filter and image_filter != 'none':
            print(f"[@controller:ImageVerification] Using image filter: {image_filter}")
        
        # Load reference image - use pre-existing filtered version if available
        if not os.path.exists(image_path):
            error_msg = f"Reference image not found at path: {image_path}"
            print(f"[@controller:ImageVerification] {error_msg}")
            return False, error_msg, {}
        
        # Get filtered reference image path (only change the reference, not source)
        filtered_reference_path = image_path
        if image_filter and image_filter != 'none':
            base_path, ext = os.path.splitext(image_path)
            filtered_path = f"{base_path}_{image_filter}{ext}"
            if os.path.exists(filtered_path):
                filtered_reference_path = filtered_path
                print(f"[@controller:ImageVerification] Using pre-existing filtered reference: {filtered_reference_path}")
            else:
                print(f"[@controller:ImageVerification] Filtered reference not found, using original: {image_path}")
        
        ref_img = cv2.imread(filtered_reference_path, cv2.IMREAD_COLOR)
        if ref_img is None:
            return False, f"Could not load reference image: {filtered_reference_path}", {}
        
        additional_data = {
            "reference_image_path": filtered_reference_path,
            "image_filter": image_filter
        }
        
        if image_list:
            # Search in provided images
            print(f"[@controller:ImageVerification] Searching in {len(image_list)} provided images")
            max_confidence = 0.0
            best_source_path = None
            
            for source_path in image_list:
                if not os.path.exists(source_path):
                    continue
                
                # Apply filtering to source images if needed
                filtered_source_path = source_path
                if image_filter and image_filter != 'none':
                    import tempfile
                    import shutil
                    
                    # Create temporary file for filtered version
                    temp_fd, temp_path = tempfile.mkstemp(suffix='.png', prefix='filtered_source_')
                    os.close(temp_fd)
                    
                    # Copy original to temp location
                    shutil.copy2(source_path, temp_path)
                    
                    # Apply filter to temporary copy
                    if apply_image_filter(temp_path, image_filter):
                        filtered_source_path = temp_path
                        print(f"[@controller:ImageVerification] Created filtered source copy: {temp_path}")
                    else:
                        print(f"[@controller:ImageVerification] Failed to apply filter, using original")
                        os.unlink(temp_path)  # Clean up failed temp file
                        filtered_source_path = source_path
                else:
                    filtered_source_path = source_path
                
                source_img = cv2.imread(filtered_source_path, cv2.IMREAD_COLOR)
                if source_img is None:
                    # Clean up temp file if it was created
                    if filtered_source_path != source_path and os.path.exists(filtered_source_path):
                        os.unlink(filtered_source_path)
                    continue
                
                confidence = self._match_template(ref_img, source_img, area)
                
                # Always set first valid source as best_source_path, then update if better confidence found
                if best_source_path is None or confidence > max_confidence:
                    max_confidence = confidence
                    best_source_path = source_path
                
                if confidence >= threshold:
                    print(f"[@controller:ImageVerification] Match found in {source_path} with confidence {confidence:.3f}")
                    
                    # Save cropped source image for UI comparison (from ORIGINAL, not filtered)
                    if area and model is not None:
                        cropped_source_path = self._save_cropped_source_image(source_path, area, model, verification_index)
                        if cropped_source_path:
                            additional_data["source_image_path"] = cropped_source_path
                    
                    # Save actual confidence for threshold display and disappear operations
                    additional_data["threshold"] = confidence
                    
                    # Clean up temp file if it was created
                    if filtered_source_path != source_path and os.path.exists(filtered_source_path):
                        os.unlink(filtered_source_path)
                    
                    return True, f"Image found with confidence {confidence:.3f} (threshold: {threshold:.3f})", additional_data
                
                # Clean up temp file if it was created
                if filtered_source_path != source_path and os.path.exists(filtered_source_path):
                    os.unlink(filtered_source_path)
            
            # If no match found, still save the best source for comparison
            if best_source_path and area and model is not None:
                print(f"[@controller:ImageVerification] Attempting to save cropped source for comparison:")
                print(f"  best_source_path: {best_source_path}")
                print(f"  area: {area}")
                print(f"  model: {model}")
                print(f"  verification_index: {verification_index}")
                
                cropped_source_path = self._save_cropped_source_image(best_source_path, area, model, verification_index)
                if cropped_source_path:
                    additional_data["source_image_path"] = cropped_source_path
                    print(f"[@controller:ImageVerification] Successfully saved cropped source for UI comparison")
                else:
                    print(f"[@controller:ImageVerification] Failed to save cropped source for UI comparison")
            else:
                print(f"[@controller:ImageVerification] Skipping cropped source save - conditions not met:")
                print(f"  best_source_path: {bool(best_source_path)}")
                print(f"  area: {bool(area)}")
                print(f"  model: {model}")
            
            # Save best confidence for threshold display and disappear operations
            additional_data["threshold"] = max_confidence
            
            return False, f"Image not found. Best confidence: {max_confidence:.3f} (threshold: {threshold:.3f})", additional_data
        
        else:
            # Capture new image if no image list provided
            print(f"[@controller:ImageVerification] No image list provided, capturing new image")
            
            capture_path = self.av_controller.capture_screen()
            if not capture_path:
                return False, "Failed to capture screen for image verification", additional_data
            
            start_time = time.time()
            last_confidence = 0.0  # Track last confidence for final reporting
            
            while time.time() - start_time < timeout:
                # Apply filtering to captured source image if needed
                filtered_source_path = capture_path
                if image_filter and image_filter != 'none':
                    import tempfile
                    import shutil
                    
                    # Create temporary file for filtered version
                    temp_fd, temp_path = tempfile.mkstemp(suffix='.png', prefix='filtered_capture_')
                    os.close(temp_fd)
                    
                    # Copy original to temp location
                    shutil.copy2(capture_path, temp_path)
                    
                    # Apply filter to temporary copy
                    if apply_image_filter(temp_path, image_filter):
                        filtered_source_path = temp_path
                        print(f"[@controller:ImageVerification] Created filtered capture copy: {temp_path}")
                    else:
                        print(f"[@controller:ImageVerification] Failed to apply filter, using original")
                        os.unlink(temp_path)  # Clean up failed temp file
                        filtered_source_path = capture_path
                else:
                    filtered_source_path = capture_path
                
                source_img = cv2.imread(filtered_source_path, cv2.IMREAD_COLOR)
                if source_img is None:
                    # Clean up temp file if it was created
                    if filtered_source_path != capture_path and os.path.exists(filtered_source_path):
                        os.unlink(filtered_source_path)
                    return False, "Failed to load captured image for verification", additional_data
                
                confidence = self._match_template(ref_img, source_img, area)
                last_confidence = confidence  # Keep track of last confidence
                
                if confidence >= threshold:
                    print(f"[@controller:ImageVerification] Image found in captured frame with confidence {confidence:.3f}")
                    
                    # Save cropped source image for UI comparison (from ORIGINAL, not filtered)
                    if area and model is not None:
                        cropped_source_path = self._save_cropped_source_image(capture_path, area, model, verification_index)
                        if cropped_source_path:
                            additional_data["source_image_path"] = cropped_source_path
                    
                    # Save actual confidence for threshold display and disappear operations
                    additional_data["threshold"] = confidence
                    
                    # Clean up temp file if it was created
                    if filtered_source_path != capture_path and os.path.exists(filtered_source_path):
                        os.unlink(filtered_source_path)
                    
                    return True, f"Image found with confidence {confidence:.3f} (threshold: {threshold:.3f})", additional_data
                
                # Clean up temp file before next iteration
                if filtered_source_path != capture_path and os.path.exists(filtered_source_path):
                    os.unlink(filtered_source_path)
                
                # Re-capture if we're in a loop
                if time.time() - start_time < timeout:
                    capture_path = self.av_controller.capture_screen()
                    if not capture_path:
                        return False, "Failed to re-capture screen for image verification", additional_data
                
                time.sleep(0.5)
            
            # Save cropped source for comparison even if not found (from ORIGINAL, not filtered)
            if area and model is not None:
                cropped_source_path = self._save_cropped_source_image(capture_path, area, model, verification_index)
                if cropped_source_path:
                    additional_data["source_image_path"] = cropped_source_path
            
            # Save last confidence for threshold display and disappear operations
            additional_data["threshold"] = last_confidence
            
            return False, f"Image not found after {timeout}s timeout", additional_data

    def waitForImageToDisappear(self, image_path: str, timeout: float = 1.0, threshold: float = 0.8,
                               area: tuple = None, image_list: List[str] = None, model: str = None,
                               verification_index: int = 0, image_filter: str = 'none') -> Tuple[bool, str, dict]:
        """
        Wait for image to disappear by calling waitForImageToAppear and inverting the result.
        """
        # Check if image_path is provided
        if not image_path or image_path.strip() == '':
            error_msg = "No reference image specified. Please select a reference image or provide an image path."
            print(f"[@controller:ImageVerification] {error_msg}")
            return False, error_msg, {}
            
        print(f"[@controller:ImageVerification] Looking for image to disappear: {image_path}")
        
        # Smart reuse: call waitForImageToAppear and invert result
        found, message, additional_data = self.waitForImageToAppear(image_path, timeout, threshold, area, image_list, model, verification_index, image_filter)
        
        # Invert the boolean result and adjust the message
        success = not found
        
        # For disappear operations, invert the threshold for UI display to make it intuitive
        # If original match was 100% (image still there), show 0% (0% disappeared)
        # If original match was 0% (image not found), show 100% (100% disappeared)
        if 'threshold' in additional_data and additional_data['threshold'] is not None:
            original_threshold = additional_data['threshold']
            # Invert threshold for disappear operations: 1.0 - original gives intuitive "disappear percentage"
            inverted_threshold = 1.0 - original_threshold
            additional_data['threshold'] = inverted_threshold
            additional_data['original_threshold'] = original_threshold  # Keep original for debugging
            print(f"[@controller:ImageVerification] Disappear threshold display: {original_threshold:.3f} -> {inverted_threshold:.3f} (inverted for UI)")
        
        if success:
            # Image has disappeared (was not found)
            return True, f"Image disappeared: {message}", additional_data
        else:
            # Image is still present (was found)
            return False, f"Image still present: {message}", additional_data

    def _match_template(self, ref_img: np.ndarray, source_img: np.ndarray, area: tuple = None) -> float:
        """
        Perform template matching between reference and source images.
        Handles transparent backgrounds by ignoring transparent pixels.
        
        Returns:
            Confidence score (0.0 to 1.0)
        """
        try:
            # Crop source image to area if specified
            if area:
                x, y, w, h = int(area['x']), int(area['y']), int(area['width']), int(area['height'])
                source_img = source_img[y:y+h, x:x+w]
            
            # Check if reference image has alpha channel (transparency)
            if len(ref_img.shape) == 4 and ref_img.shape[2] == 4:
                print(f"[@controller:ImageVerification] Reference has transparency, using masked template matching")
                
                # Convert source to RGBA if needed
                if len(source_img.shape) == 3:
                    source_img = cv2.cvtColor(source_img, cv2.COLOR_BGR2BGRA)
                elif len(source_img.shape) == 4 and source_img.shape[2] == 4:
                    pass  # Already RGBA
                else:
                    # Handle grayscale
                    source_img = cv2.cvtColor(source_img, cv2.COLOR_GRAY2BGRA)
                
                # Extract alpha channel from reference as mask
                ref_alpha = ref_img[:, :, 3]
                mask = np.where(ref_alpha > 128, 255, 0).astype(np.uint8)
                
                # Convert both images to BGR for template matching
                ref_bgr = cv2.cvtColor(ref_img, cv2.COLOR_BGRA2BGR)
                source_bgr = cv2.cvtColor(source_img, cv2.COLOR_BGRA2BGR)
                
                # Perform masked template matching
                result = cv2.matchTemplate(source_bgr, ref_bgr, cv2.TM_CCOEFF_NORMED, mask=mask)
                _, max_val, _, _ = cv2.minMaxLoc(result)
                
                print(f"[@controller:ImageVerification] Masked template matching confidence: {max_val:.3f}")
                
            else:
                # Standard template matching for non-transparent images
                print(f"[@controller:ImageVerification] Standard template matching (no transparency)")
                
                # Ensure both images are in the same color space
                if len(ref_img.shape) == 4:
                    ref_img = cv2.cvtColor(ref_img, cv2.COLOR_BGRA2BGR)
                if len(source_img.shape) == 4:
                    source_img = cv2.cvtColor(source_img, cv2.COLOR_BGRA2BGR)
                
                # Perform standard template matching
                result = cv2.matchTemplate(source_img, ref_img, cv2.TM_CCOEFF_NORMED)
                _, max_val, _, _ = cv2.minMaxLoc(result)
            
            return float(max_val)
            
        except Exception as e:
            print(f"[@controller:ImageVerification] Template matching error: {e}")
            return 0.0

    # =====================================================
    # IMAGE UTILITY METHODS - Clean, modular image operations
    # =====================================================

    def crop_image(self, source_path: str, target_path: str, area: dict, create_filtered_versions: bool = True) -> bool:
        """
        Crop an image to a specific area and save it.
        
        Args:
            source_path: Path to source image
            target_path: Path to save cropped image
            area: Dictionary with x, y, width, height coordinates
            create_filtered_versions: Whether to create greyscale/binary versions
            
        Returns:
            bool: True if successful, False otherwise
        """
        print(f"[@controller:ImageVerification] Cropping image: {source_path} -> {target_path}")
        return crop_reference_image(source_path, target_path, area, create_filtered_versions)

    def auto_crop_image(self, image_path: str) -> dict:
        """
        Apply auto-cropping to find main content and crop tighter around it.
        Modifies the image in-place and returns new coordinates.
        
        Args:
            image_path: Path to the image to auto-crop
            
        Returns:
            dict: New area coordinates after auto-crop
        """
        print(f"[@controller:ImageVerification] Auto-cropping image: {image_path}")
        return process_reference_image(image_path, autocrop=True, remove_background=False)

    def remove_background(self, image_path: str) -> bool:
        """
        Remove background from image making it transparent using GrabCut algorithm.
        Modifies the image in-place.
        
        Args:
            image_path: Path to the image to process
            
        Returns:
            bool: True if successful, False otherwise
        """
        print(f"[@controller:ImageVerification] Removing background from: {image_path}")
        try:
            process_reference_image(image_path, autocrop=False, remove_background=True)
            return True
        except Exception as e:
            print(f"[@controller:ImageVerification] Background removal failed: {e}")
            return False

    def copy_image(self, source_path: str, target_path: str) -> bool:
        """
        Simple copy of an image file from source to target.
        
        Args:
            source_path: Path to source image
            target_path: Path to copy image to
            
        Returns:
            bool: True if successful, False otherwise
        """
        print(f"[@controller:ImageVerification] Copying image: {source_path} -> {target_path}")
        try:
            import shutil
            import os
            
            # Create target directory if it doesn't exist
            os.makedirs(os.path.dirname(target_path), exist_ok=True)
            
            # Copy the image
            shutil.copy2(source_path, target_path)
            print(f"[@controller:ImageVerification] Successfully copied image")
            return True
        except Exception as e:
            print(f"[@controller:ImageVerification] Error copying image: {e}")
            return False

    def apply_filter(self, image_path: str, filter_type: str) -> bool:
        """
        Apply image filter (greyscale or binary) to an image and overwrite it.
        
        Args:
            image_path: Path to the image file
            filter_type: Type of filter ('none', 'greyscale', 'binary')
            
        Returns:
            bool: True if successful, False otherwise
        """
        print(f"[@controller:ImageVerification] Applying {filter_type} filter to: {image_path}")
        return apply_image_filter(image_path, filter_type)



    def upload_reference_to_r2(self, cropped_filename: str, reference_name: str, model: str) -> str:
        """
        Upload reference image to Cloudflare R2 only (no database save).
        
        Args:
            cropped_filename: Filename of the cropped image
            reference_name: Name for the reference
            model: Device model
            
        Returns:
            str: Complete Cloudflare R2 URL if successful, None if failed
        """
        try:
            import os
            
            # Path configuration
            CROPPED_PATH = '/var/www/html/stream/captures/cropped'
            
            print(f"[@controller:ImageVerification] Uploading reference to R2: {reference_name} for model: {model}")
            print(f"[@controller:ImageVerification] Source cropped file: {cropped_filename}")
            
            # Build source path for cropped file
            cropped_source_path = f'{CROPPED_PATH}/{cropped_filename}'
            
            # Check if cropped file exists
            if not os.path.exists(cropped_source_path):
                print(f"[@controller:ImageVerification] Cropped file not found: {cropped_source_path}")
                return None
            
            # Upload to Cloudflare R2 - EXACT SAME PATTERN AS HDMI CONTROLLER
            from src.utils.cloudflare_upload_utils import CloudflareUploader
            
            uploader = CloudflareUploader()
            r2_path = f'reference-images/{model}/{reference_name}.jpg'
            upload_result = uploader.upload_file(cropped_source_path, r2_path)
            
            if upload_result.get('success'):
                print(f"[@controller:ImageVerification] Successfully uploaded to R2: {r2_path}")
                # Extract URL immediately like HDMI controller does
                complete_url = upload_result.get('url')
                print(f"[@controller:ImageVerification] Extracted complete R2 URL: {complete_url}")
                return complete_url
            else:
                error_msg = upload_result.get('error', 'Unknown upload error')
                print(f"[@controller:ImageVerification] R2 upload failed: {error_msg}")
                return None
                
        except Exception as e:
            print(f"[@controller:ImageVerification] Error uploading to R2: {str(e)}")
            return None

    def save_reference_image(self, cropped_filename: str, reference_name: str, model: str, 
                           area: dict, reference_type: str = 'reference_image', team_id: str = None) -> str:
        """
        Save reference image to R2 and database.
        
        Args:
            cropped_filename: Filename of the cropped image
            reference_name: Name for the reference
            model: Device model
            area: Area coordinates
            reference_type: Type of reference
            
        Returns:
            str: Complete Cloudflare R2 URL if successful, None if failed
        """
        try:
            import os
            from src.lib.supabase.images_db import save_image
            from src.utils.app_utils import DEFAULT_TEAM_ID
            
            # Path configuration
            CROPPED_PATH = '/var/www/html/stream/captures/cropped'
            
            print(f"[@controller:ImageVerification] Saving reference to R2: {reference_name} for model: {model}")
            print(f"[@controller:ImageVerification] Source cropped file: {cropped_filename}")
            
            # Build source path for cropped file
            cropped_source_path = f'{CROPPED_PATH}/{cropped_filename}'
            
            # Check if cropped file exists
            if not os.path.exists(cropped_source_path):
                print(f"[@controller:ImageVerification] Cropped file not found: {cropped_source_path}")
                return None
            
            # Upload to Cloudflare R2 - EXACT SAME PATTERN AS HDMI CONTROLLER
            from src.utils.cloudflare_upload_utils import CloudflareUploader
            
            uploader = CloudflareUploader()
            r2_path = f'reference-images/{model}/{reference_name}.jpg'
            upload_result = uploader.upload_file(cropped_source_path, r2_path)
            
            if upload_result.get('success'):
                print(f"[@controller:ImageVerification] Successfully uploaded to R2: {r2_path}")
                # Extract URL immediately like HDMI controller does
                complete_url = upload_result.get('url')
                print(f"[@controller:ImageVerification] Extracted complete R2 URL: {complete_url}")
            else:
                error_msg = upload_result.get('error', 'Unknown upload error')
                print(f"[@controller:ImageVerification] R2 upload failed: {error_msg}")
                return None
            
            # Use team_id from request or fallback to default
            if not team_id:
                team_id = DEFAULT_TEAM_ID
            print(f"[@controller:ImageVerification] Using team ID: {team_id}")
            
            # Save to database instead of JSON file
            db_result = save_image(
                name=reference_name,
                device_model=model,
                type=reference_type,
                r2_path=r2_path,
                r2_url=complete_url,
                team_id=team_id,
                area=area
            )
            
            if db_result['success']:
                print(f"[@controller:ImageVerification] Successfully saved to database")
                print(f"[@controller:ImageVerification] Returning complete R2 URL: {complete_url}")
                return complete_url
            else:
                print(f"[@controller:ImageVerification] Database save failed: {db_result.get('error')}")
                return None
                
        except Exception as e:
            print(f"[@controller:ImageVerification] Error saving reference: {str(e)}")
            return None

 
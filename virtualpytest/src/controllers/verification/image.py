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
from ..base_controllers import VerificationControllerInterface


def crop_reference_image(source_path, target_path, area):
    """
    Crop a reference image from a source image and save it.
    
    Args:
        source_path (str): Path to the source image
        target_path (str): Path where the cropped image will be saved
        area (dict): Area to crop {x, y, width, height}
        
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
            return True
        else:
            print(f"Failed to save reference image: {target_path}")
            return False
            
    except Exception as e:
        print(f"Error cropping reference image: {str(e)}")
        return False


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


class ImageVerificationController(VerificationControllerInterface):
    """Image verification controller that uses template matching to detect images on screen."""
    
    def __init__(self, av_controller):
        """
        Initialize the Image Verification controller.
        
        Args:
            av_controller: Reference to AV controller for screenshot capture
        """
        if not av_controller:
            raise ValueError("av_controller is required for screenshot capture")
            
        device_name = f"ImageVerify-{av_controller.device_name}"
        super().__init__(device_name)
        
        # AV controller reference for screenshot capture only
        self.av_controller = av_controller
        
        # Controller is always ready
        self.is_connected = True
        print(f"ImageVerify[{self.device_name}]: Ready - Using AV controller: {self.av_controller.device_name}")

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
            # Create directory structure
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            output_dir = os.path.join(base_dir, 'tmp', model, f'verification_{verification_index}')
            os.makedirs(output_dir, exist_ok=True)
            
            # Output path for cropped source
            cropped_source_path = os.path.join(output_dir, 'source_cropped.png')
            
            # Read and crop source image
            img = cv2.imread(source_image_path)
            if img is None:
                print(f"[@controller:ImageVerification] Could not read source image: {source_image_path}")
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
            
            # Crop image to same area used for comparison
            cropped_img = img[y:y+height, x:x+width]
            
            # Save cropped image
            result = cv2.imwrite(cropped_source_path, cropped_img)
            
            if result:
                print(f"[@controller:ImageVerification] Saved cropped source: {cropped_source_path}")
                return cropped_source_path
            else:
                print(f"[@controller:ImageVerification] Failed to save cropped source: {cropped_source_path}")
                return None
                
        except Exception as e:
            print(f"[@controller:ImageVerification] Error saving cropped source: {e}")
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
        
        # Load reference image
        if not os.path.exists(image_path):
            error_msg = f"Reference image not found at path: {image_path}"
            print(f"[@controller:ImageVerification] {error_msg}")
            return False, error_msg, {}
        
        # Create filtered reference image if filter is applied
        filtered_reference_path = image_path
        if image_filter and image_filter != 'none' and model is not None:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            filtered_ref_path = os.path.join(base_dir, 'tmp', model, f'reference_filtered_{verification_index}.png')
            
            # Copy reference to filtered location
            import shutil
            shutil.copy2(image_path, filtered_ref_path)
            
            # Apply filter to the reference copy
            if apply_image_filter(filtered_ref_path, image_filter):
                filtered_reference_path = filtered_ref_path
                print(f"[@controller:ImageVerification] Created filtered reference: {filtered_reference_path}")
            else:
                print(f"[@controller:ImageVerification] Failed to apply filter to reference, using original")
        
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
                
                # Create a temporary copy for filtering (don't modify original)
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
                        print(f"[@controller:ImageVerification] Created filtered copy: {temp_path}")
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
                
                if confidence > max_confidence:
                    max_confidence = confidence
                    best_source_path = source_path  # Always use original path for cropping
                
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
            
            # If no match found, still save the best source for comparison (from ORIGINAL)
            if best_source_path and area and model is not None:
                cropped_source_path = self._save_cropped_source_image(best_source_path, area, model, verification_index)
                if cropped_source_path:
                    additional_data["source_image_path"] = cropped_source_path
            
            # Save best confidence for threshold display and disappear operations
            additional_data["threshold"] = max_confidence
            
            return False, f"Image not found. Best confidence: {max_confidence:.3f} (threshold: {threshold:.3f})", additional_data
        
        else:
            # Capture new image if no image list provided
            print(f"[@controller:ImageVerification] No image list provided, capturing new image")
            
            capture_path = self.av_controller.capture_screen()
            if not capture_path:
                return False, "Failed to capture screen for image verification", additional_data
            
            # Create a temporary copy for filtering (don't modify original)
            filtered_capture_path = capture_path
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
                    filtered_capture_path = temp_path
                    print(f"[@controller:ImageVerification] Created filtered capture copy: {temp_path}")
                else:
                    print(f"[@controller:ImageVerification] Failed to apply filter, using original capture")
                    os.unlink(temp_path)  # Clean up failed temp file
                    filtered_capture_path = capture_path
            else:
                filtered_capture_path = capture_path
            
            start_time = time.time()
            while time.time() - start_time < timeout:
                source_img = cv2.imread(filtered_capture_path, cv2.IMREAD_COLOR)
                if source_img is None:
                    # Clean up temp file if it was created
                    if filtered_capture_path != capture_path and os.path.exists(filtered_capture_path):
                        os.unlink(filtered_capture_path)
                    return False, "Failed to load captured image for verification", additional_data
                
                confidence = self._match_template(ref_img, source_img, area)
                
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
                    if filtered_capture_path != capture_path and os.path.exists(filtered_capture_path):
                        os.unlink(filtered_capture_path)
                    
                    return True, f"Image found with confidence {confidence:.3f} (threshold: {threshold:.3f})", additional_data
                
                # Re-capture if we're in a loop
                if time.time() - start_time < timeout:
                    # Clean up previous temp file
                    if filtered_capture_path != capture_path and os.path.exists(filtered_capture_path):
                        os.unlink(filtered_capture_path)
                    
                    capture_path = self.av_controller.capture_screen()
                    if not capture_path:
                        return False, "Failed to re-capture screen for image verification", additional_data
                    
                    # Create new filtered copy if needed
                    filtered_capture_path = capture_path
                    if image_filter and image_filter != 'none':
                        import tempfile
                        import shutil
                        
                        temp_fd, temp_path = tempfile.mkstemp(suffix='.png', prefix='filtered_capture_')
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
            
            # Save last confidence for threshold display and disappear operations
            if 'confidence' in locals():
                additional_data["threshold"] = confidence
            else:
                additional_data["threshold"] = 0.0
            
            # Clean up temp file if it was created
            if filtered_capture_path != capture_path and os.path.exists(filtered_capture_path):
                os.unlink(filtered_capture_path)
            
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
            print(f"[@component:ImageVerification] {error_msg}")
            return False, error_msg, {}
            
        print(f"[@component:ImageVerification] Looking for image to disappear: {image_path}")
        
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
        
        Returns:
            Confidence score (0.0 to 1.0)
        """
        try:
            # Crop source image to area if specified
            if area:
                x, y, w, h = int(area['x']), int(area['y']), int(area['width']), int(area['height'])
                source_img = source_img[y:y+h, x:x+w]
            
            # Perform template matching
            result = cv2.matchTemplate(source_img, ref_img, cv2.TM_CCOEFF_NORMED)
            _, max_val, _, _ = cv2.minMaxLoc(result)
            
            return float(max_val)
            
        except Exception as e:
            print(f"[@controller:ImageVerification] Template matching error: {e}")
            return 0.0

# Backward compatibility alias
ImageVerificationController = ImageVerificationController 
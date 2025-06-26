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
            av_controller: AV controller for capturing images (dependency injection)
        """
        super().__init__("Image Verification", "image")
        
        # Dependency injection
        self.av_controller = av_controller
        
        # Validate required dependency
        if not self.av_controller:
            raise ValueError("av_controller is required for ImageVerificationController")
            
        print(f"[@controller:ImageVerification] Initialized with AV controller")

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

    def execute_verification(self, verification_config: Dict[str, Any], source_path: str = None) -> Dict[str, Any]:
        """
        Unified verification execution interface for centralized controller.
        
        Args:
            verification_config: {
                'verification_type': 'image',
                'command': 'waitForImageToAppear',
                'params': {
                    'image_path': 'reference.jpg',
                    'threshold': 0.8,
                    'area': {'x': 100, 'y': 100, 'width': 200, 'height': 200},
                    'image_filter': 'none'
                }
            }
            source_path: Path to source image (if None, will take screenshot)
            
        Returns:
            {
                'success': bool,
                'message': str,
                'confidence': float,
                'details': dict
            }
        """
        try:
            # Take screenshot if not provided
            if not source_path:
                source_path = self.av_controller.take_screenshot()
                if not source_path:
                    return {
                        'success': False,
                        'message': 'Failed to capture screenshot for image verification',
                        'confidence': 0.0,
                        'details': {'error': 'Screenshot capture failed'}
                    }
            
            # Extract parameters
            params = verification_config.get('params', {})
            command = verification_config.get('command', 'waitForImageToAppear')
            
            # Required parameters
            image_path = params.get('image_path', '')
            if not image_path:
                return {
                    'success': False,
                    'message': 'No reference image specified for image verification',
                    'confidence': 0.0,
                    'details': {'error': 'Missing image_path parameter'}
                }
            
            # Optional parameters with defaults
            threshold = params.get('threshold', 0.8)
            timeout = params.get('timeout', 1.0)
            area = params.get('area')
            image_filter = params.get('image_filter', 'none')
            model = params.get('model', 'default')  # Get device model for R2 download
            
            print(f"[@controller:ImageVerification] Executing {command} with image: {image_path}")
            print(f"[@controller:ImageVerification] Parameters: threshold={threshold}, area={area}, filter={image_filter}, model={model}")
            
            # Execute verification based on command
            if command == 'waitForImageToAppear':
                success, message, details = self.waitForImageToAppear(
                    image_path=image_path,
                    timeout=timeout,
                    threshold=threshold,
                    area=area,
                    image_list=[source_path],  # Use source_path as image list
                    model=model,  # Pass device model for R2 reference resolution
                    verification_index=0,
                    image_filter=image_filter
                )
            elif command == 'waitForImageToDisappear':
                success, message, details = self.waitForImageToDisappear(
                    image_path=image_path,
                    timeout=timeout,
                    threshold=threshold,
                    area=area,
                    image_list=[source_path],  # Use source_path as image list
                    model=model,  # Pass device model for R2 reference resolution
                    verification_index=0,
                    image_filter=image_filter
                )
            else:
                return {
                    'success': False,
                    'message': f'Unknown image verification command: {command}',
                    'confidence': 0.0,
                    'details': {'error': f'Unsupported command: {command}'}
                }
            
            # Return unified format
            return {
                'success': success,
                'message': message,
                'confidence': details.get('threshold', 0.0),
                'details': details
            }
            
        except Exception as e:
            print(f"[@controller:ImageVerification] Execution error: {e}")
            return {
                'success': False,
                'message': f'Image verification execution error: {str(e)}',
                'confidence': 0.0,
                'details': {'error': str(e)}
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
            image_path: Path to reference image or reference name
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
        
        # Resolve reference image path - download from R2 if needed
        resolved_image_path = self._resolve_reference_image(image_path, model)
        if not resolved_image_path:
            error_msg = f"Reference image not found and could not be downloaded: {image_path}"
            print(f"[@controller:ImageVerification] {error_msg}")
            return False, error_msg, {}
        
        # Get filtered reference image path (only change the reference, not source)
        filtered_reference_path = resolved_image_path
        if image_filter and image_filter != 'none':
            base_path, ext = os.path.splitext(resolved_image_path)
            filtered_path = f"{base_path}_{image_filter}{ext}"
            if os.path.exists(filtered_path):
                filtered_reference_path = filtered_path
                print(f"[@controller:ImageVerification] Using pre-existing filtered reference: {filtered_reference_path}")
            else:
                print(f"[@controller:ImageVerification] Filtered reference not found, using original: {resolved_image_path}")
        
        ref_img = cv2.imread(filtered_reference_path, cv2.IMREAD_COLOR)
        if ref_img is None:
            return False, f"Could not load reference image: {filtered_reference_path}", {}
        
        additional_data = {
            "reference_image_path": filtered_reference_path,
            "image_filter": image_filter
        }
        
        # Create results directory for UI comparison images
        results_dir = '/var/www/html/stream/verification_results'
        os.makedirs(results_dir, exist_ok=True)
        
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
                    
                    # Generate comparison images and URLs like the original working version
                    image_urls = self._generate_comparison_images(source_path, resolved_image_path, area, verification_index, model, image_filter)
                    additional_data.update(image_urls)
                    
                    # Save actual confidence for threshold display and disappear operations
                    additional_data["threshold"] = confidence
                    
                    # Clean up temp file if it was created
                    if filtered_source_path != source_path and os.path.exists(filtered_source_path):
                        os.unlink(filtered_source_path)
                    
                    return True, f"Image found with confidence {confidence:.3f} (threshold: {threshold:.3f})", additional_data
                
                # Clean up temp file if it was created
                if filtered_source_path != source_path and os.path.exists(filtered_source_path):
                    os.unlink(filtered_source_path)
            
            # Generate comparison images even for failed matches
            if best_source_path and model is not None:
                image_urls = self._generate_comparison_images(best_source_path, resolved_image_path, area, verification_index, model, image_filter)
                additional_data.update(image_urls)
            
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
                    
                    # Generate comparison images and URLs like the original working version
                    image_urls = self._generate_comparison_images(capture_path, resolved_image_path, area, verification_index, model, image_filter)
                    additional_data.update(image_urls)
                    
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
            
            # Generate comparison images even for failed matches
            if model is not None:
                image_urls = self._generate_comparison_images(capture_path, resolved_image_path, area, verification_index, model, image_filter)
                additional_data.update(image_urls)
            
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

    def _generate_comparison_images(self, source_path: str, reference_path: str, area: dict = None, 
                                   verification_index: int = 0, model: str = None, 
                                   image_filter: str = 'none') -> dict:
        """
        Generate comparison images exactly like the original working version.
        Creates source, reference, and overlay images with public URLs.
        """
        try:
            # Create results directory - simple path, just ensure it exists
            results_dir = '/var/www/html/stream/verification_results'
            os.makedirs(results_dir, exist_ok=True)
            
            # Create result file paths in stream directory
            source_result_path = f'{results_dir}/source_image_{verification_index}.png'
            reference_result_path = f'{results_dir}/reference_image_{verification_index}.png'
            overlay_result_path = f'{results_dir}/result_overlay_{verification_index}.png'
            
            print(f"[@controller:ImageVerification] Generating comparison images:")
            print(f"  Source: {source_path} -> {source_result_path}")
            print(f"  Reference: {reference_path} -> {reference_result_path}")
            print(f"  Overlay: {overlay_result_path}")
            
            # === STEP 1: Handle Source Image ===
            # Crop source image to area if specified (always crop for source)
            if area:
                # Use controller to crop source image
                success = self.crop_image(source_path, source_result_path, area, create_filtered_versions=False)
                if not success:
                    print(f"[@controller:ImageVerification] Failed to crop source image")
                    return {}
            else:
                # Copy full source image using controller
                success = self.copy_image(source_path, source_result_path)
                if not success:
                    print(f"[@controller:ImageVerification] Failed to copy source image")
                    return {}
            
            # Apply filter to source image if user selected one
            if image_filter and image_filter != 'none':
                print(f"[@controller:ImageVerification] Applying {image_filter} filter to source image")
                if not self.apply_filter(source_result_path, image_filter):
                    print(f"[@controller:ImageVerification] Warning: Failed to apply {image_filter} filter to source")
            
            # === STEP 2: Handle Reference Image ===
            # Copy reference image and apply filter if needed
            if image_filter and image_filter != 'none':
                # User wants filtered comparison - check if filtered reference exists
                base_path, ext = os.path.splitext(reference_path)
                filtered_reference_path = f"{base_path}_{image_filter}{ext}"
                
                if os.path.exists(filtered_reference_path):
                    print(f"[@controller:ImageVerification] Using existing filtered reference: {filtered_reference_path}")
                    self.copy_image(filtered_reference_path, reference_result_path)
                else:
                    print(f"[@controller:ImageVerification] Filtered reference not found, creating dynamically from original: {reference_path}")
                    # Copy original reference first using controller
                    self.copy_image(reference_path, reference_result_path)
                    # Apply filter dynamically to the copied reference
                    if not self.apply_filter(reference_result_path, image_filter):
                        print(f"[@controller:ImageVerification] Warning: Failed to apply {image_filter} filter to reference, using original")
                        # If filter fails, copy original again to ensure clean state
                        self.copy_image(reference_path, reference_result_path)
                    else:
                        print(f"[@controller:ImageVerification] Successfully applied {image_filter} filter to reference image")
            else:
                # User wants original comparison - use original reference
                print(f"[@controller:ImageVerification] Using original reference: {reference_path}")
                self.copy_image(reference_path, reference_result_path)
            
            # === STEP 3: Create Pixel-by-Pixel Difference Overlay ===
            # Load both images for comparison
            source_img = cv2.imread(source_result_path)
            ref_img = cv2.imread(reference_result_path)
            
            if source_img is None or ref_img is None:
                print(f"[@controller:ImageVerification] Failed to load images for comparison")
                return {}
            
            print(f"[@controller:ImageVerification] Source image shape: {source_img.shape}")
            print(f"[@controller:ImageVerification] Reference image shape: {ref_img.shape}")
            
            # Create pixel-by-pixel difference overlay
            overlay_img = self._create_pixel_difference_overlay(source_img, ref_img)
            
            if overlay_img is not None:
                cv2.imwrite(overlay_result_path, overlay_img)
                print(f"[@controller:ImageVerification] Created pixel-by-pixel difference overlay")
            else:
                print(f"[@controller:ImageVerification] Failed to create pixel difference overlay")
                return {}
            
            # === STEP 4: Convert local paths to public URLs ===
            # Check if we have the original R2 URL for the source image
            source_url = None
            try:
                # Check if verification controller has the original screenshot URL
                from src.controllers.controller_config_factory import get_controller
                from flask import request
                
                # Get device_id from request data
                data = request.get_json() if request and hasattr(request, 'get_json') else {}
                device_id = data.get('device_id', 'device1')
                
                # Get verification controller for device
                verification_controller = get_controller(device_id, 'verification')
                if verification_controller and hasattr(verification_controller, '_last_screenshot_url'):
                    source_url = verification_controller._last_screenshot_url
                    print(f"[@controller:ImageVerification] Using original R2 URL for source: {source_url}")
            except Exception as e:
                print(f"[@controller:ImageVerification] Could not get original R2 URL: {e}")
            
            # Get host device info for URL building
            try:
                from src.utils.build_url_utils import buildVerificationResultUrl
                from src.controllers.controller_config_factory import get_controller
                from flask import request
                
                # Get device_id from request data
                data = request.get_json() if request and hasattr(request, 'get_json') else {}
                device_id = data.get('device_id', 'device1')
                
                # Get verification controller for device (this provides device context)
                verification_controller = get_controller(device_id, 'verification')
                if not verification_controller:
                    print(f"[@controller:ImageVerification] ERROR: No verification controller found for device {device_id}")
                    raise ValueError("Verification controller not available for URL building")
                
                # Get host device from verification controller
                host_device = getattr(verification_controller, 'host_device', None)
                if not host_device:
                    print(f"[@controller:ImageVerification] ERROR: No host device found in verification controller")
                    raise ValueError("Host device context required for URL building")
                
                # Build public URLs - use R2 URL for source if available, build URLs for reference and overlay
                if not source_url:
                    source_url = buildVerificationResultUrl(host_device, source_result_path)
                reference_url = buildVerificationResultUrl(host_device, reference_result_path)
                overlay_url = buildVerificationResultUrl(host_device, overlay_result_path)
                
                print(f"[@controller:ImageVerification] Built URLs:")
                print(f"  Source URL: {source_url} {'(R2 original)' if hasattr(verification_controller, '_last_screenshot_url') and verification_controller._last_screenshot_url else '(built)'}")
                print(f"  Reference URL: {reference_url}")
                print(f"  Overlay URL: {overlay_url}")
                
                return {
                    'source_image_path': source_result_path,
                    'reference_image_path': reference_result_path,
                    'result_overlay_path': overlay_result_path,
                    'sourceImageUrl': source_url,
                    'referenceImageUrl': reference_url,
                    'resultOverlayUrl': overlay_url,
                }
                
            except Exception as url_error:
                print(f"[@controller:ImageVerification] URL building error: {url_error}")
                raise ValueError(f"Failed to build verification result URLs: {url_error}")
                
        except Exception as e:
            print(f"[@controller:ImageVerification] Error generating comparison images: {e}")
            return {}

    def _create_pixel_difference_overlay(self, source_img: np.ndarray, ref_img: np.ndarray) -> Optional[np.ndarray]:
        """
        Create a pixel-by-pixel difference overlay image.
        
        Green pixels (with transparency) = matching pixels
        Red pixels (with transparency) = non-matching pixels
        
        Args:
            source_img: Source image (BGR format)
            ref_img: Reference image (BGR format)
            
        Returns:
            BGRA overlay image with transparency, or None if failed
        """
        try:
            # Ensure both images have the same dimensions
            if source_img.shape != ref_img.shape:
                print(f"[@controller:ImageVerification] Resizing images to match - Source: {source_img.shape}, Ref: {ref_img.shape}")
                # Resize reference to match source
                ref_img = cv2.resize(ref_img, (source_img.shape[1], source_img.shape[0]))
            
            # Convert to grayscale for pixel comparison (more reliable than color)
            source_gray = cv2.cvtColor(source_img, cv2.COLOR_BGR2GRAY)
            ref_gray = cv2.cvtColor(ref_img, cv2.COLOR_BGR2GRAY)
            
            # Calculate absolute difference between pixels
            diff = cv2.absdiff(source_gray, ref_gray)
            
            # Create binary mask for matching/non-matching pixels
            # Threshold for pixel difference (adjust as needed - smaller = more sensitive)
            pixel_threshold = 10  # Pixels with difference <= 10 are considered matching
            matching_mask = diff <= pixel_threshold
            
            # Create BGRA overlay (BGR + Alpha channel for transparency)
            height, width = source_img.shape[:2]
            overlay = np.zeros((height, width, 4), dtype=np.uint8)
            
            # Set transparency level (0-255, where 0=fully transparent, 255=fully opaque)
            transparency = 128  # 50% transparency
            
            # Green pixels for matching areas (BGR format: Green = [0, 255, 0])
            overlay[matching_mask] = [0, 255, 0, transparency]  # Green with transparency
            
            # Red pixels for non-matching areas (BGR format: Red = [0, 0, 255])
            overlay[~matching_mask] = [0, 0, 255, transparency]  # Red with transparency
            
            # Optional: Make areas with very small differences more transparent
            # This helps focus attention on significant differences
            small_diff_mask = (diff > 0) & (diff <= 5)
            if np.any(small_diff_mask):
                overlay[small_diff_mask] = [0, 255, 0, transparency // 2]  # More transparent green
            
            print(f"[@controller:ImageVerification] Pixel comparison stats:")
            matching_pixels = np.sum(matching_mask)
            total_pixels = height * width
            match_percentage = (matching_pixels / total_pixels) * 100
            print(f"  Matching pixels: {matching_pixels}/{total_pixels} ({match_percentage:.1f}%)")
            print(f"  Pixel threshold: {pixel_threshold}")
            print(f"  Overlay transparency: {transparency}/255")
            
            return overlay
            
        except Exception as e:
            print(f"[@controller:ImageVerification] Error creating pixel difference overlay: {e}")
            return None

    def _resolve_reference_image(self, image_path: str, model: str = None) -> Optional[str]:
        """
        Resolve reference image path by systematically downloading from R2.
        Always downloads to ensure we have the latest version.
        
        Args:
            image_path: Reference image name or path
            model: Device model for organizing images
            
        Returns:
            Local path to downloaded reference image or None if failed
        """
        try:
            # Extract reference name from path
            if '/' in image_path:
                reference_name = os.path.basename(image_path)
            else:
                reference_name = image_path
            
            # Remove extension if present to get base name
            base_name = reference_name.split('.')[0]
            
            print(f"[@controller:ImageVerification] Resolving reference: {reference_name} for model: {model}")
            
            # Get reference data from database to find R2 URL
            try:
                # from src.controllers.verification_controller import get_verification_controller
                # controller = get_verification_controller(temp_host_device)
                # REMOVED: verification_controller dependency
                
                # Create a temporary host device object for database lookup
                temp_host_device = {'device_model': model or 'default'}
                # REMOVED: verification_controller dependency
                
                # Get all references to find the one we need
                references_result = controller.get_all_references(DEFAULT_TEAM_ID)
                if not references_result['success']:
                    print(f"[@controller:ImageVerification] Failed to get references from database: {references_result.get('error')}")
                    return None
                
                # Find matching reference
                target_reference = None
                for ref in references_result['images']:
                    ref_name = ref['name']
                    ref_base = ref_name.split('.')[0]
                    if ref_base == base_name or ref_name == reference_name:
                        target_reference = ref
                        break
                
                if not target_reference:
                    print(f"[@controller:ImageVerification] Reference not found in database: {reference_name}")
                    return None
                
                r2_url = target_reference.get('r2_url')
                if not r2_url:
                    print(f"[@controller:ImageVerification] No R2 URL found for reference: {reference_name}")
                    return None
                
                print(f"[@controller:ImageVerification] Found R2 URL: {r2_url}")
                
            except Exception as db_error:
                print(f"[@controller:ImageVerification] Database lookup error: {db_error}")
                return None
            
            # Set up local path for downloaded reference
            resources_path = '/var/www/html/stream/resources'
            device_model = model or 'default'
            local_dir = f'{resources_path}/{device_model}'
            os.makedirs(local_dir, exist_ok=True)
            
            # Use the reference name with proper extension
            if not reference_name.endswith(('.jpg', '.jpeg', '.png')):
                reference_name = f"{reference_name}.jpg"
            
            local_path = f'{local_dir}/{reference_name}'
            
            print(f"[@controller:ImageVerification] Downloading from R2 to: {local_path}")
            
            # Download from R2 using CloudflareUtils
            try:
                from urllib.parse import urlparse
                from src.utils.cloudflare_utils import get_cloudflare_utils
                
                # Extract R2 object key from URL
                parsed_url = urlparse(r2_url)
                r2_object_key = parsed_url.path.lstrip('/')
                
                print(f"[@controller:ImageVerification] R2 object key: {r2_object_key}")
                
                # Download file
                cloudflare_utils = get_cloudflare_utils()
                download_result = cloudflare_utils.download_file(r2_object_key, local_path)
                
                if download_result.get('success'):
                    print(f"[@controller:ImageVerification] Successfully downloaded reference from R2: {local_path}")
                    return local_path
                else:
                    print(f"[@controller:ImageVerification] Failed to download from R2: {download_result.get('error')}")
                    return None
                    
            except Exception as download_error:
                print(f"[@controller:ImageVerification] R2 download error: {download_error}")
                return None
                
        except Exception as e:
            print(f"[@controller:ImageVerification] Reference resolution error: {e}")
            return None

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

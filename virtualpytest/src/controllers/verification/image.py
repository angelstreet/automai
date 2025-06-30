"""
Image Verification Controller

Clean image controller that uses helpers for all operations.
Provides route interfaces and core domain logic.
"""

import time
import os
import cv2
import numpy as np
import json
from datetime import datetime
from typing import Dict, Any, Optional, Tuple, List
from .image_helpers import ImageHelpers
import logging


class ImageVerificationController:
    """Pure image verification controller that uses template matching to detect images on screen."""
    
    def __init__(self, av_controller, **kwargs):
        """
        Initialize the Image Verification controller.
        
        Args:
            av_controller: AV controller for capturing images (dependency injection)
        """
        self.av_controller = av_controller
        self.captures_path = os.path.join(av_controller.video_capture_path, 'captures')
        self.verification_type = 'image'

        self.verification_results_dir = os.path.join(self.captures_path, 'verification_results')
        self.cropped_images_dir = os.path.join(self.captures_path, 'cropped')
        self.references_dir = os.path.join(self.captures_path, 'references')
        
        # Ensure all directories exist
        for directory in [self.verification_results_dir, self.cropped_images_dir, self.references_dir]:
            os.makedirs(directory, exist_ok=True)
        
        # Initialize helpers with explicit references directory
        self.helpers = ImageHelpers(self.captures_path, av_controller)
        
        print(f"[@controller:ImageVerification] Initialized")
        print(f"[@controller:ImageVerification] Initialized with paths:")
        print(f"  Captures: {self.captures_path}")
        print(f"  Verification results: {self.verification_results_dir}")
        print(f"  Cropped images: {self.cropped_images_dir}")
        print(f"  References: {self.references_dir}")
        
        # Controller is always ready
        self.is_connected = True
        self.verification_session_id = f"image_verify_{int(time.time())}"

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
            "controller_type": "image",
            "captures_path": self.captures_path
        }
    
    def waitForImageToAppear(self, image_path: str, timeout: float = 1.0, threshold: float = 0.8, 
                            area: tuple = None, image_list: List[str] = None, 
                            verification_index: int = 0, image_filter: str = 'none', model: str = 'default') -> Tuple[bool, str, dict]:
        """
        Wait for image to appear either in provided image list or by capturing new frames.
        
        Args:
            image_path: Path to reference image to search for
            timeout: Maximum time to wait (seconds)
            threshold: Confidence threshold (0.0 to 1.0)
            area: Optional area to search within
            image_list: List of image paths to search in (if None, captures new frames)
            verification_index: Index of verification for naming
            image_filter: Filter to apply ('none', 'greyscale', 'binary')
            model: Device model for reference image resolution
            
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
        
        # Resolve reference image path using provided device model
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
            "image_filter": image_filter,
            "user_threshold": threshold  # Store user's original threshold setting
        }
        
        if image_list:
            # Search in provided images
            print(f"[@controller:ImageVerification] Searching in {len(image_list)} provided images")
            max_confidence = 0.0
            best_source_path = None
            
            for source_path in image_list:
                if not os.path.exists(source_path):
                    continue
                
                source_img = cv2.imread(source_path, cv2.IMREAD_COLOR)
                if source_img is None:
                    continue
                
                confidence = self._match_template(ref_img, source_img, area)
                
                # Always set first valid source as best_source_path, then update if better confidence found
                if best_source_path is None or confidence > max_confidence:
                    max_confidence = confidence
                    best_source_path = source_path
                
                if confidence >= threshold:
                    print(f"[@controller:ImageVerification] Match found in {source_path} with confidence {confidence:.3f}")
                    
                    # Generate comparison images using stored device model
                    image_urls = self._generate_comparison_images(source_path, resolved_image_path, area, verification_index, image_filter)
                    additional_data.update(image_urls)
                    
                    # Save actual confidence (separate from user threshold)
                    additional_data["matching_result"] = confidence  # Actual confidence score
                    
                    return True, f"Image found with confidence {confidence:.3f} (threshold: {threshold:.3f})", additional_data
            
            # Generate comparison images even for failed matches
            if best_source_path:
                image_urls = self._generate_comparison_images(best_source_path, resolved_image_path, area, verification_index, image_filter)
                additional_data.update(image_urls)
            
            # Save best confidence (separate from user threshold)
            additional_data["matching_result"] = max_confidence  # Actual confidence score
            
            return False, f"Image not found. Best confidence: {max_confidence:.3f} (threshold: {threshold:.3f})", additional_data
        
        else:
            # Capture new image if no image list provided - this shouldn't happen in our case
            print(f"[@controller:ImageVerification] No image list provided, image not found")
            return False, "Image not found in current screenshot", additional_data

    def waitForImageToDisappear(self, image_path: str, timeout: float = 1.0, threshold: float = 0.8,
                               area: tuple = None, image_list: List[str] = None,
                               verification_index: int = 0, image_filter: str = 'none', model: str = 'default') -> Tuple[bool, str, dict]:
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
        found, message, additional_data = self.waitForImageToAppear(image_path, timeout, threshold, area, image_list, verification_index, image_filter, model)
        
        # Invert the boolean result and adjust the message
        success = not found
        
        # For disappear operations, invert the matching result for UI display to make it intuitive
        if 'matching_result' in additional_data and additional_data['matching_result'] is not None:
            original_confidence = additional_data['matching_result']
            # Invert confidence for disappear operations: 1.0 - original gives intuitive "disappear percentage"
            inverted_confidence = 1.0 - original_confidence
            additional_data['matching_result'] = inverted_confidence
            additional_data['original_confidence'] = original_confidence  # Keep original for debugging
            print(f"[@controller:ImageVerification] Disappear confidence display: {original_confidence:.3f} -> {inverted_confidence:.3f} (inverted for UI)")
        
        if success:
            # Image has disappeared (was not found)
            return True, f"Image disappeared: {message}", additional_data
        else:
            # Image is still present (was found)
            return False, f"Image still present: {message}", additional_data

    # =============================================================================
    # Route Interface Methods (Required by host_verification_image_routes.py)
    # =============================================================================

    def crop_image(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Route interface for image cropping."""
        try:
            # Get source filename from frontend
            image_source_url = data.get('image_source_url', '')
            area = data.get('area')
            reference_name = data.get('reference_name', 'cropped_image')
            
            if not image_source_url:
                return {'success': False, 'message': 'image_source_url is required'}
            
            if not area:
                return {'success': False, 'message': 'area is required for cropping'}
            
            # Build full path for local files, keep URLs as-is
            if image_source_url.startswith(('http://', 'https://')):
                # URL case - download first
                image_source_path = self.helpers.download_image(image_source_url)
            else:
                # Local filename case - build full path directly
                image_source_path = os.path.join(self.captures_path, image_source_url)
                
                if not os.path.exists(image_source_path):
                    return {'success': False, 'message': f'Local file not found: {image_source_path}'}
            
            # Generate unique filename for output
            filename = self.helpers.get_unique_filename(reference_name)
            image_cropped_path = os.path.join(self.captures_path, filename)
            
            # Crop image using helpers
            success = self.helpers.crop_image_to_area(image_source_path, image_cropped_path, area)
            
            if not success:
                return {'success': False, 'message': 'Image cropping failed'}
            
            # Create filtered versions
            self.helpers.create_filtered_versions(image_cropped_path)
            
            return {
                'success': True,
                'message': f'Image cropped successfully: {filename}',
                'image_cropped_path': image_cropped_path,
                'filename': filename,
                'area': area,
                'source_was_url': image_source_url.startswith(('http://', 'https://'))
            }
                
        except Exception as e:
            return {'success': False, 'message': f'Image crop failed: {str(e)}'}

    def process_image(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Route interface for image processing."""
        try:
            image_source_url = data.get('image_source_url', '')
            remove_background = data.get('remove_background', False)
            image_filter = data.get('image_filter', 'none')
            
            if not image_source_url:
                return {'success': False, 'message': 'image_source_url is required'}
            
            # Build full path for local files, keep URLs as-is
            if image_source_url.startswith(('http://', 'https://')):
                # URL case - download first
                image_source_path = self.helpers.download_image(image_source_url)
                # Create a copy in captures directory
                filename = self.helpers.get_unique_filename('filtered_image')
                image_filtered_path = os.path.join(self.captures_path, filename)
                self.helpers.copy_image_file(image_source_path, image_filtered_path)
                # Clean up temp file
                try:
                    os.unlink(image_source_path)
                except:
                    pass
                image_filtered_path = image_filtered_path
            else:
                # Local filename case - build full path directly
                image_source_path = os.path.join(self.captures_path, image_source_url)
                
                if not os.path.exists(image_source_path):
                    return {'success': False, 'message': f'Local file not found: {image_source_path}'}
                
                # Create copy for filtering
                filename = self.helpers.get_unique_filename('filtered_image')
                image_filtered_path = os.path.join(self.captures_path, filename)
                self.helpers.copy_image_file(image_source_path, image_filtered_path)
            
            # Apply background removal if requested
            if remove_background:
                bg_success = self.helpers.remove_background(image_filtered_path)
                if not bg_success:
                    return {'success': False, 'message': 'Background removal failed'}
            
            # Apply filter using helpers
            filter_success = self.helpers.apply_image_filter(image_filtered_path, image_filter)
            if not filter_success:
                return {'success': False, 'message': f'Filter application failed: {image_filter}'}
            
            return {
                'success': True,
                'message': f'Image filtered successfully',
                'image_filtered_path': image_filtered_path,
                'filename': os.path.basename(image_filtered_path),
                'operations': {
                    'remove_background': remove_background,
                    'filter': image_filter
                },
                'source_was_url': image_source_url.startswith(('http://', 'https://'))
            }
                
        except Exception as e:
            return {'success': False, 'message': f'Image processing failed: {str(e)}'}

    def save_image(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Route interface for saving image references."""
        try:
            image_source_url = data.get('image_source_url', '')
            reference_name = data.get('reference_name', 'image_reference')
            area = data.get('area')
            
            if not image_source_url:
                return {'success': False, 'message': 'image_source_url is required for saving reference'}
            
            # Build full path for local files, keep URLs as-is
            if image_source_url.startswith(('http://', 'https://')):
                # URL case - download first
                image_source_path = self.helpers.download_image(image_source_url)
            else:
                # Local filename case - build full path directly
                image_source_path = os.path.join(self.captures_path, image_source_url)
                
                if not os.path.exists(image_source_path):
                    return {'success': False, 'message': f'Local file not found: {image_source_path}'}
            
            # Generate unique filename for saved reference
            filename = self.helpers.get_unique_filename(reference_name)
            image_saved_path = os.path.join(self.captures_path, filename)
            
            # Save image using helpers
            success = self.helpers.copy_image_file(image_source_path, image_saved_path)
            
            if not success:
                return {'success': False, 'message': 'Image save failed'}
            
            # Create filtered versions
            self.helpers.create_filtered_versions(image_saved_path)
            
            # Get device model from request data (frontend provides it)
            device_model = data.get('device_model')
            
            if not device_model:
                return {'success': False, 'message': 'device_model is required for saving reference'}
            
            # Save reference using helpers (handles R2 upload and database save)
            save_result = self.helpers.save_image_reference(image_saved_path, reference_name, device_model, area)
            
            if not save_result.get('success'):
                return {
                    'success': False,
                    'message': save_result.get('error', 'Failed to save image reference')
                }
            
            # Clean up temp file if we downloaded it
            if image_source_url.startswith(('http://', 'https://')) and image_source_path.startswith('/tmp/'):
                try:
                    os.unlink(image_source_path)
                except:
                    pass
            
            return {
                'success': True,
                'message': f'Image reference saved successfully: {reference_name}',
                'reference_name': save_result.get('reference_name'),
                'r2_url': save_result.get('r2_url'),
                'r2_path': save_result.get('r2_path'),
                'reference_id': save_result.get('reference_id')
            }
            
        except Exception as e:
            return {'success': False, 'message': f'Image save failed: {str(e)}'}

    def execute_verification(self, verification_config: Dict[str, Any]) -> Dict[str, Any]:
        """Route interface for executing verification."""
        try:
            # Check if a source image path is provided in the config
            source_path = verification_config.get('source_image_path')
            
            if source_path:
                print(f"[@controller:ImageVerification] Using provided source image: {source_path}")
                # Validate the provided source image exists
                if not os.path.exists(source_path):
                    return {
                        'success': False,
                        'message': f'Provided source image not found: {source_path}',
                        'screenshot_path': None
                    }
            else:
                # No fallback allowed - source image must be provided
                return {
                    'success': False,
                    'message': 'No source image provided for image verification. Source image is required.',
                    'screenshot_path': None
                }
            
            # Extract parameters from nested structure
            params = verification_config.get('params', {})
            command = verification_config.get('command', 'waitForImageToAppear')
            
            # Required parameters
            image_path = params.get('image_path', '')
            if not image_path:
                return {
                    'success': False,
                    'message': 'No reference image specified for image verification',
                    'screenshot_path': source_path
                }
            
            # Optional parameters with defaults
            threshold = params.get('threshold', 0.8)
            timeout = params.get('timeout', 1.0)
            area = params.get('area')
            image_filter = params.get('image_filter', 'none')
            model = params.get('model')
            
            print(f"[@controller:ImageVerification] Searching for image: {image_path}")
            print(f"[@controller:ImageVerification] Timeout: {timeout}s, Confidence: {threshold}")
            print(f"[@controller:ImageVerification] Using source image: {source_path}")
            
            # Execute verification based on command using provided device model
            if command == 'waitForImageToAppear':
                success, message, details = self.waitForImageToAppear(
                    image_path=image_path,
                    timeout=timeout,
                    threshold=threshold,
                    area=area,
                    image_list=[source_path],  # Use source_path as image list
                    verification_index=0,
                    image_filter=image_filter,
                    model=model
                )
            elif command == 'waitForImageToDisappear':
                success, message, details = self.waitForImageToDisappear(
                    image_path=image_path,
                    timeout=timeout,
                    threshold=threshold,
                    area=area,
                    image_list=[source_path],  # Use source_path as image list
                    verification_index=0,
                    image_filter=image_filter,
                    model=model
                )
            else:
                return {
                    'success': False,
                    'message': f'Unknown image verification command: {command}',
                    'screenshot_path': source_path
                }
            
            # Return results in frontend-expected format
            result = {
                'success': success,
                'message': message,
                'screenshot_path': source_path,
                'matching_result': details.get('matching_result', 0.0),  # Actual confidence
                'user_threshold': details.get('user_threshold', threshold),  # User's threshold setting
                'image_filter': details.get('image_filter', image_filter),  # Applied filter
                'details': details  # Keep for route processing, will be removed by route
            }
            
            return result
            
        except Exception as e:
            print(f"[@controller:ImageVerification] Execution error: {e}")
            return {
                'success': False,
                'message': f'Image verification execution error: {str(e)}',
                'screenshot_path': source_path if 'source_path' in locals() else None
            }

    def get_available_verifications(self) -> list:
        """Get list of available verification types."""
        return [
            {
                "command": "waitForImageToAppear",
                "params": {
                    "image_path": "",       # Empty string for user input
                    "timeout": 0,           # Default: single check, no polling
                    "confidence": 0.8,      # Default value
                    "area": None            # Optional area
                },
                "verification_type": "image"
            },
            {
                "command": "waitForImageToDisappear",
                "params": {
                    "image_path": "",       # Empty string for user input
                    "timeout": 0,           # Default: single check, no polling
                    "confidence": 0.8,      # Default value
                    "area": None            # Optional area
                },
                "verification_type": "image"
            }
        ]

    def _generate_comparison_images(self, source_path: str, reference_path: str, area: dict = None, 
                                   verification_index: int = 0, image_filter: str = 'none') -> dict:
        """
        Generate comparison images and return local file paths.
        Route will handle URL building.
        """
        try:
            # Use predefined verification results directory
            results_dir = self.verification_results_dir
            
            # Generate unique filenames for this verification
            source_result_path = f'{results_dir}/source_image_{verification_index}.png'
            reference_result_path = f'{results_dir}/reference_image_{verification_index}.png'
            overlay_result_path = f'{results_dir}/result_overlay_{verification_index}.png'
            
            print(f"[@controller:ImageVerification] Generating comparison images:")
            print(f"  Source: {source_result_path}")
            print(f"  Reference: {reference_result_path}")
            print(f"  Overlay: {overlay_result_path}")
            
            # === STEP 1: Handle Source Image ===
            if area:
                print(f"[@controller:ImageVerification] Cropping source to area: {area}")
                if not self.helpers.crop_image_to_area(source_path, source_result_path, area):
                    print(f"[@controller:ImageVerification] Failed to crop source image")
                    return {}
            else:
                print(f"[@controller:ImageVerification] Using full source image: {source_path}")
                self.helpers.copy_image_file(source_path, source_result_path)
            
            # Apply filter to source if requested
            if image_filter and image_filter != 'none':
                print(f"[@controller:ImageVerification] Applying {image_filter} filter to source")
                if not self.helpers.apply_image_filter(source_result_path, image_filter):
                    print(f"[@controller:ImageVerification] Warning: Failed to apply {image_filter} filter to source")
            
            # === STEP 2: Handle Reference Image ===
            if image_filter and image_filter != 'none':
                base_path, ext = os.path.splitext(reference_path)
                filtered_reference_path = f"{base_path}_{image_filter}{ext}"
                
                if os.path.exists(filtered_reference_path):
                    print(f"[@controller:ImageVerification] Using existing filtered reference: {filtered_reference_path}")
                    self.helpers.copy_image_file(filtered_reference_path, reference_result_path)
                else:
                    print(f"[@controller:ImageVerification] Creating filtered reference dynamically")
                    self.helpers.copy_image_file(reference_path, reference_result_path)
                    if not self.helpers.apply_image_filter(reference_result_path, image_filter):
                        print(f"[@controller:ImageVerification] Warning: Failed to apply {image_filter} filter to reference")
                        self.helpers.copy_image_file(reference_path, reference_result_path)
            else:
                print(f"[@controller:ImageVerification] Using original reference: {reference_path}")
                self.helpers.copy_image_file(reference_path, reference_result_path)
            
            # === STEP 3: Create Overlay ===
            source_img = cv2.imread(source_result_path)
            ref_img = cv2.imread(reference_result_path)
            
            if source_img is None or ref_img is None:
                print(f"[@controller:ImageVerification] Failed to load images for comparison")
                return {}
            
            overlay_img = self._create_pixel_difference_overlay(source_img, ref_img)
            if overlay_img is not None:
                cv2.imwrite(overlay_result_path, overlay_img)
                print(f"[@controller:ImageVerification] Created overlay image")
            else:
                print(f"[@controller:ImageVerification] Failed to create overlay")
                return {}
            
            # Return only local file paths - route will build URLs
            return {
                "source_image_path": source_result_path,
                "reference_image_path": reference_result_path,
                "result_overlay_path": overlay_result_path
            }
            
        except Exception as e:
            print(f"[@controller:ImageVerification] Error generating comparison images: {e}")
            return {}

    def _create_pixel_difference_overlay(self, source_img, ref_img):
        """
        Create a pixel-by-pixel difference overlay image.
        
        Green pixels (with transparency) = matching pixels
        Red pixels (with transparency) = non-matching pixels
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

    def _resolve_reference_image(self, image_path: str, model: str = 'default') -> Optional[str]:
        """
        Resolve reference image path by downloading from R2 if needed.
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
            
            # Use provided device model
            local_dir = os.path.join(self.references_dir, model)
            os.makedirs(local_dir, exist_ok=True)
            
            # Use the reference name with proper extension
            if not reference_name.endswith(('.jpg', '.jpeg', '.png')):
                reference_name = f"{reference_name}.jpg"
            
            local_path = f'{local_dir}/{reference_name}'
            
            # Check if already exists locally
            if os.path.exists(local_path):
                print(f"[@controller:ImageVerification] Reference already exists locally: {local_path}")
                return local_path
            
            print(f"[@controller:ImageVerification] Downloading from R2 to: {local_path}")
            
            # Download from R2 using CloudflareUtils
            try:
                from src.utils.cloudflare_utils import get_cloudflare_utils
                
                # Construct R2 object key using provided device model
                r2_object_key = f"reference-images/{model}/{reference_name}"
                
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

    def _match_template(self, ref_img, source_img, area: tuple = None) -> float:
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
            
            # Perform standard template matching
            result = cv2.matchTemplate(source_img, ref_img, cv2.TM_CCOEFF_NORMED)
            _, max_val, _, _ = cv2.minMaxLoc(result)
            
            return max_val
            
        except Exception as e:
            print(f"[@controller:ImageVerification] Template matching error: {e}")
            return 0.0

 
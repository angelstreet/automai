"""
Image Verification Controller

Clean image controller that uses helpers for all operations.
Provides route interfaces and core domain logic.
"""

import time
import os
from typing import Dict, Any, Optional, Tuple
from .image_helpers import ImageHelpers


class ImageVerificationController:
    """Pure image verification controller that uses template matching to detect images on screen."""
    
    def __init__(self, av_controller, **kwargs):
        """
        Initialize the Image Verification controller.
        
        Args:
            av_controller: AV controller for capturing images (dependency injection)
        """
        # Dependency injection
        self.av_controller = av_controller
        
        # Use AV controller's capture path with captures subdirectory
        self.captures_path = os.path.join(av_controller.video_capture_path, 'captures')
        
        # Set verification type for controller lookup
        self.verification_type = 'image'
        
        # Initialize helpers
        self.helpers = ImageHelpers(self.captures_path, av_controller)

        print(f"[@controller:ImageVerification] Initialized with captures path: {self.captures_path}")
        
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

    def waitForImageToAppear(self, image_path: str, timeout: float = 10.0, confidence: float = 0.8,
                            area: dict = None) -> tuple:
        """
        Check if a specific image appears on screen immediately.
        
        Args:
            image_path: Path to the reference image to search for
            timeout: Ignored - verification happens immediately
            confidence: Matching confidence threshold (0.0 to 1.0)
            area: Optional area to search within {x, y, width, height}
            
        Returns:
            tuple: (found, match_location, screenshot_path)
        """
        try:
            print(f"[@controller:ImageVerification] Searching for image: {image_path}")
            print(f"[@controller:ImageVerification] Timeout: {timeout}s, Confidence: {confidence}")
            
            # Take screenshot
            screenshot_path = self.av_controller.take_screenshot()
            if not screenshot_path or not os.path.exists(screenshot_path):
                print(f"[@controller:ImageVerification] Failed to take screenshot")
                return False, None, ""
            
            # Perform template matching
            match_result = self.helpers.match_template_in_area(
                screenshot_path, image_path, area, confidence
            )
            
            if match_result['found']:
                print(f"[@controller:ImageVerification] Image found at location: {match_result['location']}")
                return True, match_result['location'], screenshot_path
            else:
                print(f"[@controller:ImageVerification] Image not found in current screenshot")
                return False, None, screenshot_path
                
        except Exception as e:
            print(f"[@controller:ImageVerification] Error in waitForImageToAppear: {e}")
            return False, None, ""

    def waitForImageToDisappear(self, image_path: str, timeout: float = 10.0, confidence: float = 0.8,
                               area: dict = None) -> tuple:
        """
        Check if a specific image has disappeared from screen immediately.
        
        Args:
            image_path: Path to the reference image to search for
            timeout: Ignored - verification happens immediately
            confidence: Matching confidence threshold (0.0 to 1.0)
            area: Optional area to search within {x, y, width, height}
            
        Returns:
            tuple: (disappeared, screenshot_path)
        """
        try:
            print(f"[@controller:ImageVerification] Checking if image disappeared: {image_path}")
            
            # Take screenshot
            screenshot_path = self.av_controller.take_screenshot()
            if not screenshot_path or not os.path.exists(screenshot_path):
                print(f"[@controller:ImageVerification] Failed to take screenshot")
                return False, ""
            
            # Perform template matching
            match_result = self.helpers.match_template_in_area(
                screenshot_path, image_path, area, confidence
            )
            
            if not match_result['found']:
                print(f"[@controller:ImageVerification] Image has disappeared!")
                return True, screenshot_path
            else:
                print(f"[@controller:ImageVerification] Image still present in current screenshot")
                return False, screenshot_path
                
        except Exception as e:
            print(f"[@controller:ImageVerification] Error in waitForImageToDisappear: {e}")
            return False, ""

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
            
            # Apply filter
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
            
            # Save reference metadata locally (for local file backup)
            saved_ref_path = self.helpers.save_image_reference(image_saved_path, reference_name, area)
            
            # Clean up temp file if we downloaded it
            if image_source_url.startswith(('http://', 'https://')) and image_source_path.startswith('/tmp/'):
                try:
                    os.unlink(image_source_path)
                except:
                    pass
            
            return {
                'success': bool(saved_ref_path),
                'message': 'Image reference saved successfully' if saved_ref_path else 'Failed to save image reference',
                'saved_path': saved_ref_path,
                'image_saved_path': image_saved_path,
                'filename': filename,
                # Data for server step
                'reference_name': reference_name,
                'area': area,
                'source_was_url': image_source_url.startswith(('http://', 'https://'))
            }
            
        except Exception as e:
            return {'success': False, 'message': f'Image save failed: {str(e)}'}

    def execute_verification(self, verification_config: Dict[str, Any]) -> Dict[str, Any]:
        """Route interface for executing verification."""
        try:
            command = verification_config.get('command', 'WaitForImageToAppear')
            
            if command == 'WaitForImageToAppear':
                image_path = verification_config.get('image_path', '')
                timeout = verification_config.get('timeout', 10.0)
                confidence = verification_config.get('confidence', 0.8)
                area = verification_config.get('area')
                
                found, location, screenshot_path = self.waitForImageToAppear(
                    image_path, timeout, confidence, area
                )
                
                return {
                    'success': found,
                    'command': command,
                    'image_path': image_path,
                    'screenshot_path': screenshot_path,
                    'match_location': location,
                    'confidence': confidence,
                    'message': f"Image {'found' if found else 'not found'}"
                }
                
            elif command == 'WaitForImageToDisappear':
                image_path = verification_config.get('image_path', '')
                timeout = verification_config.get('timeout', 10.0)
                confidence = verification_config.get('confidence', 0.8)
                area = verification_config.get('area')
                
                disappeared, screenshot_path = self.waitForImageToDisappear(
                    image_path, timeout, confidence, area
                )
                
                return {
                    'success': disappeared,
                    'command': command,
                    'image_path': image_path,
                    'screenshot_path': screenshot_path,
                    'confidence': confidence,
                    'message': f"Image {'disappeared' if disappeared else 'did not disappear'}"
                }
                
            else:
                return {
                    'success': False,
                    'command': command,
                    'message': f"Unknown verification command: {command}"
                }
                
        except Exception as e:
            print(f"[@controller:ImageVerification] Error in execute_verification: {e}")
            return {
                'success': False,
                'command': verification_config.get('command', 'unknown'),
                'message': f"Verification failed: {str(e)}"
            }

    def get_available_verifications(self) -> list:
        """Get list of available verification types."""
        return [
            {
                "command": "WaitForImageToAppear",
                "params": {
                    "image_path": "",       # Empty string for user input
                    "timeout": 10.0,        # Default value
                    "confidence": 0.8,      # Default value
                    "area": None            # Optional area
                },
                "verification_type": "image"
            },
            {
                "command": "WaitForImageToDisappear",
                "params": {
                    "image_path": "",       # Empty string for user input
                    "timeout": 10.0,        # Default value
                    "confidence": 0.8,      # Default value
                    "area": None            # Optional area
                },
                "verification_type": "image"
            }
        ]

 
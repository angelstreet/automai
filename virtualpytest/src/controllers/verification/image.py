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
                            area: dict = None, model: str = None, verification_index: int = 0) -> tuple:
        """
        Wait for a specific image to appear on screen within a timeout period.
        
        Args:
            image_path: Path to the reference image to search for
            timeout: Maximum time to wait in seconds
            confidence: Matching confidence threshold (0.0 to 1.0)
            area: Optional area to search within {x, y, width, height}
            model: Model/device identifier for saving results
            verification_index: Index for naming saved files
            
        Returns:
            tuple: (found, match_location, screenshot_path)
        """
        try:
            print(f"[@controller:ImageVerification] Waiting for image to appear: {image_path}")
            print(f"[@controller:ImageVerification] Timeout: {timeout}s, Confidence: {confidence}")
            
            # Use helpers for core functionality
            found, location, screenshot_path = self.helpers.wait_for_image_to_appear(
                image_path, timeout, confidence, area
            )
            
            if found:
                print(f"[@controller:ImageVerification] Image found at location: {location}")
                return True, location, screenshot_path
            else:
                print(f"[@controller:ImageVerification] Image not found within {timeout}s")
                return False, None, screenshot_path
                
        except Exception as e:
            print(f"[@controller:ImageVerification] Error in waitForImageToAppear: {e}")
            return False, None, ""

    def waitForImageToDisappear(self, image_path: str, timeout: float = 10.0, confidence: float = 0.8,
                               area: dict = None, model: str = None, verification_index: int = 0) -> tuple:
        """
        Wait for a specific image to disappear from screen within a timeout period.
        
        Args:
            image_path: Path to the reference image to search for
            timeout: Maximum time to wait in seconds  
            confidence: Matching confidence threshold (0.0 to 1.0)
            area: Optional area to search within {x, y, width, height}
            model: Model/device identifier for saving results
            verification_index: Index for naming saved files
            
        Returns:
            tuple: (disappeared, screenshot_path)
        """
        try:
            print(f"[@controller:ImageVerification] Waiting for image to disappear: {image_path}")
            
            # Use helpers for core functionality
            disappeared, screenshot_path = self.helpers.wait_for_image_to_disappear(
                image_path, timeout, confidence, area
            )
            
            if disappeared:
                print(f"[@controller:ImageVerification] Image disappeared!")
                return True, screenshot_path
            else:
                print(f"[@controller:ImageVerification] Image did not disappear within {timeout}s")
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
            source_filename = data.get('source_filename', '')
            area = data.get('area')
            reference_name = data.get('reference_name', 'cropped_image')
            
            if not source_filename:
                return {'success': False, 'message': 'source_filename is required'}
            
            if not area:
                return {'success': False, 'message': 'area is required for cropping'}
            
            # Build full path for local files, keep URLs as-is
            if source_filename.startswith(('http://', 'https://')):
                # URL case - download first
                local_image_path = self.helpers.download_image(source_filename)
            else:
                # Local filename case - build full path directly
                local_image_path = os.path.join(self.captures_path, source_filename)
                
                if not os.path.exists(local_image_path):
                    return {'success': False, 'message': f'Local file not found: {local_image_path}'}
            
            # Generate unique filename for output
            filename = self.helpers.get_unique_filename(reference_name)
            output_path = os.path.join(self.captures_path, filename)
            
            # Crop image using helpers
            success = self.helpers.crop_image_to_area(local_image_path, output_path, area)
            
            if not success:
                return {'success': False, 'message': 'Image cropping failed'}
            
            # Create filtered versions
            self.helpers.create_filtered_versions(output_path)
            
            return {
                'success': True,
                'message': f'Image cropped successfully: {filename}',
                'local_path': output_path,
                'processed_image_path': output_path,  # Frontend expects this field for preview
                'filename': filename,
                'area': area,
                'source_was_url': source_filename.startswith(('http://', 'https://'))
            }
            
        except Exception as e:
            return {'success': False, 'message': f'Image crop failed: {str(e)}'}

    def process_image(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Route interface for image processing."""
        try:
            source_filename = data.get('source_filename', '')
            remove_background = data.get('remove_background', False)
            image_filter = data.get('image_filter', 'none')
            
            if not source_filename:
                return {'success': False, 'message': 'source_filename is required'}
            
            # Build full path for local files, keep URLs as-is
            if source_filename.startswith(('http://', 'https://')):
                # URL case - download first
                local_image_path = self.helpers.download_image(source_filename)
                # Create a copy in captures directory
                filename = self.helpers.get_unique_filename('processed_image')
                output_path = os.path.join(self.captures_path, filename)
                self.helpers.copy_image_file(local_image_path, output_path)
                # Clean up temp file
                try:
                    os.unlink(local_image_path)
                except:
                    pass
                local_image_path = output_path
            else:
                # Local filename case - build full path directly
                local_image_path = os.path.join(self.captures_path, source_filename)
                
                if not os.path.exists(local_image_path):
                    return {'success': False, 'message': f'Local file not found: {local_image_path}'}
            
            # Apply background removal if requested
            if remove_background:
                bg_success = self.helpers.remove_background(local_image_path)
                if not bg_success:
                    return {'success': False, 'message': 'Background removal failed'}
            
            # Apply filter
            filter_success = self.helpers.apply_image_filter(local_image_path, image_filter)
            if not filter_success:
                return {'success': False, 'message': f'Filter application failed: {image_filter}'}
            
            return {
                'success': True,
                'message': f'Image processed successfully',
                'local_path': local_image_path,
                'processed_image_path': local_image_path,  # Frontend expects this field for preview
                'filename': os.path.basename(local_image_path),
                'operations': {
                    'remove_background': remove_background,
                    'filter': image_filter
                },
                'source_was_url': source_filename.startswith(('http://', 'https://'))
            }
            
        except Exception as e:
            return {'success': False, 'message': f'Image processing failed: {str(e)}'}

    def save_image(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Route interface for saving image references."""
        try:
            source_filename = data.get('source_filename', '')
            reference_name = data.get('reference_name', 'image_reference')
            area = data.get('area')
            
            if not source_filename:
                return {'success': False, 'message': 'source_filename is required for saving reference'}
            
            # Build full path for local files, keep URLs as-is
            if source_filename.startswith(('http://', 'https://')):
                # URL case - download first
                local_image_path = self.helpers.download_image(source_filename)
            else:
                # Local filename case - build full path directly
                local_image_path = os.path.join(self.captures_path, source_filename)
                
                if not os.path.exists(local_image_path):
                    return {'success': False, 'message': f'Local file not found: {local_image_path}'}
            
            # Generate unique filename for saved reference
            filename = self.helpers.get_unique_filename(reference_name)
            output_path = os.path.join(self.captures_path, filename)
            
            # Save image using helpers
            success = self.helpers.copy_image_file(local_image_path, output_path)
            
            if not success:
                return {'success': False, 'message': 'Image save failed'}
            
            # Create filtered versions
            self.helpers.create_filtered_versions(output_path)
            
            # Save reference metadata locally (for local file backup)
            saved_ref_path = self.helpers.save_image_reference(output_path, reference_name, area)
            
            # Clean up temp file if we downloaded it
            if source_filename.startswith(('http://', 'https://')) and local_image_path.startswith('/tmp/'):
                try:
                    os.unlink(local_image_path)
                except:
                    pass
            
            return {
                'success': bool(saved_ref_path),
                'message': 'Image reference saved successfully' if saved_ref_path else 'Failed to save image reference',
                'saved_path': saved_ref_path,
                'local_path': output_path,
                'filename': filename,
                # Data for server step
                'reference_name': reference_name,
                'area': area,
                'source_was_url': source_filename.startswith(('http://', 'https://'))
            }
            
        except Exception as e:
            return {'success': False, 'message': f'Image save failed: {str(e)}'}

    def execute_verification(self, verification_config: Dict[str, Any]) -> Dict[str, Any]:
        """Route interface for executing verification."""
        try:
            verification_type = verification_config.get('type', 'image_appears')
            
            if verification_type == 'image_appears':
                image_path = verification_config.get('image_path', '')
                timeout = verification_config.get('timeout', 10.0)
                confidence = verification_config.get('confidence', 0.8)
                area = verification_config.get('area')
                
                found, location, screenshot_path = self.waitForImageToAppear(
                    image_path, timeout, confidence, area,
                    verification_config.get('model'),
                    verification_config.get('verification_index', 0)
                )
                
                return {
                    'success': found,
                    'type': verification_type,
                    'image_path': image_path,
                    'screenshot_path': screenshot_path,
                    'match_location': location,
                    'confidence': confidence,
                    'message': f"Image {'found' if found else 'not found'}"
                }
                
            elif verification_type == 'image_disappears':
                image_path = verification_config.get('image_path', '')
                timeout = verification_config.get('timeout', 10.0)
                confidence = verification_config.get('confidence', 0.8)
                area = verification_config.get('area')
                
                disappeared, screenshot_path = self.waitForImageToDisappear(
                    image_path, timeout, confidence, area,
                    verification_config.get('model'),
                    verification_config.get('verification_index', 0)
                )
                
                return {
                    'success': disappeared,
                    'type': verification_type,
                    'image_path': image_path,
                    'screenshot_path': screenshot_path,
                    'confidence': confidence,
                    'message': f"Image {'disappeared' if disappeared else 'did not disappear'}"
                }
                
            else:
                return {
                    'success': False,
                    'type': verification_type,
                    'message': f"Unknown verification type: {verification_type}"
                }
                
        except Exception as e:
            print(f"[@controller:ImageVerification] Error in execute_verification: {e}")
            return {
                'success': False,
                'type': verification_config.get('type', 'unknown'),
                'message': f"Verification failed: {str(e)}"
            }

    # =============================================================================
    # Verification Interface Methods (For compatibility)
    # =============================================================================

    def verify_image_appears(self, image_name: str, timeout: float = 10.0, confidence: float = 0.8) -> bool:
        """Verify that an image appears on screen."""
        found, _, _ = self.waitForImageToAppear(image_name, timeout, confidence)
        return found

    def verify_screen_state(self, expected_state: str, timeout: float = 5.0) -> bool:
        """Verify screen state by looking for specific image."""
        found, _, _ = self.waitForImageToAppear(expected_state, timeout)
        return found

    def wait_and_verify(self, verification_type: str, target: str, timeout: float = 10.0, **kwargs) -> bool:
        """Generic wait and verify method."""
        try:
            if verification_type == 'image_appears':
                found, _, _ = self.waitForImageToAppear(target, timeout, **kwargs)
                return found
            elif verification_type == 'image_disappears':
                disappeared, _ = self.waitForImageToDisappear(target, timeout, **kwargs)
                return disappeared
            else:
                print(f"[@controller:ImageVerification] Unknown verification type: {verification_type}")
                return False
        except Exception as e:
            print(f"[@controller:ImageVerification] Error in wait_and_verify: {e}")
            return False

    def get_available_verifications(self) -> list:
        """Get list of available verification types."""
        return [
            {
                "type": "image_appears",
                "name": "Wait for Image to Appear",
                "description": "Wait for specific image to appear on screen",
                "parameters": ["image_path", "timeout", "confidence", "area"]
            },
            {
                "type": "image_disappears",
                "name": "Wait for Image to Disappear", 
                "description": "Wait for specific image to disappear from screen",
                "parameters": ["image_path", "timeout", "confidence", "area"]
            }
        ]

 
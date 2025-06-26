"""
Image Verification Controller Implementation

Modular image verification controller using  architecture for better maintainability.
"""

import os
import time
from typing import Dict, Any, Optional
from ..base_controller import VerificationControllerInterface
from .image_lib.image_crop import ImageCrop
from .image_lib.image_save import ImageSave
from .image_lib.image_processing import ImageProcessing
from .image_lib.image_matching import ImageMatching
from .image_lib.image_utils import ImageUtils


class ImageVerificationController(
    VerificationControllerInterface,
    ImageCrop,
    ImageSave,
    ImageProcessing,
    ImageMatching,
    ImageUtils
):
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
            "controller_type": "image"
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
            
            # Use the  method for core functionality
            found, location, screenshot_path = self._wait_for_image_to_appear(
                image_path, timeout, confidence, area
            )
            
            if found:
                print(f"[@controller:ImageVerification] Image found at location: {location}")
                
                # Save results if needed
                if model and screenshot_path:
                    # Save source image for comparison
                    source_path = self._save_source_image_for_comparison(
                        screenshot_path, model, verification_index
                    )
                    
                    # Save cropped version if area specified
                    if area:
                        cropped_path = self._save_cropped_source_image(
                            screenshot_path, area, model, verification_index
                        )
                
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
            
            # Use the  method for core functionality
            disappeared, screenshot_path = self._wait_for_image_to_disappear(
                image_path, timeout, confidence, area
            )
            
            if disappeared:
                print(f"[@controller:ImageVerification] Image disappeared!")
                
                # Save results if needed
                if model and screenshot_path:
                    source_path = self._save_source_image_for_comparison(
                        screenshot_path, model, verification_index
                    )
                
                return True, screenshot_path
            else:
                print(f"[@controller:ImageVerification] Image did not disappear within {timeout}s")
                return False, screenshot_path
                
        except Exception as e:
            print(f"[@controller:ImageVerification] Error in waitForImageToDisappear: {e}")
            return False, ""

    # Verification interface methods
    def verify_image_appears(self, image_name: str, timeout: float = 10.0, confidence: float = 0.8) -> bool:
        """Verify that an image appears on screen."""
        found, _, _ = self.waitForImageToAppear(image_name, timeout, confidence)
        return found

    def verify_element_exists(self, element_id: str, element_type: str = "any") -> bool:
        """Verify that an element exists (not implemented for image controller)."""
        return False

    def verify_audio_playing(self, min_level: float = 10.0, duration: float = 2.0) -> bool:
        """Verify that audio is playing (delegated to AV controller)."""
        if self.av_controller:
            return self.av_controller.verify_audio_playing(min_level, duration)
        return False

    def verify_video_playing(self, motion_threshold: float = 5.0, duration: float = 3.0) -> bool:
        """Verify that video is playing (delegated to AV controller)."""
        if self.av_controller:
            return self.av_controller.verify_video_playing(motion_threshold, duration)
        return False

    def verify_color_present(self, color: str, tolerance: float = 10.0) -> bool:
        """Verify that a color is present (not implemented for image controller)."""
        return False

    def verify_screen_state(self, expected_state: str, timeout: float = 5.0) -> bool:
        """Verify screen state by looking for specific image."""
        found, _, _ = self.waitForImageToAppear(expected_state, timeout)
        return found

    def verify_performance_metric(self, metric_name: str, expected_value: float, tolerance: float = 10.0) -> bool:
        """Verify performance metrics (not implemented for image controller)."""
        return False

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

    def execute_verification(self, verification_config: Dict[str, Any], source_path: str = None) -> Dict[str, Any]:
        """Execute a verification based on configuration."""
        try:
            verification_type = verification_config.get('type')
            
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

    def save_image_reference(self, image_path: str, reference_name: str, model: str, 
                            area: dict = None, confidence: float = 0.8) -> str:
        """Save an image reference for future verification use."""
        return self._save_image_reference(image_path, reference_name, model, area, confidence)

    def auto_detect_images(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Auto-detect images in a screenshot."""
        try:
            screenshot_path = request_data.get('screenshot_path')
            area = request_data.get('area')
            
            if not screenshot_path or not os.path.exists(screenshot_path):
                return {
                    'success': False,
                    'message': 'Invalid or missing screenshot path'
                }
            
            # Use  method to detect images
            detected_images = self._detect_images_in_area(screenshot_path, area)
            
            return {
                'success': True,
                'detected_images': detected_images,
                'screenshot_path': screenshot_path,
                'area': area
            }
            
        except Exception as e:
            print(f"[@controller:ImageVerification] Error in auto_detect_images: {e}")
            return {
                'success': False,
                'message': f'Image detection failed: {str(e)}'
            } 
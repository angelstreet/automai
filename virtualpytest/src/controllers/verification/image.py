"""
Image Verification Controller Implementation

Clean, modular controller that uses focused mixin classes for different responsibilities.
Maintains the same public API while organizing code into logical components.
"""

import os
import time
from typing import Dict, Any, Optional
from ..base_controller import VerificationControllerInterface
from .image.image_crop import ImageCropMixin
from .image.image_save import ImageSaveMixin
from .image.image_processing import ImageProcessingMixin
from .image.image_matching import ImageMatchingMixin
from .image.image_utils import ImageUtilsMixin


class ImageVerificationController(
    VerificationControllerInterface,
    ImageCropMixin,
    ImageSaveMixin,
    ImageProcessingMixin,
    ImageMatchingMixin,
    ImageUtilsMixin
):
    """Main Image Verification Controller with modular mixin architecture."""
    
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
            
        # Controller is always ready
        self.is_connected = True
        self.verification_session_id = f"image_verify_{int(time.time())}"
        
        print(f"[@controller:ImageVerification] Initialized with modular mixin architecture")
    
    # =============================================================================
    # Route Handler Methods (called from routes)
    # =============================================================================
    
    def crop_image_for_verification(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle image cropping from verification request."""
        try:
            # Extract data from request
            host = request_data.get('host', {})
            area = request_data.get('area', {})
            reference_name = request_data.get('reference_name', 'cropped_reference')
            
            # Resolve source path
            source_path = self._resolve_source_path(request_data)
            
            # Build target path
            captures_path = self._get_captures_path(host)
            filename = self._get_unique_filename(reference_name)
            target_path = os.path.join(captures_path, filename)
            
            # Crop the image
            success = self._crop_reference_image(source_path, target_path, area)
            
            if success:
                # Build URL for access
                cropped_url = self._build_cropped_image_url(host, filename)
                
                return {
                    'success': True,
                    'cropped_path': target_path,
                    'cropped_url': cropped_url,
                    'area': area,
                    'reference_name': reference_name
                }
            else:
                return {
                    'success': False,
                    'error': 'Failed to crop image'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Cropping error: {str(e)}'
            }
    
    def process_image_for_verification(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle image processing from verification request."""
        try:
            # Extract data from request
            source_path = self._resolve_source_path(request_data)
            autocrop = request_data.get('autocrop', False)
            remove_background = request_data.get('remove_background', False)
            image_filter = request_data.get('image_filter', 'none')
            
            # Create working copy
            import shutil
            import tempfile
            with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
                temp_path = tmp.name
            shutil.copy2(source_path, temp_path)
            
            # Apply processing
            processed_area = self._process_reference_image(
                temp_path, 
                autocrop=autocrop, 
                remove_background=remove_background
            )
            
            # Apply filter
            filter_success = self._apply_image_filter(temp_path, image_filter)
            
            return {
                'success': True,
                'processed_path': temp_path,
                'processed_area': processed_area,
                'filter_applied': filter_success,
                'operations': {
                    'autocrop': autocrop,
                    'remove_background': remove_background,
                    'filter': image_filter
                }
            }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Processing error: {str(e)}'
            }
    
    def save_image_reference(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Save image reference from verification request, upload to R2 and save to database."""
        try:
            # Extract data from request
            host = request_data.get('host', {})
            reference_name = request_data.get('reference_name', 'image_reference')
            area = request_data.get('area', {})
            device_id = request_data.get('device_id')
            
            # Resolve source path
            source_path = self._resolve_source_path(request_data)
            
            # Build target path
            captures_path = self._get_captures_path(host)
            filename = self._get_unique_filename(reference_name)
            target_path = os.path.join(captures_path, filename)
            
            # Save the image
            success = self._copy_reference_with_filtered_versions(source_path, target_path)
            
            if success:
                # Upload to R2 (if configured)
                r2_url = self._upload_to_r2(target_path, filename)
                
                # Save to database
                db_result = self._save_to_database(
                    device_id=device_id,
                    reference_name=reference_name,
                    file_path=target_path,
                    r2_url=r2_url,
                    area=area,
                    host=host
                )
                
                # Build local URL for access
                local_url = self._build_cropped_image_url(host, filename)
                
                return {
                    'success': True,
                    'saved_path': target_path,
                    'local_url': local_url,
                    'r2_url': r2_url,
                    'database_saved': db_result,
                    'reference_name': reference_name,
                    'area': area
                }
            else:
                return {
                    'success': False,
                    'error': 'Failed to save image reference'
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Save error: {str(e)}'
            }
    
    # =============================================================================
    # Core Verification Methods
    # =============================================================================
    
    def wait_for_image_to_appear(self, reference_path: str, area: Dict[str, Any], 
                                timeout: float = 10.0, threshold: float = 0.8) -> bool:
        """Wait for an image to appear in a specific area."""
        return self._wait_for_image_to_appear(reference_path, area, timeout, threshold)
    
    def wait_for_image_to_disappear(self, reference_path: str, area: Dict[str, Any],
                                  timeout: float = 10.0, threshold: float = 0.8) -> bool:
        """Wait for an image to disappear from a specific area."""
        return self._wait_for_image_to_disappear(reference_path, area, timeout, threshold)
    
    def match_template_in_area(self, source_path: str, template_path: str, 
                              area: Dict[str, Any], threshold: float = 0.8) -> Dict[str, Any]:
        """Match a template image within a specific area."""
        return self._match_template_in_area(source_path, template_path, area, threshold)
    
    # =============================================================================
    # Public API Methods (backward compatibility)
    # =============================================================================
    
    def crop_image(self, source_path: str, target_path: str, area: Dict[str, Any], 
                   create_filtered_versions: bool = True) -> bool:
        """Crop an image to a specific area."""
        print(f"[@controller:ImageVerification] Cropping image: {source_path} -> {target_path}")
        return self._crop_reference_image(source_path, target_path, area, create_filtered_versions)
    
    def auto_crop_image(self, image_path: str) -> Optional[Dict[str, int]]:
        """Automatically detect and crop content area of an image."""
        print(f"[@controller:ImageVerification] Auto-cropping image: {image_path}")
        return self._auto_crop_image(image_path)
    
    def apply_filter(self, image_path: str, filter_type: str) -> bool:
        """Apply image filter to an image."""
        print(f"[@controller:ImageVerification] Applying {filter_type} filter to: {image_path}")
        return self._apply_image_filter(image_path, filter_type)

    def remove_background(self, image_path: str) -> bool:
        """Remove background from an image."""
        print(f"[@controller:ImageVerification] Removing background from: {image_path}")
        try:
            self._remove_background(image_path)
            return True
        except Exception as e:
            print(f"[@controller:ImageVerification] Background removal failed: {e}")
            return False

    # =============================================================================
    # Base Interface Implementation
    # =============================================================================
    
    def connect(self) -> bool:
        """Connect to verification service (always ready)."""
        self.is_connected = True
        return True
    
    def disconnect(self) -> bool:
        """Disconnect from verification service."""
        self.is_connected = False
        return True
    
    def execute_verification(self, verification_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute image verification based on configuration.
        
        Args:
            verification_config: Configuration for verification
            
        Returns:
            Dict with verification results
        """
        try:
            verification_type = verification_config.get('type', 'appear')
            reference_path = verification_config.get('reference_path')
            area = verification_config.get('area', {})
            timeout = verification_config.get('timeout', 10.0)
            threshold = verification_config.get('threshold', 0.8)
            
            if not reference_path:
                return {
                    'success': False,
                    'error': 'No reference path specified'
                }
            
            if verification_type == 'appear':
                result = self.wait_for_image_to_appear(reference_path, area, timeout, threshold)
            elif verification_type == 'disappear':
                result = self.wait_for_image_to_disappear(reference_path, area, timeout, threshold)
            else:
                return {
                    'success': False,
                    'error': f'Unknown verification type: {verification_type}'
                }
            
            return {
                'success': result,
                'verification_type': verification_type,
                'reference_path': reference_path,
                'area': area,
                'timeout': timeout,
                'threshold': threshold
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f'Verification execution error: {str(e)}'
            }
    
    def get_status(self) -> Dict[str, Any]:
        """Get controller status."""
        return {
            'controller_type': self.controller_type,
            'controller_name': self.controller_name,
            'is_connected': self.is_connected,
            'verification_session_id': self.verification_session_id,
            'av_controller_status': 'connected' if self.av_controller else 'not_available',
            'mixins_loaded': [
                'ImageCropMixin',
                'ImageSaveMixin',
                'ImageProcessingMixin', 
                'ImageMatchingMixin',
                'ImageUtilsMixin'
            ]
        } 
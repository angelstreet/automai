"""
Text Verification Controller

Clean text controller that uses helpers for all operations.
Provides route interfaces and core domain logic.
"""

import time
import os
from typing import Dict, Any, Optional, Tuple, List
from .text_helpers import TextHelpers


class TextVerificationController:
    """Pure text verification controller that uses OCR to detect text on screen."""
    
    def __init__(self, av_controller, **kwargs):
        """
        Initialize the Text Verification controller.
        
        Args:
            av_controller: AV controller for capturing images (dependency injection)
        """
        # Dependency injection
        self.av_controller = av_controller
        
        # Use AV controller's capture path with captures subdirectory
        self.captures_path = os.path.join(av_controller.video_capture_path, 'captures')
        
        # Set verification type for controller lookup
        self.verification_type = 'text'

        print(f"[@controller:TextVerification] Initialized with captures path: {self.captures_path}")
        
        # Controller is always ready
        self.is_connected = True

    def get_status(self) -> Dict[str, Any]:
        """Get the current status of the text verification controller."""
        return {
            "connected": self.is_connected,
            "av_controller": self.av_controller.device_name if self.av_controller else None,
            "controller_type": "text",
            "captures_path": self.captures_path
        }

    def waitForTextToAppear(self, text: str, timeout: float = 10.0, area: dict = None) -> tuple:
        """
        Wait for specific text to appear on screen within a timeout period.
        
        Args:
            text: Text to search for
            timeout: Maximum time to wait in seconds
            area: Optional area to search within {x, y, width, height}
            
        Returns:
            tuple: (found, extracted_info, screenshot_path)
        """
        try:
            helpers = TextHelpers(self.captures_path)
            start_time = time.time()
            
            while time.time() - start_time < timeout:
                # Take screenshot using correct method
                screenshot_path = self.av_controller.take_screenshot()
                if not screenshot_path or not os.path.exists(screenshot_path):
                    time.sleep(0.5)
                    continue
                
                # Detect text in area with filtering
                result = helpers.detect_text_in_area(screenshot_path, area)
                extracted_text = result.get('extracted_text', '')
                
                # Check if target text appears
                if helpers.text_matches(extracted_text, text):
                    elapsed_time = time.time() - start_time
                    return True, {
                        'extracted_text': extracted_text,
                        'target_text': text,
                        'elapsed_time': elapsed_time,
                        'area': area
                    }, screenshot_path
                
                time.sleep(0.5)
            
            return False, None, ""
                
        except Exception as e:
            print(f"[@text_controller] Error in waitForTextToAppear: {e}")
            return False, None, ""

    def waitForTextToDisappear(self, text: str, timeout: float = 10.0, area: dict = None) -> tuple:
        """
        Wait for specific text to disappear from screen within a timeout period.
        
        Args:
            text: Text to search for
            timeout: Maximum time to wait in seconds  
            area: Optional area to search within {x, y, width, height}
            
        Returns:
            tuple: (disappeared, screenshot_path)
        """
        try:
            helpers = TextHelpers(self.captures_path)
            start_time = time.time()
            
            while time.time() - start_time < timeout:
                # Take screenshot using correct method
                screenshot_path = self.av_controller.take_screenshot()
                if not screenshot_path or not os.path.exists(screenshot_path):
                    time.sleep(0.5)
                    continue
                
                # Detect text in area with filtering
                result = helpers.detect_text_in_area(screenshot_path, area)
                extracted_text = result.get('extracted_text', '')
                
                # Check if target text is no longer present
                if not helpers.text_matches(extracted_text, text):
                    elapsed_time = time.time() - start_time
                    return True, screenshot_path
                
                time.sleep(0.5)
            
            return False, ""
                
        except Exception as e:
            print(f"[@text_controller] Error in waitForTextToDisappear: {e}")
            return False, ""



    def detect_text(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Route interface for text detection."""
        try:
            helpers = TextHelpers(self.captures_path)
            
            # Get source filename from frontend
            source_filename = data.get('source_filename', '')
            area = data.get('area')
            
            if not source_filename:
                return {'success': False, 'message': 'source_filename is required'}
            
            # Build full path for local files, keep URLs as-is
            if source_filename.startswith(('http://', 'https://')):
                # URL case - pass to helpers for downloading
                local_image_path = helpers.download_image(source_filename)
            else:
                # Local filename case - build full path directly
                local_image_path = os.path.join(self.captures_path, source_filename)
                
                if not os.path.exists(local_image_path):
                    return {'success': False, 'message': f'Local file not found: {local_image_path}'}
            
            # Detect text in area (includes crop, filter, OCR, language detection)
            result = helpers.detect_text_in_area(local_image_path, area)
            
            if not result.get('extracted_text'):
                return {'success': False, 'message': 'No text detected in image', **result}
            
            return {
                'success': True,
                'source_was_url': source_filename.startswith(('http://', 'https://')),
                'local_image_path': local_image_path,
                **result
            }
            
        except Exception as e:
            return {'success': False, 'message': f'Text detection failed: {str(e)}'}
    
    def save_text(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Route interface for saving text references."""
        try:
            helpers = TextHelpers(self.captures_path)
            
            text = data.get('text', '')
            reference_name = data.get('reference_name', 'text_reference')
            area = data.get('area')
            
            if not text:
                return {'success': False, 'message': 'text is required for saving reference'}
            
            saved_path = helpers.save_text_reference(text, reference_name, area)
            
            return {
                'success': bool(saved_path),
                'message': 'Text reference saved successfully' if saved_path else 'Failed to save text reference',
                'saved_path': saved_path
            }
            
        except Exception as e:
            return {'success': False, 'message': f'Text save failed: {str(e)}'}
    
    def execute_verification(self, verification_config: Dict[str, Any]) -> Dict[str, Any]:
        """Route interface for executing verification."""
        try:
            verification_type = verification_config.get('type', 'text_detection')
            
            if verification_type == 'text_detection':
                return self.detect_text({
                    'source_filename': verification_config.get('source_filename', ''),
                    'area': verification_config.get('area')
                })
            else:
                return {'success': False, 'message': f'Unsupported verification type: {verification_type}'}
                
        except Exception as e:
            return {'success': False, 'message': f'Verification execution failed: {str(e)}'} 
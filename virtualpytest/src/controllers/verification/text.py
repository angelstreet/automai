"""
Text Verification Controller

Clean text controller that uses helpers for all operations.
Provides route interfaces and core domain logic.
"""

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
        Check if specific text appears on screen immediately.
        
        Args:
            text: Text to search for
            timeout: Ignored - verification happens immediately
            area: Optional area to search within {x, y, width, height}
            
        Returns:
            tuple: (found, extracted_info, screenshot_path)
        """
        try:
            print(f"[@text_controller] Searching for text: {text}")
            helpers = TextHelpers(self.captures_path)
            
            # Take screenshot
            screenshot_path = self.av_controller.take_screenshot()
            if not screenshot_path or not os.path.exists(screenshot_path):
                print(f"[@text_controller] Failed to take screenshot")
                return False, None, ""
            
            # Detect text in area with filtering
            result = helpers.detect_text_in_area(screenshot_path, area)
            extracted_text = result.get('extracted_text', '')
            
            # Check if target text appears
            if helpers.text_matches(extracted_text, text):
                print(f"[@text_controller] Text found in current screenshot")
                return True, {
                    'extracted_text': extracted_text,
                    'target_text': text,
                    'elapsed_time': 0.0,
                    'area': area
                }, screenshot_path
            else:
                print(f"[@text_controller] Text not found in current screenshot")
                return False, None, screenshot_path
                
        except Exception as e:
            print(f"[@text_controller] Error in waitForTextToAppear: {e}")
            return False, None, ""

    def waitForTextToDisappear(self, text: str, timeout: float = 10.0, area: dict = None) -> tuple:
        """
        Check if specific text has disappeared from screen immediately.
        
        Args:
            text: Text to search for
            timeout: Ignored - verification happens immediately
            area: Optional area to search within {x, y, width, height}
            
        Returns:
            tuple: (disappeared, screenshot_path)
        """
        try:
            print(f"[@text_controller] Checking if text disappeared: {text}")
            helpers = TextHelpers(self.captures_path)
            
            # Take screenshot
            screenshot_path = self.av_controller.take_screenshot()
            if not screenshot_path or not os.path.exists(screenshot_path):
                print(f"[@text_controller] Failed to take screenshot")
                return False, ""
            
            # Detect text in area with filtering
            result = helpers.detect_text_in_area(screenshot_path, area)
            extracted_text = result.get('extracted_text', '')
            
            # Check if target text is no longer present
            if not helpers.text_matches(extracted_text, text):
                print(f"[@text_controller] Text has disappeared from current screenshot")
                return True, screenshot_path
            else:
                print(f"[@text_controller] Text still present in current screenshot")
                return False, screenshot_path
                
        except Exception as e:
            print(f"[@text_controller] Error in waitForTextToDisappear: {e}")
            return False, ""

    def detect_text(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Route interface for text detection."""
        try:
            helpers = TextHelpers(self.captures_path)
            
            # Get source filename from frontend
            image_source_url = data.get('image_source_url', '')
            area = data.get('area')
            
            if not image_source_url:
                return {'success': False, 'message': 'image_source_url is required'}
            
            # Build full path for local files, keep URLs as-is
            if image_source_url.startswith(('http://', 'https://')):
                # URL case - pass to helpers for downloading
                image_source_path = helpers.download_image(image_source_url)
            else:
                # Local filename case - build full path directly
                image_source_path = os.path.join(self.captures_path, image_source_url)
                
                if not os.path.exists(image_source_path):
                    return {'success': False, 'message': f'Local file not found: {image_source_path}'}
            
            # Detect text in area (includes crop, filter, OCR, language detection)
            result = helpers.detect_text_in_area(image_source_path, area)
            
            if not result.get('extracted_text'):
                return {'success': False, 'message': 'No text detected in image', **result}
            
            return {
                'success': True,
                'source_was_url': image_source_url.startswith(('http://', 'https://')),
                'image_source_path': image_source_path,
                **result
            }
            
        except Exception as e:
            return {'success': False, 'message': f'Text detection failed: {str(e)}'}
    
    def save_text(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Route interface for saving text references."""
        try:
            text = data.get('text', '')
            reference_name = data.get('reference_name', 'text_reference')
            area = data.get('area')
            image_textdetected_path = data.get('image_textdetected_path', '')
            
            if not text:
                return {'success': False, 'message': 'text is required for saving reference'}
            
            if not image_textdetected_path or not os.path.exists(image_textdetected_path):
                return {'success': False, 'message': 'text detected image not found'}
            
            # Save text reference locally (for local file backup)
            helpers = TextHelpers(self.captures_path)
            saved_path = helpers.save_text_reference(text, reference_name, area)
            
            # Return data needed for server step database save
            return {
                'success': bool(saved_path),
                'message': 'Text reference saved successfully' if saved_path else 'Failed to save text reference',
                'saved_path': saved_path,
                'image_textdetected_path': image_textdetected_path,
                # Data for server step
                'reference_name': reference_name,
                'area': area,
                'text_data': {
                    'text': text,
                    'font_size': 12.0,  # Default font size
                    'confidence': 0.8   # Default confidence
                }
            }
            
        except Exception as e:
            return {'success': False, 'message': f'Text save failed: {str(e)}'}
    
    def execute_verification(self, verification_config: Dict[str, Any]) -> Dict[str, Any]:
        """Route interface for executing verification."""
        try:
            command = verification_config.get('command', 'WaitForTextToAppear')
            
            if command == 'WaitForTextToAppear':
                text = verification_config.get('text', '')
                timeout = verification_config.get('timeout', 10.0)
                area = verification_config.get('area')
                
                found, extracted_info, screenshot_path = self.waitForTextToAppear(
                    text, timeout, area
                )
                
                return {
                    'success': found,
                    'command': command,
                    'text': text,
                    'screenshot_path': screenshot_path,
                    'extracted_info': extracted_info,
                    'message': f"Text {'found' if found else 'not found'}"
                }
                
            elif command == 'WaitForTextToDisappear':
                text = verification_config.get('text', '')
                timeout = verification_config.get('timeout', 10.0)
                area = verification_config.get('area')
                
                disappeared, screenshot_path = self.waitForTextToDisappear(
                    text, timeout, area
                )
                
                return {
                    'success': disappeared,
                    'command': command,
                    'text': text,
                    'screenshot_path': screenshot_path,
                    'message': f"Text {'disappeared' if disappeared else 'did not disappear'}"
                }
                
            else:
                return {'success': False, 'message': f'Unsupported verification command: {command}'}
                
        except Exception as e:
            return {'success': False, 'message': f'Verification execution failed: {str(e)}'}

    def get_available_verifications(self) -> list:
        """Get list of available verification types."""
        return [
            {
                "command": "WaitForTextToAppear",
                "params": {
                    "text": "",             # Empty string for user input
                    "timeout": 0,           # Default: single check, no polling
                    "area": None            # Optional area
                },
                "verification_type": "text"
            },
            {
                "command": "WaitForTextToDisappear",
                "params": {
                    "text": "",             # Empty string for user input
                    "timeout": 0,           # Default: single check, no polling
                    "area": None            # Optional area
                },
                "verification_type": "text"
            }
        ] 
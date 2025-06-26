"""
Reusable Text Utilities

Handles URL building, downloading, and orchestrates text operations.
Can be used by routes, standalone scripts, or other services.
"""

import os
import time
import requests
import tempfile
from typing import Dict, Any, Optional
from .build_url_utils import buildHostImageUrl


class TextUtils:
    def __init__(self, host_dict: Dict[str, Any], device_id: str, text_controller):
        """
        Initialize with host context and text controller.
        
        Args:
            host_dict: Host dictionary from payload or host.to_dict()
            device_id: Device ID 
            text_controller: Pure text processing controller
        """
        self.host = host_dict
        self.device_id = device_id
        self.controller = text_controller
    
    def download_image_if_url(self, source_path: str) -> str:
        """
        Download image if it's a URL, otherwise return path as-is.
        
        Args:
            source_path: Local path or HTTP URL
            
        Returns:
            str: Local file path
        """
        if not source_path.startswith('http'):
            return source_path
        
        try:
            response = requests.get(source_path, timeout=30)
            response.raise_for_status()
            
            # Create temp file with proper extension
            extension = '.png'
            if source_path.lower().endswith(('.jpg', '.jpeg')):
                extension = '.jpg'
            
            with tempfile.NamedTemporaryFile(delete=False, suffix=extension) as tmp:
                tmp.write(response.content)
                temp_path = tmp.name
            
            print(f"[@text_utils] Downloaded: {source_path} -> {temp_path}")
            return temp_path
            
        except Exception as e:
            raise Exception(f"Failed to download image from {source_path}: {e}")
    
    def detect_text(self, image_path: str, area: Optional[Dict[str, Any]] = None,
                   enhance_image: bool = False, apply_filters: bool = False) -> Dict[str, Any]:
        """
        Complete text detection with URL handling.
        
        Args:
            image_path: Source image path or URL
            area: Optional area to crop for text detection
            enhance_image: Whether to enhance image for better OCR
            apply_filters: Whether to apply filters
            
        Returns:
            Dict with success, extracted_text, temp_image_url
        """
        try:
            # Download if URL
            local_source = self.download_image_if_url(image_path)
            
            # Controller does pure text detection
            result = self.controller.detect_text_from_file(
                local_source, area, enhance_image, apply_filters
            )
            
            # Build public URL for temp image if created
            if result.get('temp_image_path'):
                result['temp_image_url'] = buildHostImageUrl(self.host, result['temp_image_path'])
            
            # Clean up temp file if we downloaded it
            if local_source != image_path and local_source.startswith('/tmp/'):
                try:
                    os.unlink(local_source)
                except:
                    pass
            
            return result
            
        except Exception as e:
            return {"success": False, "error": str(e)}


def create_text_utils(host_dict: Dict[str, Any], device_id: str, text_controller) -> TextUtils:
    """
    Factory function for creating TextUtils instance.
    Useful for standalone scripts.
    """
    return TextUtils(host_dict, device_id, text_controller) 
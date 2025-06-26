"""
Reusable Image Utilities

Handles URL building, downloading, and orchestrates image operations.
Can be used by routes, standalone scripts, or other services.
"""

import os
import time
import requests
import tempfile
from typing import Dict, Any, Optional
from .build_url_utils import buildHostImageUrl, buildCroppedImageUrl


class ImageUtils:
    def __init__(self, host_dict: Dict[str, Any], device_id: str, image_controller):
        """
        Initialize with host context and image controller.
        
        Args:
            host_dict: Host dictionary from payload or host.to_dict()
            device_id: Device ID 
            image_controller: Pure image processing controller
        """
        self.host = host_dict
        self.device_id = device_id
        self.controller = image_controller
    
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
            
            print(f"[@image_utils] Downloaded: {source_path} -> {temp_path}")
            return temp_path
            
        except Exception as e:
            raise Exception(f"Failed to download image from {source_path}: {e}")
    
    def crop_image(self, source_path: str, area: Dict[str, Any], 
                   reference_name: str = "cropped_image") -> Dict[str, Any]:
        """
        Complete crop operation with URL handling and URL building.
        
        Args:
            source_path: Source image path or URL
            area: Crop area {x, y, width, height}
            reference_name: Base name for output file
            
        Returns:
            Dict with success, local_path, public_url
        """
        try:
            # Download if URL
            local_source = self.download_image_if_url(source_path)
            
            # Generate unique filename
            filename = f"{reference_name}_{int(time.time())}.png"
            
            # Controller does pure image work
            output_path = self.controller.crop_image_file(local_source, area, filename)
            
            if not output_path:
                return {"success": False, "error": "Crop operation failed"}
            
            # Build public URL using existing utils
            public_url = buildHostImageUrl(self.host, output_path)
            
            # Clean up temp file if we downloaded it
            if local_source != source_path and local_source.startswith('/tmp/'):
                try:
                    os.unlink(local_source)
                except:
                    pass
            
            return {
                "success": True,
                "local_path": output_path,
                "public_url": public_url,
                "filename": filename,
                "area": area
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def process_image(self, source_path: str, autocrop: bool = False,
                     remove_background: bool = False, 
                     image_filter: str = 'none') -> Dict[str, Any]:
        """
        Complete image processing with URL handling.
        """
        try:
            # Download if URL
            local_source = self.download_image_if_url(source_path)
            
            # Controller does pure processing
            processed_path = self.controller.process_image_file(
                local_source, remove_background, image_filter
            )
            
            # Build public URL
            public_url = buildHostImageUrl(self.host, processed_path)
            
            # Clean up temp file if we downloaded it
            if local_source != source_path and local_source.startswith('/tmp/'):
                try:
                    os.unlink(local_source)
                except:
                    pass
            
            return {
                "success": True,
                "local_path": processed_path,
                "public_url": public_url,
                "operations": {
                    "autocrop": autocrop,
                    "remove_background": remove_background,
                    "filter": image_filter
                }
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def save_image(self, source_path: str, reference_name: str = "image_reference",
                   area: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Complete save operation with URL handling.
        """
        try:
            # Download if URL
            local_source = self.download_image_if_url(source_path)
            
            # Generate unique filename
            filename = f"{reference_name}_{int(time.time())}.png"
            
            # Controller does pure saving
            output_path = self.controller.save_image_file(local_source, filename)
            
            if not output_path:
                return {"success": False, "error": "Save operation failed"}
            
            # Build public URL
            public_url = buildHostImageUrl(self.host, output_path)
            
            # Clean up temp file if we downloaded it
            if local_source != source_path and local_source.startswith('/tmp/'):
                try:
                    os.unlink(local_source)
                except:
                    pass
            
            return {
                "success": True,
                "local_path": output_path,
                "public_url": public_url,
                "filename": filename,
                "reference_name": reference_name,
                "area": area
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}


def create_image_utils(host_dict: Dict[str, Any], device_id: str, image_controller) -> ImageUtils:
    """
    Factory function for creating ImageUtils instance.
    Useful for standalone scripts.
    """
    return ImageUtils(host_dict, device_id, image_controller) 
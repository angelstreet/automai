"""
Image Verification Utilities 

Provides shared utilities for path handling, validation, and common operations.
"""

import os
import time
from pathlib import Path
from typing import Dict, Any, Optional


class ImageUtils:
    """ providing utility functions for image verification operations."""
    
    def _get_captures_path(self, host: Dict[str, Any]) -> str:
        """Get the captures directory path for a host."""
        return os.path.join(
            os.getcwd(), 
            "virtualpytest", 
            "captures", 
            host.get('friendly_name', 'unknown_host')
        )
    
    def _resolve_source_path(self, request_data: Dict[str, Any]) -> str:
        """Resolve the source image path from request data."""
        host = request_data.get('host', {})
        
        if request_data.get('source') == 'last_capture':
            captures_path = self._get_captures_path(host)
            capture_files = [f for f in os.listdir(captures_path) if f.endswith('.png')]
            if not capture_files:
                raise FileNotFoundError("No capture files found")
            
            latest_file = max(capture_files, key=lambda f: os.path.getctime(os.path.join(captures_path, f)))
            return os.path.join(captures_path, latest_file)
        
        elif request_data.get('source_path'):
            return request_data['source_path']
        
        else:
            raise ValueError("No valid source specified")
    
    def _build_cropped_image_url(self, host: Dict[str, Any], filename: str) -> str:
        """Build URL for accessing cropped images."""
        host_instance = self._get_host_instance(host)
        return f"http://{host_instance}/captures/{filename}"
    
    def _get_host_instance(self, host: Dict[str, Any]) -> str:
        """Get host instance string for URL building."""
        return f"{host.get('host', 'localhost')}:{host.get('port', 8000)}"
    
    def _ensure_directory_exists(self, directory_path: str) -> None:
        """Ensure directory exists, create if needed."""
        os.makedirs(directory_path, exist_ok=True)
    
    def _get_unique_filename(self, base_name: str, extension: str = '.png') -> str:
        """Generate unique filename with timestamp."""
        timestamp = int(time.time() * 1000)
        return f"{base_name}_{timestamp}{extension}"
    
    def _validate_area(self, area: Dict[str, Any]) -> bool:
        """Validate that area contains required coordinates."""
        required_keys = ['x', 'y', 'width', 'height']
        return all(key in area and isinstance(area[key], (int, float)) for key in required_keys) 
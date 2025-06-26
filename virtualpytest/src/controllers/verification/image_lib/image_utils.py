"""
Image Verification Utilities 

Provides shared utilities for image validation and common operations.
Domain-specific utilities only - no URL building or path resolution.
"""

import os
import time
from pathlib import Path
from typing import Dict, Any, Optional


class ImageUtils:
    """Providing utility functions for image verification operations."""
    
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
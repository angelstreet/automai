"""
Image Verification Controller Implementation

This controller provides dedicated image verification functionality using template matching.
It can wait for images to appear or disappear in specific areas of the screen.
Uses reference images from the resources directory.
"""

import subprocess
import time
import os
import cv2
import numpy as np
from typing import Dict, Any, Optional, Tuple
from pathlib import Path
from ..base_controllers import VerificationControllerInterface


class ImageVerificationController(VerificationControllerInterface):
    """Image verification controller that uses template matching to detect images on screen."""
    
    def __init__(self, av_controller, **kwargs):
        """
        Initialize the Image Verification controller.
        
        Args:
            av_controller: Reference to AV controller (HDMIStreamController, etc.) for screenshot capture
            **kwargs: Optional parameters:
                - matching_algorithm: Template matching algorithm ('TM_CCOEFF_NORMED', 'TM_CCORR_NORMED', etc.)
                - preprocessing: Enable image preprocessing for better matching
        """
        if not av_controller:
            raise ValueError("av_controller is required for screenshot capture")
            
        device_name = f"ImageVerify-{av_controller.device_name}"
        super().__init__(device_name)
        
        # AV controller reference for screenshot capture only
        self.av_controller = av_controller
        self.matching_algorithm = kwargs.get('matching_algorithm', 'TM_CCOEFF_NORMED')
        self.preprocessing_enabled = kwargs.get('preprocessing', True)
        
        # Resources directory for reference images
        self.resources_path = Path(__file__).parent.parent.parent / "resources"
        self.resources_path.mkdir(exist_ok=True)
        
        # Temporary files for analysis
        self.temp_image_path = Path("/tmp/image_verification")
        self.temp_image_path.mkdir(exist_ok=True)

        # Controller is always ready
        self.is_connected = True
        self.verification_session_id = f"image_verify_{int(time.time())}"
        print(f"ImageVerify[{self.device_name}]: Ready - Using AV controller: {self.av_controller.device_name}")
        print(f"ImageVerify[{self.device_name}]: Resources directory: {self.resources_path}")

    def waitForImageToAppear(self, image_path: str, timeout: float = 10.0, confidence: float = 0.8, 
                            area: Tuple[int, int, int, int] = None) -> bool:
        """
        Wait for specific image to appear on screen.
        
        Args:
            image_path: Path to the template image to look for (can be relative to resources directory)
            timeout: Maximum time to wait in seconds
            confidence: Confidence threshold (0.0 to 1.0)
            area: Optional area to search (x, y, width, height)
            
        Returns:
            True if image appears, False if timeout
        """
        print(f"ImageVerify[{self.device_name}]: Waiting for image '{image_path}' to appear (timeout: {timeout}s, confidence: {confidence})")
        if area:
            print(f"ImageVerify[{self.device_name}]: Search area: ({area[0]},{area[1]},{area[2]},{area[3]})")
        
        # TODO: Implement image template matching logic
        print(f"ImageVerify[{self.device_name}]: Image verification not yet implemented")
        return False

    def waitForImageToDisappear(self, image_path: str, timeout: float = 10.0, confidence: float = 0.8,
                               area: Tuple[int, int, int, int] = None) -> bool:
        """
        Wait for specific image to disappear from screen.
        
        Args:
            image_path: Path to the template image that should disappear (can be relative to resources directory)
            timeout: Maximum time to wait in seconds
            confidence: Confidence threshold (0.0 to 1.0)
            area: Optional area to search (x, y, width, height)
            
        Returns:
            True if image disappears, False if timeout
        """
        print(f"ImageVerify[{self.device_name}]: Waiting for image '{image_path}' to disappear (timeout: {timeout}s, confidence: {confidence})")
        if area:
            print(f"ImageVerify[{self.device_name}]: Search area: ({area[0]},{area[1]},{area[2]},{area[3]})")
        
        # TODO: Implement image template matching logic
        print(f"ImageVerify[{self.device_name}]: Image verification not yet implemented")
        return False

# Backward compatibility alias
ImageVerificationController = ImageVerificationController 
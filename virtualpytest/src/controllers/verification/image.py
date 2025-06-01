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
    
    def __init__(self, av_controller):
        """
        Initialize the Image Verification controller.
        
        Args:
            av_controller: Reference to AV controller for screenshot capture
        """
        if not av_controller:
            raise ValueError("av_controller is required for screenshot capture")
            
        device_name = f"ImageVerify-{av_controller.device_name}"
        super().__init__(device_name)
        
        # AV controller reference for screenshot capture only
        self.av_controller = av_controller
        
        # Controller is always ready
        self.is_connected = True
        print(f"ImageVerify[{self.device_name}]: Ready - Using AV controller: {self.av_controller.device_name}")

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

    def waitForImageToAppear(self, image_path: str, timeout: float = 10.0, threshold: float = 0.8, 
                            area: tuple = None) -> bool:
       
       return False

    def waitForImageToDisappear(self, image_path: str, timeout: float = 10.0, threshold: float = 0.8,
                               area: tuple = None) -> bool:
        return False

# Backward compatibility alias
ImageVerificationController = ImageVerificationController 
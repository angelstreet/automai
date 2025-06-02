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
import requests
from typing import Dict, Any, Optional, Tuple, List
from pathlib import Path
from ..base_controllers import VerificationControllerInterface


def crop_reference_image(source_path, target_path, area):
    """
    Crop a reference image from a source image and save it.
    
    Args:
        source_path (str): Path to the source image
        target_path (str): Path where the cropped image will be saved
        area (dict): Area to crop {x, y, width, height}
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Read source image
        img = cv2.imread(source_path)
        if img is None:
            print(f"Error: Could not read source image: {source_path}")
            return False
            
        # Extract area coordinates
        x = int(area['x'])
        y = int(area['y'])
        width = int(area['width'])
        height = int(area['height'])
        
        # Ensure coordinates are within image bounds
        img_height, img_width = img.shape[:2]
        x = max(0, min(x, img_width - 1))
        y = max(0, min(y, img_height - 1))
        width = min(width, img_width - x)
        height = min(height, img_height - y)
        
        # Crop image
        cropped_img = img[y:y+height, x:x+width]
        
        # Create target directory if it doesn't exist
        os.makedirs(os.path.dirname(target_path), exist_ok=True)
        
        # Save cropped image
        result = cv2.imwrite(target_path, cropped_img)
        
        if result:
            print(f"Reference image saved successfully: {target_path}")
            return True
        else:
            print(f"Failed to save reference image: {target_path}")
            return False
            
    except Exception as e:
        print(f"Error cropping reference image: {str(e)}")
        return False


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

    def waitForImageToAppear(self, image_path: str, timeout: float = 1.0, threshold: float = 0.8, 
                            area: tuple = None, image_list: List[str] = None) -> Tuple[bool, str]:
        """
        Wait for image to appear either in provided image list or by capturing new frames.
        
        Args:
            image_path: Path to reference image
            timeout: Timeout for capture if no image_list provided
            threshold: Match threshold (0.0 to 1.0)
            area: Optional area to search (x, y, width, height)
            image_list: Optional list of source image paths to search
            
        Returns:
            Tuple of (success, message)
        """
        print(f"[@controller:ImageVerification] Looking for image: {image_path}")
        
        # Load reference image
        if not os.path.exists(image_path):
            return False, f"Reference image not found: {image_path}"
        
        ref_img = cv2.imread(image_path, cv2.IMREAD_COLOR)
        if ref_img is None:
            return False, f"Could not load reference image: {image_path}"
        
        if image_list:
            # Search in provided images
            print(f"[@controller:ImageVerification] Searching in {len(image_list)} provided images")
            max_confidence = 0.0
            
            for source_path in image_list:
                if not os.path.exists(source_path):
                    continue
                    
                source_img = cv2.imread(source_path, cv2.IMREAD_COLOR)
                if source_img is None:
                    continue
                
                confidence = self._match_template(ref_img, source_img, area)
                max_confidence = max(max_confidence, confidence)
                
                if confidence >= threshold:
                    print(f"[@controller:ImageVerification] Match found in {source_path} with confidence {confidence:.3f}")
                    return True, f"Image found with confidence {confidence:.3f}"
            
            return False, f"Image not found. Max confidence: {max_confidence:.3f}"
        
        else:
            # Use capture system
            print(f"[@controller:ImageVerification] Starting capture for {timeout}s")
            return self._capture_and_search(ref_img, timeout, threshold, area)

    def waitForImageToDisappear(self, image_path: str, timeout: float = 1.0, threshold: float = 0.8,
                               area: tuple = None, image_list: List[str] = None) -> Tuple[bool, str]:
        """
        Wait for image to disappear either in provided image list or by capturing new frames.
        """
        print(f"[@controller:ImageVerification] Looking for image to disappear: {image_path}")
        
        # Load reference image
        if not os.path.exists(image_path):
            return False, f"Reference image not found: {image_path}"
        
        ref_img = cv2.imread(image_path, cv2.IMREAD_COLOR)
        if ref_img is None:
            return False, f"Could not load reference image: {image_path}"
        
        if image_list:
            # Search in provided images
            print(f"[@controller:ImageVerification] Checking disappearance in {len(image_list)} provided images")
            
            for source_path in image_list:
                if not os.path.exists(source_path):
                    continue
                    
                source_img = cv2.imread(source_path, cv2.IMREAD_COLOR)
                if source_img is None:
                    continue
                
                confidence = self._match_template(ref_img, source_img, area)
                
                if confidence >= threshold:
                    print(f"[@controller:ImageVerification] Image still present in {source_path} with confidence {confidence:.3f}")
                    return False, f"Image still present with confidence {confidence:.3f}"
            
            return True, "Image not found in any provided images"
        
        else:
            # Use capture system - check if image is NOT found
            print(f"[@controller:ImageVerification] Starting capture to check disappearance for {timeout}s")
            found, message = self._capture_and_search(ref_img, timeout, threshold, area)
            return not found, f"Image {'still present' if found else 'disappeared'}"

    def _match_template(self, ref_img: np.ndarray, source_img: np.ndarray, area: tuple = None) -> float:
        """
        Perform template matching between reference and source images.
        
        Returns:
            Confidence score (0.0 to 1.0)
        """
        try:
            # Crop source image to area if specified
            if area:
                x, y, w, h = int(area['x']), int(area['y']), int(area['width']), int(area['height'])
                source_img = source_img[y:y+h, x:x+w]
            
            # Perform template matching
            result = cv2.matchTemplate(source_img, ref_img, cv2.TM_CCOEFF_NORMED)
            _, max_val, _, _ = cv2.minMaxLoc(result)
            
            return float(max_val)
            
        except Exception as e:
            print(f"[@controller:ImageVerification] Template matching error: {e}")
            return 0.0

    def _capture_and_search(self, ref_img: np.ndarray, timeout: float, threshold: float, area: tuple = None) -> Tuple[bool, str]:
        """
        Start capture, wait for timeout, stop capture, and search for image in captured frames.
        """
        try:
            # Start capture
            response = requests.post('http://localhost:5009/api/virtualpytest/screen-definition/capture/start', json={})
            if not response.json().get('success'):
                return False, "Failed to start capture"
            
            # Wait for timeout
            time.sleep(timeout)
            
            # Stop capture and get frames
            response = requests.post('http://localhost:5009/api/virtualpytest/screen-definition/capture/stop', json={})
            result = response.json()
            
            if not result.get('success'):
                return False, "Failed to stop capture"
            
            frames_downloaded = result.get('frames_downloaded', 0)
            if frames_downloaded == 0:
                return False, "No frames captured"
            
            # Search in captured frames
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            capture_dir = os.path.join(base_dir, 'tmp', 'captures')
            
            max_confidence = 0.0
            for i in range(1, frames_downloaded + 1):
                frame_path = os.path.join(capture_dir, f'capture_{i}.jpg')
                if not os.path.exists(frame_path):
                    continue
                
                frame_img = cv2.imread(frame_path, cv2.IMREAD_COLOR)
                if frame_img is None:
                    continue
                
                confidence = self._match_template(ref_img, frame_img, area)
                max_confidence = max(max_confidence, confidence)
                
                if confidence >= threshold:
                    return True, f"Image found in frame {i} with confidence {confidence:.3f}"
            
            return False, f"Image not found in {frames_downloaded} frames. Max confidence: {max_confidence:.3f}"
            
        except Exception as e:
            print(f"[@controller:ImageVerification] Capture and search error: {e}")
            return False, f"Capture error: {str(e)}"

# Backward compatibility alias
ImageVerificationController = ImageVerificationController 
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

    def _save_cropped_source_image(self, source_image_path: str, area: dict, model: str, verification_index: int) -> str:
        """
        Save a cropped version of the source image for UI comparison display.
        
        Args:
            source_image_path: Path to the source image
            area: Area to crop {x, y, width, height}
            model: Model name for directory organization
            verification_index: Index of verification for naming
            
        Returns:
            Path to saved cropped image or None if failed
        """
        try:
            # Create directory structure
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            output_dir = os.path.join(base_dir, 'tmp', model, f'verification_{verification_index}')
            os.makedirs(output_dir, exist_ok=True)
            
            # Output path for cropped source
            cropped_source_path = os.path.join(output_dir, 'source_cropped.png')
            
            # Read and crop source image
            img = cv2.imread(source_image_path)
            if img is None:
                print(f"[@controller:ImageVerification] Could not read source image: {source_image_path}")
                return None
                
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
            
            # Crop image to same area used for comparison
            cropped_img = img[y:y+height, x:x+width]
            
            # Save cropped image
            result = cv2.imwrite(cropped_source_path, cropped_img)
            
            if result:
                print(f"[@controller:ImageVerification] Saved cropped source: {cropped_source_path}")
                return cropped_source_path
            else:
                print(f"[@controller:ImageVerification] Failed to save cropped source: {cropped_source_path}")
                return None
                
        except Exception as e:
            print(f"[@controller:ImageVerification] Error saving cropped source: {e}")
            return None

    def waitForImageToAppear(self, image_path: str, timeout: float = 1.0, threshold: float = 0.8, 
                            area: tuple = None, image_list: List[str] = None, model: str = None, 
                            verification_index: int = 0) -> Tuple[bool, str, dict]:
        """
        Wait for image to appear either in provided image list or by capturing new frames.
        
        Args:
            image_path: Path to reference image
            timeout: Timeout for capture if no image_list provided
            threshold: Match threshold (0.0 to 1.0)
            area: Optional area to search (x, y, width, height)
            image_list: Optional list of source image paths to search
            model: Model name for organizing output images
            verification_index: Index of verification for naming
            
        Returns:
            Tuple of (success, message, additional_data)
        """
        print(f"[@controller:ImageVerification] Looking for image: {image_path}")
        
        # Load reference image
        if not os.path.exists(image_path):
            return False, f"Reference image not found: {image_path}", {}
        
        ref_img = cv2.imread(image_path, cv2.IMREAD_COLOR)
        if ref_img is None:
            return False, f"Could not load reference image: {image_path}", {}
        
        additional_data = {
            "reference_image_path": image_path
        }
        
        if image_list:
            # Search in provided images
            print(f"[@controller:ImageVerification] Searching in {len(image_list)} provided images")
            max_confidence = 0.0
            best_source_path = None
            
            for source_path in image_list:
                if not os.path.exists(source_path):
                    continue
                    
                source_img = cv2.imread(source_path, cv2.IMREAD_COLOR)
                if source_img is None:
                    continue
                
                confidence = self._match_template(ref_img, source_img, area)
                
                if confidence > max_confidence:
                    max_confidence = confidence
                    best_source_path = source_path
                
                if confidence >= threshold:
                    print(f"[@controller:ImageVerification] Match found in {source_path} with confidence {confidence:.3f}")
                    
                    # Save cropped source image for UI comparison
                    if area and model is not None:
                        cropped_source_path = self._save_cropped_source_image(source_path, area, model, verification_index)
                        if cropped_source_path:
                            additional_data["source_image_path"] = cropped_source_path
                    
                    return True, f"Image found with confidence {confidence:.3f} (threshold: {threshold:.3f})", additional_data
            
            # If no match found, still save the best source for comparison
            if best_source_path and area and model is not None:
                cropped_source_path = self._save_cropped_source_image(best_source_path, area, model, verification_index)
                if cropped_source_path:
                    additional_data["source_image_path"] = cropped_source_path
            
            return False, f"Image not found. Best confidence: {max_confidence:.3f} (threshold: {threshold:.3f})", additional_data
        
        else:
            # Use capture system
            print(f"[@controller:ImageVerification] Starting capture for {timeout}s")
            return self._capture_and_search(ref_img, timeout, threshold, area, model, verification_index, additional_data)

    def waitForImageToDisappear(self, image_path: str, timeout: float = 1.0, threshold: float = 0.8,
                               area: tuple = None, image_list: List[str] = None, model: str = None,
                               verification_index: int = 0) -> Tuple[bool, str, dict]:
        """
        Wait for image to disappear by calling waitForImageToAppear and inverting the result.
        """
        print(f"[@controller:ImageVerification] Looking for image to disappear: {image_path}")
        
        # Smart reuse: call waitForImageToAppear and invert result
        found, message, additional_data = self.waitForImageToAppear(image_path, timeout, threshold, area, image_list, model, verification_index)
        
        if found:
            # Image was found, so it hasn't disappeared
            return False, f"Image still present: {message}", additional_data
        else:
            # Image was not found, so it has disappeared (or was never there)
            return True, f"Image disappeared: {message}", additional_data

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

    def _capture_and_search(self, ref_img: np.ndarray, timeout: float, threshold: float, area: tuple = None, 
                           model: str = None, verification_index: int = 0, additional_data: dict = None) -> Tuple[bool, str, dict]:
        """
        Start capture, wait for timeout, stop capture, and search for image in captured frames.
        Returns immediately on first match found.
        """
        if additional_data is None:
            additional_data = {}
            
        try:
            # Start capture
            response = requests.post('http://localhost:5009/api/virtualpytest/screen-definition/capture/start', json={})
            if not response.json().get('success'):
                return False, "Failed to start capture", additional_data
            
            # Wait for timeout (capture all frames during this period)
            time.sleep(timeout)
            
            # Stop capture and get frames
            response = requests.post('http://localhost:5009/api/virtualpytest/screen-definition/capture/stop', json={})
            result = response.json()
            
            if not result.get('success'):
                return False, "Failed to stop capture", additional_data
            
            frames_downloaded = result.get('frames_downloaded', 0)
            if frames_downloaded == 0:
                return False, "No frames captured", additional_data
            
            print(f"[@controller:ImageVerification] Processing {frames_downloaded} captured frames...")
            
            # Search in captured frames - return immediately on first match
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            capture_dir = os.path.join(base_dir, 'tmp', 'captures')
            
            max_confidence = 0.0
            best_frame_path = None
            
            for i in range(1, frames_downloaded + 1):
                frame_path = os.path.join(capture_dir, f'capture_{i}.jpg')
                if not os.path.exists(frame_path):
                    continue
                
                frame_img = cv2.imread(frame_path, cv2.IMREAD_COLOR)
                if frame_img is None:
                    continue
                
                confidence = self._match_template(ref_img, frame_img, area)
                
                if confidence > max_confidence:
                    max_confidence = confidence
                    best_frame_path = frame_path
                
                print(f"[@controller:ImageVerification] Frame {i}: confidence {confidence:.3f}")
                
                # Return immediately on first match
                if confidence >= threshold:
                    print(f"[@controller:ImageVerification] Match found in frame {i}! Stopping analysis.")
                    
                    # Save cropped source image for UI comparison
                    if area and model is not None:
                        cropped_source_path = self._save_cropped_source_image(frame_path, area, model, verification_index)
                        if cropped_source_path:
                            additional_data["source_image_path"] = cropped_source_path
                    
                    return True, f"Image found in frame {i} with confidence {confidence:.3f}", additional_data
            
            # If no match found, still save the best frame for comparison
            if best_frame_path and area and model is not None:
                cropped_source_path = self._save_cropped_source_image(best_frame_path, area, model, verification_index)
                if cropped_source_path:
                    additional_data["source_image_path"] = cropped_source_path
            
            return False, f"Image not found in {frames_downloaded} frames. Best confidence: {max_confidence:.3f} (threshold: {threshold:.3f})", additional_data
            
        except Exception as e:
            print(f"[@controller:ImageVerification] Capture and search error: {e}")
            return False, f"Capture error: {str(e)}", additional_data

# Backward compatibility alias
ImageVerificationController = ImageVerificationController 
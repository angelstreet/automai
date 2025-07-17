"""
Video Verification Controller Implementation

This controller provides video analysis and verification functionality.
It can work with various video sources including HDMI stream controllers,
video files, screenshots, or direct video capture devices.
"""

import subprocess
import threading
import time
import os
import cv2
import numpy as np
import re
import json
import fcntl
import pickle
import pytz
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, Union, Tuple, List
from pathlib import Path
from ..base_controller import VerificationControllerInterface

# Optional import for text extraction
try:
    import pytesseract
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False

# Language detection import
try:
    from langdetect import detect, LangDetectException
    LANG_DETECT_AVAILABLE = True
except ImportError:
    LANG_DETECT_AVAILABLE = False

# Simplified sampling patterns for performance optimization (from analyze_frame.py)
SAMPLING_PATTERNS = {
    "freeze_sample_rate": 10,     # Every 10th pixel for freeze detection
    "blackscreen_samples": 1000,  # 1000 random pixels for blackscreen
    "error_grid_rate": 15,        # Every 15th pixel in grid for errors
    "subtitle_edge_threshold": 200  # Edge detection threshold
}

class VideoVerificationController(VerificationControllerInterface):
    """Video verification controller that analyzes video content from various sources."""
    
    def __init__(self, av_controller, **kwargs):
        """
        Initialize the Video Verification controller.
        
        Args:
            av_controller: AV controller for capturing video/images (dependency injection)
        """
        super().__init__("Video Verification", "video")
        
        # Dependency injection
        self.av_controller = av_controller
        
        # Validate required dependency
        if not self.av_controller:
            raise ValueError("av_controller is required for VideoVerificationController")
            
        # Video analysis settings
        self.motion_threshold = 5.0  # Default motion threshold percentage
        self.frame_comparison_threshold = 10.0  # Default frame change threshold
        
        # Temporary files for analysis - will be set based on image location
        self.temp_video_path = None
        
        print(f"[@controller:VideoVerification] Initialized with AV controller")
        
        # Controller is always ready - matches ImageVerificationController pattern
        self.is_connected = True
        self.verification_session_id = f"video_verify_{int(time.time())}"
        
    def connect(self) -> bool:
        """Connect to the video verification system."""
        try:
            print(f"VideoVerify[{self.device_name}]: Connecting to video verification system")
            
            # Check if AV controller is connected - but don't fail if not
            if not hasattr(self.av_controller, 'is_connected') or not self.av_controller.is_connected:
                print(f"VideoVerify[{self.device_name}]: WARNING - AV controller not connected")
                print(f"VideoVerify[{self.device_name}]: Video analysis will work with provided images only")
            else:
                print(f"VideoVerify[{self.device_name}]: Using AV controller: {self.av_controller.device_name}")
            
            # Check AV controller video device - but don't fail if missing
            if not hasattr(self.av_controller, 'video_device') or not self.av_controller.video_device:
                print(f"VideoVerify[{self.device_name}]: WARNING - AV controller missing video device configuration")
                print(f"VideoVerify[{self.device_name}]: Screenshot capture will not be available")
            else:
                print(f"VideoVerify[{self.device_name}]: Video device: {self.av_controller.video_device}")
            
            # Temp directory will be set based on image location
            
            # Always connected like ImageVerificationController
            self.is_connected = True
            self.verification_session_id = f"video_verify_{int(time.time())}"
            print(f"VideoVerify[{self.device_name}]: Connected - Session: {self.verification_session_id}")
            return True
            
        except Exception as e:
            print(f"VideoVerify[{self.device_name}]: Connection error: {e}")
            # Still connected for image analysis even if AV controller has issues
            self.is_connected = True
            return True

    def disconnect(self) -> bool:
        """Disconnect from the video verification system."""
        print(f"VideoVerify[{self.device_name}]: Disconnecting")
        self.is_connected = False
        self.verification_session_id = None
        
        # Temp files are cleaned up with their source directories
            
        print(f"VideoVerify[{self.device_name}]: Disconnected")
        return True

    def capture_screenshot(self, filename: str = None, source: str = "av_controller") -> str:
        """
        Capture a screenshot for analysis using the AV controller.
        
        Args:
            filename: Optional filename for the screenshot
            source: Video source ("av_controller" or file path)
            
        Returns:
            Path to the captured screenshot file
        """
        # Only check connection when actually using AV controller
        if source == "av_controller" and not self.is_connected:
            print(f"VideoVerify[{self.device_name}]: ERROR - Not connected for AV controller capture")
            return None
            
        timestamp = int(time.time())
        screenshot_name = filename 
        screenshot_path = Path.cwd() / screenshot_name
        
        try:
            if source == "av_controller":
                # Use AV controller's screenshot method
                print(f"VideoVerify[{self.device_name}]: Requesting screenshot from {self.av_controller.device_name}")
                result = self.av_controller.take_screenshot(screenshot_name)
                if result:
                    # Copy to our temp directory for analysis
                    import shutil
                    shutil.copy2(result, screenshot_path)
                    return str(screenshot_path)
                else:
                    print(f"VideoVerify[{self.device_name}]: Failed to get screenshot from AV controller")
                    return None
                
            elif os.path.exists(source):
                # Use existing image file
                print(f"VideoVerify[{self.device_name}]: Using existing image file: {source}")
                return source
                
            else:
                print(f"VideoVerify[{self.device_name}]: ERROR - Unknown video source: {source}")
                return None
                
        except Exception as e:
            print(f"VideoVerify[{self.device_name}]: Screenshot capture error: {e}")
            return None

    def analyze_image_content(self, image_path: str, analysis_type: str = "basic") -> Dict[str, Any]:
        """
        Analyze image content using OpenCV or FFmpeg.
        
        Args:
            image_path: Path to the image file
            analysis_type: Type of analysis (basic, color, brightness, motion)
            
        Returns:
            Dictionary with analysis results
        """
        if not self.is_connected:
            print(f"VideoVerify[{self.device_name}]: ERROR - Not connected")
            return {}
            
        if not os.path.exists(image_path):
            print(f"VideoVerify[{self.device_name}]: ERROR - Image file not found: {image_path}")
            return {}
        
        try:
            print(f"VideoVerify[{self.device_name}]: Analyzing image content - Type: {analysis_type}")
            
            if analysis_type in ["basic", "color", "brightness"]:
                # Use OpenCV for detailed analysis
                return self._analyze_with_opencv(image_path, analysis_type)
            else:
                # Use FFmpeg for basic analysis
                return self._analyze_with_ffmpeg(image_path, analysis_type)
                
        except Exception as e:
            print(f"VideoVerify[{self.device_name}]: Image analysis error: {e}")
            return {"error": str(e)}

    def _analyze_with_opencv(self, image_path: str, analysis_type: str) -> Dict[str, Any]:
        """Analyze image using OpenCV."""
        import cv2
        
        # Load image
        image = cv2.imread(image_path)
        if image is None:
            return {"error": "Could not load image"}
        
        height, width, channels = image.shape
        
        if analysis_type == "basic":
            # Basic image properties
            return {
                "width": width,
                "height": height,
                "channels": channels,
                "total_pixels": width * height,
                "analysis_type": "basic",
                "image_path": image_path
            }
            
        elif analysis_type == "color":
            # Color analysis
            mean_color = cv2.mean(image)
            hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
            
            # Dominant color detection (simplified)
            colors = {
                "blue": mean_color[0],
                "green": mean_color[1], 
                "red": mean_color[2]
            }
            dominant_color = max(colors, key=colors.get)
            
            return {
                "mean_bgr": mean_color[:3],
                "dominant_color": dominant_color,
                "color_variance": np.var(image),
                "analysis_type": "color",
                "image_path": image_path
            }
            
        elif analysis_type == "brightness":
            # Brightness analysis
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            mean_brightness = np.mean(gray)
            brightness_std = np.std(gray)
            
            return {
                "mean_brightness": float(mean_brightness),
                "brightness_std": float(brightness_std),
                "brightness_percentage": float(mean_brightness / 255 * 100),
                "analysis_type": "brightness",
                "image_path": image_path
            }
            
        return {"error": f"Unknown OpenCV analysis type: {analysis_type}"}

    def _analyze_with_ffmpeg(self, image_path: str, analysis_type: str) -> Dict[str, Any]:
        """Analyze image using FFmpeg."""
        try:
            if analysis_type == "basic":
                # Get basic image info
                cmd = [
                    '/usr/bin/ffprobe',
                    '-v', 'quiet',
                    '-print_format', 'json',
                    '-show_streams',
                    image_path
                ]
                
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
                
                if result.returncode == 0:
                    import json
                    data = json.loads(result.stdout)
                    if 'streams' in data and len(data['streams']) > 0:
                        stream = data['streams'][0]
                        return {
                            "width": stream.get('width', 0),
                            "height": stream.get('height', 0),
                            "pixel_format": stream.get('pix_fmt', 'unknown'),
                            "analysis_type": "basic",
                            "image_path": image_path
                        }
                        
            # For other analysis types, return basic info
            return {
                "analysis_type": analysis_type,
                "image_path": image_path,
                "note": "Limited analysis without OpenCV"
            }
            
        except Exception as e:
            return {"error": f"FFmpeg analysis failed: {e}"}

    def detect_motion(self, duration: float = 3.0, threshold: float = None) -> bool:
        """
        Detect motion by comparing consecutive frames.
        
        Args:
            duration: Duration to analyze for motion
            threshold: Motion threshold percentage (default: self.motion_threshold)
            
        Returns:
            True if motion is detected, False otherwise
        """
        if not self.is_connected:
            print(f"VideoVerify[{self.device_name}]: ERROR - Not connected")
            return False
            
        threshold = threshold or self.motion_threshold
        print(f"VideoVerify[{self.device_name}]: Detecting motion (duration: {duration}s, threshold: {threshold}%)")
        
        try:
            # Capture two screenshots with a delay
            screenshot1 = self.capture_screenshot(f"motion_frame1_{int(time.time())}.png")
            if not screenshot1:
                return False
                
            time.sleep(min(duration, 2.0))  # Wait for motion
            
            screenshot2 = self.capture_screenshot(f"motion_frame2_{int(time.time())}.png")
            if not screenshot2:
                return False
            
            # Compare the two images
            motion_detected = self._compare_images_for_motion(screenshot1, screenshot2, threshold)
            
            result_text = "detected" if motion_detected else "not detected"
            print(f"VideoVerify[{self.device_name}]: Motion {result_text}")
            
            return motion_detected
            
        except Exception as e:
            print(f"VideoVerify[{self.device_name}]: Motion detection error: {e}")
            return False

    def _compare_images_for_motion(self, image1_path: str, image2_path: str, threshold: float) -> bool:
        """Compare two images to detect motion."""
        try:
            # Load images
            img1 = cv2.imread(image1_path, cv2.IMREAD_GRAYSCALE)
            img2 = cv2.imread(image2_path, cv2.IMREAD_GRAYSCALE)
            
            if img1 is None or img2 is None:
                return False
            
            # Resize images to same size if needed
            if img1.shape != img2.shape:
                img2 = cv2.resize(img2, (img1.shape[1], img1.shape[0]))
            
            # Calculate absolute difference
            diff = cv2.absdiff(img1, img2)
            
            # Calculate percentage of changed pixels
            total_pixels = img1.shape[0] * img1.shape[1]
            changed_pixels = np.count_nonzero(diff > 30)  # Threshold for significant change
            change_percentage = (changed_pixels / total_pixels) * 100
            
            print(f"VideoVerify[{self.device_name}]: Frame change: {change_percentage:.1f}%")
            return change_percentage > threshold
            
        except Exception as e:
            print(f"VideoVerify[{self.device_name}]: Image comparison error: {e}")
            return False

    def wait_for_video_change(self, timeout: float = 10.0, threshold: float = None) -> bool:
        """
        Wait for video content to change.
        
        Args:
            timeout: Maximum time to wait in seconds
            threshold: Change threshold as percentage
            
        Returns:
            True if change is detected, False if timeout
        """
        if not self.is_connected:
            print(f"VideoVerify[{self.device_name}]: ERROR - Not connected")
            return False
            
        threshold = threshold or self.frame_comparison_threshold
        print(f"VideoVerify[{self.device_name}]: Waiting for video change (timeout: {timeout}s, threshold: {threshold}%)")
        
        # Capture initial frame
        initial_frame = self.capture_screenshot(f"initial_frame_{int(time.time())}.png")
        if not initial_frame:
            return False
        
        start_time = time.time()
        check_interval = 1.0  # Check every second
        
        while time.time() - start_time < timeout:
            time.sleep(check_interval)
            
            # Capture current frame
            current_frame = self.capture_screenshot(f"current_frame_{int(time.time())}.png")
            if not current_frame:
                continue
            
            # Compare frames
            if self._compare_images_for_motion(initial_frame, current_frame, threshold):
                elapsed = time.time() - start_time
                print(f"VideoVerify[{self.device_name}]: Video change detected after {elapsed:.1f}s")
                return True
        
        print(f"VideoVerify[{self.device_name}]: No video change detected within {timeout}s")
        return False

    # Implementation of required abstract methods from VerificationControllerInterface
    
    def verify_image_appears(self, image_name: str, timeout: float = 10.0, confidence: float = 0.8) -> bool:
        """
        Image verification moved to dedicated ImageVerificationController.
        """
        print(f"VideoVerify[{self.device_name}]: Image verification not supported by video controller")
        print(f"VideoVerify[{self.device_name}]: Use ImageVerificationController for image template matching")
        print(f"VideoVerify[{self.device_name}]: Example: image_verifier.waitForImageToAppear('{image_name}', {timeout}, {confidence})")
        return False

    def verify_text_appears(self, text: str, timeout: float = 10.0, case_sensitive: bool = False) -> bool:
        """Text verification requires OCR - refer to TextVerificationController."""
        print(f"VideoVerify[{self.device_name}]: Text verification not supported by video controller")
        print(f"VideoVerify[{self.device_name}]: Use TextVerificationController for OCR-based text verification")
        return False
        
    def verify_element_exists(self, element_id: str, element_type: str = "any") -> bool:
        """Element verification not applicable for video analysis."""
        print(f"VideoVerify[{self.device_name}]: Element verification not supported by video controller")
        return False
        
    def verify_audio_playing(self, min_level: float = 10.0, duration: float = 2.0) -> bool:
        """Audio verification not applicable for video controller."""
        print(f"VideoVerify[{self.device_name}]: Audio verification not supported by video controller")
        print(f"VideoVerify[{self.device_name}]: Use AudioVerificationController for audio verification")
        return False
        
    def verify_color_present(self, color: str, tolerance: float = 10.0) -> bool:
        """
        Verify that a specific color is present on screen.
        
        Args:
            color: Color to look for (hex, rgb, or name)
            tolerance: Color matching tolerance percentage
        """
        if not self.is_connected:
            print(f"VideoVerify[{self.device_name}]: ERROR - Not connected")
            return False
            
        print(f"VideoVerify[{self.device_name}]: Looking for color '{color}' (tolerance: {tolerance}%)")
        
        # Capture screenshot for analysis
        screenshot = self.capture_screenshot()
        if not screenshot:
            return False
        
        # Analyze color content
        color_analysis = self.analyze_image_content(screenshot, "color")
        
        # Simplified color detection (in a real implementation, this would be more sophisticated)
        color_found = False
        if "dominant_color" in color_analysis:
            dominant = color_analysis["dominant_color"].lower()
            color_found = color.lower() in dominant or dominant in color.lower()
        
        result_text = "found" if color_found else "not found"
        print(f"VideoVerify[{self.device_name}]: Color '{color}' {result_text}")
        
        return color_found
        
    def verify_screen_state(self, expected_state: str, timeout: float = 5.0) -> bool:
        """
        Verify that the screen is in an expected state based on visual analysis.
        
        Args:
            expected_state: Expected state (loading, ready, error, etc.)
            timeout: Maximum time to wait for state
        """
        if not self.is_connected:
            print(f"VideoVerify[{self.device_name}]: ERROR - Not connected")
            return False
            
        print(f"VideoVerify[{self.device_name}]: Verifying screen state '{expected_state}' (timeout: {timeout}s)")
        
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            screenshot = self.capture_screenshot()
            if not screenshot:
                time.sleep(0.5)
                continue
            
            # Analyze screenshot for state indicators
            analysis = self.analyze_image_content(screenshot, "brightness")
            
            # Simplified state detection based on brightness and content
            state_detected = False
            if expected_state.lower() == "loading":
                # Loading screens often have lower brightness or specific patterns
                brightness = analysis.get("brightness_percentage", 50)
                state_detected = 20 <= brightness <= 60
            elif expected_state.lower() == "ready":
                # Ready screens often have normal brightness
                brightness = analysis.get("brightness_percentage", 50)
                state_detected = brightness > 40
            elif expected_state.lower() == "error":
                # Error screens might have specific color patterns (simplified)
                state_detected = True  # Simplified for demo
            
            if state_detected:
                elapsed = time.time() - start_time
                print(f"VideoVerify[{self.device_name}]: Screen state '{expected_state}' verified after {elapsed:.1f}s")
                
                return True
            
            time.sleep(0.5)
        
        print(f"VideoVerify[{self.device_name}]: Screen state '{expected_state}' not detected within {timeout}s")
        
        return False
        
    def verify_performance_metric(self, metric_name: str, expected_value: float, tolerance: float = 10.0) -> bool:
        """Verify video-related performance metrics."""
        if metric_name.lower() in ['brightness', 'contrast']:
            screenshot = self.capture_screenshot()
            if not screenshot:
                return False
                
            analysis = self.analyze_image_content(screenshot, "brightness")
            
            if metric_name.lower() == 'brightness':
                current_value = analysis.get("brightness_percentage", 0)
            else:
                current_value = analysis.get("brightness_std", 0)
            
            tolerance_range = expected_value * (tolerance / 100)
            within_tolerance = abs(current_value - expected_value) <= tolerance_range
            
            print(f"VideoVerify[{self.device_name}]: {metric_name} = {current_value:.2f} (expected: {expected_value} ±{tolerance}%)")
            
            return within_tolerance
        else:
            print(f"VideoVerify[{self.device_name}]: Unknown video metric: {metric_name}")
            return False
        
    def wait_and_verify(self, verification_type: str, target: str, timeout: float = 10.0, **kwargs) -> bool:
        """Generic wait and verify method for video verification."""
        if verification_type == "image":
            confidence = kwargs.get("confidence", 0.8)
            return self.verify_image_appears(target, timeout, confidence)
        elif verification_type == "video_playing":
            motion_threshold = kwargs.get("motion_threshold", self.motion_threshold)
            return self.verify_video_playing(motion_threshold, timeout)
        elif verification_type == "color":
            tolerance = kwargs.get("tolerance", 10.0)
            return self.verify_color_present(target, tolerance)
        elif verification_type == "state":
            return self.verify_screen_state(target, timeout)
        elif verification_type == "video_change":
            threshold = kwargs.get("threshold", self.frame_comparison_threshold)
            return self.wait_for_video_change(timeout, threshold)
        else:
            print(f"VideoVerify[{self.device_name}]: Unknown video verification type: {verification_type}")
            return False
            
    def get_status(self) -> Dict[str, Any]:
        """Get controller status information."""
        return {
            'controller_type': self.controller_type,
            'device_name': self.device_name,
            'connected': self.is_connected,
            'session_id': self.verification_session_id,
            'acquisition_source': self.av_controller.device_name if self.av_controller else None,
            'capabilities': [
                'motion_detection', 'video_playback_verification',
                'color_verification', 'screen_state_verification',
                'video_change_detection', 'performance_metrics'
            ]
        }
    
    def get_available_verifications(self) -> List[Dict[str, Any]]:
        """Get available verifications for video controller."""
        return [
            {
                'command': 'WaitForVideoToAppear',
                'params': {
                    'motion_threshold': 5.0,    # Default motion threshold
                    'duration': 3.0,            # Default duration
                    'timeout': 10.0             # Default timeout
                },
                'verification_type': 'video'
            },
            {
                'command': 'WaitForVideoToDisappear',
                'params': {
                    'motion_threshold': 5.0,    # Default motion threshold
                    'duration': 3.0,            # Default duration
                    'timeout': 10.0             # Default timeout
                },
                'verification_type': 'video'
            },
            {
                'command': 'DetectMotion',
                'params': {
                    'duration': 3.0,            # Default duration
                    'threshold': 5.0            # Default threshold
                },
                'verification_type': 'video'
            },
            {
                'command': 'WaitForVideoChange',
                'params': {
                    'timeout': 10.0,            # Default timeout
                    'threshold': 10.0           # Default threshold
                },
                'verification_type': 'video'
            },
            {
                'command': 'VerifyColorPresent',
                'params': {
                    'color': '',                # Empty string for user input
                    'tolerance': 10.0           # Default tolerance
                },
                'verification_type': 'video'
            },
            {
                'command': 'VerifyScreenState',
                'params': {
                    'expected_state': '',       # Empty string for user input
                    'timeout': 5.0              # Default timeout
                },
                'verification_type': 'video'
            },
            {
                'command': 'DetectBlackscreen',
                'params': {
                    'threshold': 10             # Default pixel threshold
                },
                'verification_type': 'video'
            },
            {
                'command': 'DetectFreeze',
                'params': {
                    'freeze_threshold': 1.0     # Default freeze threshold
                },
                'verification_type': 'video'
            },
            {
                'command': 'DetectSubtitles',
                'params': {
                    'extract_text': True        # Default to extract text
                },
                'verification_type': 'video'
            },
            {
                'command': 'DetectSubtitlesAI',
                'params': {
                    'extract_text': True        # Default to extract text
                },
                'verification_type': 'video'
            }
        ]

    def execute_verification(self, verification_config: Dict[str, Any], image_source_url: str = None) -> Dict[str, Any]:
        """
        Unified verification execution interface for centralized controller.
        
        Args:
            verification_config: {
                'verification_type': 'video',
                'command': 'waitForVideoToAppear',
                'params': {
                    'motion_threshold': 5.0,
                    'duration': 3.0,
                    'timeout': 10.0
                }
            }
            image_source_url: Optional source image path or array of paths for analysis
            
        Returns:
            {
                'success': bool,
                'message': str,
                'confidence': float,
                'details': dict
            }
        """
        try:
            # Extract parameters
            params = verification_config.get('params', {})
            command = verification_config.get('command', 'WaitForVideoToAppear')
            
            print(f"[@controller:VideoVerification] Executing {command}")
            print(f"[@controller:VideoVerification] Parameters: {params}")
            
            # Parse image_source_url for frame analysis commands
            image_paths = None
            if image_source_url:
                if isinstance(image_source_url, str):
                    # Single image or comma-separated list
                    if ',' in image_source_url:
                        image_paths = [path.strip() for path in image_source_url.split(',')]
                    else:
                        image_paths = [image_source_url]
                elif isinstance(image_source_url, list):
                    image_paths = image_source_url
            
            # Execute verification based on command
            if command == 'WaitForVideoToAppear':
                motion_threshold = params.get('motion_threshold', 5.0)
                duration = params.get('duration', 3.0)
                timeout = params.get('timeout', 10.0)
                
                success = self.waitForVideoToAppear(motion_threshold, duration, timeout)
                message = f"Video {'appeared' if success else 'did not appear'} (motion threshold: {motion_threshold}%)"
                details = {
                    'motion_threshold': motion_threshold,
                    'duration': duration,
                    'timeout': timeout
                }
                
            elif command == 'WaitForVideoToDisappear':
                motion_threshold = params.get('motion_threshold', 5.0)
                duration = params.get('duration', 3.0)
                timeout = params.get('timeout', 10.0)
                
                success = self.waitForVideoToDisappear(motion_threshold, duration, timeout)
                message = f"Video {'disappeared' if success else 'still present'} (motion threshold: {motion_threshold}%)"
                details = {
                    'motion_threshold': motion_threshold,
                    'duration': duration,
                    'timeout': timeout
                }
                
            elif command == 'DetectMotion':
                duration = params.get('duration', 3.0)
                threshold = params.get('threshold', self.motion_threshold)
                
                success = self.detect_motion(duration, threshold)
                message = f"Motion {'detected' if success else 'not detected'}"
                details = {
                    'duration': duration,
                    'threshold': threshold
                }
                
            elif command == 'WaitForVideoChange':
                timeout = params.get('timeout', 10.0)
                threshold = params.get('threshold', self.frame_comparison_threshold)
                
                success = self.wait_for_video_change(timeout, threshold)
                message = f"Video change {'detected' if success else 'not detected'}"
                details = {
                    'timeout': timeout,
                    'threshold': threshold
                }
                
            elif command == 'VerifyColorPresent':
                color = params.get('color')
                if not color:
                    return {
                        'success': False,
                        'message': 'No color specified for color verification',
                        'confidence': 0.0,
                        'details': {'error': 'Missing color parameter'}
                    }
                
                tolerance = params.get('tolerance', 10.0)
                
                success = self.verify_color_present(color, tolerance)
                message = f"Color '{color}' {'found' if success else 'not found'}"
                details = {
                    'color': color,
                    'tolerance': tolerance
                }
                
            elif command == 'VerifyScreenState':
                expected_state = params.get('expected_state')
                if not expected_state:
                    return {
                        'success': False,
                        'message': 'No expected state specified for screen state verification',
                        'confidence': 0.0,
                        'details': {'error': 'Missing expected_state parameter'}
                    }
                
                timeout = params.get('timeout', 5.0)
                
                success = self.verify_screen_state(expected_state, timeout)
                message = f"Screen state '{expected_state}' {'verified' if success else 'not verified'}"
                details = {
                    'expected_state': expected_state,
                    'timeout': timeout
                }
                
            elif command == 'DetectBlackscreen':
                threshold = params.get('threshold', 10)
                
                result = self.detect_blackscreen(image_paths, threshold)
                success = result.get('success', False) and result.get('blackscreen_detected', False)
                message = f"Blackscreen {'detected' if success else 'not detected'}"
                details = result
                
            elif command == 'DetectFreeze':
                freeze_threshold = params.get('freeze_threshold', 1.0)
                
                result = self.detect_freeze(image_paths, freeze_threshold)
                success = result.get('success', False) and result.get('freeze_detected', False)
                message = f"Freeze {'detected' if success else 'not detected'}"
                details = result
                
            elif command == 'DetectSubtitles':
                extract_text = params.get('extract_text', True)
                
                result = self.detect_subtitles(image_paths, extract_text)
                success = result.get('success', False) and result.get('subtitles_detected', False)
                message = f"Subtitles {'detected' if success else 'not detected'}"
                details = result
                
            elif command == 'DetectSubtitlesAI':
                extract_text = params.get('extract_text', True)
                
                result = self.detect_subtitles_ai(image_paths, extract_text)
                success = result.get('success', False) and result.get('subtitles_detected', False)
                message = f"AI Subtitles {'detected' if success else 'not detected'}"
                details = result
                
            else:
                return {
                    'success': False,
                    'message': f'Unknown video verification command: {command}',
                    'confidence': 0.0,
                    'details': {'error': f'Unsupported command: {command}'}
                }
            
            # Return unified format
            return {
                'success': success,
                'message': message,
                'confidence': details.get('confidence', 1.0 if success else 0.0),
                'details': details
            }
            
        except Exception as e:
            print(f"[@controller:VideoVerification] Execution error: {e}")
            return {
                'success': False,
                'message': f'Video verification execution error: {str(e)}',
                'confidence': 0.0,
                'details': {'error': str(e)}
            }

    def waitForVideoToAppear(self, motion_threshold: float = 5.0, duration: float = 3.0, timeout: float = 10.0) -> bool:
        """
        Wait for video content to appear (motion detected).
        
        Args:
            motion_threshold: Minimum motion percentage to consider as "playing"
            duration: Duration to check for motion in seconds
            timeout: Maximum time to wait for video to appear
            
        Returns:
            True if video appears, False if timeout
        """
        if not self.is_connected:
            print(f"VideoVerify[{self.device_name}]: ERROR - Not connected")
            return False
            
        print(f"VideoVerify[{self.device_name}]: Waiting for video to appear (motion threshold: {motion_threshold}%, duration: {duration}s, timeout: {timeout}s)")
        
        start_time = time.time()
        check_interval = 1.0
        
        while time.time() - start_time < timeout:
            motion_detected = self.detect_motion(duration, motion_threshold)
            
            if motion_detected:
                elapsed = time.time() - start_time
                print(f"VideoVerify[{self.device_name}]: Video appeared after {elapsed:.1f}s")
                
                return True
            
            time.sleep(check_interval)
        
        print(f"VideoVerify[{self.device_name}]: Video did not appear within {timeout}s")
        
        return False

    def waitForVideoToDisappear(self, motion_threshold: float = 5.0, duration: float = 3.0, timeout: float = 10.0) -> bool:
        """
        Wait for video content to disappear (no motion detected).
        
        Args:
            motion_threshold: Minimum motion percentage to consider as "playing"
            duration: Duration to check for lack of motion in seconds
            timeout: Maximum time to wait for video to disappear
            
        Returns:
            True if video disappears, False if timeout
        """
        if not self.is_connected:
            print(f"VideoVerify[{self.device_name}]: ERROR - Not connected")
            return False
            
        print(f"VideoVerify[{self.device_name}]: Waiting for video to disappear (motion threshold: {motion_threshold}%, duration: {duration}s, timeout: {timeout}s)")
        
        start_time = time.time()
        check_interval = 1.0
        
        while time.time() - start_time < timeout:
            motion_detected = self.detect_motion(duration, motion_threshold)
            
            if not motion_detected:
                elapsed = time.time() - start_time
                print(f"VideoVerify[{self.device_name}]: Video disappeared after {elapsed:.1f}s")
                
                return True
            
            time.sleep(check_interval)
        
        print(f"VideoVerify[{self.device_name}]: Video still present after {timeout}s")
        
        return False

    def detect_blackscreen(self, image_paths: List[str] = None, threshold: int = 10) -> Dict[str, Any]:
        """
        Detect if image is mostly black (blackscreen) - Simple and reliable.
        
        Args:
            image_paths: List of image paths to analyze, or None to use last capture
            threshold: Pixel intensity threshold (0-255)
            
        Returns:
            Dictionary with detailed blackscreen analysis results
        """
        try:
            # Determine which images to analyze
            if image_paths is None or len(image_paths) == 0:
                # Only check connection when we need to capture screenshots
                if not self.is_connected:
                    print(f"VideoVerify[{self.device_name}]: ERROR - Not connected for screenshot capture")
                    return {'success': False, 'error': 'Not connected for screenshot capture'}
                
                # Use last available capture
                screenshot = self.capture_screenshot()
                if not screenshot:
                    return {'success': False, 'error': 'Failed to capture screenshot'}
                image_paths = [screenshot]
            
            results = []
            
            for image_path in image_paths:
                if not os.path.exists(image_path):
                    results.append({
                        'image_path': image_path,
                        'success': False,
                        'error': 'Image file not found'
                    })
                    continue
                
                try:
                    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
                    if img is None:
                        results.append({
                            'image_path': image_path,
                            'success': False,
                            'error': 'Could not load image'
                        })
                        continue
                    
                    # Simple approach: count how many pixels are very dark (0-threshold)
                    very_dark_pixels = np.sum(img <= threshold)
                    total_pixels = img.shape[0] * img.shape[1]
                    dark_percentage = (very_dark_pixels / total_pixels) * 100
                    
                    # If more than 95% of pixels are very dark, it's a blackscreen
                    is_blackscreen = bool(dark_percentage > 95)
                    
                    result = {
                        'image_path': os.path.basename(image_path),
                        'success': True,
                        'is_blackscreen': is_blackscreen,
                        'dark_percentage': round(float(dark_percentage), 2),
                        'threshold': threshold,
                        'very_dark_pixels': int(very_dark_pixels),
                        'total_pixels': int(total_pixels),
                        'image_size': f"{img.shape[1]}x{img.shape[0]}",
                        'confidence': 0.9 if is_blackscreen else 0.1
                    }
                    
                    results.append(result)
                    
                    print(f"VideoVerify[{self.device_name}]: Blackscreen analysis - {dark_percentage:.1f}% dark pixels, blackscreen={is_blackscreen}")
                    
                except Exception as e:
                    results.append({
                        'image_path': image_path,
                        'success': False,
                        'error': f'Analysis error: {str(e)}'
                    })
            
            # Calculate overall result
            successful_analyses = [r for r in results if r.get('success')]
            blackscreen_detected = any(r.get('is_blackscreen', False) for r in successful_analyses)
            
            overall_result = {
                'success': len(successful_analyses) > 0,
                'blackscreen_detected': blackscreen_detected,
                'analyzed_images': len(results),
                'successful_analyses': len(successful_analyses),
                'results': results,
                'analysis_type': 'blackscreen_detection',
                'timestamp': datetime.now().isoformat()
            }
            
            return overall_result
            
        except Exception as e:
            print(f"VideoVerify[{self.device_name}]: Blackscreen detection error: {e}")
            return {
                'success': False,
                'error': f'Blackscreen detection failed: {str(e)}',
                'analysis_type': 'blackscreen_detection'
            }

    def detect_freeze(self, image_paths: List[str] = None, freeze_threshold: float = 1.0) -> Dict[str, Any]:
        """
        Detect if images are frozen (identical frames) - Check multiple frames with caching.
        
        Args:
            image_paths: List of image paths to analyze, or None to use last captures
            freeze_threshold: Threshold for frame difference detection
            
        Returns:
            Dictionary with detailed freeze analysis results
        """
        try:
            # Determine which images to analyze
            if image_paths is None or len(image_paths) == 0:
                # Only check connection when we need to capture screenshots
                if not self.is_connected:
                    print(f"VideoVerify[{self.device_name}]: ERROR - Not connected for screenshot capture")
                    return {'success': False, 'error': 'Not connected for screenshot capture'}
                
                # Use multiple recent captures for freeze detection
                screenshots = []
                for i in range(3):  # Get 3 screenshots with delay
                    screenshot = self.capture_screenshot(f"freeze_analysis_{i}_{int(time.time())}.png")
                    if screenshot:
                        screenshots.append(screenshot)
                    if i < 2:  # Don't wait after last screenshot
                        time.sleep(1.0)  # Wait 1 second between captures
                
                if len(screenshots) < 2:
                    return {'success': False, 'error': 'Need at least 2 images for freeze detection'}
                
                image_paths = screenshots
            
            if len(image_paths) < 2:
                return {'success': False, 'error': 'Need at least 2 images for freeze detection'}
            
            results = []
            comparisons = []
            
            # Load all images first
            images = []
            for image_path in image_paths:
                if not os.path.exists(image_path):
                    return {'success': False, 'error': f'Image file not found: {image_path}'}
                
                img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
                if img is None:
                    return {'success': False, 'error': f'Could not load image: {image_path}'}
                
                images.append({
                    'path': image_path,
                    'image': img,
                    'filename': os.path.basename(image_path)
                })
            
            # Compare consecutive frames
            for i in range(len(images) - 1):
                img1 = images[i]
                img2 = images[i + 1]
                
                # Check if images have same dimensions
                if img1['image'].shape != img2['image'].shape:
                    return {'success': False, 'error': f'Image dimensions don\'t match: {img1["image"].shape} vs {img2["image"].shape}'}
                
                # Optimized sampling for pixel difference (every 10th pixel for performance)
                sample_rate = SAMPLING_PATTERNS["freeze_sample_rate"]
                img1_sampled = img1['image'][::sample_rate, ::sample_rate]
                img2_sampled = img2['image'][::sample_rate, ::sample_rate]
                
                # Calculate difference
                diff = cv2.absdiff(img1_sampled, img2_sampled)
                mean_diff = np.mean(diff)
                
                comparison = {
                    'frame1': img1['filename'],
                    'frame2': img2['filename'],
                    'mean_difference': round(float(mean_diff), 2),
                    'is_frozen': bool(mean_diff < freeze_threshold),
                    'threshold': freeze_threshold
                }
                
                comparisons.append(comparison)
                
                print(f"VideoVerify[{self.device_name}]: Frame comparison {img1['filename']} vs {img2['filename']}: diff={mean_diff:.2f}")
            
            # Determine overall freeze status
            # Frames are considered frozen if ALL comparisons show very small differences
            all_frozen = all(comp['is_frozen'] for comp in comparisons)
            frozen_count = sum(1 for comp in comparisons if comp['is_frozen'])
            
            # Note: Multi-frame subtitle analysis could be added here if needed
            
            overall_result = {
                'success': True,
                'freeze_detected': all_frozen,
                'analyzed_images': len(images),
                'frame_comparisons': len(comparisons),
                'frozen_comparisons': frozen_count,
                'freeze_threshold': freeze_threshold,
                'comparisons': comparisons,
                'confidence': 0.9 if all_frozen else 0.1,
                'analysis_type': 'freeze_detection',
                'timestamp': datetime.now().isoformat()
            }
            
            return overall_result
            
        except Exception as e:
            print(f"VideoVerify[{self.device_name}]: Freeze detection error: {e}")
            return {
                'success': False,
                'error': f'Freeze detection failed: {str(e)}',
                'analysis_type': 'freeze_detection'
            }

    def detect_subtitles(self, image_paths: List[str] = None, extract_text: bool = True) -> Dict[str, Any]:
        """
        Detect subtitles and error messages - Optimized with region processing and sampling.
        
        Args:
            image_paths: List of image paths to analyze, or None to use last capture
            extract_text: Whether to extract text using OCR
            
        Returns:
            Dictionary with detailed subtitle analysis results
        """
        try:
            # Determine which images to analyze
            if image_paths is None or len(image_paths) == 0:
                # Only check connection when we need to capture screenshots
                if not self.is_connected:
                    print(f"VideoVerify[{self.device_name}]: ERROR - Not connected for screenshot capture")
                    return {'success': False, 'error': 'Not connected for screenshot capture'}
                
                # Use last available capture
                screenshot = self.capture_screenshot()
                if not screenshot:
                    return {'success': False, 'error': 'Failed to capture screenshot'}
                image_paths = [screenshot]
            
            results = []
            
            for image_path in image_paths:
                if not os.path.exists(image_path):
                    results.append({
                        'image_path': image_path,
                        'success': False,
                        'error': 'Image file not found'
                    })
                    continue
                
                try:
                    img = cv2.imread(image_path)
                    if img is None:
                        results.append({
                            'image_path': image_path,
                            'success': False,
                            'error': 'Could not load image'
                        })
                        continue
                    
                    height, width = img.shape[:2]
                    
                    # Enhanced subtitle detection with adaptive region processing
                    # Expanded to capture 2-line subtitles - start from 70% to bottom (30% of screen height)
                    subtitle_height_start = int(height * 0.7)
                    subtitle_width_start = int(width * 0.2)  # Skip left 20%
                    subtitle_width_end = int(width * 0.8)    # Skip right 20%
                    
                    subtitle_region = img[subtitle_height_start:, subtitle_width_start:subtitle_width_end]
                    gray_subtitle = cv2.cvtColor(subtitle_region, cv2.COLOR_BGR2GRAY)
                    
                    # Apply adaptive thresholding before edge detection for better text extraction
                    adaptive_thresh = cv2.adaptiveThreshold(gray_subtitle, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                                          cv2.THRESH_BINARY, 11, 2)
                    edges = cv2.Canny(adaptive_thresh, 50, 150)
                    subtitle_edges = np.sum(edges > 0)
                    
                    # Dynamic threshold based on region size
                    region_pixels = subtitle_region.shape[0] * subtitle_region.shape[1]
                    adaptive_threshold = max(SAMPLING_PATTERNS["subtitle_edge_threshold"], region_pixels * 0.002)
                    has_subtitles = bool(subtitle_edges > adaptive_threshold)
                    
                    # Error detection - look for prominent red content
                    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
                    
                    # Use configurable grid sampling rate
                    grid_rate = SAMPLING_PATTERNS["error_grid_rate"]
                    sampled_hsv = hsv[::grid_rate, ::grid_rate]
                    
                    # Red color range in HSV - more restrictive for actual error messages
                    lower_red1 = np.array([0, 100, 100])
                    upper_red1 = np.array([10, 255, 255])
                    lower_red2 = np.array([170, 100, 100])
                    upper_red2 = np.array([180, 255, 255])
                    
                    mask1 = cv2.inRange(sampled_hsv, lower_red1, upper_red1)
                    mask2 = cv2.inRange(sampled_hsv, lower_red2, upper_red2)
                    red_mask = mask1 + mask2
                    
                    red_pixels = np.sum(red_mask > 0)
                    total_sampled_pixels = sampled_hsv.shape[0] * sampled_hsv.shape[1]
                    red_percentage = float((red_pixels / total_sampled_pixels) * 100)
                    
                    # Higher threshold for error detection
                    has_errors = bool(red_percentage > 8.0)
                    
                    # Extract text if requested and subtitles detected
                    extracted_text = ""
                    detected_language = "unknown"
                    if extract_text and has_subtitles and OCR_AVAILABLE:
                        extracted_text = self._extract_text_from_region(subtitle_region)
                        if extracted_text:
                            detected_language = self._detect_language(extracted_text)
                            print(f"VideoVerify[{self.device_name}]: Extracted subtitle text: '{extracted_text}' -> Language: {detected_language}")
                        else:
                            # If no text extracted, then no real subtitles detected
                            print(f"VideoVerify[{self.device_name}]: Edge detection found {subtitle_edges} edges (threshold: {adaptive_threshold:.0f}) but OCR found no text - likely false positive")
                            has_subtitles = False
                    elif extract_text and has_subtitles and not OCR_AVAILABLE:
                        # If OCR is not available but we want text extraction, we can't verify subtitles
                        print(f"VideoVerify[{self.device_name}]: OCR not available - cannot verify subtitle text")
                        # Keep has_subtitles as True since we detected edges but can't verify text
                    
                    # Calculate confidence based on actual findings
                    if has_subtitles and extracted_text:
                        confidence = 0.9  # High confidence when we have both edges and text
                    elif has_subtitles and not extract_text:
                        confidence = 0.7  # Medium confidence when we have edges but didn't try OCR
                    elif has_errors:
                        confidence = 0.8  # High confidence for error detection
                    elif subtitle_edges > adaptive_threshold and not extracted_text and extract_text:
                        confidence = 0.2  # Low confidence when edges detected but no text found (likely false positive)
                    else:
                        confidence = 0.1  # Low confidence when nothing detected
                    
                    result = {
                        'image_path': os.path.basename(image_path),
                        'success': True,
                        'has_subtitles': has_subtitles,
                        'has_errors': has_errors,
                        'subtitle_edges': int(subtitle_edges),
                        'subtitle_threshold': float(adaptive_threshold),
                        'red_percentage': round(red_percentage, 2),
                        'error_threshold': 8.0,
                        'extracted_text': extracted_text,
                        'detected_language': detected_language,
                        'subtitle_region_size': f"{subtitle_region.shape[1]}x{subtitle_region.shape[0]}",
                        'image_size': f"{width}x{height}",
                        'confidence': confidence,
                        'ocr_available': OCR_AVAILABLE
                    }
                    
                    results.append(result)
                    
                    text_preview = extracted_text[:50] + "..." if len(extracted_text) > 50 else extracted_text
                    print(f"VideoVerify[{self.device_name}]: Subtitle analysis - edges={subtitle_edges}, threshold={adaptive_threshold:.0f}, subtitles={has_subtitles}, errors={has_errors}, text='{text_preview}', confidence={confidence}")
                    
                except Exception as e:
                    results.append({
                        'image_path': image_path,
                        'success': False,
                        'error': f'Analysis error: {str(e)}'
                    })
            
            # Calculate overall result
            successful_analyses = [r for r in results if r.get('success')]
            subtitles_detected = any(r.get('has_subtitles', False) for r in successful_analyses)
            errors_detected = any(r.get('has_errors', False) for r in successful_analyses)
            
            # Combine all extracted text and find the most confident language detection
            all_extracted_text = " ".join([r.get('extracted_text', '') for r in successful_analyses if r.get('extracted_text')])
            
            # Get the language from the result with highest confidence and subtitles detected
            detected_language = 'unknown'
            for result in successful_analyses:
                if result.get('has_subtitles') and result.get('detected_language') != 'unknown':
                    detected_language = result.get('detected_language')
                    break
            
            overall_result = {
                'success': len(successful_analyses) > 0,
                'subtitles_detected': subtitles_detected,
                'errors_detected': errors_detected,
                'analyzed_images': len(results),
                'successful_analyses': len(successful_analyses),
                'combined_extracted_text': all_extracted_text.strip(),
                'detected_language': detected_language,
                'results': results,
                'analysis_type': 'subtitle_detection',
                'timestamp': datetime.now().isoformat()
            }
            
            return overall_result
            
        except Exception as e:
            print(f"VideoVerify[{self.device_name}]: Subtitle detection error: {e}")
            return {
                'success': False,
                'error': f'Subtitle detection failed: {str(e)}',
                'analysis_type': 'subtitle_detection'
            }

    def _extract_text_from_region(self, region_image) -> str:
        """Extract text from subtitle region using OCR"""
        if not OCR_AVAILABLE:
            return ''
        
        try:
            # Convert to grayscale for better OCR
            gray_region = cv2.cvtColor(region_image, cv2.COLOR_BGR2GRAY)
            
            # Enhance contrast for better text recognition
            enhanced = cv2.convertScaleAbs(gray_region, alpha=2.0, beta=0)
            
            # Apply threshold to get better text
            _, thresh = cv2.threshold(enhanced, 127, 255, cv2.THRESH_BINARY)
            
            # Extract text using OCR
            text = pytesseract.image_to_string(thresh, config='--psm 6')
            text = text.strip()
            
            # Basic text validation
            if len(text) < 3:
                return ''
            
            # Clean and filter the text for better language detection
            cleaned_text = self._clean_ocr_text(text)
            
            # Return cleaned text if it has meaningful content
            if len(cleaned_text) >= 3:
                return cleaned_text
            else:
                # If cleaned text is too short, return original for display but it won't be good for language detection
                return text
            
        except Exception as e:
            print(f"VideoVerify[{self.device_name}]: Text extraction error: {e}")
            return ''

    def _clean_ocr_text(self, text: str) -> str:
        """Clean OCR text by removing noise and keeping only meaningful words"""
        if not text:
            return ''
        
        # Remove newlines and extra whitespace
        text = re.sub(r'\s+', ' ', text.replace('\n', ' ')).strip()
        
        # Split into words and filter out noise
        words = text.split()
        cleaned_words = []
        
        for word in words:
            # Remove common OCR noise patterns
            cleaned_word = re.sub(r'[^\w\s\'-]', '', word)  # Keep letters, numbers, apostrophes, hyphens
            cleaned_word = cleaned_word.strip()
            
            # Keep words that are:
            # - At least 2 characters long
            # - Contain at least one letter
            # - Are not just numbers or symbols
            if (len(cleaned_word) >= 2 and 
                re.search(r'[a-zA-ZÀ-ÿ]', cleaned_word) and  # Contains letters (including accented)
                not cleaned_word.isdigit()):  # Not just numbers
                cleaned_words.append(cleaned_word)
        
        return ' '.join(cleaned_words)

    def _detect_language(self, text: str) -> str:
        """Detect language of extracted text"""
        if not LANG_DETECT_AVAILABLE or not text:
            return 'unknown'
        
        try:
            # Clean the text for better language detection
            cleaned_text = self._clean_ocr_text(text)
            
            # Use cleaned text for detection, but fall back to original if cleaning removed too much
            detection_text = cleaned_text if len(cleaned_text) >= 6 else text
            
            # Check word count - need at least 3 meaningful words for detection
            words = detection_text.split()
            if len(words) < 3:
                return 'unknown'
            
            # For shorter text (3-5 words), try to detect anyway but with lower confidence
            # For longer text (6+ words), use standard detection
            
            print(f"VideoVerify[{self.device_name}]: Language detection - original: '{text[:50]}...', cleaned: '{detection_text[:50]}...', words: {len(words)}")
            
            # Detect language
            detected_lang = detect(detection_text)
            
            # Only allow specific languages - map to full names
            allowed_languages = {
                'en': 'English',
                'fr': 'French', 
                'de': 'German',
                'it': 'Italian',
                'es': 'Spanish',
                'pt': 'Portuguese',
                'nl': 'Dutch'
            }
            
            result = allowed_languages.get(detected_lang, 'unknown')
            print(f"VideoVerify[{self.device_name}]: Language detected: {detected_lang} -> {result}")
            
            return result
            
        except (LangDetectException, Exception) as e:
            print(f"VideoVerify[{self.device_name}]: Language detection error: {e}")
            return 'unknown'

    def _analyze_subtitle_with_ai(self, region_image) -> Tuple[str, str, float]:
        """
        AI-powered subtitle analysis using OpenRouter - equivalent to _extract_text_from_region
        
        Args:
            region_image: Cropped subtitle region image (same as OCR method)
            
        Returns:
            Tuple of (extracted_text, detected_language, confidence)
        """
        try:
            import os
            import base64
            import requests
            import tempfile
            
            # Get API key from environment
            api_key = os.getenv('OPENROUTER_API_KEY')
            if not api_key:
                print(f"VideoVerify[{self.device_name}]: OpenRouter API key not found in environment")
                return '', 'unknown', 0.0
            
            # Save cropped region to temporary file for encoding
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp_file:
                cv2.imwrite(tmp_file.name, region_image)
                temp_path = tmp_file.name
            
            try:
                # Encode image to base64
                with open(temp_path, 'rb') as f:
                    image_data = base64.b64encode(f.read()).decode()
                
                # Enhanced prompt for subtitle analysis with stronger JSON enforcement
                prompt = """You are a subtitle detection system. Analyze this image for subtitles in the bottom portion.

CRITICAL: You MUST respond with ONLY valid JSON. No other text before or after.

Required JSON format:
{
  "subtitles_detected": true,
  "extracted_text": "exact subtitle text here",
  "detected_language": "German",
  "confidence": 0.95
}

If no subtitles found:
{
  "subtitles_detected": false,
  "extracted_text": "",
  "detected_language": "unknown",
  "confidence": 0.1
}

Languages: English, French, German, Spanish, Italian, Portuguese, Dutch, or unknown
JSON ONLY - NO OTHER TEXT"""
                
                # Call OpenRouter API
                response = requests.post(
                    'https://openrouter.ai/api/v1/chat/completions',
                    headers={
                        'Authorization': f'Bearer {api_key}',
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://automai.dev',
                        'X-Title': 'AutomAI-VirtualPyTest'
                    },
                    json={
                        'model': 'qwen/qwen-2-vl-7b-instruct',
                        'messages': [
                            {
                                'role': 'user',
                                'content': [
                                    {'type': 'text', 'text': prompt},
                                    {'type': 'image_url', 'image_url': {'url': f'data:image/jpeg;base64,{image_data}'}}
                                ]
                            }
                        ],
                        'max_tokens': 300,
                        'temperature': 0.0
                    },
                    timeout=30
                )
                
                if response.status_code == 200:
                    result = response.json()
                    content = result['choices'][0]['message']['content']
                    
                    # Parse JSON response with fallback logic
                    import json
                    try:
                        # Try to parse as JSON first
                        ai_result = json.loads(content)
                        
                        subtitles_detected = ai_result.get('subtitles_detected', False)
                        extracted_text = ai_result.get('extracted_text', '').strip()
                        detected_language = ai_result.get('detected_language', 'unknown')
                        confidence = float(ai_result.get('confidence', 0.0))
                        
                        if not subtitles_detected or not extracted_text:
                            print(f"VideoVerify[{self.device_name}]: AI found no subtitles")
                            return '', 'unknown', 0.0
                        
                        print(f"VideoVerify[{self.device_name}]: AI extracted subtitle text: '{extracted_text}' -> Language: {detected_language}, Confidence: {confidence}")
                        
                        return extracted_text, detected_language, confidence
                        
                    except json.JSONDecodeError as e:
                        print(f"VideoVerify[{self.device_name}]: Failed to parse AI JSON response: {e}")
                        print(f"VideoVerify[{self.device_name}]: Raw AI response: {content[:200]}...")
                        
                        # Fallback: try to extract information from natural language response
                        extracted_text, detected_language, confidence = self._parse_natural_language_response(content)
                        
                        if extracted_text:
                            print(f"VideoVerify[{self.device_name}]: Fallback extraction successful: '{extracted_text}' -> Language: {detected_language}")
                            return extracted_text, detected_language, confidence
                        else:
                            print(f"VideoVerify[{self.device_name}]: Fallback extraction failed")
                            return '', 'unknown', 0.0
                else:
                    print(f"VideoVerify[{self.device_name}]: OpenRouter API error: {response.status_code} - {response.text}")
                    return '', 'unknown', 0.0
                    
            finally:
                # Clean up temporary file
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
                    
        except Exception as e:
            print(f"VideoVerify[{self.device_name}]: AI subtitle analysis error: {e}")
            return '', 'unknown', 0.0

    def _parse_natural_language_response(self, content: str) -> Tuple[str, str, float]:
        """
        Parse natural language AI response to extract subtitle information.
        
        Args:
            content: Raw AI response content
            
        Returns:
            Tuple of (extracted_text, detected_language, confidence)
        """
        try:
            content_lower = content.lower()
            
            # Check if subtitles were mentioned as present
            subtitle_indicators = ['subtitle', 'text reads', 'says', 'displays', 'shows']
            has_subtitle_mention = any(indicator in content_lower for indicator in subtitle_indicators)
            
            if not has_subtitle_mention:
                return '', 'unknown', 0.0
            
            # Extract text between quotes
            import re
            
            # Look for text in quotes (various quote types)
            quote_patterns = [
                r'"([^"]+)"',           # Double quotes
                r"'([^']+)'",           # Single quotes  
                r'"([^"]+)"',           # Curly quotes
                r'„([^"]+)"',           # German quotes
                r'«([^»]+)»',           # French quotes
            ]
            
            extracted_text = ''
            for pattern in quote_patterns:
                matches = re.findall(pattern, content)
                if matches:
                    # Take the longest match (likely the subtitle text)
                    extracted_text = max(matches, key=len).strip()
                    break
            
            # If no quotes found, try to extract after "reads:" or "says:"
            if not extracted_text:
                read_patterns = [
                    r'text reads:?\s*(.+?)(?:\.|$)',
                    r'says:?\s*(.+?)(?:\.|$)', 
                    r'displays:?\s*(.+?)(?:\.|$)',
                    r'shows:?\s*(.+?)(?:\.|$)'
                ]
                
                for pattern in read_patterns:
                    matches = re.findall(pattern, content, re.IGNORECASE)
                    if matches:
                        extracted_text = matches[0].strip()
                        # Remove quotes if they exist
                        extracted_text = re.sub(r'^["\'"„«]|["\'"„»]$', '', extracted_text)
                        break
            
            # Clean up the extracted text
            if extracted_text:
                # Remove common OCR artifacts and clean the text
                extracted_text = re.sub(r'\s+', ' ', extracted_text).strip()
                
                # Validate the text (should be at least 3 characters)
                if len(extracted_text) < 3:
                    return '', 'unknown', 0.0
            
            # Detect language from the response content
            detected_language = 'unknown'
            language_mentions = {
                'german': 'German',
                'deutsch': 'German', 
                'english': 'English',
                'french': 'French',
                'français': 'French',
                'spanish': 'Spanish',
                'español': 'Spanish',
                'italian': 'Italian',
                'italiano': 'Italian',
                'portuguese': 'Portuguese',
                'português': 'Portuguese',
                'dutch': 'Dutch',
                'nederlands': 'Dutch'
            }
            
            for lang_key, lang_name in language_mentions.items():
                if lang_key in content_lower:
                    detected_language = lang_name
                    break
            
            # If we found text, try to detect language from the text itself
            if extracted_text and detected_language == 'unknown':
                detected_language = self._detect_language(extracted_text)
            
            # Set confidence based on what we found
            if extracted_text and detected_language != 'unknown':
                confidence = 0.8  # High confidence when we have both text and language
            elif extracted_text:
                confidence = 0.6  # Medium confidence when we have text but no language
            else:
                confidence = 0.1  # Low confidence
            
            return extracted_text, detected_language, confidence
            
        except Exception as e:
            print(f"VideoVerify[{self.device_name}]: Natural language parsing error: {e}")
            return '', 'unknown', 0.0

    def detect_subtitles_ai(self, image_paths: List[str] = None, extract_text: bool = True) -> Dict[str, Any]:
        """
        AI-powered subtitle detection using OpenRouter - exact copy of detect_subtitles() workflow
        
        Args:
            image_paths: List of image paths to analyze, or None to use last capture
            extract_text: Whether to extract text using AI (always True for AI method)
            
        Returns:
            Dictionary with detailed AI subtitle analysis results
        """
        try:
            # Determine which images to analyze (same logic as detect_subtitles)
            if image_paths is None or len(image_paths) == 0:
                # Only check connection when we need to capture screenshots
                if not self.is_connected:
                    print(f"VideoVerify[{self.device_name}]: ERROR - Not connected for screenshot capture")
                    return {'success': False, 'error': 'Not connected for screenshot capture'}
                
                # Use last available capture
                screenshot = self.capture_screenshot()
                if not screenshot:
                    return {'success': False, 'error': 'Failed to capture screenshot'}
                image_paths = [screenshot]
            
            results = []
            
            for image_path in image_paths:
                if not os.path.exists(image_path):
                    results.append({
                        'image_path': image_path,
                        'success': False,
                        'error': 'Image file not found'
                    })
                    continue
                
                try:
                    img = cv2.imread(image_path)
                    if img is None:
                        results.append({
                            'image_path': image_path,
                            'success': False,
                            'error': 'Could not load image'
                        })
                        continue
                    
                    height, width = img.shape[:2]
                    
                    # Enhanced subtitle detection with adaptive region processing (same as OCR method)
                    # Expanded to capture 2-line subtitles - start from 70% to bottom (30% of screen height)
                    subtitle_height_start = int(height * 0.7)
                    subtitle_width_start = int(width * 0.2)  # Skip left 20%
                    subtitle_width_end = int(width * 0.8)    # Skip right 20%
                    
                    subtitle_region = img[subtitle_height_start:, subtitle_width_start:subtitle_width_end]
                    
                    # AI-powered subtitle analysis
                    extracted_text, detected_language, ai_confidence = self._analyze_subtitle_with_ai(subtitle_region)
                    
                    # Determine if subtitles were detected
                    has_subtitles = bool(extracted_text and len(extracted_text.strip()) > 0)
                    
                    # Error detection (same logic as OCR method for consistency)
                    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
                    
                    # Use configurable grid sampling rate
                    grid_rate = SAMPLING_PATTERNS["error_grid_rate"]
                    sampled_hsv = hsv[::grid_rate, ::grid_rate]
                    
                    # Red color range in HSV - more restrictive for actual error messages
                    lower_red1 = np.array([0, 100, 100])
                    upper_red1 = np.array([10, 255, 255])
                    lower_red2 = np.array([170, 100, 100])
                    upper_red2 = np.array([180, 255, 255])
                    
                    mask1 = cv2.inRange(sampled_hsv, lower_red1, upper_red1)
                    mask2 = cv2.inRange(sampled_hsv, lower_red2, upper_red2)
                    red_mask = mask1 + mask2
                    
                    red_pixels = np.sum(red_mask > 0)
                    total_sampled_pixels = sampled_hsv.shape[0] * sampled_hsv.shape[1]
                    red_percentage = float((red_pixels / total_sampled_pixels) * 100)
                    
                    # Higher threshold for error detection
                    has_errors = bool(red_percentage > 8.0)
                    
                    # Use AI confidence or set default
                    confidence = ai_confidence if has_subtitles else 0.1
                    
                    result = {
                        'image_path': os.path.basename(image_path),
                        'success': True,
                        'has_subtitles': has_subtitles,
                        'has_errors': has_errors,
                        'subtitle_edges': 0,  # Not applicable for AI method
                        'subtitle_threshold': 0.0,  # Not applicable for AI method
                        'red_percentage': round(red_percentage, 2),
                        'error_threshold': 8.0,
                        'extracted_text': extracted_text,
                        'detected_language': detected_language,
                        'subtitle_region_size': f"{subtitle_region.shape[1]}x{subtitle_region.shape[0]}",
                        'image_size': f"{width}x{height}",
                        'confidence': confidence,
                        'ai_powered': True  # Flag to indicate AI analysis
                    }
                    
                    results.append(result)
                    
                    text_preview = extracted_text[:50] + "..." if len(extracted_text) > 50 else extracted_text
                    print(f"VideoVerify[{self.device_name}]: AI Subtitle analysis - subtitles={has_subtitles}, errors={has_errors}, text='{text_preview}', confidence={confidence}")
                    
                except Exception as e:
                    results.append({
                        'image_path': image_path,
                        'success': False,
                        'error': f'AI analysis error: {str(e)}'
                    })
            
            # Calculate overall result (same logic as OCR method)
            successful_analyses = [r for r in results if r.get('success')]
            subtitles_detected = any(r.get('has_subtitles', False) for r in successful_analyses)
            errors_detected = any(r.get('has_errors', False) for r in successful_analyses)
            
            # Combine all extracted text and find the most confident language detection
            all_extracted_text = " ".join([r.get('extracted_text', '') for r in successful_analyses if r.get('extracted_text')])
            
            # Get the language from the result with highest confidence and subtitles detected
            detected_language = 'unknown'
            for result in successful_analyses:
                if result.get('has_subtitles') and result.get('detected_language') != 'unknown':
                    detected_language = result.get('detected_language')
                    break
            
            overall_result = {
                'success': len(successful_analyses) > 0,
                'subtitles_detected': subtitles_detected,
                'errors_detected': errors_detected,
                'analyzed_images': len(results),
                'successful_analyses': len(successful_analyses),
                'combined_extracted_text': all_extracted_text.strip(),
                'detected_language': detected_language,
                'results': results,
                'analysis_type': 'ai_subtitle_detection',
                'timestamp': datetime.now().isoformat()
            }
            
            return overall_result
            
        except Exception as e:
            print(f"VideoVerify[{self.device_name}]: AI subtitle detection error: {e}")
            return {
                'success': False,
                'error': f'AI subtitle detection failed: {str(e)}',
                'analysis_type': 'ai_subtitle_detection'
            }

    def analyze_image_with_ai(self, image_path: str, user_question: str) -> str:
        """
        Analyze full image with AI using user's question.
        
        Args:
            image_path: Path to image file
            user_question: User's question about the image
            
        Returns:
            AI's text response (max 3 lines) or empty string if failed
        """
        try:
            import os
            import base64
            import requests
            import tempfile
            
            print(f"VideoVerify[{self.device_name}]: AI image analysis - Question: '{user_question}'")
            
            # Check if image exists
            if not os.path.exists(image_path):
                print(f"VideoVerify[{self.device_name}]: Image file not found: {image_path}")
                return "Image file not found."
            
            # Get API key from environment
            api_key = os.getenv('OPENROUTER_API_KEY')
            if not api_key:
                print(f"VideoVerify[{self.device_name}]: OpenRouter API key not found in environment")
                return "AI service not available."
            
            # Get device model context from AV controller
            device_model = "unknown device"
            device_context = "a device screen"
            
            if hasattr(self.av_controller, 'device_model') and self.av_controller.device_model:
                device_model = self.av_controller.device_model
                
                # Provide helpful context based on device model
                model_lower = device_model.lower()
                if "mobile" in model_lower or "phone" in model_lower:
                    device_context = "an Android mobile phone screen"
                elif "fire" in model_lower or "tv" in model_lower:
                    device_context = "a Fire TV/Android TV screen"
                elif "tablet" in model_lower:
                    device_context = "a tablet screen"
                else:
                    device_context = f"a {device_model} device screen"
            
            # Load and encode the full image
            try:
                # Read the image file directly
                with open(image_path, 'rb') as f:
                    image_data = base64.b64encode(f.read()).decode()
                
                # Enhanced prompt with device model and context
                prompt = f"""You are analyzing a screenshot from {device_context} (device model: {device_model}).

This image was captured from a controlled device during automated testing/monitoring.

User question: "{user_question}"

Provide a clear, concise answer in maximum 3 lines.
Be specific about what you see on the device interface."""
                
                # Call OpenRouter API
                response = requests.post(
                    'https://openrouter.ai/api/v1/chat/completions',
                    headers={
                        'Authorization': f'Bearer {api_key}',
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://automai.dev',
                        'X-Title': 'AutomAI-VirtualPyTest'
                    },
                    json={
                        'model': 'qwen/qwen-2-vl-7b-instruct',
                        'messages': [
                            {
                                'role': 'user',
                                'content': [
                                    {'type': 'text', 'text': prompt},
                                    {'type': 'image_url', 'image_url': {'url': f'data:image/jpeg;base64,{image_data}'}}
                                ]
                            }
                        ],
                        'max_tokens': 200,
                        'temperature': 0.0
                    },
                    timeout=30
                )
                
                if response.status_code == 200:
                    result = response.json()
                    ai_response = result['choices'][0]['message']['content'].strip()
                    
                    # Limit to 3 lines maximum
                    lines = ai_response.split('\n')
                    if len(lines) > 3:
                        ai_response = '\n'.join(lines[:3])
                    
                    print(f"VideoVerify[{self.device_name}]: AI response: '{ai_response}'")
                    return ai_response
                else:
                    print(f"VideoVerify[{self.device_name}]: OpenRouter API error: {response.status_code}")
                    return "AI service error. Please try again."
                    
            except Exception as e:
                print(f"VideoVerify[{self.device_name}]: Image processing error: {e}")
                return "Failed to process image."
                
        except Exception as e:
            print(f"VideoVerify[{self.device_name}]: AI image analysis error: {e}")
            return "Analysis error. Please try again."


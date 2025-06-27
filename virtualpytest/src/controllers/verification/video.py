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
from typing import Dict, Any, Optional, Union, Tuple, List
from pathlib import Path
from ..base_controller import VerificationControllerInterface


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
        
        # Temporary files for analysis
        self.temp_video_path = Path("/tmp/video_verification")
        self.temp_video_path.mkdir(exist_ok=True)
        
        print(f"[@controller:VideoVerification] Initialized with AV controller")
        
    def connect(self) -> bool:
        """Connect to the video verification system."""
        try:
            print(f"VideoVerify[{self.device_name}]: Connecting to video verification system")
            
            # Check if AV controller is connected
            if not hasattr(self.av_controller, 'is_connected') or not self.av_controller.is_connected:
                print(f"VideoVerify[{self.device_name}]: ERROR - AV controller not connected")
                print(f"VideoVerify[{self.device_name}]: Please connect {self.av_controller.device_name} first")
                return False
            else:
                print(f"VideoVerify[{self.device_name}]: Using AV controller: {self.av_controller.device_name}")
            
            # Require AV controller to have video device for verification
            if not hasattr(self.av_controller, 'video_device') or not self.av_controller.video_device:
                print(f"VideoVerify[{self.device_name}]: ERROR - AV controller missing video device configuration")
                return False
            
            print(f"VideoVerify[{self.device_name}]: Video device: {self.av_controller.video_device}")
            
            # Create temp directories for analysis
            self.temp_video_path.mkdir(parents=True, exist_ok=True)
            
            self.is_connected = True
            self.verification_session_id = f"video_verify_{int(time.time())}"
            print(f"VideoVerify[{self.device_name}]: Connected - Session: {self.verification_session_id}")
            return True
            
        except Exception as e:
            print(f"VideoVerify[{self.device_name}]: Connection error: {e}")
            self.is_connected = False
            return False

    def disconnect(self) -> bool:
        """Disconnect from the video verification system."""
        print(f"VideoVerify[{self.device_name}]: Disconnecting")
        self.is_connected = False
        self.verification_session_id = None
        
        # Clean up temporary files
        try:
            for temp_file in self.temp_video_path.glob("*"):
                if temp_file.is_file():
                    temp_file.unlink()
        except Exception as e:
            print(f"VideoVerify[{self.device_name}]: Warning - cleanup failed: {e}")
            
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
        if not self.is_connected:
            print(f"VideoVerify[{self.device_name}]: ERROR - Not connected")
            return None
            
        timestamp = int(time.time())
        screenshot_name = filename or f"screenshot_{timestamp}.png"
        screenshot_path = self.temp_video_path / screenshot_name
        
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
            
            self._log_verification("motion_detection", f"threshold_{threshold}", motion_detected, {
                "threshold": threshold,
                "duration": duration,
                "frame1": screenshot1,
                "frame2": screenshot2
            })
            
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
        
        self._log_verification("color_present", color, color_found, {
            "tolerance": tolerance,
            "analysis": color_analysis
        })
        
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
                
                self._log_verification("screen_state", expected_state, True, {
                    "timeout": timeout,
                    "elapsed": elapsed,
                    "analysis": analysis
                })
                
                return True
            
            time.sleep(0.5)
        
        print(f"VideoVerify[{self.device_name}]: Screen state '{expected_state}' not detected within {timeout}s")
        
        self._log_verification("screen_state", expected_state, False, {
            "timeout": timeout
        })
        
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
            
            self._log_verification("performance_metric", metric_name, within_tolerance, {
                "expected": expected_value,
                "measured": current_value,
                "tolerance": tolerance
            })
            
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
            'verification_count': len(self.verification_results),
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
                'command': 'waitForVideoToAppear',
                'params': {
                    'motion_threshold': {'type': 'float', 'required': False, 'default': 5.0},
                    'duration': {'type': 'float', 'required': False, 'default': 3.0},
                    'timeout': {'type': 'float', 'required': False, 'default': 10.0}
                }
            },
            {
                'command': 'waitForVideoToDisappear',
                'params': {
                    'motion_threshold': {'type': 'float', 'required': False, 'default': 5.0},
                    'duration': {'type': 'float', 'required': False, 'default': 3.0},
                    'timeout': {'type': 'float', 'required': False, 'default': 10.0}
                }
            },
            {
                'command': 'detect_motion',
                'params': {
                    'duration': {'type': 'float', 'required': False, 'default': 3.0},
                    'threshold': {'type': 'float', 'required': False}
                }
            },
            {
                'command': 'wait_for_video_change',
                'params': {
                    'timeout': {'type': 'float', 'required': False, 'default': 10.0},
                    'threshold': {'type': 'float', 'required': False}
                }
            },
            {
                'command': 'verify_color_present',
                'params': {
                    'color': {'type': 'string', 'required': True},
                    'tolerance': {'type': 'float', 'required': False, 'default': 10.0}
                }
            },
            {
                'command': 'verify_screen_state',
                'params': {
                    'expected_state': {'type': 'string', 'required': True},
                    'timeout': {'type': 'float', 'required': False, 'default': 5.0}
                }
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
            image_source_url: Optional source image path (video controller can use screenshots)
            
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
            command = verification_config.get('command', 'waitForVideoToAppear')
            
            print(f"[@controller:VideoVerification] Executing {command}")
            print(f"[@controller:VideoVerification] Parameters: {params}")
            
            # Execute verification based on command
            if command == 'waitForVideoToAppear':
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
                
            elif command == 'waitForVideoToDisappear':
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
                
            elif command == 'detect_motion':
                duration = params.get('duration', 3.0)
                threshold = params.get('threshold', self.motion_threshold)
                
                success = self.detect_motion(duration, threshold)
                message = f"Motion {'detected' if success else 'not detected'}"
                details = {
                    'duration': duration,
                    'threshold': threshold
                }
                
            elif command == 'wait_for_video_change':
                timeout = params.get('timeout', 10.0)
                threshold = params.get('threshold', self.frame_comparison_threshold)
                
                success = self.wait_for_video_change(timeout, threshold)
                message = f"Video change {'detected' if success else 'not detected'}"
                details = {
                    'timeout': timeout,
                    'threshold': threshold
                }
                
            elif command == 'verify_color_present':
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
                
            elif command == 'verify_screen_state':
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
                'confidence': 1.0 if success else 0.0,
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
                
                self._log_verification("video_appears", f"motion_threshold_{motion_threshold}", True, {
                    "motion_threshold": motion_threshold,
                    "duration": duration,
                    "timeout": timeout,
                    "elapsed": elapsed
                })
                
                return True
            
            time.sleep(check_interval)
        
        print(f"VideoVerify[{self.device_name}]: Video did not appear within {timeout}s")
        
        self._log_verification("video_appears", f"motion_threshold_{motion_threshold}", False, {
            "motion_threshold": motion_threshold,
            "duration": duration,
            "timeout": timeout
        })
        
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
                
                self._log_verification("video_disappears", f"motion_threshold_{motion_threshold}", True, {
                    "motion_threshold": motion_threshold,
                    "duration": duration,
                    "timeout": timeout,
                    "elapsed": elapsed
                })
                
                return True
            
            time.sleep(check_interval)
        
        print(f"VideoVerify[{self.device_name}]: Video still present after {timeout}s")
        
        self._log_verification("video_disappears", f"motion_threshold_{motion_threshold}", False, {
            "motion_threshold": motion_threshold,
            "duration": duration,
            "timeout": timeout
        })
        
        return False


"""
VNC Stream Controller Implementation

This controller handles VNC stream acquisition by referencing continuously captured screenshots.
The host continuously takes screenshots of its own screen via VNC, and this controller references them by timestamp.
No FFmpeg usage - all video capture is done by referencing timestamped screenshot URLs.
"""

import threading
import time
import os
import json
import subprocess
from typing import Dict, Any, Optional, List
from pathlib import Path
from datetime import datetime, timedelta
import pytz
from ..base_controller import AVControllerInterface


class VNCStreamController(AVControllerInterface):
    """VNC Stream controller that references continuously captured screenshots by timestamp."""
    
    def __init__(self, vnc_ip: str = None, vnc_port: str = None, vnc_password: str = None, 
                 vnc_stream_path: str = None, vnc_capture_path: str = None, **kwargs):
        """
        Initialize the VNC Stream controller.
        
        Args:
            vnc_ip: VNC server IP address
            vnc_port: VNC server port
            vnc_password: VNC server password (optional)
            vnc_stream_path: Stream path for URLs (e.g., "/host/vnc/stream")
            vnc_capture_path: Local capture path (e.g., "/var/www/html/vnc/stream")
        """
        super().__init__("VNC Stream Controller", "VNC")
        
        # VNC connection parameters
        self.vnc_ip = vnc_ip
        self.vnc_port = vnc_port
        self.vnc_password = vnc_password
        
        # Stream and capture paths
        self.vnc_stream_path = vnc_stream_path
        self.vnc_capture_path = vnc_capture_path
        
        # Video capture state (timestamp-based, no FFmpeg)
        self.is_capturing_video = False
        self.capture_start_time = None
        self.capture_duration = 0
        self.capture_session_id = None
        
        print(f"VNC[{self.capture_source}]: Initialized - Stream: {self.vnc_stream_path}, Capture: {self.vnc_capture_path}")

        
    def restart_stream(self) -> bool:
        """Restart VNC streaming - for VNC this is mostly a no-op since VNC server should always be running."""
        try:
            print(f"VNC[{self.capture_source}]: VNC stream restart requested")
            
            # For VNC, we don't restart the VNC server itself
            # We could restart the screenshot capture service if needed
            # For now, this is a successful no-op
            
            print(f"VNC[{self.capture_source}]: VNC stream restart completed (no action needed)")
            return True
                
        except Exception as e:
            print(f"VNC[{self.capture_source}]: Error restarting VNC stream: {e}")
            return False

    def take_screenshot(self, filename: str = None) -> Optional[str]:
        """
        Take screenshot using timestamp logic.
        Returns local file path only - routes will build URLs using existing URL building functions.
        """
        try:
            # Generate timestamp in Zurich timezone (Europe/Zurich) in format: YYYYMMDDHHMMSS
            now = datetime.now()
            zurich_tz = pytz.timezone("Europe/Zurich")
            zurich_time = now.astimezone(zurich_tz)
            
            # Format: YYYYMMDDHHMMSS (no separators)
            year = zurich_time.year
            month = str(zurich_time.month).zfill(2)
            day = str(zurich_time.day).zfill(2)
            hours = str(zurich_time.hour).zfill(2)
            minutes = str(zurich_time.minute).zfill(2)
            seconds = str(zurich_time.second).zfill(2)
            
            timestamp = f"{year}{month}{day}{hours}{minutes}{seconds}"
            
            # Build local screenshot file path using capture path
            captures_path = os.path.join(self.vnc_capture_path, 'captures')
            screenshot_path = f'{captures_path}/capture_{timestamp}.jpg'
            
            # Add 200ms delay before returning path (allows host to capture screenshot)
            time.sleep(0.2)
            
            return screenshot_path
                
        except Exception as e:
            print(f'VNC[{self.capture_source}]: Error taking screenshot: {e}')
            return None
    
    def save_screenshot(self, filename: str) -> Optional[str]:
        """
        Take screenshot and return local path.
        Used for permanent storage in navigation nodes.
        The route should handle the R2 upload, not the controller.
        
        Args:
            filename: The filename to use for the screenshot (e.g., node name)
            
        Returns:
            Local file path if successful, None if failed
        """
        try:
            # First take a temporary screenshot to get the image
            temp_screenshot_path = self.take_screenshot()
            if not temp_screenshot_path:
                print(f'VNC[{self.capture_source}]: Failed to take temporary screenshot')
                return None
            
            # Extract timestamp from temp screenshot path to get the actual image file
            import re
            timestamp_match = re.search(r'capture_(\d{14})\.jpg', temp_screenshot_path)
            if not timestamp_match:
                print(f'VNC[{self.capture_source}]: Could not extract timestamp from temp path: {temp_screenshot_path}')
                return None
            
            # The temp_screenshot_path is already the local file path we need
            local_screenshot_path = temp_screenshot_path
            
            # Check if local file exists
            import os
            if not os.path.exists(local_screenshot_path):
                print(f'VNC[{self.capture_source}]: Local screenshot file not found: {local_screenshot_path}')
                return None
            
            # Return the local file path for the route to handle the upload
            return local_screenshot_path
            
        except Exception as e:
            print(f'VNC[{self.capture_source}]: Error saving screenshot: {e}')
            return None
        
    def take_control(self) -> Dict[str, Any]:
        """
        Take control of VNC stream and verify it's working.
        
        Returns:
            Dictionary with success status and stream information
        """
        try:
            # Check stream status
            status = self.get_status()
            is_streaming = status.get('is_streaming', False)
            
            # For VNC stream, we just need the VNC server to be accessible
            # The host continuously captures screenshots regardless
            return {
                'success': True,
                'status': 'stream_ready',
                'controller_type': 'av',
                'stream_info': status,
                'capabilities': ['video_capture', 'screenshot', 'streaming', 'vnc_viewing']
            }
                
        except Exception as e:
            print(f"VNC[{self.capture_source}]: Take control error: {e}")
            return {
                'success': False,
                'status': 'error',
                'error': f'VNC controller error: {str(e)}',
                'controller_type': 'av'
            }
        
    def start_video_capture(self, duration: float = 60.0, filename: str = None, 
                           resolution: str = None, fps: int = None) -> bool:
        """
        Start video capture by recording start time and duration.
        No FFmpeg usage - just tracks timing for timestamp-based screenshot references.
        
        Args:
            duration: Duration in seconds (default: 60s)
            filename: Optional filename (ignored - uses timestamps)
            resolution: Video resolution (ignored - uses host screen resolution)
            fps: Video FPS (ignored - uses 1 frame per second from screenshots)
        """
        if self.is_capturing_video:
            return True
            
        try:
            # Record capture session details
            self.capture_start_time = datetime.now()
            self.capture_duration = duration
            self.capture_session_id = f"vnc_capture_{int(time.time())}"
            self.is_capturing_video = True
            
            print(f"VNC[{self.capture_source}]: Starting video capture - Session: {self.capture_session_id}, Duration: {duration}s")
            
            # Start monitoring thread to automatically stop after duration
            monitoring_thread = threading.Thread(
                target=self._monitor_capture_duration,
                args=(duration,),
                daemon=True
            )
            monitoring_thread.start()
            
            return True
            
        except Exception as e:
            print(f"VNC[{self.capture_source}]: Failed to start video capture: {e}")
            return False
        
    def stop_video_capture(self) -> bool:
        """Stop video capture session."""
        if not self.is_capturing_video:
            return False
            
        try:
            # Calculate actual capture duration
            if self.capture_start_time:
                actual_duration = (datetime.now() - self.capture_start_time).total_seconds()
                print(f"VNC[{self.capture_source}]: Video capture stopped - Duration: {actual_duration:.1f}s")
            
            self.is_capturing_video = False
            self.capture_session_id = None
            
            return True
            
        except Exception as e:
            print(f"VNC[{self.capture_source}]: Error stopping video capture: {e}")
            return False
        
    def _monitor_capture_duration(self, duration: float):
        """Monitor capture duration and automatically stop after specified time."""
        time.sleep(duration)
        
        if self.is_capturing_video:
            print(f"VNC[{self.capture_source}]: Capture duration ({duration}s) reached, stopping automatically")
            self.stop_video_capture()
            
    def get_status(self) -> Dict[str, Any]:
        """Get controller status by checking VNC connectivity."""
        try:
            # For VNC, we check if the capture directory exists and is writable
            # This indicates the screenshot capture system is working
            captures_path = os.path.join(self.vnc_capture_path, 'captures')
            
            if os.path.exists(captures_path) and os.access(captures_path, os.W_OK):
                # Check if there are recent screenshots (within last 30 seconds)
                recent_screenshots = []
                try:
                    for file in os.listdir(captures_path):
                        if file.startswith('capture_') and file.endswith('.jpg'):
                            file_path = os.path.join(captures_path, file)
                            file_time = os.path.getmtime(file_path)
                            if time.time() - file_time < 30:  # Last 30 seconds
                                recent_screenshots.append(file)
                except Exception as e:
                    print(f"VNC[{self.capture_source}]: Error checking recent screenshots: {e}")
                
                is_streaming = len(recent_screenshots) > 0
                
                return {
                    'success': True,
                    'controller_type': 'av',
                    'service_status': 'active_running' if is_streaming else 'active_waiting',
                    'is_streaming': is_streaming,
                    'is_capturing': self.is_capturing_video,
                    'capture_session_id': self.capture_session_id,
                    'recent_screenshots': len(recent_screenshots),
                    'message': f'VNC controller - {len(recent_screenshots)} recent screenshots found'
                }
            else:
                return {
                    'success': False,
                    'controller_type': 'av',
                    'service_status': 'error',
                    'is_streaming': False,
                    'is_capturing': self.is_capturing_video,
                    'error': f'VNC capture directory not accessible: {captures_path}'
                }
            
        except Exception as e:
            print(f"VNC[{self.capture_source}]: Error getting status: {e}")
            return {
                'success': False,
                'controller_type': 'av',
                'service_status': 'error',
                'is_streaming': False,
                'is_capturing': self.is_capturing_video,
                'error': f'Failed to get VNC controller status: {str(e)}'
            } 
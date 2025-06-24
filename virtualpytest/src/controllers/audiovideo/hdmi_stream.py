"""
HDMI Stream Controller Implementation

This controller handles HDMI stream acquisition by referencing continuously captured screenshots.
The host continuously takes screenshots, and this controller references them by timestamp.
No FFmpeg usage - all video capture is done by referencing timestamped screenshot URLs.
"""

import threading
import time
import os
import json
from typing import Dict, Any, Optional, List
from pathlib import Path
from datetime import datetime, timedelta
import pytz
from ..base_controller import AVControllerInterface


class HDMIStreamController(AVControllerInterface):
    """HDMI Stream controller that references continuously captured screenshots by timestamp."""
    
    def __init__(self, video_stream_path: str, video_capture_path: str, **kwargs):
        """
        Initialize the HDMI Stream controller.
        
        Args:
            video_stream_path: Stream path for URLs (e.g., "/host/stream/capture1")
            video_capture_path: Local capture path (e.g., "/var/www/html/stream/capture1")
        """
        super().__init__("HDMI Stream Controller", "HDMI")
        
        # Only the essential parameters
        self.video_stream_path = video_stream_path
        self.video_capture_path = video_capture_path
        
        # Video capture state (timestamp-based, no FFmpeg)
        self.is_capturing_video = False
        self.capture_start_time = None
        self.capture_duration = 0
        self.capture_session_id = None
        
        print(f"HDMI[{self.capture_source}]: Initialized controller")
        print(f"HDMI[{self.capture_source}]: Video stream path: {self.video_stream_path}")
        print(f"HDMI[{self.capture_source}]: Video capture path: {self.video_capture_path}")
        

        
    def restart_stream(self) -> bool:
        """Restart HDMI streaming - simplified without systemd service management."""
        try:
            print(f"HDMI[{self.capture_source}]: Stream restart requested - no service management needed")
            return True
                
        except Exception as e:
            print(f"HDMI[{self.capture_source}]: Error restarting stream: {e}")
            return False
        
    def _get_service_status(self) -> Dict[str, str]:
        """Get service status - simplified without systemd service management."""
        return {
            'activestate': 'active',
            'substate': 'running'
        }
        
    def _get_stream_status(self) -> Dict[str, Any]:
        """Get current streaming service status."""
        service_status = self._get_service_status()
        
        # Check if stream service is running
        is_streaming = service_status.get('activestate') == 'active' and service_status.get('substate') == 'running'
        
        status = {
            'is_streaming': is_streaming,
            'session_id': self.capture_session_id,
            'service_status': service_status
        }
        
        return status
        

        
    def take_screenshot(self, filename: str = None) -> Optional[str]:
        """
        Take screenshot using timestamp logic.
        Returns local file path only - routes will build URLs using existing URL building functions.
        """
        try:
            print('[@controller:HDMIStream] Generating Zurich timezone timestamp for screenshot...')
            
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
            
            print(f'[@controller:HDMIStream] Using Zurich timestamp: {timestamp}')
            
            # Build local screenshot file path using capture path
            captures_path = os.path.join(self.video_capture_path, 'captures')
            screenshot_path = f'{captures_path}/screenshot_{timestamp}.jpg'
            
            print(f'[@controller:HDMIStream] Local screenshot path: {screenshot_path}')
            
            # Add 600ms delay before returning path (allows host to capture screenshot)
            print('[@controller:HDMIStream] Adding 600ms delay before returning screenshot path...')
            time.sleep(0.6)
            
            return screenshot_path
                
        except Exception as e:
            print(f'[@controller:HDMIStream] Error taking screenshot: {e}')
            import traceback
            print(f'[@controller:HDMIStream] Traceback: {traceback.format_exc()}')
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
            print(f'[@controller:HDMIStream] Saving screenshot with filename: {filename}')
            
            # First take a temporary screenshot to get the image
            temp_screenshot_path = self.take_screenshot()
            if not temp_screenshot_path:
                print(f'[@controller:HDMIStream] Failed to take temporary screenshot')
                return None
            
            print(f'[@controller:HDMIStream] Temporary screenshot taken: {temp_screenshot_path}')
            
            # Extract timestamp from temp screenshot path to get the actual image file
            import re
            timestamp_match = re.search(r'screenshot_(\d{14})\.jpg', temp_screenshot_path)
            if not timestamp_match:
                print(f'[@controller:HDMIStream] Could not extract timestamp from temp path: {temp_screenshot_path}')
                return None
            
            timestamp = timestamp_match.group(1)
            print(f'[@controller:HDMIStream] Extracted timestamp: {timestamp}')
            
            # The temp_screenshot_path is already the local file path we need
            local_screenshot_path = temp_screenshot_path
            
            print(f'[@controller:HDMIStream] Local screenshot path: {local_screenshot_path}')
            
            # Check if local file exists
            import os
            if not os.path.exists(local_screenshot_path):
                print(f'[@controller:HDMIStream] Local screenshot file not found: {local_screenshot_path}')
                return None
            
            # Return the local file path for the route to handle the upload
            return local_screenshot_path
            
        except Exception as e:
            print(f'[@controller:HDMIStream] Error saving screenshot: {e}')
            import traceback
            print(f'[@controller:HDMIStream] Traceback: {traceback.format_exc()}')
            return None
        
    def take_control(self) -> Dict[str, Any]:
        """
        Take control of HDMI stream and verify it's working.
        
        Returns:
            Dictionary with success status and stream information
        """
        try:
            print(f"HDMI[{self.capture_source}]: Taking control of HDMI stream")
            
            # Check if we can connect to the HDMI device
            if not self.is_connected:
                if not self.connect():
                    return {
                        'success': False,
                        'status': 'connection_failed',
                        'error': 'Failed to connect to HDMI device',
                        'controller_type': 'av',
                        'device_name': self.device_name
                    }
            
            # Check stream status
            stream_status = self._get_stream_status()
            is_streaming = stream_status.get('is_streaming', False)
            
            # For HDMI stream, we just need the service to be running
            # The host continuously captures screenshots regardless
            return {
                'success': True,
                'status': 'stream_ready',
                'controller_type': 'av',
                'stream_info': stream_status,
                'capabilities': ['video_capture', 'screenshot', 'streaming']
            }
                
        except Exception as e:
            print(f"HDMI[{self.capture_source}]: Take control error: {e}")
            return {
                'success': False,
                'status': 'error',
                'error': f'HDMI controller error: {str(e)}',
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
            resolution: Video resolution (ignored - uses host stream resolution)
            fps: Video FPS (ignored - uses 1 frame per second from screenshots)
        """
        if self.is_capturing_video:
            print(f"HDMI[{self.capture_source}]: Video capture already active")
            return True
            
        try:
            # Record capture session details
            self.capture_start_time = datetime.now()
            self.capture_duration = duration
            self.capture_session_id = f"capture_{int(time.time())}"
            self.is_capturing_video = True
            
            print(f"HDMI[{self.capture_source}]: Starting video capture session")
            print(f"HDMI[{self.capture_source}]: Session ID: {self.capture_session_id}")
            print(f"HDMI[{self.capture_source}]: Start time: {self.capture_start_time}")
            print(f"HDMI[{self.capture_source}]: Duration: {duration}s")
            
            print(f"HDMI[{self.capture_source}]: Will reference screenshots from local path: {self.video_capture_path}/captures")
            
            # Start monitoring thread to automatically stop after duration
            monitoring_thread = threading.Thread(
                target=self._monitor_capture_duration,
                args=(duration,),
                daemon=True
            )
            monitoring_thread.start()
            
            return True
            
        except Exception as e:
            print(f"HDMI[{self.capture_source}]: Failed to start video capture: {e}")
            return False
        
    def stop_video_capture(self) -> bool:
        """Stop video capture session."""
        if not self.is_capturing_video:
            print(f"HDMI[{self.capture_source}]: No active video capture to stop")
            return False
            
        try:
            print(f"HDMI[{self.capture_source}]: Stopping video capture session")
            print(f"HDMI[{self.capture_source}]: Session ID: {self.capture_session_id}")
            
            # Calculate actual capture duration
            if self.capture_start_time:
                actual_duration = (datetime.now() - self.capture_start_time).total_seconds()
                print(f"HDMI[{self.capture_source}]: Actual capture duration: {actual_duration:.1f}s")
            
            self.is_capturing_video = False
            self.capture_session_id = None
            
            print(f"HDMI[{self.capture_source}]: Video capture session stopped")
            return True
            
        except Exception as e:
            print(f"HDMI[{self.capture_source}]: Error stopping video capture: {e}")
            return False
        
    def _monitor_capture_duration(self, duration: float):
        """Monitor capture duration and automatically stop after specified time."""
        time.sleep(duration)
        
        if self.is_capturing_video:
            print(f"HDMI[{self.capture_source}]: Capture duration ({duration}s) reached, stopping automatically")
            self.stop_video_capture()
            

    def get_status(self) -> Dict[str, Any]:
        """Get controller status - simplified without systemd service management."""
        try:
            print(f"[@controller:HDMIStream:get_status] Getting status for HDMI controller")
            
            return {
                'success': True,
                'controller_type': 'av',
                'service_status': 'active_running',
                'is_streaming': True,
                'is_capturing': self.is_capturing_video,
                'capture_session_id': self.capture_session_id,
                'message': 'HDMI controller is active'
            }
            
        except Exception as e:
            print(f"[@controller:HDMIStream:get_status] Error getting status: {e}")
            return {
                'success': False,
                'controller_type': 'av',
                'service_status': 'error',
                'is_streaming': False,
                'is_capturing': self.is_capturing_video,
                'stream_url': None,
                'error': f'Failed to get controller status: {str(e)}'
            }


# Backward compatibility alias
HDMI_Stream_Controller = HDMIStreamController 
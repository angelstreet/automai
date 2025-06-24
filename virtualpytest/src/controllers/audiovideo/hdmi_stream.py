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
    
    def __init__(self, stream_path: str, capture_path: str, **kwargs):
        """
        Initialize the HDMI Stream controller.
        
        Args:
            stream_path: Stream path for URLs (e.g., "/host/stream/capture1")
            capture_path: Local capture path (e.g., "/var/www/html/stream/capture1")
        """
        super().__init__("HDMI Stream Controller", "HDMI")
        
        # Only the essential parameters
        self.stream_path = stream_path
        self.capture_path = capture_path
        
        # Video capture state (timestamp-based, no FFmpeg)
        self.is_capturing_video = False
        self.capture_start_time = None
        self.capture_duration = 0
        self.capture_session_id = None
        
        print(f"HDMI[{self.capture_source}]: Initialized controller")
        print(f"HDMI[{self.capture_source}]: Stream path: {self.stream_path}")
        print(f"HDMI[{self.capture_source}]: Capture path: {self.capture_path}")
        
    def _get_host_info(self) -> Optional[Dict[str, Any]]:
        """
        Get host information from Flask app context.
        
        Returns:
            Host information dictionary or None if not available
        """
        try:
            from flask import current_app
            host_device = getattr(current_app, 'my_host_device', None)
            if host_device:
                return host_device
            else:
                print(f"HDMI[{self.capture_source}]: No host device found in Flask app context")
                return None
        except Exception as e:
            print(f"HDMI[{self.capture_source}]: Error getting host info: {e}")
            return None
        
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
        
        # Get stream URL using buildHostUrl
        stream_url = self.get_stream_url()
        
        status = {
            'is_streaming': is_streaming,
            'session_id': self.capture_session_id,
            'service_status': service_status,
            'stream_url': stream_url
        }
        
        return status
        
    def get_stream_url(self) -> Optional[str]:
        """
        Get the stream URL for this HDMI controller.
        Uses buildHostUrl to construct the proper URL, with conditional HTTPS proxy for HTTP URLs.
        Supports device-specific stream paths for multi-device hosts.
        """
        try:
            from src.utils.app_utils import buildServerUrl
            from src.utils.buildUrlUtils import buildStreamUrl
            
            host_info = self._get_host_info()
            if not host_info:
                print(f"HDMI[{self.capture_source}]: Cannot build stream URL - no host info available")
                return None
            
            # Build stream URL using the configured stream path
            host_url = host_info.get('host_url', f"http://{host_info.get('host_ip', 'localhost')}:{host_info.get('host_port', '6109')}")
            original_stream_url = f"{host_url}{self.stream_path}/output.m3u8"
            print(f"HDMI[{self.capture_source}]: Original stream URL: {original_stream_url}")
            
            # If URL is already HTTPS, use it directly
            if original_stream_url.startswith('https://'):
                print(f"HDMI[{self.capture_source}]: Using direct HTTPS stream URL")
                return original_stream_url
            
            # If URL is HTTP, use HTTPS proxy to solve mixed content issues
            if original_stream_url.startswith('http://'):
                host_name = host_info.get('host_name')
                if not host_name:
                    print(f"HDMI[{self.capture_source}]: Cannot create proxy URL - no host_name available")
                    return original_stream_url  # Fallback to original URL
                
                # Build proxy URL using stream path
                stream_path_clean = self.stream_path.strip('/')
                proxy_stream_url = buildServerUrl(f'server/stream-proxy/{host_name}/{stream_path_clean}/output.m3u8')
                
                print(f"HDMI[{self.capture_source}]: Using HTTPS proxy stream URL: {proxy_stream_url}")
                return proxy_stream_url
            
            # Fallback for other protocols
            print(f"HDMI[{self.capture_source}]: Using fallback stream URL: {original_stream_url}")
            return original_stream_url
                
        except Exception as e:
            print(f"HDMI[{self.capture_source}]: Error getting stream URL: {e}")
            return None
        
    def take_screenshot(self, filename: str = None) -> Optional[str]:
        """
        Take screenshot using timestamp logic from ScreenDefinitionEditor.
        Uses buildHostUrl to reference continuously captured screenshots.
        Supports device-specific capture paths for multi-device hosts.
        """
        try:
            from src.utils.buildUrlUtils import buildCaptureUrl
            
            # EXACT COPY from ScreenDefinitionEditor.tsx handleTakeScreenshot()
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
            
            # Get host info and build screenshot URL using centralized capture URL builder with device ID
            host_info = self._get_host_info()
            if not host_info:
                print(f'[@controller:HDMIStream] Cannot build screenshot URL - no host info available')
                return None
            
            # Build screenshot URL using capture path
            host_url = host_info.get('host_url', f"http://{host_info.get('host_ip', 'localhost')}:{host_info.get('host_port', '6109')}")
            screenshot_url = f"{host_url}{self.stream_path}/captures/screenshot_{timestamp}.jpg"
            print(f'[@controller:HDMIStream] Built screenshot URL: {screenshot_url}')
            
            # EXACT COPY: Add 600ms delay before returning URL (allows host to capture screenshot)
            print('[@controller:HDMIStream] Adding 600ms delay before returning screenshot URL...')
            time.sleep(0.6)
            
            return screenshot_url
                
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
            temp_screenshot_url = self.take_screenshot()
            if not temp_screenshot_url:
                print(f'[@controller:HDMIStream] Failed to take temporary screenshot')
                return None
            
            print(f'[@controller:HDMIStream] Temporary screenshot taken: {temp_screenshot_url}')
            
            # Get host info for device model
            host_info = self._get_host_info()
            if not host_info:
                print(f'[@controller:HDMIStream] Cannot get device model - no host info available')
                return None
            
            device_model = host_info.get('device_model', 'unknown')
            print(f'[@controller:HDMIStream] Using device model: {device_model}')
            
            # Extract timestamp from temp screenshot URL to get the actual image file
            try:
                import re
                timestamp_match = re.search(r'capture_(\d{14})\.jpg', temp_screenshot_url)
                if not timestamp_match:
                    print(f'[@controller:HDMIStream] Could not extract timestamp from temp URL: {temp_screenshot_url}')
                    return None
                
                timestamp = timestamp_match.group(1)
                print(f'[@controller:HDMIStream] Extracted timestamp: {timestamp}')
                
                # Build local file path to the captured screenshot using device-specific path
                host_info = self._get_host_info()
                if not host_info:
                    print(f'[@controller:HDMIStream] Cannot build local screenshot path - no host info available')
                    return None
                
                # Build local screenshot path using capture path
                import os
                if self.capture_path:
                    captures_path = os.path.join(self.capture_path, 'captures')
                else:
                    captures_path = '/var/www/html/stream/captures'  # Default fallback
                local_screenshot_path = f'{captures_path}/capture_{timestamp}.jpg'
                
                print(f'[@controller:HDMIStream] Local screenshot path: {local_screenshot_path}')
                
                # Check if local file exists
                import os
                if not os.path.exists(local_screenshot_path):
                    print(f'[@controller:HDMIStream] Local screenshot file not found: {local_screenshot_path}')
                    return None
                
                # Return the local file path for the route to handle the upload
                return local_screenshot_path
                
            except Exception as extract_error:
                print(f'[@controller:HDMIStream] Error processing screenshot: {extract_error}')
                import traceback
                print(f'[@controller:HDMIStream] Traceback: {traceback.format_exc()}')
                return None
                
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
            
            # Get stream URL for response
            stream_url = self.get_stream_url()
            
            # For HDMI stream, we just need the service to be running
            # The host continuously captures screenshots regardless
            return {
                'success': True,
                'status': 'stream_ready',
                'controller_type': 'av',
                'stream_info': stream_status,
                'capabilities': ['video_capture', 'screenshot', 'streaming'],
                'stream_url': stream_url
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
            
            # Get captures URL for logging
            try:
                from src.utils.buildUrlUtils import buildHostImageUrl
                host_info = self._get_host_info()
                if host_info:
                    captures_url = buildHostImageUrl(host_info, 'stream/capture1/')
                    print(f"HDMI[{self.capture_source}]: Will reference screenshots from: {captures_url}")
            except Exception:
                pass  # Logging only, don't fail if URL building fails
            
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
            
            # Get stream URL for status
            stream_url = self.get_stream_url()
            
            return {
                'success': True,
                'controller_type': 'av',
                'service_status': 'active_running',
                'is_streaming': True,
                'is_capturing': self.is_capturing_video,
                'capture_session_id': self.capture_session_id,
                'stream_url': stream_url,
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
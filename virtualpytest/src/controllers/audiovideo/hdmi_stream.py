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
    
    def __init__(self, device_name: str = "HDMI Stream Device", **kwargs):
        """
        Initialize the HDMI Stream controller.
        
        Args:
            device_name: Name of the device for logging
            **kwargs: Additional parameters:
                - service_name: systemd service name for stream (default: 'hdmi-stream')
        """
        super().__init__(device_name, "HDMI")
        
        # Service configuration (for stream status checking)
        self.service_name = kwargs.get('service_name', 'stream')
        
        # Video capture state (timestamp-based, no FFmpeg)
        self.is_capturing_video = False
        self.capture_start_time = None
        self.capture_duration = 0
        self.capture_session_id = None
        
        print(f"HDMI[{self.capture_source}]: Initialized with service: {self.service_name}")
        
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
        """Restart HDMI streaming service."""
        try:
            print(f"HDMI[{self.capture_source}]: Restarting streaming service: {self.service_name}")
            
            # Restart systemd service
            import subprocess
            result = subprocess.run(['sudo', 'systemctl', 'restart', self.service_name], 
                                  capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                # Wait a moment for service to restart
                time.sleep(2)
                
                # Verify service is running
                status = self._get_service_status()
                if status.get('active') == 'active' and status.get('sub') == 'running':
                    print(f"HDMI[{self.capture_source}]: Streaming service restarted successfully")
                    return True
                else:
                    print(f"HDMI[{self.capture_source}]: Service restarted but not running properly")
                    return False
            else:
                print(f"HDMI[{self.capture_source}]: Failed to restart service: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"HDMI[{self.capture_source}]: Error restarting stream: {e}")
            return False
        
    def _get_service_status(self) -> Dict[str, str]:
        """Get systemd service status."""
        try:
            import subprocess
            result = subprocess.run(['sudo', 'systemctl', 'show', self.service_name, '--no-page'], 
                                  capture_output=True, text=True, timeout=10)
            
            status = {}
            for line in result.stdout.split('\n'):
                if '=' in line:
                    key, value = line.split('=', 1)
                    status[key.lower()] = value
            
            return status
        except Exception as e:
            print(f"HDMI[{self.capture_source}]: Error getting service status: {e}")
            return {}
        
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
        Uses buildHostUrl to construct the proper URL.
        """
        try:
            from src.utils.app_utils import buildHostUrl
            
            host_info = self._get_host_info()
            if not host_info:
                print(f"HDMI[{self.capture_source}]: Cannot build stream URL - no host info available")
                return None
            
            stream_url = buildHostUrl(host_info, 'host/stream/output.m3u8')
            print(f"HDMI[{self.capture_source}]: Stream URL: {stream_url}")
            return stream_url
                
        except Exception as e:
            print(f"HDMI[{self.capture_source}]: Error getting stream URL: {e}")
            return None
        
    def take_screenshot(self, filename: str = None) -> Optional[str]:
        """
        Take screenshot using timestamp logic from ScreenDefinitionEditor.
        Uses buildHostUrl to reference continuously captured screenshots.
        """
        try:
            from src.utils.app_utils import buildHostUrl
            
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
            
            # Get host info and build screenshot URL
            host_info = self._get_host_info()
            if not host_info:
                print(f'[@controller:HDMIStream] Cannot build screenshot URL - no host info available')
                return None
            
            screenshot_url = buildHostUrl(host_info, f'host/stream/captures/capture_{timestamp}.jpg')
            print(f'[@controller:HDMIStream] Built screenshot URL using buildHostUrl: {screenshot_url}')
            
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
        Take screenshot and upload to R2 with specific filename.
        Used for permanent storage in navigation nodes.
        
        Args:
            filename: The filename to use for the screenshot (e.g., node name)
            
        Returns:
            Just the filename (frontend will use buildScreenshotUrl to construct the full URL)
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
            
            # Build R2 path: navigation/{device_model}/{filename}.jpg
            r2_path = f"navigation/{device_model}/{filename}.jpg"
            print(f'[@controller:HDMIStream] Target R2 path: {r2_path}')
            
            # Extract timestamp from temp screenshot URL to get the actual image file
            # temp_screenshot_url format: https://virtualpytest.com/host/stream/captures/capture_20250617134657.jpg
            try:
                import re
                timestamp_match = re.search(r'capture_(\d{14})\.jpg', temp_screenshot_url)
                if not timestamp_match:
                    print(f'[@controller:HDMIStream] Could not extract timestamp from temp URL: {temp_screenshot_url}')
                    return None
                
                timestamp = timestamp_match.group(1)
                print(f'[@controller:HDMIStream] Extracted timestamp: {timestamp}')
                
                # Build local file path to the captured screenshot
                local_screenshot_path = f'/var/www/html/stream/captures/capture_{timestamp}.jpg'
                print(f'[@controller:HDMIStream] Local screenshot path: {local_screenshot_path}')
                
                # Check if local file exists
                import os
                if not os.path.exists(local_screenshot_path):
                    print(f'[@controller:HDMIStream] Local screenshot file not found: {local_screenshot_path}')
                    return None
                
                # Upload to R2 using CloudflareUploader
                from src.utils.cloudflare_upload_utils import CloudflareUploader
                
                uploader = CloudflareUploader()
                upload_result = uploader.upload_file(local_screenshot_path, r2_path)
                
                if upload_result.get('success'):
                    print(f'[@controller:HDMIStream] Successfully uploaded to R2: {r2_path}')
                    # Return just the filename - frontend will use buildScreenshotUrl to construct the full URL
                    return f"{filename}.jpg"
                else:
                    error_msg = upload_result.get('error', 'Unknown upload error')
                    print(f'[@controller:HDMIStream] R2 upload failed: {error_msg}')
                    return None
                
            except ImportError as ie:
                print(f'[@controller:HDMIStream] CloudflareUploader not available: {ie}')
                return None
            except Exception as extract_error:
                print(f'[@controller:HDMIStream] Error processing screenshot for upload: {extract_error}')
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
                'device_name': self.device_name,
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
                'controller_type': 'av',
                'device_name': self.device_name
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
                from src.utils.app_utils import buildHostUrl
                host_info = self._get_host_info()
                if host_info:
                    captures_url = buildHostUrl(host_info, 'host/stream/captures/')
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
        """Get controller status - check if stream service is running."""
        try:
            # Check if stream service is running
            import subprocess
            
            print(f"[@controller:HDMIStream:get_status] Checking service status for: {self.service_name}")
            
            result = subprocess.run(
                ['sudo', 'systemctl', 'status', self.service_name], 
                capture_output=True, 
                text=True,
                timeout=10
            )
            
            print(f"[@controller:HDMIStream:get_status] systemctl status return code: {result.returncode}")
            print(f"[@controller:HDMIStream:get_status] systemctl status output: {result.stdout}")
            
            # More robust service status detection
            is_stream_active = False
            service_state = 'unknown'
            
            # Check multiple indicators for active service
            stdout_lower = result.stdout.lower()
            
            # Primary check: Look for "active (running)" pattern
            if 'active (running)' in stdout_lower:
                is_stream_active = True
                service_state = 'active_running'
                print(f"[@controller:HDMIStream:get_status] Service detected as ACTIVE (running)")
            else:
                # Service is not active
                if 'inactive' in stdout_lower:
                    service_state = 'inactive'
                elif 'failed' in stdout_lower:
                    service_state = 'failed'
                elif result.returncode != 0:
                    service_state = 'error'
                else:
                    service_state = 'unknown'
                
                print(f"[@controller:HDMIStream:get_status] Service detected as NOT ACTIVE: {service_state}")
            
            # Get stream URL for status
            stream_url = self.get_stream_url()
            
            return {
                'success': True,
                'controller_type': 'av',
                'device_name': self.device_name,
                'service_name': self.service_name,
                'service_status': service_state,
                'is_streaming': is_stream_active,
                'is_capturing': self.is_capturing_video,
                'capture_session_id': self.capture_session_id,
                'stream_url': stream_url,
                'systemctl_returncode': result.returncode,
                'systemctl_output': result.stdout,
                'message': f'Stream service ({self.service_name}) is active' if is_stream_active else f'Stream service ({self.service_name}) is not running - status: {service_state}'
            }
            
        except subprocess.TimeoutExpired:
            print(f"[@controller:HDMIStream:get_status] systemctl status command timed out")
            return {
                'success': False,
                'controller_type': 'av',
                'device_name': self.device_name,
                'service_name': self.service_name,
                'service_status': 'timeout',
                'is_streaming': False,
                'is_capturing': self.is_capturing_video,
                'stream_url': None,
                'error': f'Timeout checking stream service status for {self.service_name}'
            }
        except Exception as e:
            print(f"[@controller:HDMIStream:get_status] Error checking service status: {e}")
            return {
                'success': False,
                'controller_type': 'av',
                'device_name': self.device_name,
                'service_name': self.service_name,
                'service_status': 'error',
                'is_streaming': False,
                'is_capturing': self.is_capturing_video,
                'stream_url': None,
                'error': f'Failed to check stream service: {str(e)}'
            }

    def get_available_actions(self) -> Dict[str, Any]:
        """Get available actions for this HDMI Stream controller."""
        return {
            'video_capture': ['start_video_capture', 'stop_video_capture'],
            'screenshot': ['take_screenshot', 'save_screenshot'],
            'stream_control': ['restart_stream', 'get_stream_url'],
            'status': ['get_status']
        }

    def get_available_verifications(self) -> Dict[str, Any]:
        """Get available verifications for this HDMI Stream controller."""
        return {
            'screenshots': {
                'take_screenshot': {
                    'description': 'Take a screenshot from the HDMI stream',
                    'parameters': {
                        'filename': {'type': 'string', 'required': False, 'description': 'Optional filename for the screenshot'}
                    }
                },
                'save_screenshot': {
                    'description': 'Save a screenshot with a specific filename',
                    'parameters': {
                        'filename': {'type': 'string', 'required': True, 'description': 'Filename for the screenshot'}
                    }
                }
            },
            'stream_status': {
                'get_stream_url': {
                    'description': 'Get the current stream URL',
                    'parameters': {}
                },
                'get_status': {
                    'description': 'Get the current stream service status',
                    'parameters': {}
                }
            }
        }


# Backward compatibility alias
HDMI_Stream_Controller = HDMIStreamController 
"""
HDMI Stream Controller Implementation

This controller handles HDMI stream acquisition using FFmpeg and provides video streaming functionality.
It uses systemd services for production streaming and direct FFmpeg for verification operations.
Verification functionality is handled by separate verification controllers.
"""

import subprocess
import threading
import time
import os
import signal
import json
from typing import Dict, Any, Optional
from pathlib import Path
from datetime import datetime
import pytz
from ..base_controllers import AVControllerInterface


class HDMIStreamController(AVControllerInterface):
    """HDMI Stream controller that handles FFmpeg-based acquisition and streaming via systemd services."""
    
    def __init__(self, device_name: str = "HDMI Stream Device", **kwargs):
        """
        Initialize the HDMI Stream controller.
        
        Args:
            device_name: Name of the device for logging
            **kwargs: Required parameters:
                - video_device: Video input device (e.g., '/dev/video0')
                - output_path: Output directory for stream files (e.g., '/var/www/html/stream/')
                - stream_resolution: Resolution for streaming (default: '640x360')
                - stream_fps: FPS for streaming (default: 12)
                - stream_bitrate: Bitrate for streaming (default: '400k')
                - service_name: systemd service name (default: 'hdmi-stream')
        """
        super().__init__(device_name, "HDMI")
        
        # Required parameters
        self.video_device = kwargs.get('video_device')
        self.output_path = kwargs.get('output_path')
        
        if not self.video_device or not self.output_path:
            raise ValueError("video_device and output_path are required parameters")
        
        # Stream parameters
        self.stream_resolution = kwargs.get('stream_resolution', '640x360')
        self.stream_fps = kwargs.get('stream_fps', 12)
        self.stream_bitrate = kwargs.get('stream_bitrate', '400k')
        
        # Service configuration
        self.service_name = kwargs.get('service_name', 'hdmi-stream')
        self.service_file_path = f"/etc/systemd/system/{self.service_name}.service"
        
        # Direct FFmpeg processes (for verification operations only)
        self.capture_process = None
        self.is_capturing_video = False
        
        # Rolling buffer settings
        self.rolling_buffer_duration = 60  # seconds
        self.rolling_buffer_timeout = 600  # 1 hour instead of 3 minutes - remove auto-stop restriction
        self.rolling_buffer_thread = None
        self.rolling_buffer_active = False
        
        # Paths
        self.output_path = Path(self.output_path)
        self.stream_file = self.output_path / "output.m3u8"
        self.captures_path = self.output_path / "captures"
        
        
    def connect(self) -> bool:
        """Connect to the HDMI acquisition device."""
        try:
            print(f"HDMI[{self.capture_source}]: Connecting to video device: {self.video_device}")
            self.is_connected = True
            print(f"HDMI[{self.capture_source}]: Connected successfully")
            print(f"HDMI[{self.capture_source}]: Video device: {self.video_device}")
            print(f"HDMI[{self.capture_source}]: Output path: {self.output_path}")
            print(f"HDMI[{self.capture_source}]: Service name: {self.service_name}")
            return True
        except Exception as e:
            print(f"HDMI[{self.capture_source}]: Connection error: {e}")
            self.is_connected = False
            return False
        
    def disconnect(self) -> bool:
        """Disconnect from the HDMI acquisition device."""
        print(f"HDMI[{self.capture_source}]: Disconnecting")
        self.is_connected = False
        print(f"HDMI[{self.capture_source}]: Disconnected")
        return True
        
    def restart_stream(self) -> bool:
        """Restart HDMI streaming service."""
        try:
            print(f"HDMI[{self.capture_source}]: Restarting streaming service: {self.service_name}")
            
            # Restart systemd service
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
        
        
    def get_stream_status(self) -> Dict[str, Any]:
        """Get current streaming service status."""
        service_status = self._get_service_status()
        
        # Check if stream file exists and get info
        stream_info = {}
        if self.stream_file.exists():
            stat = self.stream_file.stat()
            stream_info = {
                'stream_file_exists': True,
                'stream_file_path': str(self.stream_file),
                'file_size': stat.st_size,
                'last_modified': stat.st_mtime,
                'last_modified_ago': time.time() - stat.st_mtime
            }
        else:
            stream_info = {
                'stream_file_exists': False,
                'stream_file_path': str(self.stream_file)
            }
        
        # Combine service status with stream info
        status = {
            'is_streaming': service_status.get('active') == 'active' and service_status.get('sub') == 'running',
            'session_id': self.capture_session_id if hasattr(self, 'capture_session_id') else None,
            'service_status': service_status,
            'stream_info': stream_info
        }
        
        return status
        
        
    def capture_frame(self, filename: str = None) -> bool:
        """
        Capture a single video frame (alias for take_screenshot).
        
        Args:
            filename: Optional filename for the frame
            
        Returns:
            True if frame was captured successfully, False otherwise
        """
        result = self.take_screenshot(filename)
        return result is not None
        
    def take_screenshot(self, filename: str = None) -> str:
        """
        Take screenshot using timestamp logic from ScreenDefinitionEditor.
        Just moved the exact same logic here.
        """
        if not self.is_connected:
            print(f"HDMI[{self.capture_source}]: ERROR - Not connected")
            return None
            
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
        
        # Get host IP from controller config
        host_ip = getattr(self, 'host_ip', 'localhost')
        host_url = f"https://{host_ip}:444/stream/captures/capture_{timestamp}.jpg"
        
        print(f'[@controller:HDMIStream] Built host screenshot URL: {host_url}')
        
        # EXACT COPY: Add 600ms delay before returning URL
        print('[@controller:HDMIStream] Adding 600ms delay before returning screenshot URL...')
        time.sleep(0.6)
        
        return host_url
        
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
            stream_status = self.get_stream_status()
            is_streaming = stream_status.get('is_streaming', False)
            
            # If not streaming, try to start it
            if not is_streaming:
                print(f"HDMI[{self.capture_source}]: Stream not active, attempting to start")
                if self.start_stream():
                    # Re-check status after starting
                    stream_status = self.get_stream_status()
                    is_streaming = stream_status.get('is_streaming', False)
            
            if is_streaming:
                return {
                    'success': True,
                    'status': 'stream_ready',
                    'controller_type': 'av',
                    'device_name': self.device_name,
                    'stream_info': stream_status,
                    'capabilities': ['video_capture', 'screenshot', 'streaming']
                }
            else:
                return {
                    'success': False,
                    'status': 'stream_failed',
                    'error': 'Failed to start HDMI stream',
                    'controller_type': 'av',
                    'device_name': self.device_name,
                    'stream_info': stream_status
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
        Start video capture with rolling buffer.
        
        Args:
            duration: Duration in seconds (default: 60s, max timeout: 180s)
            filename: Optional filename for the video
            resolution: Video resolution (default: same as stream)
            fps: Video FPS (default: same as stream)
        """
        if not self.is_connected:
            print(f"HDMI[{self.capture_source}]: ERROR - Not connected")
            return False
            
        if self.is_capturing_video:
            print(f"HDMI[{self.capture_source}]: Video capture already active")
            return True
            
        # Limit duration and apply timeout
        duration = min(duration, self.rolling_buffer_duration)
        timeout = self.rolling_buffer_timeout  # Remove the 180 second limit
        
        timestamp = int(time.time())
        video_name = filename or f"capture_{timestamp}.mp4"
        video_path = self.captures_path / video_name
        
        # Use provided resolution/fps or defaults
        capture_resolution = resolution or self.stream_resolution
        capture_fps = fps or self.stream_fps
        
        try:
            # FFmpeg command for video capture
            cmd = [
                '/usr/bin/ffmpeg',
                '-f', 'v4l2',
                '-s', capture_resolution,
                '-r', str(capture_fps),
                '-i', self.video_device,
                '-c:v', 'libx264',
                '-preset', 'fast',
                '-t', str(duration),  # Duration limit
                '-y',  # Overwrite output file
                str(video_path)
            ]
            
            print(f"HDMI[{self.capture_source}]: Starting video capture")
            print(f"HDMI[{self.capture_source}]: Duration: {duration}s (timeout: {timeout}s)")
            print(f"HDMI[{self.capture_source}]: Resolution: {capture_resolution}@{capture_fps}fps")
            print(f"HDMI[{self.capture_source}]: Output: {video_path}")
            
            # Start capture process
            self.capture_process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            self.is_capturing_video = True
            self.rolling_buffer_active = True
            
            # Start monitoring thread with timeout
            self.rolling_buffer_thread = threading.Thread(
                target=self._monitor_video_capture,
                args=(video_path, timeout),
                daemon=True
            )
            self.rolling_buffer_thread.start()
            
            return True
            
        except Exception as e:
            print(f"HDMI[{self.capture_source}]: Failed to start video capture: {e}")
            return False
        
    def stop_video_capture(self) -> bool:
        """Stop video capture."""
        if not self.is_capturing_video or not self.capture_process:
            print(f"HDMI[{self.capture_source}]: No active video capture to stop")
            return False
            
        try:
            print(f"HDMI[{self.capture_source}]: Stopping video capture")
            
            # Send SIGTERM to FFmpeg
            self.capture_process.terminate()
            
            # Wait for graceful shutdown
            try:
                self.capture_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                # Force kill if needed
                print(f"HDMI[{self.capture_source}]: Force killing capture process")
                self.capture_process.kill()
                self.capture_process.wait()
                
            self.capture_process = None
            self.is_capturing_video = False
            self.rolling_buffer_active = False
            
            print(f"HDMI[{self.capture_source}]: Video capture stopped")
            return True
            
        except Exception as e:
            print(f"HDMI[{self.capture_source}]: Error stopping video capture: {e}")
            return False
        
    def _monitor_video_capture(self, video_path: Path, timeout: float):
        """Monitor video capture process and handle timeout."""
        start_time = time.time()
        
        while self.rolling_buffer_active and self.capture_process:
            # Check if process is still running
            if self.capture_process.poll() is not None:
                # Process finished
                stdout, stderr = self.capture_process.communicate()
                if video_path.exists():
                    print(f"HDMI[{self.capture_source}]: Video capture completed: {video_path}")
                else:
                    print(f"HDMI[{self.capture_source}]: Video capture failed: {stderr}")
                break
                
            # Check timeout
            if time.time() - start_time > timeout:
                print(f"HDMI[{self.capture_source}]: Video capture timeout ({timeout}s), stopping")
                self.stop_video_capture()
                break
                
            time.sleep(1)
            
        self.is_capturing_video = False
        
    def get_status(self) -> Dict[str, Any]:
        """Get controller status - check if stream service is running."""
        try:
            # Check if stream.service is running
            result = subprocess.run(
                ['sudo', 'systemctl', 'status', 'stream.service'], 
                capture_output=True, 
                text=True
            )
            
            # Check if service is active
            is_stream_active = 'Active: active (running)' in result.stdout
            
            return {
                'success': True,
                'controller_type': 'av',
                'device_name': self.device_name,
                'service_status': 'active' if is_stream_active else 'inactive',
                'is_streaming': is_stream_active,
                'message': 'Stream service is active' if is_stream_active else 'Stream service is not running'
            }
            
        except Exception as e:
            return {
                'success': False,
                'controller_type': 'av',
                'device_name': self.device_name,
                'service_status': 'error',
                'is_streaming': False,
                'error': f'Failed to check stream service: {str(e)}'
            }


# Backward compatibility alias
HDMI_Stream_Controller = HDMIStreamController 
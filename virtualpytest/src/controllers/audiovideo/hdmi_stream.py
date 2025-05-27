"""
HDMI Stream Controller Implementation

This controller handles HDMI stream acquisition using FFmpeg and provides video streaming functionality.
It can stream from acquisition cards, capture screenshots, and record video with rolling buffers.
Verification functionality is handled by separate verification controllers.
"""

import subprocess
import threading
import time
import os
import signal
from typing import Dict, Any, Optional
from pathlib import Path
from ..base_controllers import AVControllerInterface


class HDMIStreamController(AVControllerInterface):
    """HDMI Stream controller that handles FFmpeg-based acquisition and streaming."""
    
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
        """
        super().__init__(device_name, "HDMI_STREAM")
        
        # Required parameters
        self.video_device = kwargs.get('video_device')
        self.output_path = kwargs.get('output_path')
        
        if not self.video_device or not self.output_path:
            raise ValueError("video_device and output_path are required parameters")
        
        # Stream parameters
        self.stream_resolution = kwargs.get('stream_resolution', '640x360')
        self.stream_fps = kwargs.get('stream_fps', 12)
        self.stream_bitrate = kwargs.get('stream_bitrate', '400k')
        
        # FFmpeg processes
        self.stream_process = None
        self.capture_process = None
        self.is_streaming = False
        
        # Rolling buffer settings
        self.rolling_buffer_duration = 60  # seconds
        self.rolling_buffer_timeout = 180  # 3 minutes auto-stop
        self.rolling_buffer_thread = None
        self.rolling_buffer_active = False
        
        # Paths
        self.output_path = Path(self.output_path)
        self.stream_file = self.output_path / "output.m3u8"
        self.screenshots_path = self.output_path / "screenshots"
        self.captures_path = self.output_path / "captures"
        
        # Create directories
        self.screenshots_path.mkdir(parents=True, exist_ok=True)
        self.captures_path.mkdir(parents=True, exist_ok=True)
        
    def connect(self) -> bool:
        """Connect to the HDMI acquisition device."""
        try:
            print(f"HDMI[{self.capture_source}]: Connecting to video device: {self.video_device}")
            
            # Check if video device exists
            if not os.path.exists(self.video_device):
                print(f"HDMI[{self.capture_source}]: ERROR - Video device not found: {self.video_device}")
                return False
                
            # Check if output directory exists and is writable
            if not self.output_path.exists():
                print(f"HDMI[{self.capture_source}]: Creating output directory: {self.output_path}")
                self.output_path.mkdir(parents=True, exist_ok=True)
                
            if not os.access(self.output_path, os.W_OK):
                print(f"HDMI[{self.capture_source}]: ERROR - Output directory not writable: {self.output_path}")
                return False
                
            # Test FFmpeg availability
            try:
                result = subprocess.run(['/usr/bin/ffmpeg', '-version'], 
                                      capture_output=True, text=True, timeout=5)
                if result.returncode != 0:
                    print(f"HDMI[{self.capture_source}]: ERROR - FFmpeg not available or not working")
                    return False
            except (subprocess.TimeoutExpired, FileNotFoundError):
                print(f"HDMI[{self.capture_source}]: ERROR - FFmpeg not found at /usr/bin/ffmpeg")
                return False
                
            self.is_connected = True
            print(f"HDMI[{self.capture_source}]: Connected successfully")
            print(f"HDMI[{self.capture_source}]: Video device: {self.video_device}")
            print(f"HDMI[{self.capture_source}]: Output path: {self.output_path}")
            return True
            
        except Exception as e:
            print(f"HDMI[{self.capture_source}]: Connection failed: {e}")
            return False
        
    def disconnect(self) -> bool:
        """Disconnect from the HDMI acquisition device."""
        print(f"HDMI[{self.capture_source}]: Disconnecting")
        
        # Stop all active processes
        self.stop_stream()
        self.stop_video_capture()
        
        self.is_connected = False
        print(f"HDMI[{self.capture_source}]: Disconnected")
        return True
        
    def start_stream(self) -> bool:
        """
        Start FFmpeg streaming from acquisition card.
        
        Command: /usr/bin/ffmpeg -f v4l2 -s 640x360 -r 12 -i /dev/video0 
                 -c:v libx264 -preset ultrafast -b:v 400k -tune zerolatency 
                 -g 24 -an -f hls -hls_time 2 -hls_list_size 3 
                 -hls_flags delete_segments -hls_segment_type mpegts 
                 /var/www/html/stream/output.m3u8
        """
        if not self.is_connected:
            print(f"HDMI[{self.capture_source}]: ERROR - Not connected")
            return False
            
        if self.is_streaming:
            print(f"HDMI[{self.capture_source}]: Stream already active")
            return True
            
        try:
            # Build FFmpeg command
            cmd = [
                '/usr/bin/ffmpeg',
                '-f', 'v4l2',
                '-s', self.stream_resolution,
                '-r', str(self.stream_fps),
                '-i', self.video_device,
                '-c:v', 'libx264',
                '-preset', 'ultrafast',
                '-b:v', self.stream_bitrate,
                '-tune', 'zerolatency',
                '-g', '24',
                '-an',  # No audio for streaming
                '-f', 'hls',
                '-hls_time', '2',
                '-hls_list_size', '3',
                '-hls_flags', 'delete_segments',
                '-hls_segment_type', 'mpegts',
                str(self.stream_file)
            ]
            
            print(f"HDMI[{self.capture_source}]: Starting stream")
            print(f"HDMI[{self.capture_source}]: Resolution: {self.stream_resolution}@{self.stream_fps}fps")
            print(f"HDMI[{self.capture_source}]: Bitrate: {self.stream_bitrate}")
            print(f"HDMI[{self.capture_source}]: Output: {self.stream_file}")
            
            # Start FFmpeg process
            self.stream_process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            # Give FFmpeg time to start
            time.sleep(2)
            
            # Check if process is still running
            if self.stream_process.poll() is None:
                self.is_streaming = True
                self.capture_session_id = f"hdmi_stream_{int(time.time())}"
                print(f"HDMI[{self.capture_source}]: Stream started successfully")
                print(f"HDMI[{self.capture_source}]: Session ID: {self.capture_session_id}")
                return True
            else:
                # Process died, get error output
                stdout, stderr = self.stream_process.communicate()
                print(f"HDMI[{self.capture_source}]: Stream failed to start")
                print(f"HDMI[{self.capture_source}]: Error: {stderr}")
                self.stream_process = None
                return False
                
        except Exception as e:
            print(f"HDMI[{self.capture_source}]: Failed to start stream: {e}")
            return False
        
    def stop_stream(self) -> bool:
        """Stop FFmpeg streaming."""
        if not self.is_streaming or not self.stream_process:
            print(f"HDMI[{self.capture_source}]: No active stream to stop")
            return False
            
        try:
            print(f"HDMI[{self.capture_source}]: Stopping stream")
            
            # Send SIGTERM to FFmpeg
            self.stream_process.terminate()
            
            # Wait for graceful shutdown
            try:
                self.stream_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                # Force kill if needed
                print(f"HDMI[{self.capture_source}]: Force killing stream process")
                self.stream_process.kill()
                self.stream_process.wait()
                
            self.stream_process = None
            self.is_streaming = False
            print(f"HDMI[{self.capture_source}]: Stream stopped")
            return True
            
        except Exception as e:
            print(f"HDMI[{self.capture_source}]: Error stopping stream: {e}")
            return False
        
    def restart_stream(self) -> bool:
        """Restart the FFmpeg stream."""
        print(f"HDMI[{self.capture_source}]: Restarting stream")
        self.stop_stream()
        time.sleep(1)
        return self.start_stream()
        
    def get_stream_status(self) -> Dict[str, Any]:
        """Get current stream status."""
        status = {
            'is_streaming': self.is_streaming,
            'stream_file': str(self.stream_file) if self.stream_file.exists() else None,
            'process_running': self.stream_process is not None and self.stream_process.poll() is None,
            'session_id': self.capture_session_id if self.is_streaming else None
        }
        
        # Add file info if stream file exists
        if self.stream_file.exists():
            stat = self.stream_file.stat()
            status.update({
                'file_size': stat.st_size,
                'last_modified': stat.st_mtime
            })
            
        return status
        
    def take_screenshot(self, filename: str = None) -> str:
        """
        Take a screenshot using FFmpeg from the video device.
        
        Args:
            filename: Optional filename for the screenshot
            
        Returns:
            Path to the screenshot file
        """
        if not self.is_connected:
            print(f"HDMI[{self.capture_source}]: ERROR - Not connected")
            return None
            
        timestamp = int(time.time())
        screenshot_name = filename or f"screenshot_{timestamp}.png"
        screenshot_path = self.screenshots_path / screenshot_name
        
        try:
            # FFmpeg command for single frame capture
            cmd = [
                '/usr/bin/ffmpeg',
                '-f', 'v4l2',
                '-i', self.video_device,
                '-vframes', '1',
                '-y',  # Overwrite output file
                str(screenshot_path)
            ]
            
            print(f"HDMI[{self.capture_source}]: Taking screenshot: {screenshot_name}")
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0 and screenshot_path.exists():
                print(f"HDMI[{self.capture_source}]: Screenshot saved: {screenshot_path}")
                return str(screenshot_path)
            else:
                print(f"HDMI[{self.capture_source}]: Screenshot failed: {result.stderr}")
                return None
                
        except Exception as e:
            print(f"HDMI[{self.capture_source}]: Screenshot error: {e}")
            return None
        
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
        timeout = min(self.rolling_buffer_timeout, 180)
        
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
        self.rolling_buffer_active = False
        
    def start_audio_capture(self, sample_rate: int = 44100, channels: int = 2) -> bool:
        """Audio capture not implemented for HDMI stream controller."""
        print(f"HDMI[{self.capture_source}]: Audio capture not implemented")
        print(f"HDMI[{self.capture_source}]: Use AudioVerificationController for audio analysis")
        return False
        
    def stop_audio_capture(self) -> bool:
        """Audio capture not implemented for HDMI stream controller."""
        return False
        
    def detect_audio_level(self) -> float:
        """Audio detection moved to AudioVerificationController."""
        print(f"HDMI[{self.capture_source}]: Audio detection moved to AudioVerificationController")
        return 0.0
        
    def detect_silence(self, threshold: float = 5.0, duration: float = 2.0) -> bool:
        """Audio detection moved to AudioVerificationController."""
        print(f"HDMI[{self.capture_source}]: Audio detection moved to AudioVerificationController")
        return False
        
    def analyze_video_content(self, analysis_type: str = "motion") -> Dict[str, Any]:
        """Video analysis moved to VideoVerificationController."""
        print(f"HDMI[{self.capture_source}]: Video analysis moved to VideoVerificationController")
        return {"error": "Use VideoVerificationController for video analysis"}
        
    def wait_for_video_change(self, timeout: float = 10.0, threshold: float = 10.0) -> bool:
        """Video analysis moved to VideoVerificationController."""
        print(f"HDMI[{self.capture_source}]: Video analysis moved to VideoVerificationController")
        return False
        
    def record_session(self, duration: float, filename: str = None) -> bool:
        """Record a video session (alias for start_video_capture)."""
        return self.start_video_capture(duration, filename)
        
    def get_status(self) -> Dict[str, Any]:
        """Get controller status information."""
        base_status = {
            'controller_type': self.controller_type,
            'device_name': self.device_name,
            'capture_source': self.capture_source,
            'connected': self.is_connected,
            'capturing_video': self.is_capturing_video,
            'capturing_audio': False,  # Not supported
            'session_id': self.capture_session_id,
            'video_device': self.video_device,
            'output_path': str(self.output_path),
            'stream_resolution': self.stream_resolution,
            'stream_fps': self.stream_fps,
            'stream_bitrate': self.stream_bitrate,
            'capabilities': [
                'ffmpeg_streaming', 'screenshot_capture', 'video_capture', 
                'rolling_buffer', 'parallel_operations'
            ]
        }
        
        # Add stream status
        base_status.update(self.get_stream_status())
        
        return base_status


# Backward compatibility alias
HDMI_Stream_Controller = HDMIStreamController 
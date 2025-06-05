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
        
        # Service configuration
        self.service_name = kwargs.get('service_name', 'hdmi-stream')
        self.service_file_path = f"/etc/systemd/system/{self.service_name}.service"
        
        # Direct FFmpeg processes (for verification operations only)
        self.capture_process = None
        
        # Rolling buffer settings
        self.rolling_buffer_duration = 60  # seconds
        self.rolling_buffer_timeout = 600  # 1 hour instead of 3 minutes - remove auto-stop restriction
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
                
            # Test systemctl availability
            try:
                result = subprocess.run(['systemctl', '--version'], 
                                      capture_output=True, text=True, timeout=5)
                if result.returncode != 0:
                    print(f"HDMI[{self.capture_source}]: ERROR - systemctl not available")
                    return False
            except (subprocess.TimeoutExpired, FileNotFoundError):
                print(f"HDMI[{self.capture_source}]: ERROR - systemctl not found")
                return False
                
            # Generate systemd service file
            if not self._create_service_file():
                print(f"HDMI[{self.capture_source}]: ERROR - Failed to create service file")
                return False
                
            self.is_connected = True
            print(f"HDMI[{self.capture_source}]: Connected successfully")
            print(f"HDMI[{self.capture_source}]: Video device: {self.video_device}")
            print(f"HDMI[{self.capture_source}]: Output path: {self.output_path}")
            print(f"HDMI[{self.capture_source}]: Service name: {self.service_name}")
            return True
            
        except Exception as e:
            print(f"HDMI[{self.capture_source}]: Connection failed: {e}")
            return False
        
    def disconnect(self) -> bool:
        """Disconnect from the HDMI acquisition device."""
        print(f"HDMI[{self.capture_source}]: Disconnecting")
        
        # Stop streaming service
        self.stop_stream()
        
        # Stop direct capture processes
        self.stop_video_capture()
        
        self.is_connected = False
        print(f"HDMI[{self.capture_source}]: Disconnected")
        return True
        
    def _create_service_file(self) -> bool:
        """Create systemd service file for HDMI streaming."""
        try:
            service_content = f"""[Unit]
Description=HDMI Stream Service - {self.device_name}
After=network.target
Wants=network.target

[Service]
Type=simple
User=root
Group=root
ExecStart=/usr/bin/ffmpeg -f v4l2 -s {self.stream_resolution} -r {self.stream_fps} -i {self.video_device} -c:v libx264 -preset ultrafast -b:v {self.stream_bitrate} -tune zerolatency -g 24 -an -f hls -hls_time 2 -hls_list_size 3 -hls_flags delete_segments -hls_segment_type mpegts {self.stream_file}
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
WorkingDirectory={self.output_path}

[Install]
WantedBy=multi-user.target
"""
            
            print(f"HDMI[{self.capture_source}]: Creating service file: {self.service_file_path}")
            
            # Write service file (requires root privileges)
            try:
                with open(self.service_file_path, 'w') as f:
                    f.write(service_content)
            except PermissionError:
                # Try with sudo
                process = subprocess.run(['sudo', 'tee', self.service_file_path], 
                                       input=service_content, text=True, 
                                       capture_output=True)
                if process.returncode != 0:
                    print(f"HDMI[{self.capture_source}]: ERROR - Failed to write service file: {process.stderr}")
                    return False
            
            # Reload systemd daemon
            result = subprocess.run(['sudo', 'systemctl', 'daemon-reload'], 
                                  capture_output=True, text=True)
            if result.returncode != 0:
                print(f"HDMI[{self.capture_source}]: ERROR - Failed to reload systemd: {result.stderr}")
                return False
                
            print(f"HDMI[{self.capture_source}]: Service file created and systemd reloaded")
            return True
            
        except Exception as e:
            print(f"HDMI[{self.capture_source}]: Error creating service file: {e}")
            return False
    
    def start_stream(self) -> bool:
        """Start HDMI streaming using systemd service."""
        if not self.is_connected:
            print(f"HDMI[{self.capture_source}]: ERROR - Not connected")
            return False
            
        try:
            print(f"HDMI[{self.capture_source}]: Starting streaming service: {self.service_name}")
            print(f"HDMI[{self.capture_source}]: Resolution: {self.stream_resolution}@{self.stream_fps}fps")
            print(f"HDMI[{self.capture_source}]: Bitrate: {self.stream_bitrate}")
            print(f"HDMI[{self.capture_source}]: Output: {self.stream_file}")
            
            # Start systemd service
            result = subprocess.run(['sudo', 'systemctl', 'start', self.service_name], 
                                  capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                # Wait a moment for service to start
                time.sleep(2)
                
                # Verify service is running
                status = self._get_service_status()
                if status.get('active') == 'active' and status.get('sub') == 'running':
                    self.capture_session_id = f"hdmi_service_{int(time.time())}"
                    print(f"HDMI[{self.capture_source}]: Streaming service started successfully")
                    print(f"HDMI[{self.capture_source}]: Session ID: {self.capture_session_id}")
                    return True
                else:
                    print(f"HDMI[{self.capture_source}]: Service started but not running properly")
                    print(f"HDMI[{self.capture_source}]: Status: {status}")
                    return False
            else:
                print(f"HDMI[{self.capture_source}]: Failed to start service: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"HDMI[{self.capture_source}]: Error starting stream: {e}")
            return False
        
    def stop_stream(self) -> bool:
        """Stop HDMI streaming service."""
        try:
            print(f"HDMI[{self.capture_source}]: Stopping streaming service: {self.service_name}")
            
            # Stop systemd service
            result = subprocess.run(['sudo', 'systemctl', 'stop', self.service_name], 
                                  capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                print(f"HDMI[{self.capture_source}]: Streaming service stopped successfully")
                return True
            else:
                print(f"HDMI[{self.capture_source}]: Failed to stop service: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"HDMI[{self.capture_source}]: Error stopping stream: {e}")
            return False
        
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
        
    def _get_service_status(self) -> Dict[str, Any]:
        """Get detailed systemd service status."""
        try:
            # Get service status in JSON format
            result = subprocess.run(['systemctl', 'show', self.service_name, '--output=json'], 
                                  capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                # Parse systemctl show output (key=value format)
                status = {}
                for line in result.stdout.strip().split('\n'):
                    if '=' in line:
                        key, value = line.split('=', 1)
                        status[key] = value
                
                return {
                    'service_name': self.service_name,
                    'active': status.get('ActiveState', 'unknown'),
                    'sub': status.get('SubState', 'unknown'),
                    'load': status.get('LoadState', 'unknown'),
                    'main_pid': status.get('MainPID', '0'),
                    'memory_usage': status.get('MemoryCurrent', '0'),
                    'cpu_usage': status.get('CPUUsageNSec', '0'),
                    'restart_count': status.get('NRestarts', '0'),
                    'last_start': status.get('ActiveEnterTimestamp', 'unknown'),
                    'uptime': status.get('ActiveEnterTimestamp', 'unknown')
                }
            else:
                return {
                    'service_name': self.service_name,
                    'active': 'unknown',
                    'sub': 'unknown',
                    'error': result.stderr
                }
                
        except Exception as e:
            return {
                'service_name': self.service_name,
                'active': 'error',
                'sub': 'error',
                'error': str(e)
            }
        
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
        # Get streaming service status
        stream_status = self.get_stream_status()
        
        base_status = {
            'controller_type': self.controller_type,
            'device_name': self.device_name,
            'capture_source': self.capture_source,
            'connected': self.is_connected,
            'capturing_video': self.is_capturing_video,
            'capturing_audio': False,  # Not supported
            'session_id': self.capture_session_id if hasattr(self, 'capture_session_id') else None,
            'video_device': self.video_device,
            'output_path': str(self.output_path),
            'stream_resolution': self.stream_resolution,
            'stream_fps': self.stream_fps,
            'stream_bitrate': self.stream_bitrate,
            'service_name': self.service_name,
            'service_file_path': self.service_file_path,
            'capabilities': [
                'systemd_service_streaming', 'screenshot_capture', 'video_capture', 
                'rolling_buffer', 'parallel_operations', 'auto_restart'
            ]
        }
        
        # Add streaming status
        base_status.update(stream_status)
        
        return base_status


# Backward compatibility alias
HDMI_Stream_Controller = HDMIStreamController 
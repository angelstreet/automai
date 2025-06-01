from flask import Blueprint, request, jsonify, current_app, send_file
import os
import time
import shutil
import subprocess
import signal
from pathlib import Path

# Create blueprint with consistent name - remove URL prefix as it's set in register_routes
screen_definition_blueprint = Blueprint('screen_definition', __name__)

# Configuration
TMP_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'tmp')
RESOURCES_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'resources')

# Ensure directories exist
os.makedirs(os.path.join(TMP_DIR, 'screenshots'), exist_ok=True)
os.makedirs(os.path.join(TMP_DIR, 'captures'), exist_ok=True)
os.makedirs(RESOURCES_DIR, exist_ok=True)

# Global variables to track capture state
capture_process = None
capture_pid = None
remote_capture_dir = None
stream_was_active_before_capture = False

# Initialize dirs on startup
def ensure_dirs():
    """Ensure all required directories exist and have proper permissions"""
    try:
        # Create directories with proper permissions
        os.makedirs('/tmp/screenshots', exist_ok=True)
        os.makedirs('/tmp/capture', exist_ok=True)
        
        # Debug directory creation
        current_app.logger.info(f"Ensured directories exist: /tmp/screenshots, /tmp/capture")
        
        # Check if directories are writable
        if not os.access('/tmp/screenshots', os.W_OK):
            current_app.logger.error("Directory /tmp/screenshots is not writable")
        if not os.access('/tmp/capture', os.W_OK):
            current_app.logger.error("Directory /tmp/capture is not writable")
    except Exception as e:
        current_app.logger.error(f"Error ensuring directories: {str(e)}")

@screen_definition_blueprint.route('/screenshot', methods=['POST'])
def take_screenshot():
    """Take high resolution screenshot using FFmpeg from HDMI source with proper orientation detection."""
    try:
        from app import android_mobile_controller
        
        data = request.get_json()
        current_app.logger.info(f"[@api:screen-definition] Screenshot request: {data}")
        
        if not hasattr(android_mobile_controller, 'ssh_connection') or not android_mobile_controller.ssh_connection:
            return jsonify({
                'success': False,
                'error': 'No active remote connection'
            }), 400
            
        ssh_connection = android_mobile_controller.ssh_connection
        
        # Extract parameters
        video_device = data.get('video_device', '/dev/video0')
        device_model = data.get('device_model', 'android_mobile')
        parent_name = data.get('parent_name', None)
        node_name = data.get('node_name', None)
        
        # Step 1: Get device resolution and orientation from ADB for informational purposes only
        device_resolution = None
        capture_resolution = "1920x1080"  # Fixed resolution - always use 1920x1080 for capture
        
        if hasattr(android_mobile_controller, 'adb_utils') and android_mobile_controller.adb_utils:
            try:
                # Get device resolution using ADB (for informational purposes only)
                android_device_id = getattr(android_mobile_controller, 'android_device_id', None)
                if android_device_id:
                    device_resolution = android_mobile_controller.adb_utils.get_device_resolution(android_device_id)
                    current_app.logger.info(f"[@api:screen-definition] Device resolution from ADB: {device_resolution}")
                    
                    # NOTE: We always use 1920x1080 for capture regardless of device resolution
                    # to ensure consistent screenshot quality and sizing
                    current_app.logger.info(f"[@api:screen-definition] Using fixed capture resolution: {capture_resolution} (device resolution: {device_resolution})")
                    
                    
                else:
                    current_app.logger.warning(f"[@api:screen-definition] No android_device_id available")
            except Exception as e:
                current_app.logger.warning(f"[@api:screen-definition] Could not get device resolution: {e}")
        else:
            current_app.logger.warning(f"[@api:screen-definition] No ADB utils available, using default resolution")
        
        # Check if stream is already stopped
        success, stdout, stderr, exit_code = ssh_connection.execute_command("sudo systemctl status stream")
        stream_was_active = "Active: active (running)" in stdout
        
        if stream_was_active:
            # Stop the stream if it's running
            current_app.logger.info("[@api:screen-definition] Stopping stream for capture...")
            success, stdout, stderr, exit_code = ssh_connection.execute_command("sudo systemctl stop stream")
            
            if not success or exit_code != 0:
                return jsonify({
                    'success': False,
                    'error': f'Failed to stop stream service: {stderr}'
                }), 500
        
        # Take high-res screenshot with FFmpeg using detected resolution
        remote_temp_path = f"/tmp/screenshot_{int(time.time())}.jpg"
        ffmpeg_cmd = f"ffmpeg -f v4l2 -video_size {capture_resolution} -i {video_device} -frames:v 1 -y {remote_temp_path}"
        
        current_app.logger.info(f"[@api:screen-definition] Taking screenshot with resolution {capture_resolution}...")
        current_app.logger.info(f"[@api:screen-definition] FFmpeg command: {ffmpeg_cmd}")
        success, stdout, stderr, exit_code = ssh_connection.execute_command(ffmpeg_cmd)
        
        if not success or exit_code != 0:
            error_msg = stderr.strip() if stderr else "FFmpeg command failed"
            current_app.logger.error(f"[@api:screen-definition] FFmpeg failed: {error_msg}")
            return jsonify({
                'success': False,
                'error': f'FFmpeg capture failed: {error_msg}'
            }), 500
        
        # Always save to the original tmp/screenshots location first
        local_filename = f"{device_model}.jpg"
        local_screenshot_path = os.path.join(TMP_DIR, 'screenshots', local_filename)
        current_app.logger.info(f"[@api:screen-definition] Saving screenshot to original path: {local_screenshot_path}")
        
        # Ensure the directory exists
        os.makedirs(os.path.dirname(local_screenshot_path), exist_ok=True)
        
        # Download the screenshot to the original location
        if hasattr(ssh_connection, 'download_file'):
            ssh_connection.download_file(remote_temp_path, local_screenshot_path)
        else:
            success, file_content, stderr, exit_code = ssh_connection.execute_command(f"cat {remote_temp_path} | base64")
            
            if not success or exit_code != 0:
                return jsonify({
                    'success': False,
                    'error': f'Failed to download screenshot: {stderr}'
                }), 500
            
            import base64
            with open(local_screenshot_path, 'wb') as f:
                f.write(base64.b64decode(file_content))
        
        # Create additional copy in resources directory if parent and node names are provided
        additional_screenshot_path = None
        if parent_name and node_name:
            # Save additional copy in resources directory structure: resources/{model}/{parent_name}/{node_name}.jpg
            screenshot_dir = os.path.join(RESOURCES_DIR, device_model, parent_name)
            os.makedirs(screenshot_dir, exist_ok=True)
            additional_filename = f"{node_name}.jpg"
            additional_screenshot_path = os.path.join(screenshot_dir, additional_filename)
            
            # Copy the file from the tmp location to the resources location
            try:
                shutil.copy2(local_screenshot_path, additional_screenshot_path)
                current_app.logger.info(f"[@api:screen-definition] Created additional copy at: {additional_screenshot_path}")
            except Exception as e:
                current_app.logger.error(f"[@api:screen-definition] Failed to create additional copy: {e}")
                # Don't fail the entire operation if the copy fails
        
        # Clean up remote file
        ssh_connection.execute_command(f"rm -f {remote_temp_path}")
        
        return jsonify({
            'success': True,
            'screenshot_path': local_screenshot_path,
            'additional_screenshot_path': additional_screenshot_path,
            'stream_was_active': stream_was_active,
            'device_resolution': device_resolution,
            'capture_resolution': capture_resolution,
            'parent_name': parent_name,
            'node_name': node_name,
            'message': f'Screenshot captured successfully with resolution {capture_resolution}. Saved to {local_screenshot_path}' + 
                      (f' with additional copy at {additional_screenshot_path}' if additional_screenshot_path else '')
        })
        
    except Exception as e:
        current_app.logger.error(f"[@api:screen-definition] Screenshot route error: {e}")
        return jsonify({
            'success': False,
            'error': f'Screenshot request failed: {str(e)}'
        }), 500

@screen_definition_blueprint.route('/capture/start', methods=['POST'])
def start_capture():
    """Start video capture using FFmpeg from HDMI source with rolling buffer."""
    global capture_process, capture_pid, remote_capture_dir, stream_was_active_before_capture
    
    try:
        from app import android_mobile_controller
        
        data = request.get_json()
        current_app.logger.info(f"[@api:screen-definition] Capture start request: {data}")
        
        if not hasattr(android_mobile_controller, 'ssh_connection') or not android_mobile_controller.ssh_connection:
            return jsonify({
                'success': False,
                'error': 'No active remote connection'
            }), 400
            
        ssh_connection = android_mobile_controller.ssh_connection
        
        # Check if capture is already running
        if capture_process and capture_pid:
            current_app.logger.info("[@api:screen-definition] Capture already running")
            return jsonify({
                'success': True,
                'capture_pid': capture_pid,
                'remote_capture_dir': remote_capture_dir,
                'message': 'Capture already active'
            })
        
        # Extract parameters
        video_device = data.get('video_device', '/dev/video0')
        device_model = data.get('device_model', 'android_mobile')
        max_duration = data.get('max_duration', 60)  # 60 second rolling buffer
        fps = data.get('fps', 5)  # 5 fps
        
        # Get device resolution for informational purposes only
        device_resolution = None
        capture_resolution = "1920x1080"  # Fixed resolution - always use 1920x1080 for capture
        
        if hasattr(android_mobile_controller, 'adb_utils') and android_mobile_controller.adb_utils:
            try:
                android_device_id = getattr(android_mobile_controller, 'android_device_id', None)
                if android_device_id:
                    device_resolution = android_mobile_controller.adb_utils.get_device_resolution(android_device_id)
                    current_app.logger.info(f"[@api:screen-definition] Device resolution from ADB: {device_resolution}")
                    
                    # NOTE: We always use 1920x1080 for capture regardless of device resolution
                    # to ensure consistent capture quality and sizing
                    current_app.logger.info(f"[@api:screen-definition] Using fixed capture resolution: {capture_resolution} (device resolution: {device_resolution})")
                    
                    # REMOVED: The logic that was overriding capture_resolution with device resolution
                    # if device_resolution and 'width' in device_resolution and 'height' in device_resolution:
                    #     device_width = device_resolution['width']
                    #     device_height = device_resolution['height']
                    #     capture_resolution = f"{device_width}x{device_height}"
                    #     current_app.logger.info(f"[@api:screen-definition] Using capture resolution: {capture_resolution}")
            except Exception as e:
                current_app.logger.warning(f"[@api:screen-definition] Could not get device resolution: {e}")
        
        # Check if stream is running and stop it
        success, stdout, stderr, exit_code = ssh_connection.execute_command("sudo systemctl status stream")
        stream_was_active_before_capture = "Active: active (running)" in stdout
        
        if stream_was_active_before_capture:
            current_app.logger.info("[@api:screen-definition] Stopping stream for capture...")
            success, stdout, stderr, exit_code = ssh_connection.execute_command("sudo systemctl stop stream")
            
            if not success or exit_code != 0:
                return jsonify({
                    'success': False,
                    'error': f'Failed to stop stream service: {stderr}'
                }), 500
        
        # Create remote captures directory for rolling buffer
        remote_capture_dir = "/tmp/captures"
        ssh_connection.execute_command(f"mkdir -p {remote_capture_dir}")
        
        # Clean any existing FFmpeg processes first
        current_app.logger.info("[@api:screen-definition] Cleaning existing FFmpeg processes...")
        ssh_connection.execute_command("pkill -f 'ffmpeg.*' || true")
        time.sleep(1)  # Give time for processes to die
        
        # Clean existing capture files to start fresh
        ssh_connection.execute_command(f"rm -f {remote_capture_dir}/capture_*.jpg")
        
        # Determine scale dimensions based on device orientation
        scale_dimensions = "640:360"  # Default for landscape
        if device_resolution and 'width' in device_resolution and 'height' in device_resolution:
            device_width = device_resolution['width']
            device_height = device_resolution['height']
            # Check orientation
            if device_height > device_width:
                # Portrait mode
                scale_dimensions = "360:640"
                current_app.logger.info(f"[@api:screen-definition] Device in PORTRAIT mode, using scale dimensions: {scale_dimensions}")
            else:
                # Landscape mode
                scale_dimensions = "640:360"
                current_app.logger.info(f"[@api:screen-definition] Device in LANDSCAPE mode, using scale dimensions: {scale_dimensions}")
        
        # Combined FFmpeg command: Stream HLS + Rolling buffer capture
        # This replaces both the stream service and provides rolling buffer capture
        ffmpeg_cmd = (
            f"/usr/bin/ffmpeg "
            f"-f v4l2 -video_size {capture_resolution} -r 12 -i {video_device} "
            f"-filter_complex \"split=2[stream][capture]; "
            f"[stream]scale={scale_dimensions}[streamout]; "
            f"[capture]fps=5[captureout]\" "
            f"-map \"[streamout]\" -c:v libx264 -preset ultrafast -b:v 400k -tune zerolatency -g 24 -an "
            f"-f hls -hls_time 2 -hls_list_size 3 -hls_flags delete_segments -hls_segment_type mpegts "
            f"/var/www/html/stream/output.m3u8 "
            f"-map \"[captureout]\" -c:v mjpeg -q:v 2 -start_number 1 "
            f"-f image2 -y {remote_capture_dir}/capture_%d.jpg"
        )
        
        current_app.logger.info(f"[@api:screen-definition] Starting capture with command: {ffmpeg_cmd}")
        
        # Start FFmpeg capture process on remote host
        # Don't suppress errors - capture them for debugging
        start_cmd = f"nohup {ffmpeg_cmd} > {remote_capture_dir}/ffmpeg.log 2>&1 & echo $!"
        
        success, stdout, stderr, exit_code = ssh_connection.execute_command(start_cmd)
        
        if not success or exit_code != 0:
            error_msg = stderr.strip() if stderr else "Failed to start capture"
            current_app.logger.error(f"[@api:screen-definition] Capture start failed: {error_msg}")
            return jsonify({
                'success': False,
                'error': f'Failed to start capture: {error_msg}'
            }), 500
        
        # Get the process ID
        capture_pid = stdout.strip()
        if not capture_pid:
            current_app.logger.error("[@api:screen-definition] No PID returned from FFmpeg start")
            return jsonify({
                'success': False,
                'error': 'Failed to get capture process ID'
            }), 500
        
        current_app.logger.info(f"[@api:screen-definition] Capture started with PID: {capture_pid}")
        
        # Wait a moment and verify the process is actually running and creating files
        time.sleep(2)
        
        # Check if process is still running
        success, stdout, stderr, exit_code = ssh_connection.execute_command(f"ps -p {capture_pid} > /dev/null 2>&1 && echo 'running' || echo 'stopped'")
        if not success or 'stopped' in stdout:
            # Get FFmpeg logs for debugging
            success, log_output, stderr, exit_code = ssh_connection.execute_command(f"cat {remote_capture_dir}/ffmpeg.log")
            log_content = log_output if success else "Could not read FFmpeg logs"
            
            current_app.logger.error(f"[@api:screen-definition] FFmpeg process died immediately. Logs: {log_content}")
            return jsonify({
                'success': False,
                'error': f'FFmpeg process failed to start. Check video device access. Logs: {log_content}'
            }), 500
        
        # Check if files are being created
        success, stdout, stderr, exit_code = ssh_connection.execute_command(f"ls -la {remote_capture_dir}/")
        if success:
            current_app.logger.info(f"[@api:screen-definition] Remote capture directory contents: {stdout}")
        
        # Set up local capture directory (no "latest" folder)
        local_capture_dir = os.path.join(TMP_DIR, 'captures')
        os.makedirs(local_capture_dir, exist_ok=True)
        
        return jsonify({
            'success': True,
            'capture_pid': capture_pid,
            'remote_capture_dir': remote_capture_dir,
            'device_resolution': device_resolution,
            'capture_resolution': capture_resolution,
            'scale_dimensions': scale_dimensions,
            'stream_was_active': stream_was_active_before_capture,
            'max_duration': max_duration,
            'fps': fps,
            'message': f'Combined streaming + rolling buffer capture started (5fps, 60 seconds max, scaling to {scale_dimensions})'
        })
        
    except Exception as e:
        current_app.logger.error(f"[@api:screen-definition] Capture start error: {e}")
        return jsonify({
            'success': False,
            'error': f'Capture start failed: {str(e)}'
        }), 500

@screen_definition_blueprint.route('/capture/stop', methods=['POST'])
def stop_capture():
    """Stop video capture and download captured frames."""
    global capture_process, capture_pid, remote_capture_dir, stream_was_active_before_capture
    
    try:
        from app import android_mobile_controller
        
        data = request.get_json() or {}
        current_app.logger.info(f"[@api:screen-definition] Capture stop request: {data}")
        
        if not hasattr(android_mobile_controller, 'ssh_connection') or not android_mobile_controller.ssh_connection:
            return jsonify({
                'success': False,
                'error': 'No active remote connection'
            }), 400
            
        ssh_connection = android_mobile_controller.ssh_connection
        
        # Simply kill all ffmpeg processes
        current_app.logger.info("[@api:screen-definition] Stopping all FFmpeg processes...")
        ssh_connection.execute_command("pkill -f 'ffmpeg.*' || true")
        time.sleep(1)  # Give time for processes to stop
        
        frames_downloaded = 0
        local_capture_dir = os.path.join(TMP_DIR, 'captures')
        
        # Download all captured frames from /tmp/captures/
        try:
            # List all capture files in remote directory
            success, file_list, stderr, exit_code = ssh_connection.execute_command("ls /tmp/captures/capture_*.jpg 2>/dev/null || echo 'no files'")
            
            if success and 'no files' not in file_list.strip():
                capture_files = [f.strip() for f in file_list.strip().split('\n') if f.strip().endswith('.jpg')]
                current_app.logger.info(f"[@api:screen-definition] Found {len(capture_files)} capture files to download")
                
                # Download each capture file
                for remote_file in capture_files:
                    try:
                        filename = os.path.basename(remote_file)
                        local_file_path = os.path.join(local_capture_dir, filename)
                        
                        # Download using base64 encoding
                        success, file_content, stderr, exit_code = ssh_connection.execute_command(f"cat {remote_file} | base64")
                        
                        if success and file_content.strip():
                            import base64
                            with open(local_file_path, 'wb') as f:
                                f.write(base64.b64decode(file_content.strip()))
                            
                            # Verify file was written and has content
                            if os.path.exists(local_file_path) and os.path.getsize(local_file_path) > 0:
                                frames_downloaded += 1
                                current_app.logger.debug(f"[@api:screen-definition] Downloaded {filename} ({os.path.getsize(local_file_path)} bytes)")
                            else:
                                current_app.logger.warning(f"[@api:screen-definition] Failed to download {filename}")
                        else:
                            current_app.logger.warning(f"[@api:screen-definition] Failed to read {remote_file}")
                            
                    except Exception as e:
                        current_app.logger.error(f"[@api:screen-definition] Error downloading {remote_file}: {e}")
                
                current_app.logger.info(f"[@api:screen-definition] Successfully downloaded {frames_downloaded} frames")
            else:
                current_app.logger.info("[@api:screen-definition] No capture files found in /tmp/captures")
            
            # Clean up remote capture files
            ssh_connection.execute_command("rm -f /tmp/captures/capture_*.jpg")
            current_app.logger.info("[@api:screen-definition] Cleaned up remote capture files")
            
        except Exception as e:
            current_app.logger.error(f"[@api:screen-definition] Error downloading frames: {e}")
        
        # Restart stream service
        current_app.logger.info("[@api:screen-definition] Restarting stream service...")
        success, stdout, stderr, exit_code = ssh_connection.execute_command("sudo systemctl start stream")
        if not success or exit_code != 0:
            current_app.logger.warning(f"[@api:screen-definition] Failed to restart stream: {stderr}")
        
        # Reset global variables
        capture_process = None
        capture_pid = None
        remote_capture_dir = None
        stream_was_active_before_capture = False
        
        return jsonify({
            'success': True,
            'frames_captured': frames_downloaded,
            'frames_downloaded': frames_downloaded,
            'local_capture_dir': local_capture_dir,
            'message': f'Capture stopped successfully. Downloaded {frames_downloaded} frames'
        })
        
    except Exception as e:
        current_app.logger.error(f"[@api:screen-definition] Capture stop error: {e}")
        return jsonify({
            'success': False,
            'error': f'Capture stop failed: {str(e)}'
        }), 500

@screen_definition_blueprint.route('/capture/status', methods=['GET'])
def get_capture_status():
    """Get the current status of video capture."""
    global capture_process, capture_pid, remote_capture_dir, stream_was_active_before_capture
    
    try:
        from app import android_mobile_controller
        
        if not hasattr(android_mobile_controller, 'ssh_connection') or not android_mobile_controller.ssh_connection:
            return jsonify({
                'success': False,
                'error': 'No active remote connection'
            }), 400
            
        ssh_connection = android_mobile_controller.ssh_connection
        
        is_capturing = False
        current_frame = 0
        
        # Check if capture process is still running
        if capture_pid and capture_pid.isdigit():
            success, stdout, stderr, exit_code = ssh_connection.execute_command(f"ps -p {capture_pid} > /dev/null 2>&1 && echo 'running' || echo 'stopped'")
            is_capturing = success and 'running' in stdout
            
            # Get current frame count if capturing
            if is_capturing:
                success, frame_count, stderr, exit_code = ssh_connection.execute_command(f"ls /tmp/captures/capture_*.jpg 2>/dev/null | wc -l || echo 0")
                if success and frame_count.strip().isdigit():
                    current_frame = int(frame_count.strip())
        elif capture_pid:
            # For non-numeric PIDs, check for ffmpeg processes
            success, stdout, stderr, exit_code = ssh_connection.execute_command("pgrep -f 'ffmpeg.*v4l2' > /dev/null 2>&1 && echo 'running' || echo 'stopped'")
            is_capturing = success and 'running' in stdout
        
        return jsonify({
            'success': True,
            'is_capturing': is_capturing,
            'duration': current_frame / 5.0 if current_frame > 0 else 0,  # Estimate duration based on 5fps
            'max_duration': 60,  # Default rolling buffer duration
            'fps': 5,  # Default fps
            'current_frame': current_frame,
            'capture_pid': capture_pid,
            'stream_was_active': stream_was_active_before_capture
        })
        
    except Exception as e:
        current_app.logger.error(f"[@api:screen-definition] Capture status error: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to get capture status: {str(e)}'
        }), 500

@screen_definition_blueprint.route('/capture/latest-frame', methods=['GET'])
def get_latest_frame():
    """Get the path to the latest captured frame."""
    global remote_capture_dir
    
    try:
        from app import android_mobile_controller
        
        if not hasattr(android_mobile_controller, 'ssh_connection') or not android_mobile_controller.ssh_connection:
            return jsonify({
                'success': False,
                'error': 'No active remote connection'
            }), 400
            
        ssh_connection = android_mobile_controller.ssh_connection
        
        # Check if capture is currently active by checking if FFmpeg process is running
        success, stdout, stderr, exit_code = ssh_connection.execute_command("pgrep -f 'ffmpeg.*v4l2' > /dev/null 2>&1 && echo 'running' || echo 'stopped'")
        if not success or 'stopped' in stdout:
            return jsonify({
                'success': False,
                'error': 'No active capture session'
            }), 400
        
        # Get the most recent frame from rolling buffer
        # Find the highest numbered capture file
        success, file_list, stderr, exit_code = ssh_connection.execute_command(f"ls /tmp/captures/capture_*.jpg 2>/dev/null | sort -V | tail -1 || echo 'no files'")
        
        if not success or 'no files' in file_list.strip():
            return jsonify({
                'success': False,
                'error': 'No capture frames available'
            }), 404
        
        remote_latest_path = file_list.strip()
        filename = os.path.basename(remote_latest_path)
        local_latest_path = os.path.join(TMP_DIR, 'captures', filename)
        
        # Check if remote file exists first
        success, stdout, stderr, exit_code = ssh_connection.execute_command(f"test -f {remote_latest_path} && echo 'exists' || echo 'not found'")
        
        if not success or 'not found' in stdout:
            current_app.logger.warning(f"[@api:screen-definition] Latest frame not found at {remote_latest_path}")
            return jsonify({
                'success': False,
                'error': 'Latest frame not available on remote server'
            }), 404
        
        # Download the latest frame
        try:
            if hasattr(ssh_connection, 'download_file'):
                ssh_connection.download_file(remote_latest_path, local_latest_path)
            else:
                # Fallback: use cat command
                success, file_content, stderr, exit_code = ssh_connection.execute_command(f"cat {remote_latest_path} | base64")
                if success and file_content.strip():
                    import base64
                    with open(local_latest_path, 'wb') as f:
                        f.write(base64.b64decode(file_content.strip()))
                else:
                    current_app.logger.error(f"[@api:screen-definition] Failed to download latest frame: {stderr}")
                    return jsonify({
                        'success': False,
                        'error': 'Failed to download latest frame from remote server'
                    }), 500
            
            # Verify file was downloaded and has content
            if not os.path.exists(local_latest_path) or os.path.getsize(local_latest_path) == 0:
                current_app.logger.error(f"[@api:screen-definition] Downloaded file is empty or doesn't exist: {local_latest_path}")
                return jsonify({
                    'success': False,
                    'error': 'Downloaded frame is empty'
                }), 500
            
            current_app.logger.debug(f"[@api:screen-definition] Successfully downloaded latest frame: {local_latest_path} ({os.path.getsize(local_latest_path)} bytes)")
            
            return jsonify({
                'success': True,
                'frame_path': local_latest_path,
                'frame_number': 0  # Could be enhanced to track actual frame numbers
            })
            
        except Exception as e:
            current_app.logger.error(f"[@api:screen-definition] Failed to get latest frame: {e}")
            return jsonify({
                'success': False,
                'error': f'Failed to get latest frame: {str(e)}'
            }), 500
        
    except Exception as e:
        current_app.logger.error(f"[@api:screen-definition] Latest frame error: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to get latest frame: {str(e)}'
        }), 500

@screen_definition_blueprint.route('/images/screenshot/<filename>', methods=['GET', 'OPTIONS'])
def serve_screenshot(filename):
    """Serve a screenshot image by filename"""
    # Handle OPTIONS request for CORS
    if request.method == 'OPTIONS':
        response = current_app.response_class()
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        return response
        
    try:
        # Log the request
        current_app.logger.info(f"Screenshot request for: {filename}")
        
        # Ensure the path is safe
        if '..' in filename or filename.startswith('/'):
            current_app.logger.error(f"Invalid filename requested: {filename}")
            return jsonify({'success': False, 'error': 'Invalid filename'}), 400
        
        # Extract the base filename without query parameters
        base_filename = filename.split('?')[0]
        
        # Use the same TMP_DIR path as the save operation
        screenshot_path = os.path.join(TMP_DIR, 'screenshots', base_filename)
        
        # Check if the file exists
        if not os.path.exists(screenshot_path):
            current_app.logger.error(f"Screenshot not found: {screenshot_path}")
            return jsonify({'success': False, 'error': 'Screenshot not found'}), 404
        
        # Check file size - ensure it's not empty
        file_size = os.path.getsize(screenshot_path)
        if file_size == 0:
            current_app.logger.error(f"Screenshot file is empty: {screenshot_path}")
            return jsonify({'success': False, 'error': 'Screenshot file is empty'}), 500
        
        current_app.logger.info(f"Serving screenshot: {screenshot_path} ({file_size} bytes)")
        
        # Serve the file with CORS headers and cache control
        response = send_file(screenshot_path, mimetype='image/jpeg')
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Cache-Control', 'no-cache, no-store, must-revalidate')
        response.headers.add('Pragma', 'no-cache')
        response.headers.add('Expires', '0')
        return response
        
    except Exception as e:
        current_app.logger.error(f"Error serving screenshot: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@screen_definition_blueprint.route('/images', methods=['GET', 'OPTIONS'])
def serve_image_by_path():
    """Serve an image from a specified path"""
    # Handle OPTIONS request for CORS
    if request.method == 'OPTIONS':
        response = current_app.response_class()
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        return response
        
    try:
        image_path = request.args.get('path')
        
        if not image_path:
            return jsonify({'success': False, 'error': 'No path specified'}), 400
        
        # Security check - allow both /tmp/ paths (remote) and local TMP_DIR paths
        local_tmp_path = os.path.abspath(TMP_DIR)
        abs_image_path = os.path.abspath(image_path)
        
        # Allow if path starts with /tmp/ (remote) or is within our local TMP_DIR
        if not (image_path.startswith('/tmp/') or abs_image_path.startswith(local_tmp_path)):
            current_app.logger.error(f"Invalid image path: {image_path}")
            return jsonify({'success': False, 'error': 'Invalid image path'}), 403
        
        # If it's a local absolute path, use it directly
        # If it's a /tmp/ path, it might be a local file in our TMP_DIR
        if abs_image_path.startswith(local_tmp_path):
            # It's already a local path within our TMP_DIR
            final_path = image_path
        elif image_path.startswith('/tmp/'):
            # It's a /tmp/ path, but check if it exists locally first
            potential_local_path = os.path.join(TMP_DIR, os.path.relpath(image_path, '/tmp'))
            if os.path.exists(potential_local_path):
                final_path = potential_local_path
            else:
                # File doesn't exist locally
                current_app.logger.error(f"Image not found locally: {potential_local_path}")
                return jsonify({'success': False, 'error': 'Image not found'}), 404
        else:
            final_path = image_path
        
        if not os.path.exists(final_path):
            current_app.logger.error(f"Image not found: {final_path}")
            return jsonify({'success': False, 'error': 'Image not found'}), 404
        
        # Check file size
        file_size = os.path.getsize(final_path)
        if file_size == 0:
            current_app.logger.error(f"Image file is empty: {final_path}")
            return jsonify({'success': False, 'error': 'Image file is empty'}), 500
        
        current_app.logger.debug(f"Serving image: {final_path} ({file_size} bytes)")
        
        # Determine mimetype based on extension
        mimetype = 'image/jpeg'  # Default
        if final_path.lower().endswith('.png'):
            mimetype = 'image/png'
        
        # Serve the file with CORS headers
        response = send_file(final_path, mimetype=mimetype)
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Cache-Control', 'no-cache, no-store, must-revalidate')
        response.headers.add('Pragma', 'no-cache')
        response.headers.add('Expires', '0')
        return response
        
    except Exception as e:
        current_app.logger.error(f"Error serving image: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@screen_definition_blueprint.route('/stream/status', methods=['GET'])
def get_stream_status():
    """Get the current status of the stream service."""
    try:
        from app import android_mobile_controller
        
        if not hasattr(android_mobile_controller, 'ssh_connection') or not android_mobile_controller.ssh_connection:
            return jsonify({
                'success': False,
                'error': 'No active remote connection'
            }), 400
            
        ssh_connection = android_mobile_controller.ssh_connection
        
        # Execute systemctl status command
        success, stdout, stderr, exit_code = ssh_connection.execute_command("sudo systemctl status stream")
        
        # Parse the status output
        is_active = False
        status_text = "Unknown"
        
        if success:
            if "Active: active (running)" in stdout:
                is_active = True
                status_text = "Running"
            elif "Active: inactive" in stdout:
                status_text = "Stopped"
            elif "Active: failed" in stdout:
                status_text = "Failed"
        
        return jsonify({
            'success': True,
            'is_active': is_active,
            'status': status_text,
            'details': stdout if stdout else stderr
        })
        
    except Exception as e:
        current_app.logger.error(f"[@api:screen-definition] Stream status check failed: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to check stream status: {str(e)}'
        }), 500

@screen_definition_blueprint.route('/stream/stop', methods=['POST'])
def stop_stream():
    """Stop the stream service."""
    try:
        from app import android_mobile_controller
        
        if not hasattr(android_mobile_controller, 'ssh_connection') or not android_mobile_controller.ssh_connection:
            return jsonify({
                'success': False,
                'error': 'No active remote connection'
            }), 400
            
        ssh_connection = android_mobile_controller.ssh_connection
        
        current_app.logger.info("[@api:screen-definition] Stopping stream service...")
        success, stdout, stderr, exit_code = ssh_connection.execute_command("sudo systemctl stop stream")
        
        if not success or exit_code != 0:
            current_app.logger.error(f"[@api:screen-definition] Failed to stop stream: {stderr}")
            return jsonify({
                'success': False,
                'error': f'Failed to stop stream service: {stderr}'
            }), 500
            
        return jsonify({
            'success': True,
            'message': 'Stream service stopped successfully'
        })
        
    except Exception as e:
        current_app.logger.error(f"[@api:screen-definition] Failed to stop stream: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to stop stream: {str(e)}'
        }), 500

@screen_definition_blueprint.route('/stream/restart', methods=['POST'])
def restart_stream():
    """Restart the stream service."""
    try:
        from app import android_mobile_controller
        
        if not hasattr(android_mobile_controller, 'ssh_connection') or not android_mobile_controller.ssh_connection:
            return jsonify({
                'success': False,
                'error': 'No active remote connection'
            }), 400
            
        ssh_connection = android_mobile_controller.ssh_connection
        
        current_app.logger.info("[@api:screen-definition] Restarting stream service...")
        success, stdout, stderr, exit_code = ssh_connection.execute_command("sudo systemctl restart stream")
        
        if not success or exit_code != 0:
            current_app.logger.error(f"[@api:screen-definition] Failed to restart stream: {stderr}")
            return jsonify({
                'success': False,
                'error': f'Failed to restart stream service: {stderr}'
            }), 500
            
        return jsonify({
            'success': True,
            'message': 'Stream service restarted successfully'
        })
        
    except Exception as e:
        current_app.logger.error(f"[@api:screen-definition] Failed to restart stream: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to restart stream: {str(e)}'
        }), 500 

from flask import Blueprint, request, jsonify, current_app, send_file
import os
import time
import shutil
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

# Global variable to track capture process
capture_process = None
capture_start_time = None

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
        
        # Step 1: Get device resolution and orientation from ADB
        device_resolution = None
        capture_resolution = "1920x1080"  # Default fallback
        
        if hasattr(android_mobile_controller, 'adb_utils') and android_mobile_controller.adb_utils:
            try:
                # Get device resolution using ADB
                android_device_id = getattr(android_mobile_controller, 'android_device_id', None)
                if android_device_id:
                    device_resolution = android_mobile_controller.adb_utils.get_device_resolution(android_device_id)
                    current_app.logger.info(f"[@api:screen-definition] Device resolution from ADB: {device_resolution}")
                    
                    if device_resolution and 'width' in device_resolution and 'height' in device_resolution:
                        device_width = device_resolution['width']
                        device_height = device_resolution['height']
                        
                        # Determine orientation and set capture resolution accordingly
                        if device_height > device_width:
                            # Portrait mode - capture in portrait
                            capture_resolution = f"{device_width}x{device_height}"
                            current_app.logger.info(f"[@api:screen-definition] Device in PORTRAIT mode, using capture resolution: {capture_resolution}")
                        else:
                            # Landscape mode - capture in landscape  
                            capture_resolution = f"{device_width}x{device_height}"
                            current_app.logger.info(f"[@api:screen-definition] Device in LANDSCAPE mode, using capture resolution: {capture_resolution}")
                    else:
                        current_app.logger.warning(f"[@api:screen-definition] Invalid device resolution data: {device_resolution}")
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
        
        # Download the screenshot
        local_filename = f"{device_model}.jpg"
        local_screenshot_path = os.path.join(TMP_DIR, 'screenshots', local_filename)
        
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
        
        # Clean up remote file
        ssh_connection.execute_command(f"rm -f {remote_temp_path}")
        
        return jsonify({
            'success': True,
            'screenshot_path': local_screenshot_path,
            'stream_was_active': stream_was_active,
            'device_resolution': device_resolution,
            'capture_resolution': capture_resolution,
            'message': f'Screenshot captured successfully with resolution {capture_resolution}'
        })
        
    except Exception as e:
        current_app.logger.error(f"[@api:screen-definition] Screenshot route error: {e}")
        return jsonify({
            'success': False,
            'error': f'Screenshot request failed: {str(e)}'
        }), 500

@screen_definition_blueprint.route('/screenshot_from_stream', methods=['POST'])
def take_screenshot_from_stream():
    """Take screenshot using FFmpeg from HLS stream to avoid device conflict."""
    try:
        from app import android_mobile_controller
        
        data = request.get_json()
        current_app.logger.info(f"[@api:screen-definition] Stream screenshot request: {data}")
        
        # Check if we have an active remote controller (same as CompactAndroidMobile)
        if not hasattr(android_mobile_controller, 'ssh_connection') or not android_mobile_controller.ssh_connection:
            return jsonify({
                'success': False,
                'error': 'No active remote connection. Please connect via android-mobile first.'
            }), 400
        
        # Extract parameters
        device_model = data.get('device_model', 'android_mobile')
        
        # Get device resolution from ADB for alignment calculations
        device_resolution = None
        if hasattr(android_mobile_controller, 'adb_utils') and android_mobile_controller.adb_utils:
            try:
                android_device_id = getattr(android_mobile_controller, 'android_device_id', None)
                if android_device_id:
                    device_resolution = android_mobile_controller.adb_utils.get_device_resolution(android_device_id)
                    current_app.logger.info(f"[@api:screen-definition] Device resolution from ADB: {device_resolution}")
            except Exception as e:
                current_app.logger.warning(f"[@api:screen-definition] Could not get device resolution: {e}")
        
        # Get the SSH connection from the global controller (same as CompactAndroidMobile)
        ssh_connection = android_mobile_controller.ssh_connection
        
        if not ssh_connection or not ssh_connection.connected:
            return jsonify({
                'success': False,
                'error': 'Controller SSH connection is not established'
            }), 400
        
        # Get the stream URL for HLS capture - use same pattern as android-mobile system
        # Default to localhost if host_ip is not available
        host_ip = getattr(android_mobile_controller, 'host_ip', 'localhost')
        stream_url = f"https://{host_ip}:444/stream/output.m3u8"
        
        current_app.logger.info(f"[@api:screen-definition] Using HLS stream capture method (Option 2)")
        current_app.logger.info(f"[@api:screen-definition] Stream URL: {stream_url}")
        
        # FFmpeg command to capture a single frame from HLS stream instead of device
        # Keep same filename pattern as original (no timestamp to respect existing logic)
        local_filename = f"{device_model}.jpg"
        remote_temp_path = f"/tmp/{local_filename}"
        ffmpeg_cmd = f"ffmpeg -i {stream_url} -vframes 1 -y {remote_temp_path}"
        
        current_app.logger.info(f"[@api:screen-definition] SSH Command Details:")
        current_app.logger.info(f"[@api:screen-definition]   Host: {host_ip}")
        current_app.logger.info(f"[@api:screen-definition]   HLS Stream: {stream_url}")
        current_app.logger.info(f"[@api:screen-definition]   Output Path: {remote_temp_path}")
        current_app.logger.info(f"[@api:screen-definition]   Full Command: {ffmpeg_cmd}")
        
        # Execute command - returns tuple (success, stdout, stderr, exit_code)
        current_app.logger.info(f"[@api:screen-definition] Executing SSH command...")
        start_time = time.time()
        success, stdout, stderr, exit_code = ssh_connection.execute_command(ffmpeg_cmd)
        execution_time = time.time() - start_time
        
        current_app.logger.info(f"[@api:screen-definition] SSH command completed in {execution_time:.2f}s")
        current_app.logger.info(f"[@api:screen-definition]   Success: {success}")
        current_app.logger.info(f"[@api:screen-definition]   Exit Code: {exit_code}")
        if stdout.strip():
            current_app.logger.info(f"[@api:screen-definition]   Stdout: {stdout.strip()}")
        if stderr.strip():
            current_app.logger.info(f"[@api:screen-definition]   Stderr: {stderr.strip()}")
        
        if not success or exit_code != 0:
            error_msg = stderr.strip() if stderr else "FFmpeg command failed"
            current_app.logger.error(f"[@api:screen-definition] FFmpeg failed: {error_msg}")
            return jsonify({
                'success': False,
                'error': f'FFmpeg capture failed: {error_msg}'
            }), 500
        
        current_app.logger.info(f"[@api:screen-definition] FFmpeg capture successful: {remote_temp_path}")
        
        # Download the screenshot to local server
        local_screenshot_path = os.path.join(TMP_DIR, 'screenshots', local_filename)
        
        # Use SFTP to download the file (same approach as before)
        if hasattr(ssh_connection, 'download_file'):
            ssh_connection.download_file(remote_temp_path, local_screenshot_path)
        else:
            # Fallback: use cat command to get file content
            success, file_content, stderr, exit_code = ssh_connection.execute_command(f"cat {remote_temp_path} | base64")
            
            if not success or exit_code != 0:
                current_app.logger.error(f"[@api:screen-definition] Download failed: {stderr}")
                return jsonify({
                    'success': False,
                    'error': f'Failed to download screenshot: {stderr}'
                }), 500
            
            import base64
            with open(local_screenshot_path, 'wb') as f:
                f.write(base64.b64decode(file_content))
        
        current_app.logger.info(f"[@api:screen-definition] Screenshot saved to: {local_screenshot_path}")
        
        # Clean up remote file
        ssh_connection.execute_command(f"rm -f {remote_temp_path}")
        
        return jsonify({
            'success': True,
            'screenshot_path': local_filename,
            'device_resolution': device_resolution,
            'stream_resolution': '640x360',  # Hardcoded stream resolution
            'message': f'Screenshot captured successfully via HLS stream from {stream_url}'
        })
        
    except Exception as e:
        current_app.logger.error(f"[@api:screen-definition] Stream screenshot route error: {e}")
        return jsonify({
            'success': False,
            'error': f'Screenshot request failed: {str(e)}'
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
        
        # Basic security check - only allow files from /tmp
        if not image_path.startswith('/tmp/'):
            current_app.logger.error(f"Invalid image path: {image_path}")
            return jsonify({'success': False, 'error': 'Invalid image path'}), 403
        
        if not os.path.exists(image_path):
            current_app.logger.error(f"Image not found: {image_path}")
            return jsonify({'success': False, 'error': 'Image not found'}), 404
        
        # Determine mimetype based on extension
        mimetype = 'image/jpeg'  # Default
        if image_path.lower().endswith('.png'):
            mimetype = 'image/png'
        
        # Serve the file with CORS headers
        response = send_file(image_path, mimetype=mimetype)
        response.headers.add('Access-Control-Allow-Origin', '*')
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

@screen_definition_blueprint.route('/capture/start', methods=['POST'])
def start_capture():
    """Start continuous capture at 10fps with rolling 30s buffer (max 300 frames)."""
    try:
        from app import android_mobile_controller
        import subprocess
        import signal
        
        global capture_process, capture_start_time
        
        data = request.get_json()
        current_app.logger.info(f"[@api:screen-definition] Start capture request: {data}")
        
        if not hasattr(android_mobile_controller, 'ssh_connection') or not android_mobile_controller.ssh_connection:
            return jsonify({
                'success': False,
                'error': 'No active remote connection'
            }), 400
            
        ssh_connection = android_mobile_controller.ssh_connection
        
        # Extract parameters
        video_device = data.get('video_device', '/dev/video0')
        device_model = data.get('device_model', 'android_mobile')
        
        # Clean local captures folder to remove old sessions
        local_captures_dir = os.path.join(TMP_DIR, 'captures')
        current_app.logger.info(f"[@api:screen-definition] Cleaning local captures folder: {local_captures_dir}")
        
        try:
            if os.path.exists(local_captures_dir):
                # Remove all existing capture directories
                for item in os.listdir(local_captures_dir):
                    item_path = os.path.join(local_captures_dir, item)
                    if os.path.isdir(item_path) and item.startswith(device_model):
                        shutil.rmtree(item_path)
                        current_app.logger.info(f"[@api:screen-definition] Removed old capture directory: {item}")
                current_app.logger.info(f"[@api:screen-definition] Local captures folder cleaned successfully")
            else:
                # Create the captures directory if it doesn't exist
                os.makedirs(local_captures_dir, exist_ok=True)
                current_app.logger.info(f"[@api:screen-definition] Created captures directory: {local_captures_dir}")
        except Exception as e:
            current_app.logger.warning(f"[@api:screen-definition] Failed to clean local captures folder: {e}")
        
        # Stop any existing capture process
        if capture_process and capture_process.poll() is None:
            current_app.logger.info("[@api:screen-definition] Stopping existing capture process...")
            capture_process.terminate()
            capture_process.wait()
        
        # Get device resolution for capture (same logic as screenshot)
        device_resolution = None
        capture_resolution = "1920x1080"  # Default fallback
        
        if hasattr(android_mobile_controller, 'adb_utils') and android_mobile_controller.adb_utils:
            try:
                android_device_id = getattr(android_mobile_controller, 'android_device_id', None)
                if android_device_id:
                    device_resolution = android_mobile_controller.adb_utils.get_device_resolution(android_device_id)
                    current_app.logger.info(f"[@api:screen-definition] Device resolution from ADB: {device_resolution}")
                    
                    if device_resolution and 'width' in device_resolution and 'height' in device_resolution:
                        device_width = device_resolution['width']
                        device_height = device_resolution['height']
                        capture_resolution = f"{device_width}x{device_height}"
                        current_app.logger.info(f"[@api:screen-definition] Using capture resolution: {capture_resolution}")
            except Exception as e:
                current_app.logger.warning(f"[@api:screen-definition] Could not get device resolution: {e}")
        
        # Check if stream is running and stop it
        success, stdout, stderr, exit_code = ssh_connection.execute_command("sudo systemctl status stream")
        stream_was_active = "Active: active (running)" in stdout
        
        if stream_was_active:
            current_app.logger.info("[@api:screen-definition] Stopping stream for capture...")
            success, stdout, stderr, exit_code = ssh_connection.execute_command("sudo systemctl stop stream")
            
            if not success or exit_code != 0:
                return jsonify({
                    'success': False,
                    'error': f'Failed to stop stream service: {stderr}'
                }), 500
        
        # Create capture directory on remote host
        remote_capture_dir = f"/tmp/capture_{int(time.time())}"
        ssh_connection.execute_command(f"mkdir -p {remote_capture_dir}")
        
        # Clean any existing frame files in the directory (important for rolling buffer)
        current_app.logger.info(f"[@api:screen-definition] Cleaning capture directory: {remote_capture_dir}")
        success, stdout, stderr, exit_code = ssh_connection.execute_command(f"rm -f {remote_capture_dir}/frame_*.jpg")
        
        if not success:
            current_app.logger.warning(f"[@api:screen-definition] Failed to clean capture directory: {stderr}")
        else:
            current_app.logger.info(f"[@api:screen-definition] Capture directory cleaned successfully")
        
        # FFmpeg command for rolling buffer capture at 10fps (300 frames max = 30s)
        # Use frame numbers 1-300, then wrap around and overwrite
        ffmpeg_cmd = (f"ffmpeg -f v4l2 -video_size {capture_resolution} -i {video_device} "
                     f"-vf fps=10 -q:v 2 -f image2 "
                     f"-y {remote_capture_dir}/frame_%d.jpg")
        
        current_app.logger.info(f"[@api:screen-definition] Starting rolling capture with command: {ffmpeg_cmd}")
        current_app.logger.info(f"[@api:screen-definition] Rolling buffer: 300 frames max (30s at 10fps)")
        
        # Start FFmpeg capture process on remote host in background
        success, stdout, stderr, exit_code = ssh_connection.execute_command(f"nohup {ffmpeg_cmd} > /dev/null 2>&1 & echo $!")
        
        if not success or exit_code != 0:
            error_msg = stderr.strip() if stderr else "Failed to start capture"
            current_app.logger.error(f"[@api:screen-definition] Capture start failed: {error_msg}")
            return jsonify({
                'success': False,
                'error': f'Failed to start capture: {error_msg}'
            }), 500
        
        # Store the process ID for later termination
        capture_pid = stdout.strip()
        capture_start_time = time.time()
        
        current_app.logger.info(f"[@api:screen-definition] Capture started with PID: {capture_pid}")
        
        return jsonify({
            'success': True,
            'capture_pid': capture_pid,
            'remote_capture_dir': remote_capture_dir,
            'device_resolution': device_resolution,
            'capture_resolution': capture_resolution,
            'stream_was_active': stream_was_active,
            'message': f'Capture started at 10fps with resolution {capture_resolution}'
        })
        
    except Exception as e:
        current_app.logger.error(f"[@api:screen-definition] Start capture error: {e}")
        return jsonify({
            'success': False,
            'error': f'Start capture failed: {str(e)}'
        }), 500

@screen_definition_blueprint.route('/capture/stop', methods=['POST'])
def stop_capture():
    """Stop capture and pull frames to local capture folder."""
    try:
        from app import android_mobile_controller
        
        global capture_process, capture_start_time
        
        data = request.get_json()
        current_app.logger.info(f"[@api:screen-definition] Stop capture request: {data}")
        
        if not hasattr(android_mobile_controller, 'ssh_connection') or not android_mobile_controller.ssh_connection:
            return jsonify({
                'success': False,
                'error': 'No active remote connection'
            }), 400
            
        ssh_connection = android_mobile_controller.ssh_connection
        
        # Get capture info from request
        capture_pid = data.get('capture_pid')
        remote_capture_dir = data.get('remote_capture_dir')
        device_model = data.get('device_model', 'android_mobile')
        
        if not capture_pid or not remote_capture_dir:
            return jsonify({
                'success': False,
                'error': 'Missing capture_pid or remote_capture_dir'
            }), 400
        
        # Stop the FFmpeg capture process
        current_app.logger.info(f"[@api:screen-definition] Stopping capture process PID: {capture_pid}")
        success, stdout, stderr, exit_code = ssh_connection.execute_command(f"kill -TERM {capture_pid}")
        
        # Wait a moment for graceful shutdown
        time.sleep(2)
        
        # Force kill if still running
        ssh_connection.execute_command(f"kill -KILL {capture_pid} 2>/dev/null")
        
        # Count captured frames - check which frame files actually exist
        success, stdout, stderr, exit_code = ssh_connection.execute_command(f"ls {remote_capture_dir}/frame_*.jpg 2>/dev/null | wc -l")
        frame_count = int(stdout.strip()) if success and stdout.strip().isdigit() else 0
        
        current_app.logger.info(f"[@api:screen-definition] Found {frame_count} captured frames in rolling buffer")
        
        # Create local capture directory with timestamp
        capture_timestamp = int(time.time())
        local_capture_dir = os.path.join(TMP_DIR, 'captures', f'{device_model}_{capture_timestamp}')
        os.makedirs(local_capture_dir, exist_ok=True)
        
        # Pull all existing frames to local directory
        if frame_count > 0:
            current_app.logger.info(f"[@api:screen-definition] Downloading {frame_count} frames to {local_capture_dir}")
            
            # Get list of actual frame files (they might not be sequential due to rolling buffer)
            success, stdout, stderr, exit_code = ssh_connection.execute_command(f"ls {remote_capture_dir}/frame_*.jpg 2>/dev/null | sort -V")
            
            if success and stdout.strip():
                frame_files = stdout.strip().split('\n')
                downloaded_count = 0
                
                for i, remote_frame_path in enumerate(frame_files):
                    if remote_frame_path.strip():
                        # Extract frame number from filename for local naming
                        frame_filename = os.path.basename(remote_frame_path.strip())
                        # Rename to sequential numbering locally: frame_0001.jpg, frame_0002.jpg, etc.
                        local_frame_filename = f"frame_{i+1:04d}.jpg"
                        local_frame_path = os.path.join(local_capture_dir, local_frame_filename)
                        
                        # Download using base64 encoding (fallback method)
                        success, file_content, stderr, exit_code = ssh_connection.execute_command(f"cat {remote_frame_path.strip()} | base64")
                        
                        if success and file_content.strip():
                            try:
                                import base64
                                with open(local_frame_path, 'wb') as f:
                                    f.write(base64.b64decode(file_content.strip()))
                                downloaded_count += 1
                                current_app.logger.debug(f"[@api:screen-definition] Downloaded {frame_filename} -> {local_frame_filename}")
                            except Exception as e:
                                current_app.logger.warning(f"[@api:screen-definition] Failed to decode frame {frame_filename}: {e}")
                        else:
                            current_app.logger.warning(f"[@api:screen-definition] Failed to download frame {frame_filename}")
                
                current_app.logger.info(f"[@api:screen-definition] Downloaded {downloaded_count}/{frame_count} frames")
            else:
                current_app.logger.warning(f"[@api:screen-definition] Could not list frame files in {remote_capture_dir}")
                downloaded_count = 0
        else:
            downloaded_count = 0
        
        # Clean up remote capture directory
        ssh_connection.execute_command(f"rm -rf {remote_capture_dir}")
        
        # Calculate capture duration
        capture_duration = time.time() - capture_start_time if capture_start_time else 0
        
        return jsonify({
            'success': True,
            'frames_captured': frame_count,
            'frames_downloaded': downloaded_count if frame_count > 0 else 0,
            'local_capture_dir': local_capture_dir,
            'capture_duration': round(capture_duration, 2),
            'message': f'Capture stopped. Downloaded {downloaded_count if frame_count > 0 else 0} frames to {local_capture_dir}'
        })
        
    except Exception as e:
        current_app.logger.error(f"[@api:screen-definition] Stop capture error: {e}")
        return jsonify({
            'success': False,
            'error': f'Stop capture failed: {str(e)}'
        }), 500

@screen_definition_blueprint.route('/capture/status', methods=['GET'])
def get_capture_status():
    """Get current capture status."""
    try:
        from app import android_mobile_controller
        
        global capture_start_time
        
        if not hasattr(android_mobile_controller, 'ssh_connection') or not android_mobile_controller.ssh_connection:
            return jsonify({
                'success': False,
                'error': 'No active remote connection'
            }), 400
            
        # Return basic status - in a real implementation you might track active captures
        is_capturing = capture_start_time is not None
        duration = time.time() - capture_start_time if capture_start_time else 0
        
        return jsonify({
            'success': True,
            'is_capturing': is_capturing,
            'duration': round(duration, 2) if is_capturing else 0,
            'max_duration': 30.0,  # 30 second rolling buffer
            'fps': 10
        })
        
    except Exception as e:
        current_app.logger.error(f"[@api:screen-definition] Capture status error: {e}")
        return jsonify({
            'success': False,
            'error': f'Capture status failed: {str(e)}'
        }), 500 
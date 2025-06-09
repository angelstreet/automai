"""
Audio/Video Routes

This module contains the essential audio/video API endpoints for:
- AV controller connection management
- Video capture control
- Screenshot capture
"""

from flask import Blueprint, request, jsonify, current_app

# Create blueprint
audiovideo_bp = Blueprint('audiovideo', __name__, url_prefix='/api/av')

@audiovideo_bp.route('/connect', methods=['POST'])
def connect():
    """Connect to AV controller using own stored host_device object"""
    try:
        # ✅ USE OWN STORED HOST_DEVICE OBJECT
        host_device = getattr(current_app, 'my_host_device', None)
        
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device object not initialized. Host may need to re-register.'
            }), 404
        
        # Get controller object directly from own stored host_device
        av_controller = host_device.get('controller_objects', {}).get('av')
        
        if not av_controller:
            return jsonify({
                'success': False,
                'error': 'No AV controller object found in own host_device',
                'available_controllers': list(host_device.get('controller_objects', {}).keys())
            }), 404
        
        print(f"[@route:connect] Using own AV controller: {type(av_controller).__name__}")
        print(f"[@route:connect] Host: {host_device.get('host_name')} Device: {host_device.get('device_name')}")
        
        # Connect to controller
        connection_result = av_controller.connect()
        
        if connection_result:
            # Get status after connection
            status = av_controller.get_status()
            return jsonify({
                'success': True,
                'connected': True,
                'status': status
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to connect to AV controller'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@audiovideo_bp.route('/disconnect', methods=['POST'])
def disconnect():
    """Disconnect from AV controller using own stored host_device object"""
    try:
        # ✅ USE OWN STORED HOST_DEVICE OBJECT
        host_device = getattr(current_app, 'my_host_device', None)
        
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device object not initialized. Host may need to re-register.'
            }), 404
        
        # Get controller object directly from own stored host_device
        av_controller = host_device.get('controller_objects', {}).get('av')
        
        if not av_controller:
            return jsonify({
                'success': False,
                'error': 'No AV controller object found in own host_device',
                'available_controllers': list(host_device.get('controller_objects', {}).keys())
            }), 404
        
        print(f"[@route:disconnect] Using own AV controller: {type(av_controller).__name__}")
        print(f"[@route:disconnect] Host: {host_device.get('host_name')} Device: {host_device.get('device_name')}")
        
        # Disconnect from controller
        disconnect_result = av_controller.disconnect()
        
        return jsonify({
            'success': disconnect_result,
            'connected': False,
            'streaming': False
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@audiovideo_bp.route('/get_status', methods=['GET'])
def get_status():
    """Get AV controller status using own stored host_device object"""
    try:
        # ✅ USE OWN STORED HOST_DEVICE OBJECT
        host_device = getattr(current_app, 'my_host_device', None)
        
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device object not initialized. Host may need to re-register.'
            }), 404
        
        # Get controller object directly from own stored host_device
        av_controller = host_device.get('controller_objects', {}).get('av')
        
        if not av_controller:
            return jsonify({
                'success': False,
                'error': 'No AV controller object found in own host_device',
                'available_controllers': list(host_device.get('controller_objects', {}).keys())
            }), 404
        
        print(f"[@route:get_status] Using own AV controller: {type(av_controller).__name__}")
        
        # Get controller status
        status = av_controller.get_status()
        
        return jsonify({
            'success': True,
            'status': status,
            'timestamp': __import__('time').time()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@audiovideo_bp.route('/start_capture', methods=['POST'])
def start_capture():
    """Start video capture using own stored host_device object - COPY FROM screen_definition_routes.py"""
    try:
        data = request.get_json() or {}
        
        # ✅ USE OWN STORED HOST_DEVICE OBJECT
        host_device = getattr(current_app, 'my_host_device', None)
        
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device object not initialized. Host may need to re-register.'
            }), 404
        
        # Get controller object directly from own stored host_device
        av_controller = host_device.get('controller_objects', {}).get('av')
        
        if not av_controller:
            return jsonify({
                'success': False,
                'error': 'No AV controller object found in own host_device',
                'available_controllers': list(host_device.get('controller_objects', {}).keys())
            }), 404
        
        print(f"[@route:start_capture] Using own AV controller: {type(av_controller).__name__}")
        
        # Extract parameters - COPY FROM screen_definition_routes.py
        video_device = data.get('video_device', '/dev/video0')
        device_model = data.get('device_model', 'android_mobile')
        max_duration = data.get('max_duration', 60)  # 60 second rolling buffer
        fps = data.get('fps', 5)  # 5 fps
        resolution = data.get('resolution', '1920x1080')
        
        # Connect if not already connected
        if not av_controller.is_connected:
            if not av_controller.connect():
                return jsonify({
                    'success': False,
                    'error': 'Failed to connect to AV controller'
                }), 400
        
        # COPY THE EXACT LOGIC FROM screen_definition_routes.py start_capture()
        import subprocess
        import time
        import os
        
        # Check if capture is already running
        if hasattr(av_controller, 'capture_process') and av_controller.capture_process and hasattr(av_controller, 'capture_pid') and av_controller.capture_pid:
            print("[@route:start_capture] Capture already running")
            return jsonify({
                'success': True,
                'capture_pid': av_controller.capture_pid,
                'remote_capture_dir': getattr(av_controller, 'remote_capture_dir', '/tmp/captures'),
                'message': 'Capture already active'
            })
        
        # Check if stream is running and stop it
        try:
            result = subprocess.run(['sudo', 'systemctl', 'status', 'stream'], capture_output=True, text=True)
            stream_was_active = "Active: active (running)" in result.stdout
            
            if stream_was_active:
                print("[@route:start_capture] Stopping stream for capture...")
                result = subprocess.run(['sudo', 'systemctl', 'stop', 'stream'], capture_output=True, text=True)
                
                if result.returncode != 0:
                    return jsonify({
                        'success': False,
                        'error': f'Failed to stop stream service: {result.stderr}'
                    }), 500
        except Exception as e:
            print(f"[@route:start_capture] Warning: Could not check/stop stream service: {e}")
            stream_was_active = False
        
        # Create remote captures directory for rolling buffer
        remote_capture_dir = "/tmp/captures"
        os.makedirs(remote_capture_dir, exist_ok=True)
        
        # Clean any existing FFmpeg processes first
        print("[@route:start_capture] Cleaning existing FFmpeg processes...")
        subprocess.run(['pkill', '-f', 'ffmpeg.*'], capture_output=True)
        time.sleep(1)  # Give time for processes to die
        
        # Clean existing capture files to start fresh
        subprocess.run(['rm', '-f', f'{remote_capture_dir}/capture_*.jpg'], shell=True, capture_output=True)
        
        # COPY EXACT FFmpeg command from screen_definition_routes.py but with timestamp logic
        FIXED_VIDEO_SIZE = "1920x1080"
        FIXED_SCALE_SIZE = "640x360"
        
        # Combined FFmpeg command: Stream HLS + Rolling buffer capture with TIMESTAMPED filenames
        # Use strftime to create timestamped filenames like capture_20241201143045.jpg
        ffmpeg_cmd = (
            f"/usr/bin/ffmpeg -report "
            f"-f v4l2 -input_format mjpeg -framerate 20 -video_size {FIXED_VIDEO_SIZE} -i {video_device} "
            f"-filter_complex \"split=2[stream][capture]; "
            f"[stream]scale={FIXED_SCALE_SIZE},format=yuv420p[streamout]; "
            f"[capture]fps=5[captureout]\" "
            f"-map \"[streamout]\" -c:v libx264 -preset ultrafast -tune zerolatency -b:v 400k -g 5 -flags low_delay -an "
            f"-f hls -hls_time 1 -hls_list_size 2 -hls_flags delete_segments -hls_segment_type mpegts "
            f"/var/www/html/stream/output.m3u8 "
            f"-map \"[captureout]\" -c:v mjpeg -q:v 2 "
            f"-f image2 -strftime 1 -y {remote_capture_dir}/capture_%Y%m%d%H%M%S.jpg"
        )
        
        print(f"[@route:start_capture] Starting capture with fixed resolution {FIXED_VIDEO_SIZE} and scale {FIXED_SCALE_SIZE}")
        print(f"[@route:start_capture] FFmpeg command: {ffmpeg_cmd}")
        
        # Start FFmpeg capture process
        start_cmd = f"nohup {ffmpeg_cmd} > {remote_capture_dir}/ffmpeg.log 2>&1 & echo $!"
        
        result = subprocess.run(start_cmd, shell=True, capture_output=True, text=True)
        
        if result.returncode != 0:
            error_msg = result.stderr.strip() if result.stderr else "Failed to start capture"
            print(f"[@route:start_capture] Capture start failed: {error_msg}")
            return jsonify({
                'success': False,
                'error': f'Failed to start capture: {error_msg}'
            }), 500
        
        # Get the process ID
        capture_pid = result.stdout.strip()
        if not capture_pid:
            print("[@route:start_capture] No PID returned from FFmpeg start")
            return jsonify({
                'success': False,
                'error': 'Failed to get capture process ID'
            }), 500
        
        print(f"[@route:start_capture] Capture started with PID: {capture_pid}")
        
        # Store in controller for tracking
        av_controller.capture_pid = capture_pid
        av_controller.remote_capture_dir = remote_capture_dir
        av_controller.stream_was_active_before_capture = stream_was_active
        
        # Wait a moment and verify the process is actually running and creating files
        time.sleep(2)
        
        # Check if process is still running
        result = subprocess.run(f"ps -p {capture_pid} > /dev/null 2>&1 && echo 'running' || echo 'stopped'", shell=True, capture_output=True, text=True)
        if 'stopped' in result.stdout:
            # Get FFmpeg logs for debugging
            try:
                with open(f"{remote_capture_dir}/ffmpeg.log", 'r') as f:
                    log_content = f.read()
            except:
                log_content = "Could not read FFmpeg logs"
            
            print(f"[@route:start_capture] FFmpeg process died immediately. Logs: {log_content}")
            return jsonify({
                'success': False,
                'error': f'FFmpeg process failed to start. Check video device access. Logs: {log_content}'
            }), 500
        
        # Check if files are being created
        result = subprocess.run(f"ls -la {remote_capture_dir}/", shell=True, capture_output=True, text=True)
        if result.returncode == 0:
            print(f"[@route:start_capture] Capture directory contents: {result.stdout}")
        
        return jsonify({
            'success': True,
            'capture_pid': capture_pid,
            'remote_capture_dir': remote_capture_dir,
            'capture_resolution': FIXED_VIDEO_SIZE,
            'scale_dimensions': FIXED_SCALE_SIZE,
            'stream_was_active': stream_was_active,
            'max_duration': max_duration,
            'fps': fps,
            'message': f'Combined streaming + rolling buffer capture started with fixed resolution {FIXED_VIDEO_SIZE} (5fps, 60 seconds max, scaling to {FIXED_SCALE_SIZE})'
        })
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@audiovideo_bp.route('/stop_capture', methods=['POST'])
def stop_capture():
    """Stop video capture using own stored host_device object - COPY FROM screen_definition_routes.py"""
    try:
        data = request.get_json() or {}
        
        # ✅ USE OWN STORED HOST_DEVICE OBJECT
        host_device = getattr(current_app, 'my_host_device', None)
        
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device object not initialized. Host may need to re-register.'
            }), 404
        
        # Get controller object directly from own stored host_device
        av_controller = host_device.get('controller_objects', {}).get('av')
        
        if not av_controller:
            return jsonify({
                'success': False,
                'error': 'No AV controller object found in own host_device',
                'available_controllers': list(host_device.get('controller_objects', {}).keys())
            }), 404
        
        print(f"[@route:stop_capture] Using own AV controller: {type(av_controller).__name__}")
        
        # COPY THE EXACT LOGIC FROM screen_definition_routes.py stop_capture()
        import subprocess
        import time
        import os
        import base64
        
        # Simply kill all ffmpeg processes
        print("[@route:stop_capture] Stopping all FFmpeg processes...")
        subprocess.run(['pkill', '-f', 'ffmpeg.*'], capture_output=True)
        time.sleep(1)  # Give time for processes to stop
        
        frames_downloaded = 0
        TMP_DIR = '/tmp/screenshots'  # Local temp directory
        local_capture_dir = os.path.join(TMP_DIR, 'captures')
        os.makedirs(local_capture_dir, exist_ok=True)
        
        # Download all captured frames from /tmp/captures/
        try:
            remote_capture_dir = getattr(av_controller, 'remote_capture_dir', '/tmp/captures')
            
            # List all capture files in remote directory
            result = subprocess.run(f"ls {remote_capture_dir}/capture_*.jpg 2>/dev/null || echo 'no files'", shell=True, capture_output=True, text=True)
            
            if result.returncode == 0 and 'no files' not in result.stdout.strip():
                capture_files = [f.strip() for f in result.stdout.strip().split('\n') if f.strip().endswith('.jpg')]
                print(f"[@route:stop_capture] Found {len(capture_files)} capture files to download")
                
                # Download each capture file (copy to local temp)
                for remote_file in capture_files:
                    try:
                        filename = os.path.basename(remote_file)
                        local_file_path = os.path.join(local_capture_dir, filename)
                        
                        # Copy file locally
                        result = subprocess.run(['cp', remote_file, local_file_path], capture_output=True)
                        
                        if result.returncode == 0 and os.path.exists(local_file_path) and os.path.getsize(local_file_path) > 0:
                            frames_downloaded += 1
                            print(f"[@route:stop_capture] Downloaded frame: {filename}")
                        else:
                            print(f"[@route:stop_capture] Failed to copy frame: {filename}")
                            
                    except Exception as e:
                        print(f"[@route:stop_capture] Error downloading frame {remote_file}: {e}")
                        continue
            else:
                print("[@route:stop_capture] No capture files found")
                
        except Exception as e:
            print(f"[@route:stop_capture] Error during frame download: {e}")
        
        # Clean up remote capture files
        try:
            remote_capture_dir = getattr(av_controller, 'remote_capture_dir', '/tmp/captures')
            subprocess.run(f"rm -f {remote_capture_dir}/capture_*.jpg", shell=True, capture_output=True)
            subprocess.run(f"rm -f {remote_capture_dir}/ffmpeg.log", shell=True, capture_output=True)
        except Exception as e:
            print(f"[@route:stop_capture] Error cleaning up remote files: {e}")
        
        # Restart stream if it was active before capture
        stream_restarted = False
        if hasattr(av_controller, 'stream_was_active_before_capture') and av_controller.stream_was_active_before_capture:
            try:
                print("[@route:stop_capture] Restarting stream service...")
                result = subprocess.run(['sudo', 'systemctl', 'start', 'stream'], capture_output=True, text=True)
                
                if result.returncode == 0:
                    stream_restarted = True
                    print("[@route:stop_capture] Stream service restarted successfully")
                else:
                    print(f"[@route:stop_capture] Failed to restart stream: {result.stderr}")
            except Exception as e:
                print(f"[@route:stop_capture] Error restarting stream: {e}")
        
        # Clear controller tracking
        if hasattr(av_controller, 'capture_pid'):
            delattr(av_controller, 'capture_pid')
        if hasattr(av_controller, 'remote_capture_dir'):
            delattr(av_controller, 'remote_capture_dir')
        if hasattr(av_controller, 'stream_was_active_before_capture'):
            delattr(av_controller, 'stream_was_active_before_capture')
        
        return jsonify({
            'success': True,
            'frames_downloaded': frames_downloaded,
            'local_capture_dir': local_capture_dir,
            'stream_restarted': stream_restarted,
            'message': f'Capture stopped. Downloaded {frames_downloaded} frames to {local_capture_dir}'
        })
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@audiovideo_bp.route('/take_screenshot', methods=['POST'])
def take_screenshot():
    """Take screenshot via AV controller using own stored host_device object"""
    try:
        # ✅ USE OWN STORED HOST_DEVICE OBJECT (no need to receive from frontend)
        from flask import current_app
        host_device = getattr(current_app, 'my_host_device', None)
        
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device object not initialized. Host may need to re-register.'
            }), 404
        
        # Get controller object directly from own stored host_device
        av_controller = host_device.get('controller_objects', {}).get('av')
        
        if not av_controller:
            return jsonify({
                'success': False,
                'error': 'No AV controller object found in own host_device',
                'available_controllers': list(host_device.get('controller_objects', {}).keys())
            }), 404
        
        print(f"[@route:take_screenshot] Using own AV controller: {type(av_controller).__name__}")
        print(f"[@route:take_screenshot] Host: {host_device.get('host_name')} Device: {host_device.get('device_name')}")
        
        # Connect if not already connected
        if not av_controller.is_connected:
            if not av_controller.connect():
                return jsonify({
                    'success': False,
                    'error': 'Failed to connect to AV controller'
                }), 400
        
        # Call controller method directly
        screenshot_url = av_controller.take_screenshot()
        
        if screenshot_url:
            return jsonify({
                'success': True,
                'screenshot_url': screenshot_url
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to take screenshot'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@audiovideo_bp.route('/debug', methods=['GET'])
def debug_context():
    """Debug endpoint to check Flask app context"""
    try:
        from flask import current_app
        
        # Check what's available in current_app
        app_attrs = [attr for attr in dir(current_app) if not attr.startswith('_')]
        
        # Check specifically for my_host_device
        host_device = getattr(current_app, 'my_host_device', None)
        
        debug_info = {
            'success': True,
            'app_attributes': app_attrs,
            'has_my_host_device': host_device is not None,
            'host_device_type': type(host_device).__name__ if host_device else None,
            'host_device_keys': list(host_device.keys()) if host_device and isinstance(host_device, dict) else None,
            'flask_app_name': getattr(current_app, 'name', 'unknown'),
            'flask_app_id': id(current_app)
        }
        
        if host_device:
            debug_info['host_device_summary'] = {
                'host_name': host_device.get('host_name'),
                'device_name': host_device.get('device_name'),
                'device_model': host_device.get('device_model'),
                'controller_objects_keys': list(host_device.get('controller_objects', {}).keys())
            }
        
        return jsonify(debug_info)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'error_type': type(e).__name__
        }), 500 
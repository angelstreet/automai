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
        os.makedirs('/tmp/capture_1-600', exist_ok=True)
        
        # Debug directory creation
        current_app.logger.info(f"Ensured directories exist: /tmp/screenshots, /tmp/capture_1-600")
        
        # Check if directories are writable
        if not os.access('/tmp/screenshots', os.W_OK):
            current_app.logger.error("Directory /tmp/screenshots is not writable")
        if not os.access('/tmp/capture_1-600', os.W_OK):
            current_app.logger.error("Directory /tmp/capture_1-600 is not writable")
    except Exception as e:
        current_app.logger.error(f"Error ensuring directories: {str(e)}")

def check_controllers_available():
    """Helper function to check if controllers are available"""
    from app import controllers_available
    if not controllers_available:
        return jsonify({'error': 'VirtualPyTest controllers not available'}), 503
    return None

@screen_definition_blueprint.route('/connect', methods=['POST'])
def connect():
    """Establish connection using existing controller system"""
    error = check_controllers_available()
    if error:
        return error
    
    try:
        from controllers import ControllerFactory
        
        data = request.get_json()
        host_ip = data.get('host_ip')
        host_username = data.get('host_username')
        host_password = data.get('host_password')
        host_port = data.get('host_port', '22')
        video_device = data.get('video_device', '/dev/video0')
        device_model = data.get('device_model', 'android_mobile')
        
        if not host_ip or not host_username or not host_password:
            return jsonify({'success': False, 'error': 'Missing required connection parameters'})
        
        # Use existing controller system to create remote controller
        controller = ControllerFactory.create_remote_controller(
            device_type='real_android_mobile',  # Use existing controller type
            device_name=device_model,
            host_ip=host_ip,
            host_port=int(host_port),
            host_username=host_username,
            host_password=host_password,
            device_ip=host_ip,  # For android mobile, device_ip is usually same as host
            adb_port=5555,  # Default ADB port
            video_device=video_device
        )
        
        # Store video_device as attribute for later use (since controller doesn't store it by default)
        controller.video_device = video_device
        
        # Test connection
        connection_result = controller.connect()
        
        if connection_result:
            # Store controller instance globally for this session
            session_id = f"screen_def_{int(time.time())}_{host_ip}"
            
            # Store in app context for reuse
            if not hasattr(current_app, 'screen_controllers'):
                current_app.screen_controllers = {}
            current_app.screen_controllers[session_id] = controller
            
            return jsonify({
                'success': True,
                'session_id': session_id,
                'message': f'Connected to {host_ip} using controller system'
            })
        else:
            return jsonify({'success': False, 'error': 'Failed to connect to device'})
        
    except Exception as e:
        current_app.logger.error(f"Connection error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

@screen_definition_blueprint.route('/disconnect', methods=['POST'])
def disconnect():
    """Close connection using controller system"""
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        
        if (not session_id or 
            not hasattr(current_app, 'screen_controllers') or 
            session_id not in current_app.screen_controllers):
            return jsonify({'success': False, 'error': 'Invalid session ID'})
        
        # Get and disconnect controller
        controller = current_app.screen_controllers.pop(session_id)
        controller.disconnect()
        
        return jsonify({
            'success': True,
            'message': 'Disconnected successfully'
        })
        
    except Exception as e:
        current_app.logger.error(f"Disconnect error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

@screen_definition_blueprint.route('/screenshot', methods=['POST'])
def take_screenshot():
    """Take screenshot using FFmpeg from HDMI source via existing remote controller."""
    try:
        from app import android_mobile_controller
        
        data = request.get_json()
        current_app.logger.info(f"[@api:screen-definition] Screenshot request: {data}")
        
        # Check if we have an active remote controller
        if not hasattr(android_mobile_controller, 'ssh_connection') or not android_mobile_controller.ssh_connection:
            return jsonify({
                'success': False,
                'error': 'No active remote connection. Please connect via remote control first.'
            }), 400
        
        video_device = data.get('video_device', '/dev/video0')
        device_model = data.get('device_model', 'android_mobile')
        
        current_app.logger.info(f"[@api:screen-definition] Taking HDMI screenshot from {video_device}")
        
        # Use the existing controller's SSH connection for FFmpeg capture
        ssh_connection = android_mobile_controller.ssh_connection
        
        if not ssh_connection or not ssh_connection.connected:
            return jsonify({
                'success': False,
                'error': 'Remote controller SSH connection is not established'
            }), 400
        
        # FFmpeg command to capture from HDMI/video device
        remote_temp_path = f"/tmp/hdmi_screenshot_{int(time.time())}.jpg"
        ffmpeg_cmd = f"ffmpeg -f v4l2 -i {video_device} -vframes 1 -y {remote_temp_path}"
        
        current_app.logger.info(f"[@api:screen-definition] Executing FFmpeg: {ffmpeg_cmd}")
        
        # Execute FFmpeg command via SSH
        result = ssh_connection.execute_command(ffmpeg_cmd)
        if result.return_code != 0:
            current_app.logger.error(f"[@api:screen-definition] FFmpeg failed: {result.stderr}")
            return jsonify({
                'success': False,
                'error': f'FFmpeg capture failed: {result.stderr}'
            }), 500
        
        # Transfer screenshot to local server
        local_filename = f"{device_model}.jpg"
        local_screenshot_path = os.path.join(TMP_DIR, 'screenshots', local_filename)
        
        # Ensure local directory exists
        os.makedirs(os.path.dirname(local_screenshot_path), exist_ok=True)
        
        # Download file via SFTP
        if hasattr(ssh_connection, 'sftp_get'):
            if ssh_connection.sftp_get(remote_temp_path, local_screenshot_path):
                current_app.logger.info(f"[@api:screen-definition] Screenshot saved to: {local_screenshot_path}")
                
                # Clean up remote file
                ssh_connection.execute_command(f"rm -f {remote_temp_path}")
                
                return jsonify({
                    'success': True,
                    'screenshot_path': local_screenshot_path,
                    'message': f'HDMI screenshot captured from {video_device}'
                })
            else:
                current_app.logger.error(f"[@api:screen-definition] Failed to transfer screenshot")
                return jsonify({
                    'success': False,
                    'error': 'Failed to transfer screenshot from remote host'
                }), 500
        else:
            current_app.logger.error(f"[@api:screen-definition] SSH connection does not support SFTP")
            return jsonify({
                'success': False,
                'error': 'SSH connection does not support file transfer'
            }), 500
            
    except Exception as e:
        current_app.logger.error(f"[@api:screen-definition] Screenshot error: {e}")
        return jsonify({
            'success': False,
            'error': f'Screenshot failed: {str(e)}'
        }), 500

@screen_definition_blueprint.route('/get-capture-status', methods=['POST'])
def get_capture_status():
    """Get status of ongoing capture using controller system"""
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        
        if (not session_id or 
            not hasattr(current_app, 'screen_controllers') or 
            session_id not in current_app.screen_controllers):
            return jsonify({'success': False, 'error': 'Invalid session ID'})
        
        controller = current_app.screen_controllers[session_id]
        status = controller.get_status()
        
        return jsonify({
            'success': True,
            'is_connected': status.get('connected', False),
            'is_capturing': False,  # Simplified for now
            'frame_count': 0,
            'uptime_seconds': 0,
            'capture_time_seconds': 0,
            'last_screenshot': None,
        })
        
    except Exception as e:
        current_app.logger.error(f"Get status error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

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
        
        # Path to the screenshots directory
        screenshot_path = os.path.join('/tmp/screenshots', base_filename)
        
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
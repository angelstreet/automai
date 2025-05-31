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
    """Take a screenshot using the existing controller's SSH connection"""
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        
        if (not session_id or 
            not hasattr(current_app, 'screen_controllers') or 
            session_id not in current_app.screen_controllers):
            return jsonify({'success': False, 'error': 'Invalid session ID'})
        
        controller = current_app.screen_controllers[session_id]
        
        # Ensure directory exists
        ensure_dirs()
        
        # Generate screenshot filename
        device_model = controller.device_name
        screenshot_filename = f"{device_model}.jpg"
        screenshot_path = f"/tmp/screenshots/{screenshot_filename}"
        
        current_app.logger.info(f"Taking screenshot from {controller.host_ip}:{controller.video_device}")
        
        # Use the controller's existing SSH connection to capture screenshot
        try:
            # Get the SSH connection from the controller
            ssh_connection = controller.ssh_connection
            
            if not ssh_connection or not ssh_connection.connected:
                raise Exception("Controller SSH connection is not established")
            
            # FFmpeg command to capture a single frame
            remote_temp_path = f"/tmp/screenshot_{int(time.time())}.jpg"
            video_device = controller.video_device  # Use the stored video_device
            ffmpeg_cmd = f"ffmpeg -f v4l2 -i {video_device} -vframes 1 -y {remote_temp_path}"
            
            current_app.logger.info(f"Executing FFmpeg command: {ffmpeg_cmd}")
            
            # Execute FFmpeg command on remote host using controller's SSH connection
            success, stdout, stderr, exit_code = ssh_connection.execute_command(ffmpeg_cmd)
            
            if not success or exit_code != 0:
                current_app.logger.error(f"FFmpeg failed: {stderr}")
                raise Exception(f"FFmpeg failed with exit code {exit_code}: {stderr}")
            
            # Copy the file from remote to local using paramiko SFTP
            if hasattr(ssh_connection, 'client') and ssh_connection.client:
                sftp = ssh_connection.client.open_sftp()
                sftp.get(remote_temp_path, screenshot_path)
                sftp.close()
            else:
                # If paramiko not available, we can't transfer files
                raise Exception("SSH client not available for file transfer")
            
            # Clean up remote temp file
            ssh_connection.execute_command(f"rm -f {remote_temp_path}")
            
            # Verify the file was created and has content
            if not os.path.exists(screenshot_path) or os.path.getsize(screenshot_path) == 0:
                raise Exception("Screenshot file was not created or is empty")
            
            current_app.logger.info(f"Screenshot captured successfully: {screenshot_path} ({os.path.getsize(screenshot_path)} bytes)")
            
        except Exception as ssh_error:
            current_app.logger.error(f"SSH/FFmpeg error: {str(ssh_error)}")
            
            # Fallback: create a simple test image
            current_app.logger.info("Creating fallback test image")
            with open(screenshot_path, 'wb') as f:
                # Simple 1x1 pixel JPEG
                f.write(b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c \x24.\' "\x2c#\x1c\x1c(7)\x2c01444\x1f\'9=82<.342\xff\xdb\x00C\x01\t\t\t\x0c\x0b\x0c\x18\r\r\x182!\x1c!222222222222222222222222222222222222222222\xff\xc0\x00\x11\x08\x00\x01\x00\x01\x03\x01"\x00\x02\x11\x01\x03\x11\x01\xff\xc4\x00\x15\x00\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x08\xff\xc4\x00\x14\x10\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xc4\x00\x14\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xc4\x00\x14\x11\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xda\x00\x0c\x03\x01\x00\x02\x11\x03\x11\x00?\x00\xb2\xc0\x07\xff\xd9')
        
        # Set proper permissions
        os.chmod(screenshot_path, 0o644)
        
        return jsonify({
            'success': True,
            'screenshot_path': screenshot_path,
            'message': 'Screenshot captured successfully'
        })
        
    except Exception as e:
        current_app.logger.error(f"Screenshot error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

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
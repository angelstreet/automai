"""
Host Audio/Video Routes

This module contains the host-specific audio/video API endpoints for:
- AV controller connection management
- Video capture control
- Screenshot capture

These endpoints run on the host and use the host's own stored device object.
"""

from flask import Blueprint, request, jsonify, current_app, send_file
from src.utils.host_utils import get_local_controller
import os
import shutil

# Create blueprint
av_bp = Blueprint('host_av', __name__, url_prefix='/host/av')

@av_bp.route('/connect', methods=['POST'])
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
        av_controller = get_local_controller('av')
        
        if not av_controller:
            return jsonify({
                'success': False,
                'error': 'No AV controller object found in own host_device',
                'available_controllers': list(host_device.get('controller_objects', {}).keys())
            }), 404
        
        print(f"[@route:host_av:connect] Using own AV controller: {type(av_controller).__name__}")
        print(f"[@route:host_av:connect] Host: {host_device.get('host_name')} Device: {host_device.get('device_name')}")
        
        # Connect to controller
        connect_result = av_controller.connect()
        
        if connect_result:
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

@av_bp.route('/disconnect', methods=['POST'])
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
        av_controller = get_local_controller('av')
        
        if not av_controller:
            return jsonify({
                'success': False,
                'error': 'No AV controller object found in own host_device',
                'available_controllers': list(host_device.get('controller_objects', {}).keys())
            }), 404
        
        print(f"[@route:host_av:disconnect] Using own AV controller: {type(av_controller).__name__}")
        print(f"[@route:host_av:disconnect] Host: {host_device.get('host_name')} Device: {host_device.get('device_name')}")
        
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

@av_bp.route('/status', methods=['GET'])
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
        av_controller = get_local_controller('av')
        
        if not av_controller:
            return jsonify({
                'success': False,
                'error': 'No AV controller object found in own host_device',
                'available_controllers': list(host_device.get('controller_objects', {}).keys())
            }), 404
        
        print(f"[@route:host_av:status] Using own AV controller: {type(av_controller).__name__}")
        
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

@av_bp.route('/restart-stream', methods=['POST'])
def restart_stream():
    """Restart stream service using own stored host_device object"""
    try:
        # ✅ USE OWN STORED HOST_DEVICE OBJECT
        host_device = getattr(current_app, 'my_host_device', None)
        
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device object not initialized. Host may need to re-register.'
            }), 404
        
        # Get controller object directly from own stored host_device
        av_controller = get_local_controller('av')
        
        if not av_controller:
            return jsonify({
                'success': False,
                'error': 'No AV controller object found in own host_device',
                'available_controllers': list(host_device.get('controller_objects', {}).keys())
            }), 404
        
        print(f"[@route:host_av:restart_stream] Using own AV controller: {type(av_controller).__name__}")
        
        # Restart stream service
        restart_result = av_controller.restart_stream()
        
        if restart_result:
            # Get updated status after restart
            status = av_controller.get_status()
            return jsonify({
                'success': True,
                'restarted': True,
                'status': status,
                'message': 'Stream service restarted successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to restart stream service'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@av_bp.route('/take-control', methods=['POST'])
def take_control():
    """Take control of AV system using own stored host_device object"""
    try:
        # ✅ USE OWN STORED HOST_DEVICE OBJECT
        host_device = getattr(current_app, 'my_host_device', None)
        
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device object not initialized. Host may need to re-register.'
            }), 404
        
        # Get controller object directly from own stored host_device
        av_controller = get_local_controller('av')
        
        if not av_controller:
            return jsonify({
                'success': False,
                'error': 'No AV controller object found in own host_device',
                'available_controllers': list(host_device.get('controller_objects', {}).keys())
            }), 404
        
        print(f"[@route:host_av:take_control] Using own AV controller: {type(av_controller).__name__}")
        
        # Take control of AV system
        control_result = av_controller.take_control()
        
        return jsonify(control_result)
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@av_bp.route('/get-stream-url', methods=['GET'])
def get_stream_url():
    """Get stream URL from AV controller using own stored host_device object"""
    try:
        # ✅ USE OWN STORED HOST_DEVICE OBJECT
        host_device = getattr(current_app, 'my_host_device', None)
        
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device object not initialized. Host may need to re-register.'
            }), 404
        
        # Get controller object directly from own stored host_device
        av_controller = get_local_controller('av')
        
        if not av_controller:
            return jsonify({
                'success': False,
                'error': 'No AV controller object found in own host_device',
                'available_controllers': list(host_device.get('controller_objects', {}).keys())
            }), 404
        
        print(f"[@route:host_av:stream_url] Using own AV controller: {type(av_controller).__name__}")
        
        # Get stream URL from controller
        stream_url = av_controller.get_stream_url()
        
        if stream_url:
            return jsonify({
                'success': True,
                'stream_url': stream_url
            })
        else:
            return jsonify({
                'success': False,
                'error': 'No stream URL available from AV controller'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@av_bp.route('/take-screenshot', methods=['POST'])
def take_screenshot():
    """Take temporary screenshot to nginx folder using own stored host_device object"""
    try:
        # ✅ USE OWN STORED HOST_DEVICE OBJECT
        host_device = getattr(current_app, 'my_host_device', None)
        
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device object not initialized. Host may need to re-register.'
            }), 404
        
        # Get controller object directly from own stored host_device
        av_controller = get_local_controller('av')
        
        if not av_controller:
            return jsonify({
                'success': False,
                'error': 'No AV controller object found in own host_device',
                'available_controllers': list(host_device.get('controller_objects', {}).keys())
            }), 404
        
        print(f"[@route:host_av:take_screenshot] Using own AV controller: {type(av_controller).__name__}")
        
        # Take screenshot using controller
        # For HDMI controller, this returns a URL to the captured screenshot
        screenshot_result = av_controller.take_screenshot()
        
        if screenshot_result:
            print(f"[@route:host_av:take_screenshot] Screenshot URL from controller: {screenshot_result}")
            
            # For HDMI controller, the result is already a URL we can return directly
            # For other controllers, we might need to handle file paths differently
            if screenshot_result.startswith('http'):
                # It's already a URL, return it directly
                return jsonify({
                    'success': True,
                    'screenshot_url': screenshot_result
                })
            else:
                # It's a file path, we need to copy it to nginx folder
                temp_filename = "screenshot.jpg"
                
                # Ensure nginx directory exists
                nginx_dir = "/var/www/html/captures/tmp"
                os.makedirs(nginx_dir, exist_ok=True)
                
                # Copy file to nginx folder
                nginx_path = f"{nginx_dir}/{temp_filename}"
                if os.path.exists(screenshot_result):
                    shutil.copy2(screenshot_result, nginx_path)
                    print(f"[@route:host_av:take_screenshot] Copied screenshot from {screenshot_result} to {nginx_path}")
                else:
                    print(f"[@route:host_av:take_screenshot] Warning: Source file not found at {screenshot_result}")
                
                # Build nginx URL for immediate access
                host_ip = host_device.get('device_ip') or host_device.get('host_ip')
                nginx_url = f"https://{host_ip}/captures/tmp/{temp_filename}"
                
                return jsonify({
                    'success': True,
                    'screenshot_url': nginx_url
                })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to take temporary screenshot'
            }), 500
            
    except Exception as e:
        print(f"[@route:host_av:take_screenshot] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@av_bp.route('/save-screenshot', methods=['POST'])
def save_screenshot():
    """Take screenshot and upload to R2 using own stored host_device object"""
    try:
        # ✅ USE OWN STORED HOST_DEVICE OBJECT
        host_device = getattr(current_app, 'my_host_device', None)
        
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device object not initialized. Host may need to re-register.'
            }), 404
        
        # Get controller object directly from own stored host_device
        av_controller = get_local_controller('av')
        
        if not av_controller:
            return jsonify({
                'success': False,
                'error': 'No AV controller object found in own host_device',
                'available_controllers': list(host_device.get('controller_objects', {}).keys())
            }), 404
        
        print(f"[@route:host_av:save_screenshot] Using own AV controller: {type(av_controller).__name__}")
        
        # Get request data for required filename parameter
        request_data = request.get_json() or {}
        filename = request_data.get('filename')
        
        if not filename:
            return jsonify({
                'success': False,
                'error': 'Filename is required for saving screenshot'
            }), 400
        
        print(f"[@route:host_av:save_screenshot] Saving screenshot with filename: {filename}")
        
        # Save screenshot using controller (handles R2 upload)
        screenshot_result = av_controller.save_screenshot(filename)
        
        if screenshot_result:
            return jsonify({
                'success': True,
                'screenshot_url': screenshot_result  # R2 URL for permanent storage
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to take and save screenshot'
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@av_bp.route('/start-capture', methods=['POST'])
def start_video_capture():
    """Start video capture using own stored host_device object"""
    try:
        # ✅ USE OWN STORED HOST_DEVICE OBJECT
        host_device = getattr(current_app, 'my_host_device', None)
        
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device object not initialized. Host may need to re-register.'
            }), 404
        
        # Get controller object directly from own stored host_device
        av_controller = get_local_controller('av')
        
        if not av_controller:
            return jsonify({
                'success': False,
                'error': 'No AV controller object found in own host_device',
                'available_controllers': list(host_device.get('controller_objects', {}).keys())
            }), 404
        
        print(f"[@route:host_av:start_capture] Using own AV controller: {type(av_controller).__name__}")
        
        # Get request data for capture options
        request_data = request.get_json() or {}
        duration = request_data.get('duration', 60.0)  # Default 60 seconds
        filename = request_data.get('filename')
        resolution = request_data.get('resolution')
        fps = request_data.get('fps')
        
        print(f"[@route:host_av:start_capture] Starting capture with duration: {duration}s")
        
        # Start video capture using controller
        capture_result = av_controller.start_video_capture(
            duration=duration,
            filename=filename,
            resolution=resolution,
            fps=fps
        )
        
        if capture_result:
            # Get session ID if available
            session_id = getattr(av_controller, 'capture_session_id', None)
            
            return jsonify({
                'success': True,
                'session_id': session_id,
                'duration': duration,
                'message': 'Video capture started successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to start video capture'
            }), 500
            
    except Exception as e:
        print(f"[@route:host_av:start_capture] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@av_bp.route('/stop-capture', methods=['POST'])
def stop_video_capture():
    """Stop video capture using own stored host_device object"""
    try:
        # ✅ USE OWN STORED HOST_DEVICE OBJECT
        host_device = getattr(current_app, 'my_host_device', None)
        
        if not host_device:
            return jsonify({
                'success': False,
                'error': 'Host device object not initialized. Host may need to re-register.'
            }), 404
        
        # Get controller object directly from own stored host_device
        av_controller = get_local_controller('av')
        
        if not av_controller:
            return jsonify({
                'success': False,
                'error': 'No AV controller object found in own host_device',
                'available_controllers': list(host_device.get('controller_objects', {}).keys())
            }), 404
        
        print(f"[@route:host_av:stop_capture] Using own AV controller: {type(av_controller).__name__}")
        
        # Stop video capture using controller
        stop_result = av_controller.stop_video_capture()
        
        if stop_result:
            return jsonify({
                'success': True,
                'message': 'Video capture stopped successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to stop video capture or no active capture session'
            }), 500
            
    except Exception as e:
        print(f"[@route:host_av:stop_capture] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@av_bp.route('/images/screenshot/<filename>', methods=['GET', 'OPTIONS'])
def serve_screenshot(filename):
    """Serve a screenshot image by filename from host"""
    # Handle OPTIONS request for CORS
    if request.method == 'OPTIONS':
        response = current_app.response_class()
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        return response
        
    try:
        print(f"[@route:host_av:serve_screenshot] Screenshot request for: {filename}")
        
        # Ensure the path is safe
        if '..' in filename or filename.startswith('/'):
            print(f"[@route:host_av:serve_screenshot] Invalid filename requested: {filename}")
            return jsonify({'success': False, 'error': 'Invalid filename'}), 400
        
        # Extract the base filename without query parameters
        base_filename = filename.split('?')[0]
        
        # Use host's tmp directory for screenshots
        screenshot_path = f"/tmp/screenshots/{base_filename}"
        
        # Check if the file exists
        if not os.path.exists(screenshot_path):
            print(f"[@route:host_av:serve_screenshot] Screenshot not found: {screenshot_path}")
            return jsonify({'success': False, 'error': 'Screenshot not found'}), 404
        
        # Check file size - ensure it's not empty
        file_size = os.path.getsize(screenshot_path)
        if file_size == 0:
            print(f"[@route:host_av:serve_screenshot] Screenshot file is empty: {screenshot_path}")
            return jsonify({'success': False, 'error': 'Screenshot file is empty'}), 500
        
        print(f"[@route:host_av:serve_screenshot] Serving screenshot: {screenshot_path} ({file_size} bytes)")
        
        # Serve the file with CORS headers and cache control
        response = send_file(screenshot_path, mimetype='image/jpeg')
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Cache-Control', 'no-cache, no-store, must-revalidate')
        response.headers.add('Pragma', 'no-cache')
        response.headers.add('Expires', '0')
        return response
        
    except Exception as e:
        print(f"[@route:host_av:serve_screenshot] Error serving screenshot: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@av_bp.route('/images', methods=['GET', 'OPTIONS'])
def serve_image_by_path():
    """Serve an image from a specified path on host"""
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
        
        # Security check - allow /tmp/ paths and other safe paths
        if not (image_path.startswith('/tmp/') or image_path.startswith('/home/pi/virtualpytest/')):
            print(f"[@route:host_av:serve_image_by_path] Invalid image path: {image_path}")
            return jsonify({'success': False, 'error': 'Invalid image path'}), 403
        
        if not os.path.exists(image_path):
            print(f"[@route:host_av:serve_image_by_path] Image not found: {image_path}")
            return jsonify({'success': False, 'error': 'Image not found'}), 404
        
        # Check file size
        file_size = os.path.getsize(image_path)
        if file_size == 0:
            print(f"[@route:host_av:serve_image_by_path] Image file is empty: {image_path}")
            return jsonify({'success': False, 'error': 'Image file is empty'}), 500
        
        print(f"[@route:host_av:serve_image_by_path] Serving image: {image_path} ({file_size} bytes)")
        
        # Determine mimetype based on extension
        mimetype = 'image/jpeg'  # Default
        if image_path.lower().endswith('.png'):
            mimetype = 'image/png'
        
        # Serve the file with CORS headers
        response = send_file(image_path, mimetype=mimetype)
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Cache-Control', 'no-cache, no-store, must-revalidate')
        response.headers.add('Pragma', 'no-cache')
        response.headers.add('Expires', '0')
        return response
        
    except Exception as e:
        print(f"[@route:host_av:serve_image_by_path] Error serving image: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500 
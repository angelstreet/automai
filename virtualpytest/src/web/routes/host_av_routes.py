"""
Host Audio/Video Routes

This module contains the host-specific audio/video API endpoints for:
- AV controller connection management
- Video capture control
- Screenshot capture

These endpoints run on the host and use the host's own stored device object.
"""

from flask import Blueprint, request, jsonify, current_app, send_file
from src.utils.host_utils import get_controller, get_device_by_id
import os

# Create blueprint
av_bp = Blueprint('host_av', __name__, url_prefix='/host/av')

@av_bp.route('/connect', methods=['POST'])
def connect():
    """Connect to AV controller using new architecture"""
    try:
        # Get device_id from request (defaults to device1)
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        
        print(f"[@route:host_av:connect] Connecting to AV controller for device: {device_id}")
        
        # Get AV controller for the specified device
        av_controller = get_controller(device_id, 'av')
        
        if not av_controller:
            device = get_device_by_id(device_id)
            if not device:
                return jsonify({
                    'success': False,
                    'error': f'Device {device_id} not found'
                }), 404
            
            return jsonify({
                'success': False,
                'error': f'No AV controller found for device {device_id}',
                'available_capabilities': device.get_capabilities()
            }), 404
        
        print(f"[@route:host_av:connect] Using AV controller: {type(av_controller).__name__}")
        
        # Connect to controller
        connect_result = av_controller.connect()
        
        if connect_result:
            # Get status after connection
            status = av_controller.get_status()
            return jsonify({
                'success': True,
                'connected': True,
                'device_id': device_id,
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
    """Disconnect from AV controller using new architecture"""
    try:
        # Get device_id from request (defaults to device1)
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        
        print(f"[@route:host_av:disconnect] Disconnecting AV controller for device: {device_id}")
        
        # Get AV controller for the specified device
        av_controller = get_controller(device_id, 'av')
        
        if not av_controller:
            device = get_device_by_id(device_id)
            if not device:
                return jsonify({
                    'success': False,
                    'error': f'Device {device_id} not found'
                }), 404
            
            return jsonify({
                'success': False,
                'error': f'No AV controller found for device {device_id}',
                'available_capabilities': device.get_capabilities()
            }), 404
        
        print(f"[@route:host_av:disconnect] Using AV controller: {type(av_controller).__name__}")
        
        # Disconnect from controller
        disconnect_result = av_controller.disconnect()
        
        return jsonify({
            'success': disconnect_result,
            'connected': False,
            'streaming': False,
            'device_id': device_id
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@av_bp.route('/status', methods=['GET'])
def get_status():
    """Get AV controller status using new architecture"""
    try:
        # Get device_id from query params (defaults to device1)
        device_id = request.args.get('device_id', 'device1')
        
        print(f"[@route:host_av:status] Getting AV controller status for device: {device_id}")
        
        # Get AV controller for the specified device
        av_controller = get_controller(device_id, 'av')
        
        if not av_controller:
            device = get_device_by_id(device_id)
            if not device:
                return jsonify({
                    'success': False,
                    'error': f'Device {device_id} not found'
                }), 404
            
            return jsonify({
                'success': False,
                'error': f'No AV controller found for device {device_id}',
                'available_capabilities': device.get_capabilities()
            }), 404
        
        print(f"[@route:host_av:status] Using AV controller: {type(av_controller).__name__}")
        
        # Get controller status
        status = av_controller.get_status()
        
        return jsonify({
            'success': True,
            'status': status,
            'device_id': device_id,
            'timestamp': __import__('time').time()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@av_bp.route('/restartustream', methods=['POST'])
def restart_stream():
    """Restart stream service using new architecture"""
    try:
        # Get device_id from request (defaults to device1)
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        
        print(f"[@route:host_av:restart_stream] Restarting stream for device: {device_id}")
        
        # Get AV controller for the specified device
        av_controller = get_controller(device_id, 'av')
        
        if not av_controller:
            device = get_device_by_id(device_id)
            if not device:
                return jsonify({
                    'success': False,
                    'error': f'Device {device_id} not found'
                }), 404
            
            return jsonify({
                'success': False,
                'error': f'No AV controller found for device {device_id}',
                'available_capabilities': device.get_capabilities()
            }), 404
        
        print(f"[@route:host_av:restart_stream] Using AV controller: {type(av_controller).__name__}")
        
        # Restart stream service
        restart_result = av_controller.restart_stream()
        
        if restart_result:
            # Get updated status after restart
            status = av_controller.get_status()
            return jsonify({
                'success': True,
                'restarted': True,
                'status': status,
                'device_id': device_id,
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

@av_bp.route('/takeucontrol', methods=['POST'])
def take_control():
    """Take control of AV system using new architecture"""
    try:
        # Get device_id from request (defaults to device1)
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        
        print(f"[@route:host_av:take_control] Taking control of AV system for device: {device_id}")
        
        # Get AV controller for the specified device
        av_controller = get_controller(device_id, 'av')
        
        if not av_controller:
            device = get_device_by_id(device_id)
            if not device:
                return jsonify({
                    'success': False,
                    'error': f'Device {device_id} not found'
                }), 404
            
            return jsonify({
                'success': False,
                'error': f'No AV controller found for device {device_id}',
                'available_capabilities': device.get_capabilities()
            }), 404
        
        print(f"[@route:host_av:take_control] Using AV controller: {type(av_controller).__name__}")
        
        # Take control of AV system
        control_result = av_controller.take_control()
        
        # Add device_id to result if it's a dict
        if isinstance(control_result, dict):
            control_result['device_id'] = device_id
            return jsonify(control_result)
        else:
            return jsonify({
                'success': control_result,
                'device_id': device_id
            })
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@av_bp.route('/getStreamUrl', methods=['GET'])
def get_stream_url():
    """Get stream URL from AV controller using host URL building"""
    try:
        # Get device_id from query params (defaults to device1)
        device_id = request.args.get('device_id', 'device1')
        
        print(f"[@route:host_av:stream_url] Getting stream URL for device: {device_id}")
        
        # Get AV controller for the specified device
        av_controller = get_controller(device_id, 'av')
        
        if not av_controller:
            device = get_device_by_id(device_id)
            if not device:
                return jsonify({
                    'success': False,
                    'error': f'Device {device_id} not found'
                }), 404
            
            return jsonify({
                'success': False,
                'error': f'No AV controller found for device {device_id}',
                'available_capabilities': device.get_capabilities()
            }), 404
        
        print(f"[@route:host_av:stream_url] Using AV controller: {type(av_controller).__name__}")
        
        # Use URL building utilities
        from src.utils.build_url_utils import buildStreamUrlForDevice
        from src.controllers.controller_manager import get_host
        
        host = get_host()
        stream_url = buildStreamUrlForDevice(host.to_dict(), device_id)
        
        print(f"[@route:host_av:stream_url] Built stream URL: {stream_url}")
        
        return jsonify({
            'success': True,
            'stream_url': stream_url,
            'device_id': device_id
        })
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@av_bp.route('/takeScreenshot', methods=['POST'])
def take_screenshot():
    """Take temporary screenshot to nginx folder using new architecture"""
    try:
        # Get device_id from request (defaults to device1)
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        
        print(f"[@route:host_av:take_screenshot] Taking screenshot for device: {device_id}")
        
        # Get AV controller for the specified device
        av_controller = get_controller(device_id, 'av')
        
        if not av_controller:
            device = get_device_by_id(device_id)
            if not device:
                return jsonify({
                    'success': False,
                    'error': f'Device {device_id} not found'
                }), 404
            
            return jsonify({
                'success': False,
                'error': f'No AV controller found for device {device_id}',
                'available_capabilities': device.get_capabilities()
            }), 404
        
        print(f"[@route:host_av:take_screenshot] Using AV controller: {type(av_controller).__name__}")
        
        # Take screenshot using controller - returns local file path
        screenshot_path = av_controller.take_screenshot()
        
        if not screenshot_path:
            return jsonify({
                'success': False,
                'error': 'Failed to take temporary screenshot'
            }), 500
        
        print(f"[@route:host_av:take_screenshot] Screenshot path from controller: {screenshot_path}")
        
        # Use URL building utilities
        from src.utils.build_url_utils import buildScreenshotUrlFromPath
        from src.controllers.controller_manager import get_host
        
        try:
            host = get_host()
            screenshot_url = buildScreenshotUrlFromPath(host.to_dict(), screenshot_path, device_id)
            
            print(f"[@route:host_av:take_screenshot] Built screenshot URL: {screenshot_url}")
            
            return jsonify({
                'success': True,
                'screenshot_url': screenshot_url,
                'device_id': device_id
            })
        except ValueError as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
            
    except Exception as e:
        print(f"[@route:host_av:take_screenshot] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@av_bp.route('/startucapture', methods=['POST'])
def start_video_capture():
    """Start video capture using new architecture"""
    try:
        # Get device_id from request (defaults to device1)
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        
        print(f"[@route:host_av:start_capture] Starting capture for device: {device_id}")
        
        # Get AV controller for the specified device
        av_controller = get_controller(device_id, 'av')
        
        if not av_controller:
            device = get_device_by_id(device_id)
            if not device:
                return jsonify({
                    'success': False,
                    'error': f'Device {device_id} not found'
                }), 404
            
            return jsonify({
                'success': False,
                'error': f'No AV controller found for device {device_id}',
                'available_capabilities': device.get_capabilities()
            }), 404
        
        print(f"[@route:host_av:start_capture] Using AV controller: {type(av_controller).__name__}")
        
        # Get request data for capture options
        duration = data.get('duration', 60.0)  # Default 60 seconds
        filename = data.get('filename')
        resolution = data.get('resolution')
        fps = data.get('fps')
        
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
                'device_id': device_id,
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

@av_bp.route('/stopucapture', methods=['POST'])
def stop_video_capture():
    """Stop video capture using new architecture"""
    try:
        # Get device_id from request (defaults to device1)
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        
        print(f"[@route:host_av:stop_capture] Stopping capture for device: {device_id}")
        
        # Get AV controller for the specified device
        av_controller = get_controller(device_id, 'av')
        
        if not av_controller:
            device = get_device_by_id(device_id)
            if not device:
                return jsonify({
                    'success': False,
                    'error': f'Device {device_id} not found'
                }), 404
            
            return jsonify({
                'success': False,
                'error': f'No AV controller found for device {device_id}',
                'available_capabilities': device.get_capabilities()
            }), 404
        
        print(f"[@route:host_av:stop_capture] Using AV controller: {type(av_controller).__name__}")
        
        # Stop video capture using controller
        stop_result = av_controller.stop_video_capture()
        
        if stop_result:
            return jsonify({
                'success': True,
                'device_id': device_id,
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
        
        # Use URL building utilities to resolve screenshot path
        from src.utils.build_url_utils import resolveScreenshotFilePath
        
        try:
            screenshot_path = resolveScreenshotFilePath(filename)
        except ValueError as e:
            print(f"[@route:host_av:serve_screenshot] Invalid filename: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 400
        
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
        
        # Use URL building utilities to resolve and validate image path
        from src.utils.build_url_utils import resolveImageFilePath
        
        try:
            validated_path = resolveImageFilePath(image_path)
        except ValueError as e:
            print(f"[@route:host_av:serve_image_by_path] Invalid image path: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 400
        
        if not os.path.exists(validated_path):
            print(f"[@route:host_av:serve_image_by_path] Image not found: {validated_path}")
            return jsonify({'success': False, 'error': 'Image not found'}), 404
        
        # Check file size
        file_size = os.path.getsize(validated_path)
        if file_size == 0:
            print(f"[@route:host_av:serve_image_by_path] Image file is empty: {validated_path}")
            return jsonify({'success': False, 'error': 'Image file is empty'}), 500
        
        print(f"[@route:host_av:serve_image_by_path] Serving image: {validated_path} ({file_size} bytes)")
        
        # Determine mimetype based on extension
        mimetype = 'image/jpeg'  # Default
        if validated_path.lower().endswith('.png'):
            mimetype = 'image/png'
        
        # Serve the file with CORS headers
        response = send_file(validated_path, mimetype=mimetype)
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Cache-Control', 'no-cache, no-store, must-revalidate')
        response.headers.add('Pragma', 'no-cache')
        response.headers.add('Expires', '0')
        return response
        
    except Exception as e:
        print(f"[@route:host_av:serve_image_by_path] Error serving image: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500 
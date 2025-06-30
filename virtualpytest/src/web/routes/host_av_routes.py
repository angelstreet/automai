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

@av_bp.route('/restartStream', methods=['POST'])
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

@av_bp.route('/takeControl', methods=['POST'])
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
        from src.utils.build_url_utils import buildCaptureUrlFromPath, buildClientImageUrl
        from src.controllers.controller_manager import get_host
        
        try:
            host = get_host()
            screenshot_url = buildCaptureUrlFromPath(host.to_dict(), screenshot_path, device_id)
            
            # Process URL for client consumption
            client_screenshot_url = buildClientImageUrl(screenshot_url)
            
            print(f"[@route:host_av:take_screenshot] Built screenshot URL: {screenshot_url}")
            print(f"[@route:host_av:take_screenshot] Client screenshot URL: {client_screenshot_url}")
            
            return jsonify({
                'success': True,
                'screenshot_url': client_screenshot_url,
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

@av_bp.route('/startCapture', methods=['POST'])
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

@av_bp.route('/stopCapture', methods=['POST'])
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
        from src.utils.build_url_utils import resolveCaptureFilePath
        
        try:
            capture_path = resolveCaptureFilePath(filename)
        except ValueError as e:
            print(f"[@route:host_av:serve_screenshot] Invalid filename: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 400
        
        # Check if the file exists
        if not os.path.exists(capture_path):
            print(f"[@route:host_av:serve_screenshot] Capture not found: {capture_path}")
            return jsonify({'success': False, 'error': 'Capture not found'}), 404
        
        # Check file size - ensure it's not empty
        file_size = os.path.getsize(capture_path)
        if file_size == 0:
            print(f"[@route:host_av:serve_screenshot] Capture file is empty: {capture_path}")
            return jsonify({'success': False, 'error': 'Capture file is empty'}), 500
        
        print(f"[@route:host_av:serve_screenshot] Serving capture: {capture_path} ({file_size} bytes)")
        
        # Serve the file with CORS headers and cache control
        response = send_file(capture_path, mimetype='image/jpeg')
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
    """Serve an image or JSON file from a specified path on host"""
    # Handle OPTIONS request for CORS
    if request.method == 'OPTIONS':
        response = current_app.response_class()
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        return response
        
    try:
        file_path = request.args.get('path')
        
        # Check if this is a JSON file
        is_json = file_path and file_path.lower().endswith('.json')
        
        # Use URL building utilities to resolve and validate file path
        from src.utils.build_url_utils import resolveImageFilePath
        
        try:
            if is_json:
                # For JSON files, temporarily replace .json with .jpg to validate path
                temp_image_path = file_path.replace('.json', '.jpg')
                validated_image_path = resolveImageFilePath(temp_image_path)
                validated_path = validated_image_path.replace('.jpg', '.json')
            else:
                validated_path = resolveImageFilePath(file_path)
        except ValueError as e:
            print(f"[@route:host_av:serve_image_by_path] Invalid file path: {str(e)}")
            return jsonify({'success': False, 'error': str(e)}), 400
        
        if not os.path.exists(validated_path):
            print(f"[@route:host_av:serve_image_by_path] File not found: {validated_path}")
            return jsonify({'success': False, 'error': 'File not found'}), 404
        
        # Check file size
        file_size = os.path.getsize(validated_path)
        if file_size == 0:
            print(f"[@route:host_av:serve_image_by_path] File is empty: {validated_path}")
            return jsonify({'success': False, 'error': 'File is empty'}), 500
        
        print(f"[@route:host_av:serve_image_by_path] Serving file: {validated_path} ({file_size} bytes)")
        
        # Set mimetype based on extension
        if is_json:
            mimetype = 'application/json'
        elif validated_path.lower().endswith('.png'):
            mimetype = 'image/png'
        else:
            mimetype = 'image/jpeg'  # Default
        
        # Serve the file with CORS headers
        response = send_file(validated_path, mimetype=mimetype)
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Cache-Control', 'no-cache, no-store, must-revalidate')
        response.headers.add('Pragma', 'no-cache')
        response.headers.add('Expires', '0')
        return response
        
    except Exception as e:
        print(f"[@route:host_av:serve_image_by_path] Error serving file: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@av_bp.route('/listCaptures', methods=['POST'])
def list_captures():
    """List captured frames for monitoring with URLs built like screenshots"""
    try:
        data = request.get_json() or {}
        device_id = data.get('device_id', 'device1')
        limit = data.get('limit', 180)
        
        print(f"[@route:host_av:list_captures] Listing captures for device: {device_id}, limit: {limit}")
        
        # Get image controller for the specified device (it handles captures)
        image_controller = get_controller(device_id, 'verification_image')
        
        if not image_controller:
            device = get_device_by_id(device_id)
            if not device:
                return jsonify({
                    'success': False,
                    'error': f'Device {device_id} not found'
                }), 404
            
            return jsonify({
                'success': False,
                'error': f'No image controller found for device {device_id}',
                'available_capabilities': device.get_capabilities()
            }), 404
        
        # Get capture folder from image controller (it already has captures_path)
        capture_folder = image_controller.captures_path
        
        if not os.path.exists(capture_folder):
            return jsonify({
                'success': False,
                'error': f'Capture folder not found: {capture_folder}'
            }), 404
        
        # List all capture files (not test_capture files)
        capture_files = []
        for filename in os.listdir(capture_folder):
            if filename.startswith('capture_') and filename.endswith('.jpg'):
                filepath = os.path.join(capture_folder, filename)
                if os.path.isfile(filepath):
                    # Get file modification time as timestamp
                    timestamp = int(os.path.getmtime(filepath) * 1000)
                    capture_files.append({
                        'filename': filename,
                        'timestamp': timestamp,
                        'filepath': filepath
                    })
        
        # Sort by timestamp (newest first) and limit
        capture_files.sort(key=lambda x: x['timestamp'], reverse=True)
        capture_files = capture_files[:limit]
        
        # Build URLs using the same mechanism as takeScreenshot
        from src.utils.build_url_utils import buildCaptureUrlFromPath, buildClientImageUrl
        from src.controllers.controller_manager import get_host
        
        try:
            host = get_host()
            host_dict = host.to_dict()
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Failed to get host info: {str(e)}'
            }), 500
        
        # Build response with URLs for each capture
        captures = []
        for capture in capture_files:
            try:
                # Build URL from file path using same mechanism as screenshots
                capture_url = buildCaptureUrlFromPath(host_dict, capture['filepath'], device_id)
                
                # Process URL for client consumption
                client_capture_url = buildClientImageUrl(capture_url)
                
                captures.append({
                    'filename': capture['filename'],
                    'timestamp': capture['timestamp'],
                    'url': client_capture_url
                })
            except Exception as url_error:
                print(f"[@route:host_av:list_captures] Failed to build URL for {capture['filename']}: {url_error}")
                # Skip captures that can't have URLs built
                continue
        
        print(f"[@route:host_av:list_captures] Found {len(captures)} capture files with URLs")
        
        return jsonify({
            'success': True,
            'captures': captures,
            'total': len(captures),
            'device_id': device_id
        })
        
    except Exception as e:
        print(f"[@route:host_av:list_captures] Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'List captures error: {str(e)}'
        }), 500 
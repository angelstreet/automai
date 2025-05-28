"""
Audio/Video Routes

This module contains the audio/video API endpoints for:
- HDMI Stream control
- Video capture and analysis
- Audio level detection
"""

from flask import Blueprint, request, jsonify
import os

# Create blueprint
audiovideo_bp = Blueprint('audiovideo', __name__)

# Helper functions
def check_controllers_available():
    """Helper function to check if controllers are available"""
    from app import controllers_available
    if not controllers_available:
        return jsonify({'error': 'VirtualPyTest controllers not available'}), 503
    return None

# =====================================================
# HDMI STREAM CONTROLLER ENDPOINTS
# =====================================================

@audiovideo_bp.route('/api/virtualpytest/hdmi-stream/defaults', methods=['GET'])
def get_hdmi_stream_defaults():
    """Get default HDMI stream connection values from environment variables."""
    try:
        defaults = {
            'host_ip': os.getenv('HOST_IP', ''),
            'host_username': os.getenv('HOST_USERNAME', ''),
            'host_password': os.getenv('HOST_PASSWORD', ''),
            'host_port': os.getenv('HOST_PORT', '22'),
            'stream_path': os.getenv('STREAM_PATH', '/var/www/html/stream/output.m3u8')
        }
        
        return jsonify({
            'success': True,
            'defaults': defaults
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@audiovideo_bp.route('/api/virtualpytest/hdmi-stream/take-control', methods=['POST'])
def hdmi_stream_take_control():
    """Establish SSH connection for HDMI stream access."""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['host_ip', 'host_username', 'host_password', 'stream_path']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        host_ip = data['host_ip']
        host_username = data['host_username']
        host_password = data['host_password']
        host_port = int(data.get('host_port', 22))
        stream_path = data['stream_path']
        
        print(f"[@api:hdmi-stream] Taking control of HDMI stream via SSH: {host_username}@{host_ip}:{host_port}")
        
        # Use the same SSH connection approach as AndroidMobileRemoteController
        try:
            from controllers.lib.sshUtils import create_ssh_connection
            
            # Create SSH connection
            ssh_connection = create_ssh_connection(
                host=host_ip,
                port=host_port,
                username=host_username,
                password=host_password,
                timeout=30
            )
            
            if not ssh_connection:
                return jsonify({
                    'success': False,
                    'error': 'Failed to establish SSH connection'
                }), 400
            
            # Test the stream file exists
            success, stdout, stderr, exit_code = ssh_connection.execute_command(f"ls -la {stream_path}")
            
            # Close the SSH connection after test
            ssh_connection.disconnect()
            
            if success and exit_code == 0:
                print(f"[@api:hdmi-stream] SSH connection successful, stream file verified: {stream_path}")
                return jsonify({
                    'success': True,
                    'message': f'SSH connection established and stream file verified at {stream_path}',
                    'stream_info': {
                        'host': host_ip,
                        'path': stream_path,
                        'accessible': True
                    }
                })
            else:
                error_msg = stderr.strip() if stderr else 'Stream file not found or not accessible'
                print(f"[@api:hdmi-stream] Stream file verification failed: {error_msg}")
                return jsonify({
                    'success': False,
                    'error': f'Stream file verification failed: {error_msg}'
                }), 400
                
        except ImportError:
            # Fallback to basic SSH test if sshUtils not available
            print(f"[@api:hdmi-stream] SSH utilities not available, using basic connection test")
            return jsonify({
                'success': True,
                'message': f'SSH connection configured for {stream_path} (utilities not available for verification)',
                'stream_info': {
                    'host': host_ip,
                    'path': stream_path,
                    'accessible': True
                }
            })
            
    except Exception as e:
        print(f"[@api:hdmi-stream] Error during SSH connection: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@audiovideo_bp.route('/api/virtualpytest/hdmi-stream/release-control', methods=['POST'])
def hdmi_stream_release_control():
    """Release SSH connection for HDMI stream."""
    try:
        print("[@api:hdmi-stream] Releasing HDMI stream SSH connection")
        
        # In a real implementation, this would:
        # 1. Close any active SSH connections
        # 2. Clean up any port forwarding
        # 3. Stop any background processes
        
        return jsonify({
            'success': True,
            'message': 'HDMI stream SSH connection released successfully'
        })
        
    except Exception as e:
        print(f"[@api:hdmi-stream] Error during SSH connection release: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@audiovideo_bp.route('/api/virtualpytest/hdmi-stream/config', methods=['GET'])
def get_hdmi_stream_config():
    """Get HDMI Stream controller configuration"""
    error = check_controllers_available()
    if error:
        return error
    
    try:
        # Get the controller class to retrieve configuration
        from controllers.audiovideo.hdmi_stream import HDMIStreamController
        
        # Return configuration options
        config = {
            'supported_protocols': ['HLS', 'RTSP', 'HTTP', 'HTTPS'],
            'supported_resolutions': [
                '1920x1080', '1280x720', '854x480', '640x360'
            ],
            'supported_fps': [15, 24, 25, 30, 50, 60],
            'default_resolution': '1920x1080',
            'default_fps': 30,
            'example_urls': [
                'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
                'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
                'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
            ]
        }
        
        return jsonify(config)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@audiovideo_bp.route('/api/virtualpytest/hdmi-stream/connect', methods=['POST'])
def connect_hdmi_stream():
    """Connect to HDMI stream"""
    error = check_controllers_available()
    if error:
        return error
    
    try:
        from controllers import ControllerFactory
        
        data = request.json
        stream_url = data.get('stream_url', '')
        resolution = data.get('resolution', '1920x1080')
        fps = data.get('fps', 30)
        
        if not stream_url:
            return jsonify({'error': 'Stream URL is required'}), 400
        
        # Create controller instance
        controller = ControllerFactory.create_av_controller(
            capture_type="hdmi_stream",
            device_name="HDMI Stream",
            stream_url=stream_url
        )
        
        # Connect to stream
        connection_result = controller.connect()
        
        if connection_result:
            # Start video capture
            capture_result = controller.start_video_capture(resolution, fps)
            
            if capture_result:
                status = controller.get_status()
                return jsonify({
                    'success': True,
                    'connected': True,
                    'streaming': True,
                    'status': status
                })
            else:
                return jsonify({
                    'success': False,
                    'error': 'Failed to start video capture'
                }), 500
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to connect to stream'
            }), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@audiovideo_bp.route('/api/virtualpytest/hdmi-stream/disconnect', methods=['POST'])
def disconnect_hdmi_stream():
    """Disconnect from HDMI stream"""
    error = check_controllers_available()
    if error:
        return error
    
    try:
        from controllers import ControllerFactory
        
        # Create controller instance (in real implementation, you'd retrieve existing instance)
        controller = ControllerFactory.create_av_controller(
            capture_type="hdmi_stream",
            device_name="HDMI Stream"
        )
        
        # Disconnect
        disconnect_result = controller.disconnect()
        
        return jsonify({
            'success': disconnect_result,
            'connected': False,
            'streaming': False
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@audiovideo_bp.route('/api/virtualpytest/hdmi-stream/status', methods=['GET'])
def get_hdmi_stream_status():
    """Get HDMI stream status"""
    error = check_controllers_available()
    if error:
        return error
    
    try:
        from controllers import ControllerFactory
        
        # Create controller instance (in real implementation, you'd retrieve existing instance)
        controller = ControllerFactory.create_av_controller(
            capture_type="hdmi_stream",
            device_name="HDMI Stream"
        )
        
        status = controller.get_status()
        
        return jsonify({
            'status': status,
            'timestamp': __import__('time').time()
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@audiovideo_bp.route('/api/virtualpytest/hdmi-stream/control', methods=['POST'])
def control_hdmi_stream():
    """Control HDMI stream (start/stop capture, analyze content, etc.)"""
    error = check_controllers_available()
    if error:
        return error
    
    try:
        from controllers import ControllerFactory
        
        data = request.json
        action = data.get('action', '')
        
        # Create controller instance
        controller = ControllerFactory.create_av_controller(
            capture_type="hdmi_stream",
            device_name="HDMI Stream"
        )
        
        result = {'success': False}
        
        if action == 'start_capture':
            resolution = data.get('resolution', '1920x1080')
            fps = data.get('fps', 30)
            result['success'] = controller.start_video_capture(resolution, fps)
            result['action'] = 'start_capture'
            
        elif action == 'stop_capture':
            result['success'] = controller.stop_video_capture()
            result['action'] = 'stop_capture'
            
        elif action == 'capture_frame':
            filename = data.get('filename')
            result['success'] = controller.capture_frame(filename)
            result['action'] = 'capture_frame'
            
        elif action == 'analyze_content':
            analysis_type = data.get('analysis_type', 'motion')
            analysis_result = controller.analyze_video_content(analysis_type)
            result['success'] = bool(analysis_result)
            result['analysis'] = analysis_result
            result['action'] = 'analyze_content'
            
        elif action == 'detect_audio_level':
            audio_level = controller.detect_audio_level()
            result['success'] = True
            result['audio_level'] = audio_level
            result['action'] = 'detect_audio_level'
            
        elif action == 'record_session':
            duration = data.get('duration', 10.0)
            filename = data.get('filename')
            result['success'] = controller.record_session(duration, filename)
            result['action'] = 'record_session'
            
        else:
            return jsonify({'error': f'Unknown action: {action}'}), 400
        
        # Get updated status
        result['status'] = controller.get_status()
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500 
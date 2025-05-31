from flask import Blueprint, request, jsonify
import paramiko
import subprocess
import os
import time
import threading
import uuid
from typing import Dict, Optional

# Create blueprint
screen_definition_bp = Blueprint('screen_definition', __name__, url_prefix='/api/virtualpytest/screen-definition')

# Global SSH session storage (in production, use Redis or database)
ssh_sessions: Dict[str, Dict] = {}

# Configuration
TMP_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'tmp')
RESOURCES_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'resources')

# Ensure directories exist
os.makedirs(os.path.join(TMP_DIR, 'screenshots'), exist_ok=True)
os.makedirs(os.path.join(TMP_DIR, 'captures'), exist_ok=True)
os.makedirs(RESOURCES_DIR, exist_ok=True)

@screen_definition_bp.route('/connect', methods=['POST'])
def connect():
    """Establish dedicated SSH connection for screen capture"""
    try:
        data = request.get_json()
        
        # Extract connection parameters
        host_ip = data.get('host_ip')
        host_username = data.get('host_username')
        host_password = data.get('host_password')
        host_port = int(data.get('host_port', 22))
        video_device = data.get('video_device', '/dev/video0')
        device_model = data.get('device_model', 'unknown')
        
        if not all([host_ip, host_username, host_password]):
            return jsonify({
                'success': False,
                'error': 'Missing required connection parameters'
            }), 400
        
        # Generate unique session ID
        session_id = str(uuid.uuid4())
        
        # Create SSH client
        ssh_client = paramiko.SSHClient()
        ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        print(f"[@server:screen_definition:connect] Connecting to {host_ip}:{host_port}")
        
        # Connect to SSH
        ssh_client.connect(
            hostname=host_ip,
            port=host_port,
            username=host_username,
            password=host_password,
            timeout=15
        )
        
        # Test connection by checking video device
        stdin, stdout, stderr = ssh_client.exec_command(f'ls -la {video_device}')
        device_check = stdout.read().decode().strip()
        error_output = stderr.read().decode().strip()
        
        if error_output:
            print(f"[@server:screen_definition:connect] Warning: Video device check: {error_output}")
        
        # Store session information
        ssh_sessions[session_id] = {
            'ssh_client': ssh_client,
            'host_ip': host_ip,
            'host_port': host_port,
            'host_username': host_username,
            'video_device': video_device,
            'device_model': device_model,
            'connected_at': time.time(),
            'capture_process': None,
            'capture_thread': None,
            'is_capturing': False
        }
        
        print(f"[@server:screen_definition:connect] SSH session established: {session_id}")
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'device_info': {
                'video_device': video_device,
                'device_check': device_check if not error_output else 'Device check failed'
            }
        })
        
    except paramiko.AuthenticationException:
        return jsonify({
            'success': False,
            'error': 'SSH authentication failed'
        }), 401
    except paramiko.SSHException as e:
        return jsonify({
            'success': False,
            'error': f'SSH connection error: {str(e)}'
        }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Connection failed: {str(e)}'
        }), 500

@screen_definition_bp.route('/disconnect', methods=['POST'])
def disconnect():
    """Close SSH connection and clean up session"""
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        
        if not session_id or session_id not in ssh_sessions:
            return jsonify({
                'success': False,
                'error': 'Invalid session ID'
            }), 400
        
        session = ssh_sessions[session_id]
        
        print(f"[@server:screen_definition:disconnect] Closing session: {session_id}")
        
        # Stop any active capture
        if session.get('is_capturing'):
            _stop_capture_internal(session)
        
        # Close SSH connection
        if session.get('ssh_client'):
            session['ssh_client'].close()
        
        # Remove from sessions
        del ssh_sessions[session_id]
        
        return jsonify({
            'success': True,
            'message': 'Session closed successfully'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Disconnect failed: {str(e)}'
        }), 500

@screen_definition_bp.route('/screenshot', methods=['POST'])
def take_screenshot():
    """Take a single screenshot using ffmpeg"""
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        
        if not session_id or session_id not in ssh_sessions:
            return jsonify({
                'success': False,
                'error': 'Invalid session ID'
            }), 400
        
        session = ssh_sessions[session_id]
        ssh_client = session['ssh_client']
        video_device = session['video_device']
        
        # Generate timestamp for filename
        timestamp = int(time.time())
        screenshot_filename = f'screenshot_{timestamp}.jpg'
        remote_path = f'/tmp/{screenshot_filename}'
        local_path = os.path.join(TMP_DIR, 'screenshots', screenshot_filename)
        
        print(f"[@server:screen_definition:screenshot] Taking screenshot from {video_device}")
        
        # Use ffmpeg to capture screenshot
        ffmpeg_cmd = f'ffmpeg -f v4l2 -i {video_device} -vframes 1 -y {remote_path}'
        
        stdin, stdout, stderr = ssh_client.exec_command(ffmpeg_cmd)
        exit_status = stdout.channel.recv_exit_status()
        
        if exit_status != 0:
            error_output = stderr.read().decode()
            return jsonify({
                'success': False,
                'error': f'Screenshot capture failed: {error_output}'
            }), 500
        
        # Transfer file to local system using SFTP
        sftp = ssh_client.open_sftp()
        try:
            sftp.get(remote_path, local_path)
            # Clean up remote file
            ssh_client.exec_command(f'rm {remote_path}')
        finally:
            sftp.close()
        
        print(f"[@server:screen_definition:screenshot] Screenshot saved: {local_path}")
        
        return jsonify({
            'success': True,
            'screenshot_path': local_path,
            'screenshot_filename': screenshot_filename,
            'timestamp': timestamp
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Screenshot failed: {str(e)}'
        }), 500

@screen_definition_bp.route('/start-capture', methods=['POST'])
def start_capture():
    """Start video capture at 10fps with rolling buffer"""
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        
        if not session_id or session_id not in ssh_sessions:
            return jsonify({
                'success': False,
                'error': 'Invalid session ID'
            }), 400
        
        session = ssh_sessions[session_id]
        
        if session.get('is_capturing'):
            return jsonify({
                'success': False,
                'error': 'Capture already in progress'
            }), 400
        
        print(f"[@server:screen_definition:start_capture] Starting capture for session: {session_id}")
        
        # Start capture in background thread
        capture_thread = threading.Thread(
            target=_capture_worker,
            args=(session_id,),
            daemon=True
        )
        capture_thread.start()
        
        session['capture_thread'] = capture_thread
        session['is_capturing'] = True
        
        return jsonify({
            'success': True,
            'message': 'Video capture started'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to start capture: {str(e)}'
        }), 500

@screen_definition_bp.route('/stop-capture', methods=['POST'])
def stop_capture():
    """Stop video capture"""
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        
        if not session_id or session_id not in ssh_sessions:
            return jsonify({
                'success': False,
                'error': 'Invalid session ID'
            }), 400
        
        session = ssh_sessions[session_id]
        
        if not session.get('is_capturing'):
            return jsonify({
                'success': False,
                'error': 'No capture in progress'
            }), 400
        
        print(f"[@server:screen_definition:stop_capture] Stopping capture for session: {session_id}")
        
        _stop_capture_internal(session)
        
        return jsonify({
            'success': True,
            'message': 'Video capture stopped'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to stop capture: {str(e)}'
        }), 500

def _capture_worker(session_id: str):
    """Background worker for continuous frame capture"""
    session = ssh_sessions.get(session_id)
    if not session:
        return
    
    ssh_client = session['ssh_client']
    video_device = session['video_device']
    capture_dir = os.path.join(TMP_DIR, 'captures')
    
    frame_count = 0
    max_frames = 500  # 50s at 10fps
    
    print(f"[@server:screen_definition:capture_worker] Starting capture worker for {video_device}")
    
    try:
        while session.get('is_capturing'):
            # Calculate frame number (rolling buffer)
            frame_num = (frame_count % max_frames) + 1
            timestamp = int(time.time() * 1000)  # milliseconds for uniqueness
            
            frame_filename = f'capture_{frame_num:03d}_{timestamp}.jpg'
            remote_path = f'/tmp/{frame_filename}'
            local_path = os.path.join(capture_dir, frame_filename)
            
            # Capture frame with ffmpeg
            ffmpeg_cmd = f'ffmpeg -f v4l2 -i {video_device} -vframes 1 -y {remote_path}'
            
            stdin, stdout, stderr = ssh_client.exec_command(ffmpeg_cmd)
            exit_status = stdout.channel.recv_exit_status()
            
            if exit_status == 0:
                # Transfer file
                try:
                    sftp = ssh_client.open_sftp()
                    sftp.get(remote_path, local_path)
                    sftp.close()
                    
                    # Clean up remote file
                    ssh_client.exec_command(f'rm {remote_path}')
                    
                    frame_count += 1
                    
                    # Remove old frame if we're at max capacity
                    if frame_count > max_frames:
                        old_frame_num = ((frame_count - max_frames - 1) % max_frames) + 1
                        old_files = [f for f in os.listdir(capture_dir) if f.startswith(f'capture_{old_frame_num:03d}_')]
                        for old_file in old_files:
                            try:
                                os.remove(os.path.join(capture_dir, old_file))
                            except OSError:
                                pass
                    
                except Exception as e:
                    print(f"[@server:screen_definition:capture_worker] Frame transfer error: {e}")
            else:
                print(f"[@server:screen_definition:capture_worker] Frame capture failed")
            
            # Wait for next frame (10fps = 100ms)
            time.sleep(0.1)
            
    except Exception as e:
        print(f"[@server:screen_definition:capture_worker] Capture worker error: {e}")
    finally:
        session['is_capturing'] = False
        print(f"[@server:screen_definition:capture_worker] Capture worker stopped")

def _stop_capture_internal(session: Dict):
    """Internal function to stop capture"""
    session['is_capturing'] = False
    
    # Wait for thread to finish
    if session.get('capture_thread'):
        session['capture_thread'].join(timeout=2)
        session['capture_thread'] = None
    
    print(f"[@server:screen_definition:stop_capture_internal] Capture stopped")

@screen_definition_bp.route('/status', methods=['GET'])
def get_status():
    """Get status of all active sessions"""
    try:
        sessions_status = {}
        
        for session_id, session in ssh_sessions.items():
            sessions_status[session_id] = {
                'host_ip': session['host_ip'],
                'device_model': session['device_model'],
                'video_device': session['video_device'],
                'connected_at': session['connected_at'],
                'is_capturing': session.get('is_capturing', False),
                'uptime': time.time() - session['connected_at']
            }
        
        return jsonify({
            'success': True,
            'active_sessions': len(ssh_sessions),
            'sessions': sessions_status
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Status check failed: {str(e)}'
        }), 500 
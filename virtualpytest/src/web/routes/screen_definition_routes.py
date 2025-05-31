from flask import Blueprint, request, jsonify, current_app
import paramiko
import subprocess
import os
import time
import threading
import uuid
import json
import shutil
from pathlib import Path
from typing import Dict, Optional

# Create blueprint with consistent name - remove URL prefix as it's set in register_routes
screen_definition_blueprint = Blueprint('screen_definition', __name__)

# Global SSH session storage (in production, use Redis or database)
ssh_sessions: Dict[str, Dict] = {}

# Configuration
TMP_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'tmp')
RESOURCES_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'resources')

# Ensure directories exist
os.makedirs(os.path.join(TMP_DIR, 'screenshots'), exist_ok=True)
os.makedirs(os.path.join(TMP_DIR, 'captures'), exist_ok=True)
os.makedirs(RESOURCES_DIR, exist_ok=True)

# Dictionary to store active SSH sessions
active_sessions = {}

# Initialize dirs on startup
def ensure_dirs():
    os.makedirs('/tmp/screenshots', exist_ok=True)
    os.makedirs('/tmp/capture_1-600', exist_ok=True)

@screen_definition_blueprint.route('/connect', methods=['POST'])
def connect():
    """Establish SSH connection for screen definition"""
    data = request.get_json()
    host_ip = data.get('host_ip')
    host_username = data.get('host_username')
    host_password = data.get('host_password')
    host_port = data.get('host_port', '22')
    video_device = data.get('video_device', '/dev/video0')
    device_model = data.get('device_model', 'unknown')
    
    if not host_ip or not host_username or not host_password:
        return jsonify({'success': False, 'error': 'Missing required connection parameters'})
    
    try:
        # Generate a unique session ID
        session_id = f"screen_def_{int(time.time())}_{host_ip}"
        
        # In a real implementation, establish actual SSH connection
        # For now, we'll simulate a successful connection
        active_sessions[session_id] = {
            'host_ip': host_ip,
            'host_username': host_username,
            'host_port': host_port,
            'video_device': video_device,
            'device_model': device_model,
            'connected_at': time.time(),
            'is_capturing': False,
            'frame_count': 0,
            'last_screenshot': None
        }
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'message': f'Connected to {host_ip}'
        })
        
    except Exception as e:
        current_app.logger.error(f"Connection error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

@screen_definition_blueprint.route('/disconnect', methods=['POST'])
def disconnect():
    """Close SSH connection"""
    data = request.get_json()
    session_id = data.get('session_id')
    
    if not session_id or session_id not in active_sessions:
        return jsonify({'success': False, 'error': 'Invalid session ID'})
    
    try:
        # In a real implementation, close actual SSH connection
        # For now, just remove from our dictionary
        session_info = active_sessions.pop(session_id)
        
        return jsonify({
            'success': True,
            'message': f'Disconnected from {session_info["host_ip"]}'
        })
        
    except Exception as e:
        current_app.logger.error(f"Disconnect error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

@screen_definition_blueprint.route('/screenshot', methods=['POST'])
def take_screenshot():
    """Take a screenshot via the SSH connection"""
    data = request.get_json()
    session_id = data.get('session_id')
    
    if not session_id or session_id not in active_sessions:
        return jsonify({'success': False, 'error': 'Invalid session ID'})
    
    try:
        session_info = active_sessions[session_id]
        
        # Ensure directory exists
        ensure_dirs()
        
        # Generate screenshot filename
        device_model = session_info['device_model']
        screenshot_filename = f"{device_model}.jpg"
        screenshot_path = f"/tmp/screenshots/{screenshot_filename}"
        
        # In a real implementation, capture actual screenshot via SSH
        # For demo, we'll simulate by copying a placeholder
        placeholder_img = os.path.join(current_app.root_path, 'static', 'placeholder.jpg')
        if os.path.exists(placeholder_img):
            shutil.copy(placeholder_img, screenshot_path)
        else:
            # Create an empty file if placeholder doesn't exist
            Path(screenshot_path).touch()
        
        # Create symbolic link to latest screenshot
        latest_path = "/tmp/screenshots/latest.jpg"
        if os.path.exists(latest_path):
            os.remove(latest_path)
        os.symlink(screenshot_path, latest_path)
        
        # Update session info
        session_info['last_screenshot'] = screenshot_path
        
        return jsonify({
            'success': True,
            'screenshot_path': screenshot_path,
            'latest_path': latest_path,
            'message': 'Screenshot taken successfully'
        })
        
    except Exception as e:
        current_app.logger.error(f"Screenshot error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

@screen_definition_blueprint.route('/start-capture', methods=['POST'])
def start_capture():
    """Start video capture"""
    data = request.get_json()
    session_id = data.get('session_id')
    
    if not session_id or session_id not in active_sessions:
        return jsonify({'success': False, 'error': 'Invalid session ID'})
    
    try:
        session_info = active_sessions[session_id]
        
        # Check if already capturing
        if session_info.get('is_capturing'):
            return jsonify({'success': False, 'error': 'Capture already in progress'})
        
        # Ensure directory exists
        ensure_dirs()
        
        # Clear previous capture files
        capture_dir = "/tmp/capture_1-600"
        for file in os.listdir(capture_dir):
            if file.startswith("frame_"):
                os.remove(os.path.join(capture_dir, file))
        
        # In a real implementation, start actual capture via SSH
        # For demo, we'll simulate by copying placeholder frames
        placeholder_img = os.path.join(current_app.root_path, 'static', 'placeholder.jpg')
        
        # Create initial frames
        for i in range(10):  # Start with 10 frames
            frame_filename = f"frame_{i:04d}.jpg"
            frame_path = os.path.join(capture_dir, frame_filename)
            
            if os.path.exists(placeholder_img):
                shutil.copy(placeholder_img, frame_path)
            else:
                # Create an empty file if placeholder doesn't exist
                Path(frame_path).touch()
        
        # Update session info
        session_info['is_capturing'] = True
        session_info['frame_count'] = 10
        session_info['capture_started_at'] = time.time()
        
        return jsonify({
            'success': True,
            'capture_dir': capture_dir,
            'frame_count': 10,
            'message': 'Video capture started'
        })
        
    except Exception as e:
        current_app.logger.error(f"Start capture error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

@screen_definition_blueprint.route('/stop-capture', methods=['POST'])
def stop_capture():
    """Stop video capture"""
    data = request.get_json()
    session_id = data.get('session_id')
    
    if not session_id or session_id not in active_sessions:
        return jsonify({'success': False, 'error': 'Invalid session ID'})
    
    try:
        session_info = active_sessions[session_id]
        
        # Check if not capturing
        if not session_info.get('is_capturing'):
            return jsonify({'success': False, 'error': 'No capture in progress'})
        
        # In a real implementation, stop actual capture via SSH
        # For now, just update session info
        session_info['is_capturing'] = False
        
        return jsonify({
            'success': True,
            'frame_count': session_info['frame_count'],
            'message': 'Video capture stopped'
        })
        
    except Exception as e:
        current_app.logger.error(f"Stop capture error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

@screen_definition_blueprint.route('/get-capture-status', methods=['POST'])
def get_capture_status():
    """Get status of ongoing capture"""
    data = request.get_json()
    session_id = data.get('session_id')
    
    if not session_id or session_id not in active_sessions:
        return jsonify({'success': False, 'error': 'Invalid session ID'})
    
    try:
        session_info = active_sessions[session_id]
        
        # Calculate some stats
        uptime = time.time() - session_info.get('connected_at', time.time())
        capture_time = 0
        if session_info.get('is_capturing'):
            capture_time = time.time() - session_info.get('capture_started_at', time.time())
            
            # In a real implementation, we'd check actual frames
            # For demo, we'll simulate frame creation over time
            capture_dir = "/tmp/capture"
            current_frame_count = session_info.get('frame_count', 0)
            
            # Add new frames (1 per second of capture)
            new_frames = min(int(capture_time), 500 - current_frame_count)
            if new_frames > 0:
                placeholder_img = os.path.join(current_app.root_path, 'static', 'placeholder.jpg')
                
                for i in range(current_frame_count, current_frame_count + new_frames):
                    frame_filename = f"frame_{i:04d}.jpg"
                    frame_path = os.path.join(capture_dir, frame_filename)
                    
                    if os.path.exists(placeholder_img):
                        shutil.copy(placeholder_img, frame_path)
                    else:
                        # Create empty file if placeholder doesn't exist
                        Path(frame_path).touch()
                
                session_info['frame_count'] = current_frame_count + new_frames
        
        return jsonify({
            'success': True,
            'is_connected': True,
            'is_capturing': session_info.get('is_capturing', False),
            'frame_count': session_info.get('frame_count', 0),
            'uptime_seconds': int(uptime),
            'capture_time_seconds': int(capture_time) if session_info.get('is_capturing') else 0,
            'last_screenshot': session_info.get('last_screenshot'),
        })
        
    except Exception as e:
        current_app.logger.error(f"Get status error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)})

@screen_definition_blueprint.route('/status', methods=['GET'])
def get_status():
    """Get status of all active sessions"""
    try:
        sessions_status = {}
        
        for session_id, session in active_sessions.items():
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
            'active_sessions': len(active_sessions),
            'sessions': sessions_status
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Status check failed: {str(e)}'
        }), 500 
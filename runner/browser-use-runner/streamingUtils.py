import os
import sys
import subprocess
from uuid import uuid4

def setup_streaming_environment(script_folder_path):
    """
    Set up the VNC server and websockify for streaming.
    Returns a tuple of (session_id, vnc_process, websockify_process)
    """
    session_id = str(uuid4())
    # Start VNC server with session_id as password
    vnc_password_file = os.path.join(script_folder_path, 'vncpasswd')
    with open(vnc_password_file, 'w') as f:
        f.write(session_id)
    vnc_process = subprocess.Popen(['vncserver', ':1', '-geometry', '1280x720', '-depth', '24', '-passwd', vnc_password_file], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    vnc_process.wait()
    print(f"[streaming] Started VNC server for session {session_id}", file=sys.stderr)

    # Start websockify for noVNC
    websockify_process = subprocess.Popen(['websockify', '6080', 'localhost:5901'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    print(f"[streaming] Started websockify for VNC streaming on port 6080", file=sys.stderr)

    return session_id, vnc_process, websockify_process

def generate_streaming_urls(request, session_id):
    """
    Generate WebSocket and VNC streaming URLs based on the request host and session ID.
    Returns a tuple of (websocket_url, vnc_stream_url)
    """
    websocket_url = f"ws://{request.host}/ws/{session_id}"
    vnc_stream_url = f"http://{request.host}/vnc.html?host={request.host.split(':')[0]}&port=6080&password={session_id}"
    print(f"[streaming] Generated WebSocket URL: {websocket_url}", file=sys.stderr)
    print(f"[streaming] Generated VNC Stream URL: {vnc_stream_url}", file=sys.stderr)
    return websocket_url, vnc_stream_url 
import argparse
try:
    import gunicorn
except ImportError:
    print("[app_playwright] Warning: gunicorn not found, falling back to development server", file=sys.stderr)
    gunicorn = None
from flask import Flask, request, jsonify, send_from_directory
from flask_sock import Sock
from playwright.async_api import async_playwright
import os
import sys
from datetime import datetime
import subprocess
import json
import asyncio
import base64
from uuid import uuid4
from asgiref.wsgi import WsgiToAsgi
import supabase
from dotenv import load_dotenv
import signal
import time

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__, static_folder='/noVNC')
sock = Sock(app)

# Initialize Supabase client
SUPABASE_URL = os.getenv('SUPABASE_URL', '')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '')
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase_client = supabase.create_client(SUPABASE_URL, SUPABASE_KEY)
        print(f"[app] Supabase client initialized with URL: {SUPABASE_URL}", file=sys.stderr)
    except Exception as e:
        supabase_client = None
        print(f"[app] Error initializing Supabase client: {str(e)}", file=sys.stderr)
else:
    supabase_client = None
    print("[app] Warning: Supabase credentials not found. Database updates will not be performed.", file=sys.stderr)

@app.route('/execute', methods=['POST'])
async def execute_script():
    data = request.get_json()
    script_path = data.get('script_path')
    parameters = data.get('parameters', '')
    timeout = data.get('timeout', 360)
    env_vars = data.get('environment_variables', {})
    created_at = data.get('created_at')
    job_id = data.get('job_id')
    script_id = data.get('script_id')
    config_name = data.get('config_name', '')
    env = data.get('env', 'N/A')
    repo_url = data.get('repo_url', '')
    branch = data.get('branch', 'main')
    script_folder = data.get('script_folder', '')

    if not script_path or not job_id or not script_id:
        return jsonify({'status': 'error', 'message': 'Missing required parameters'}), 400

    # Create uploadFolder structure
    upload_folder = os.path.join(os.getcwd(), 'uploadFolder')
    job_folder_name = f"{created_at.split('T')[0].replace('-', '')}_{created_at.split('T')[1].split('.')[0].replace(':', '')}_{job_id}"
    job_folder_path = os.path.join(upload_folder, job_folder_name)
    script_folder_name = f"{created_at.split('T')[0].replace('-', '')}_{created_at.split('T')[1].split('.')[0].replace(':', '')}_{script_id}"
    script_folder_path = os.path.join(job_folder_path, script_folder_name)

    os.makedirs(script_folder_path, exist_ok=True)
    print(f"[execute_script] Created script folder: {script_folder_path}", file=sys.stderr)

    # Determine repo directory if repo_url is provided
    repo_dir = ''
    if repo_url:
        repo_name = repo_url.split('/').pop().replace('.git', '') or 'repo'
        repo_dir = os.path.join(os.getcwd(), repo_name)
        print(f"[execute_script] Using repository directory: {repo_dir}", file=sys.stderr)

    # Determine the correct script path based on repository
    if repo_dir:
        script_content_path = os.path.join(repo_dir, script_path)
    else:
        script_content_path = os.path.join(os.getcwd(), script_path)

    print(f"[execute_script] Script path resolved to: {script_content_path}", file=sys.stderr)

    # Save script to script folder if it exists
    if os.path.exists(script_content_path):
        with open(script_content_path, 'r') as f:
            script_content = f.read()
        original_script_name = os.path.basename(script_path)
        with open(os.path.join(script_folder_path, original_script_name), 'w') as f:
            f.write(script_content)
        print(f"[execute_script] Saved script content to {script_folder_path}/{original_script_name}", file=sys.stderr)
    else:
        print(f"[execute_script] Script not found at {script_content_path}", file=sys.stderr)
        return jsonify({'status': 'error', 'message': f'Script not found at {script_content_path}'}), 404

    session_id = str(uuid4())
    start_time_iso = datetime.utcnow().isoformat() + 'Z'
    status = 'success'
    stdout_data = ''
    stderr_data = ''
    result = {}

    # Clean up any existing VNC configurations or lock files
    import shutil
    vnc_home = os.path.expanduser("~root/.vnc")
    if os.path.exists(vnc_home):
        shutil.rmtree(vnc_home, ignore_errors=True)
        print(f"[execute_script] Cleaned up existing VNC configuration at {vnc_home}", file=sys.stderr)
    else:
        print(f"[execute_script] No existing VNC configuration found at {vnc_home}", file=sys.stderr)

    # Create VNC directory
    os.makedirs("/root/.vnc", exist_ok=True)

    # Create a simple xstartup file
    xstartup_file = "/root/.vnc/xstartup"
    with open(xstartup_file, "w") as f:
        f.write("#!/bin/sh\nxterm &\nsleep infinity\n")
    os.chmod(xstartup_file, 0o755)

    # Set session_id as VNC password (ensure it's at least 6 characters)
    vnc_password = session_id
    if len(vnc_password) < 6:
        vnc_password = session_id + "123456"[:6-len(session_id)]
    print(f"[execute_script] Setting VNC password with length {len(vnc_password)}", file=sys.stderr)

    # Create password file using vncpasswd
    with open('/tmp/vnc_pwd', 'w') as f:
        f.write(f"{vnc_password}\n{vnc_password}\n")

    try:
        # Use vncpasswd with input redirection
        subprocess.run('cat /tmp/vnc_pwd | vncpasswd', shell=True, check=True)
        os.remove('/tmp/vnc_pwd')  # Remove the temporary password file
        print(f"[execute_script] VNC password set successfully to /root/.vnc/passwd", file=sys.stderr)
    except Exception as e:
        print(f"[execute_script] Error setting VNC password: {str(e)}", file=sys.stderr)

    # Start VNC server with session_id as password
    vnc_env = os.environ.copy()
    vnc_env['USER'] = 'root'  # Set USER to root for VNC server

    # Start VNC server directly (vncserver will create password file on first run)
    vnc_cmd = ['vncserver', ':1', '-geometry', '1920x1080', '-depth', '24', '-viewonly']
    print(f"[execute_script] Starting VNC server with command: {vnc_cmd}", file=sys.stderr)
    vnc_process = subprocess.Popen(vnc_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env=vnc_env)
    vnc_process.wait()
    vnc_stdout, vnc_stderr = vnc_process.communicate()
    print(f"[execute_script] Started VNC server for session {session_id}", file=sys.stderr)
    print(f"[execute_script] VNC server stdout: {vnc_stdout}", file=sys.stderr)
    print(f"[execute_script] VNC server stderr: {vnc_stderr}", file=sys.stderr)
    print(f"[execute_script] VNC server return code: {vnc_process.returncode}", file=sys.stderr)

    # Check if VNC server is running
    try:
        vnc_check = subprocess.run(['ps', 'aux'], capture_output=True, text=True)
        if ':1' in vnc_check.stdout:
            print(f"[execute_script] VNC server confirmed running on display :1", file=sys.stderr)
        else:
            print(f"[execute_script] WARNING: VNC server not found running on display :1", file=sys.stderr)
    except Exception as e:
        print(f"[execute_script] Error checking VNC server status: {str(e)}", file=sys.stderr)

    # Start websockify for noVNC, targeting VNC server on display :1 (port 5901)
    websockify_process = subprocess.Popen(['websockify', '6080', 'localhost:5901'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    print(f"[execute_script] Started websockify for VNC streaming on port 6080 with PID {websockify_process.pid}", file=sys.stderr)
    
    # Check if websockify is running and test connectivity to VNC server
    try:
        import time
        time.sleep(1)  # Give it a moment to start
        if websockify_process.poll() is None:
            print(f"[execute_script] websockify confirmed running with PID {websockify_process.pid}", file=sys.stderr)
            # Test connectivity to VNC server
            try:
                import socket
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(2)
                result = s.connect_ex(('localhost', 5901))
                if result == 0:
                    print(f"[execute_script] Success: websockify can connect to VNC server at localhost:5901", file=sys.stderr)
                else:
                    print(f"[execute_script] WARNING: websockify cannot connect to VNC server at localhost:5901, error code: {result}", file=sys.stderr)
                s.close()
            except Exception as conn_err:
                print(f"[execute_script] Error testing connectivity to VNC server: {str(conn_err)}", file=sys.stderr)
        else:
            print(f"[execute_script] WARNING: websockify terminated unexpectedly with return code {websockify_process.returncode}", file=sys.stderr)
            websockify_stdout, websockify_stderr = websockify_process.communicate()
            print(f"[execute_script] websockify stdout: {websockify_stdout}", file=sys.stderr)
            print(f"[execute_script] websockify stderr: {websockify_stderr}", file=sys.stderr)
    except Exception as e:
        print(f"[execute_script] Error checking websockify status: {str(e)}", file=sys.stderr)

    # Generate WebSocket URL and VNC streaming URL (with session_id as password)
    websocket_url = f"ws://{request.host}/ws/{session_id}"
    vnc_stream_url = f"http://{request.host}/vnc.html?host={request.host.split(':')[0]}&port=6080&password={session_id}&view_only=1&autoconnect=1&resize=scale"
    print(f"[execute_script] Generated WebSocket URL: {websocket_url}", file=sys.stderr)
    print(f"[execute_script] Generated VNC Stream URL: {vnc_stream_url}", file=sys.stderr)

    # Update Supabase with streaming information if client is initialized
    if supabase_client:
        try:
            response = supabase_client.table('scripts_run').update({
                'session': {
                    'session_id': session_id,
                    'websocket_url': websocket_url,
                    'vnc_stream_url': vnc_stream_url,
                    'session_url': '',
                    'stream_status': 'start'
                }
            }).eq('id', script_id).execute()
            if response.data:
                print(f"[execute_script] Updated Supabase with streaming info for script {script_id} with status 'start'", file=sys.stderr)
            else:
                print(f"[execute_script] Failed to update Supabase for script {script_id}: {response.error}", file=sys.stderr)
        except Exception as e:
            print(f"[execute_script] Error updating Supabase for script {script_id}: {str(e)}", file=sys.stderr)

    # Parse parameters into a list similar to command-line arguments
    param_list = parameters.split() if parameters else []
    print(f"[execute_script] Parameters for script execution: {param_list}", file=sys.stderr)

    # Prepare command with parameters
    command = [sys.executable, script_content_path] + param_list

    # Set environment variables
    script_env = os.environ.copy()
    script_env.update(env_vars)
    script_env['DISPLAY'] = ':1'  # Ensure script runs in the same display as VNC server

    # Execute script using subprocess.run
    try:
        print(f"[execute_script] Executing script: {script_path} for job {job_id}, script_id {script_id}", file=sys.stderr)
        # Update stream status to 'streaming'
        if supabase_client:
            try:
                response = supabase_client.table('scripts_run').update({
                    'session': {
                        'session_id': session_id,
                        'websocket_url': websocket_url,
                        'vnc_stream_url': vnc_stream_url,
                        'session_url': '',
                        'stream_status': 'streaming'
                    }
                }).eq('id', script_id).execute()
                if response.data:
                    print(f"[execute_script] Updated Supabase with streaming status 'streaming' for script {script_id}", file=sys.stderr)
                else:
                    print(f"[execute_script] Failed to update Supabase streaming status for script {script_id}: {response.error}", file=sys.stderr)
            except Exception as e:
                print(f"[execute_script] Error updating Supabase streaming status for script {script_id}: {str(e)}", file=sys.stderr)

        process = subprocess.run(
            command,
            shell=False,
            capture_output=True,
            text=True,
            timeout=timeout,
            env=script_env
        )

        stdout_data = process.stdout
        stderr_data = process.stderr

        # Save outputs to files
        with open(os.path.join(script_folder_path, 'stdout.txt'), 'w') as f:
            f.write(stdout_data if stdout_data else '')
        with open(os.path.join(script_folder_path, 'stderr.txt'), 'w') as f:
            f.write(stderr_data if stderr_data else '')
        print(f"[execute_script] Saved stdout and stderr to files in {script_folder_path}", file=sys.stderr)

        if process.returncode != 0:
            status = 'failed'
            print(f"[execute_script] Script execution failed with return code {process.returncode}", file=sys.stderr)
        else:
            status = 'success'
            print(f"[execute_script] Script executed successfully", file=sys.stderr)
    except subprocess.TimeoutExpired:
        stderr_data = f"Script timed out after {timeout} seconds"
        status = 'timeout'
        print(f"[execute_script] Script timed out after {timeout} seconds", file=sys.stderr)
        with open(os.path.join(script_folder_path, 'stderr.txt'), 'w') as f:
            f.write(stderr_data)
    except Exception as e:
        stderr_data = str(e)
        status = 'error'
        print(f"[execute_script] Error executing script: {str(e)}", file=sys.stderr)
        with open(os.path.join(script_folder_path, 'stderr.txt'), 'w') as f:
            f.write(stderr_data)
    finally:
        # Update stream status to 'complete'
        if supabase_client:
            try:
                response = supabase_client.table('scripts_run').update({
                    'session': {
                        'session_id': session_id,
                        'websocket_url': websocket_url,
                        'vnc_stream_url': vnc_stream_url,
                        'session_url': '',
                        'stream_status': 'complete'
                    }
                }).eq('id', script_id).execute()
                if response.data:
                    print(f"[execute_script] Updated Supabase with streaming status 'complete' for script {script_id}", file=sys.stderr)
                else:
                    print(f"[execute_script] Failed to update Supabase streaming status for script {script_id}: {response.error}", file=sys.stderr)
            except Exception as e:
                print(f"[execute_script] Error updating Supabase streaming status for script {script_id}: {str(e)}", file=sys.stderr)
        
        # Stop the VNC server and websockify processes
        try:
            print(f"[execute_script] Stopping VNC server and websockify processes", file=sys.stderr)
            # Terminate websockify process if running
            if websockify_process and websockify_process.poll() is None:
                websockify_process.terminate()
                websockify_process.wait(timeout=5)
                print(f"[execute_script] Websockify process terminated", file=sys.stderr)
            
            # Stop VNC server
            try:
                subprocess.run(['vncserver', '-kill', ':1'], check=True, capture_output=True, text=True)
                print(f"[execute_script] VNC server stopped", file=sys.stderr)
            except subprocess.CalledProcessError as e:
                print(f"[execute_script] Failed to stop VNC server: {e.stderr}", file=sys.stderr)
            
            # Force kill any remaining VNC processes
            try:
                subprocess.run(['pkill', '-f', 'Xtightvnc'], check=False)
                subprocess.run(['pkill', '-f', 'websockify'], check=False)
                print(f"[execute_script] Forcefully killed any remaining VNC processes", file=sys.stderr)
            except Exception as e:
                print(f"[execute_script] Error during force kill: {str(e)}", file=sys.stderr)
            
            # Clean up VNC temp files
            vnc_dir = '/root/.vnc'
            if os.path.exists(vnc_dir):
                for vnc_file in ['passwd', 'xstartup', f':{1}.log', f':{1}.pid']:
                    file_path = os.path.join(vnc_dir, vnc_file)
                    if os.path.exists(file_path):
                        try:
                            os.remove(file_path)
                            print(f"[execute_script] Removed VNC temp file: {file_path}", file=sys.stderr)
                        except Exception as e:
                            print(f"[execute_script] Failed to remove VNC temp file {file_path}: {str(e)}", file=sys.stderr)
        except Exception as e:
            print(f"[execute_script] Error while stopping VNC server and processes: {str(e)}", file=sys.stderr)

    # Save metadata
    end_time_iso = datetime.utcnow().isoformat() + 'Z'
    try:
        duration = str((datetime.fromisoformat(end_time_iso[:-1]) - datetime.fromisoformat(start_time_iso[:-1])).total_seconds())
        if float(duration) <= 0:
            duration = "0.001"
    except:
        duration = "0.001"

    metadata = {
        'job_id': job_id,
        'script_id': script_id,
        'script_name': os.path.basename(script_path),
        'script_path': script_path,
        'parameters': parameters,
        'start_time': start_time_iso,
        'end_time': end_time_iso,
        'status': status,
        'env': env,
        'config_name': config_name or 'Default Config',
        'duration': duration
    }
    metadata_path = os.path.join(script_folder_path, 'metadata.json')
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"[execute_script] Saved metadata to {metadata_path}", file=sys.stderr)

    # Add WebSocket URL and VNC streaming URL to response
    return jsonify({
        'status': status,
        'sessionId': session_id,
        'websocketUrl': websocket_url,
        'vncStreamUrl': vnc_stream_url,
        'stdout': stdout_data,
        'stderr': stderr_data,
        'start_time': start_time_iso,
        'end_time': end_time_iso,
        'duration': duration,
        'job_id': job_id,
        'script_id': script_id
    })


@app.route('/initialize_job', methods=['POST'])
def initialize_job():
    data = request.get_json()
    job_id = data.get('job_id')
    created_at = data.get('created_at')
    upload_script_content = data.get('upload_script_content')
    decrypted_env_vars = data.get('decrypted_env_vars', {})
    credentials = data.get('credentials', {})
    config_name = data.get('config_name', '')
    repo_url = data.get('repo_url', '')
    branch = data.get('branch', 'main')
    script_folder = data.get('script_folder', '')

    if not job_id or not created_at:
        return jsonify({'status': 'error', 'message': 'Missing job_id or created_at'}), 400

    if not upload_script_content:
        return jsonify({'status': 'error', 'message': 'Missing upload script content'}), 400

    try:
        current_dir = os.getcwd()
        print(f"[initialize_job] Current working directory: {current_dir}", file=sys.stderr)
    except Exception as e:
        print(f"[initialize_job] ERROR: Failed to get current working directory: {str(e)}", file=sys.stderr)
        
    upload_folder = os.path.join(os.getcwd(), 'uploadFolder')
    if os.path.exists(upload_folder):
        import shutil
        shutil.rmtree(upload_folder)
        print(f"[initialize_job] Removed existing uploadFolder at {upload_folder}", file=sys.stderr)
    job_folder_name = f"{created_at.split('T')[0].replace('-', '')}_{created_at.split('T')[1].split('.')[0].replace(':', '')}_{job_id}"
    job_folder_path = os.path.join(upload_folder, job_folder_name)
    os.makedirs(job_folder_path, exist_ok=True)
    print(f"[initialize_job] Created job folder for {job_id} at {job_folder_path}", file=sys.stderr)

    if repo_url:
        repo_name = repo_url.split('/').pop().replace('.git', '')
        repo_dir = os.path.join(os.getcwd(), repo_name)
        if os.path.exists(repo_dir):
            try:
                subprocess.run(['git', 'pull', 'origin', branch], cwd=repo_dir, check=True, capture_output=True, text=True)
                print(f"[initialize_job] Successfully pulled latest changes for {repo_url}", file=sys.stderr)
            except subprocess.CalledProcessError as e:
                print(f"[initialize_job] Failed to pull repository {repo_url}: {e.stderr}", file=sys.stderr)
                return jsonify({'status': 'error', 'message': f'Failed to pull repository: {e.stderr}'}), 500
        else:
            try:
                subprocess.run(['git', 'clone', '-b', branch, repo_url, repo_dir], check=True, capture_output=True, text=True)
                print(f"[initialize_job] Successfully cloned {repo_url} to {repo_dir}", file=sys.stderr)
            except subprocess.CalledProcessError as e:
                print(f"[initialize_job] Failed to clone repository {repo_url}: {e.stderr}", file=sys.stderr)
                return jsonify({'status': 'error', 'message': f'Failed to clone repository: {e.stderr}'}), 500

    upload_script_path = os.path.join(job_folder_path, 'upload_and_report.py')
    with open(upload_script_path, 'w') as f:
        f.write(upload_script_content)
    print(f"[initialize_job] Saved upload_and_report.py for job {job_id} to {upload_script_path}", file=sys.stderr)

    requirements_content = "boto3\npython-dotenv\nsupabase\n"
    requirements_path = os.path.join(job_folder_path, 'requirements.txt')
    with open(requirements_path, 'w') as f:
        f.write(requirements_content)
    print(f"[initialize_job] Saved requirements.txt for job {job_id} to {requirements_path}", file=sys.stderr)

    try:
        subprocess.run([sys.executable, '-m', 'pip', 'install', '-r', requirements_path], check=True, capture_output=True, text=True, cwd=job_folder_path)
        print(f"[initialize_job] Successfully installed dependencies for job {job_id} from {requirements_path}", file=sys.stderr)
    except subprocess.CalledProcessError as e:
        print(f"[initialize_job] ERROR: Failed to install dependencies for job {job_id}: {e.stderr}", file=sys.stderr)
    except Exception as e:
        print(f"[initialize_job] ERROR: Unexpected error while installing dependencies for job {job_id}: {str(e)}", file=sys.stderr)

    cloudflare_r2_endpoint = credentials.get('CLOUDFLARE_R2_ENDPOINT', '')
    cloudflare_r2_access_key_id = credentials.get('CLOUDFLARE_R2_ACCESS_KEY_ID', '')
    cloudflare_r2_secret_access_key = credentials.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY', '')
    print(f"[initialize_job] Fetched Cloudflare R2 credentials for job {job_id}", file=sys.stderr)

    supabase_api_url = credentials.get('SUPABASE_URL', '')
    supabase_service_role_key = credentials.get('SUPABASE_SERVICE_ROLE_KEY', '')
    print(f"[initialize_job] Fetched Supabase credentials for job {job_id}", file=sys.stderr)

    credentials_file = os.path.join(job_folder_path, '.env')
    with open(credentials_file, 'w') as f:
        f.write(f"# Environment variables for Cloudflare R2\n")
        f.write(f"CLOUDFLARE_R2_ENDPOINT={cloudflare_r2_endpoint}\n")
        f.write(f"CLOUDFLARE_R2_ACCESS_KEY_ID={cloudflare_r2_access_key_id}\n")
        f.write(f"CLOUDFLARE_R2_SECRET_ACCESS_KEY={cloudflare_r2_secret_access_key}\n")
        f.write(f"# Environment variables for Supabase\n")
        f.write(f"SUPABASE_URL={supabase_api_url}\n")
        f.write(f"SUPABASE_SERVICE_ROLE_KEY={supabase_service_role_key}\n")
    print(f"[initialize_job] Saved credentials for job {job_id} to {credentials_file}", file=sys.stderr)

    return jsonify({'status': 'success', 'message': f'Initialized job {job_id} with upload script and credentials'})

@app.route('/finalize_job', methods=['POST'])
def finalize_job():
    data = request.get_json()
    job_id = data.get('job_id')
    created_at = data.get('created_at')
    overall_status = data.get('overall_status', 'unknown')
    env = data.get('env', 'N/A')
    config_name = data.get('config_name', '')
    start_time = data.get('start_time', datetime.utcnow().isoformat() + 'Z')

    if not job_id or not created_at:
        return jsonify({'status': 'error', 'message': 'Missing job_id or created_at'}), 400

    print(f"[finalize_job] Finalizing job {job_id}", file=sys.stderr)

    upload_folder = os.path.join(os.getcwd(), 'uploadFolder')
    job_folder_name = f"{created_at.split('T')[0].replace('-', '')}_{created_at.split('T')[1].split('.')[0].replace(':', '')}_{job_id}"
    job_folder_path = os.path.join(upload_folder, job_folder_name)

    if not os.path.exists(job_folder_path):
        print(f"[finalize_job] ERROR: Job folder {job_folder_path} not found", file=sys.stderr)
        return jsonify({'status': 'error', 'message': f'Job folder for {job_id} not found'}), 404

    upload_script_path = os.path.join(job_folder_path, 'upload_and_report.py')
    if not os.path.exists(upload_script_path):
        print(f"[finalize_job] ERROR: upload_and_report.py not found at {upload_script_path}", file=sys.stderr)
        return jsonify({'status': 'error', 'message': 'Upload script not found'}), 500

    try:
        if not start_time or start_time == 'undefined':
            start_time = created_at
        end_time = datetime.utcnow().isoformat() + 'Z'
        try:
            duration = str((datetime.fromisoformat(end_time[:-1]) - datetime.fromisoformat(start_time[:-1])).total_seconds())
            if float(duration) <= 0:
                duration = "0.001"
        except:
            duration = "0.001"

        job_metadata = {
            'job_id': job_id,
            'start_time': start_time,
            'end_time': end_time,
            'config_name': config_name or 'Default Config',
            'env': env,
            'status': overall_status,
            'duration': duration
        }
        metadata_path = os.path.join(job_folder_path, 'metadata.json')
        with open(metadata_path, 'w') as f:
            json.dump(job_metadata, f, indent=2)
        print(f"[finalize_job] Saved job metadata to {metadata_path}", file=sys.stderr)

        result = subprocess.run([sys.executable, upload_script_path], capture_output=True, text=True, cwd=job_folder_path)
        print(f"[finalize_job] Result: {result.stdout}", file=sys.stderr)
        if result.returncode == 0:
            print(f"[finalize_job] Upload and report generation successful for job {job_id}", file=sys.stderr)
            try:
                output_json = json.loads(result.stdout)
                return jsonify(output_json)
            except json.JSONDecodeError:
                return jsonify({'status': 'error', 'message': 'Failed to parse upload script output'}), 500
        else:
            print(f"[finalize_job] ERROR: upload_and_report.py failed with return code {result.returncode}", file=sys.stderr)
            return jsonify({'status': 'error', 'message': 'Upload script execution failed', 'job_id': job_id, 'error_details': result.stderr}), 200
    except Exception as e:
        print(f"[finalize_job] ERROR: Failed to execute upload_and_report.py: {str(e)}", file=sys.stderr)
        return jsonify({'status': 'error', 'message': f'Failed to execute upload script: {str(e)}', 'job_id': job_id}), 200

@app.route('/healthz', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'}), 200

@app.route('/vnc.html', methods=['GET'])
def serve_vnc_html():
    return send_from_directory('/noVNC', 'vnc.html')

@app.route('/<path:path>', methods=['GET'])
def serve_vnc_files(path):
    return send_from_directory('/noVNC', path)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Run Flask server with custom port')
    parser.add_argument('--port', type=int, default=int(os.getenv('PORT', 10000)), help='Port to run the server on')
    parser.add_argument('--debug', action='store_true', default=False, help='Enable debug mode')
    parser.add_argument('--workers', type=int, default=int(os.getenv('GUNICORN_WORKERS', 4)), help='Number of gunicorn worker processes')
    args = parser.parse_args()
    port = args.port
    debug = args.debug
    workers = args.workers
    print(f"[app_playwright] Running on port {port} with {workers} workers", file=sys.stderr)
    
    if gunicorn:
        # Run gunicorn for production in Docker environment
        from gunicorn.app.base import BaseApplication

        class StandaloneApplication(BaseApplication):
            def __init__(self, app, options=None):
                self.options = options or {}
                self.application = app
                super().__init__()

            def load_config(self):
                config = {key: value for key, value in self.options.items()
                          if key in self.cfg.settings and value is not None}
                for key, value in config.items():
                    self.cfg.set(key.lower(), value)

            def load(self):
                return self.application

        options = {
            'bind': f'0.0.0.0:{port}',
            'workers': workers,
            'loglevel': 'info',
            'timeout': 120
        }
        StandaloneApplication(app, options).run()
    else:
        # Fallback for development or if gunicorn is not installed
        app.run(host='0.0.0.0', port=port, debug=debug)
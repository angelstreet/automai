from flask import Flask, request, jsonify
from datetime import datetime
from scripts.restrict_script import execute_script
import os
import threading
import queue
import git
import hashlib
import virtualenv
import subprocess
import sys
import shutil
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import tempfile
import boto3
from botocore.client import Config
import requests

app = Flask(__name__)

BASE_REPO_PATH = "/opt/render/project/src/repo"
LOCAL_SCRIPTS_PATH = os.path.join(os.path.dirname(__file__), "scripts")
LOCAL_VENV_PATH = "/venv-disk"

# Initialize S3 client for Cloudflare R2 instead of Supabase Storage
CLOUDFLARE_R2_ENDPOINT = os.environ.get('CLOUDFLARE_R2_ENDPOINT', '')
CLOUDFLARE_R2_ACCESS_KEY_ID = os.environ.get('CLOUDFLARE_R2_ACCESS_KEY_ID', '')
CLOUDFLARE_R2_SECRET_ACCESS_KEY = os.environ.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY', '')
if CLOUDFLARE_R2_ENDPOINT and CLOUDFLARE_R2_ACCESS_KEY_ID and CLOUDFLARE_R2_SECRET_ACCESS_KEY:
    s3_client = boto3.client(
        's3',
        endpoint_url=CLOUDFLARE_R2_ENDPOINT,
        aws_access_key_id=CLOUDFLARE_R2_ACCESS_KEY_ID,
        aws_secret_access_key=CLOUDFLARE_R2_SECRET_ACCESS_KEY,
        config=Config(signature_version='s3v4'),
    )
else:
    s3_client = None
    print(f"WARNING: S3 client for Cloudflare R2 not initialized, missing credentials", file=sys.stderr)

def get_repo_path(repo_url):
    repo_hash = hashlib.sha1(repo_url.encode()).hexdigest()
    return os.path.join(BASE_REPO_PATH, repo_hash)

def ensure_repo(repo_url, script_folder, branch=None):
    repo_path = get_repo_path(repo_url)
    print(f"DEBUG: Ensuring repo: url={repo_url}, folder={script_folder}, branch={branch}, path={repo_path}", file=sys.stderr)
    try:
        if os.path.exists(repo_path):
            print(f"DEBUG: Repo exists, pulling updates: {repo_path}", file=sys.stderr)
            repo = git.Repo(repo_path)
            repo.remotes.origin.pull()
            if branch:
                print(f"DEBUG: Checking out branch: {branch}", file=sys.stderr)
                repo.git.checkout(branch)
        else:
            print(f"DEBUG: Cloning repo: {repo_url} to {repo_path}", file=sys.stderr)
            os.makedirs(repo_path, exist_ok=True)
            repo = git.Repo.clone_from(repo_url, repo_path, branch=branch)
            print(f"DEBUG: Enabling sparse checkout for folder: {script_folder}", file=sys.stderr)
            with repo.config_writer() as cw:
                cw.set_value("core", "sparseCheckout", "true")
            sparse_file = os.path.join(repo_path, ".git", "info", "sparse-checkout")
            os.makedirs(os.path.dirname(sparse_file), exist_ok=True)
            with open(sparse_file, "w") as f:
                f.write(f"{script_folder}/\n")
            repo.git.checkout()
        return repo_path
    except Exception as e:
        print(f"ERROR: Git operation failed: {str(e)}", file=sys.stderr)
        return {"status": "error", "message": f"Git operation failed: {str(e)}"}

def setup_venv(base_path, folder):
    requirements_path = os.path.join(base_path, folder, "requirements.txt")
    venv_path = os.path.join(base_path, ".venv") if base_path != os.path.dirname(LOCAL_SCRIPTS_PATH) else LOCAL_VENV_PATH
    hash_file_path = os.path.join(venv_path, "requirements_hash.txt")
    
    # Add explicit directory checks with detailed logging
    print(f"DEBUG: Venv path is: {venv_path}", file=sys.stderr)
    print(f"DEBUG: Venv exists? {os.path.exists(venv_path)}", file=sys.stderr)
    if os.path.exists(venv_path):
        print(f"DEBUG: Venv contents: {os.listdir(venv_path)}", file=sys.stderr)
    
    # Check if requirements file exists
    print(f"DEBUG: Checking for requirements.txt at: {requirements_path}", file=sys.stderr)
    print(f"DEBUG: Requirements file exists? {os.path.exists(requirements_path)}", file=sys.stderr)
    
    if os.path.exists(requirements_path):
        try:
            # Create virtualenv directory if it doesn't exist
            if not os.path.exists(venv_path):
                print(f"DEBUG: Creating new virtualenv at: {venv_path}", file=sys.stderr)
                virtualenv.cli_run([venv_path])
            else:
                print(f"DEBUG: Using existing virtualenv at: {venv_path}", file=sys.stderr)
                
                # Check if the virtualenv is valid by looking for bin/python
                bin_python = os.path.join(venv_path, "bin", "python")
                if os.path.exists(bin_python):
                    print(f"DEBUG: Verified virtualenv has python executable", file=sys.stderr)
                else:
                    print(f"DEBUG: Virtualenv exists but missing python executable, recreating", file=sys.stderr)
                    shutil.rmtree(venv_path, ignore_errors=True)
                    virtualenv.cli_run([venv_path])
            
            # Compute hash of requirements.txt
            current_hash = None
            with open(requirements_path, 'rb') as f:
                current_hash = hashlib.sha1(f.read()).hexdigest()
            stored_hash = None
            if os.path.exists(hash_file_path):
                with open(hash_file_path, 'r') as f:
                    stored_hash = f.read().strip()
            
            # Only install requirements if hash differs or hash file doesn't exist
            if current_hash != stored_hash:
                pip_path = os.path.join(venv_path, "bin", "pip")
                print(f"DEBUG: Running pip install -r {requirements_path}", file=sys.stderr)
                result = subprocess.run([pip_path, "install", "-r", requirements_path], check=True, capture_output=True, text=True)
                print(f"DEBUG: pip install output: {result.stdout}", file=sys.stderr)
                # Store the new hash
                with open(hash_file_path, 'w') as f:
                    f.write(current_hash)
            else:
                print(f"DEBUG: Requirements hash matches, skipping pip install", file=sys.stderr)
            
            return venv_path
        except Exception as e:
            print(f"ERROR: Failed to setup virtualenv: {str(e)}", file=sys.stderr)
            return {"status": "error", "message": f"Failed to setup virtualenv: {str(e)}"}
    
    print(f"DEBUG: No requirements.txt found, skipping virtualenv", file=sys.stderr)
    return None

def decrypt_value(encrypted_text):
    """Decrypt data encrypted with AES-256-GCM mirroring encryptionUtils.ts"""
    try:
        encryption_key_b64 = os.environ.get("ENCRYPTION_KEY")
        if not encryption_key_b64:
            print(f"ERROR: No encryption key found in environment", file=sys.stderr)
            return encrypted_text

        encryption_key = base64.b64decode(encryption_key_b64)
        parts = encrypted_text.split(":")
        if len(parts) != 3:
            print(f"ERROR: Invalid encrypted text format", file=sys.stderr)
            return encrypted_text

        iv = bytes.fromhex(parts[0])
        auth_tag = bytes.fromhex(parts[1])
        encrypted_data = bytes.fromhex(parts[2])

        aesgcm = AESGCM(encryption_key)
        nonce = iv
        ciphertext = encrypted_data + auth_tag
        decrypted = aesgcm.decrypt(nonce, ciphertext, None)
        return decrypted.decode("utf-8")
    except Exception as e:
        print(f"ERROR: Decryption error: {str(e)}", file=sys.stderr)
        return encrypted_text

def run_with_timeout(script_content, parameters, timeout=30, venv_path=None, env_vars=None):
    result_queue = queue.Queue()
    print(f"DEBUG: Running script with timeout={timeout}, venv_path={venv_path}, parameters={parameters}", file=sys.stderr)
    print(f"DEBUG: Environment variable keys provided: {env_vars.keys() if env_vars else 'None'}", file=sys.stderr)

    def target():
        try:
            # Temporarily set environment variables for this execution
            original_env = dict(os.environ)
            if env_vars:
                for key, value in env_vars.items():
                    os.environ[key] = value

            # Write script content to a temporary file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
                f.write(script_content)
                temp_script_path = f.name

            # Prepare command to run the script - first attempt with parameters
            cmd = [os.path.join(venv_path, "bin", "python") if venv_path else "python", temp_script_path] + parameters
            print(f"DEBUG: Executing command (first attempt with parameters): {cmd}", file=sys.stderr)
            print(f"DEBUG: Note - Parameters {parameters} are treated as command-line arguments. If not intended, they will be ignored in retry.", file=sys.stderr)

            # Run the script in a subprocess - first attempt with parameters
            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            stdout, stderr = process.communicate(timeout=timeout)

            # Check if the error is due to unrecognized arguments (argparse issue)
            if process.returncode != 0 and "unrecognized arguments" in stderr.lower():
                print(f"DEBUG: Unrecognized arguments error detected, retrying with critical parameters only", file=sys.stderr)
                # Retry with only critical parameters like --headless
                critical_params = [param for param in parameters if param == '--headless']
                cmd = [os.path.join(venv_path, "bin", "python") if venv_path else "python", temp_script_path] + critical_params
                print(f"DEBUG: Executing command (retry with critical parameters): {cmd}", file=sys.stderr)
                process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                stdout, stderr = process.communicate(timeout=timeout)

            # Clean up temporary file
            os.unlink(temp_script_path)

            # Restore original environment
            os.environ.clear()
            os.environ.update(original_env)

            result = {"status": "success" if process.returncode == 0 else "error", "output": stdout, "message": stderr, "returncode": process.returncode}
            result_queue.put(result)
        except subprocess.TimeoutExpired:
            process.kill()
            result_queue.put({"status": "error", "message": f"Script execution timed out after {timeout} seconds", "returncode": -1})
        except Exception as e:
            result_queue.put({"status": "error", "message": f"Execution error: {str(e)}", "returncode": -1})

    thread = threading.Thread(target=target)
    thread.daemon = True
    thread.start()
    thread.join(timeout)

    if thread.is_alive():
        print(f"ERROR: Script execution timed out after {timeout} seconds", file=sys.stderr)
        return {"status": "error", "message": "Script execution timed out", "returncode": -1}
    try:
        return result_queue.get_nowait()
    except queue.Empty:
        print(f"ERROR: No result returned from script execution", file=sys.stderr)
        return {"status": "error", "message": "No result returned", "returncode": -1}

# Function to create a temporary folder with timestamp
def create_temp_folder_with_timestamp(timestamp=None):
    if not timestamp:
        timestamp = datetime.utcnow().isoformat().replace(':', '-').replace('.', '-')
    temp_dir = os.path.join(tempfile.gettempdir(), f"script_run_{timestamp}")
    os.makedirs(temp_dir, exist_ok=True)
    return temp_dir, timestamp

# Function to collect metadata about files in a directory
def collect_file_metadata(directory):
    files = []
    for root, _, filenames in os.walk(directory):
        for filename in filenames:
            file_path = os.path.join(root, filename)
            relative_path = os.path.relpath(file_path, directory)
            files.append({
                'name': filename,
                'path': file_path,
                'relative_path': relative_path,
                'size': os.path.getsize(file_path)
            })
    return files

# Function to upload files to Cloudflare R2 using S3-compatible API
def upload_files_to_cloudflare(files, bucket_name, folder_path):
    if not s3_client:
        print(f"ERROR: S3 client not initialized, cannot upload files", file=sys.stderr)
        return []
    
    uploaded_files = []
    for file in files:
        file_path = file['path']
        remote_path = f"{folder_path}/{file['relative_path']}"
        try:
            with open(file_path, 'rb') as f:
                s3_client.upload_fileobj(f, bucket_name, remote_path, ExtraArgs={'ContentType': 'application/octet-stream'})
            # Construct public URL (assuming bucket is public)
            public_url = f"{CLOUDFLARE_R2_ENDPOINT}/{bucket_name}/{remote_path}"
            uploaded_files.append({
                'name': file['name'],
                'path': file_path,
                'relative_path': file['relative_path'],
                'size': file['size'],
                'public_url': public_url
            })
            print(f"DEBUG: Uploaded file to Cloudflare R2: {remote_path}, URL: {public_url}", file=sys.stderr)
        except Exception as e:
            print(f"ERROR: Failed to upload file to Cloudflare R2: {remote_path}, Error: {str(e)}", file=sys.stderr)
    return uploaded_files

def upload_files_to_r2(job_id, created_at, associated_files, original_script_path=None, temp_folder=None):
    """
    Upload associated files to Cloudflare R2 and return a list of file info with public URLs.
    :param job_id: The job ID
    :param created_at: The creation timestamp of the job
    :param associated_files: List of file info dictionaries to upload
    :param original_script_path: The original path of the script file
    :param temp_folder: The temporary folder where files were created
    :return: List of file info dictionaries with public URLs added
    """
    try:
        # Use date_HHMMSS format for folder naming
        date_str = datetime.strptime(created_at[:19], "%Y-%m-%dT%H:%M:%S").strftime("%Y%m%d_%H%M%S")
        folder_name = f"{date_str}_{job_id if job_id != 'unknown_job_id' else 'no_job_id'}"
        bucket_name = 'reports'

        updated_files = []
        for file_info in associated_files:
            try:
                file_path = file_info.get('path')
                file_name = file_info.get('name')
                if not file_path or not os.path.exists(file_path):
                    print(f"[@python-slave-runner:app] File not found for upload: {file_name}, path: {file_path}")
                    updated_files.append(file_info)
                    continue

                # Determine content type based on file extension
                _, ext = os.path.splitext(file_name)
                content_type = {
                    '.html': 'text/html',
                    '.json': 'application/json',
                    '.txt': 'text/plain',
                    '.log': 'text/plain',
                    '.png': 'image/png',
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.zip': 'application/zip',
                    '.js': 'application/javascript',
                    '.css': 'text/css',
                    '.pdf': 'application/pdf',
                    '.xml': 'application/xml',
                    '.csv': 'text/csv',
                    '.gif': 'image/gif',
                    '.bmp': 'image/bmp',
                    '.webp': 'image/webp',
                    '.mp3': 'audio/mpeg',
                    '.wav': 'audio/wav',
                    '.ogg': 'audio/ogg',
                    '.mp4': 'video/mp4',
                    '.webm': 'video/webm',
                    '.mpeg': 'video/mpeg',
                    '.bin': 'application/octet-stream'
                }.get(ext.lower(), 'application/octet-stream')

                content_disposition = 'inline' if content_type.startswith('text') or content_type.startswith('image') or content_type.startswith('video') or content_type.startswith('audio') else 'attachment'

                # Organize files in subfolders based on their type or path
                relative_path = file_info.get('relative_path', file_name)
                if 'suncherry-playwright_trace' in relative_path:
                    r2_path = f"{folder_name}/trace/{relative_path.split('suncherry-playwright_trace/')[1]}"
                else:
                    r2_path = f"{folder_name}/assets/{relative_path}"
                print(f"[@python-slave-runner:app] Uploading file to R2: {file_name} -> {r2_path} with Content-Type: {content_type}")

                # Upload file to R2
                with open(file_path, 'rb') as f:
                    s3_client.upload_fileobj(
                        f,
                        bucket_name,
                        r2_path,
                        ExtraArgs={
                            'ContentType': content_type,
                            'ContentDisposition': content_disposition
                        }
                    )

                # Generate presigned URL (valid for 7 days)
                url = s3_client.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': bucket_name, 'Key': r2_path},
                    ExpiresIn=604800  # 7 days in seconds
                )

                # Add the public URL to the file info
                file_info['public_url'] = url
                print(f"[@python-slave-runner:app] Uploaded file to R2: {file_name}, Public URL: {url[:50]}...")
                updated_files.append(file_info)
            except Exception as e:
                print(f"[@python-slave-runner:app] Error uploading file to R2: {file_info.get('name')}, Error: {str(e)}")
                updated_files.append(file_info)
        
        # Check if the script file is available to upload
        script_file_path = os.environ.get('SCRIPT_FILE_PATH', '')
        
        # First check the temp folder for the script file
        if not script_file_path or not os.path.exists(script_file_path):
            # First try to find the script in the temp folder
            script_name = os.path.basename(script_file_path or (original_script_path or ''))
            if script_name:
                temp_script_path = os.path.join(temp_folder, script_name)
                if os.path.exists(temp_script_path):
                    script_file_path = temp_script_path
                    print(f"[@python-slave-runner:app] Found script in temp folder: {script_file_path}", file=sys.stderr)
                # Fall back to the original script path if temp version doesn't exist
                elif original_script_path and os.path.exists(original_script_path):
                    script_file_path = original_script_path
                    print(f"[@python-slave-runner:app] Using original script path: {script_file_path}", file=sys.stderr)
        
        if script_file_path and os.path.exists(script_file_path):
            script_file_name = os.path.basename(script_file_path)
            script_r2_path = f"{folder_name}/{script_file_name}"
            try:
                with open(script_file_path, 'rb') as f:
                    s3_client.upload_fileobj(
                        f,
                        bucket_name,
                        script_r2_path,
                        ExtraArgs={
                            'ContentType': 'text/plain',
                            'ContentDisposition': 'attachment'
                        }
                    )
                script_url = s3_client.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': bucket_name, 'Key': script_r2_path},
                    ExpiresIn=604800  # 7 days in seconds
                )
                script_info = {
                    'name': script_file_name,
                    'path': script_file_path,
                    'public_url': script_url
                }
                updated_files.append(script_info)
                print(f"[@python-slave-runner:app] Uploaded script to R2: {script_file_name}, Public URL: {script_url[:50]}...")
            except Exception as e:
                print(f"[@python-slave-runner:app] Error uploading script to R2: {script_file_name}, Error: {str(e)}")
        else:
            print(f"[@python-slave-runner:app] No script file found to upload at: {script_file_path}")

        return updated_files
    except Exception as e:
        print(f"[@python-slave-runner:app] Error in upload_files_to_r2: {str(e)}")
        return associated_files

@app.route('/execute', methods=['POST'])
def execute():
    try:
        data = request.get_json()
        print(f"DEBUG: Received payload keys: {list(data.keys())}", file=sys.stderr)
        
        script_path = data.get('script_path')
        if not script_path:
            print(f"ERROR: No script_path provided in payload", file=sys.stderr)
            return jsonify({
                "status": "error",
                "message": "No script_path provided",
                "start_time": datetime.utcnow().isoformat() + 'Z',
                "end_time": datetime.utcnow().isoformat() + 'Z',
                "duration_seconds": 0
            }), 400

        timeout = data.get('timeout', 30)
        try:
            timeout = float(timeout)
            if timeout < 1:
                timeout = 30
        except (TypeError, ValueError):
            print(f"DEBUG: Invalid timeout value, using default: 30s", file=sys.stderr)
            timeout = 30

        parameters = data.get('parameters', '')
        param_list = parameters.split() if parameters else []

        # Handle environment variables (already decrypted)
        environment_variables = data.get('environment_variables', {})
        env_vars = {}
        for key, value in environment_variables.items():
            env_vars[key] = value
            print(f"DEBUG: Using environment variable: {key}=[secret]", file=sys.stderr)
        start_time = datetime.utcnow()
        start_time_str = start_time.isoformat() + 'Z'

        # Get or create timestamp for folder naming
        created_at = data.get('created_at', start_time_str)
        temp_folder, used_timestamp = create_temp_folder_with_timestamp(created_at.replace(':', '-').replace('.', '-'))
        print(f"DEBUG: Created temporary folder for execution: {temp_folder}", file=sys.stderr)

        repo_url = data.get('repo_url')
        script_folder = data.get('script_folder', '')
        branch = data.get('branch')

        # Ensure job_id is properly set
        job_id = data.get('job_id', f"no_job_id_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}")
        print(f"DEBUG: Using job_id: {job_id}", file=sys.stderr)

        if repo_url:
            print(f"DEBUG: Processing Git repo: url={repo_url}, folder={script_folder}, branch={branch}", file=sys.stderr)
            repo_result = ensure_repo(repo_url, script_folder, branch)
            if isinstance(repo_result, dict):
                return jsonify({
                    "status": repo_result["status"],
                    "message": repo_result["message"],
                    "start_time": start_time_str,
                    "end_time": datetime.utcnow().isoformat() + 'Z',
                    "duration_seconds": (datetime.utcnow() - start_time).total_seconds()
                }), 500

            repo_path = repo_result
            full_script_path = os.path.join(repo_path, script_folder, script_path)

            venv_result = setup_venv(repo_path, script_folder)
            if isinstance(venv_result, dict):
                return jsonify({
                    "status": venv_result["status"],
                    "message": venv_result["message"],
                    "start_time": start_time_str,
                    "end_time": datetime.utcnow().isoformat() + 'Z',
                    "duration_seconds": (datetime.utcnow() - start_time).total_seconds()
                }), 500
            venv_path = venv_result
        else:
            print(f"DEBUG: Using local scripts folder: {LOCAL_SCRIPTS_PATH}", file=sys.stderr)
            
            # Fix the path resolution by handling both cases correctly
            if script_path.startswith("scripts/"):
                # If the path already includes "scripts/", strip it out
                script_name = script_path.replace("scripts/", "", 1)
                full_script_path = os.path.join(LOCAL_SCRIPTS_PATH, script_name)
            else:
                # Otherwise, just join the paths normally
                full_script_path = os.path.join(LOCAL_SCRIPTS_PATH, script_path)
            
            venv_result = setup_venv(os.path.dirname(LOCAL_SCRIPTS_PATH), os.path.basename(LOCAL_SCRIPTS_PATH))
            if isinstance(venv_result, dict):
                return jsonify({
                    "status": venv_result["status"],
                    "message": venv_result["message"],
                    "start_time": start_time_str,
                    "end_time": datetime.utcnow().isoformat() + 'Z',
                    "duration_seconds": (datetime.utcnow() - start_time).total_seconds()
                }), 500
            venv_path = venv_result

        print(f"DEBUG: Checking script path: {full_script_path}", file=sys.stderr)
        
        if not os.path.exists(full_script_path):
            print(f"ERROR: Script not found: {full_script_path}", file=sys.stderr)
            return jsonify({
                "status": "error",
                "message": f"Script not found: {full_script_path}",
                "start_time": start_time_str,
                "end_time": datetime.utcnow().isoformat() + 'Z',
                "duration_seconds": (datetime.utcnow() - start_time).total_seconds()
            }), 400

        with open(full_script_path, 'r') as f:
            script_content = f.read()

        # Copy the script file to the temp folder for uploading later
        script_file_name = os.path.basename(full_script_path)
        temp_script_path = os.path.join(temp_folder, script_file_name)
        try:
            shutil.copy2(full_script_path, temp_script_path)
            print(f"DEBUG: Copied script file to temp folder: {temp_script_path}", file=sys.stderr)
            # Set the script file path in env vars for future reference
            env_vars['SCRIPT_FILE_PATH'] = temp_script_path
        except Exception as e:
            print(f"DEBUG: Failed to copy script file to temp folder: {str(e)}", file=sys.stderr)

        # Set temporary folder as an environment variable for scripts to use if needed
        env_vars['SCRIPT_TEMP_FOLDER'] = temp_folder

        result = run_with_timeout(script_content, param_list, timeout, venv_path, env_vars)

        end_time = datetime.utcnow()
        end_time_str = end_time.isoformat() + 'Z'
        duration = (end_time - start_time).total_seconds()

        # Collect metadata about files generated in the temporary folder
        associated_files = collect_file_metadata(temp_folder)
        print(f"DEBUG: Found {len(associated_files)} associated files in temporary folder", file=sys.stderr)

        # Upload associated files to Cloudflare R2
        uploaded_files = upload_files_to_r2(job_id, created_at, associated_files, full_script_path, temp_folder)
        print(f"DEBUG: Uploaded {len(uploaded_files)} files to Cloudflare R2", file=sys.stderr)

        # Clean up temporary folder after execution
        try:
            shutil.rmtree(temp_folder)
            print(f"DEBUG: Cleaned up temporary folder: {temp_folder}", file=sys.stderr)
        except Exception as e:
            print(f"DEBUG: Failed to clean up temporary folder {temp_folder}: {str(e)}", file=sys.stderr)

        print(f"DEBUG: Script execution result: {result}", file=sys.stderr)

        return jsonify({
            "status": result["status"],
            "output": {
                "stdout": result.get("output", ""),
                "stderr": result.get("message", "") if result["status"] == "error" else ""
            },
            "start_time": start_time_str,
            "end_time": end_time_str,
            "duration_seconds": duration,
            "created_at": created_at,
            "associated_files": uploaded_files,
            "job_id": job_id
        })

    except FileNotFoundError as e:
        print(f"ERROR: FileNotFoundError: {str(e)}", file=sys.stderr)
        end_time = datetime.utcnow()
        return jsonify({
            "status": "error",
            "message": f"Script not found: {str(e)}",
            "start_time": start_time_str,
            "end_time": end_time.isoformat() + 'Z',
            "duration_seconds": (end_time - start_time).total_seconds()
        }), 400
    except Exception as e:
        print(f"ERROR: Execution error: {str(e)}", file=sys.stderr)
        end_time = datetime.utcnow()
        return jsonify({
            "status": "error",
            "message": f"Execution error: {str(e)}",
            "start_time": start_time_str,
            "end_time": end_time.isoformat() + 'Z',
            "duration_seconds": (end_time - start_time).total_seconds()
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for the Python runner service."""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat() + 'Z',
        "service": "python-slave-runner"
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)
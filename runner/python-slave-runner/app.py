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

app = Flask(__name__)

BASE_REPO_PATH = "/opt/render/project/src/repo"
LOCAL_SCRIPTS_PATH = os.path.join(os.path.dirname(__file__), "scripts")
LOCAL_VENV_PATH = "/venv-disk"

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

    def target():
        try:
            # Temporarily set environment variables for this execution
            original_env = dict(os.environ)
            if env_vars:
                for key, value in env_vars.items():
                    os.environ[key] = value

            # Write script content to a temporary file
            import tempfile
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
                print(f"DEBUG: Unrecognized arguments error detected, retrying without parameters", file=sys.stderr)
                # Retry without parameters for scripts with argparse expecting specific flags
                cmd = [os.path.join(venv_path, "bin", "python") if venv_path else "python", temp_script_path]
                print(f"DEBUG: Executing command (retry without parameters): {cmd}", file=sys.stderr)
                process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                stdout, stderr = process.communicate(timeout=timeout)

            # Clean up temporary file
            os.unlink(temp_script_path)

            # Restore original environment
            os.environ.clear()
            os.environ.update(original_env)

            result = {"status": "success" if process.returncode == 0 else "error", "output": stdout, "message": stderr}
            result_queue.put(result)
        except subprocess.TimeoutExpired:
            process.kill()
            result_queue.put({"status": "error", "message": f"Script execution timed out after {timeout} seconds"})
        except Exception as e:
            result_queue.put({"status": "error", "message": f"Execution error: {str(e)}"})

    thread = threading.Thread(target=target)
    thread.daemon = True
    thread.start()
    thread.join(timeout)

    if thread.is_alive():
        print(f"ERROR: Script execution timed out after {timeout} seconds", file=sys.stderr)
        return {"status": "error", "message": "Script execution timed out"}
    try:
        return result_queue.get_nowait()
    except queue.Empty:
        print(f"ERROR: No result returned from script execution", file=sys.stderr)
        return {"status": "error", "message": "No result returned"}

@app.route('/execute', methods=['POST'])
def execute():
    try:
        data = request.get_json()
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
            elif timeout > 3600: # Cap at 1 hour
                timeout = 3600
        except (TypeError, ValueError):
            print(f"DEBUG: Invalid timeout value, using default: 30s", file=sys.stderr)
            timeout = 30

        parameters = data.get('parameters', '')
        param_list = parameters.split() if parameters else []

        # Handle encrypted environment variables
        encrypted_env_vars = data.get('encrypted_env_vars', {})
        decrypted_env_vars = {}
        for key, encrypted_value in encrypted_env_vars.items():
            decrypted_env_vars[key] = encrypted_value
            print(f"DEBUG: Using environment variable: {key}=[secret]", file=sys.stderr)

        start_time = datetime.utcnow()
        start_time_str = start_time.isoformat() + 'Z'

        repo_url = data.get('repo_url')
        script_folder = data.get('script_folder', '')
        branch = data.get('branch')

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

        result = run_with_timeout(script_content, param_list, timeout, venv_path, decrypted_env_vars)

        end_time = datetime.utcnow()
        end_time_str = end_time.isoformat() + 'Z'
        duration = (end_time - start_time).total_seconds()

        print(f"DEBUG: Script execution result: {result}", file=sys.stderr)
        return jsonify({
            "status": result["status"],
            "output": {
                "stdout": result.get("output", ""),
                "stderr": result.get("message", "") if result["status"] == "error" else ""
            },
            "start_time": start_time_str,
            "end_time": end_time_str,
            "duration_seconds": duration
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
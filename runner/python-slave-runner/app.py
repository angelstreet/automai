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

app = Flask(__name__)

BASE_REPO_PATH = "/opt/render/project/src/repo"

def get_repo_path(repo_url):
    # Create unique path based on repo_url hash
    repo_hash = hashlib.sha1(repo_url.encode()).hexdigest()
    return os.path.join(BASE_REPO_PATH, repo_hash)

def ensure_repo(repo_url, git_folder):
    repo_path = get_repo_path(repo_url)
    try:
        if os.path.exists(repo_path):
            repo = git.Repo(repo_path)
            repo.remotes.origin.pull()
        else:
            os.makedirs(repo_path, exist_ok=True)
            repo = git.Repo.clone_from(repo_url, repo_path)
            # Enable sparse checkout
            with repo.config_writer() as cw:
                cw.set_value("core", "sparseCheckout", "true")
            sparse_file = os.path.join(repo_path, ".git", "info", "sparse-checkout")
            os.makedirs(os.path.dirname(sparse_file), exist_ok=True)
            with open(sparse_file, "w") as f:
                f.write(f"{git_folder}/\n")
            repo.git.checkout()
        return repo_path
    except Exception as e:
        return {"status": "error", "message": f"Git operation failed: {str(e)}"}

def setup_venv(repo_path, git_folder):
    requirements_path = os.path.join(repo_path, git_folder, "requirements.txt")
    venv_path = os.path.join(repo_path, ".venv")
    if os.path.exists(requirements_path):
        try:
            # Create virtual environment
            virtualenv.cli_run([venv_path])
            # Run pip install in virtual environment
            pip_path = os.path.join(venv_path, "bin", "pip")
            subprocess.run([pip_path, "install", "-r", requirements_path], check=True, capture_output=True, text=True)
            return venv_path
        except Exception as e:
            return {"status": "error", "message": f"Failed to install requirements: {str(e)}"}
    return None

def run_with_timeout(script_content, timeout=30, venv_path=None):
    result_queue = queue.Queue()

    def target():
        try:
            result = execute_script(script_content, venv_path)
            result_queue.put(result)
        except Exception as e:
            result_queue.put({"status": "error", "message": f"Execution error: {str(e)}"})

    thread = threading.Thread(target=target)
    thread.daemon = True
    thread.start()
    thread.join(timeout)

    if thread.is_alive():
        return {"status": "error", "message": "Script execution timed out"}
    try:
        return result_queue.get_nowait()
    except queue.Empty:
        return {"status": "error", "message": "No result returned"}

@app.route('/execute', methods=['POST'])
def execute():
    try:
        data = request.get_json()
        script_path = data.get('script_path')
        if not script_path:
            return jsonify({
                "status": "error",
                "message": "No script_path provided",
                "start_time": datetime.utcnow().isoformat() + 'Z',
                "end_time": datetime.utcnow().isoformat() + 'Z',
                "duration_seconds": 0
            }), 400

        # Get timeout from payload, default to 30s, cap at 60s
        timeout = data.get('timeout', 30)
        try:
            timeout = float(timeout)
            if timeout < 1:
                timeout = 30
            elif timeout > 60:
                timeout = 60
        except (TypeError, ValueError):
            timeout = 30

        start_time = datetime.utcnow()
        start_time_str = start_time.isoformat() + 'Z'

        # Check if repo_url is provided
        repo_url = data.get('repo_url')
        git_folder = data.get('git_folder', '')

        if repo_url:
            # Handle Git repository
            repo_result = ensure_repo(repo_url, git_folder)
            if isinstance(repo_result, dict):
                return jsonify({
                    "status": repo_result["status"],
                    "message": repo_result["message"],
                    "start_time": start_time_str,
                    "end_time": datetime.utcnow().isoformat() + 'Z',
                    "duration_seconds": (datetime.utcnow() - start_time).total_seconds()
                }), 500

            repo_path = repo_result
            full_script_path = os.path.join(repo_path, git_folder, script_path)

            # Setup virtual environment if requirements.txt exists
            venv_result = setup_venv(repo_path, git_folder)
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
            # Fallback to local scripts folder
            full_script_path = os.path.join("/opt/render/project/src/scripts", script_path)
            venv_path = None

        if not os.path.exists(full_script_path):
            return jsonify({
                "status": "error",
                "message": f"Script not found: {full_script_path}",
                "start_time": start_time_str,
                "end_time": datetime.utcnow().isoformat() + 'Z',
                "duration_seconds": (datetime.utcnow() - start_time).total_seconds()
            }), 400

        with open(full_script_path, 'r') as f:
            script_content = f.read()

        result = run_with_timeout(script_content, timeout, venv_path)

        end_time = datetime.utcnow()
        end_time_str = end_time.isoformat() + 'Z'
        duration = (end_time - start_time).total_seconds()

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
        end_time = datetime.utcnow()
        return jsonify({
            "status": "error",
            "message": f"Script not found: {str(e)}",
            "start_time": start_time_str,
            "end_time": end_time.isoformat() + 'Z',
            "duration_seconds": (end_time - start_time).total_seconds()
        }), 400
    except Exception as e:
        end_time = datetime.utcnow()
        return jsonify({
            "status": "error",
            "message": f"Execution error: {str(e)}",
            "start_time": start_time_str,
            "end_time": end_time.isoformat() + 'Z',
            "duration_seconds": (end_time - start_time).total_seconds()
        }), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)
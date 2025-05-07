from flask import Flask, request, jsonify
import os
import sys
from datetime import datetime
import subprocess
import json

app = Flask(__name__)

@app.route('/execute', methods=['POST'])
def execute_script():
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

    # Save script to script folder if it exists
    script_content_path = os.path.join('scripts', script_path)
    print("[--------------------------------]")
    print(f"[execute_script] Warning : if no repo base folder is << python-slave-runner/scripts >> folder -------------------------------");
    print(f"[execute_script] Script path: {script_path}", file=sys.stderr)
    print("[--------------------------------]")
    if os.path.exists(script_content_path):
        with open(script_content_path, 'r') as f:
            script_content = f.read()
        original_script_name = os.path.basename(script_path)
        with open(os.path.join(script_folder_path, original_script_name), 'w') as f:
            f.write(script_content)
        print(f"[execute_script] Saved script content to {script_folder_path}/{original_script_name}", file=sys.stderr)

    # Prepare command with parameters including iteration and trace_folder
    command = [sys.executable, script_content_path] + (parameters.split() if parameters else [])

    # Set environment variables
    script_env = os.environ.copy()
    script_env.update(env_vars)

    # Ensure we have a precise timestamp for start time
    start_time = datetime.utcnow().isoformat() + 'Z'
    status = 'success'
    stdout_data = ''
    stderr_data = ''

    try:
        print(f"[execute_script] Executing script: {script_path} for job {job_id}, script_id {script_id}", file=sys.stderr)
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

    # Ensure that end_time is different from start_time
    end_time = datetime.utcnow().isoformat() + 'Z'
    
    # Calculate duration
    try:
        duration = ((datetime.fromisoformat(end_time[:-1]) - datetime.fromisoformat(start_time[:-1])).total_seconds()).__str__()
        if float(duration) <= 0:
            # If duration is 0 or negative, set a small positive value
            duration = "0.001"
    except Exception as e:
        print(f"[execute_script] Error calculating duration: {str(e)}, using default", file=sys.stderr)
        duration = "0.001"  # Default duration if calculation fails

    # Create metadata JSON for this script execution
    metadata = {
        'job_id': job_id,
        'script_id': script_id,
        'script_name': os.path.basename(script_path),
        'script_path': script_path,
        'parameters': parameters,
        'start_time': start_time,
        'end_time': end_time,
        'status': status,
        'env': env,
        'config_name': config_name or 'Default Config',
        'duration': duration
    }
    metadata_path = os.path.join(script_folder_path, 'metadata.json')
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"[execute_script] Saved metadata to {metadata_path}", file=sys.stderr)

    return jsonify({
        'status': status,
        'stdout': stdout_data,
        'stderr': stderr_data,
        'start_time': start_time,
        'end_time': end_time,
        'duration': duration
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

    if not job_id or not created_at:
        return jsonify({'status': 'error', 'message': 'Missing job_id or created_at'}), 400

    if not upload_script_content:
        return jsonify({'status': 'error', 'message': 'Missing upload script content'}), 400

     # Debug current directory
    print(f"[initialize_job] Get current working directory", file=sys.stderr)
    try:
        current_dir = os.getcwd()
        print(f"[initialize_job] Current working directory: {current_dir}", file=sys.stderr)
    except Exception as e:
        print(f"[initialize_job] ERROR: Failed to get current working directory: {str(e)}", file=sys.stderr)
        
    # Create job folder structure
    upload_folder = os.path.join(os.getcwd(), 'uploadFolder')
    # Clean existing uploadFolder if it exists to avoid clutter
    if os.path.exists(upload_folder):
        import shutil
        shutil.rmtree(upload_folder)
        print(f"[initialize_job] Removed existing uploadFolder at {upload_folder}", file=sys.stderr)
    job_folder_name = f"{created_at.split('T')[0].replace('-', '')}_{created_at.split('T')[1].split('.')[0].replace(':', '')}_{job_id}"
    job_folder_path = os.path.join(upload_folder, job_folder_name)
    os.makedirs(job_folder_path, exist_ok=True)
    print(f"[initialize_job] Created job folder for {job_id} at {job_folder_path}", file=sys.stderr)

    # Save the upload script to the job folder
    upload_script_path = os.path.join(job_folder_path, 'upload_and_report.py')
    with open(upload_script_path, 'w') as f:
        f.write(upload_script_content)
    print(f"[initialize_job] Saved upload_and_report.py for job {job_id} to {upload_script_path}", file=sys.stderr)

    # Save requirements.txt to job folder for dependency installation
    requirements_content = "boto3\npython-dotenv\nsupabase\n"
    requirements_path = os.path.join(job_folder_path, 'requirements.txt')
    with open(requirements_path, 'w') as f:
        f.write(requirements_content)
    print(f"[initialize_job] Saved requirements.txt for job {job_id} to {requirements_path}", file=sys.stderr)

    # Install dependencies from requirements.txt
    try:
        subprocess.run([sys.executable, '-m', 'pip', 'install', '-r', requirements_path], check=True, capture_output=True, text=True, cwd=job_folder_path)
        print(f"[initialize_job] Successfully installed dependencies for job {job_id} from {requirements_path}", file=sys.stderr)
    except subprocess.CalledProcessError as e:
        print(f"[initialize_job] ERROR: Failed to install dependencies for job {job_id}: {e.stderr}", file=sys.stderr)
    except Exception as e:
        print(f"[initialize_job] ERROR: Unexpected error while installing dependencies for job {job_id}: {str(e)}", file=sys.stderr)

    # Step 1: Fetch Cloudflare R2 credentials from provided data with correct key names
    cloudflare_r2_endpoint = credentials.get('CLOUDFLARE_R2_ENDPOINT', '')
    cloudflare_r2_access_key_id = credentials.get('CLOUDFLARE_R2_ACCESS_KEY_ID', '')
    cloudflare_r2_secret_access_key = credentials.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY', '')
    print(f"[initialize_job] Fetched Cloudflare R2 credentials for job {job_id}: endpoint={cloudflare_r2_endpoint[:10]}... (partial), access_key_id={cloudflare_r2_access_key_id[:5]}... (partial), secret_access_key={cloudflare_r2_secret_access_key[:5]}... (partial)", file=sys.stderr)

    # Step 2: Fetch Supabase credentials from provided data with correct key names
    supabase_api_url = credentials.get('SUPABASE_URL', '')
    supabase_service_role_key = credentials.get('SUPABASE_SERVICE_ROLE_KEY', '')
    print(f"[initialize_job] Fetched Supabase credentials for job {job_id}: api_url={supabase_api_url[:10]}... (partial), service_role_key={supabase_service_role_key[:5]}... (partial)", file=sys.stderr)

    # Step 3: Save Cloudflare R2 and Supabase credentials to a .env file for this job
    credentials_file = os.path.join(job_folder_path, '.env')
    with open(credentials_file, 'w') as f:
        f.write(f"# Environment variables for Cloudflare R2\n")
        f.write(f"CLOUDFLARE_R2_ENDPOINT={cloudflare_r2_endpoint}\n")
        f.write(f"CLOUDFLARE_R2_ACCESS_KEY_ID={cloudflare_r2_access_key_id}\n")
        f.write(f"CLOUDFLARE_R2_SECRET_ACCESS_KEY={cloudflare_r2_secret_access_key}\n")
        f.write(f"# Environment variables for Supabase\n")
        f.write(f"SUPABASE_URL={supabase_api_url}\n")
        f.write(f"SUPABASE_SERVICE_ROLE_KEY={supabase_service_role_key}\n")
    print(f"[initialize_job] Saved Cloudflare R2 and Supabase credentials for job {job_id} to {credentials_file}", file=sys.stderr)

    try:
        with open(credentials_file, 'r') as f:
            env_content = f.read()
        print(f"[initialize_job] DEBUG: Contents of .env file readfor job {job_id}", file=sys.stderr)
    except Exception as e:
        print(f"[initialize_job] ERROR: Failed to read .env file for debugging: {str(e)}", file=sys.stderr)

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

    # Locate job folder
    upload_folder = os.path.join(os.getcwd(), 'uploadFolder')
    job_folder_name = f"{created_at.split('T')[0].replace('-', '')}_{created_at.split('T')[1].split('.')[0].replace(':', '')}_{job_id}"
    job_folder_path = os.path.join(upload_folder, job_folder_name)

    if not os.path.exists(job_folder_path):
        print(f"[finalize_job] ERROR: Job folder {job_folder_path} not found", file=sys.stderr)
        return jsonify({'status': 'error', 'message': f'Job folder for {job_id} not found'}), 404

    # Check for upload script
    upload_script_path = os.path.join(job_folder_path, 'upload_and_report.py')
    if not os.path.exists(upload_script_path):
        print(f"[finalize_job] ERROR: upload_and_report.py not found at {upload_script_path}", file=sys.stderr)
        return jsonify({'status': 'error', 'message': 'Upload script not found'}), 500

    try:
        # Ensure start_time and end_time are different
        if not start_time or start_time == 'undefined':
            # Use created_at as fallback start time
            start_time = created_at
            
        end_time = datetime.utcnow().isoformat() + 'Z'
        
        # Calculate the duration, ensuring we have valid datetimes
        try:
            duration = ((datetime.fromisoformat(end_time[:-1]) - datetime.fromisoformat(start_time[:-1])).total_seconds()).__str__()
            if float(duration) <= 0:
                # If duration is 0 or negative, set a small positive value to avoid issues
                duration = "0.001"
        except Exception as e:
            print(f"[finalize_job] Error calculating duration: {str(e)}, using default", file=sys.stderr)
            duration = "0.001"  # Default duration if calculation fails
        
        # Create job metadata JSON
        job_metadata = {
            'job_id': job_id,
            'start_time': start_time,
            'end_time': end_time,
            'config_name': config_name or 'Default Config',  # Use a default if empty
            'env': env,
            'status': overall_status,
            'duration': duration
        }
        metadata_path = os.path.join(job_folder_path, 'metadata.json')
        with open(metadata_path, 'w') as f:
            json.dump(job_metadata, f, indent=2)
        print(f"[finalize_job] Saved job metadata to {metadata_path}, {job_metadata}", file=sys.stderr)
        
        print(f"[finalize_job] Executing upload_and_report.py for job {job_id}", file=sys.stderr)
        result = subprocess.run([sys.executable, upload_script_path], capture_output=True, text=True, cwd=job_folder_path)
        print(f"[finalize_job] Result: {result.stdout}", file=sys.stderr)
        if result.returncode == 0:
            print(f"[finalize_job] Upload and report generation successful for job {job_id}", file=sys.stderr)
            try:
                output_json = json.loads(result.stdout)
                return jsonify(output_json)
            except json.JSONDecodeError:
                print(f"[finalize_job] ERROR: Failed to parse JSON output from upload_and_report.py", file=sys.stderr)
                return jsonify({'status': 'error', 'message': 'Failed to parse upload script output'}), 500
        else:
            print(f"[finalize_job] ERROR: upload_and_report.py failed with return code {result.returncode}", file=sys.stderr)
            print(f"[finalize_job] Stderr: {result.stderr}", file=sys.stderr)
            return jsonify({'status': 'error', 'message': 'Upload script execution failed', 'job_id': job_id, 'error_details': result.stderr}), 200
    except Exception as e:
        print(f"[finalize_job] ERROR: Failed to execute upload_and_report.py: {str(e)}", file=sys.stderr)
        return jsonify({'status': 'error', 'message': f'Failed to execute upload script: {str(e)}', 'job_id': job_id}), 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=10000)
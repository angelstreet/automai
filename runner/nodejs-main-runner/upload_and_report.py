#!/usr/bin/env python3

import os
import sys
import json
import subprocess
from datetime import datetime
import argparse

# Attempt to import boto3, install if not available
try:
    import boto3
    from botocore.client import Config
    BOTOCORE_AVAILABLE = True
    print(f"[@upload_and_report:main] boto3 module imported successfully.", file=sys.stderr)
except ImportError:
    BOTOCORE_AVAILABLE = False
    print(f"[@upload_and_report:main] boto3 module not found, will attempt installation.", file=sys.stderr)

def install_boto3():
    """Attempt to install boto3 using pip with user-level permissions."""
    try:
        print(f"[@upload_and_report:install_boto3] Attempting to install boto3...", file=sys.stderr)
        subprocess.run([sys.executable, '-m', 'pip', 'install', '--user', 'boto3'], check=True, capture_output=True, text=True)
        print(f"[@upload_and_report:install_boto3] boto3 installed successfully.", file=sys.stderr)
        return True
    except subprocess.CalledProcessError as e:
        print(f"[@upload_and_report:install_boto3] ERROR: Failed to install boto3: {e.stderr}", file=sys.stderr)
        return False
    except Exception as e:
        print(f"[@upload_and_report:install_boto3] ERROR: Unexpected error while installing boto3: {str(e)}", file=sys.stderr)
        return False

def create_script_report_html(script_folder, stdout_content, stderr_content, script_id, job_id, start_time, end_time, script_path, parameters, status="success"):
    """Create an HTML report for a script execution."""
    duration = "N/A"
    if start_time and end_time:
        try:
            start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
            duration = f"{(end_dt - start_dt).total_seconds():.2f}"
        except Exception as e:
            print(f"[@upload_and_report:create_script_report_html] Error calculating duration: {str(e)}", file=sys.stderr)
    
    script_name = os.path.basename(script_path) if script_path else "Unknown"
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Script Execution Report - {script_name}</title>
  <style>
    body {{ font-family: Arial, sans-serif; margin: 20px; }}
    h1 {{ color: #333; }}
    table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
    th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
    th {{ background-color: #f2f2f2; }}
    pre {{ background-color: #f9f9f9; padding: 10px; overflow-x: auto; }}
    .status-success {{ color: #22c55e; font-weight: bold; }}
    .status-failed {{ color: #ef4444; font-weight: bold; }}
  </style>
</head>
<body>
  <h1>Script Execution Report</h1>
  <table>
    <tr><th>Script ID</th><td>{script_id}</td></tr>
    <tr><th>Job ID</th><td>{job_id}</td></tr>
    <tr><th>Script Name</th><td>{script_name}</td></tr>
    <tr><th>Script Path</th><td>{script_path}</td></tr>
    <tr><th>Parameters</th><td>{parameters or "None"}</td></tr>
    <tr><th>Start Time</th><td>{start_time}</td></tr>
    <tr><th>End Time</th><td>{end_time}</td></tr>
    <tr><th>Duration (s)</th><td>{duration}</td></tr>
    <tr><th>Status</th><td class="status-{status.lower()}">{status}</td></tr>
    <tr><th>Stdout</th><td><pre>{stdout_content or "No output"}</pre></td></tr>
    <tr><th>Stderr</th><td><pre>{stderr_content or "No errors"}</pre></td></tr>
  </table>
</body>
</html>"""
    report_path = os.path.join(script_folder, 'script_report.html')
    try:
        with open(report_path, 'w') as f:
            f.write(html)
        print(f"[@upload_and_report:create_script_report_html] Created script report at {report_path}", file=sys.stderr)
        return report_path
    except Exception as e:
        print(f"[@upload_and_report:create_script_report_html] Error creating script report: {str(e)}", file=sys.stderr)
        return None

def create_job_report_html(job_folder, job_id, start_time, end_time, script_reports, status="success"):
    """Create an HTML report for the entire job run."""
    duration = "N/A"
    if start_time and end_time:
        try:
            start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
            duration = f"{(end_dt - start_dt).total_seconds():.2f}"
        except Exception as e:
            print(f"[@upload_and_report:create_job_report_html] Error calculating duration: {str(e)}", file=sys.stderr)
    
    script_summary = ""
    for script_id, script_data in script_reports.items():
        script_status = script_data.get('status', 'unknown')
        script_name = os.path.basename(script_data.get('script_path', 'Unknown'))
        script_summary += f"<tr><td>{script_id}</td><td>{script_name}</td><td class=\"status-{script_status.lower()}\">{script_status}</td></tr>"
    
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Job Run Report - {job_id}</title>
  <style>
    body {{ font-family: Arial, sans-serif; margin: 20px; }}
    h1 {{ color: #333; }}
    table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
    th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
    th {{ background-color: #f2f2f2; }}
    .status-success {{ color: #22c55e; font-weight: bold; }}
    .status-failed {{ color: #ef4444; font-weight: bold; }}
  </style>
</head>
<body>
  <h1>Job Run Report</h1>
  <table>
    <tr><th>Job ID</th><td>{job_id}</td></tr>
    <tr><th>Start Time</th><td>{start_time}</td></tr>
    <tr><th>End Time</th><td>{end_time}</td></tr>
    <tr><th>Duration (s)</th><td>{duration}</td></tr>
    <tr><th>Status</th><td class="status-{status.lower()}">{status}</td></tr>
  </table>
  <h2>Script Executions</h2>
  <table>
    <tr><th>Script ID</th><th>Script Name</th><th>Status</th></tr>
    {script_summary}
  </table>
</body>
</html>"""
    report_path = os.path.join(job_folder, 'report.html')
    try:
        with open(report_path, 'w') as f:
            f.write(html)
        print(f"[@upload_and_report:create_job_report_html] Created job report at {report_path}", file=sys.stderr)
        return report_path
    except Exception as e:
        print(f"[@upload_and_report:create_job_report_html] Error creating job report: {str(e)}", file=sys.stderr)
        return None

def main():
    # Initialize S3 client for Cloudflare R2 if boto3 is available
    s3_client = None
    global BOTOCORE_AVAILABLE
    if not BOTOCORE_AVAILABLE:
        if install_boto3():
            try:
                import boto3
                from botocore.client import Config
                BOTOCORE_AVAILABLE = True
                print(f"[@upload_and_report:main] boto3 module imported successfully after installation.", file=sys.stderr)
            except ImportError:
                BOTOCORE_AVAILABLE = False
                print(f"[@upload_and_report:main] boto3 module still not available after installation attempt.", file=sys.stderr)

    if BOTOCORE_AVAILABLE:
        try:
            r2_endpoint = os.environ.get('CLOUDFLARE_R2_ENDPOINT', '')
            r2_access_key = os.environ.get('CLOUDFLARE_R2_ACCESS_KEY_ID', '')
            r2_secret_key = os.environ.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY', '')
            if r2_endpoint and r2_access_key and r2_secret_key:
                s3_client = boto3.client(
                    's3',
                    endpoint_url=r2_endpoint,
                    aws_access_key_id=r2_access_key,
                    aws_secret_access_key=r2_secret_key,
                    config=Config(signature_version='s3v4'),
                )
                print(f"[@upload_and_report:main] Successfully initialized S3 client for Cloudflare R2.", file=sys.stderr)
            else:
                print(f"[@upload_and_report:main] ERROR: Cloudflare R2 credentials not found in environment variables.", file=sys.stderr)
                sys.exit(1)
        except Exception as e:
            print(f"[@upload_and_report:main] ERROR: Failed to initialize S3 client for Cloudflare R2: {str(e)}", file=sys.stderr)
            sys.exit(1)
    else:
        print(f"[@upload_and_report:main] ERROR: boto3 not available, cannot proceed with upload.", file=sys.stderr)
        sys.exit(1)

    # Look for uploadFolder in the current directory
    upload_folder = os.path.join(os.getcwd(), 'uploadFolder')
    if not os.path.exists(upload_folder):
        print(f"[@upload_and_report:main] ERROR: uploadFolder not found at {upload_folder}", file=sys.stderr)
        sys.exit(1)

    print(f"[@upload_and_report:main] Scanning uploadFolder at {upload_folder}", file=sys.stderr)

    # Collect job folders
    job_folders = [f for f in os.listdir(upload_folder) if os.path.isdir(os.path.join(upload_folder, f))]
    if not job_folders:
        print(f"[@upload_and_report:main] ERROR: No job folders found in uploadFolder", file=sys.stderr)
        sys.exit(1)

    if len(job_folders) > 1:
        print(f"[@upload_and_report:main] WARNING: Multiple job folders found, processing only the first one: {job_folders[0]}", file=sys.stderr)
    job_folder_name = job_folders[0]
    job_folder_path = os.path.join(upload_folder, job_folder_name)
    job_id = job_folder_name.split('_')[-1] if '_' in job_folder_name else job_folder_name

    # Extract datetime from job folder name
    job_datetime = job_folder_name.split('_')[0] + '_' + job_folder_name.split('_')[1] if '_' in job_folder_name else "unknown"
    start_time = job_datetime.replace('_', ':') + ":00.000Z" if job_datetime != "unknown" else "unknown"
    end_time = datetime.utcnow().isoformat() + 'Z'

    # Collect script folders within the job folder
    script_folders = [f for f in os.listdir(job_folder_path) if os.path.isdir(os.path.join(job_folder_path, f))]
    script_reports = {}

    print(f"[@upload_and_report:main] Processing {len(script_folders)} script folders in job folder {job_folder_name}", file=sys.stderr)

    # Process each script folder for reports
    for script_folder_name in script_folders:
        script_folder_path = os.path.join(job_folder_path, script_folder_name)
        script_id = script_folder_name.split('_')[-1] if '_' in script_folder_name else script_folder_name
        
        # Read stdout.txt and stderr.txt if they exist
        stdout_content = ""
        stderr_content = ""
        stdout_path = os.path.join(script_folder_path, 'stdout.txt')
        stderr_path = os.path.join(script_folder_path, 'stderr.txt')
        
        if os.path.exists(stdout_path):
            try:
                with open(stdout_path, 'r') as f:
                    stdout_content = f.read()
            except Exception as e:
                print(f"[@upload_and_report:main] Error reading stdout.txt for script {script_id}: {str(e)}", file=sys.stderr)
        
        if os.path.exists(stderr_path):
            try:
                with open(stderr_path, 'r') as f:
                    stderr_content = f.read()
            except Exception as e:
                print(f"[@upload_and_report:main] Error reading stderr.txt for script {script_id}: {str(e)}", file=sys.stderr)
        
        # Determine status based on content or file presence (simplified logic)
        status = "success" if stdout_content and not stderr_content else "failed" if stderr_content else "unknown"
        
        # Placeholder for script_path and parameters as they might not be available in files
        script_path = os.path.join(script_folder_path, 'script.py') if os.path.exists(os.path.join(script_folder_path, 'script.py')) else "Unknown"
        parameters = ""
        
        # Create script report
        script_report_path = create_script_report_html(
            script_folder_path, stdout_content, stderr_content, script_id, job_id, start_time, end_time, script_path, parameters, status
        )
        
        script_reports[script_id] = {
            'status': status,
            'script_path': script_path,
            'report_path': script_report_path
        }

    # Create job report
    job_status = "success" if all(sr['status'] == 'success' for sr in script_reports.values()) else "failed"
    job_report_path = create_job_report_html(job_folder_path, job_id, start_time, end_time, script_reports, job_status)

    # Collect all files to upload
    associated_files = []
    for root, _, filenames in os.walk(upload_folder):
        for filename in filenames:
            file_path = os.path.join(root, filename)
            relative_path = os.path.relpath(file_path, upload_folder)
            creation_time = os.path.getctime(file_path)
            associated_files.append({
                'name': filename,
                'path': file_path,
                'relative_path': relative_path,
                'size': os.path.getsize(file_path),
                'creation_date': datetime.fromtimestamp(creation_time).isoformat() + 'Z'
            })

    print(f"[@upload_and_report:main] Found {len(associated_files)} files to upload", file=sys.stderr)

    # Upload files to R2
    uploaded_files = []
    bucket_name = 'reports'
    try:
        for file_info in associated_files:
            file_path = file_info.get('path')
            file_name = file_info.get('name')
            relative_path = file_info.get('relative_path', file_name)
            if not os.path.exists(file_path):
                print(f"[@upload_and_report:main] File not found for upload: {file_name}", file=sys.stderr)
                uploaded_files.append(file_info)
                continue

            # Determine content type based on file extension (simplified)
            _, ext = os.path.splitext(file_name)
            content_type = {
                '.html': 'text/html',
                '.json': 'application/json',
                '.txt': 'text/plain',
                '.log': 'text/plain',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.webm': 'video/webm',
                '.py': 'text/plain'
            }.get(ext.lower(), 'application/octet-stream')

            content_disposition = 'inline' if content_type.startswith('text') or content_type.startswith('image') else 'attachment'

            r2_path = os.path.join(job_folder_name, relative_path)
            print(f"[@upload_and_report:main] Uploading file to R2: {file_name} -> {r2_path}", file=sys.stderr)

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

            presigned_url = s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': bucket_name, 'Key': r2_path},
                ExpiresIn=604800  # 7 days in seconds
            )

            file_info['public_url'] = presigned_url
            print(f"[@upload_and_report:main] Uploaded file to R2: {file_name}, URL generated", file=sys.stderr)
            uploaded_files.append(file_info)

        print(f"[@upload_and_report:main] Successfully uploaded {len(uploaded_files)} files to R2 for job: {job_id}", file=sys.stderr)
        output = {
            'status': 'success',
            'job_id': job_id,
            'uploaded_files': uploaded_files
        }
    except Exception as e:
        print(f"[@upload_and_report:main] ERROR: Failed to upload files to R2 for job {job_id}: {str(e)}", file=sys.stderr)
        output = {
            'status': 'failure',
            'job_id': job_id,
            'uploaded_files': uploaded_files,
            'error': f'Failed to upload files: {str(e)}'
        }

    # Clean up uploadFolder after upload
    try:
        import shutil
        shutil.rmtree(upload_folder)
        print(f"[@upload_and_report:main] Cleaned up uploadFolder at {upload_folder}", file=sys.stderr)
    except Exception as e:
        print(f"[@upload_and_report:main] ERROR: Failed to clean up uploadFolder: {str(e)}", file=sys.stderr)

    # Output the result as JSON
    print(json.dumps(output, indent=2))

if __name__ == '__main__':
    main() 
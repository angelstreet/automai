import os
import sys
from datetime import datetime
import io
import shutil

# Assuming s3_client is imported or passed from app.py
# This will be updated in app.py to pass the client if needed

def create_script_report_html(script_name, stdout, stderr, script_id, job_id, start_time, end_time, script_path, parameters, status="success"):
    """
    Create an HTML report for a script execution.
    
    Returns the HTML content as a string.
    """
    duration = "N/A"
    if start_time and end_time:
        try:
            start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
            duration = f"{(end_dt - start_dt).total_seconds():.2f}"
        except Exception as e:
            print(f"[@python-slave-runner:utils] Error calculating duration: {str(e)}", file=sys.stderr)
    
    # Simple HTML template for script report
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
    .preview-img {{ max-width: 100px; max-height: 100px; }}
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
  </table>
  
  <h2>Standard Output</h2>
  <pre>{stdout or "No output"}</pre>
  
  <h2>Standard Error</h2>
  <pre>{stderr or "No errors"}</pre>
  
  <h2>Associated Files</h2>
  <div id="files">
    <p>Loading associated files...</p>
    <script>
      // This will be populated with links to associated files if any are available
      document.addEventListener('DOMContentLoaded', function() {{
        const filesDiv = document.getElementById('files');
        if (window.associatedFiles && window.associatedFiles.length > 0) {{
          const table = document.createElement('table');
          table.innerHTML = `
            <tr>
              <th>File Name</th>
              <th>Size</th>
              <th>Link</th>
              <th>Preview</th>
            </tr>
          `;
          window.associatedFiles.forEach(file => {{
            const row = document.createElement('tr');
            row.innerHTML = `
              <td>${{file.name}}</td>
              <td>${{formatFileSize(file.size)}}</td>
              <td><a href="${{file.url}}" target="_blank">Link</a></td>
              <td>${{createPreview(file)}}</td>
            `;
            table.appendChild(row);
          }});
          filesDiv.innerHTML = '';
          filesDiv.appendChild(table);
        }} else {{
          filesDiv.innerHTML = '<p>No associated files uploaded.</p>';
        }}
      }});
      
      function formatFileSize(size) {{
        if (size >= 1024 * 1024) {{
          return (size / (1024 * 1024)).toFixed(2) + ' MB';
        }} else if (size >= 1024) {{
          return (size / 1024).toFixed(2) + ' KB';
        }} else {{
          return size + ' bytes';
        }}
      }}
      
      function createPreview(file) {{
        const name = file.name.toLowerCase();
        if (name.match(/\\.(jpg|jpeg|png|gif|bmp|webp)$/)) {{
          return `<a href="${{file.url}}" target="_blank"><img src="${{file.url}}" alt="Preview of ${{file.name}}" class="preview-img" /></a>`;
        }} else if (name.match(/\\.webm$/)) {{
          return `<a href="${{file.url}}" target="_blank"><video width="100" height="100" controls><source src="${{file.url.split('?')[0]}}" type="video/webm">Your browser does not support the video tag.</video></a>`;
        }} else {{
          return 'N/A';
        }}
      }}
    </script>
  </div>
</body>
</html>"""
    return html


def upload_files_to_r2(s3_client, job_id, created_at, associated_files, script_id=None):
    """
    Upload associated files to Cloudflare R2 and return a list of file info with public URLs.
    :param s3_client: The S3 client for Cloudflare R2
    :param job_id: The job ID
    :param created_at: The creation timestamp of the job
    :param associated_files: List of file info dictionaries to upload
    :param script_id: The script execution ID (optional)
    :return: List of file info dictionaries with public URLs added
    """
    print(f"[@python-slave-runner:utils] Starting file upload to R2 for job: {job_id}, script: {script_id or 'N/A'}", file=sys.stderr)
    if not s3_client:
        print(f"[@python-slave-runner:utils] WARNING: S3 client not initialized, cannot upload files to R2", file=sys.stderr)
        return associated_files

    try:
        # Format dates for folder structure
        timestamp = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        date_prefix = f"{timestamp.year}{str(timestamp.month).zfill(2)}{str(timestamp.day).zfill(2)}_{str(timestamp.hour).zfill(2)}{str(timestamp.minute).zfill(2)}"
        
        bucket_name = 'reports'
        job_id_str = str(job_id).replace(':', '_').replace('/', '_')  # Sanitize job_id for path
        
        # Create folder names with datetime_id format
        job_folder = f"{date_prefix}_{job_id_str}"
        
        # For script-specific files, use the script subfolder
        if script_id:
            script_id_str = str(script_id).replace(':', '_').replace('/', '_')  # Sanitize script_id for path
            script_folder = f"{date_prefix}_{script_id_str}"
            base_folder = f"{job_folder}/scripts/{script_folder}"
            print(f"[@python-slave-runner:utils] Using folder structure: {base_folder}", file=sys.stderr)
        else:
            base_folder = job_folder
            print(f"[@python-slave-runner:utils] Using job folder: {base_folder}", file=sys.stderr)

        updated_files = []
        
        # If this is a script execution, create an HTML report
        if script_id and len(associated_files) > 0:
            # Find the script file to extract info
            script_file = None
            for file_info in associated_files:
                if file_info.get('name', '').endswith('.py'):
                    script_file = file_info
                    break
            
            if script_file:
                # Get execution details for the report
                script_name = script_file.get('name', 'Unknown')
                script_path = script_file.get('relative_path', script_name)
                
                # Attempt to read script output from files if available
                stdout = ""
                stderr = ""
                for file_info in associated_files:
                    if file_info.get('name', '').endswith('.out') or file_info.get('name', '').endswith('_output.txt'):
                        try:
                            with open(file_info.get('path'), 'r') as f:
                                stdout = f.read()
                        except Exception as e:
                            print(f"[@python-slave-runner:utils] Error reading stdout file: {str(e)}", file=sys.stderr)
                    
                    if file_info.get('name', '').endswith('.err') or file_info.get('name', '').endswith('_error.txt'):
                        try:
                            with open(file_info.get('path'), 'r') as f:
                                stderr = f.read()
                        except Exception as e:
                            print(f"[@python-slave-runner:utils] Error reading stderr file: {str(e)}", file=sys.stderr)
                
                # Create a temporary report file
                report_html = create_script_report_html(
                    script_name=script_name,
                    stdout=stdout,
                    stderr=stderr,
                    script_id=script_id,
                    job_id=job_id,
                    start_time=created_at,
                    end_time=datetime.utcnow().isoformat() + 'Z',
                    script_path=script_path,
                    parameters=""  # We don't have this info in the files
                )
                
                # Create a temporary file
                temp_report_path = os.path.join(os.path.dirname(script_file.get('path')), 'script_report.html')
                try:
                    with open(temp_report_path, 'w') as f:
                        f.write(report_html)
                    
                    # Add the report file to the associated files
                    report_file_info = {
                        'name': 'script_report.html',
                        'path': temp_report_path,
                        'relative_path': 'script_report.html',
                        'size': os.path.getsize(temp_report_path),
                        'creation_date': datetime.utcnow().isoformat() + 'Z'
                    }
                    associated_files.append(report_file_info)
                    print(f"[@python-slave-runner:utils] Created script report HTML: {temp_report_path}", file=sys.stderr)
                except Exception as e:
                    print(f"[@python-slave-runner:utils] Error creating script report file: {str(e)}", file=sys.stderr)

        for file_info in associated_files:
            file_path = file_info.get('path')
            file_name = file_info.get('name')
            relative_path = file_info.get('relative_path', file_name)

            if not file_path or not os.path.exists(file_path):
                print(f"[@python-slave-runner:utils] File not found for upload: {file_name}", file=sys.stderr)
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
                '.bin': 'application/octet-stream',
                '.py': 'text/plain'
            }.get(ext.lower(), 'application/octet-stream')

            content_disposition = 'inline' if content_type.startswith('text') or content_type.startswith('image') else 'attachment'

            # Full path for the file in R2
            r2_path = f"{base_folder}/{relative_path}"

            print(f"[@python-slave-runner:utils] Uploading file to R2: {file_name} -> {r2_path}", file=sys.stderr)

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
            presigned_url = s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': bucket_name, 'Key': r2_path},
                ExpiresIn=604800  # 7 days in seconds
            )

            file_info['public_url'] = presigned_url
            file_info['r2_path'] = r2_path
            file_info['report_type'] = 'script' if script_id else 'job'
            print(f"[@python-slave-runner:utils] Uploaded file to R2: {file_name}, URL generated", file=sys.stderr)
            updated_files.append(file_info)

        # Generate a main report link that points to the folder
        report_link = None
        if len(updated_files) > 0:
            # First look for a report.html or script_report.html file
            for file_info in updated_files:
                name = file_info.get('name', '')
                if name == 'script_report.html' or name == 'report.html':
                    report_link = file_info.get('public_url')
                    print(f"[@python-slave-runner:utils] Found report file: {name}", file=sys.stderr)
                    break
            
            # If no report file found, look for any HTML or TXT file
            if not report_link:
                for file_info in updated_files:
                    if file_info.get('name', '').endswith('.html') or file_info.get('name', '').endswith('.txt'):
                        report_link = file_info.get('public_url')
                        break
            
            # If still no appropriate file found, just use the first file
            if not report_link and len(updated_files) > 0:
                report_link = updated_files[0].get('public_url')

        if report_link:
            # Add information about report URL
            entity_type = 'script' if script_id else 'job'
            entity_id = script_id if script_id else job_id
            print(f"[@python-slave-runner:utils] Main report URL for {entity_type} {entity_id}: {report_link}", file=sys.stderr)
            
            # Add the report URL to the first file as a special attribute
            if len(updated_files) > 0:
                updated_files[0]['main_report_url'] = report_link

        print(f"[@python-slave-runner:utils] Successfully uploaded {len(updated_files)} files to R2 for job: {job_id}, script: {script_id or 'N/A'}", file=sys.stderr)
        return updated_files
    except Exception as e:
        print(f"[@python-slave-runner:utils] ERROR: Failed to upload files to R2 for job {job_id}, script {script_id or 'N/A'}: {str(e)}", file=sys.stderr)
        return associated_files 
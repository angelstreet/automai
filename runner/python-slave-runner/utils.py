import os
import sys
from datetime import datetime
import io
import shutil
import requests

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
    th {{ background-color: #f2f2f2; cursor: pointer; }}
    th:hover {{ background-color: #ddd; }}
    pre {{ background-color: #f9f9f9; padding: 10px; overflow-x: auto; }}
    .status-success {{ color: #22c55e; font-weight: bold; }}
    .status-failed {{ color: #ef4444; font-weight: bold; }}
    .preview-img {{ max-width: 100px; max-height: 100px; }}
    #filterInput {{ width: 100%; padding: 8px; margin-bottom: 10px; box-sizing: border-box; }}
    .report-link {{ background-color: #4682b4; color: white; padding: 3px 8px; text-decoration: none; border-radius: 4px; margin-left: 8px; }}
    .report-link:hover {{ background-color: #36648b; }}
  </style>
  <script>
    function sortTable(n) {{
      let table = document.getElementById("filesTable");
      let rows, switching = true;
      let i, shouldSwitch, dir = "asc";
      let switchcount = 0;
      while (switching) {{
        switching = false;
        rows = table.rows;
        for (i = 1; i < (rows.length - 1); i++) {{
          shouldSwitch = false;
          let x = rows[i].getElementsByTagName("TD")[n];
          let y = rows[i + 1].getElementsByTagName("TD")[n];
          let xVal = x.innerHTML.toLowerCase();
          let yVal = y.innerHTML.toLowerCase();
          if (n === 2 || n === 1) {{ // Size or Timestamp column
            xVal = parseFloat(x.getAttribute('data-sort') || xVal);
            yVal = parseFloat(y.getAttribute('data-sort') || yVal);
          }} else if (n === 0) {{ // Timestamp column
            xVal = new Date(x.getAttribute('data-sort') || xVal).getTime();
            yVal = new Date(y.getAttribute('data-sort') || yVal).getTime();
          }}
          if (dir == "asc") {{
            if (xVal > yVal) {{
              shouldSwitch = true;
              break;
            }}
          }} else if (dir == "desc") {{
            if (xVal < yVal) {{
              shouldSwitch = true;
              break;
            }}
          }}
        }}
        if (shouldSwitch) {{
          rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
          switching = true;
          switchcount++;
        }} else {{
          if (switchcount == 0 && dir == "asc") {{
            dir = "desc";
            switching = true;
          }}
        }}
      }}
    }}
    function filterTable() {{
      let input = document.getElementById("filterInput").value.toLowerCase();
      let table = document.getElementById("filesTable");
      let rows = table.getElementsByTagName("TR");
      
      try {{
        let regex = new RegExp(input, 'i');
        for (let i = 1; i < rows.length; i++) {{
          let name = rows[i].getElementsByTagName("TD")[2].innerHTML.toLowerCase();
          if (regex.test(name)) {{
            rows[i].style.display = "";
          }} else {{
            rows[i].style.display = "none";
          }}
        }}
      }} catch (e) {{
        // Fallback to substring search if regex is invalid
        for (let i = 1; i < rows.length; i++) {{
          let name = rows[i].getElementsByTagName("TD")[2].innerHTML.toLowerCase();
          if (name.indexOf(input) > -1) {{
            rows[i].style.display = "";
          }} else {{
            rows[i].style.display = "none";
          }}
        }}
      }}
    }}
    window.onload = function() {{
      if (document.getElementById("filesTable")) {{
        sortTable(0); // Sort by timestamp (oldest first) by default
      }}
    }};
  </script>
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
    <tr><th>Stdout</th><td><pre>{stdout or "No output"}</pre></td></tr>
    <tr><th>Stderr</th><td><pre>{stderr or "No errors"}</pre></td></tr>
  </table>
  
  <h2>Associated Files</h2>
  <div id="filesContainer">
    <p>Associated files will be listed here when available.</p>
    <div id="files">
      <!-- This section will be populated by JavaScript with file listings -->
    </div>
  </div>

  <script>
    // Load files data if available
    document.addEventListener('DOMContentLoaded', function() {{
      if (window.filesData && window.filesData.length > 0) {{
        const filesContainer = document.getElementById('filesContainer');
        
        // Create filter input
        const filterInput = document.createElement('input');
        filterInput.type = 'text';
        filterInput.id = 'filterInput';
        filterInput.placeholder = 'Filter by filename or extension';
        filterInput.onkeyup = filterTable;
        
        // Create table
        const table = document.createElement('table');
        table.id = 'filesTable';
        
        // Add table header
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = `
          <th onclick="sortTable(0)">Creation Date</th>
          <th onclick="sortTable(1)">Size</th>
          <th onclick="sortTable(2)">File Name</th>
          <th onclick="sortTable(3)">Link</th>
          <th>Preview</th>
        `;
        table.appendChild(headerRow);
        
        // Add file rows
        window.filesData.forEach(file => {{
          const row = document.createElement('tr');
          
          // Format size
          let sizeStr;
          if (file.size >= 1024 * 1024) {{
            sizeStr = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
          }} else if (file.size >= 1024) {{
            sizeStr = (file.size / 1024).toFixed(2) + ' KB';
          }} else {{
            sizeStr = file.size + ' bytes';
          }}
          
          // Create preview based on file type
          let preview = 'N/A';
          if (file.name.match(/\\.(jpg|jpeg|png|gif|bmp|webp)$/i)) {{
            preview = `<a href="${{file.url}}" target="_blank"><img src="${{file.url}}" alt="Preview of ${{file.name}}" class="preview-img" /></a>`;
          }} else if (file.name.match(/\\.webm$/i)) {{
            preview = `<a href="${{file.url}}" target="_blank"><video width="100" height="100" controls><source src="${{file.url.split('?')[0]}}" type="video/webm">Your browser does not support the video tag.</video></a>`;
          }}
          
          row.innerHTML = `
            <td data-sort="${{file.creation_date || 'N/A'}}">${{file.creation_date || 'N/A'}}</td>
            <td data-sort="${{file.size}}">${{sizeStr}}</td>
            <td>${{file.name}}</td>
            <td><a href="${{file.url || '#'}}" target="_blank">Link</a></td>
            <td>${{preview}}</td>
          `;
          table.appendChild(row);
        }});
        
        // Update the DOM
        filesContainer.innerHTML = '';
        filesContainer.appendChild(filterInput);
        filesContainer.appendChild(table);
        
        // Sort the table by default
        sortTable(0);
      }}
    }});
  </script>
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
                    # Replace the filesData placeholder with actual file data JavaScript
                    file_data_js = []
                    for file in associated_files:
                        if file.get('name') != 'script_report.html':
                            file_data_js.append({
                                'name': file.get('name', ''),
                                'size': file.get('size', 0),
                                'creation_date': file.get('creation_date', ''),
                                'url': '#'  # Will be replaced after upload
                            })
                    
                    # Insert a script tag that defines the filesData array
                    filesdata_script = f"<script>window.filesData = {str(file_data_js).replace("'", '"')};</script>"
                    report_html = report_html.replace('</head>', f'{filesdata_script}</head>')
                    
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
        
        # If this is a script execution, find the script report
        script_report_file = None
        if script_id:
            for file_info in updated_files:
                if file_info.get('name') == 'script_report.html':
                    report_link = file_info.get('public_url')
                    script_report_file = file_info
                    print(f"[@python-slave-runner:utils] Found script report file", file=sys.stderr)
                    break
        
        # If no script report found (or not a script execution), look for other reports
        if not report_link:
            for file_info in updated_files:
                name = file_info.get('name', '')
                if name == 'report.html':
                    report_link = file_info.get('public_url')
                    print(f"[@python-slave-runner:utils] Found job report file", file=sys.stderr)
                    break
            
            # If still no report found, look for any HTML or TXT file
            if not report_link:
                for file_info in updated_files:
                    if file_info.get('name', '').endswith('.html') or file_info.get('name', '').endswith('.txt'):
                        report_link = file_info.get('public_url')
                        break
            
            # If still no appropriate file found, just use the first file
            if not report_link and len(updated_files) > 0:
                report_link = updated_files[0].get('public_url')

        # If we have a script report, update its file URLs
        if script_id and script_report_file:
            try:
                # Download the HTML content
                response = requests.get(script_report_file.get('public_url'))
                if response.status_code == 200:
                    html_content = response.text
                    
                    # Create updated file data with correct URLs
                    file_data_js = []
                    for file in updated_files:
                        if file.get('name') != 'script_report.html':
                            file_data_js.append({
                                'name': file.get('name', ''),
                                'size': file.get('size', 0),
                                'creation_date': file.get('creation_date', ''),
                                'url': file.get('public_url', '#')
                            })
                    
                    # Update the window.filesData array
                    filesdata_script = f"<script>window.filesData = {str(file_data_js).replace('"', '\\"').replace("'", '"')};</script>"
                    updated_html = html_content.replace('window.filesData = [];', f'window.filesData = {str(file_data_js).replace("'", '"')};')
                    updated_html = html_content.replace('</head>', f'{filesdata_script}</head>')
                    
                    # Write the updated HTML to a temporary file
                    temp_updated_path = os.path.join(os.path.dirname(temp_folder), 'updated_script_report.html')
                    with open(temp_updated_path, 'w') as f:
                        f.write(updated_html)
                    
                    # Re-upload the updated HTML
                    r2_path = script_report_file.get('r2_path')
                    with open(temp_updated_path, 'rb') as f:
                        s3_client.upload_fileobj(
                            f,
                            bucket_name,
                            r2_path,
                            ExtraArgs={
                                'ContentType': 'text/html',
                                'ContentDisposition': 'inline'
                            }
                        )
                    
                    print(f"[@python-slave-runner:utils] Updated script report with file URLs: {r2_path}", file=sys.stderr)
                    
                    # Clean up
                    os.remove(temp_updated_path)
            except Exception as e:
                print(f"[@python-slave-runner:utils] Error updating script report with file URLs: {str(e)}", file=sys.stderr)

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
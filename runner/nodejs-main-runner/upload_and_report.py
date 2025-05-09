#!/usr/bin/env python3

import os
import sys
import json
import subprocess
from datetime import datetime, timezone
import argparse

# Import required libraries directly as they are installed via requirements.txt
import boto3
from botocore.client import Config
from dotenv import load_dotenv
# Add Supabase client library
import supabase

print(f"[@upload_and_report:main] boto3, dotenv, and supabase modules imported successfully.", file=sys.stderr)

def build_script_report_html_content(script_name, script_id, job_id, script_path, parameters, start_time, end_time, duration, status, stdout_content, stderr_content, associated_files=None):
    """Build HTML content for script execution report."""
    # Format start_time and end_time to YYYY-MM-DD_HH:MM:SS
    try:
        formatted_start_time = datetime.fromisoformat(start_time.replace('Z', '+00:00')).strftime('%Y-%m-%d_%H:%M:%S') if start_time and start_time != "unknown" else "N/A"
    except Exception as e:
        print(f"[@upload_and_report:build_script_report_html_content] Error formatting start_time: {str(e)}", file=sys.stderr)
        formatted_start_time = start_time if start_time else "N/A"
    try:
        formatted_end_time = datetime.fromisoformat(end_time.replace('Z', '+00:00')).strftime('%Y-%m-%d_%H:%M:%S') if end_time else "N/A"
    except Exception as e:
        print(f"[@upload_and_report:build_script_report_html_content] Error formatting end_time: {str(e)}", file=sys.stderr)
        formatted_end_time = end_time if end_time else "N/A"
        
    # Build associated files table
    associated_files_html = ""
    if associated_files:
        # Filter files to exclude stdout.txt, stderr.txt, and script_report.html
        excluded_filenames = {'stdout.txt', 'stderr.txt', 'script_report.html', 'metadata.json'}
        script_files = [file for file in associated_files 
                        if script_id in file.get('relative_path', '') 
                        and file.get('name') not in excluded_filenames]
        
        if script_files:
            associated_files_html = """
            <h2>Associated Files</h2>
            <div style="margin-bottom: 10px;">
                <input type="text" id="fileSearch" placeholder="Search files (use /regex/ for regex)..." style="width: 100%; padding: 5px;">
            </div>
            <table id="filesTable">
                <tr><th>#</th><th>Date</th><th>Filename</th><th>Size</th><th>Download</th><th>Preview</th></tr>
            """
            for idx, file in enumerate(script_files, 1):
                file_name = file.get('name', 'Unknown')
                file_size = f"{file.get('size', 0) / 1024:.2f} KB" if 'size' in file else "N/A"
                file_url = file.get('public_url', '')
                file_date = file.get('creation_date', '')
                # Format the date if it exists
                formatted_date = "N/A"
                if file_date:
                    try:
                        date_obj = datetime.fromisoformat(file_date.replace('Z', '+00:00'))
                        formatted_date = date_obj.strftime('%Y-%m-%d %H:%M:%S')
                    except Exception:
                        formatted_date = file_date
                download_link = f"<a href='{file_url}' target='_blank'>Download</a>" if file_url else "Not Available"
                # Check if file is an image or text for preview
                image_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.webp'}
                text_extensions = {'.json', '.trace', '.txt'}
                _, ext = os.path.splitext(file_name.lower())
                preview = ""
                if ext in image_extensions and file_url:
                    preview = f"<a href='{file_url}' target='_blank'><img src='{file_url}' style='max-width: 100px; max-height: 100px;' alt='Preview'></a>"
                elif ext in text_extensions and file_url:
                    preview = f"<a href='{file_url}' target='_blank'>View Content</a>"
                else:
                    preview = "N/A"
                associated_files_html += f"    <tr><td>{idx}</td><td data-sort='{file_date}'>{formatted_date}</td><td>{file_name}</td><td>{file_size}</td><td>{download_link}</td><td>{preview}</td></tr>\n"
            associated_files_html += "  </table>"
            associated_files_html += """
  <script>
    function filterTable() {
      var input = document.getElementById('fileSearch');
      var filter = input.value;
      var table = document.getElementById('filesTable');
      var tr = table.getElementsByTagName('tr');
      var isRegex = filter.startsWith('/') && filter.endsWith('/');
      var regex = null;
      if (isRegex) {
        try {
          filter = filter.slice(1, -1);
          regex = new RegExp(filter);
        } catch (e) {
          console.error('Invalid regex: ' + e.message);
          return;
        }
      }
      for (var i = 1; i < tr.length; i++) {
        var td = tr[i].getElementsByTagName('td')[2]; // Filename column (index 2 now with date added)
        if (td) {
          var txtValue = td.textContent || td.innerText;
          if (isRegex) {
            tr[i].style.display = regex.test(txtValue) ? '' : 'none';
          } else {
            tr[i].style.display = txtValue.toUpperCase().indexOf(filter.toUpperCase()) > -1 ? '' : 'none';
          }
        }
      }
    }
    
    function clearSearch() {
      var input = document.getElementById('fileSearch');
      input.value = '';
      filterTable();
    }
    
    // Add table sorting functionality
    function sortTable(n) {
      var table, rows, switching, i, x, y, shouldSwitch, dir, switchcount = 0;
      table = document.getElementById("filesTable");
      switching = true;
      // Set the sorting direction to ascending:
      dir = "asc";
      /* Make a loop that will continue until
      no switching has been done: */
      while (switching) {
        // Start by saying: no switching is done:
        switching = false;
        rows = table.rows;
        /* Loop through all table rows (except the
        first, which contains table headers): */
        for (i = 1; i < (rows.length - 1); i++) {
          // Start by saying there should be no switching:
          shouldSwitch = false;
          /* Get the two elements you want to compare,
          one from current row and one from the next: */
          x = rows[i].getElementsByTagName("TD")[n];
          y = rows[i + 1].getElementsByTagName("TD")[n];
          
          // Check if the column has a data-sort attribute (for dates)
          if (n === 1) { // Date column
            x = rows[i].getElementsByTagName("TD")[n].getAttribute("data-sort") || "";
            y = rows[i + 1].getElementsByTagName("TD")[n].getAttribute("data-sort") || "";
          } else {
            x = x.innerHTML.toLowerCase();
            y = y.innerHTML.toLowerCase();
          }
          
          /* Check if the two rows should switch place,
          based on the direction, asc or desc: */
          if (dir == "asc") {
            if (x > y) {
              // If so, mark as a switch and break the loop:
              shouldSwitch = true;
              break;
            }
          } else if (dir == "desc") {
            if (x < y) {
              // If so, mark as a switch and break the loop:
              shouldSwitch = true;
              break;
            }
          }
        }
        if (shouldSwitch) {
          /* If a switch has been marked, make the switch
          and mark that a switch has been done: */
          rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
          switching = true;
          // Each time a switch is done, increase this count by 1:
          switchcount ++;
        } else {
          /* If no switching has been done AND the direction is "asc",
          set the direction to "desc" and run the while loop again. */
          if (switchcount == 0 && dir == "asc") {
            dir = "desc";
            switching = true;
          }
        }
      }
    }
    
    // Add click event listeners to table headers for sorting
    document.addEventListener('DOMContentLoaded', function() {
      var headers = document.getElementById('filesTable').getElementsByTagName('th');
      for (var i = 0; i < headers.length; i++) {
        if (i !== 4 && i !== 5) { // Skip Download and Preview columns
          headers[i].style.cursor = 'pointer';
          headers[i].addEventListener('click', function() {
            var index = Array.from(this.parentNode.children).indexOf(this);
            sortTable(index);
          });
          headers[i].innerHTML += ' ↕️';
        }
      }
    });
    
    document.getElementById('fileSearch').addEventListener('keyup', filterTable);
  </script>
  <style>
    #filesTable th {
      cursor: pointer;
      position: relative;
    }
    #filesTable th:hover {
      background-color: #d4d4d4;
    }
    body.dark-theme #filesTable th:hover {
      background-color: #555;
    }
  </style>
"""
        elif script_id in str(associated_files):
            # If we filtered out all files but there were some associated with this script
            associated_files_html = """
  <h2>Associated Files</h2>
  <p>All associated files are shown in the report content above.</p>
"""
    
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Script Execution Report - {script_name}</title>
  <style>
    body {{ font-family: Arial, sans-serif; margin: 20px; transition: background-color 0.3s, color 0.3s; }}
    body.light-theme {{ background-color: #ffffff; color: #333333; }}
    body.dark-theme {{ background-color: #333333; color: #ffffff; }}
    h1, h2 {{ color: inherit; }}
    table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
    th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
    body.light-theme th {{ background-color: #f2f2f2; }}
    body.dark-theme th {{ background-color: #444444; }}
    pre {{ background-color: #f9f9f9; padding: 10px; overflow-x: auto; }}
    body.dark-theme pre {{ background-color: #444444; }}
    .status-success {{ color: #22c55e; font-weight: bold; }}
    .status-failed {{ color: #ef4444; font-weight: bold; }}
    a {{ color: #007BFF; text-decoration: none; }}
    body.dark-theme a {{ color: #4da6ff; }}
    a:hover {{ text-decoration: underline; }}
    .theme-toggle {{ position: fixed; top: 20px; right: 20px; cursor: pointer; padding: 10px; background-color: #ccc; border: none; border-radius: 5px; }}
    body.dark-theme .theme-toggle {{ background-color: #555; color: #fff; }}
  </style>
</head>
<body class="light-theme">
  <button class="theme-toggle" onclick="toggleTheme()">Toggle Theme</button>
  <h1>Script Execution Report</h1>
  <table>
    <tr><th>Script ID</th><td>{script_id}</td></tr>
    <tr><th>Job ID</th><td>{job_id}</td></tr>
    <tr><th>Script Name</th><td>{script_name}</td></tr>
    <tr><th>Script Path</th><td>{script_path}</td></tr>
    <tr><th>Parameters</th><td>{parameters or "None"}</td></tr>
    <tr><th>Start Time</th><td>{formatted_start_time}</td></tr>
    <tr><th>End Time</th><td>{formatted_end_time}</td></tr>
    <tr><th>Duration (s)</th><td>{duration}</td></tr>
    <tr><th>Status</th><td class="status-{status.lower()}">{status}</td></tr>
    <tr><th>Stdout</th><td><pre>{stdout_content or "No output"}</pre></td></tr>
    <tr><th>Stderr</th><td><pre>{stderr_content or "No errors"}</pre></td></tr>
  </table>
  {associated_files_html}
  <script>
    function toggleTheme() {{
      document.body.classList.toggle('light-theme');
      document.body.classList.toggle('dark-theme');
      localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
    }}
    
    // Check for saved theme preference
    window.onload = function() {{
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark') {{
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
      }}
    }};
  </script>
</body>
</html>"""

def create_script_report_html(script_folder, stdout_content, stderr_content, script_id, job_id, start_time, end_time, script_path, parameters, status="success", associated_files=None):
    """Create an HTML report for a script execution."""
    duration = "N/A"
    if start_time and end_time:
        try:
            start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
            duration = f"{(end_dt - start_dt).total_seconds():.2f}"
        except Exception as e:
            print(f"[@upload_and_report:create_script_report_html] Error calculating duration: {str(e)}", file=sys.stderr)
    
    # Read script metadata if available
    metadata_path = os.path.join(script_folder, 'metadata.json')
    script_name = os.path.basename(script_path) if script_path and script_path != "Unknown" else ""
    if os.path.exists(metadata_path):
        try:
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
            script_name = metadata.get('script_name', script_name)
            script_path_display = metadata.get('script_path', script_path if script_path and script_path != "Unknown" else "Unknown")
            parameters = metadata.get('parameters', parameters)
            start_time = metadata.get('start_time', start_time)
            end_time = metadata.get('end_time', end_time)
            status = metadata.get('status', status)
            duration = metadata.get('duration', duration)
        except Exception as e:
            print(f"[@upload_and_report:create_script_report_html] Error reading script metadata: {str(e)}", file=sys.stderr)
    else:
        script_path_display = script_path if script_path and script_path != "Unknown" else "Unknown"
        if not script_name:
            script_name = next((f for f in os.listdir(script_folder) if f.endswith('.py')), f"Script_{script_id}")
    
    html_content = build_script_report_html_content(script_name, script_id, job_id, script_path_display, parameters, start_time, end_time, duration, status, stdout_content, stderr_content, associated_files)
    report_path = os.path.join(script_folder, 'script_report.html')
    try:
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        print(f"[@upload_and_report:create_script_report_html] Created script report at {report_path}", file=sys.stderr)
        return report_path
    except Exception as e:
        print(f"[@upload_and_report:create_script_report_html] Error creating script report: {str(e)}", file=sys.stderr)
        return None

def build_job_report_html_content(job_id, start_time, end_time, duration, status, script_summary, total_scripts, config_name=''):
    """Build HTML content for job run report."""
    # Format start_time and end_time to YYYY-MM-DD_HH:MM:SS
    try:
        formatted_start_time = datetime.fromisoformat(start_time.replace('Z', '+00:00')).strftime('%Y-%m-%d_%H:%M:%S') if start_time and start_time != "unknown" else "N/A"
    except Exception as e:
        print(f"[@upload_and_report:build_job_report_html_content] Error formatting start_time: {str(e)}", file=sys.stderr)
        formatted_start_time = start_time if start_time else "N/A"
    try:
        formatted_end_time = datetime.fromisoformat(end_time.replace('Z', '+00:00')).strftime('%Y-%m-%d_%H:%M:%S') if end_time else "N/A"
    except Exception as e:
        print(f"[@upload_and_report:build_job_report_html_content] Error formatting end_time: {str(e)}", file=sys.stderr)
        formatted_end_time = end_time if end_time else "N/A"
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Job Run Report - {job_id}</title>
  <style>
    body {{ font-family: Arial, sans-serif; margin: 20px; transition: background-color 0.3s, color 0.3s; }}
    body.light-theme {{ background-color: #ffffff; color: #333333; }}
    body.dark-theme {{ background-color: #333333; color: #ffffff; }}
    h1 {{ color: inherit; }}
    table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
    th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
    body.light-theme th {{ background-color: #f2f2f2; }}
    body.dark-theme th {{ background-color: #444444; }}
    .status-success {{ color: #22c55e; font-weight: bold; }}
    .status-failed {{ color: #ef4444; font-weight: bold; }}
    a {{ color: #007BFF; text-decoration: none; }}
    body.dark-theme a {{ color: #4da6ff; }}
    a:hover {{ text-decoration: underline; }}
    .theme-toggle {{ position: fixed; top: 20px; right: 20px; cursor: pointer; padding: 10px; background-color: #ccc; border: none; border-radius: 5px; }}
    body.dark-theme .theme-toggle {{ background-color: #555; color: #fff; }}
  </style>
</head>
<body class="light-theme">
  <button class="theme-toggle" onclick="toggleTheme()">Toggle Theme</button>
  <h1>Job Run Report</h1>
  <table>
    <tr><th>Job ID</th><td>{job_id}</td></tr>
    <tr><th>Configuration Name</th><td>{config_name if config_name else 'N/A'}</td></tr>
    <tr><th>Start Time</th><td>{formatted_start_time}</td></tr>
    <tr><th>End Time</th><td>{formatted_end_time}</td></tr>
    <tr><th>Duration (s)</th><td>{duration}</td></tr>
    <tr><th>Status</th><td class="status-{status.lower()}">{status}</td></tr>
    <tr><th>Total Scripts Executed</th><td>{total_scripts}</td></tr>
  </table>
  <h2>Script Executions</h2>
  <table>
    <tr><th>#</th><th>Script ID</th><th>Script Name</th><th>Date_Time</th><th>Status</th><th>Report Link</th></tr>
    {script_summary}
  </table>
  <script>
    function toggleTheme() {{
      document.body.classList.toggle('light-theme');
      document.body.classList.toggle('dark-theme');
      localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
    }}
    
    // Check for saved theme preference
    window.onload = function() {{
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark') {{
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
      }}
    }};
  </script>
</body>
</html>"""

def create_job_report_html(job_folder, job_id, start_time, end_time, script_reports, status="success", uploaded_files=None, config_name=''):
    """Create an HTML report for the entire job run."""
    duration = "N/A"
    if start_time and end_time:
        try:
            start_dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
            end_dt = datetime.fromisoformat(end_time.replace('Z', '+00:00'))
            duration = f"{(end_dt - start_dt).total_seconds():.2f}"
        except Exception as e:
            print(f"[@upload_and_report:create_job_report_html] Error calculating duration: {str(e)}", file=sys.stderr)
    
    # Read job metadata if available
    metadata_path = os.path.join(job_folder, 'metadata.json')
    if os.path.exists(metadata_path):
        try:
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
            job_id = metadata.get('job_id', job_id)
            start_time = metadata.get('start_time', start_time)
            end_time = metadata.get('end_time', end_time)
            config_name = metadata.get('config_name', config_name)
            status = metadata.get('status', status)
            duration = metadata.get('duration', duration)
        except Exception as e:
            print(f"[@upload_and_report:create_job_report_html] Error reading job metadata: {str(e)}", file=sys.stderr)
    
    script_summary = ""
    order = 1
    for script_id, script_data in script_reports.items():
        script_status = script_data.get('status', 'unknown')
        script_name = os.path.basename(script_data.get('script_path', 'Unknown')) if script_data.get('script_path') != 'Unknown' else f"Script_{script_id}"
        report_url = ""
        if uploaded_files is not None:
            report_url = next((file['public_url'] for file in uploaded_files if file['name'] == 'script_report.html' and script_id in file['relative_path']), '')
        report_link = f"<a href='{report_url}' target='_blank'>View Report</a>" if report_url else "Not Available"
        script_start_time = script_data.get('start_time', start_time)
        date_time = datetime.fromisoformat(script_start_time.replace('Z', '+00:00')).strftime('%Y-%m-%d_%H:%M:%S') if script_start_time and script_start_time != 'unknown' else "N/A"  # Format date_time
        script_summary += f"<tr><td>{order}</td><td>{script_id}</td><td>{script_name}</td><td>{date_time}</td><td class=\"status-{script_status.lower()}\">{script_status}</td><td>{report_link}</td></tr>"
        order += 1
    
    total_scripts = len(script_reports)
    html_content = build_job_report_html_content(job_id, start_time, end_time, duration, status, script_summary, total_scripts, config_name)
    report_path = os.path.join(job_folder, 'report.html')
    try:
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        print(f"[@upload_and_report:create_job_report_html] Created job report at {report_path}", file=sys.stderr)
        return report_path
    except Exception as e:
        print(f"[@upload_and_report:create_job_report_html] Error creating job report: {str(e)}", file=sys.stderr)
        return None

def get_content_type(file_extension):
    """Determine the content type based on file extension."""
    content_types = {
        '.html': 'text/html',
        '.json': 'application/json',
        '.txt': 'text/plain',
        '.log': 'text/plain',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.bmp': 'image/bmp',
        '.webp': 'image/webp',
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.ppt': 'application/vnd.ms-powerpoint',
        '.pptx': 'application/vnd.openxmlformats-officedocumen t.powerpointml.presentation',
        '.webm': 'video/webm',
        '.mp4': 'video/mp4',
        '.avi': 'video/x-msvideo',
        '.mov': 'video/quicktime',
        '.py': 'text/plain',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.xml': 'application/xml',
        '.zip': 'application/zip',
        '.rar': 'application/x-rar-compressed',
        '.7z': 'application/x-7z-compressed'
    }
    return content_types.get(file_extension.lower(), 'application/octet-stream')

def cleanup_folder(folder_path):
    """Clean up the specified folder by removing it and its contents."""
    try:
        import shutil
        shutil.rmtree(folder_path)
        print(f"[@upload_and_report:cleanup_folder] Cleaned up folder at {folder_path}", file=sys.stderr)
        return True
    except Exception as e:
        print(f"[@upload_and_report:cleanup_folder] ERROR: Failed to clean up folder at {folder_path}: {str(e)}", file=sys.stderr)
        return False

def update_supabase_job_status(job_id, status, output, completed_at, report_url):
    """Update job status in Supabase."""
    try:
        supabase_client = supabase.create_client(
            os.environ.get('SUPABASE_URL', ''),
            os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
        )
        response = supabase_client.from_('jobs_run').update({
            'status': status,
            'output': output,
            'completed_at': completed_at,
            'report_url': report_url
        }).eq('id', job_id).execute()
        if response.data:
            print(f"[@upload_and_report:update_supabase_job_status] Successfully updated job {job_id} status to {status}", file=sys.stderr)
            return True
        else:
            print(f"[@upload_and_report:update_supabase_job_status] Failed to update job {job_id} status: {response.error}", file=sys.stderr)
            return False
    except Exception as e:
        print(f"[@upload_and_report:update_supabase_job_status] ERROR: Failed to update job {job_id} status: {str(e)}", file=sys.stderr)
        return False

def update_supabase_script_execution(script_id, status, output, completed_at, report_url):
    """Update script execution status in Supabase."""
    try:
        supabase_client = supabase.create_client(
            os.environ.get('SUPABASE_URL', ''),
            os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
        )
        response = supabase_client.from_('scripts_run').update({
            'status': status,
            'output': output,
            'completed_at': completed_at,
            'report_url': report_url
        }).eq('id', script_id).execute()
        if response.data:
            print(f"[@upload_and_report:update_supabase_script_execution] Successfully updated script execution {script_id} status to {status}", file=sys.stderr)
            return True
        else:
            print(f"[@upload_and_report:update_supabase_script_execution] Failed to update script execution {script_id} status: {response.error}", file=sys.stderr)
            return False
    except Exception as e:
        print(f"[@upload_and_report:update_supabase_script_execution] ERROR: Failed to update script execution {script_id} status: {str(e)}", file=sys.stderr)
        return False

def main():
    # Always use the current working directory as the job folder
    job_folder_path = os.getcwd()
    job_id = os.path.basename(job_folder_path)  # Extract job_id from folder name as fallback
    env_file_path = os.path.join(job_folder_path, '.env')
    if os.path.exists(env_file_path):
        load_dotenv(dotenv_path=env_file_path)
        print(f"[@upload_and_report:main] Loaded environment variables from {env_file_path}.", file=sys.stderr)
    else:
        print(f"[@upload_and_report:main] ERROR: .env file not found at {env_file_path}.", file=sys.stderr)
        output = {'status': 'failure', 'job_id': job_id, 'error': '.env file not found'}
        print(json.dumps(output, indent=2))
        sys.exit(1)

    # Initialize S3 client for Cloudflare R2
    s3_client = None
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
            print(f"[@upload_and_report:main] ERROR: Cloudflare R2 credentials not found in environment variables.", file=sys)
            output = {'status': 'failure', 'job_id': os.path.basename(job_folder_path), 'error': 'Cloudflare R2 credentials not found'}
            print(json.dumps(output, indent=2))
            sys.exit(1)
    except Exception as e:
        print(f"[@upload_and_report:main] ERROR: Failed to initialize S3 client for Cloudflare R2: {str(e)}", file=sys.stderr)
        output = {'status': 'failure', 'job_id': os.path.basename(job_folder_path), 'error': f'Failed to initialize S3 client: {str(e)}'}
        print(json.dumps(output, indent=2))
        sys.exit(1)

    # Check for Supabase credentials
    supabase_url = os.environ.get('SUPABASE_URL', '')
    supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
    if not supabase_url or not supabase_key:
        print(f"[@upload_and_report:main] ERROR: Supabase credentials not found in environment variables.", file=sys.stderr)
        output = {'status': 'failure', 'job_id': os.path.basename(job_folder_path), 'error': 'Supabase credentials not found'}
        print(json.dumps(output, indent=2))
        sys.exit(1)
    else:
        print(f"[@upload_and_report:main] Supabase credentials loaded successfully.", file=sys.stderr)

    print(f"[@upload_and_report:main] Scanning job folder at {job_folder_path}", file=sys.stderr)

    # Collect script folders within the job folder
    script_folders = [f for f in os.listdir(job_folder_path) if os.path.isdir(os.path.join(job_folder_path, f))]
    script_reports = {}

    print(f"[@upload_and_report:main] Processing {len(script_folders)} script folders in job folder {os.path.basename(job_folder_path)}", file=sys.stderr)

    # Process each script folder for reports
    for script_folder_name in script_folders:
        script_folder_path = os.path.join(job_folder_path, script_folder_name)
        metadata_path = os.path.join(script_folder_path, 'metadata.json')
        if os.path.exists(metadata_path):
            try:
                with open(metadata_path, 'r') as f:
                    metadata = json.load(f)
                script_id = metadata.get('script_id',"")
                script_name = metadata.get('script_name',"")
                script_path = metadata.get('script_path',"")
                parameters = metadata.get('parameters',"")
                start_time = metadata.get('start_time',"")
                end_time = metadata.get('end_time',"")
                status = metadata.get('status', "")
                config_name = metadata.get('config_name',"")
                print(f"[@upload_and_report:main] Read script metadata for {script_id} from {metadata_path}", file=sys.stderr)
            except Exception as e:
                print(f"[@upload_and_report:main] Error reading script metadata for {script_folder_name}: {str(e)}", file=sys.stderr)
        else:
            print(f"[@upload_and_report:main] Metadata file not found for script folder {script_folder_name}", file=sys.stderr)

        # Copy script file to upload folder if it exists
        if script_path and os.path.exists(script_path):
            try:
                import shutil
                script_filename = os.path.basename(script_path)
                destination_path = os.path.join(script_folder_path, script_filename)
                shutil.copy2(script_path, destination_path)
                print(f"[@upload_and_report:main] Copied script file from {script_path} to {destination_path} for script {script_id}", file=sys.stderr)
            except Exception as e:
                print(f"[@upload_and_report:main] Error copying script file from {script_path} for script {script_id}: {str(e)}", file=sys.stderr)
        else:
            print(f"[@upload_and_report:main] Script file not found at {script_path} for script {script_id}", file=sys.stderr)

        # Read stdout.txt and stderr.txt if they exist
        stdout_content = ""
        stderr_content = ""
        stdout_path = os.path.join(script_folder_path, 'stdout.txt')
        stderr_path = os.path.join(script_folder_path, 'stderr.txt')
        if os.path.exists(stdout_path):
            with open(stdout_path, 'r') as f:
                stdout_content = f.read()
        if os.path.exists(stderr_path):
            with open(stderr_path, 'r') as f:
                stderr_content = f.read()

        # Create script report
        script_report_path = create_script_report_html(
            script_folder_path, stdout_content, stderr_content, script_id, job_id, start_time, end_time, script_path, parameters, status
        )
        script_reports[script_id] = {
            'status': status,
            'script_path': script_path,
            'report_path': script_report_path
        }
        # Update script execution status in Supabase
        script_output = {
            'stdout': stdout_content,
            'stderr': stderr_content,
            'exitCode': 0 if status == 'success' else 1
        }
        script_report_url = ""  # This will be updated after file upload
        update_supabase_script_execution(script_id, status, script_output, end_time, script_report_url)
    
    # Initialize start_time and end_time if not set yet (if no script folders were processed)
    if 'start_time' not in locals():
        start_time = datetime.now(timezone.utc).isoformat()
    if 'end_time' not in locals():
        end_time = datetime.now(timezone.utc).isoformat()
    if 'config_name' not in locals():
        config_name = ""
    
    # Create job report (initially without URLs, will update after upload)
    job_status = "success" if all(sr['status'] == 'success' for sr in script_reports.values()) else "failed"
    job_report_path = create_job_report_html(job_folder_path, job_id, start_time, end_time, script_reports, job_status, None, config_name=config_name)

    # Collect all files to upload
    associated_files = []
    excluded_files = {'.env', 'requirements.txt', 'upload_and_report.py'}
    for root, _, filenames in os.walk(job_folder_path):
        for filename in filenames:
            if filename in excluded_files:
                print(f"[@upload_and_report:main] Excluding sensitive file from upload: {filename}", file=sys.stderr)
                continue
            file_path = os.path.join(root, filename)
            relative_path = os.path.relpath(file_path, job_folder_path)
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

            # Determine content type based on file extension
            _, ext = os.path.splitext(file_name)
            content_type = get_content_type(ext)

            content_disposition = 'inline' if content_type.startswith('text') or content_type.startswith('image') else 'attachment'

            # Correct the path to avoid duplication of job folder name
            r2_path = relative_path
            
            # Only print upload progress for report files and .trace files
            should_print = file_name in ['report.html', 'script_report.html'] or ext.lower() == '.trace'
            if should_print:
                print(f"[@upload_and_report:main] Uploading file to R2: {file_name} -> {r2_path}", file=sys.stderr)

            # Check if the file is likely a script file (based on extension or name)
            if ext.lower() in ['.py', '.sh'] and should_print:
                print(f"[@upload_and_report:main] Detected script file for upload: {file_name}", file=sys.stderr)

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
            if should_print:
                print(f"[@upload_and_report:main] Uploaded file to R2: {file_name}, URL generated", file=sys.stderr)
            uploaded_files.append(file_info)

        print(f"[@upload_and_report:main] Successfully uploaded {len(uploaded_files)} files to R2 for job: {os.path.basename(job_folder_path)}", file=sys.stderr)
        output = {
            'status': 'success',
            'job_id': job_id,
            'uploaded_files': uploaded_files,
            'report_url': updated_job_report_url if 'updated_job_report_url' in locals() else job_report_url if 'job_report_url' in locals() else ''
        }

        # Update report URLs for job and scripts after upload
        job_report_url = next((file['public_url'] for file in uploaded_files if file['name'] == 'report.html'), '')
        if job_report_url:
            job_output = {
                'scripts': list(script_reports.values()),
                'stdout': '',
                'stderr': ''
            }
            # Extract UUID from job_id if it contains a timestamp prefix
            job_uuid = job_id.split('_')[-1] if '_' in job_id else job_id
            update_supabase_job_status(job_uuid, job_status, job_output, datetime.now(timezone.utc).isoformat(), job_report_url)
        else:
            print(f"[@upload_and_report:main] WARNING: Job report URL not found for job {job_id}", file=sys.stderr)
            job_output = {
                'scripts': list(script_reports.values()),
                'stdout': '',
                'stderr': ''
            }
            # Extract UUID from job_id if it contains a timestamp prefix
            job_uuid = job_id.split('_')[-1] if '_' in job_id else job_id
            update_supabase_job_status(job_uuid, job_status, job_output, datetime.now(timezone.utc).isoformat(), '')

        for script_id, script_data in script_reports.items():
            try:
                script_folder_path = os.path.join(job_folder_path, next(folder for folder in script_folders if script_id in folder))
            except StopIteration:
                print(f"[@upload_and_report:main] WARNING: Could not find script folder for script {script_id}", file=sys.stderr)
                continue
                
            stdout_path = os.path.join(script_folder_path, 'stdout.txt')
            stderr_path = os.path.join(script_folder_path, 'stderr.txt')
            
            # Re-read stdout and stderr
            stdout_content = ""
            if os.path.exists(stdout_path):
                try:
                    with open(stdout_path, 'r') as f:
                        stdout_content = f.read()
                except Exception as e:
                    print(f"[@upload_and_report:main] Error re-reading stdout.txt for script {script_id}: {str(e)}", file=sys.stderr)
            
            stderr_content = ""
            if os.path.exists(stderr_path):
                try:
                    with open(stderr_path, 'r') as f:
                        stderr_content = f.read()
                except Exception as e:
                    print(f"[@upload_and_report:main] Error re-reading stderr.txt for script {script_id}: {str(e)}", file=sys.stderr)
            
            # Create updated script report with file links
            updated_script_report_path = create_script_report_html(
                script_folder_path, stdout_content, stderr_content, script_id, job_id, 
                datetime.now(timezone.utc).isoformat(), datetime.now(timezone.utc).isoformat(), script_data['script_path'], parameters, 
                script_data['status'], uploaded_files
            )
            
            # Upload the updated script report
            if updated_script_report_path:
                try:
                    with open(updated_script_report_path, 'rb') as f:
                        s3_client.upload_fileobj(
                            f,
                            bucket_name,
                            os.path.relpath(updated_script_report_path, job_folder_path),
                            ExtraArgs={
                                'ContentType': 'text/html',
                                'ContentDisposition': 'inline'
                            }
                        )
                    updated_script_report_url = s3_client.generate_presigned_url(
                        'get_object',
                        Params={'Bucket': bucket_name, 'Key': os.path.relpath(updated_script_report_path, job_folder_path)},
                        ExpiresIn=604800  # 7 days in seconds
                    )
                    print(f"[@upload_and_report:main] Updated Script Report uploaded with file links for script {script_id}", file=sys.stderr)
                    
                    # Update Supabase with the updated report URL
                    script_output = {
                        'stdout': next((file.get('stdout', '') for file in uploaded_files if file['name'] == 'stdout.txt' and script_id in file['relative_path']), ''),
                        'stderr': next((file.get('stderr', '') for file in uploaded_files if file['name'] == 'stderr.txt' and script_id in file['relative_path']), ''),
                        'exitCode': 0 if script_data['status'] == 'success' else 1
                    }
                    update_supabase_script_execution(script_id, script_data['status'], script_output, datetime.now(timezone.utc).isoformat(), updated_script_report_url)
                except Exception as e:
                    print(f"[@upload_and_report:main] Error uploading updated script report for script {script_id}: {str(e)}", file=sys.stderr)
        
        # Regenerate job report with updated URLs
        job_report_path = create_job_report_html(job_folder_path, job_id, datetime.now(timezone.utc).isoformat(), datetime.now(timezone.utc).isoformat(), script_reports, job_status, uploaded_files, config_name=config_name)
        # Upload the updated job report
        with open(job_report_path, 'rb') as f:
            s3_client.upload_fileobj(
                f,
                bucket_name,
                os.path.relpath(job_report_path, job_folder_path),
                ExtraArgs={
                    'ContentType': 'text/html',
                    'ContentDisposition': 'inline'
                }
            )
        updated_job_report_url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket_name, 'Key': os.path.relpath(job_report_path, job_folder_path)},
            ExpiresIn=604800  # 7 days in seconds
        )
        print(f"[@upload_and_report:main] Updated Job Run Report uploaded with URLs for job {job_id}", file=sys.stderr)
        if updated_job_report_url:
            update_supabase_job_status(job_uuid, job_status, job_output, datetime.now(timezone.utc).isoformat(), updated_job_report_url)

    except Exception as e:
        print(f"[@upload_and_report:main] ERROR: Failed to upload files to R2 for job {job_id}: {str(e)}", file=sys.stderr)
        output = {
            'status': 'failure',
            'job_id': job_id,
            'uploaded_files': uploaded_files,
            'error': f'Failed to upload files: {str(e)}'
        }
        # Still attempt to update Supabase with job status even if upload fails
        job_output = {
            'scripts': list(script_reports.values()),
            'stdout': '',
            'stderr': str(e)
        }
        # Extract UUID from job_id if it contains a timestamp prefix
        job_uuid = job_id.split('_')[-1] if '_' in job_id else job_id
        update_supabase_job_status(job_uuid, job_status, job_output, datetime.now(timezone.utc).isoformat(), job_report_url if 'job_report_url' in locals() else '')
        for script_id, script_data in script_reports.items():
            script_output = {
                'stdout': '',
                'stderr': str(e),
                'exitCode': 1
            }
            update_supabase_script_execution(script_id, script_data['status'], script_output, datetime.now(timezone.utc).isoformat(), '')

    # Move out of the job folder before cleanup
    parent_dir = os.path.dirname(job_folder_path)
    os.chdir(parent_dir)
    cleanup_folder(job_folder_path)

    # Output the result as JSON
    print(json.dumps(output, indent=2))
    
    # Print Job Report URL and Script Report URLs for user access
    print(f"[@upload_and_report:main] Job Run Report URL for job {job_id}: {updated_job_report_url if 'updated_job_report_url' in locals() else job_report_url if 'job_report_url' in locals() else ''}", file=sys.stderr)
    for script_id, script_data in script_reports.items():
        script_report_url = next((file['public_url'] for file in uploaded_files if file['name'] == 'script_report.html' and script_id in file['relative_path']), '')
        if script_report_url:
            print(f"[@upload_and_report:main] Script Report URL for script {script_id}: {script_report_url}", file=sys.stderr)
        else:
            print(f"[@upload_and_report:main] WARNING: Script Report URL not found for script {script_id}", file=sys.stderr)
    return output


if __name__ == '__main__':
    main() 
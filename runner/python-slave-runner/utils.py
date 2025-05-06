import os
import sys
from datetime import datetime

# Assuming s3_client is imported or passed from app.py
# This will be updated in app.py to pass the client if needed


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
        # Use timestamp for folder naming
        used_timestamp = created_at.replace(':', '-').replace('.', '-')
        bucket_name = 'reports'
        job_id_str = job_id.replace(':', '_').replace('/', '_')  # Sanitize job_id for path
        
        # Create hierarchical folder structure
        # Format: jobs/{job_id}/{timestamp}/
        #   OR    jobs/{job_id}/{timestamp}/scripts/{script_id}/
        if script_id:
            script_id_str = str(script_id).replace(':', '_').replace('/', '_')  # Sanitize script_id for path
            base_folder = f"jobs/{job_id_str}/{used_timestamp}/scripts/{script_id_str}"
        else:
            base_folder = f"jobs/{job_id_str}/{used_timestamp}"

        updated_files = []
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
            for file_info in updated_files:
                if file_info.get('name', '').endswith('.html') or file_info.get('name', '').endswith('.txt'):
                    report_link = file_info.get('public_url')
                    break
            
            # If no HTML or TXT file found, just use the first file
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
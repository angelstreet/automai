import os
import sys
from datetime import datetime

# Assuming s3_client is imported or passed from app.py
# This will be updated in app.py to pass the client if needed


def upload_files_to_r2(s3_client, job_id, created_at, associated_files):
    """
    Upload associated files to Cloudflare R2 and return a list of file info with public URLs.
    :param s3_client: The S3 client for Cloudflare R2
    :param job_id: The job ID
    :param created_at: The creation timestamp of the job
    :param associated_files: List of file info dictionaries to upload
    :return: List of file info dictionaries with public URLs added
    """
    print(f"[@python-slave-runner:utils] Starting file upload to R2 for job: {job_id}", file=sys.stderr)
    if not s3_client:
        print(f"[@python-slave-runner:utils] WARNING: S3 client not initialized, cannot upload files to R2", file=sys.stderr)
        return associated_files

    try:
        # Use timestamp for folder naming
        used_timestamp = created_at.replace(':', '-').replace('.', '-')
        bucket_name = 'reports'
        job_id_str = job_id.replace(':', '_').replace('/', '_')  # Sanitize job_id for path
        folder_name = f"{used_timestamp}_{job_id_str}"

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

            # Organize files in subfolders based on their type or path
            r2_path = f"{folder_name}/{relative_path}"

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
            print(f"[@python-slave-runner:utils] Uploaded file to R2: {file_name}, URL generated", file=sys.stderr)
            updated_files.append(file_info)

        print(f"[@python-slave-runner:utils] Successfully uploaded {len(updated_files)} files to R2 for job: {job_id}", file=sys.stderr)
        return updated_files
    except Exception as e:
        print(f"[@python-slave-runner:utils] ERROR: Failed to upload files to R2 for job {job_id}: {str(e)}", file=sys.stderr)
        return associated_files 
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
    print(f"[@upload_to_r2:main] boto3 module imported successfully.", file=sys.stderr)
except ImportError:
    BOTOCORE_AVAILABLE = False
    print(f"[@upload_to_r2:main] boto3 module not found, will attempt installation.", file=sys.stderr)

# Import the upload function from utils.py if available
try:
    from utils import upload_files_to_r2
    UTILS_AVAILABLE = True
    print(f"[@upload_to_r2:main] utils module imported successfully.", file=sys.stderr)
except ImportError:
    UTILS_AVAILABLE = False
    print(f"[@upload_to_r2:main] utils module not found, will use direct upload logic if boto3 is available.", file=sys.stderr)

def install_boto3():
    """Attempt to install boto3 using pip with user-level permissions."""
    try:
        print(f"[@upload_to_r2:install_boto3] Attempting to install boto3...", file=sys.stderr)
        subprocess.run([sys.executable, '-m', 'pip', 'install', '--user', 'boto3'], check=True, capture_output=True, text=True)
        print(f"[@upload_to_r2:install_boto3] boto3 installed successfully.", file=sys.stderr)
        return True
    except subprocess.CalledProcessError as e:
        print(f"[@upload_to_r2:install_boto3] ERROR: Failed to install boto3: {e.stderr}", file=sys.stderr)
        return False
    except Exception as e:
        print(f"[@upload_to_r2:install_boto3] ERROR: Unexpected error while installing boto3: {str(e)}", file=sys.stderr)
        return False

def main():
    parser = argparse.ArgumentParser(description='Upload files to Cloudflare R2 from a specified directory.')
    parser.add_argument('--job-id', required=True, help='Job ID for organizing uploads')
    parser.add_argument('--created-at', required=True, help='Creation timestamp for folder naming')
    parser.add_argument('--script-name', required=True, help='Script name for associating uploads with a specific script')
    parser.add_argument('--temp-dir', required=True, help='Temporary directory containing files to upload')
    parser.add_argument('--r2-endpoint', required=True, help='Cloudflare R2 endpoint URL')
    parser.add_argument('--r2-access-key', required=True, help='Cloudflare R2 access key ID')
    parser.add_argument('--r2-secret-key', required=True, help='Cloudflare R2 secret access key')

    args = parser.parse_args()

    # Initialize S3 client for Cloudflare R2 if boto3 is available
    s3_client = None
    global BOTOCORE_AVAILABLE
    if not BOTOCORE_AVAILABLE:
        if install_boto3():
            try:
                import boto3
                from botocore.client import Config
                BOTOCORE_AVAILABLE = True
                print(f"[@upload_to_r2:main] boto3 module imported successfully after installation.", file=sys.stderr)
            except ImportError:
                BOTOCORE_AVAILABLE = False
                print(f"[@upload_to_r2:main] boto3 module still not available after installation attempt.", file=sys.stderr)

    if BOTOCORE_AVAILABLE:
        try:
            s3_client = boto3.client(
                's3',
                endpoint_url=args.r2_endpoint,
                aws_access_key_id=args.r2_access_key,
                aws_secret_access_key=args.r2_secret_key,
                config=Config(signature_version='s3v4'),
            )
            print(f"[@upload_to_r2:main] Successfully initialized S3 client for Cloudflare R2.", file=sys.stderr)
        except Exception as e:
            print(f"[@upload_to_r2:main] ERROR: Failed to initialize S3 client for Cloudflare R2: {str(e)}", file=sys.stderr)
            sys.exit(1)
    else:
        print(f"[@upload_to_r2:main] ERROR: boto3 not available, cannot proceed with upload.", file=sys.stderr)
        output = {
            'status': 'failure',
            'script_name': args.script_name,
            'uploaded_files': [],
            'error': 'boto3 module not available and installation failed.'
        }
        print(json.dumps(output, indent=2))
        sys.exit(1)

    # Check if the temporary directory exists
    if not os.path.exists(args.temp_dir):
        print(f"[@upload_to_r2:main] ERROR: Temporary directory {args.temp_dir} does not exist.", file=sys.stderr)
        output = {
            'status': 'failure',
            'script_name': args.script_name,
            'uploaded_files': [],
            'error': f'Temporary directory {args.temp_dir} does not exist.'
        }
        print(json.dumps(output, indent=2))
        sys.exit(1)

    # Collect file metadata from the temporary directory
    associated_files = []
    try:
        for root, _, filenames in os.walk(args.temp_dir):
            for filename in filenames:
                file_path = os.path.join(root, filename)
                relative_path = os.path.relpath(file_path, args.temp_dir)
                creation_time = os.path.getctime(file_path)
                associated_files.append({
                    'name': filename,
                    'path': file_path,
                    'relative_path': f"{args.script_name}/{relative_path}",
                    'size': os.path.getsize(file_path),
                    'creation_date': datetime.fromtimestamp(creation_time).isoformat() + 'Z'
                })
        print(f"[@upload_to_r2:main] Found {len(associated_files)} files to upload for script {args.script_name}.", file=sys.stderr)
    except Exception as e:
        print(f"[@upload_to_r2:main] ERROR: Failed to collect file metadata: {str(e)}", file=sys.stderr)
        output = {
            'status': 'failure',
            'script_name': args.script_name,
            'uploaded_files': [],
            'error': f'Failed to collect file metadata: {str(e)}'
        }
        print(json.dumps(output, indent=2))
        sys.exit(1)

    # Upload files to R2
    uploaded_files = []
    try:
        if UTILS_AVAILABLE:
            uploaded_files = upload_files_to_r2(s3_client, args.job_id, args.created_at, associated_files)
        else:
            # Fallback to direct upload logic if utils.py is not available
            print(f"[@upload_to_r2:main] Using direct upload logic since utils.py is not available.", file=sys.stderr)
            bucket_name = 'reports'
            folder_name = f"{args.created_at.replace(':', '-').replace('.', '-')}_{args.job_id.replace(':', '_').replace('/', '_')}"
            uploaded_files = []
            for file_info in associated_files:
                file_path = file_info.get('path')
                file_name = file_info.get('name')
                relative_path = file_info.get('relative_path', file_name)
                if not os.path.exists(file_path):
                    print(f"[@upload_to_r2:main] File not found for upload: {file_name}", file=sys.stderr)
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

                r2_path = f"{folder_name}/{relative_path}"
                print(f"[@upload_to_r2:main] Uploading file to R2: {file_name} -> {r2_path}", file=sys.stderr)

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
                print(f"[@upload_to_r2:main] Uploaded file to R2: {file_name}, URL generated", file=sys.stderr)
                uploaded_files.append(file_info)

        print(f"[@upload_to_r2:main] Successfully uploaded {len(uploaded_files)} files to R2 for job: {args.job_id}", file=sys.stderr)
        output = {
            'status': 'success',
            'script_name': args.script_name,
            'uploaded_files': uploaded_files
        }
    except Exception as e:
        print(f"[@upload_to_r2:main] ERROR: Failed to upload files to R2 for job {args.job_id}: {str(e)}", file=sys.stderr)
        output = {
            'status': 'failure',
            'script_name': args.script_name,
            'uploaded_files': uploaded_files,
            'error': f'Failed to upload files: {str(e)}'
        }

    # Output the list of uploaded files as JSON
    print(json.dumps(output, indent=2))

if __name__ == '__main__':
    main() 
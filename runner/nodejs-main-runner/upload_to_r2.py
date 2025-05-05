#!/usr/bin/env python3

import os
import sys
import json
from datetime import datetime
import argparse
import boto3
from botocore.client import Config

# Import the upload function from utils.py
try:
    from utils import upload_files_to_r2
except ImportError:
    print(f"[@upload_to_r2:ERROR] Failed to import upload_files_to_r2 from utils.py. Ensure utils.py is in the same directory.", file=sys.stderr)
    sys.exit(1)

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

    # Initialize S3 client for Cloudflare R2
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

    # Check if the temporary directory exists
    if not os.path.exists(args.temp_dir):
        print(f"[@upload_to_r2:main] ERROR: Temporary directory {args.temp_dir} does not exist.", file=sys.stderr)
        sys.exit(1)

    # Collect file metadata from the temporary directory
    associated_files = []
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

    # Upload files to R2
    uploaded_files = upload_files_to_r2(s3_client, args.job_id, args.created_at, associated_files)

    # Output the list of uploaded files as JSON
    output = {
        'script_name': args.script_name,
        'uploaded_files': uploaded_files
    }
    print(json.dumps(output, indent=2))

if __name__ == '__main__':
    main() 
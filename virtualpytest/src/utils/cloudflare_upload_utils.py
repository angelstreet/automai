#!/usr/bin/env python3

"""
Simplified Cloudflare R2 Upload Utilities for VirtualPyTest Resources

Simple utilities for uploading files to Cloudflare R2 and getting signed URLs.

Folder Structure:
- reference/{model}/{image_name}     # Reference images (public access)
- navigation/{model}/{screenshot_name} # Navigation screenshots (public access)
"""

import os
import boto3
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, Optional
from mimetypes import guess_type
import logging
from botocore.client import Config
from botocore.exceptions import ClientError

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="[@cloudflare_upload:%(funcName)s] %(levelname)s: %(message)s"
)
logger = logging.getLogger(__name__)


class CloudflareUploader:
    """
    Singleton Cloudflare R2 uploader for VirtualPyTest resources.
    Just upload files and get signed URLs - nothing fancy.
    
    This class implements the singleton pattern to ensure only one instance
    exists throughout the application lifecycle, avoiding multiple S3 client
    initializations and bucket existence checks.
    """
    
    _instance = None
    _initialized = False
    
    def __new__(cls, bucket_name: str = 'virtualpytest-resources'):
        """Singleton pattern implementation - only create one instance."""
        if cls._instance is None:
            logger.info("Creating new CloudflareUploader singleton instance")
            cls._instance = super().__new__(cls)
        else:
            logger.debug("Returning existing CloudflareUploader singleton instance")
        return cls._instance
    
    def __init__(self, bucket_name: str = 'virtualpytest-resources'):
        """Initialize the uploader with bucket name (only once due to singleton)."""
        # Prevent re-initialization of the singleton instance
        if self._initialized:
            return
            
        logger.info(f"Initializing CloudflareUploader singleton with bucket: {bucket_name}")
        self.bucket_name = bucket_name
        self.s3_client = self._init_s3_client()
        self._ensure_bucket_exists()
        self._initialized = True
    
    def _init_s3_client(self):
        """Initialize S3 client for Cloudflare R2."""
        try:
            endpoint_url = os.environ.get('CLOUDFLARE_R2_ENDPOINT')
            access_key = os.environ.get('CLOUDFLARE_R2_ACCESS_KEY_ID')
            secret_key = os.environ.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY')
            
            if not all([endpoint_url, access_key, secret_key]):
                raise ValueError("Missing required Cloudflare R2 environment variables")
            
            logger.info("Initializing S3 client for Cloudflare R2")
            return boto3.client(
                's3',
                endpoint_url=endpoint_url,
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key,
                config=Config(signature_version='s3v4')
            )
            
        except Exception as e:
            logger.error(f"Failed to initialize Cloudflare R2 client: {str(e)}")
            raise
    
    def _ensure_bucket_exists(self):
        """Make sure the bucket exists, create if it doesn't."""
        try:
            logger.info(f"Checking if bucket exists: {self.bucket_name}")
            self.s3_client.head_bucket(Bucket=self.bucket_name)
            logger.info(f"Bucket exists: {self.bucket_name}")
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                logger.info(f"Creating bucket: {self.bucket_name}")
                self.s3_client.create_bucket(Bucket=self.bucket_name)
            else:
                raise
    
    def upload_file(self, local_path: str, remote_path: str, public: bool = False) -> Dict:
        """
        Upload a file to R2.
        
        Args:
            local_path: Path to local file
            remote_path: Path in R2 bucket (e.g., 'images/screenshot.jpg')
            public: If True, make file publicly accessible
            
        Returns:
            Dict with success status and URL (public or signed)
        """
        try:
            if not os.path.exists(local_path):
                return {'success': False, 'error': f"File not found: {local_path}"}
            
            # Get content type
            content_type, _ = guess_type(local_path)
            if not content_type:
                content_type = 'application/octet-stream'
            
            # Prepare upload arguments
            extra_args = {'ContentType': content_type}
            if public:
                extra_args['ACL'] = 'public-read'
            
            # Upload file
            with open(local_path, 'rb') as f:
                self.s3_client.upload_fileobj(
                    f,
                    self.bucket_name,
                    remote_path,
                    ExtraArgs=extra_args
                )
            
            # Get appropriate URL
            if public:
                file_url = self.get_public_url(remote_path)
            else:
                file_url = self.get_signed_url(remote_path)
            
            logger.info(f"Uploaded: {local_path} -> {remote_path} (public: {public})")
            
            return {
                'success': True,
                'remote_path': remote_path,
                'url': file_url,
                'signed_url': file_url,  # For backward compatibility
                'size': os.path.getsize(local_path),
                'public': public
            }
            
        except Exception as e:
            logger.error(f"Upload failed: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def get_signed_url(self, remote_path: str, expires_in: int = 604800) -> str:
        """
        Get a signed URL for a file in R2.
        
        Args:
            remote_path: Path in R2 bucket
            expires_in: URL expiration in seconds (default: 7 days)
            
        Returns:
            Signed URL string
        """
        try:
            return self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': remote_path},
                ExpiresIn=expires_in
            )
        except Exception as e:
            logger.error(f"Failed to generate signed URL: {str(e)}")
            return ""
    
    def get_public_url(self, remote_path: str) -> str:
        """
        Get a public URL for a file in R2 (no expiration).
        
        Args:
            remote_path: Path in R2 bucket
            
        Returns:
            Public URL string
        """
        try:
            # Extract account ID from endpoint URL
            endpoint_url = os.environ.get('CLOUDFLARE_R2_ENDPOINT', '')
            if '.r2.cloudflarestorage.com' in endpoint_url:
                account_id = endpoint_url.split('//')[1].split('.')[0]
                return f"https://pub-{account_id}.r2.dev/{remote_path}"
            else:
                # Fallback to signed URL with very long expiration
                return self.get_signed_url(remote_path, expires_in=31536000)  # 1 year
        except Exception as e:
            logger.error(f"Failed to generate public URL: {str(e)}")
            # Fallback to signed URL
            return self.get_signed_url(remote_path, expires_in=31536000)
    
    def delete_file(self, remote_path: str) -> bool:
        """Delete a file from R2."""
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=remote_path)
            logger.info(f"Deleted: {remote_path}")
            return True
        except Exception as e:
            logger.error(f"Delete failed: {str(e)}")
            return False
    
    def file_exists(self, remote_path: str) -> bool:
        """Check if a file exists in R2."""
        try:
            self.s3_client.head_object(Bucket=self.bucket_name, Key=remote_path)
            return True
        except ClientError:
            return False


# Singleton getter function for consistent access
def get_cloudflare_uploader() -> CloudflareUploader:
    """
    Get the singleton CloudflareUploader instance.
    
    This function provides a clean way to access the singleton instance
    and makes the singleton pattern explicit in the code.
    
    Returns:
        CloudflareUploader: The singleton instance
    """
    return CloudflareUploader()


# Convenience functions for common use cases (now using singleton)
def upload_reference_image(local_path: str, model: str, image_name: str) -> Dict:
    """Upload a reference image with public access (no expiration)."""
    uploader = get_cloudflare_uploader()
    remote_path = f"reference/{model}/{image_name}"
    return uploader.upload_file(local_path, remote_path, public=True)


def upload_navigation_screenshot(local_path: str, model: str, screenshot_name: str) -> Dict:
    """Upload a navigation screenshot with public access."""
    uploader = get_cloudflare_uploader()
    remote_path = f"navigation/{model}/{screenshot_name}"
    return uploader.upload_file(local_path, remote_path, public=True)


def upload_verification_result(local_path: str, job_id: str, filename: str) -> Dict:
    """Upload a verification result."""
    uploader = get_cloudflare_uploader()
    remote_path = f"verification-results/{job_id}/{filename}"
    return uploader.upload_file(local_path, remote_path)


def upload_temp_file(local_path: str, session_id: str, filename: str) -> Dict:
    """Upload a temporary file."""
    uploader = get_cloudflare_uploader()
    remote_path = f"temp/{session_id}/{filename}"
    return uploader.upload_file(local_path, remote_path)


if __name__ == '__main__':
    # Simple test - demonstrate singleton behavior
    uploader1 = CloudflareUploader()
    uploader2 = CloudflareUploader()
    uploader3 = get_cloudflare_uploader()
    
    print(f"uploader1 id: {id(uploader1)}")
    print(f"uploader2 id: {id(uploader2)}")
    print(f"uploader3 id: {id(uploader3)}")
    print(f"All instances are the same: {uploader1 is uploader2 is uploader3}")
    print("Cloudflare uploader singleton initialized successfully!") 
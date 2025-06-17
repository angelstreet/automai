#!/usr/bin/env python3

"""
Simplified Cloudflare R2 Upload Utilities for VirtualPyTest Resources

Simple utilities for uploading files to Cloudflare R2 with public access.

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
    initializations.
    
    Note: Bucket name is included in the R2 endpoint URL, not as a separate parameter.
    """
    
    _instance = None
    _initialized = False
    
    def __new__(cls):
        """Singleton pattern implementation - only create one instance."""
        if cls._instance is None:
            logger.info("Creating new CloudflareUploader singleton instance")
            cls._instance = super().__new__(cls)
        else:
            logger.debug("Returning existing CloudflareUploader singleton instance")
        return cls._instance
    
    def __init__(self):
        """Initialize the uploader (only once due to singleton)."""
        # Prevent re-initialization of the singleton instance
        if self._initialized:
            return
            
        logger.info("Initializing CloudflareUploader singleton")
        
        # Load environment variables from .env.host file
        self._load_environment()
        
        self.s3_client = self._init_s3_client()
        self._initialized = True
    
    def _load_environment(self):
        """Load environment variables from .env.host file"""
        try:
            from dotenv import load_dotenv
            import os
            
            # Try to find .env.host file - check multiple locations
            possible_paths = [
                '.env.host',  # Current directory

            ]
            
            env_loaded = False
            for env_path in possible_paths:
                if os.path.exists(env_path):
                    logger.info(f"Loading environment from: {env_path}")
                    load_dotenv(env_path)
                    env_loaded = True
                    break
            
            if not env_loaded:
                logger.warning("No .env.host file found in expected locations")
            
            # Log what we found (without showing sensitive values)
            logger.info(f"CLOUDFLARE_R2_ENDPOINT: {'SET' if os.environ.get('CLOUDFLARE_R2_ENDPOINT') else 'NOT_SET'}")
            logger.info(f"CLOUDFLARE_R2_ACCESS_KEY_ID: {'SET' if os.environ.get('CLOUDFLARE_R2_ACCESS_KEY_ID') else 'NOT_SET'}")
            logger.info(f"CLOUDFLARE_R2_SECRET_ACCESS_KEY: {'SET' if os.environ.get('CLOUDFLARE_R2_SECRET_ACCESS_KEY') else 'NOT_SET'}")
            logger.info(f"CLOUDFLARE_R2_PUBLIC_URL: {'SET' if os.environ.get('CLOUDFLARE_R2_PUBLIC_URL') else 'NOT_SET'}")
            
        except ImportError:
            logger.warning("python-dotenv not available, relying on system environment variables")
        except Exception as e:
            logger.error(f"Error loading environment: {e}")
    
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
    
    def upload_file(self, local_path: str, remote_path: str) -> Dict:
        """
        Upload a file to R2.
        
        Args:
            local_path: Path to local file
            remote_path: Path in R2 (e.g., 'images/screenshot.jpg')
            
        Returns:
            Dict with success status and public URL
        """
        try:
            if not os.path.exists(local_path):
                return {'success': False, 'error': f"File not found: {local_path}"}
            
            # Get content type
            content_type, _ = guess_type(local_path)
            if not content_type:
                content_type = 'application/octet-stream'
            
            # Upload file - bucket name is included in endpoint URL
            with open(local_path, 'rb') as f:
                self.s3_client.upload_fileobj(
                    f,
                    '',  # Empty bucket name since it's in the endpoint URL
                    remote_path,
                    ExtraArgs={
                        'ContentType': content_type
                    }
                )
            
            # Get public URL
            file_url = self.get_public_url(remote_path)
            
            logger.info(f"Uploaded: {local_path} -> {remote_path}")
            
            return {
                'success': True,
                'remote_path': remote_path,
                'url': file_url,
                'size': os.path.getsize(local_path)
            }
            
        except Exception as e:
            logger.error(f"Upload failed: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def get_public_url(self, remote_path: str) -> str:
        """
        Get a public URL for a file in R2.
        
        Args:
            remote_path: Path in R2
            
        Returns:
            Public URL string
        """
        public_url_base = os.environ.get('CLOUDFLARE_R2_PUBLIC_URL', '')
        if not public_url_base:
            logger.error("CLOUDFLARE_R2_PUBLIC_URL environment variable not set")
            return ""
        
        # Remove trailing slash if present and add the remote path
        base_url = public_url_base.rstrip('/')
        return f"{base_url}/{remote_path}"
    
    def delete_file(self, remote_path: str) -> bool:
        """Delete a file from R2."""
        try:
            self.s3_client.delete_object(Bucket='', Key=remote_path)  # Empty bucket name
            logger.info(f"Deleted: {remote_path}")
            return True
        except Exception as e:
            logger.error(f"Delete failed: {str(e)}")
            return False
    
    def file_exists(self, remote_path: str) -> bool:
        """Check if a file exists in R2."""
        try:
            self.s3_client.head_object(Bucket='', Key=remote_path)  # Empty bucket name
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
    """Upload a reference image with public access."""
    uploader = get_cloudflare_uploader()
    remote_path = f"reference/{model}/{image_name}"
    return uploader.upload_file(local_path, remote_path)


def upload_navigation_screenshot(local_path: str, model: str, screenshot_name: str) -> Dict:
    """Upload a navigation screenshot with public access."""
    uploader = get_cloudflare_uploader()
    remote_path = f"navigation/{model}/{screenshot_name}"
    return uploader.upload_file(local_path, remote_path)


def upload_verification_result(local_path: str, job_id: str, filename: str) -> Dict:
    """Upload a verification result with public access."""
    uploader = get_cloudflare_uploader()
    remote_path = f"verification-results/{job_id}/{filename}"
    return uploader.upload_file(local_path, remote_path)


def upload_temp_file(local_path: str, session_id: str, filename: str) -> Dict:
    """Upload a temporary file with public access."""
    uploader = get_cloudflare_uploader()
    remote_path = f"temp/{session_id}/{filename}"
    return uploader.upload_file(local_path, remote_path)
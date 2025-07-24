#!/usr/bin/env python3

"""
Cloudflare R2 Utilities for VirtualPyTest Resources

Utilities for uploading and downloading files from Cloudflare R2 with public access.

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
    format="[@cloudflare_utils:%(funcName)s] %(levelname)s: %(message)s"
)
logger = logging.getLogger(__name__)


class CloudflareUtils:
    """
    Singleton Cloudflare R2 utility for VirtualPyTest resources.
    Upload and download files and get signed URLs.
    
    This class implements the singleton pattern to ensure only one instance
    exists throughout the application lifecycle, avoiding multiple S3 client
    initializations.
    
    Configuration:
    - Endpoint URL should NOT include bucket name (e.g., https://account.r2.cloudflarestorage.com)
    - Bucket name is passed separately to boto3 operations
    - This matches the working pattern from upload_and_report.py
    """
    
    _instance = None
    _initialized = False
    
    def __new__(cls):
        """Singleton pattern implementation - only create one instance."""
        if cls._instance is None:
            logger.info("Creating new CloudflareUtils singleton instance")
            cls._instance = super().__new__(cls)
        else:
            logger.debug("Returning existing CloudflareUtils singleton instance")
        return cls._instance
    
    def __init__(self):
        """Initialize the utility (only once due to singleton)."""
        # Prevent re-initialization of the singleton instance
        if self._initialized:
            return
            
        logger.info("Initializing CloudflareUtils singleton")
        
        # Load environment variables from .env.host file
        self._load_environment()
        
        # Use 'virtualpytest' as bucket name (boto3 requires valid bucket name)
        # This matches the working pattern from upload_and_report.py
        self.bucket_name = 'virtualpytest'
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
            logger.info(f"Using endpoint: {endpoint_url}")
            logger.info(f"Using bucket: {self.bucket_name}")
            
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
            
            # Upload file using bucket name (required by boto3)
            with open(local_path, 'rb') as f:
                self.s3_client.upload_fileobj(
                    f,
                    self.bucket_name,
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
    
    def download_file(self, remote_path: str, local_path: str) -> Dict:
        """
        Download a file from R2.
        
        Args:
            remote_path: Path in R2 (e.g., 'reference/android_mobile/default_capture.png')
            local_path: Path to save the file locally
            
        Returns:
            Dict with success status and local file path
        """
        try:
            # Ensure directory exists
            os.makedirs(os.path.dirname(local_path), exist_ok=True)
            
            # Download file using bucket name
            self.s3_client.download_file(
                self.bucket_name,
                remote_path,
                local_path
            )
            
            logger.info(f"Downloaded: {remote_path} -> {local_path}")
            
            return {
                'success': True,
                'remote_path': remote_path,
                'local_path': local_path,
                'size': os.path.getsize(local_path)
            }
            
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                logger.error(f"File not found in R2: {remote_path}")
                return {'success': False, 'error': f"File not found in R2: {remote_path}"}
            else:
                logger.error(f"Download failed: {str(e)}")
                return {'success': False, 'error': str(e)}
        except Exception as e:
            logger.error(f"Download failed: {str(e)}")
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
    
    def test_connection(self) -> Dict:
        """Test the R2 connection and return diagnostic information."""
        try:
            # Test 1: List buckets
            response = self.s3_client.list_buckets()
            bucket_names = [bucket['Name'] for bucket in response['Buckets']]
            
            # Test 2: Check if our target bucket exists
            bucket_exists = self.bucket_name in bucket_names
            
            # Test 3: Try to access the bucket
            can_access_bucket = False
            try:
                self.s3_client.head_bucket(Bucket=self.bucket_name)
                can_access_bucket = True
            except Exception as e:
                logger.error(f"Cannot access bucket: {e}")
            
            return {
                'success': True,
                'buckets_found': len(bucket_names),
                'bucket_names': bucket_names,
                'target_bucket_exists': bucket_exists,
                'can_access_bucket': can_access_bucket,
                'endpoint': os.environ.get('CLOUDFLARE_R2_ENDPOINT', 'NOT_SET'),
                'bucket_name': self.bucket_name
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'endpoint': os.environ.get('CLOUDFLARE_R2_ENDPOINT', 'NOT_SET'),
            }

# Singleton getter function to avoid direct instantiation
def get_cloudflare_utils() -> CloudflareUtils:
    """Get the singleton instance of CloudflareUtils."""
    return CloudflareUtils()

# Utility functions for common upload patterns

def upload_reference_image(local_path: str, model: str, image_name: str) -> Dict:
    """Upload a reference image to R2 in the reference-images/{model} folder."""
    uploader = get_cloudflare_utils()
    remote_path = f"reference-images/{model}/{image_name}"
    return uploader.upload_file(local_path, remote_path)

def download_reference_image(model: str, image_name: str, local_path: str) -> Dict:
    """Download a reference image from R2 in the reference-images/{model} folder."""
    downloader = get_cloudflare_utils()
    remote_path = f"reference-images/{model}/{image_name}"
    return downloader.download_file(remote_path, local_path)

def upload_navigation_screenshot(local_path: str, model: str, screenshot_name: str) -> Dict:
    """Upload a navigation screenshot to R2 in the navigation/{model} folder."""
    uploader = get_cloudflare_utils()
    remote_path = f"navigation/{model}/{screenshot_name}"
    return uploader.upload_file(local_path, remote_path)

def upload_heatmap_html(html_content: str, timestamp: str) -> Dict:
    """Upload heatmap HTML to R2 in the heatmaps folder."""
    try:
        uploader = get_cloudflare_utils()
        
        # Create heatmap HTML path: heatmaps/{timestamp}/mosaic.html
        html_path = f"heatmaps/{timestamp}/mosaic.html"
        
        # Create temporary HTML file
        import tempfile
        import os
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False) as temp_file:
            temp_file.write(html_content)
            temp_file_path = temp_file.name
        
        try:
            # Upload HTML file
            result = uploader.upload_file(temp_file_path, html_path)
            
            if result['success']:
                logger.info(f"Uploaded heatmap HTML: {html_path}")
                return {
                    'success': True,
                    'html_path': html_path,
                    'html_url': result['url']
                }
            else:
                return {
                    'success': False,
                    'error': result.get('error', 'Upload failed')
                }
                
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
                
    except Exception as e:
        logger.error(f"Heatmap HTML upload failed: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }

def upload_script_report(html_content: str, device_model: str, script_name: str, timestamp: str) -> Dict:
    """Upload script report HTML to R2 in the script-reports folder."""
    try:
        uploader = get_cloudflare_utils()
        
        # Create report folder path: script-reports/{device_model}/{script_name}_{date}_{timestamp}/
        date_str = timestamp[:8]  # YYYYMMDD from YYYYMMDDHHMMSS
        folder_name = f"{script_name}_{date_str}_{timestamp}"
        report_path = f"script-reports/{device_model}/{folder_name}/report.html"
        
        # Create temporary HTML file
        import tempfile
        import os
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False) as temp_file:
            temp_file.write(html_content)
            temp_file_path = temp_file.name
        
        try:
            # Upload HTML report
            result = uploader.upload_file(temp_file_path, report_path)
            
            if result['success']:
                logger.info(f"Uploaded script report: {report_path}")
                return {
                    'success': True,
                    'report_path': report_path,
                    'report_url': result['url'],
                    'folder_path': f"script-reports/{device_model}/{folder_name}"
                }
            else:
                return {
                    'success': False,
                    'error': result.get('error', 'Upload failed')
                }
                
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
                
    except Exception as e:
        logger.error(f"Script report upload failed: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }

def upload_validation_screenshots(screenshot_paths: list, device_model: str, script_name: str, timestamp: str) -> Dict:
    """Upload validation screenshots to R2 in the same folder as the report."""
    try:
        uploader = get_cloudflare_utils()
        
        # Create report folder path
        date_str = timestamp[:8]  # YYYYMMDD from YYYYMMDDHHMMSS
        folder_name = f"{script_name}_{date_str}_{timestamp}"
        base_folder = f"script-reports/{device_model}/{folder_name}"
        
        uploaded_screenshots = []
        failed_uploads = []
        
        for local_path in screenshot_paths:
            if not os.path.exists(local_path):
                logger.warning(f"Screenshot not found: {local_path}")
                failed_uploads.append({'path': local_path, 'error': 'File not found'})
                continue
            
            # Extract filename from local path
            filename = os.path.basename(local_path)
            remote_path = f"{base_folder}/{filename}"
            
            # Upload screenshot
            result = uploader.upload_file(local_path, remote_path)
            
            if result['success']:
                uploaded_screenshots.append({
                    'local_path': local_path,
                    'remote_path': remote_path,
                    'url': result['url']
                })
                logger.info(f"Uploaded screenshot: {remote_path}")
            else:
                failed_uploads.append({
                    'path': local_path,
                    'error': result.get('error', 'Upload failed')
                })
                logger.error(f"Failed to upload screenshot {local_path}: {result.get('error')}")
        
        return {
            'success': len(failed_uploads) == 0,
            'uploaded_count': len(uploaded_screenshots),
            'failed_count': len(failed_uploads),
            'uploaded_screenshots': uploaded_screenshots,
            'failed_uploads': failed_uploads,
            'folder_path': base_folder
        }
        
    except Exception as e:
        logger.error(f"Validation screenshots upload failed: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'uploaded_screenshots': [],
            'failed_uploads': []
        }

def get_script_report_folder_url(device_model: str, script_name: str, timestamp: str) -> str:
    """Get base URL for script report folder."""
    uploader = get_cloudflare_utils()
    date_str = timestamp[:8]  # YYYYMMDD from YYYYMMDDHHMMSS
    folder_name = f"{script_name}_{date_str}_{timestamp}"
    folder_path = f"script-reports/{device_model}/{folder_name}"
    return uploader.get_public_url(folder_path)

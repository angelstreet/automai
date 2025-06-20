"""
Centralized URL Building Utilities

Single source of truth for all URL construction patterns.
Eliminates hardcoded URLs and inconsistent building patterns.
"""

def buildCaptureUrl(host_info: dict, timestamp: str) -> str:
    """
    Build URL for live screenshot captures
    
    Args:
        host_info: Host information from registry
        timestamp: Screenshot timestamp (YYYYMMDDHHMMSS format)
        
    Returns:
        Complete URL to screenshot capture
        
    Example:
        buildCaptureUrl(host_info, '20250117134500')
        -> 'https://host:444/stream/captures/capture_20250117134500.jpg'
    """
    from .app_utils import buildHostUrl
    return buildHostUrl(host_info, f'host/stream/captures/capture_{timestamp}.jpg')

def buildCroppedImageUrl(host_info: dict, filename: str) -> str:
    """
    Build URL for cropped images
    
    Args:
        host_info: Host information from registry
        filename: Cropped image filename
        
    Returns:
        Complete URL to cropped image
        
    Example:
        buildCroppedImageUrl(host_info, 'cropped_button_20250117134500.jpg')
        -> 'https://host:444/stream/captures/cropped/cropped_button_20250117134500.jpg'
    """
    from .app_utils import buildHostUrl
    return buildHostUrl(host_info, f'host/stream/captures/cropped/{filename}')

def buildReferenceImageUrl(host_info: dict, device_model: str, filename: str) -> str:
    """
    Build URL for reference images
    
    Args:
        host_info: Host information from registry
        device_model: Device model (e.g., 'android_mobile', 'pixel_7')
        filename: Reference image filename
        
    Returns:
        Complete URL to reference image
        
    Example:
        buildReferenceImageUrl(host_info, 'android_mobile', 'login_button.jpg')
        -> 'https://host:444/stream/resources/android_mobile/login_button.jpg'
    """
    from .app_utils import buildHostUrl
    return buildHostUrl(host_info, f'host/stream/resources/{device_model}/{filename}')

def buildVerificationResultUrl(host_info: dict, results_path: str) -> str:
    """
    Build URL for verification result images
    
    Args:
        host_info: Host information from registry
        results_path: Local file path to verification result
        
    Returns:
        Complete URL to verification result image
        
    Example:
        buildVerificationResultUrl(host_info, '/var/www/html/stream/verification_results/source_image_0.png')
        -> 'https://host:444/host/stream/verification_results/source_image_0.png'
    """
    from .app_utils import buildHostUrl
    # Convert local path to URL path
    url_path = results_path.replace('/var/www/html/', '')
    # Add host/ prefix like other image URLs (cropping, captures, etc.)
    return buildHostUrl(host_info, f'host/{url_path}')

def buildStreamUrl(host_info: dict) -> str:
    """
    Build URL for HLS stream
    
    Args:
        host_info: Host information from registry
        
    Returns:
        Complete URL to HLS stream
        
    Example:
        buildStreamUrl(host_info)
        -> 'https://host:444/stream/output.m3u8'
    """
    from .app_utils import buildHostUrl
    return buildHostUrl(host_info, 'host/stream/output.m3u8')

def buildHostUrl(host_info: dict, endpoint: str) -> str:
    """
    Build URL for host API endpoints (Flask routes)
    
    Args:
        host_info: Host information from registry
        endpoint: API endpoint path (e.g., '/host/take-control', '/host/navigation/execute/tree/node')
        
    Returns:
        Complete URL to host API endpoint
        
    Example:
        buildHostUrl(host_info, '/host/take-control')
        -> 'https://host:6119/host/take-control'
    """
    from .app_utils import buildHostUrl
    return buildHostUrl(host_info, endpoint)

def buildHostImageUrl(host_info: dict, image_path: str) -> str:
    """
    Build URL for any image stored on the host (nginx-served)
    
    Args:
        host_info: Host information from registry
        image_path: Relative or absolute image path on host
        
    Returns:
        Complete URL to host-served image
        
    Example:
        buildHostImageUrl(host_info, '/stream/captures/screenshot.jpg')
        -> 'https://host:444/stream/captures/screenshot.jpg'
    """
    from .app_utils import buildHostUrl
    
    # Handle absolute paths by converting to relative
    if image_path.startswith('/var/www/html/'):
        image_path = image_path.replace('/var/www/html/', '')
    
    # Ensure path doesn't start with /
    clean_path = image_path.lstrip('/')
    
    return buildHostUrl(host_info, clean_path)

def buildCloudImageUrl(bucket_name: str, image_path: str, base_url: str = None) -> str:
    """
    Build URL for images stored in cloud storage (R2, S3, etc.)
    
    Args:
        bucket_name: Cloud storage bucket name
        image_path: Path to image in cloud storage
        base_url: Optional custom base URL (defaults to R2)
        
    Returns:
        Complete URL to cloud-stored image
        
    Example:
        buildCloudImageUrl('references', 'android_mobile/login_button.jpg')
        -> 'https://r2-bucket-url/references/android_mobile/login_button.jpg'
    """
    if base_url is None:
        # Default to R2 URL pattern - this should be configurable via environment
        base_url = "https://your-r2-domain.com"  # TODO: Make this configurable
    
    # Clean the image path
    clean_path = image_path.lstrip('/')
    
    return f"{base_url.rstrip('/')}/{bucket_name}/{clean_path}" 
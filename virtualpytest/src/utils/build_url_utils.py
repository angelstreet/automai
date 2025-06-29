"""
Centralized URL Building Utilities

Single source of truth for all URL construction patterns.
Eliminates hardcoded URLs and inconsistent building patterns.
Supports multi-device hosts with device-specific paths.
"""

# =====================================================
# CORE URL BUILDING FUNCTION (No Dependencies)
# =====================================================

def buildHostUrl(host_info: dict, endpoint: str) -> str:
    """
    Core URL builder - Build URLs for host API endpoints using provided host data
    
    Args:
        host_info: Complete host information (from frontend or direct data)
        endpoint: The endpoint path to append
        
    Returns:
        Complete URL to the host API endpoint
        
    Example:
        buildHostUrl(host_data, '/host/av/takeScreenshot')
        -> 'https://virtualpytest.com/host/av/takeScreenshot'
    """
    if not host_info:
        raise ValueError("host_info is required for buildHostUrl")
    
    # Use host_url from provided host data (modern approach)
    host_base_url = host_info.get('host_url')
    if not host_base_url:
        raise ValueError(f"Host missing host_url: {host_info.get('host_name', 'unknown')}")
    
    # Clean endpoint
    clean_endpoint = endpoint.lstrip('/')
    
    return f"{host_base_url}/{clean_endpoint}"

# =====================================================
# SPECIALIZED URL BUILDERS
# =====================================================

def buildCaptureUrl(host_info: dict, timestamp: str, device_id: str) -> str:
    """
    Build URL for live screenshot captures
    
    Args:
        host_info: Host information from registry
        timestamp: Screenshot timestamp (YYYYMMDDHHMMSS format)
        device_id: Device ID for multi-device hosts (required)
        
    Returns:
        Complete URL to screenshot capture
        
    Example:
        buildCaptureUrl(host_info, '20250117134500', 'device1')
        -> 'https://host:444/host/stream/capture1/captures/capture_20250117134500.jpg'
    """
    # Get device-specific capture path
    capture_path = _get_device_capture_path(host_info, device_id)
    
    return buildHostUrl(host_info, f'host{capture_path}/capture_{timestamp}.jpg')

def buildCroppedImageUrl(host_info: dict, filename: str, device_id: str) -> str:
    """
    Build URL for cropped images
    
    Args:
        host_info: Host information from registry
        filename: Cropped image filename
        device_id: Device ID for multi-device hosts (required)
        
    Returns:
        Complete URL to cropped image
        
    Example:
        buildCroppedImageUrl(host_info, 'cropped_button_20250117134500.jpg', 'device1')
        -> 'https://host:444/host/stream/capture1/captures/cropped/cropped_button_20250117134500.jpg'
    """
    # Get device-specific capture path
    capture_path = _get_device_capture_path(host_info, device_id)
    
    return buildHostUrl(host_info, f'host{capture_path}/cropped/{filename}')

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
        -> 'https://host:444/host/stream/resources/android_mobile/login_button.jpg'
    """
    return buildHostUrl(host_info, f'host/stream/resources/{device_model}/{filename}')

def buildVerificationResultUrl(host_info: dict, filename: str, device_id: str) -> str:
    """
    Build URL for verification result images
    
    Args:
        host_info: Host information from registry
        filename: Verification result filename
        device_id: Device ID for multi-device hosts (required)
        
    Returns:
        Complete URL to verification result image
        
    Example:
        buildVerificationResultUrl(host_info, 'source_image_0.png', 'device1')
        -> 'https://host:444/host/stream/capture1/verification_results/source_image_0.png'
    """
    # Get device-specific capture path
    capture_path = _get_device_capture_path(host_info, device_id)
    
    return buildHostUrl(host_info, f'host{capture_path}/verification_results/{filename}')

def buildStreamUrl(host_info: dict, device_id: str) -> str:
    """
    Build URL for HLS stream
    
    Args:
        host_info: Host information from registry
        device_id: Device ID for multi-device hosts (required)
        
    Returns:
        Complete URL to HLS stream
        
    Example:
        buildStreamUrl(host_info, 'device1')
        -> 'https://host:444/host/stream/capture1/output.m3u8'
    """
    # Get device-specific stream path
    stream_path = _get_device_stream_path(host_info, device_id)
    
    return buildHostUrl(host_info, f'host{stream_path}/output.m3u8')

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
        -> 'https://host:444/host/stream/captures/screenshot.jpg'
    """
    # Handle absolute paths by converting to relative
    if image_path.startswith('/var/www/html/'):
        image_path = image_path.replace('/var/www/html/', '')
    
    # Ensure path doesn't start with /
    clean_path = image_path.lstrip('/')
    
    return buildHostUrl(host_info, f'host/{clean_path}')

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

def buildServerUrl(endpoint: str) -> str:
    """
    Host URL builder - Build URLs for server endpoints from host context
    
    Args:
        endpoint: The endpoint path to append
        
    Returns:
        Complete URL to the server endpoint for host use
    """
    import os
    # Host uses SERVER_URL environment variable to reach server
    server_url = os.getenv('SERVER_URL', 'http://localhost:5109')
    
    # Clean endpoint
    clean_endpoint = endpoint.lstrip('/')
    
    return f"{server_url}/{clean_endpoint}"

# =====================================================
# MULTI-DEVICE HELPER FUNCTIONS
# =====================================================

def get_device_local_captures_path(host_info: dict, device_id: str) -> str:
    """
    Get device-specific local captures path for file system operations.
    
    Args:
        host_info: Host information from registry
        device_id: Device ID (required - no fallbacks)
        
    Returns:
        Local file system path for captures from device configuration (DEVICE1_VIDEO_CAPTURE_PATH)
        
    Raises:
        ValueError: If device configuration or capture path is not found
    """
    if not host_info:
        raise ValueError("host_info is required for device path resolution")
    
    if not device_id:
        raise ValueError("device_id is required - no fallbacks allowed")
    
    # Get devices configuration from host_info
    devices = host_info.get('devices', [])
    if not devices:
        raise ValueError(f"No devices configured in host_info for device_id: {device_id}")
    
    # Find the specific device
    for device in devices:
        if device.get('device_id') == device_id:
            capture_path = device.get('video_capture_path')
            if not capture_path:
                raise ValueError(f"Device {device_id} has no video_capture_path configured (DEVICE{device_id.replace('device', '')}_VIDEO_CAPTURE_PATH missing)")
            
            print(f"[@build_url_utils:get_device_local_captures_path] Using device {device_id} capture path: {capture_path}")
            return capture_path
    
    raise ValueError(f"Device {device_id} not found in host configuration. Available devices: {[d.get('device_id') for d in devices]}")

def get_device_local_stream_path(host_info: dict, device_id: str) -> str:
    """
    Get device-specific local stream path for file system operations.
    
    Args:
        host_info: Host information from registry
        device_id: Device ID (required - no fallbacks)
        
    Returns:
        Local file system path for stream from device configuration (DEVICE1_VIDEO_STREAM_PATH)
        
    Raises:
        ValueError: If device configuration or stream path is not found
    """
    if not host_info:
        raise ValueError("host_info is required for device path resolution")
    
    if not device_id:
        raise ValueError("device_id is required - no fallbacks allowed")
    
    # Get devices configuration from host_info
    devices = host_info.get('devices', [])
    if not devices:
        raise ValueError(f"No devices configured in host_info for device_id: {device_id}")
    
    # Find the specific device
    for device in devices:
        if device.get('device_id') == device_id:
            stream_path = device.get('video_stream_path')
            if not stream_path:
                raise ValueError(f"Device {device_id} has no video_stream_path configured (DEVICE{device_id.replace('device', '')}_VIDEO_STREAM_PATH missing)")
            
            # Convert URL path to local file system path
            # Remove '/host' prefix and convert to absolute path
            clean_path = stream_path.replace('/host', '')
            local_path = f'/var/www/html{clean_path}'
            
            print(f"[@build_url_utils:get_device_local_stream_path] Using device {device_id} stream path: {local_path}")
            return local_path
    
    raise ValueError(f"Device {device_id} not found in host configuration. Available devices: {[d.get('device_id') for d in devices]}")

def get_current_device_id() -> str:
    """
    Get the current device ID from Flask app context.
    This helps routes determine which device they're working with.
    
    Returns:
        Device ID (e.g., 'device1', 'device2') or raises error if not available
    """
    try:
        from flask import current_app, request
        
        # First try to get device_id from request parameters
        if request and request.method in ['POST', 'GET']:
            if request.method == 'POST' and request.is_json:
                data = request.get_json() or {}
                device_id = data.get('device_id')
                if device_id:
                    return device_id
            elif request.method == 'GET':
                device_id = request.args.get('device_id')
                if device_id:
                    return device_id
        
        # No fallbacks - device_id must be explicitly provided
        raise ValueError("device_id is required in request parameters - no fallbacks allowed")
        
    except Exception as e:
        print(f"[@build_url_utils:get_current_device_id] Error getting device ID: {e}")
        raise ValueError("device_id is required in request parameters - no fallbacks allowed")

def _get_device_stream_path(host_info: dict, device_id: str) -> str:
    """
    Get device-specific stream path from host configuration.
    
    Args:
        host_info: Host information from registry
        device_id: Device ID (required - no fallbacks)
        
    Returns:
        Stream path for the device from device configuration (DEVICE1_VIDEO_STREAM_PATH)
        
    Raises:
        ValueError: If device configuration or stream path is not found
    """
    if not host_info:
        raise ValueError("host_info is required for device path resolution")
    
    if not device_id:
        raise ValueError("device_id is required - no fallbacks allowed")
    
    # Get devices configuration from host_info
    devices = host_info.get('devices', [])
    if not devices:
        raise ValueError(f"No devices configured in host_info for device_id: {device_id}")
    
    # Find the specific device
    for device in devices:
        if device.get('device_id') == device_id:
            stream_path = device.get('video_stream_path')
            if not stream_path:
                raise ValueError(f"Device {device_id} has no video_stream_path configured (DEVICE{device_id.replace('device', '')}_VIDEO_STREAM_PATH missing)")
            
            # Remove '/host' prefix if present and ensure starts with /
            clean_path = stream_path.replace('/host', '').lstrip('/')
            url_path = f'/{clean_path}'
            
            print(f"[@build_url_utils:_get_device_stream_path] Using device {device_id} stream path: {url_path}")
            return url_path
    
    raise ValueError(f"Device {device_id} not found in host configuration. Available devices: {[d.get('device_id') for d in devices]}")

def _get_device_capture_path(host_info: dict, device_id: str) -> str:
    """
    Get device-specific capture path from host configuration.
    
    Args:
        host_info: Host information from registry
        device_id: Device ID (required - no fallbacks)
        
    Returns:
        Capture path for the device from device configuration (DEVICE1_VIDEO_STREAM_PATH + /captures)
        
    Raises:
        ValueError: If device configuration or stream path is not found
    """
    if not host_info:
        raise ValueError("host_info is required for device path resolution")
    
    if not device_id:
        raise ValueError("device_id is required - no fallbacks allowed")
    
    # Get devices configuration from host_info
    devices = host_info.get('devices', [])
    if not devices:
        raise ValueError(f"No devices configured in host_info for device_id: {device_id}")
    
    # Find the specific device
    for device in devices:
        if device.get('device_id') == device_id:
            stream_path = device.get('video_stream_path')
            if not stream_path:
                raise ValueError(f"Device {device_id} has no video_stream_path configured (DEVICE{device_id.replace('device', '')}_VIDEO_STREAM_PATH missing)")
            
            # Remove '/host' prefix if present and ensure starts with /
            clean_path = stream_path.replace('/host', '').lstrip('/')
            url_path = f'/{clean_path}/captures'
            
            print(f"[@build_url_utils:_get_device_capture_path] Using device {device_id} capture path: {url_path}")
            return url_path
    
    raise ValueError(f"Device {device_id} not found in host configuration. Available devices: {[d.get('device_id') for d in devices]}")

def get_device_by_id(host_info: dict, device_id: str) -> dict:
    """
    Get device configuration by device ID.
    
    Args:
        host_info: Host information from registry
        device_id: Device ID to find (e.g., 'device1', 'device2')
        
    Returns:
        Device configuration dictionary or None if not found
    """
    if not host_info or not device_id:
        return None
    
    devices = host_info.get('devices', [])
    
    for device in devices:
        if device.get('device_id') == device_id:
            return device
    
    return None

def buildCaptureUrlFromPath(host_info: dict, capture_path: str, device_id: str) -> str:
    """
    Build URL for capture from a local file path by extracting timestamp
    
    Args:
        host_info: Host information from registry
        capture_path: Local file path to capture (e.g., '/path/capture_20250117134500.jpg')
        device_id: Device ID for multi-device hosts (required)
        
    Returns:
        Complete URL to capture
        
    Raises:
        ValueError: If timestamp cannot be extracted from path
        
    Example:
        buildCaptureUrlFromPath(host_info, '/tmp/capture_20250117134500.jpg', 'device1')
        -> 'https://host:444/host/stream/capture1/captures/capture_20250117134500.jpg'
    """
    import re
    
    # Extract timestamp from capture path
    timestamp_match = re.search(r'capture_(\d{14})\.jpg', capture_path)
    if not timestamp_match:
        raise ValueError(f'Failed to extract timestamp from capture path: {capture_path}')
    
    timestamp = timestamp_match.group(1)
    
    # Use existing buildCaptureUrl function
    return buildCaptureUrl(host_info, timestamp, device_id)

def buildStreamUrlForDevice(host_info: dict, device_id: str) -> str:
    """
    Build stream URL for a specific device
    
    Args:
        host_info: Host information from registry
        device_id: Device ID (required)
        
    Returns:
        Complete URL to HLS stream for the device
        
    Example:
        buildStreamUrlForDevice(host_info, 'device1')
        -> 'https://host:444/host/stream/capture1/output.m3u8'
    """
    return buildStreamUrl(host_info, device_id)

def resolveCaptureFilePath(filename: str) -> str:
    """
    Resolve local file path for a capture filename
    
    Args:
        filename: Capture filename (e.g., 'capture_20250117134500.jpg')
        
    Returns:
        Local file path to capture
        
    Raises:
        ValueError: If filename is invalid or unsafe
        
    Example:
        resolveCaptureFilePath('capture_20250117134500.jpg')
        -> '/tmp/captures/capture_20250117134500.jpg'
    """
    # Security validation - ensure the path is safe
    if '..' in filename or filename.startswith('/'):
        raise ValueError(f'Invalid filename: {filename}')
    
    # Extract the base filename without query parameters
    base_filename = filename.split('?')[0]
    
    # Use host's tmp directory for captures
    capture_path = f"/tmp/captures/{base_filename}"
    
    return capture_path

def resolveImageFilePath(image_path: str) -> str:
    """
    Resolve and validate local file path for an image
    
    Args:
        image_path: Image path from request
        
    Returns:
        Validated local file path to image
        
    Raises:
        ValueError: If path is invalid, unsafe, or not allowed
        
    Example:
        resolveImageFilePath('/tmp/verification_results/source_image_0.png')
        -> '/tmp/verification_results/source_image_0.png'
    """
    if not image_path:
        raise ValueError('No image path specified')
    
    # Security check - allow /tmp/ paths and other safe paths
    if not (image_path.startswith('/tmp/') or image_path.startswith('/home/pi/virtualpytest/')):
        raise ValueError(f'Invalid image path: {image_path}')
    
    return image_path

def buildClientImageUrl(image_path: str) -> str:
    """
    Build client-safe image URL with HTTP-to-HTTPS proxy handling.
    Centralizes all URL processing logic from frontend components.
    
    Args:
        image_path: Raw image path/URL from backend
        
    Returns:
        Processed URL ready for frontend consumption
        
    Example:
        buildClientImageUrl('http://host:444/image.jpg')
        -> '/server/av/proxy-image?url=http%3A//host%3A444/image.jpg'
    """
    if not image_path:
        return ''
    
    # Handle data URLs (base64) - return as is
    if image_path.startswith('data:'):
        return image_path
    
    # Handle HTTPS URLs - return as is (no proxy needed)
    if image_path.startswith('https:'):
        return image_path
    
    # Handle HTTP URLs - use proxy to convert to HTTPS
    if image_path.startswith('http:'):
        from urllib.parse import quote
        return f'/server/av/proxy-image?url={quote(image_path)}'
    
    # For relative paths or other formats, use directly
    return image_path

def convertHostUrlToLocalPath(host_url: str) -> str:
    """
    Convert a host URL back to local file system path.
    This is the reverse operation of buildHostImageUrl.
    
    Args:
        host_url: Host URL (e.g., 'https://host.com/host/stream/capture1/captures/image.jpg')
        
    Returns:
        Local file system path (e.g., '/var/www/html/stream/capture1/captures/image.jpg')
        
    Raises:
        ValueError: If URL format is invalid or unsafe
        
    Example:
        convertHostUrlToLocalPath('https://host.com/host/stream/capture1/captures/image.jpg')
        -> '/var/www/html/stream/capture1/captures/image.jpg'
    """
    if not host_url:
        raise ValueError("host_url is required")
    
    from urllib.parse import urlparse
    
    try:
        parsed_url = urlparse(host_url)
        url_path = parsed_url.path
        
        # Validate URL format - must start with /host/
        if not url_path.startswith('/host/'):
            raise ValueError(f"Invalid host URL format - expected /host/ prefix: {host_url}")
        
        # Remove '/host/' prefix to get the relative path
        relative_path = url_path[6:]  # Remove '/host/' prefix
        
        # Security validation - prevent path traversal
        if '..' in relative_path or relative_path.startswith('/'):
            raise ValueError(f"Unsafe path detected in URL: {host_url}")
        
        # Convert to absolute local path using nginx document root
        local_path = f"/var/www/html/{relative_path}"
        
        return local_path
        
    except Exception as e:
        raise ValueError(f"Failed to convert host URL to local path: {e}")

# =====================================================
# LEGACY/COMPATIBILITY FUNCTIONS
# ===================================================== 
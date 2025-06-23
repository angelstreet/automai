"""
Centralized URL Building Utilities

Single source of truth for all URL construction patterns.
Eliminates hardcoded URLs and inconsistent building patterns.
Supports multi-device hosts with device-specific paths.
"""

def buildCaptureUrl(host_info: dict, timestamp: str, device_id: str = None) -> str:
    """
    Build URL for live screenshot captures
    
    Args:
        host_info: Host information from registry
        timestamp: Screenshot timestamp (YYYYMMDDHHMMSS format)
        device_id: Optional device ID for multi-device hosts (e.g., 'device1', 'device2')
        
    Returns:
        Complete URL to screenshot capture
        
    Example:
        buildCaptureUrl(host_info, '20250117134500')
        -> 'https://host:444/host/stream/captures/capture_20250117134500.jpg'
        
        buildCaptureUrl(host_info, '20250117134500', 'device2')
        -> 'https://host:444/host/stream/capture2/captures/capture_20250117134500.jpg'
    """
    from .app_utils import buildHostUrl
    
    # Get device-specific capture path
    capture_path = _get_device_capture_path(host_info, device_id)
    
    return buildHostUrl(host_info, f'host{capture_path}/capture_{timestamp}.jpg')

def buildCroppedImageUrl(host_info: dict, filename: str, device_id: str = None) -> str:
    """
    Build URL for cropped images
    
    Args:
        host_info: Host information from registry
        filename: Cropped image filename
        device_id: Optional device ID for multi-device hosts
        
    Returns:
        Complete URL to cropped image
        
    Example:
        buildCroppedImageUrl(host_info, 'cropped_button_20250117134500.jpg')
        -> 'https://host:444/host/stream/captures/cropped/cropped_button_20250117134500.jpg'
    """
    from .app_utils import buildHostUrl
    
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

def buildStreamUrl(host_info: dict, device_id: str = None) -> str:
    """
    Build URL for HLS stream
    
    Args:
        host_info: Host information from registry
        device_id: Optional device ID for multi-device hosts (e.g., 'device1', 'device2')
        
    Returns:
        Complete URL to HLS stream
        
    Example:
        buildStreamUrl(host_info)
        -> 'https://host:444/host/stream/output.m3u8'
        
        buildStreamUrl(host_info, 'device2')
        -> 'https://host:444/host/stream/capture2/output.m3u8'
    """
    from .app_utils import buildHostUrl
    
    # Get device-specific stream path
    stream_path = _get_device_stream_path(host_info, device_id)
    
    return buildHostUrl(host_info, f'host{stream_path}/output.m3u8')

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
        -> 'https://host:444/host/stream/captures/screenshot.jpg'
    """
    from .app_utils import buildHostUrl
    
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

# =====================================================
# MULTI-DEVICE HELPER FUNCTIONS
# =====================================================

def get_device_local_captures_path(host_info: dict, device_id: str = None) -> str:
    """
    Get device-specific local captures path for file system operations.
    
    Args:
        host_info: Host information from registry
        device_id: Optional device ID (e.g., 'device1', 'device2')
        
    Returns:
        Local file system path for captures from device configuration (DEVICE1_VIDEO_CAPTURE_PATH)
        
    Raises:
        ValueError: If device configuration or capture path is not found
    """
    if not host_info:
        raise ValueError("host_info is required for device path resolution")
    
    if not device_id:
        # Get first device if no device_id specified
        devices = host_info.get('devices', [])
        if not devices:
            raise ValueError("No devices configured in host_info")
        device_id = devices[0].get('device_id')
        if not device_id:
            raise ValueError("First device has no device_id configured")
    
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
            
            print(f"[@buildUrlUtils:get_device_local_captures_path] Using device {device_id} capture path: {capture_path}")
            return capture_path
    
    raise ValueError(f"Device {device_id} not found in host configuration. Available devices: {[d.get('device_id') for d in devices]}")

def get_device_local_stream_path(host_info: dict, device_id: str = None) -> str:
    """
    Get device-specific local stream path for file system operations.
    
    Args:
        host_info: Host information from registry
        device_id: Optional device ID (e.g., 'device1', 'device2')
        
    Returns:
        Local file system path for stream from device configuration (DEVICE1_VIDEO_STREAM_PATH)
        
    Raises:
        ValueError: If device configuration or stream path is not found
    """
    if not host_info:
        raise ValueError("host_info is required for device path resolution")
    
    if not device_id:
        # Get first device if no device_id specified
        devices = host_info.get('devices', [])
        if not devices:
            raise ValueError("No devices configured in host_info")
        device_id = devices[0].get('device_id')
        if not device_id:
            raise ValueError("First device has no device_id configured")
    
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
            
            print(f"[@buildUrlUtils:get_device_local_stream_path] Using device {device_id} stream path: {local_path}")
            return local_path
    
    raise ValueError(f"Device {device_id} not found in host configuration. Available devices: {[d.get('device_id') for d in devices]}")

def get_current_device_id() -> str:
    """
    Get the current device ID from Flask app context.
    This helps routes determine which device they're working with.
    
    Returns:
        Device ID (e.g., 'device1', 'device2') or None if not available
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
        
        # Fallback: get from host device configuration
        host_device = getattr(current_app, 'my_host_device', None)
        if host_device and host_device.get('devices'):
            devices = host_device['devices']
            if len(devices) == 1:
                # Single device host - return the device ID
                return devices[0].get('device_id')
            # Multi-device host - default to first device if no specific device requested
            # This could be enhanced to be smarter about device selection
            return devices[0].get('device_id')
        
        return None
        
    except Exception as e:
        print(f"[@buildUrlUtils:get_current_device_id] Error getting device ID: {e}")
        return None

def _get_device_stream_path(host_info: dict, device_id: str = None) -> str:
    """
    Get device-specific stream path from host configuration.
    
    Args:
        host_info: Host information from registry
        device_id: Optional device ID (e.g., 'device1', 'device2')
        
    Returns:
        Stream path for the device from device configuration (DEVICE1_VIDEO_STREAM_PATH)
        
    Raises:
        ValueError: If device configuration or stream path is not found
    """
    if not host_info:
        raise ValueError("host_info is required for device path resolution")
    
    if not device_id:
        # Get first device if no device_id specified
        devices = host_info.get('devices', [])
        if not devices:
            raise ValueError("No devices configured in host_info")
        device_id = devices[0].get('device_id')
        if not device_id:
            raise ValueError("First device has no device_id configured")
    
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
            
            print(f"[@buildUrlUtils:_get_device_stream_path] Using device {device_id} stream path: {url_path}")
            return url_path
    
    raise ValueError(f"Device {device_id} not found in host configuration. Available devices: {[d.get('device_id') for d in devices]}")

def _get_device_capture_path(host_info: dict, device_id: str = None) -> str:
    """
    Get device-specific capture path from host configuration.
    
    Args:
        host_info: Host information from registry
        device_id: Optional device ID (e.g., 'device1', 'device2')
        
    Returns:
        Capture path for the device from device configuration (DEVICE1_VIDEO_STREAM_PATH + /captures)
        
    Raises:
        ValueError: If device configuration or stream path is not found
    """
    if not host_info:
        raise ValueError("host_info is required for device path resolution")
    
    if not device_id:
        # Get first device if no device_id specified
        devices = host_info.get('devices', [])
        if not devices:
            raise ValueError("No devices configured in host_info")
        device_id = devices[0].get('device_id')
        if not device_id:
            raise ValueError("First device has no device_id configured")
    
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
            
            print(f"[@buildUrlUtils:_get_device_capture_path] Using device {device_id} capture path: {url_path}")
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
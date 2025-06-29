/**
 * Centralized URL Building Utilities (Frontend)
 *
 * Single source of truth for all URL construction patterns.
 * Mirrors the Python buildUrlUtils.py for consistency.
 */

/**
 * Build host URL for direct host communication (Frontend to host)
 * Core implementation for all host-based URL building
 */
const internalBuildHostUrl = (host: any, endpoint: string): string => {
  if (!host) {
    throw new Error('Host information is required for buildHostUrl');
  }

  // Use host_url if available (most efficient)
  if (host.host_url) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${host.host_url}/${cleanEndpoint}`;
  }

  // Fallback: construct from host_ip and host_port
  if (host.host_ip && host.host_port) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `https://${host.host_ip}:${host.host_port}/${cleanEndpoint}`;
  }

  throw new Error('Host must have either host_url or both host_ip and host_port');
};

/**
 * Build URL for live screenshot/video captures using device-specific paths
 */
export const buildCaptureUrl = (host: any, timestamp: string, deviceId: string): string => {
  // Get device-specific capture path
  const deviceCapturePath = getDeviceCaptureUrlPath(host, deviceId);
  const capturePath = `host${deviceCapturePath}/capture_${timestamp}.jpg`;

  const hostName = host?.host_name || '';

  // Handle HTTPS URLs - return as is (no proxy needed)
  if (hostName.startsWith('https:')) {
    return `${hostName}${capturePath}`;
  }

  // Handle HTTP or plain hostnames - use proxy
  const baseUrl = hostName.startsWith('http') ? hostName : `https://${hostName}`;
  return `/api/proxy-image?url=${baseUrl}${capturePath}`;
};

/**
 * Build URL for cropped images
 * Supports device-specific capture paths for multi-device hosts
 */
export const buildCroppedImageUrl = (host: any, filename: string, deviceId?: string): string => {
  if (!deviceId) {
    throw new Error('deviceId is required for buildCroppedImageUrl');
  }
  // Get device-specific capture path
  const capturePath = getDeviceCaptureUrlPath(host, deviceId);
  return internalBuildHostUrl(host, `host${capturePath}/cropped/${filename}`);
};

/**
 * Build URL for reference images
 */
export const buildReferenceImageUrl = (
  host: any,
  deviceModel: string,
  filename: string,
  deviceId?: string,
): string => {
  if (!deviceId) {
    throw new Error('deviceId is required for buildReferenceImageUrl');
  }
  // Get device-specific capture path as base for resources
  const capturePath = getDeviceCaptureUrlPath(host, deviceId);
  return internalBuildHostUrl(host, `host${capturePath}/resources/${deviceModel}/${filename}`);
};

/**
 * Build URL for verification result images
 */
export const buildVerificationResultUrl = (host: any, resultsPath: string): string => {
  // Convert local path to URL path
  const urlPath = resultsPath.replace('/var/www/html/', '');
  // Add host/ prefix like other image URLs (cropping, captures, etc.)
  return internalBuildHostUrl(host, `host/${urlPath}`);
};

/**
 * Build URL for HLS stream
 * Supports device-specific stream paths for multi-device hosts
 */
export const buildStreamUrl = (host: any, deviceId?: string): string => {
  if (!deviceId) {
    throw new Error('deviceId is required for buildStreamUrl');
  }
  // Get device-specific stream path
  const streamPath = getDeviceStreamUrlPath(host, deviceId);
  return internalBuildHostUrl(host, `host${streamPath}/output.m3u8`);
};

/**
 * Build URL for host API endpoints (Flask routes)
 */
export const buildHostUrl = (host: any, endpoint: string): string => {
  return internalBuildHostUrl(host, endpoint);
};

/**
 * Build URL for any image stored on the host (nginx-served)
 * This replaces the scattered local buildImageUrl functions
 */
export const buildHostImageUrl = (host: any, imagePath: string): string => {
  if (!imagePath) return '';

  // If it's already a complete URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // Handle absolute paths by converting to relative
  let cleanPath = imagePath;
  if (cleanPath.startsWith('/var/www/html/')) {
    cleanPath = cleanPath.replace('/var/www/html/', '');
  }

  // Ensure path doesn't start with / for buildHostUrl
  cleanPath = cleanPath.startsWith('/') ? cleanPath.slice(1) : cleanPath;

  // Use buildHostUrl for relative URLs
  if (host?.host_name) {
    return internalBuildHostUrl(host, cleanPath);
  }

  // Fallback if no host selected
  return imagePath;
};

/**
 * Build URL for images stored in cloud storage (R2, S3, etc.)
 */
export const buildCloudImageUrl = (
  bucketName: string,
  imagePath: string,
  baseUrl?: string,
): string => {
  const defaultBaseUrl = 'https://your-r2-domain.com'; // TODO: Make this configurable via environment
  const actualBaseUrl = baseUrl || defaultBaseUrl;

  // Clean the image path
  const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;

  return `${actualBaseUrl.replace(/\/$/, '')}/${bucketName}/${cleanPath}`;
};

// =====================================================
// MULTI-DEVICE HELPER FUNCTIONS (Frontend)
// =====================================================

/**
 * Get device-specific stream URL path from host configuration.
 * Mirrors the Python _get_device_stream_path function.
 */
const getDeviceStreamUrlPath = (host: any, deviceId: string): string => {
  if (!host) {
    throw new Error('Host information is required for device stream path resolution');
  }

  if (!deviceId) {
    throw new Error('deviceId is required - no fallbacks allowed');
  }

  // Get devices configuration from host
  const devices = host?.devices || [];
  if (!devices.length) {
    throw new Error(`No devices configured in host configuration for device_id: ${deviceId}`);
  }

  // Find the specific device
  for (const device of devices) {
    if (device?.device_id === deviceId) {
      const streamPath = device?.video_stream_path;
      if (!streamPath) {
        throw new Error(`Device ${deviceId} has no video_stream_path configured`);
      }

      // Remove '/host' prefix if present and ensure starts with /
      const cleanPath = streamPath.replace('/host', '').replace(/^\/+/, '/');
      return cleanPath;
    }
  }

  const availableDevices = devices.map((d: any) => d?.device_id).filter(Boolean);
  throw new Error(
    `Device ${deviceId} not found in host configuration. Available devices: ${availableDevices.join(', ')}`,
  );
};

/**
 * Get device-specific capture URL path from host configuration.
 * Uses video_capture_path from device configuration.
 */
const getDeviceCaptureUrlPath = (host: any, deviceId: string): string => {
  if (!host) {
    throw new Error('Host information is required for device capture path resolution');
  }

  if (!deviceId) {
    throw new Error('deviceId is required - no fallbacks allowed');
  }

  // Get devices configuration from host
  const devices = host?.devices || [];
  if (!devices.length) {
    throw new Error(`No devices configured in host configuration for device_id: ${deviceId}`);
  }

  // Find the specific device
  for (const device of devices) {
    if (device?.device_id === deviceId) {
      const capturePath = device?.video_capture_path;
      if (!capturePath) {
        throw new Error(`Device ${deviceId} has no video_capture_path configured`);
      }

      // Convert local path to URL path by removing '/var/www/html' prefix
      const urlPath = capturePath.replace('/var/www/html', '').replace(/^\/+/, '/');
      return urlPath;
    }
  }

  const availableDevices = devices.map((d: any) => d?.device_id).filter(Boolean);
  throw new Error(
    `Device ${deviceId} not found in host configuration. Available devices: ${availableDevices.join(', ')}`,
  );
};

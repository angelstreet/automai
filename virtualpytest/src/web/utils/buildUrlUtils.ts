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
 * Build URL for live screenshot captures
 */
export const buildCaptureUrl = (host: any, timestamp: string): string => {
  return internalBuildHostUrl(host, `host/stream/captures/capture_${timestamp}.jpg`);
};

/**
 * Build URL for cropped images
 */
export const buildCroppedImageUrl = (host: any, filename: string): string => {
  return internalBuildHostUrl(host, `host/stream/captures/cropped/${filename}`);
};

/**
 * Build URL for reference images
 */
export const buildReferenceImageUrl = (
  host: any,
  deviceModel: string,
  filename: string,
): string => {
  return internalBuildHostUrl(host, `host/stream/resources/${deviceModel}/${filename}`);
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
 */
export const buildStreamUrl = (host: any): string => {
  return internalBuildHostUrl(host, 'host/stream/output.m3u8');
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

/**
 * Legacy support - replaces local buildImageUrl functions in components
 * @deprecated Use buildHostImageUrl instead for host images, buildCloudImageUrl for cloud images
 */
export const buildImageUrl = buildHostImageUrl;

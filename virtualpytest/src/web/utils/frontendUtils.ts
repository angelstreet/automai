/**
 * Frontend URL Builders
 *
 * Mirrors the pattern from app_utils.py for frontend use
 */

/**
 * Build server URL for API endpoints (Frontend to main server)
 * Uses VITE_SERVER_URL environment variable
 */
export const buildServerUrl = (endpoint: string): string => {
  const serverUrl = (import.meta as any).env.VITE_SERVER_URL || 'http://localhost:5109';
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${serverUrl}/${cleanEndpoint}`;
};

/**
 * Build host URL for direct host communication (Frontend to host)
 * Mirrors the buildHostUrl function from app_utils.py
 */
export const buildHostUrl = (host: any, endpoint: string): string => {
  if (!host) {
    throw new Error('Host information is required for buildHostUrl');
  }

  // Use host_url if available (most efficient)
  if (host.host_url) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${host.host_url}/${cleanEndpoint}`;
  }

  // Fallback to building URL from host_name and port
  if (host.host_name) {
    const port = host.port || 5110; // Default host port
    const protocol = host.protocol || 'https'; // Default to HTTPS
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${protocol}://${host.host_name}:${port}/${cleanEndpoint}`;
  }

  throw new Error('Host must have either host_url or host_name to build URL');
};

/**
 * Convert HTTP URL to HTTPS for mixed content compatibility
 * Handles the case where HTTPS frontend needs to access HTTP resources
 *
 * @param url The original URL (HTTP or HTTPS)
 * @param httpsPort The HTTPS port to use (default: 444 for nginx proxy)
 * @returns HTTPS version of the URL or original if already HTTPS
 */
export const convertToHttpsUrl = (url: string, httpsPort: number = 444): string => {
  if (!url || !url.startsWith('http://')) {
    // Already HTTPS or not HTTP, return as-is
    return url;
  }

  try {
    // Extract host and path from HTTP URL
    const match = url.match(/^http:\/\/([^:]+):(\d+)(.*)$/);
    if (match) {
      const [, hostName, , path] = match;
      const httpsUrl = `https://${hostName}:${httpsPort}${path}`;
      console.log(
        `[@utils:frontendUtils] Converted HTTP to HTTPS for mixed content compatibility: ${url} -> ${httpsUrl}`,
      );
      return httpsUrl;
    }

    // Fallback: just replace protocol
    return url.replace('http://', 'https://');
  } catch (error) {
    console.warn(`[@utils:frontendUtils] Error converting URL to HTTPS: ${error}`);
    return url;
  }
};

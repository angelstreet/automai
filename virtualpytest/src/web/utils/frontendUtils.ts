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

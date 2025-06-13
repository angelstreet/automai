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

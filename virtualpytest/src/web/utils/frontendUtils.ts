/**
 * Frontend URL Builders
 *
 * DEPRECATED: This file is being replaced by buildUrlUtils.ts
 * Use buildUrlUtils.ts for all new URL building needs.
 */

/**
 * Build server URL for API endpoints (Frontend to main server)
 * Uses VITE_SERVER_URL environment variable
 *
 * @deprecated Use buildUrlUtils.ts instead
 */
export const buildServerUrl = (endpoint: string): string => {
  const serverUrl = (import.meta as any).env.VITE_SERVER_URL || 'http://localhost:5109';
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${serverUrl}/${cleanEndpoint}`;
};

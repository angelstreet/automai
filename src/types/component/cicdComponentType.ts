/**
 * Core CI/CD type definitions
 */

/**
 * Supported CI/CD provider types
 */
export type CICDProviderType = 'jenkins' | 'github' | 'gitlab' | 'azure_devops';

/**
 * Authentication types for CI/CD providers
 */
export type CICDAuthType = 'token' | 'basic_auth' | 'oauth';

/**
 * Credentials for authentication
 */
export interface CICDCredentials {
  username?: string;
  password?: string;
  token?: string;
}

/**
 * Provider configuration
 */
export interface CICDProviderConfig {
  auth_type: CICDAuthType;
  credentials: CICDCredentials;
}

/**
 * CI/CD Provider entity
 */
export interface CICDProvider {
  id: string;
  tenant_id: string;
  name: string;
  type: CICDProviderType;
  url: string;
  port?: number | null;
  config: CICDProviderConfig;
  status?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
}

/**
 * Payload for creating/updating CI/CD providers
 */
export interface CICDProviderPayload {
  id?: string;
  name: string;
  type: CICDProviderType;
  url: string;
  port?: number | null;
  config: {
    auth_type: CICDAuthType;
    credentials: CICDCredentials;
  };
}

/**
 * Get full URL including port if present
 */
export function getFullProviderUrl(provider: Pick<CICDProvider, 'url' | 'port'>): string {
  if (!provider.port) {
    return provider.url;
  }

  try {
    const urlObj = new URL(provider.url);
    urlObj.port = provider.port.toString();
    return urlObj.toString();
  } catch (error) {
    // If URL parsing fails, return original URL
    return provider.url;
  }
}

/**
 * Parse URL into base URL and port
 */
export function parseProviderUrl(fullUrl: string): { url: string; port: number | null } {
  try {
    const urlObj = new URL(fullUrl);
    const port = urlObj.port ? parseInt(urlObj.port, 10) : null;

    // Remove port from URL
    urlObj.port = '';
    const url = urlObj.toString();

    return { url, port };
  } catch (error) {
    // If URL parsing fails, return original URL with no port
    return { url: fullUrl, port: null };
  }
}

/**
 * CI/CD Job entity
 */
export interface CICDJob {
  id: string;
  name: string;
  provider_id: string;
  job_path: string;
  status?: string;
  parameters?: Record<string, any>;
  config?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

/**
 * CI/CD Build entity
 */
export interface CICDBuild {
  id: string;
  job_id: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  started_at?: string;
  finished_at?: string;
  start_time?: string;
  end_time?: string;
  logs?: string;
}

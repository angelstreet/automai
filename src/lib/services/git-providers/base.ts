import { GitProvider, Repository } from '@/types/repositories';

export interface GitProviderConfig {
  serverUrl?: string;
  accessToken?: string;
}

export interface GitProviderService {
  /**
   * Get user repositories from the Git provider
   */
  getUserRepositories(): Promise<Repository[]>;

  /**
   * Get repository details by name or ID
   */
  getRepository(nameOrId: string): Promise<Repository | null>;

  /**
   * Test the provider connection
   */
  testConnection(): Promise<boolean>;

  /**
   * Get the provider authorization URL
   */
  getAuthorizationUrl?(): string;

  /**
   * Get the redirect URL for OAuth callback
   */
  getRedirectUrl?(): string;

  /**
   * Exchange authorization code for access token
   */
  exchangeCodeForToken?(code: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
  }>;

  /**
   * Get user information from the provider
   */
  getUserInfo(accessToken: string): Promise<{
    id: string;
    login: string;
    name: string;
    email: string;
    avatarUrl: string;
  }>;

  /**
   * List repositories for the authenticated user
   */
  listRepositories(provider: GitProvider): Promise<Repository[]>;

  /**
   * Sync repository metadata
   */
  syncRepository(repository: Repository): Promise<Repository>;

  /**
   * Check if access token is valid
   */
  validateAccessToken(accessToken: string): Promise<boolean>;

  /**
   * Refresh access token if expired
   */
  refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
  }>;
}

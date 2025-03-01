import { GitProvider, Repository } from '@/types/repositories';

export interface GitProviderService {
  /**
   * Get the authorization URL for OAuth flow
   */
  getAuthorizationUrl(redirectUri: string, state: string): string;
  
  /**
   * Exchange authorization code for access token
   */
  exchangeCodeForToken(code: string, redirectUri: string): Promise<{
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
   * Get repository details
   */
  getRepository(provider: GitProvider, repoName: string): Promise<Repository>;
  
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
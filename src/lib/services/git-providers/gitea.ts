import { GitProviderService } from './base';
import { GitProvider, Repository } from '@/types/repositories';

export class GiteaProviderService implements GitProviderService {
  private serverUrl: string | null = null;
  private accessToken: string | null = null;

  constructor(serverUrl?: string, accessToken?: string) {
    this.serverUrl = serverUrl || null;
    this.accessToken = accessToken || null;
  }

  // For Gitea, we don't need OAuth flow as we're using direct access token
  getAuthorizationUrl(redirectUri: string, state: string): string {
    return '';
  }

  // For Gitea, we use the provided token directly
  async exchangeCodeForToken(code: string, redirectUri: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
  }> {
    if (!this.accessToken) {
      throw new Error('No access token provided for Gitea');
    }

    return {
      accessToken: this.accessToken,
      // Gitea tokens don't typically expire
    };
  }

  async getUserInfo(accessToken: string): Promise<{
    id: string;
    login: string;
    name: string;
    email: string;
    avatarUrl: string;
  }> {
    if (!this.serverUrl) {
      throw new Error('Server URL is required for Gitea');
    }

    const response = await fetch(`${this.serverUrl}/api/v1/user`, {
      headers: {
        Authorization: `token ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user info: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      id: data.id.toString(),
      login: data.login,
      name: data.full_name || data.login,
      email: data.email,
      avatarUrl: data.avatar_url,
    };
  }

  async listRepositories(provider: GitProvider): Promise<Repository[]> {
    if (!this.serverUrl) {
      throw new Error('Server URL is required for Gitea');
    }

    const accessToken = provider.accessToken;
    if (!accessToken) {
      throw new Error('Access token is required for Gitea');
    }

    const response = await fetch(`${this.serverUrl}/api/v1/user/repos`, {
      headers: {
        Authorization: `token ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch repositories: ${response.statusText}`);
    }

    const data = await response.json();
    return data.map((repo: any) => ({
      id: repo.id.toString(),
      name: repo.name,
      description: repo.description || '',
      url: repo.html_url,
      defaultBranch: repo.default_branch || 'main',
      providerId: provider.id,
      syncStatus: 'IDLE',
      createdAt: new Date(repo.created_at),
      updatedAt: new Date(repo.updated_at),
    }));
  }

  async validateAccessToken(accessToken: string): Promise<boolean> {
    if (!this.serverUrl) {
      return false;
    }

    try {
      const response = await fetch(`${this.serverUrl}/api/v1/user`, {
        headers: {
          Authorization: `token ${accessToken}`,
        },
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async getRepository(provider: GitProvider, repoName: string): Promise<Repository> {
    throw new Error('Method not implemented.');
  }

  async syncRepository(repository: Repository): Promise<Repository> {
    throw new Error('Method not implemented.');
  }

  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
  }> {
    throw new Error('Method not implemented.');
  }
} 
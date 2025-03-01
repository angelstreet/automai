import { GitProviderService } from './base';
import { ProviderInfo, RepositoryInfo, UserInfo } from '@/types/repositories';

export class GiteaProviderService implements GitProviderService {
  private serverUrl: string | null = null;
  private accessToken: string | null = null;

  constructor(serverUrl?: string, accessToken?: string) {
    this.serverUrl = serverUrl || null;
    this.accessToken = accessToken || null;
  }

  // For Gitea, we don't need OAuth flow as we're using direct access token
  generateAuthorizationUrl(redirectUri: string): string {
    return '';
  }

  // For Gitea, we use the provided token directly
  async exchangeCodeForToken(code: string, redirectUri: string): Promise<{
    accessToken: string;
    refreshToken: string | null;
    expiresAt: Date | null;
  }> {
    if (!this.accessToken) {
      throw new Error('No access token provided for Gitea');
    }

    return {
      accessToken: this.accessToken,
      refreshToken: null,
      expiresAt: null, // Gitea tokens don't typically expire
    };
  }

  async getUserInfo(accessToken: string): Promise<UserInfo> {
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

  async listRepositories(accessToken: string): Promise<RepositoryInfo[]> {
    if (!this.serverUrl) {
      throw new Error('Server URL is required for Gitea');
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
      fullName: repo.full_name,
      description: repo.description || '',
      url: repo.html_url,
      sshUrl: repo.ssh_url,
      cloneUrl: repo.clone_url,
      defaultBranch: repo.default_branch || 'main',
      private: repo.private,
      archived: repo.archived,
      createdAt: new Date(repo.created_at),
      updatedAt: new Date(repo.updated_at),
      pushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
      language: repo.language,
      owner: {
        id: repo.owner.id.toString(),
        login: repo.owner.login,
        avatarUrl: repo.owner.avatar_url,
      },
    }));
  }

  async isTokenValid(accessToken: string): Promise<boolean> {
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

  async getProviderInfo(): Promise<ProviderInfo> {
    return {
      name: 'gitea',
      displayName: 'Gitea',
      url: this.serverUrl || '',
    };
  }
} 
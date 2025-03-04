import { GitProvider, Repository, SyncStatus } from '@/types/repositories';

import { GitProviderService } from './base';

export class GitHubProviderService implements GitProviderService {
  private clientId: string;
  private clientSecret: string;

  constructor() {
    this.clientId = process.env.GITHUB_CLIENT_ID || '';
    this.clientSecret = process.env.GITHUB_CLIENT_SECRET || '';

    if (!this.clientId || !this.clientSecret) {
      console.warn('GitHub OAuth credentials not configured');
    }
  }

  getAuthorizationUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: 'repo user',
      state,
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(
    code: string,
    redirectUri: string,
  ): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
  }> {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
    }

    return {
      accessToken: data.access_token,
      // GitHub doesn't provide refresh tokens in the standard OAuth flow
    };
  }

  async getUserInfo(accessToken: string): Promise<{
    id: string;
    login: string;
    name: string;
    email: string;
    avatarUrl: string;
  }> {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      id: data.id.toString(),
      login: data.login,
      name: data.name || data.login,
      email: data.email || '',
      avatarUrl: data.avatar_url,
    };
  }

  async listRepositories(provider: GitProvider): Promise<Repository[]> {
    const response = await fetch('https://api.github.com/user/repos?per_page=100', {
      headers: {
        Authorization: `token ${provider.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    const data = await response.json();

    return data.map((repo: any) => ({
      id: repo.id.toString(),
      name: repo.name,
      description: repo.description,
      url: repo.html_url,
      defaultBranch: repo.default_branch,
      providerId: provider.id,
      lastSyncedAt: new Date(),
      syncStatus: 'SYNCED' as SyncStatus,
      createdAt: new Date(repo.created_at),
      updatedAt: new Date(repo.updated_at),
    }));
  }

  async getRepository(provider: GitProvider, repoName: string): Promise<Repository> {
    // Get user info to get the username
    const userInfo = await this.getUserInfo(provider.accessToken || '');

    const response = await fetch(`https://api.github.com/repos/${userInfo.login}/${repoName}`, {
      headers: {
        Authorization: `token ${provider.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    const repo = await response.json();

    return {
      id: repo.id.toString(),
      name: repo.name,
      description: repo.description,
      url: repo.html_url,
      defaultBranch: repo.default_branch,
      providerId: provider.id,
      lastSyncedAt: new Date(),
      syncStatus: 'SYNCED' as SyncStatus,
      createdAt: new Date(repo.created_at),
      updatedAt: new Date(repo.updated_at),
    };
  }

  async syncRepository(repository: Repository): Promise<Repository> {
    const provider = repository.provider;

    if (!provider || !provider.accessToken) {
      throw new Error('Provider not available or not authenticated');
    }

    // Get updated repository data
    const updatedRepo = await this.getRepository(provider, repository.name);

    return {
      ...repository,
      ...updatedRepo,
      lastSyncedAt: new Date(),
      syncStatus: 'SYNCED' as SyncStatus,
    };
  }

  async validateAccessToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `token ${accessToken}`,
        },
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
  }> {
    // GitHub doesn't support refresh tokens in the standard OAuth flow
    throw new Error('GitHub does not support token refresh in the standard OAuth flow');
  }
}

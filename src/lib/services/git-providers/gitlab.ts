import { GitProvider, Repository } from '@/types/repositories';
import { GitProviderService, GitProviderConfig } from './base';

export class GitLabProviderService implements GitProviderService {
  private baseUrl: string;
  private token?: string;

  constructor(config?: GitProviderConfig) {
    this.baseUrl = config?.serverUrl || 'https://gitlab.com/api/v4';
    this.token = config?.accessToken;
  }

  async getUserRepositories(): Promise<Repository[]> {
    if (!this.token) {
      throw new Error('Access token is required');
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/projects?owned=true&membership=true&per_page=100`,
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            Accept: 'application/json',
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch repositories: ${response.statusText}`);
      }

      const data = await response.json();

      return data.map((repo: any) => ({
        name: repo.name,
        description: repo.description,
        url: repo.web_url,
        defaultBranch: repo.default_branch,
        isPrivate: repo.visibility !== 'public',
        id: repo.id.toString(),
        providerId: '',
        owner: repo.namespace?.path || '',
        syncStatus: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
      }));
    } catch (error) {
      console.error('Error fetching GitLab repositories:', error);
      throw error;
    }
  }

  async getRepository(nameOrId: string): Promise<Repository | null> {
    if (!this.token) {
      throw new Error('Access token is required');
    }

    try {
      const response = await fetch(`${this.baseUrl}/projects/${encodeURIComponent(nameOrId)}`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to fetch repository: ${response.statusText}`);
      }

      const repo = await response.json();

      return {
        name: repo.name,
        description: repo.description,
        url: repo.web_url,
        defaultBranch: repo.default_branch,
        isPrivate: repo.visibility !== 'public',
        id: repo.id.toString(),
        providerId: '',
        owner: repo.namespace?.path || '',
        syncStatus: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Error fetching GitLab repository:', error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.token) {
      throw new Error('Access token is required');
    }

    try {
      const response = await fetch(`${this.baseUrl}/user`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/json',
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Error testing GitLab connection:', error);
      return false;
    }
  }

  getRedirectUrl(): string {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    return `${baseUrl}/api/git-providers/callback/gitlab`;
  }

  getAuthorizationUrl(): string {
    const clientId = process.env.GITLAB_CLIENT_ID;
    if (!clientId) {
      throw new Error('GitLab client ID is not configured');
    }
    
    const redirectUri = process.env.GITLAB_REDIRECT_URI || '';
    const state = Math.random().toString(36).substring(2, 15);
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      state,
      scope: 'api',
    });

    return `${this.baseUrl}/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
  }> {
    const clientId = process.env.GITLAB_CLIENT_ID;
    const clientSecret = process.env.GITLAB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('GitLab OAuth credentials are not configured');
    }

    const redirectUri = this.getRedirectUrl();

    const response = await fetch('https://gitlab.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to exchange code for token: ${response.statusText}`);
    }

    const data = await response.json();

    // Calculate expiry date
    const expiresIn = data.expires_in || 7200; // Default to 2 hours
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
    };
  }

  async getUserInfo(accessToken: string): Promise<{
    id: string;
    login: string;
    name: string;
    email: string;
    avatarUrl: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/user`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user info: ${response.statusText}`);
      }

      const user = await response.json();

      return {
        id: user.id.toString(),
        login: user.username,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatar_url,
      };
    } catch (error) {
      console.error('Error fetching GitLab user info:', error);
      throw error;
    }
  }

  async listRepositories(provider: GitProvider): Promise<Repository[]> {
    if (!this.token) {
      throw new Error('Access token is required');
    }

    try {
      const response = await fetch(`${this.baseUrl}/projects?membership=true`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch repositories: ${response.statusText}`);
      }

      const repos = await response.json();

      return repos.map((repo: any) => ({
        id: repo.id.toString(),
        name: repo.name,
        description: repo.description,
        url: repo.web_url,
        defaultBranch: repo.default_branch,
        isPrivate: repo.visibility !== 'public',
        providerId: provider.id,
        owner: repo.namespace?.path || '',
        syncStatus: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
    } catch (error) {
      console.error('Error fetching GitLab repositories:', error);
      throw error;
    }
  }

  async syncRepository(repository: Repository): Promise<Repository> {
    if (!this.token) {
      throw new Error('Access token is required');
    }

    try {
      // Get updated repository data
      const updatedRepo = await this.getRepository(repository.id);
      
      if (!updatedRepo) {
        throw new Error(`Repository not found: ${repository.id}`);
      }

      return {
        ...repository,
        ...updatedRepo,
        lastSyncedAt: new Date(),
        syncStatus: 'SYNCED',
      };
    } catch (error) {
      console.error('Error syncing GitLab repository:', error);
      return {
        ...repository,
        syncStatus: 'ERROR',
        lastSyncedAt: new Date(),
      };
    }
  }

  async validateAccessToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/user`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
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
    // GitLab doesn't support refresh tokens in the standard OAuth flow
    throw new Error('GitLab does not support refreshing tokens');
  }
}

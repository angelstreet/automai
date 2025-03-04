import { Repository } from '@/types/repositories';
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
      const response = await fetch(`${this.baseUrl}/projects?owned=true&membership=true&per_page=100`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch repositories: ${response.statusText}`);
      }

      const data = await response.json();
      
      return data.map((repo: any) => ({
        name: repo.name,
        description: repo.description,
        url: repo.web_url,
        defaultBranch: repo.default_branch,
        private: repo.visibility !== 'public',
        id: repo.id.toString(),
        externalId: repo.id.toString(),
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
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/json',
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
        private: repo.visibility !== 'public',
        id: repo.id.toString(),
        externalId: repo.id.toString(),
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
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/json',
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Error testing GitLab connection:', error);
      return false;
    }
  }

  getRedirectUrl(): string {
    return `${process.env.NEXT_PUBLIC_APP_URL}/api/git-providers/callback/gitlab`;
  }

  getAuthorizationUrl(state: string): string {
    const clientId = process.env.GITLAB_CLIENT_ID;
    if (!clientId) {
      throw new Error('GitLab client ID is not configured');
    }

    const redirectUri = this.getRedirectUrl();
    const scope = 'api read_api read_user read_repository';
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      state,
      scope,
    });

    return `https://gitlab.com/oauth/authorize?${params.toString()}`;
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
        'Accept': 'application/json',
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
} 
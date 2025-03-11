import { GitProvider, Repository, SyncStatus } from '@/types/repositories';
import { GitProviderService } from '@/types/git-providers';

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

  getAuthorizationUrl(): string {
    const redirectUri = process.env.GITHUB_REDIRECT_URI || '';
    const state = Math.random().toString(36).substring(2, 15);

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: 'repo user',
      state,
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
  }> {
    const redirectUri = process.env.GITHUB_REDIRECT_URI || '';

    try {
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
    } catch (error) {
      throw error;
    }
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
      syncStatus: 'SYNCED',
      created_at: new Date(repo.created_at),
      updated_at: new Date(repo.updated_at),
    }));
  }

  async getRepository(nameOrId: string): Promise<Repository | null> {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('GitHub OAuth credentials not configured');
    }

    try {
      // Parse nameOrId which should be in format "owner/repo"
      const [owner, repo] = nameOrId.split('/');

      if (!owner || !repo) {
        throw new Error('Invalid repository identifier. Expected format: owner/repo');
      }

      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const repoData = await response.json();

      return {
        id: repoData.id.toString(),
        name: repoData.name,
        description: repoData.description,
        url: repoData.html_url,
        defaultBranch: repoData.default_branch,
        providerId: '', // This would need to be set by the caller
        owner: repoData.owner.login,
        isPrivate: repoData.private,
        syncStatus: 'PENDING',
        created_at: new Date(repoData.created_at),
        updated_at: new Date(repoData.updated_at),
      };
    } catch (error) {
      console.error('Error fetching GitHub repository:', error);
      return null;
    }
  }

  async syncRepository(repository: Repository): Promise<Repository> {
    // We need to get the provider separately since it's not part of the Repository type
    // This would need to be implemented based on how providers are stored/retrieved in your system
    const providerId = repository.providerId;

    // This is a placeholder - in a real implementation, you would fetch the provider using the providerId
    if (!providerId) {
      throw new Error('Provider ID not available');
    }

    try {
      // Get updated repository data
      const updatedRepo = await this.getRepository(`${repository.owner}/${repository.name}`);

      if (!updatedRepo) {
        throw new Error(`Repository not found: ${repository.name}`);
      }

      return {
        ...repository,
        ...updatedRepo,
        lastSyncedAt: new Date(),
        syncStatus: 'SYNCED',
      };
    } catch (error) {
      console.error('Error syncing GitHub repository:', error);
      return {
        ...repository,
        syncStatus: 'ERROR',
        lastSyncedAt: new Date(),
      };
    }
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

  async getUserRepositories(): Promise<Repository[]> {
    // This is a wrapper around listRepositories for compatibility with the interface
    // In a real implementation, you would need to get the provider from somewhere
    throw new Error('Method requires a provider - use listRepositories instead');
  }

  async testConnection(): Promise<boolean> {
    if (!this.clientId || !this.clientSecret) {
      return false;
    }

    try {
      // Simple check to see if we can access the API
      const response = await fetch('https://api.github.com/rate_limit', {
        headers: {
          Accept: 'application/json',
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Error testing GitHub connection:', error);
      return false;
    }
  }
}

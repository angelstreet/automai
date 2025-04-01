/**
 * OAuth helper functions for Git providers
 */

/**
 * Create a GitHub OAuth URL for authorization
 * @param providerId The ID of the Git provider to use as state
 * @returns The authorization URL
 */
export function createGithubOauthUrl(providerId: string): string {
  // Use either development or production GitHub client ID based on environment
  const clientId =
    process.env.NODE_ENV === 'development'
      ? process.env.GITHUB_DEV_CLIENT_ID || process.env.GITHUB_CLIENT_ID
      : process.env.GITHUB_CLIENT_ID;

  // Always use the current origin for the redirect URI
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const redirectUri = `${baseUrl}/api/git-providers/callback`;
  const scope = 'repo,read:user,user:email';

  // Create state with providerId and redirectUri for callback handling
  const stateData = Buffer.from(JSON.stringify({ providerId, redirectUri })).toString('base64');

  const params = new URLSearchParams({
    client_id: clientId || '',
    redirect_uri: redirectUri,
    scope,
    state: stateData,
    response_type: 'code',
  });

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

/**
 * Create a GitLab OAuth URL for authorization
 * @param providerId The ID of the Git provider to use as state
 * @returns The authorization URL
 */
export function createGitlabOauthUrl(providerId: string): string {
  const clientId = process.env.GITLAB_CLIENT_ID;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const redirectUri = `${baseUrl}/api/git-providers/callback`;

  // Create state with providerId and redirectUri for callback handling
  const stateData = Buffer.from(JSON.stringify({ providerId, redirectUri })).toString('base64');

  const scope = 'api read_api read_user read_repository';
  const params = new URLSearchParams({
    client_id: clientId || '',
    redirect_uri: redirectUri,
    scope,
    state: stateData,
    response_type: 'code',
  });

  return `https://gitlab.com/oauth/authorize?${params.toString()}`;
}
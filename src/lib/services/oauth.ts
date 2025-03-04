/**
 * OAuth helper functions for Git providers
 */

/**
 * Create a GitHub OAuth URL for authorization
 * @param providerId The ID of the Git provider to use as state
 * @returns The authorization URL
 */
export function createGithubOauthUrl(providerId: string): string {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/github`;
  const scope = 'repo,read:user,user:email';
  
  const params = new URLSearchParams({
    client_id: clientId || '',
    redirect_uri: redirectUri,
    scope,
    state: providerId,
    response_type: 'code'
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
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/gitlab`;
  const scope = 'api read_api read_user read_repository';
  
  const params = new URLSearchParams({
    client_id: clientId || '',
    redirect_uri: redirectUri,
    scope,
    state: providerId,
    response_type: 'code'
  });
  
  return `https://gitlab.com/oauth/authorize?${params.toString()}`;
} 
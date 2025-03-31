/**
 * Main types export file
 * Re-exports commonly used types from their new locations
 */

// Core types
export { Host, HostStatus, HostConnectionType } from './core/host';
export { Repository, Deployment, DeploymentStatus } from './core/deployment';

// Auth types
export { User, Role, TeamMember, UserTeam, ResourceLimit } from './auth/user';
export { AuthSession, SessionData, AuthResult, OAuthProvider, Tenant } from './auth/session';

// API types
export { GitProvider, GitProviderType } from './api/git/common';
export { GitHubRepository, GitHubFile } from './api/git/github';
export { GitLabRepository, GitLabFile } from './api/git/gitlab';

// Re-export types from the legacy locations for backward compatibility
// These will be removed progressively as imports are updated
export * from './context/host-new';
export * from './context/deployment-new';

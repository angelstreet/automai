/**
 * Main types export file
 * Re-exports commonly used types from their component locations
 * IMPORTANT: For most cases, prefer importing directly from the specific type file
 * This file is primarily for convenience in cases where you need many component entity types
 */

// Component entity types - use for data models and database entities
export { 
  Host, 
  HostStatus, 
  HostConnectionType, 
  VMType, 
  VMConfig,
  HostFormData,
  HostConnectionStatus,
  HostAnalytics
} from './component/hostComponentType';

export { 
  Repository, 
  GitProvider, 
  GitProviderType,
  RepositorySyncStatus,
  GitProviderStatus,
  RepositoryFile,
  CreateGitProviderParams,
  CreateRepositoryParams
} from './component/repositoryComponentType';

export { 
  Deployment, 
  DeploymentStatus, 
  DeploymentHost,
  DeploymentScript,
  LogEntry,
  DeploymentFormData,
  DeploymentConfig,
  DeploymentData
} from './component/deploymentComponentType';

export { 
  CICDProvider, 
  CICDJob, 
  CICDBuild, 
  CICDProviderType,
  CICDAuthType,
  CICDCredentials,
  CICDProviderConfig,
  CICDProviderPayload
} from './component/cicdComponentType';

export { 
  User, 
  Role, 
  UserTeam, 
  TeamMember, 
  ResourceLimit,
  UIRole,
  AuthUser,
  UserSession,
  Tenant,
  AuthSession,
  SessionData,
  AuthResult,
  OAuthProvider,
  mapAuthUserToUser
} from './component/userComponentType';

export type {
  WebSocketConnection,
  SSHAuthData, 
  SSHConfig, 
  SSHExecutionResult,
  SSHError
} from './component/sshComponentType';

export type { 
  Script, 
  ScriptRun, 
  ScriptStatus, 
  ScriptLanguage,
  ScriptFilter
} from './component/scriptsComponentType';

export type { 
  PlanType, 
  PlanFeatures 
} from './component/featuresComponentType';

// We do NOT export context types from here to encourage importing directly
// from the specific context file when needed. This enforces better code organization.

// API types - import from here only when working with API responses
export type { GitHubRepository, GitHubFile } from './api/githubApiType';
export type { GitLabRepository, GitLabFile } from './api/gitlabApiType';
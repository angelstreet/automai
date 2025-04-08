/**
 * Main types export file
 * Re-exports commonly used types from their specific locations
 * 
 * IMPORTANT: For most cases, prefer importing directly from the specific type file
 * This file is primarily for convenience in cases where you need many entity types
 */

// ----------------------------------------------------------------------------
// Base and Utility Types
// ----------------------------------------------------------------------------
export {
  BaseEntity,
  ApiResponse,
  PaginationParams,
  PaginatedResult,
  SortingParams,
  FilterParams,
  QueryParams,
  DateRange,
  ResultStatus,
  NamedResource,
} from './base-types';

// ----------------------------------------------------------------------------
// Core Entity Types
// ----------------------------------------------------------------------------

// Host types
export {
  Host,
  HostStatus,
  HostConnectionType,
  VMType,
  VMConfig,
  HostFormData,
  HostConnectionStatus,
  HostAnalytics,
} from './host-types';

// Repository types
export {
  Repository,
  GitProvider,
  GitProviderType,
  RepositorySyncStatus,
  GitProviderStatus,
  RepositoryFile,
  CreateGitProviderParams,
  CreateRepositoryParams,
  RepositoryBranch,
  RepositoryCommit,
} from './repository-types';

// Deployment types
export {
  Deployment,
  DeploymentStatus,
  DeploymentHost,
  DeploymentScript,
  LogEntry,
  DeploymentFormData,
  DeploymentConfig,
  DeploymentData,
} from './deployment-types';

// CICD types
export {
  CICDProvider,
  CICDJob,
  CICDBuild,
  CICDProviderType,
  CICDAuthType,
  CICDCredentials,
  CICDProviderConfig,
  CICDProviderPayload,
  CICDBuildStatus,
  CICDParameter,
  CICDJobParameter,
} from './cicd-types';

// User types
export {
  User,
  AuthUser,
  Role,
  UIRole,
  UserSession,
  UserTeam,
  ResourceLimit,
  Tenant,
  AuthSession,
  SessionData,
  AuthResult,
  OAuthProvider,
} from './user-types';

// Team types
export {
  Team,
  TeamWithMembers,
  TeamMember,
  TeamInvitation,
  CreateTeamInput,
  UpdateTeamInput,
  AddTeamMemberInput,
  UpdateTeamMemberInput,
  TeamPermission,
  TeamResource,
} from './team-types';

// ----------------------------------------------------------------------------
// Dashboard Context Types (for convenience)
// ----------------------------------------------------------------------------
export {
  ActivityItem,
  Task,
  Stats,
  ChatMessage,
  DashboardTeam,
  DashboardContext,
  DashboardContextData,
  DashboardContextActions,
} from './dashboard-context';

// ----------------------------------------------------------------------------
// Common Database Types
// ----------------------------------------------------------------------------

// Common DB types
export { Json, BaseRow } from './db-common';

// Database Tables
export { HostsTable, HostLogsTable, HostAnalyticsTable } from './db-hosts';
export { AccountsTable, UsersTable, SessionsTable } from './db-auth';
export { GitProvidersTable, RepositoriesTable, RepositoryFilesTable } from './db-git';

/**
 * @example
 * // Prefer importing from specific files
 * import { Host, HostStatus } from '@/types-new/host-types';
 * import { CICDProvider } from '@/types-new/cicd-types';
 * 
 * // Use index imports only when needing multiple entity types
 * import { Host, Repository, Deployment } from '@/types-new';
 * 
 * // Always import context types directly
 * import { DashboardContext } from '@/types-new/dashboard-context';
 */

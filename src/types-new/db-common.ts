/**
 * Common database types shared across tables
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

/**
 * Base row interface with common fields for all database tables
 */
export interface BaseRow {
  id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Database schema structure aligned with Supabase schema
 * This provides the comprehensive database structure as documented in the schema
 */
export interface Database {
  public: {
    Tables: {
      // Core identity and organizational tables
      profiles: ProfilesTable;
      tenants: TenantsTable;
      teams: TeamsTable;
      team_members: TeamMembersTable;

      // Permission and access control tables
      permission_matrix: PermissionMatrixTable;
      role_templates: RoleTemplatesTable;

      // Resource tables
      hosts: HostsTable;
      host_logs: HostLogsTable;
      host_analytics: HostAnalyticsTable;
      host_events: HostEventsTable;
      host_metrics: HostMetricsTable;

      // Git and repository tables
      git_providers: GitProvidersTable;
      repositories: RepositoriesTable;
      repository_files: RepositoryFilesTable;
      profile_repository_pins: ProfileRepositoryPinsTable;

      // Deployment tables
      deployments: DeploymentsTable;
      deployment_logs: DeploymentLogsTable;
      // Subscription and resource management
      subscription_tiers: SubscriptionTiersTable;
      resource_limits: ResourceLimitsTable;
    };
    Views: {
      [key: string]: unknown;
    };
    Functions: {
      check_permission: {
        Args: {
          p_profile_id: string;
          p_team_id: string;
          p_resource_type: string;
          p_operation: string;
          p_is_own_resource?: boolean;
        };
        Returns: boolean;
      };
      get_user_teams: {
        Args: {
          p_profile_id: string;
        };
        Returns: TeamsTable[];
      };
    };
  };
  auth: {
    Tables: {
      users: UsersTable;
      identities: IdentitiesTable;
      sessions: SessionsTable;
      refresh_tokens: RefreshTokensTable;
      mfa_factors: unknown;
      mfa_challenges: unknown;
      mfa_amr_claims: unknown;
      flow_state: unknown;
      sso_providers: unknown;
      saml_providers: unknown;
      one_time_tokens: unknown;
      audit_log_entries: unknown;
    };
    Views: {
      [key: string]: unknown;
    };
    Functions: {
      [key: string]: unknown;
    };
  };
  storage: {
    Tables: {
      buckets: BucketsTable;
      objects: ObjectsTable;
      s3_multipart_uploads: unknown;
      s3_multipart_uploads_parts: unknown;
    };
    Views: {
      [key: string]: unknown;
    };
    Functions: {
      [key: string]: unknown;
    };
  };
  realtime: {
    Tables: {
      subscription: unknown;
      messages: unknown;
    };
    Views: {
      [key: string]: unknown;
    };
    Functions: {
      [key: string]: unknown;
    };
  };
  pgsodium: {
    Tables: {
      key: unknown;
    };
    Views: {
      [key: string]: unknown;
    };
    Functions: {
      [key: string]: unknown;
    };
  };
  vault: {
    Tables: {
      secrets: unknown;
    };
    Views: {
      [key: string]: unknown;
    };
    Functions: {
      [key: string]: unknown;
    };
  };
  supabase_migrations: {
    Tables: {
      schema_migrations: unknown;
      seed_files: unknown;
    };
    Views: {
      [key: string]: unknown;
    };
    Functions: {
      [key: string]: unknown;
    };
  };
}

// These are declaration references for type-checking only
// Import from appropriate type files when using these types
export type ProfilesTable = any;
export type TenantsTable = any;
export type TeamsTable = any;
export type TeamMembersTable = any;
export type PermissionMatrixTable = any;
export type RoleTemplatesTable = any;

export type HostsTable = any;
export type HostLogsTable = any;
export type HostAnalyticsTable = any;
export type HostEventsTable = any;
export type HostMetricsTable = any;

export type GitProvidersTable = any;
export type RepositoriesTable = any;
export type RepositoryFilesTable = any;
export type ProfileRepositoryPinsTable = any;

export type CICDProvidersTable = any;
export type CICDJobsTable = any;
export type CICDBuildsTable = any;

export type DeploymentsTable = any;
export type DeploymentLogsTable = any;
export type DeploymentCICDMappingsTable = any;

export type SubscriptionTiersTable = any;
export type ResourceLimitsTable = any;

export type UsersTable = any;
export type IdentitiesTable = any;
export type SessionsTable = any;
export type RefreshTokensTable = any;

export type BucketsTable = any;
export type ObjectsTable = any;

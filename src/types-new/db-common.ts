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
 * Database schema type structure
 * This is a placeholder - the actual implementation would include
 * references to all table types
 */
export interface Database {
  auth: {
    accounts: AccountsTable;
    users: UsersTable;
    sessions: SessionsTable;
  };
  public: {
    hosts: HostsTable;
    repositories: RepositoriesTable;
    git_providers: GitProvidersTable;
    deployments: DeploymentsTable;
    cicd_providers: CICDProvidersTable;
    teams: TeamsTable;
    team_members: TeamMembersTable;
    // Add other tables as needed
  };
}

// These are placeholder references - they'll be properly defined in their respective files
export type AccountsTable = any;
export type UsersTable = any;
export type SessionsTable = any;
export type HostsTable = any;
export type RepositoriesTable = any;
export type GitProvidersTable = any;
export type DeploymentsTable = any;
export type CICDProvidersTable = any;
export type TeamsTable = any;
export type TeamMembersTable = any;

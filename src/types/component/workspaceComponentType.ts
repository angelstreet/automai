/**
 * Workspace component types
 * Types for the workspace component and related entities
 */

export type Workspace = {
  id: string;
  profile_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  workspace_type?: 'private' | 'team' | 'default';
  team_id?: string | null;
};

export type WorkspaceMapping = {
  repository_id?: string;
  config_id?: string;
  host_id?: string;
  workspace_id: string;
};

export interface CreateWorkspaceParams {
  name: string;
  description?: string;
}

export interface WorkspaceSelectorProps {
  className?: string;
}

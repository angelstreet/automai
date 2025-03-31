/**
 * GitLab-specific type definitions
 */
import { GitRepository, GitFile, GitBranch } from './common';

/**
 * GitLab-specific repository fields
 */
export interface GitLabRepository extends GitRepository {
  // GitLab uses 'path_with_namespace' as full_name
  path_with_namespace: string;
  // GitLab-specific properties
  visibility: 'private' | 'internal' | 'public';
  star_count?: number;
  forks_count?: number;
  web_url: string;
  ssh_url_to_repo: string;
  http_url_to_repo: string;
  namespace: {
    id: number;
    name: string;
    path: string;
    kind: string;
    full_path: string;
  };
  _links?: {
    self: string;
    issues: string;
    merge_requests: string;
    repo_branches: string;
    labels: string;
    events: string;
    members: string;
  };
  readme_url?: string;
  avatar_url?: string;
  shared_runners_enabled?: boolean;
  open_issues_count?: number;
  last_activity_at?: string;
}

/**
 * GitLab-specific file properties
 */
export interface GitLabFile extends GitFile {
  id: string;
  mode: string;
  web_url: string;
}

/**
 * GitLab-specific file content response
 */
export interface GitLabFileContent {
  file_name: string;
  file_path: string;
  size: number;
  encoding: string;
  content: string;
  content_sha256: string;
  ref: string;
  blob_id: string;
  commit_id: string;
  last_commit_id: string;
}

/**
 * GitLab-specific branch properties
 */
export interface GitLabBranch extends GitBranch {
  merged: boolean;
  default: boolean;
  web_url: string;
  developers_can_push: boolean;
  developers_can_merge: boolean;
}

/**
 * GitLab API authentication details
 */
export interface GitLabAuth {
  token: string;
  type: 'oauth' | 'personal';
  expires_at?: string;
}

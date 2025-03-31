/**
 * CI/CD Providers types
 */
import { AuthUser } from '../user';

export type CICDProviderType = 'jenkins' | 'github' | 'gitlab' | 'azure_devops';

export type CICDAuthType = 'token' | 'basic_auth' | 'oauth';

export interface CICDCredentials {
  username?: string;
  password?: string;
  token?: string;
}

export interface CICDProviderConfig {
  auth_type: CICDAuthType;
  credentials: CICDCredentials;
}

export interface CICDProvider {
  id: string;
  tenant_id: string;
  name: string;
  type: CICDProviderType;
  url: string;
  config: CICDProviderConfig;
  status?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface CICDProviderPayload {
  id?: string;
  name: string;
  type: CICDProviderType;
  url: string;
  config: {
    auth_type: CICDAuthType;
    credentials: CICDCredentials;
  };
}

/**
 * Results from server actions
 */
export interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CICDProviderListResult extends ActionResult {
  data: CICDProvider[];
}

export interface CICDProviderActionResult extends ActionResult {
  data?: CICDProvider;
}

/**
 * Job types
 */
export interface CICDJob {
  id: string;
  name: string;
  provider_id: string;
  job_path: string;
  parameters?: Record<string, any>;
}

export interface CICDBuild {
  id: string;
  job_id: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  start_time: string;
  end_time?: string;
  logs?: string;
}

// Provider type definitions
export interface CICDProviderType {
  id: string;
  name: string;
  type: string;
  url: string;
  token?: string;
  config?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  tenant_id?: string;
}

// For backwards compatibility with existing code from @/types/context/cicd
// This helps components that were using the old CICDProvider type
export interface CICDProvider extends CICDProviderType {
  updated_by?: string; // Required by existing components
}

export interface CICDProviderPayload {
  id?: string;
  name: string;
  type: string;
  url: string;
  token?: string;
  config?: Record<string, any>;
}

// Job related types
export interface CICDJob {
  id: string;
  name: string;
  provider_id: string;
  status?: string;
  config?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

// Build related types
export interface CICDBuild {
  id: string;
  job_id: string;
  status: string;
  started_at?: string;
  finished_at?: string;
  logs?: string;
}

// Action result type for consistent responses
export interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// For backwards compatibility with existing code
export type CICDProviderListResult = ActionResult<CICDProviderType[]>;
export type CICDProviderActionResult = ActionResult<CICDProviderType>;

// Context state interface
export interface CICDData {
  providers: CICDProviderType[];
  jobs: CICDJob[];
  builds: CICDBuild[];
  selectedProvider: CICDProviderType | null;
  selectedJob: CICDJob | null;
  loading: boolean;
  error: string | null;
  currentUser: AuthUser | null;
}

// Context actions interface
export interface CICDActions {
  fetchProviders: () => Promise<ActionResult<CICDProviderType[]>>;
  getProviderById: (id: string) => Promise<CICDProviderType | null>;
  createProvider: (payload: CICDProviderPayload) => Promise<ActionResult<CICDProviderType>>;
  updateProvider: (
    id: string,
    payload: CICDProviderPayload,
  ) => Promise<ActionResult<CICDProviderType>>;
  deleteProvider: (id: string) => Promise<ActionResult>;
  testProvider: (provider: CICDProviderPayload) => Promise<ActionResult>;
  fetchJobs: () => Promise<CICDJob[]>;
  getJobById: (id: string) => Promise<CICDJob | null>;
  triggerJob: (jobId: string) => Promise<ActionResult>;
  getBuildStatus: (buildId: string) => Promise<string | null>;
  getBuildLogs: (buildId: string) => Promise<string>;
  fetchUserData: () => Promise<AuthUser | null>;
  setSelectedProvider: (provider: CICDProviderType | null) => void;
  setSelectedJob: (job: CICDJob | null) => void;
  refreshUserData: () => Promise<AuthUser | null>;
}

// Combined context type that includes both state and actions
export interface CICDContextType extends CICDData, CICDActions {}

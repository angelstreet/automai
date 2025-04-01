/**
 * CI/CD Context types
 */
import { AuthUser } from '../service/userServiceType';
import {
  CICDProvider,
  CICDProviderType as CoreCICDProviderType,
  CICDProviderPayload,
  CICDJob,
  CICDBuild,
  CICDAuthType,
  CICDCredentials,
  CICDProviderConfig
} from '../component/cicdComponentType';

// Export core types for convenience
export type {
  CICDAuthType,
  CICDCredentials,
  CICDProviderConfig
};

// For backwards compatibility with existing code
export type CICDProviderType = CoreCICDProviderType;

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

// Context state interface
export interface CICDData {
  providers: CICDProvider[];
  jobs: CICDJob[];
  builds: CICDBuild[];
  selectedProvider: CICDProvider | null;
  selectedJob: CICDJob | null;
  loading: boolean;
  error: string | null;
  currentUser: AuthUser | null;
}

// Context actions interface
export interface CICDActions {
  fetchProviders: () => Promise<ActionResult<CICDProvider[]>>;
  getProviderById: (id: string) => Promise<CICDProvider | null>;
  createProvider: (payload: CICDProviderPayload) => Promise<ActionResult<CICDProvider>>;
  updateProvider: (
    id: string,
    payload: CICDProviderPayload,
  ) => Promise<ActionResult<CICDProvider>>;
  deleteProvider: (id: string) => Promise<ActionResult>;
  testProvider: (provider: CICDProviderPayload) => Promise<ActionResult>;
  fetchJobs: () => Promise<CICDJob[]>;
  getJobById: (id: string) => Promise<CICDJob | null>;
  triggerJob: (jobId: string) => Promise<ActionResult>;
  getBuildStatus: (buildId: string) => Promise<string | null>;
  getBuildLogs: (buildId: string) => Promise<string>;
  fetchUserData: () => Promise<AuthUser | null>;
  setSelectedProvider: (provider: CICDProvider | null) => void;
  setSelectedJob: (job: CICDJob | null) => void;
  refreshUserData: () => Promise<AuthUser | null>;
}

// Combined context type that includes both state and actions
export interface CICDContextType extends CICDData, CICDActions {}
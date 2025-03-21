import { AuthUser } from '@/types/user';
import { 
  CICDProvider, 
  CICDProviderPayload, 
  CICDJob, 
  CICDBuild,
  ActionResult,
  CICDProviderListResult,
  CICDProviderActionResult
} from '@/types/cicd';

/**
 * CICD data interface - contains all state
 */
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

/**
 * CICD actions interface - contains all functions
 */
export interface CICDActions {
  // Provider actions
  fetchProviders: () => Promise<CICDProviderListResult>;
  getProviderById: (id: string) => Promise<CICDProvider | null>;
  createProvider: (payload: CICDProviderPayload) => Promise<CICDProviderActionResult>;
  updateProvider: (id: string, payload: CICDProviderPayload) => Promise<CICDProviderActionResult>;
  deleteProvider: (id: string) => Promise<ActionResult>;
  testProvider: (provider: CICDProviderPayload) => Promise<ActionResult>;
  
  // Job actions
  fetchJobs: (providerId: string) => Promise<CICDJob[]>;
  getJobById: (jobId: string) => Promise<CICDJob | null>;
  triggerJob: (jobId: string, parameters?: Record<string, any>) => Promise<ActionResult>;
  
  // Build actions
  getBuildStatus: (jobId: string, buildId: string) => Promise<CICDBuild | null>;
  getBuildLogs: (jobId: string, buildId: string) => Promise<string>;
  
  // User management
  fetchUserData: () => Promise<AuthUser | null>;
  
  // UI state management
  setSelectedProvider: (provider: CICDProvider | null) => void;
  setSelectedJob: (job: CICDJob | null) => void;
}

/**
 * Combined CICD context type
 */
export interface CICDContextType extends CICDData, CICDActions {} 
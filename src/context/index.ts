// Main context exports - providing a unified access point for all context
// Step 1: Enforce single source of truth for context access
// Export ONLY hooks from AppContext to ensure consistent access pattern
export { AppProvider } from './AppContext';

// Re-export hooks with type checks to ensure proper usage
export {
  useUser,
  useHost,
  useDeployment,
  useRepository,
  useCICD,
  useAppContext,
} from './AppContext';

// Export types for context usage
export type { AppContextType } from '@/types/context/app';
export type { UserContextType } from '@/types/context/user';
export type { HostContextType } from '@/types/context/host';
export type { DeploymentContextType } from '@/types/context/deployment';
export type { RepositoryContextType } from '@/types/context/repository';
export type { CICDContextType } from '@/types/context/cicd';

// IMPORTANT: All individual context files are now managed through AppContext
// Do not import directly from HostContext, UserContext, etc.
// Instead use the hooks exported above (useUser, useHost, etc.)

// Types should be imported directly from their source files when needed

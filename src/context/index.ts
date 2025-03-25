// Main context exports - providing a unified access point for all contexts
// -------------------------------------------------
// IMPORTANT: This is the ONLY file that should be imported
// when accessing context in components.
//
// Always import from '@/context', not from individual context files:
// ✅ import { useUser, useHost } from '@/context';
// ❌ import { useUser } from '@/context/UserContext';
// -------------------------------------------------

// Export the root provider that composes all other providers
export { CoreProvider, createContextProvider } from './AppContext';

// Export specialized context providers
export { 
  HostContextProvider,
  RepositoryContextProvider,
  DeploymentContextProvider,
  CICDContextProvider,
  FullContextProvider
} from './AppContext';

// Re-export hooks with standardized naming for consistency
export {
  useAppContext, // Access to all contexts at once (use sparingly)
  useUser, // User profile and authentication
  useHost, // Host management and connection
  useDeployment, // Deployment operations and status
  useRepository, // Code repository management
  useCICD, // CI/CD pipeline management
} from './AppContext';

// Export sidebar context hook
export { useSidebar } from './SidebarContext';

// Export theme context hook
export { useTheme } from './ThemeContext';

// We're not using the Direct suffix pattern in our simplified architecture

// For case where the root AppProvider is not used, export individual providers
// This is not recommended for normal use, but provided for flexibility
export { UserProvider } from './UserContext';
export { HostProvider } from './HostContext';
export { DeploymentProvider } from './DeploymentContext';
export { RepositoryProvider } from './RepositoryContext';
export { CICDProvider } from './CICDContext';
export { SidebarProvider } from './SidebarContext';
export { ThemeProvider } from './ThemeContext';

// Export types for context usage
export type { AppContextType } from '@/types/context/app';
export type { UserContextType } from '@/types/context/user';
export type { HostContextType } from '@/types/context/host';
export type { DeploymentContextType } from '@/types/context/deployment';
export type { RepositoryContextType } from '@/types/context/repository';
export type { CICDContextType } from '@/types/context/cicd';
export type { SidebarContext as SidebarContextType } from '@/types/sidebar';
export type { ThemeContextType } from './ThemeContext';

// Export context state types for component usage
export type { User, Role, AuthUser } from '@/types/user';

// Selector functions for optimized context usage
// These help reduce unnecessary re-renders by selecting specific parts of context
export const userSelectors = {
  // Get just the user data without subscribing to loading state changes
  userData: (context: UserContextType) => context.user,

  // Get just the user tenant info
  userTenant: (context: UserContextType) => context.user?.tenant_name,

  // Get just the user role
  userRole: (context: UserContextType) => context.user?.role,

  // Get loading state only
  isLoading: (context: UserContextType) => context.loading,
};

// Repository selectors for optimized component rendering
export const repositorySelectors = {
  // Get just the repositories list
  repositories: (context: RepositoryContextType) => context.repositories,

  // Get just the starred repositories
  starredRepositories: (context: RepositoryContextType) => context.starredRepositories,

  // Get just the filtered repositories
  filteredRepositories: (context: RepositoryContextType) => context.filteredRepositories,

  // Get loading state only
  isLoading: (context: RepositoryContextType) => context.loading,

  // Get repository count
  count: (context: RepositoryContextType) => context.repositories.length,
};

// Deployment selectors for optimized component rendering
export const deploymentSelectors = {
  // Get just the deployments list
  deployments: (context: DeploymentContextType) => context.deployments,

  // Get sorted deployments (most recent first)
  recentDeployments: (context: DeploymentContextType) =>
    [...context.deployments].sort(
      (a, b) =>
        new Date(b.createdAt || Date.now()).getTime() -
        new Date(a.createdAt || Date.now()).getTime(),
    ),

  // Get just active deployments
  activeDeployments: (context: DeploymentContextType) =>
    context.deployments.filter((d) => d.status === 'running' || d.status === 'queued'),

  // Get completed deployments
  completedDeployments: (context: DeploymentContextType) =>
    context.deployments.filter((d) => d.status === 'success'),

  // Get failed deployments
  failedDeployments: (context: DeploymentContextType) =>
    context.deployments.filter((d) => d.status === 'failed' || d.status === 'aborted'),

  // Get loading state only
  isLoading: (context: DeploymentContextType) => context.loading,

  // Get repository list
  repositories: (context: DeploymentContextType) => context.repositories || [],
};

// CICD selectors for optimized component rendering
export const cicdSelectors = {
  // Get just the providers list
  providers: (context: CICDContextType) => context.providers || [],

  // Get just the jobs list
  jobs: (context: CICDContextType) => context.jobs || [],

  // Get just the selected provider
  selectedProvider: (context: CICDContextType) => context.selectedProvider,

  // Get just the selected job
  selectedJob: (context: CICDContextType) => context.selectedJob,

  // Get providers by type
  providersByType: (context: CICDContextType, type: string) =>
    context.providers.filter((p) => p.type === type),

  // Get loading state only
  isLoading: (context: CICDContextType) => context.loading,

  // Get error state only
  error: (context: CICDContextType) => context.error,

  // Get provider count
  providerCount: (context: CICDContextType) => context.providers.length,

  // Get jobs count
  jobCount: (context: CICDContextType) => context.jobs.length,
};

// IMPORTANT USAGE NOTES:
// -------------------------------------------------
// 1. All contexts should be accessed through the hooks exported from this file
//    Do not import directly from HostContext, UserContext, etc.
//    Instead use the hooks exported from this file.
//
// 2. When using multiple contexts in a component, get them individually:
//    const userContext = useUser();
//    const hostContext = useHost();
//
// 3. Use selectors for performance-critical components:
//    const userTenant = useUser((ctx) => ctx.user?.tenant_name);
//
// 4. Context values are memoized to prevent unnecessary re-renders,
//    but be careful with objects and arrays in your component state.
//
// 5. Always handle potential null/undefined context values:
//    const { user } = useUser();
//    if (!user) {
//      return <LoadingState />;
//    }
// -------------------------------------------------

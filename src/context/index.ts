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
export { AppProvider } from './AppContext';

// Re-export hooks with standardized naming for consistency
// These hooks come from AppContext which routes to the appropriate context
export {
  useAppContext, // Access to all contexts at once (use sparingly)
  useUser,       // User profile and authentication 
  useHost,       // Host management and connection
  useDeployment, // Deployment operations and status
  useRepository, // Code repository management
  useCICD,       // CI/CD pipeline management
} from './AppContext';

// Export individual context hooks directly for cases where AppContext is not used
// These are aliased to standardized names for consistency across the codebase
import { useUser as useUserDirectHook } from './UserContext';
export const useUserDirect = useUserDirectHook;

// For case where the root AppProvider is not used, export individual providers
// This is not recommended for normal use, but provided for flexibility
export { UserProvider } from './UserContext';
export { HostProvider } from './HostContext';
export { DeploymentProvider } from './DeploymentContext';
export { RepositoryProvider } from './RepositoryContext';
export { CICDProvider } from './CICDContext';

// Export types for context usage
export type { AppContextType } from '@/types/context/app';
export type { UserContextType } from '@/types/context/user';
export type { HostContextType } from '@/types/context/host';
export type { DeploymentContextType } from '@/types/context/deployment';
export type { RepositoryContextType } from '@/types/context/repository';
export type { CICDContextType } from '@/types/context/cicd';

// Export context state types for component usage
export type { 
  User, 
  Role, 
  AuthUser 
} from '@/types/user';

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

// IMPORTANT USAGE NOTES:
// -------------------------------------------------
// 1. All individual context files are managed through AppContext
//    Do not import directly from HostContext, UserContext, etc.
//    Instead use the hooks exported from this file.
//
// 2. When using multiple contexts in a component, get them individually:
//    const userContext = useUser();
//    const hostContext = useHost();
//    
//    ❌ AVOID: const { user, host } = useAppContext(); // Causes more re-renders
//
// 3. Use selectors for performance-critical components:
//    const userTenant = useUser((ctx) => ctx.user?.tenant_name);
//
// 4. Context values are memoized to prevent unnecessary re-renders,
//    but be careful with objects and arrays in your component state.
// -------------------------------------------------

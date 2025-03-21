// Step 1: Enforce single source of truth for context access
// Export ONLY hooks from AppContext to ensure consistent access pattern
export { 
  useUser, 
  useHost, 
  useDeployment, 
  useRepository, 
  useCICD,
  AppProvider
} from './AppContext';

// IMPORTANT: Do not import directly from individual context files
// All components must use these central exports

// Note: DO NOT export context components directly from their original files
// This forces all components to use the centralized hooks through AppContext

// IMPORTANT: All individual context files are now managed through AppContext
// Do not import directly from HostContext, UserContext, etc.
// Instead use the hooks exported above (useUser, useHost, etc.)

// Types should be imported directly from their source files when needed 
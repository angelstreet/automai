// Navigation Editor Provider (wraps all focused contexts)
export { NavigationEditorProvider } from './NavigationEditorProvider';

// Focused Navigation Contexts
export { NavigationNodesProvider, useNavigationNodes } from './NavigationNodesContext';
export { NavigationUIProvider, useNavigationUI } from './NavigationUIContext';
export { NavigationFlowProvider, useNavigationFlow } from './NavigationFlowContext';
export { NavigationActionsProvider, useNavigationActions } from './NavigationActionsContext';

// Legacy Navigation Contexts (moved from parent directory)
export { NavigationStateProvider } from './NavigationStateContext';
export { NavigationConfigProvider, useNavigationTreeControl } from './NavigationConfigContext';
export { NodeEdgeManagementProvider, useNodeEdgeManagement } from './NodeEdgeManagementContext';

// Export types from centralized location
export type {
  NavigationActionsContextType,
  NavigationUIContextType,
  NavigationNodesContextType,
  NavigationFlowContextType,
  NavigationEditorProviderProps,
  NodeEdgeManagementContextType,
} from '../../types/pages/NavigationContext_Types';

export type {
  NavigationConfigContextType,
  NavigationConfigState,
  TreeLockInfo,
  LockStatusResponse,
} from '../../types/pages/NavigationConfig_Types';

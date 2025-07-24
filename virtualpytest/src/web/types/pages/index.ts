// =====================================================
// NAVIGATION TYPES - CENTRALIZED EXPORTS
// =====================================================

// Core navigation types
export * from './Navigation_Types';

// Configuration and lock management types
export * from './NavigationConfig_Types';

// Context types (Actions, UI, Nodes, Flow, etc.)
export * from './NavigationContext_Types';

// Re-export for convenience
export type {
  // Core types
  UINavigationNode,
  UINavigationEdge,
  UINavigationNodeData,
  UINavigationEdgeData,
  NavigationTreeData,
  NodeForm,
  EdgeForm,

  // Config types
  NavigationConfigContextType,
  NavigationConfigState,
  NavigationConfigProviderProps,
  TreeLockInfo,
  LockStatusResponse,
  TreeSaveRequest,
  TreeLoadResponse,

  // Context types
  NavigationActionsContextType,
  NavigationActionsProviderProps,
  NavigationUIContextType,
  NavigationUIProviderProps,
  NavigationNodesContextType,
  NavigationNodesProviderProps,
  NavigationFlowContextType,
  NavigationFlowProviderProps,
  NavigationEditorProviderProps,
  NodeEdgeManagementContextType,
  NodeEdgeManagementProviderProps,
} from './Navigation_Types';

// Export all page types
export * from './UserInterface_Types';
export * from './TestCase_Types';
export * from './Models_Types';
export * from './Monitoring_Types';

import { UINavigationNode, UINavigationEdge, NodeForm, EdgeForm } from './Navigation_Types';

// =====================================================
// NAVIGATION ACTIONS CONTEXT TYPES
// =====================================================

export interface NavigationActionsContextType {
  // Action coordination
  resetAll: () => void;
  resetSelectionAndDialogs: () => void;

  // UI coordination
  openNodeDialog: (node?: any) => void;
  openEdgeDialog: (edge?: any) => void;
  closeAllDialogs: () => void;

  // State coordination
  markUnsavedChanges: () => void;
  clearUnsavedChanges: () => void;

  // Navigation coordination
  resetToHome: () => void;

  // Flow coordination
  fitViewToNodes: () => void;
}

export interface NavigationActionsProviderProps {
  children: React.ReactNode;
}

// =====================================================
// NAVIGATION UI CONTEXT TYPES
// =====================================================

export interface NavigationUIContextType {
  // Dialog states
  isNodeDialogOpen: boolean;
  setIsNodeDialogOpen: (open: boolean) => void;
  isEdgeDialogOpen: boolean;
  setIsEdgeDialogOpen: (open: boolean) => void;
  isDiscardDialogOpen: boolean;
  setIsDiscardDialogOpen: (open: boolean) => void;

  // Form states
  isNewNode: boolean;
  setIsNewNode: (isNew: boolean) => void;
  nodeForm: NodeForm;
  setNodeForm: (form: NodeForm) => void;
  edgeForm: EdgeForm;
  setEdgeForm: (form: EdgeForm) => void;

  // Loading and error states
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  success: string | null;
  setSuccess: (success: string | null) => void;

  // Save states
  isSaving: boolean;
  setIsSaving: (saving: boolean) => void;
  saveError: string | null;
  setSaveError: (error: string | null) => void;
  saveSuccess: boolean;
  setSaveSuccess: (success: boolean) => void;
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (hasChanges: boolean) => void;

  // Interface loading state
  isLoadingInterface: boolean;
  setIsLoadingInterface: (loading: boolean) => void;

  // Callback functions
  resetForms: () => void;
  resetDialogs: () => void;
}

export interface NavigationUIProviderProps {
  children: React.ReactNode;
}

// =====================================================
// NAVIGATION NODES CONTEXT TYPES
// =====================================================

export interface NavigationNodesContextType {
  // Node/Edge state
  nodes: UINavigationNode[];
  edges: UINavigationEdge[];
  setNodes: (nodes: UINavigationNode[]) => void;
  setEdges: (edges: UINavigationEdge[]) => void;

  // Selection state
  selectedNode: UINavigationNode | null;
  selectedEdge: UINavigationEdge | null;
  setSelectedNode: (node: UINavigationNode | null) => void;
  setSelectedEdge: (edge: UINavigationEdge | null) => void;

  // Initial state tracking
  initialState: { nodes: UINavigationNode[]; edges: UINavigationEdge[] } | null;
  setInitialState: (state: { nodes: UINavigationNode[]; edges: UINavigationEdge[] } | null) => void;

  // Utility methods
  resetSelection: () => void;
  resetToInitialState: () => void;
  hasChanges: () => boolean;
}

export interface NavigationNodesProviderProps {
  children: React.ReactNode;
}

// =====================================================
// NAVIGATION FLOW CONTEXT TYPES
// =====================================================

export interface NavigationFlowContextType {
  // ReactFlow instance
  reactFlowInstance: any;
  setReactFlowInstance: (instance: any) => void;

  // Navigation state
  currentTreeId: string;
  currentTreeName: string;
  setCurrentTreeId: (id: string) => void;
  setCurrentTreeName: (name: string) => void;

  // Navigation path tracking
  navigationPath: string[];
  navigationNamePath: string[];
  setNavigationPath: (path: string[]) => void;
  setNavigationNamePath: (path: string[]) => void;

  // View management
  currentViewRootId: string | null;
  viewPath: { id: string; name: string }[];
  setCurrentViewRootId: (id: string | null) => void;
  setViewPath: (path: { id: string; name: string }[]) => void;

  // Utility methods
  fitView: () => void;
  navigateToNode: (nodeId: string) => void;
  navigateToParent: () => void;
}

export interface NavigationFlowProviderProps {
  children: React.ReactNode;
}

// =====================================================
// NAVIGATION EDITOR PROVIDER TYPES
// =====================================================

export interface NavigationEditorProviderProps {
  children: React.ReactNode;
}

// =====================================================
// NODE EDGE MANAGEMENT CONTEXT TYPES
// =====================================================

export interface NodeEdgeManagementContextType {
  // Core node/edge operations
  addNode: (nodeData: Partial<UINavigationNode>, position?: { x: number; y: number }) => void;
  updateNode: (nodeId: string, updates: Partial<UINavigationNode>) => void;
  deleteNode: (nodeId: string) => void;

  addEdge: (edgeData: Partial<UINavigationEdge>) => void;
  updateEdge: (edgeId: string, updates: Partial<UINavigationEdge>) => void;
  deleteEdge: (edgeId: string) => void;

  // Batch operations
  resetNode: (nodeId: string) => void;
  resetAllNodes: () => void;

  // Validation
  validateConnection: (source: string, target: string) => boolean;

  // State tracking
  hasUnsavedChanges: boolean;
  userInterfaceId: string;
}

export interface NodeEdgeManagementProviderProps {
  children: React.ReactNode;
  userInterfaceId: string;
}

// =====================================================
// PROVIDER PROPS COLLECTION
// =====================================================

export interface AllNavigationProviderProps {
  children: React.ReactNode;
  userInterfaceId?: string;
}

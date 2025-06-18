import React, { createContext, useContext, useState, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useNodesState, useEdgesState, ReactFlowInstance } from 'reactflow';
import {
  UINavigationNode,
  UINavigationEdge,
  NodeForm,
  EdgeForm,
} from '../types/pages/Navigation_Types';

// ========================================
// TYPES
// ========================================

interface NavigationStateContextType {
  // Route params
  treeId?: string;
  treeName?: string;
  interfaceId?: string;

  // Navigation state
  currentTreeId: string;
  setCurrentTreeId: (id: string) => void;
  currentTreeName: string;
  setCurrentTreeName: (name: string) => void;
  navigationPath: string[];
  setNavigationPath: (path: string[]) => void;
  navigationNamePath: string[];
  setNavigationNamePath: (path: string[]) => void;

  // Save state
  isSaving: boolean;
  setIsSaving: (saving: boolean) => void;
  saveError: string | null;
  setSaveError: (error: string | null) => void;
  saveSuccess: boolean;
  setSaveSuccess: (success: boolean) => void;
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  isDiscardDialogOpen: boolean;
  setIsDiscardDialogOpen: (open: boolean) => void;

  // Interface state
  userInterface: any;
  setUserInterface: (ui: any) => void;
  rootTree: any;
  setRootTree: (tree: any) => void;
  isLoadingInterface: boolean;
  setIsLoadingInterface: (loading: boolean) => void;

  // React Flow state
  nodes: UINavigationNode[];
  setNodes: (nodes: UINavigationNode[]) => void;
  onNodesChange: (changes: any[]) => void;
  edges: UINavigationEdge[];
  setEdges: (edges: UINavigationEdge[]) => void;
  onEdgesChange: (changes: any[]) => void;

  // History state
  initialState: { nodes: UINavigationNode[]; edges: UINavigationEdge[] } | null;
  setInitialState: (state: { nodes: UINavigationNode[]; edges: UINavigationEdge[] } | null) => void;

  // View state
  currentViewRootId: string | null;
  setCurrentViewRootId: (id: string | null) => void;
  viewPath: { id: string; name: string }[];
  setViewPath: (path: { id: string; name: string }[]) => void;

  // UI state
  selectedNode: UINavigationNode | null;
  setSelectedNode: (node: UINavigationNode | null) => void;
  selectedEdge: UINavigationEdge | null;
  setSelectedEdge: (edge: UINavigationEdge | null) => void;
  isNodeDialogOpen: boolean;
  setIsNodeDialogOpen: (open: boolean) => void;
  isEdgeDialogOpen: boolean;
  setIsEdgeDialogOpen: (open: boolean) => void;
  isNewNode: boolean;
  setIsNewNode: (isNew: boolean) => void;
  nodeForm: NodeForm;
  setNodeForm: (form: NodeForm) => void;
  edgeForm: EdgeForm;
  setEdgeForm: (form: EdgeForm) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  success: string | null;
  setSuccess: (success: string | null) => void;

  // Filtering state
  focusNodeId: string | null;
  setFocusNodeId: (id: string | null) => void;
  maxDisplayDepth: number;
  setMaxDisplayDepth: (depth: number) => void;
  availableFocusNodes: { id: string; label: string; depth: number }[];
  setAvailableFocusNodes: (nodes: { id: string; label: string; depth: number }[]) => void;

  // React Flow refs
  reactFlowWrapper: React.RefObject<HTMLDivElement>;
  reactFlowInstance: ReactFlowInstance | null;
  setReactFlowInstance: (instance: ReactFlowInstance | null) => void;
}

interface NavigationStateProviderProps {
  children: React.ReactNode;
}

// ========================================
// CONTEXT
// ========================================

const NavigationStateContext = createContext<NavigationStateContextType | null>(null);

export const NavigationStateProvider: React.FC<NavigationStateProviderProps> = ({ children }) => {
  console.log('[@context:NavigationStateProvider] Initializing navigation state context');

  // ========================================
  // ROUTE PARAMS
  // ========================================

  const { treeId, treeName, interfaceId } = useParams<{
    treeId?: string;
    treeName: string;
    interfaceId?: string;
  }>();

  // ========================================
  // STATE
  // ========================================

  // Navigation state for breadcrumbs and nested trees
  const [currentTreeId, setCurrentTreeId] = useState<string>(treeName || treeId || 'home');
  const [currentTreeName, setCurrentTreeName] = useState<string>(treeName || 'home');
  const [navigationPath, setNavigationPath] = useState<string[]>([treeName || treeId || 'home']);
  const [navigationNamePath, setNavigationNamePath] = useState<string[]>([treeName || 'home']);

  // Save operation state
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);

  // Interface state
  const [userInterface, setUserInterface] = useState<any>(null);
  const [rootTree, setRootTree] = useState<any>(null);
  const [isLoadingInterface, setIsLoadingInterface] = useState<boolean>(!!interfaceId);

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Memoize React Flow arrays to prevent unnecessary context recreation
  // React Flow hooks create new array references even when content is the same
  const stableNodes = useMemo(
    () => nodes,
    [
      nodes.length,
      nodes
        .map((n) => `${n.id}:${n.position.x}:${n.position.y}:${JSON.stringify(n.data)}`)
        .join(','),
    ],
  );

  const stableEdges = useMemo(
    () => edges,
    [
      edges.length,
      edges.map((e) => `${e.id}:${e.source}:${e.target}:${JSON.stringify(e.data)}`).join(','),
    ],
  );

  // History state
  const [initialState, setInitialState] = useState<{
    nodes: UINavigationNode[];
    edges: UINavigationEdge[];
  } | null>(null);

  // View state
  const [currentViewRootId, setCurrentViewRootId] = useState<string | null>(null);
  const [viewPath, setViewPath] = useState<{ id: string; name: string }[]>([]);

  // UI state
  const [selectedNode, setSelectedNode] = useState<UINavigationNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<UINavigationEdge | null>(null);
  const [isNodeDialogOpen, setIsNodeDialogOpen] = useState(false);
  const [isEdgeDialogOpen, setIsEdgeDialogOpen] = useState(false);
  const [isNewNode, setIsNewNode] = useState(false);
  const [nodeForm, setNodeForm] = useState<NodeForm>({
    label: '',
    type: 'screen',
    description: '',
    verifications: [],
  });
  const [edgeForm, setEdgeForm] = useState<EdgeForm>({
    actions: [],
    retryActions: [],
    finalWaitTime: 2000,
    description: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Tree filtering state
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [maxDisplayDepth, setMaxDisplayDepth] = useState<number>(5);
  const [availableFocusNodes, setAvailableFocusNodes] = useState<
    { id: string; label: string; depth: number }[]
  >([]);

  // React Flow refs
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  // ========================================
  // CONTEXT VALUE
  // ========================================

  // Memoize complex objects separately to prevent unnecessary context recreation
  const stableNodeForm = useMemo(
    () => nodeForm,
    [nodeForm.label, nodeForm.type, nodeForm.description, nodeForm.verifications?.length],
  );

  const stableEdgeForm = useMemo(
    () => edgeForm,
    [
      edgeForm.actions?.length,
      edgeForm.retryActions?.length,
      edgeForm.finalWaitTime,
      edgeForm.description,
    ],
  );

  const stableNavigationPath = useMemo(() => navigationPath, [navigationPath.join(',')]);
  const stableNavigationNamePath = useMemo(
    () => navigationNamePath,
    [navigationNamePath.join(',')],
  );
  const stableViewPath = useMemo(
    () => viewPath,
    [viewPath.map((v) => `${v.id}:${v.name}`).join(',')],
  );
  const stableAvailableFocusNodes = useMemo(
    () => availableFocusNodes,
    [availableFocusNodes.map((n) => `${n.id}:${n.label}:${n.depth}`).join(',')],
  );

  const contextValue: NavigationStateContextType = useMemo(() => {
    console.log(`[@context:NavigationStateProvider] Creating new context value`);
    return {
      // Route params
      treeId,
      treeName,
      interfaceId,

      // Navigation state
      currentTreeId,
      setCurrentTreeId,
      currentTreeName,
      setCurrentTreeName,
      navigationPath: stableNavigationPath,
      setNavigationPath,
      navigationNamePath: stableNavigationNamePath,
      setNavigationNamePath,

      // Save state
      isSaving,
      setIsSaving,
      saveError,
      setSaveError,
      saveSuccess,
      setSaveSuccess,
      hasUnsavedChanges,
      setHasUnsavedChanges,
      isDiscardDialogOpen,
      setIsDiscardDialogOpen,

      // Interface state
      userInterface,
      setUserInterface,
      rootTree,
      setRootTree,
      isLoadingInterface,
      setIsLoadingInterface,

      // React Flow state
      nodes: stableNodes,
      setNodes,
      onNodesChange,
      edges: stableEdges,
      setEdges,
      onEdgesChange,
      reactFlowInstance,
      setReactFlowInstance,
      reactFlowWrapper,

      // Tree state
      initialState,
      setInitialState,
      isLoading,
      setIsLoading,

      // View navigation
      currentViewRootId,
      setCurrentViewRootId,
      viewPath: stableViewPath,
      setViewPath,

      // Node/Edge selection and editing
      selectedNode,
      setSelectedNode,
      selectedEdge,
      setSelectedEdge,
      isNodeDialogOpen,
      setIsNodeDialogOpen,
      isEdgeDialogOpen,
      setIsEdgeDialogOpen,
      isNewNode,
      setIsNewNode,
      nodeForm: stableNodeForm,
      setNodeForm,
      edgeForm: stableEdgeForm,
      setEdgeForm,

      // Focus management
      availableFocusNodes: stableAvailableFocusNodes,
      setAvailableFocusNodes,
      focusNodeId,
      setFocusNodeId,
      maxDisplayDepth,
      setMaxDisplayDepth,

      // Callbacks
      resetToInitialState,
      validateNavigationPath,
      updateNavigationPath,
      resetSelection,
    };
  }, [
    // Route params
    treeId,
    treeName,
    interfaceId,

    // Navigation state
    currentTreeId,
    currentTreeName,
    stableNavigationPath,
    stableNavigationNamePath,

    // Save state
    isSaving,
    saveError,
    saveSuccess,
    hasUnsavedChanges,
    isDiscardDialogOpen,

    // Interface state
    userInterface,
    rootTree,
    isLoadingInterface,

    // React Flow state - use stable versions to prevent unnecessary updates
    stableNodes,
    stableEdges,
    reactFlowInstance,

    // Tree state
    initialState,
    isLoading,

    // View navigation
    currentViewRootId,
    stableViewPath,

    // Node/Edge selection and editing - only track IDs to prevent object reference issues
    selectedNode?.id,
    selectedEdge?.id,
    isNodeDialogOpen,
    isEdgeDialogOpen,
    isNewNode,
    stableNodeForm,
    stableEdgeForm,

    // Focus management
    stableAvailableFocusNodes,
    focusNodeId,
    maxDisplayDepth,

    // Callbacks are stable due to useCallback
    resetToInitialState,
    validateNavigationPath,
    updateNavigationPath,
    resetSelection,

    // reactFlowWrapper is a ref and doesn't need to be in dependencies
  ]);

  return (
    <NavigationStateContext.Provider value={contextValue}>
      {children}
    </NavigationStateContext.Provider>
  );
};

// ========================================
// HOOK
// ========================================

export const useNavigationState = (): NavigationStateContextType => {
  const context = useContext(NavigationStateContext);
  if (!context) {
    throw new Error('useNavigationState must be used within a NavigationStateProvider');
  }
  return context;
};

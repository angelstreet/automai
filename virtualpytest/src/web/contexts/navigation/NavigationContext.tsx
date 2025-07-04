import React, {
  createContext,
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
  useContext,
} from 'react';
import { useParams } from 'react-router-dom';
import { useNodesState, useEdgesState, ReactFlowInstance } from 'reactflow';

import {
  UINavigationNode,
  UINavigationEdge,
  NodeForm,
  EdgeForm,
} from '../../types/pages/Navigation_Types';
import { useDeviceData } from '../device/DeviceDataContext';

// ========================================
// TYPES
// ========================================

export interface NavigationContextType {
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

  // Current position tracking
  currentNodeId: string | null;
  setCurrentNodeId: (id: string | null) => void;
  currentNodeLabel: string | null;
  setCurrentNodeLabel: (label: string | null) => void;

  // React Flow state
  nodes: UINavigationNode[];
  setNodes: (nodes: UINavigationNode[]) => void;
  onNodesChange: (changes: any[]) => void;
  edges: UINavigationEdge[];
  setEdges: (edges: UINavigationEdge[]) => void;
  onEdgesChange: (changes: any[]) => void;

  // Selection state
  selectedNode: UINavigationNode | null;
  setSelectedNode: (node: UINavigationNode | null) => void;
  selectedEdge: UINavigationEdge | null;
  setSelectedEdge: (edge: UINavigationEdge | null) => void;

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

  // Lock states
  isLocked: boolean;
  setIsLocked: (locked: boolean) => void;
  isCheckingLock: boolean;
  setIsCheckingLock: (checking: boolean) => void;

  // Interface state
  userInterface: any;
  setUserInterface: (ui: any) => void;
  rootTree: any;
  setRootTree: (tree: any) => void;
  isLoadingInterface: boolean;
  setIsLoadingInterface: (loading: boolean) => void;

  // View state
  currentViewRootId: string | null;
  setCurrentViewRootId: (id: string | null) => void;
  viewPath: { id: string; name: string }[];
  setViewPath: (path: { id: string; name: string }[]) => void;

  // Filtering state
  focusNodeId: string | null;
  setFocusNodeId: (id: string | null) => void;
  maxDisplayDepth: number;
  setMaxDisplayDepth: (depth: number) => void;
  availableFocusNodes: { id: string; label: string; depth: number }[];
  setAvailableFocusNodes: (nodes: { id: string; label: string; depth: number }[]) => void;

  // History state
  initialState: { nodes: UINavigationNode[]; edges: UINavigationEdge[] } | null;
  setInitialState: (state: { nodes: UINavigationNode[]; edges: UINavigationEdge[] } | null) => void;

  // React Flow refs
  reactFlowWrapper: React.RefObject<HTMLDivElement>;
  reactFlowInstance: ReactFlowInstance | null;
  setReactFlowInstance: (instance: ReactFlowInstance | null) => void;

  // Action methods
  resetAll: () => void;
  resetSelection: () => void;
  resetToInitialState: () => void;
  resetForms: () => void;
  resetDialogs: () => void;
  openNodeDialog: (node?: UINavigationNode) => void;
  openEdgeDialog: (edge?: UINavigationEdge) => void;
  closeAllDialogs: () => void;
  markUnsavedChanges: () => void;
  clearUnsavedChanges: () => void;
  resetToHome: () => void;
  fitViewToNodes: () => void;
  validateNavigationPath: (path: string[]) => boolean;
  updateNavigationPath: (newPath: string[], newNamePath: string[]) => void;
  updateCurrentPosition: (nodeId: string | null, nodeLabel?: string | null) => void;
  updateNodesWithMinimapIndicators: (navigationSteps?: any[]) => void;

  // Lock methods
  lockNavigationTree: (treeId: string) => Promise<boolean>;
  unlockNavigationTree: (treeId: string) => Promise<boolean>;
}

interface NavigationProviderProps {
  children: React.ReactNode;
}

// ========================================
// CONTEXT
// ========================================

const NavigationContext = createContext<NavigationContextType | null>(null);

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const { treeId, interfaceId } = useParams<{ treeId: string; interfaceId: string }>();
  const {
    currentHost,
    currentDeviceId,
    getDevicePosition,
    setDevicePosition,
    initializeDevicePosition,
  } = useDeviceData();

  // console.log('[@context:NavigationProvider] Initializing unified navigation context');

  // ========================================
  // ROUTE PARAMS
  // ========================================

  const routeParams = useParams<{
    treeId?: string;
    treeName: string;
    interfaceId?: string;
  }>();

  const { treeName } = useMemo(
    () => routeParams,
    [routeParams.treeId, routeParams.treeName, routeParams.interfaceId],
  );

  // ========================================
  // STATE
  // ========================================

  // Navigation state
  const [currentTreeId, setCurrentTreeId] = useState<string>(treeName || treeId || 'home');
  const [currentTreeName, setCurrentTreeName] = useState<string>(treeName || 'home');
  const [navigationPath, setNavigationPath] = useState<string[]>([treeName || treeId || 'home']);
  const [navigationNamePath, setNavigationNamePath] = useState<string[]>([treeName || 'home']);

  // Current position tracking
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [currentNodeLabel, setCurrentNodeLabel] = useState<string | null>(null);

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Selection state
  const [selectedNode, setSelectedNode] = useState<UINavigationNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<UINavigationEdge | null>(null);

  // Dialog states
  const [isNodeDialogOpen, setIsNodeDialogOpen] = useState(false);
  const [isEdgeDialogOpen, setIsEdgeDialogOpen] = useState(false);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);

  // Form states
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

  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Save states
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Lock states
  const [isLocked, setIsLocked] = useState(false);
  const [isCheckingLock, setIsCheckingLock] = useState(false);

  // Interface state
  const [userInterface, setUserInterface] = useState<any>(null);

  const updateCurrentPosition = useCallback(
    (nodeId: string | null, nodeLabel?: string | null) => {
      console.log('[@context:NavigationProvider] Updating current position');
      setCurrentNodeId(nodeId);
      setCurrentNodeLabel(nodeLabel || null);

      // Update device position if we have the required context
      if (nodeId && nodeLabel && currentHost && currentDeviceId && treeId && setDevicePosition) {
        setDevicePosition(currentHost, currentDeviceId, treeId, nodeId, nodeLabel);
      }
    },
    [currentHost, currentDeviceId, treeId, setDevicePosition],
  );

  // Update nodes with minimap indicators
  const updateNodesWithMinimapIndicators = useCallback(
    (navigationSteps?: any[]) => {
      console.log('[@context:NavigationProvider] Updating nodes with minimap indicators');

      setNodes((currentNodes) => {
        return currentNodes.map((node) => {
          const isCurrentPosition = node.id === currentNodeId;

          // Check if node is part of navigation route
          const isOnNavigationRoute =
            navigationSteps?.some(
              (step: any) => step.from_node_id === node.id || step.to_node_id === node.id,
            ) || false;

          return {
            ...node,
            data: {
              ...node.data,
              isCurrentPosition,
              isOnNavigationRoute,
            },
          };
        });
      });
    },
    [currentNodeId, setNodes],
  );

  // ========================================
  // EFFECTS
  // ========================================

  // Debug logging for userInterface changes
  useEffect(() => {
    console.log('[@context:NavigationProvider] userInterface changed:', userInterface);
  }, [userInterface]);

  // Update minimap indicators when current position changes
  const prevCurrentNodeIdRef = useRef<string | null>(null);
  const nodesLengthRef = useRef<number>(0);

  useEffect(() => {
    // Only update if currentNodeId actually changed and we have nodes
    if (
      nodes.length > 0 &&
      (prevCurrentNodeIdRef.current !== currentNodeId || nodesLengthRef.current !== nodes.length)
    ) {
      console.log('[@context:NavigationProvider] Updating nodes with minimap indicators');
      prevCurrentNodeIdRef.current = currentNodeId;
      nodesLengthRef.current = nodes.length;

      setNodes((currentNodes) => {
        return currentNodes.map((node) => {
          const isCurrentPosition = node.id === currentNodeId;

          // Check if node is part of navigation route (no navigationSteps in this context)
          const isOnNavigationRoute = false;

          // Only update if the flags actually changed to prevent unnecessary re-renders
          if (
            node.data.isCurrentPosition !== isCurrentPosition ||
            node.data.isOnNavigationRoute !== isOnNavigationRoute
          ) {
            return {
              ...node,
              data: {
                ...node.data,
                isCurrentPosition,
                isOnNavigationRoute,
              },
            };
          }
          return node;
        });
      });
    }
  }, [currentNodeId, nodes.length]); // Removed setNodes dependency

  // Initialize current position from device position when tree and device context are available
  useEffect(() => {
    if (
      nodes.length > 0 &&
      currentHost &&
      currentDeviceId &&
      treeId &&
      getDevicePosition &&
      initializeDevicePosition
    ) {
      // Check if we already have a position for this device/tree combination
      const existingPosition = getDevicePosition(currentHost, currentDeviceId, treeId);

      if (existingPosition) {
        // Use existing position
        console.log(
          '[@context:NavigationProvider] Using existing device position:',
          existingPosition,
        );
        setCurrentNodeId(existingPosition.nodeId);
        setCurrentNodeLabel(existingPosition.nodeLabel);
      } else {
        // Initialize to root node
        const homeNode = nodes.find((node: any) => node.data?.is_root === true);
        if (homeNode) {
          console.log(
            '[@context:NavigationProvider] Initializing device position to root node:',
            homeNode.id,
          );
          const position = initializeDevicePosition(
            currentHost,
            currentDeviceId,
            treeId,
            homeNode.id,
            homeNode.data?.label || 'Root',
          );
          setCurrentNodeId(position.nodeId);
          setCurrentNodeLabel(position.nodeLabel);
        }
      }
    }
  }, [
    nodes.length,
    currentHost,
    currentDeviceId,
    treeId,
    getDevicePosition,
    initializeDevicePosition,
  ]);

  const [rootTree, setRootTree] = useState<any>(null);
  const [isLoadingInterface, setIsLoadingInterface] = useState<boolean>(!!interfaceId);

  // View state
  const [currentViewRootId, setCurrentViewRootId] = useState<string | null>(null);
  const [viewPath, setViewPath] = useState<{ id: string; name: string }[]>([]);

  // Filtering state
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [maxDisplayDepth, setMaxDisplayDepth] = useState<number>(5);
  const [availableFocusNodes, setAvailableFocusNodes] = useState<
    { id: string; label: string; depth: number }[]
  >([]);

  // History state
  const [initialState, setInitialState] = useState<{
    nodes: UINavigationNode[];
    edges: UINavigationEdge[];
  } | null>(null);

  // React Flow refs
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  // ========================================
  // LOCK METHODS
  // ========================================

  const lockNavigationTree = useCallback(async (treeId: string): Promise<boolean> => {
    setIsCheckingLock(true);
    try {
      // Mock implementation - replace with actual API call
      console.log('[@context:NavigationProvider] Locking navigation tree:', treeId);
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate API call
      setIsLocked(true);
      return true;
    } catch (error) {
      console.error('[@context:NavigationProvider] Failed to lock navigation tree:', error);
      return false;
    } finally {
      setIsCheckingLock(false);
    }
  }, []);

  const unlockNavigationTree = useCallback(async (treeId: string): Promise<boolean> => {
    setIsCheckingLock(true);
    try {
      // Mock implementation - replace with actual API call
      console.log('[@context:NavigationProvider] Unlocking navigation tree:', treeId);
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate API call
      setIsLocked(false);
      return true;
    } catch (error) {
      console.error('[@context:NavigationProvider] Failed to unlock navigation tree:', error);
      return false;
    } finally {
      setIsCheckingLock(false);
    }
  }, []);

  // ========================================
  // ACTION METHODS
  // ========================================

  const resetAll = useCallback(() => {
    // console.log('[@context:NavigationProvider] Resetting all state');
    setSelectedNode(null);
    setSelectedEdge(null);
    if (initialState) {
      setNodes(initialState.nodes);
      setEdges(initialState.edges);
    }
    setIsNodeDialogOpen(false);
    setIsEdgeDialogOpen(false);
    setIsDiscardDialogOpen(false);
    setNodeForm({
      label: '',
      type: 'screen',
      description: '',
      verifications: [],
    });
    setEdgeForm({
      actions: [],
      retryActions: [],
      finalWaitTime: 2000,
      description: '',
    });
    setIsNewNode(false);
    setHasUnsavedChanges(false);
    setError(null);
    setSuccess(null);
  }, [initialState, setNodes, setEdges]);

  const resetSelection = useCallback(() => {
    // console.log('[@context:NavigationProvider] Resetting selection');
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  const resetToInitialState = useCallback(() => {
    console.log('[@context:NavigationProvider] Resetting to initial state');
    if (initialState) {
      setNodes(initialState.nodes);
      setEdges(initialState.edges);
      setHasUnsavedChanges(false);
    }
  }, [initialState, setNodes, setEdges]);

  const resetForms = useCallback(() => {
    console.log('[@context:NavigationProvider] Resetting forms');
    setNodeForm({
      label: '',
      type: 'screen',
      description: '',
      verifications: [],
    });
    setEdgeForm({
      actions: [],
      retryActions: [],
      finalWaitTime: 2000,
      description: '',
    });
    setIsNewNode(false);
  }, []);

  const resetDialogs = useCallback(() => {
    console.log('[@context:NavigationProvider] Resetting dialogs');
    setIsNodeDialogOpen(false);
    setIsEdgeDialogOpen(false);
    setIsDiscardDialogOpen(false);
  }, []);

  const openNodeDialog = useCallback((node?: UINavigationNode) => {
    console.log('[@context:NavigationProvider] Opening node dialog');
    if (node) {
      setSelectedNode(node);
      setNodeForm({
        label: node.data?.label || '',
        type: node.data?.type || 'screen',
        description: node.data?.description || '',
        verifications: node.data?.verifications || [],
      });
      setIsNewNode(false);
    } else {
      setIsNewNode(true);
    }
    setIsNodeDialogOpen(true);
  }, []);

  const openEdgeDialog = useCallback((edge?: UINavigationEdge) => {
    console.log('[@context:NavigationProvider] Opening edge dialog');
    if (edge) {
      setSelectedEdge(edge);
      setEdgeForm({
        actions: edge.data?.actions || [],
        retryActions: [], // Will be resolved from retry_action_ids by useEdgeEdit hook
        finalWaitTime: edge.data?.finalWaitTime || 2000,
        description: edge.data?.description || '',
      });
    }
    setIsEdgeDialogOpen(true);
  }, []);

  const closeAllDialogs = useCallback(() => {
    console.log('[@context:NavigationProvider] Closing all dialogs');
    setIsNodeDialogOpen(false);
    setIsEdgeDialogOpen(false);
    setIsDiscardDialogOpen(false);
  }, []);

  const markUnsavedChanges = useCallback(() => {
    console.log('[@context:NavigationProvider] Marking unsaved changes');
    setHasUnsavedChanges(true);
  }, []);

  const clearUnsavedChanges = useCallback(() => {
    console.log('[@context:NavigationProvider] Clearing unsaved changes');
    setHasUnsavedChanges(false);
  }, []);

  const resetToHome = useCallback(() => {
    console.log('[@context:NavigationProvider] Resetting to home');
    setCurrentTreeId('home');
    setCurrentTreeName('home');
    setNavigationPath(['home']);
    setNavigationNamePath(['home']);
    setCurrentViewRootId(null);
    setViewPath([]);
  }, []);

  const fitViewToNodes = useCallback(() => {
    console.log('[@context:NavigationProvider] Fitting view to nodes');
    if (reactFlowInstance) {
      reactFlowInstance.fitView();
    }
  }, [reactFlowInstance]);

  const validateNavigationPath = useCallback((path: string[]): boolean => {
    console.log('[@context:NavigationProvider] Validating navigation path:', path);
    return path.length > 0 && path.every((id) => typeof id === 'string' && id.length > 0);
  }, []);

  const updateNavigationPath = useCallback(
    (newPath: string[], newNamePath: string[]) => {
      console.log('[@context:NavigationProvider] Updating navigation path:', {
        newPath,
        newNamePath,
      });
      if (validateNavigationPath(newPath)) {
        setNavigationPath(newPath);
        setNavigationNamePath(newNamePath);
        if (newPath.length > 0) {
          const currentId = newPath[newPath.length - 1];
          const currentName = newNamePath[newNamePath.length - 1] || currentId;
          setCurrentTreeId(currentId);
          setCurrentTreeName(currentName);
        }
      }
    },
    [validateNavigationPath],
  );

  // ========================================
  // MEMOIZED VALUES
  // ========================================

  const stableNodes = useMemo(() => nodes, [nodes]);
  const stableEdges = useMemo(() => edges, [edges]);
  const stableNodeForm = useMemo(() => nodeForm, [nodeForm]);
  const stableEdgeForm = useMemo(() => edgeForm, [edgeForm]);
  const stableNavigationPath = useMemo(() => navigationPath, [navigationPath]);
  const stableNavigationNamePath = useMemo(() => navigationNamePath, [navigationNamePath]);
  const stableViewPath = useMemo(() => viewPath, [viewPath]);
  const stableAvailableFocusNodes = useMemo(() => availableFocusNodes, [availableFocusNodes]);

  // ========================================
  // CONTEXT VALUE
  // ========================================

  const contextValue: NavigationContextType = useMemo(() => {
    // console.log('[@context:NavigationProvider] Creating context value');
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

      // Current position tracking
      currentNodeId,
      setCurrentNodeId,
      currentNodeLabel,
      setCurrentNodeLabel,

      // React Flow state
      nodes: stableNodes,
      setNodes,
      onNodesChange,
      edges: stableEdges,
      setEdges,
      onEdgesChange,

      // Selection state
      selectedNode,
      setSelectedNode,
      selectedEdge,
      setSelectedEdge,

      // Dialog states
      isNodeDialogOpen,
      setIsNodeDialogOpen,
      isEdgeDialogOpen,
      setIsEdgeDialogOpen,
      isDiscardDialogOpen,
      setIsDiscardDialogOpen,

      // Form states
      isNewNode,
      setIsNewNode,
      nodeForm: stableNodeForm,
      setNodeForm,
      edgeForm: stableEdgeForm,
      setEdgeForm,

      // Loading and error states
      isLoading,
      setIsLoading,
      error,
      setError,
      success,
      setSuccess,

      // Save states
      isSaving,
      setIsSaving,
      saveError,
      setSaveError,
      saveSuccess,
      setSaveSuccess,
      hasUnsavedChanges,
      setHasUnsavedChanges,

      // Lock states
      isLocked,
      setIsLocked,
      isCheckingLock,
      setIsCheckingLock,

      // Interface state
      userInterface,
      setUserInterface,
      rootTree,
      setRootTree,
      isLoadingInterface,
      setIsLoadingInterface,

      // View state
      currentViewRootId,
      setCurrentViewRootId,
      viewPath: stableViewPath,
      setViewPath,

      // Filtering state
      focusNodeId,
      setFocusNodeId,
      maxDisplayDepth,
      setMaxDisplayDepth,
      availableFocusNodes: stableAvailableFocusNodes,
      setAvailableFocusNodes,

      // History state
      initialState,
      setInitialState,

      // React Flow refs
      reactFlowWrapper,
      reactFlowInstance,
      setReactFlowInstance,

      // Action methods
      resetAll,
      resetSelection,
      resetToInitialState,
      resetForms,
      resetDialogs,
      openNodeDialog,
      openEdgeDialog,
      closeAllDialogs,
      markUnsavedChanges,
      clearUnsavedChanges,
      resetToHome,
      fitViewToNodes,
      validateNavigationPath,
      updateNavigationPath,
      updateCurrentPosition,
      updateNodesWithMinimapIndicators,

      // Lock methods
      lockNavigationTree,
      unlockNavigationTree,
    };
  }, [
    // Only include values that should trigger context recreation
    treeId,
    treeName,
    interfaceId,
    currentTreeId,
    currentTreeName,
    stableNavigationPath,
    stableNavigationNamePath,
    stableNodes,
    stableEdges,
    selectedNode,
    selectedEdge,
    isNodeDialogOpen,
    isEdgeDialogOpen,
    isDiscardDialogOpen,
    isNewNode,
    stableNodeForm,
    stableEdgeForm,
    isLoading,
    error,
    success,
    isSaving,
    saveError,
    saveSuccess,
    hasUnsavedChanges,
    isLocked,
    isCheckingLock,
    userInterface,
    rootTree,
    isLoadingInterface,
    currentViewRootId,
    stableViewPath,
    focusNodeId,
    maxDisplayDepth,
    stableAvailableFocusNodes,
    initialState,
    reactFlowInstance,
    currentNodeId,
    currentNodeLabel,
    updateNodesWithMinimapIndicators,
  ]);

  return <NavigationContext.Provider value={contextValue}>{children}</NavigationContext.Provider>;
};

NavigationProvider.displayName = 'NavigationProvider';

export default NavigationContext;

// ========================================
// HOOK
// ========================================

export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

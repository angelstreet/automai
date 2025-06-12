import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { addEdge, Connection, MarkerType } from 'reactflow';

import { useRegistration, DEFAULT_TEAM_ID } from '../../contexts/RegistrationContext';
import {
  UINavigationNode,
  UINavigationEdge,
  ConnectionResult,
} from '../../types/pages/Navigation_Types';
import { useNavigationConfig } from '../navigation/useNavigationConfig';
import { useNavigationDeviceControl } from '../navigation/useNavigationDeviceControl';

import { useNavigationState, useConnectionRules, useNodeEdgeManagement } from './useNavigation';

export const useNavigationEditor = () => {
  const navigate = useNavigate();

  // Use registration context for centralized URL management
  const { buildServerUrl } = useRegistration();

  // Initialize teamId in localStorage if not already set
  useEffect(() => {
    if (!localStorage.getItem('teamId') && !sessionStorage.getItem('teamId')) {
      localStorage.setItem('teamId', DEFAULT_TEAM_ID);
    }
  }, []);

  // Use the modular state hook
  const navigationState = useNavigationState();

  // Connection rules hook
  const { validateConnection, getRulesSummary } = useConnectionRules();

  // Explicitly type the validateConnection function to ensure proper type inference
  const typedValidateConnection = useCallback(
    (
      sourceNode: UINavigationNode,
      targetNode: UINavigationNode,
      params: Connection,
    ): ConnectionResult => {
      return validateConnection(sourceNode, targetNode, params) as ConnectionResult;
    },
    [validateConnection],
  );

  // Navigation config operations hook
  const configHook = useNavigationConfig({
    currentTreeName: navigationState.currentTreeName,
    setCurrentTreeName: navigationState.setCurrentTreeName,
    setNodes: navigationState.setNodes,
    setEdges: navigationState.setEdges,
    setInitialState: navigationState.setInitialState,
    setHasUnsavedChanges: navigationState.setHasUnsavedChanges,
    setIsLoading: navigationState.setIsLoading,
    setError: navigationState.setError,
    setSaveError: navigationState.setSaveError,
    setSaveSuccess: navigationState.setSaveSuccess,
    setIsSaving: navigationState.setIsSaving,
    setUserInterface: navigationState.setUserInterface,
    nodes: navigationState.nodes,
    edges: navigationState.edges,
    isSaving: navigationState.isSaving,
  });

  // Node/Edge management hook
  const nodeEdgeHook = useNodeEdgeManagement({
    nodes: navigationState.nodes,
    edges: navigationState.edges,
    selectedNode: navigationState.selectedNode,
    selectedEdge: navigationState.selectedEdge,
    nodeForm: navigationState.nodeForm,
    edgeForm: navigationState.edgeForm,
    isNewNode: navigationState.isNewNode,
    setNodes: navigationState.setNodes,
    setEdges: navigationState.setEdges,
    setSelectedNode: navigationState.setSelectedNode,
    setSelectedEdge: navigationState.setSelectedEdge,
    setNodeForm: navigationState.setNodeForm,
    setEdgeForm: navigationState.setEdgeForm,
    setIsNodeDialogOpen: navigationState.setIsNodeDialogOpen,
    setIsEdgeDialogOpen: navigationState.setIsEdgeDialogOpen,
    setIsNewNode: navigationState.setIsNewNode,
    setHasUnsavedChanges: navigationState.setHasUnsavedChanges,
  });

  // Additional state that might need local management
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);

  // Use device control hook for all device-related functionality
  const deviceControl = useNavigationDeviceControl({
    userInterface: navigationState.userInterface,
    buildServerUrl,
  });

  // Simplified onNodesChange with change tracking
  const customOnNodesChange = useCallback(
    (changes: any[]) => {
      // Apply changes to nodes (single source of truth)
      navigationState.onNodesChange(changes);

      // Mark as having unsaved changes for meaningful changes
      const hasMeaningfulChange = changes.some(
        (change) => change.type === 'position' || change.type === 'remove',
      );

      if (hasMeaningfulChange) {
        navigationState.setHasUnsavedChanges(true);
      }
    },
    [navigationState.onNodesChange, navigationState.setHasUnsavedChanges],
  );

  // Handle edge changes and track modifications
  const onEdgesChange = useCallback(
    (changes: any[]) => {
      navigationState.onEdgesChange(changes);
      const hasMeaningfulChange = changes.some(
        (change) => change.type === 'add' || change.type === 'remove',
      );

      if (hasMeaningfulChange) {
        navigationState.setHasUnsavedChanges(true);
      }
    },
    [navigationState.onEdgesChange, navigationState.setHasUnsavedChanges],
  );

  // Handle new connections
  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;

      const sourceNode = navigationState.nodes.find((n) => n.id === params.source);
      const targetNode = navigationState.nodes.find((n) => n.id === params.target);

      if (!sourceNode || !targetNode) {
        console.error(
          '[@component:NavigationEditor] Source or target node not found for connection',
        );
        return;
      }

      // DEBUG: Log the current state of both nodes before connection
      console.log('[@component:NavigationEditor] BEFORE CONNECTION - Source node:', {
        id: sourceNode.id,
        label: sourceNode.data.label,
        type: sourceNode.data.type,
        parent: sourceNode.data.parent,
        depth: sourceNode.data.depth,
      });
      console.log('[@component:NavigationEditor] BEFORE CONNECTION - Target node:', {
        id: targetNode.id,
        label: targetNode.data.label,
        type: targetNode.data.type,
        parent: targetNode.data.parent,
        depth: targetNode.data.depth,
      });
      console.log('[@component:NavigationEditor] Connection params:', {
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
      });

      // Use the new connection rules function
      const connectionResult = typedValidateConnection(sourceNode, targetNode, params);

      // Check if connection is allowed
      if (!connectionResult.isAllowed) {
        console.error(
          '[@component:NavigationEditor] Connection rejected:',
          connectionResult.reason,
        );
        return;
      }

      // Apply node updates if any
      if (connectionResult.sourceNodeUpdates || connectionResult.targetNodeUpdates) {
        // Update nodes (single source of truth)
        const updateNodeFunction = (nds: UINavigationNode[]) =>
          nds.map((node) => {
            if (node.id === sourceNode.id && connectionResult.sourceNodeUpdates) {
              console.log(
                `[@component:NavigationEditor] Updating source node ${sourceNode.data.label}:`,
                connectionResult.sourceNodeUpdates,
              );
              return {
                ...node,
                // Explicitly preserve position to prevent auto-reorganization
                position: node.position,
                data: {
                  ...node.data,
                  ...connectionResult.sourceNodeUpdates,
                },
              };
            }
            if (node.id === targetNode.id && connectionResult.targetNodeUpdates) {
              console.log(
                `[@component:NavigationEditor] Updating target node ${targetNode.data.label}:`,
                connectionResult.targetNodeUpdates,
              );
              return {
                ...node,
                // Explicitly preserve position to prevent auto-reorganization
                position: node.position,
                data: {
                  ...node.data,
                  ...connectionResult.targetNodeUpdates,
                },
              };
            }
            return node;
          });

        navigationState.setNodes(updateNodeFunction);
      }

      // Create the edge
      const edgeId = `${params.source}-${params.target}`;
      const newEdge: UINavigationEdge = {
        id: edgeId,
        source: params.source,
        target: params.target,
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
        type: 'uiNavigation',
        data: {
          edgeType: connectionResult.edgeType,
          description: `Connection from ${sourceNode.data.label} to ${targetNode.data.label}`,
          from: sourceNode.data.label,
          to: targetNode.data.label,
        },
      };

      // Add edge (single source of truth)
      navigationState.setEdges((eds) => addEdge(newEdge, eds));

      // Mark as having unsaved changes
      navigationState.setHasUnsavedChanges(true);
    },
    [
      navigationState.nodes,
      navigationState.setNodes,
      navigationState.setEdges,
      navigationState.setHasUnsavedChanges,
      typedValidateConnection,
    ],
  );

  // Set user interface from props (passed from UserInterface.tsx via navigation state)
  const setUserInterfaceFromProps = useCallback(
    (userInterfaceData: any) => {
      if (userInterfaceData) {
        navigationState.setUserInterface(userInterfaceData);
        navigationState.setIsLoadingInterface(false);
      }
    },
    [navigationState],
  );

  // Handle clicking on the background/pane to deselect
  const onPaneClick = useCallback(() => {
    navigationState.setSelectedNode(null);
    navigationState.setSelectedEdge(null);
  }, [navigationState.setSelectedNode, navigationState.setSelectedEdge]);

  // Handle node selection
  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: UINavigationNode) => {
      event.stopPropagation(); // Prevent pane click from firing
      navigationState.setSelectedNode(node as UINavigationNode);
      navigationState.setSelectedEdge(null);
    },
    [navigationState.setSelectedNode, navigationState.setSelectedEdge],
  );

  // Handle edge selection
  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: UINavigationEdge) => {
      event.stopPropagation(); // Prevent pane click from firing
      navigationState.setSelectedEdge(edge as UINavigationEdge);
      navigationState.setSelectedNode(null);
    },
    [navigationState.setSelectedEdge, navigationState.setSelectedNode],
  );

  // Handle double-click on node for navigation
  const onNodeDoubleClickUpdated = useCallback(
    (event: React.MouseEvent, node: UINavigationNode) => {
      event.stopPropagation();
      const uiNode = node as UINavigationNode;

      // Check if there's currently a filter applied
      if (navigationState.focusNodeId) {
        // If filter is applied, reset it to show all nodes

        navigationState.setFocusNodeId(null);
        navigationState.setMaxDisplayDepth(5);
      } else {
        // If no filter is applied, focus on the double-clicked node (if it's focusable)
        const isFocusableNode = uiNode.data.type === 'menu' || uiNode.data.is_root;

        if (isFocusableNode) {
          navigationState.setFocusNodeId(uiNode.id);
          // Set a reasonable depth for viewing the focused node and its children
          navigationState.setMaxDisplayDepth(3);
        } else {
        }
      }
    },
    [navigationState],
  );

  // Navigate back in breadcrumb
  const navigateToTreeLevel = useCallback(
    (index: number) => {
      const newPath = navigationState.navigationPath.slice(0, index + 1);
      const newNamePath = navigationState.navigationNamePath.slice(0, index + 1);
      const targetTreeId = newPath[newPath.length - 1];
      const targetTreeName = newNamePath[newNamePath.length - 1];

      // Prevent navigating to the same tree level
      if (navigationState.currentTreeId === targetTreeId) {
        return;
      }

      navigationState.setNavigationPath(newPath);
      navigationState.setNavigationNamePath(newNamePath);
      navigationState.setCurrentTreeId(targetTreeId);
      navigationState.setCurrentTreeName(targetTreeName);
      navigate(`/navigation-editor/${encodeURIComponent(targetTreeName)}/${targetTreeId}`);

      // Load tree data for that level from config (nodes/edges only, not interface metadata)
      configHook.loadFromConfig(targetTreeName);
    },
    [navigationState, configHook.loadFromConfig, navigate],
  );

  // Go back to parent tree
  const goBackToParent = useCallback(() => {
    if (navigationState.navigationPath.length > 1) {
      const newPath = navigationState.navigationPath.slice(0, -1);
      const newNamePath = navigationState.navigationNamePath.slice(0, -1);
      const targetTreeId = newPath[newPath.length - 1];
      const targetTreeName = newNamePath[newNamePath.length - 1];

      navigationState.setNavigationPath(newPath);
      navigationState.setNavigationNamePath(newNamePath);
      navigationState.setCurrentTreeId(targetTreeId);
      navigationState.setCurrentTreeName(targetTreeName);
      navigate(`/navigation-editor/${encodeURIComponent(targetTreeName)}/${targetTreeId}`);

      // Load parent tree data from config (nodes/edges only, not interface metadata)
      configHook.loadFromConfig(targetTreeName);
    }
  }, [navigationState, configHook.loadFromConfig, navigate]);

  // Discard changes function with confirmation
  const discardChanges = useCallback(() => {
    if (navigationState.hasUnsavedChanges) {
      navigationState.setIsDiscardDialogOpen(true);
    } else {
      performDiscardChanges();
    }
  }, [navigationState.hasUnsavedChanges, navigationState.setIsDiscardDialogOpen]);

  // Actually perform the discard operation
  const performDiscardChanges = useCallback(() => {
    if (navigationState.initialState) {
      navigationState.setNodes([...navigationState.initialState.nodes]);
      navigationState.setEdges([...navigationState.initialState.edges]);
      navigationState.setHasUnsavedChanges(false);
      navigationState.setSaveError(null);
      navigationState.setSaveSuccess(false);
      navigationState.setIsDiscardDialogOpen(false);
    }
  }, [navigationState]);

  // Fit view
  const fitView = useCallback(() => {
    if (navigationState.reactFlowInstance) {
      // Get the current visible nodes from navigationState (which are already filtered)
      const visibleNodes = navigationState.nodes;

      if (visibleNodes.length > 0) {
        // Fit view to only the visible/filtered nodes
        navigationState.reactFlowInstance.fitView({
          nodes: visibleNodes.map((node) => ({ id: node.id })),
          padding: 0.1, // 10% padding around the visible nodes
          duration: 300, // Smooth animation
        });
      } else {
        // Fallback to default fitView if no visible nodes
        navigationState.reactFlowInstance.fitView();
      }
    }
  }, [navigationState.reactFlowInstance, navigationState.nodes]);

  // Navigate back to parent
  const navigateToParent = useCallback(() => {
    navigate('/configuration/interface');
  }, [navigate]);

  // Default edge options
  const defaultEdgeOptions = {
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#b1b1b7' },
  };

  // Helper function to check if a node is descendant of another
  const isNodeDescendantOf = useCallback(
    (node: UINavigationNode, ancestorId: string, nodes: UINavigationNode[]): boolean => {
      if (!node.data.parent || node.data.parent.length === 0) return false;

      // Check if ancestorId is in the parent chain
      return node.data.parent.includes(ancestorId);
    },
    [],
  );

  // Get filtered nodes based on focus node and depth
  const filteredNodes = useMemo(() => {
    const allNodes = navigationState.nodes;

    if (!navigationState.focusNodeId) {
      // No focus node - apply depth filtering to all nodes
      return allNodes.filter((node) => {
        const nodeDepth = node.data.depth || 0;
        return nodeDepth <= navigationState.maxDisplayDepth;
      });
    }

    // Find the focus node
    const focusNode = allNodes.find((n) => n.id === navigationState.focusNodeId);
    if (!focusNode) {
      return allNodes;
    }

    const focusDepth = focusNode.data.depth || 0;
    const maxAbsoluteDepth = focusDepth + navigationState.maxDisplayDepth;

    // Show focus node, its siblings, and its descendants
    return allNodes.filter((node) => {
      const nodeDepth = node.data.depth || 0;

      // Include the focus node itself
      if (node.id === navigationState.focusNodeId) {
        return true;
      }

      // Include descendants within depth limit
      const isDescendant = isNodeDescendantOf(node, navigationState.focusNodeId!, allNodes);
      if (isDescendant && nodeDepth <= maxAbsoluteDepth) {
        return true;
      }

      // Include siblings (same depth and parent)
      if (nodeDepth === focusDepth) {
        const focusParent = focusNode.data.parent || [];
        const nodeParent = node.data.parent || [];
        return JSON.stringify(focusParent) === JSON.stringify(nodeParent);
      }

      return false;
    });
  }, [
    navigationState.nodes,
    navigationState.focusNodeId,
    navigationState.maxDisplayDepth,
    isNodeDescendantOf,
  ]);

  // Get filtered edges (only between visible nodes)
  const filteredEdges = useMemo(() => {
    const visibleNodeIds = new Set(filteredNodes.map((n) => n.id));
    return navigationState.edges.filter(
      (edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target),
    );
  }, [navigationState.edges, filteredNodes]);

  // Navigate to parent view (breadcrumb click)
  const navigateToParentView = useCallback(
    (targetIndex: number) => {
      if (targetIndex < 0 || targetIndex >= navigationState.viewPath.length) return;

      const targetView = navigationState.viewPath[targetIndex];
      navigationState.setCurrentViewRootId(targetView.id);
      navigationState.setViewPath((prev) => prev.slice(0, targetIndex + 1));
    },
    [navigationState],
  );

  // Update available focus nodes when nodes change
  useEffect(() => {
    const focusableNodes = navigationState.nodes
      .filter((node) => node.data.type === 'menu' || node.data.is_root)
      .map((node) => ({
        id: node.id,
        label: node.data.label,
        depth: node.data.depth || 0,
      }))
      .sort((a, b) => a.depth - b.depth || a.label.localeCompare(b.label));

    navigationState.setAvailableFocusNodes(focusableNodes);
  }, [navigationState.nodes]);

  // Focus on specific node (dropdown selection)
  const setFocusNode = useCallback(
    (nodeId: string | null) => {
      navigationState.setFocusNodeId(nodeId);
    },
    [navigationState],
  );

  // Set max display depth (dropdown selection)
  const setDisplayDepth = useCallback(
    (depth: number) => {
      navigationState.setMaxDisplayDepth(depth);
    },
    [navigationState],
  );

  // Reset focus to show all root level nodes
  const resetFocus = useCallback(() => {
    navigationState.setFocusNodeId(null);
    navigationState.setMaxDisplayDepth(5);
  }, [navigationState]);

  return {
    // State (filtered views for ReactFlow display)
    nodes: filteredNodes,
    edges: filteredEdges,
    // Raw data (single source of truth)
    allNodes: navigationState.nodes,
    allEdges: navigationState.edges,
    treeName: navigationState.currentTreeName,
    isLoadingInterface: navigationState.isLoadingInterface,
    selectedNode: navigationState.selectedNode,
    selectedEdge: navigationState.selectedEdge,
    isNodeDialogOpen: navigationState.isNodeDialogOpen,
    isEdgeDialogOpen: navigationState.isEdgeDialogOpen,
    nodeForm: navigationState.nodeForm,
    edgeForm: navigationState.edgeForm,
    isLoading: navigationState.isSaving,
    error: navigationState.saveError,
    success: navigationState.saveSuccess ? 'Navigation tree saved successfully!' : null,
    pendingConnection,
    reactFlowWrapper: navigationState.reactFlowWrapper,
    reactFlowInstance: navigationState.reactFlowInstance,
    treeId: navigationState.currentTreeId,
    interfaceId: navigationState.interfaceId,

    // Tree state (simplified)
    currentTreeId: navigationState.currentTreeId,
    currentTreeName: navigationState.currentTreeName,
    navigationPath: navigationState.navigationPath,
    navigationNamePath: navigationState.navigationNamePath,
    hasUnsavedChanges: navigationState.hasUnsavedChanges,
    isDiscardDialogOpen: navigationState.isDiscardDialogOpen,
    userInterface: navigationState.userInterface,
    rootTree: navigationState.rootTree,

    // History state removed - using page reload for cancel changes

    // View state for single-level navigation
    viewPath: navigationState.viewPath,

    // Tree filtering state and functions
    focusNodeId: navigationState.focusNodeId,
    maxDisplayDepth: navigationState.maxDisplayDepth,
    availableFocusNodes: navigationState.availableFocusNodes,
    isNodeDescendantOf,
    setFocusNode,
    setDisplayDepth,
    resetFocus,

    // Setters (work with raw data, filtering happens automatically)
    setNodes: navigationState.setNodes,
    setEdges: navigationState.setEdges,
    setHasUnsavedChanges: navigationState.setHasUnsavedChanges,
    setTreeName: navigationState.setCurrentTreeName,
    setIsLoadingInterface: navigationState.setIsLoadingInterface,
    setSelectedNode: navigationState.setSelectedNode,
    setSelectedEdge: navigationState.setSelectedEdge,
    setIsNodeDialogOpen: navigationState.setIsNodeDialogOpen,
    setIsEdgeDialogOpen: navigationState.setIsEdgeDialogOpen,
    setNodeForm: navigationState.setNodeForm,
    setEdgeForm: navigationState.setEdgeForm,
    setIsLoading: navigationState.setIsSaving,
    setError: navigationState.setSaveError,
    setSuccess: navigationState.setSaveSuccess,
    setPendingConnection,
    setReactFlowInstance: navigationState.setReactFlowInstance,
    setIsDiscardDialogOpen: navigationState.setIsDiscardDialogOpen,

    // Event handlers (work with raw data)
    onNodesChange: customOnNodesChange,
    onEdgesChange,
    onConnect,
    onNodeClick,
    onEdgeClick,
    onNodeDoubleClick: onNodeDoubleClickUpdated,
    onPaneClick,

    // Config operations (single source of truth)
    loadFromConfig: configHook.loadFromConfig,
    saveToConfig: configHook.saveToConfig,
    listAvailableTrees: configHook.listAvailableTrees,
    createEmptyTreeConfig: configHook.createEmptyTree,

    // Lock management from Config hook
    isLocked: configHook.isLocked,
    lockInfo: configHook.lockInfo,
    isCheckingLock: configHook.isCheckingLock,
    showReadOnlyOverlay: configHook.showReadOnlyOverlay,
    setCheckingLockState: configHook.setCheckingLockState,
    sessionId: configHook.sessionId,
    lockNavigationTree: configHook.lockNavigationTree,
    unlockNavigationTree: configHook.unlockNavigationTree,
    checkTreeLockStatus: configHook.checkTreeLockStatus,
    setupAutoUnlock: configHook.setupAutoUnlock,

    // Actions from Node/Edge management hook
    handleNodeFormSubmit: nodeEdgeHook.saveNodeChanges,
    handleEdgeFormSubmit: nodeEdgeHook.saveEdgeChanges,
    handleDeleteNode: nodeEdgeHook.deleteSelected,
    handleDeleteEdge: nodeEdgeHook.deleteSelected,
    addNewNode: nodeEdgeHook.addNewNode,
    cancelNodeChanges: nodeEdgeHook.cancelNodeChanges,
    closeSelectionPanel: nodeEdgeHook.closeSelectionPanel,
    deleteSelected: nodeEdgeHook.deleteSelected,
    resetNode: nodeEdgeHook.resetNode,

    // History actions removed

    // Additional actions
    discardChanges,
    performDiscardChanges,
    fitView,

    // Navigation actions
    navigateToTreeLevel,
    goBackToParent,
    navigateToParentView,
    navigateToParent,

    // Configuration
    defaultEdgeOptions,

    // Connection rules and debugging
    getConnectionRulesSummary: getRulesSummary,

    // User interface management
    setUserInterfaceFromProps,

    // ========================================
    // DEVICE CONTROL STATE & HANDLERS
    // ========================================

    // Device control state
    selectedHost: deviceControl.selectedHost,
    isControlActive: deviceControl.isControlActive,
    isTakingControl: deviceControl.isTakingControl,
    isRemotePanelOpen: deviceControl.isRemotePanelOpen,
    showRemotePanel: deviceControl.showRemotePanel,
    showAVPanel: deviceControl.showAVPanel,
    isVerificationActive: deviceControl.isVerificationActive,

    // Device control handlers
    handleDeviceSelect: deviceControl.handleDeviceSelect,
    handleTakeControl: deviceControl.handleTakeControl,
    handleToggleRemotePanel: deviceControl.handleToggleRemotePanel,
    handleConnectionChange: deviceControl.handleConnectionChange,
    handleDisconnectComplete: deviceControl.handleDisconnectComplete,

    // Host data (filtered by interface models)
    availableHosts: deviceControl.availableHosts,
    getHostByName: deviceControl.getHostByName,
    fetchHosts: deviceControl.fetchHosts,
  };
};

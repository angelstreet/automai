import { useMemo, useCallback, useContext } from 'react';

import { useNavigationConfig } from '../../contexts/navigation/NavigationConfigContext';
import NavigationContext from '../../contexts/navigation/NavigationContext';
import { useHostManager } from '../useHostManager';

export const useNavigationEditor = () => {
  // Get the navigation config context (save/load functionality)
  const navigationConfig = useNavigationConfig();

  // Get the unified navigation context (state management)
  const navigation = useContext(NavigationContext);
  if (!navigation) {
    throw new Error('useNavigationEditor must be used within a NavigationProvider');
  }

  // Get host manager
  const hostManager = useHostManager();

  // Create load and save functions that bridge the contexts
  const loadFromConfig = useCallback(
    (userInterfaceId: string) => {
      if (navigationConfig.loadFromConfig) {
        const state = {
          nodes: navigation.nodes,
          edges: navigation.edges,
          userInterface: navigation.userInterface,
          setNodes: navigation.setNodes,
          setEdges: navigation.setEdges,
          setUserInterface: navigation.setUserInterface,
          setInitialState: navigation.setInitialState,
          setHasUnsavedChanges: navigation.setHasUnsavedChanges,
          setIsLoading: navigation.setIsLoading,
          setError: navigation.setError,
        };
        return navigationConfig.loadFromConfig(userInterfaceId, state);
      }
    },
    [navigationConfig, navigation],
  );

  const saveToConfig = useCallback(
    (userInterfaceId: string) => {
      if (navigationConfig.saveToConfig) {
        const state = {
          nodes: navigation.nodes,
          edges: navigation.edges,
          userInterface: navigation.userInterface,
          setNodes: navigation.setNodes,
          setEdges: navigation.setEdges,
          setUserInterface: navigation.setUserInterface,
          setInitialState: navigation.setInitialState,
          setHasUnsavedChanges: navigation.setHasUnsavedChanges,
          setIsLoading: navigation.setIsLoading,
          setError: navigation.setError,
        };
        return navigationConfig.saveToConfig(userInterfaceId, state);
      }
    },
    [navigationConfig, navigation],
  );

  // Simple event handlers
  const onConnect = useCallback((connection: any) => {
    console.log('Connection attempt:', connection);
    // TODO: Implement connection logic
  }, []);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: any) => {
      navigation.setSelectedNode(node);
      navigation.setSelectedEdge(null); // Clear edge selection when node is selected
    },
    [navigation],
  );

  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: any) => {
      navigation.setSelectedEdge(edge);
      navigation.setSelectedNode(null); // Clear node selection when edge is selected
    },
    [navigation],
  );

  const onNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: any) => {
      // Prevent opening edit dialog for entry nodes
      if (node.data?.type === 'entry') {
        return;
      }
      navigation.openNodeDialog(node);
    },
    [navigation],
  );

  const onPaneClick = useCallback(() => {
    navigation.resetSelection();
  }, [navigation]);

  // Node and edge action handlers
  const handleNodeFormSubmit = useCallback(
    async (nodeForm: any) => {
      try {
        // Save verifications to database and get their IDs
        const verificationIds: string[] = [];
        const verificationsToSave = nodeForm.verifications || [];

        if (verificationsToSave && verificationsToSave.length > 0) {
          for (const verification of verificationsToSave) {
            try {
              const response = await fetch('/server/verification/saveVerification', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  name: verification.name,
                  device_model: verification.device_model || 'android_mobile',
                  verification_type: verification.verification_type || 'image',
                  command: verification.command || '',
                  parameters: verification.params || {},
                }),
              });

              const result = await response.json();
              if (result.success && result.verification_id) {
                verificationIds.push(result.verification_id);
              }
            } catch (error) {
              console.error('Error saving verification:', error);
            }
          }
        }

        // Update the node
        let updatedNodeData: any;

        if (navigation.isNewNode) {
          // Create new node
          updatedNodeData = {
            id: nodeForm.id || `node-${Date.now()}`,
            position: { x: 100, y: 100 },
            type: 'uiScreen',
            data: {
              label: nodeForm.label,
              type: nodeForm.type,
              description: nodeForm.description,
              verification_ids: verificationIds,
              verifications: nodeForm.verifications || [],
            },
          };
          navigation.setNodes([...navigation.nodes, updatedNodeData]);
        } else if (navigation.selectedNode) {
          // Update existing node
          updatedNodeData = {
            ...navigation.selectedNode,
            data: {
              ...navigation.selectedNode.data,
              label: nodeForm.label,
              type: nodeForm.type,
              description: nodeForm.description,
              verification_ids: verificationIds,
              verifications: nodeForm.verifications || [],
            },
          };
          const updatedNodes = navigation.nodes.map((node) =>
            node.id === navigation.selectedNode?.id ? updatedNodeData : node,
          );
          navigation.setNodes(updatedNodes);
          navigation.setSelectedNode(updatedNodeData);
        }

        // Close dialog and mark changes
        navigation.setIsNodeDialogOpen(false);
        navigation.markUnsavedChanges();
      } catch (error) {
        console.error('Error during node save:', error);
        navigation.setError('Failed to save node changes');
      }
    },
    [navigation],
  );

  const handleEdgeFormSubmit = useCallback(
    async (edgeForm: any) => {
      try {
        if (!navigation.selectedEdge) return;

        // Save main actions to database and get their IDs
        const actionIds: string[] = [];
        const actionsToSave = edgeForm.actions || [];

        if (actionsToSave.length > 0) {
          for (const action of actionsToSave) {
            try {
              const response = await fetch('/server/actions/saveAction', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  name: action.description || action.command,
                  device_model: 'android_mobile',
                  command: action.command,
                  params: action.params || {},
                }),
              });

              const result = await response.json();
              if (result.success && result.action_id) {
                actionIds.push(result.action_id);
              }
            } catch (error) {
              console.error('Error saving action:', error);
            }
          }
        }

        // Save retry actions to database and get their IDs
        const retryActionIds: string[] = [];
        const retryActionsToSave = edgeForm.retryActions || [];

        if (retryActionsToSave.length > 0) {
          for (const action of retryActionsToSave) {
            try {
              const response = await fetch('/server/actions/saveAction', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  name: action.description || action.command,
                  device_model: 'android_mobile',
                  command: action.command,
                  params: action.params || {},
                }),
              });

              const result = await response.json();
              if (result.success && result.action_id) {
                retryActionIds.push(result.action_id);
              }
            } catch (error) {
              console.error('Error saving retry action:', error);
            }
          }
        }

        // Update edge with action IDs and retry action IDs
        const updatedEdge = {
          ...navigation.selectedEdge,
          data: {
            ...navigation.selectedEdge.data,
            ...edgeForm,
            action_ids: actionIds,
            retry_action_ids: retryActionIds,
          },
        };

        const updatedEdges = navigation.edges.map((edge) =>
          edge.id === navigation.selectedEdge?.id ? updatedEdge : edge,
        );

        navigation.setEdges(updatedEdges);
        navigation.setSelectedEdge(updatedEdge);
        navigation.setIsEdgeDialogOpen(false);
        navigation.markUnsavedChanges();
      } catch (error) {
        console.error('Error during edge save:', error);
        navigation.setError('Failed to save edge actions');
      }
    },
    [navigation],
  );

  const addNewNode = useCallback(
    (type: string = 'screen', position: { x: number; y: number } = { x: 250, y: 250 }) => {
      const validType = type as 'screen' | 'dialog' | 'popup' | 'overlay' | 'menu' | 'entry';
      const newNode = {
        id: `node-${Date.now()}`,
        type: 'uiScreen',
        position,
        data: {
          type: validType,
          label: `New ${type}`,
          description: '',
          verifications: [],
          verification_ids: [],
        },
      };
      navigation.setNodes([...navigation.nodes, newNode as any]);
      navigation.markUnsavedChanges();
    },
    [navigation],
  );

  const cancelNodeChanges = useCallback(() => {
    navigation.setIsNodeDialogOpen(false);
    navigation.setNodeForm({
      label: '',
      type: 'screen',
      description: '',
      verifications: [],
    });
  }, [navigation]);

  const closeSelectionPanel = useCallback(() => {
    navigation.resetSelection();
  }, [navigation]);

  const deleteSelected = useCallback(() => {
    if (navigation.selectedNode) {
      const filteredNodes = navigation.nodes.filter((n) => n.id !== navigation.selectedNode?.id);
      navigation.setNodes(filteredNodes);
      navigation.setSelectedNode(null);
      navigation.markUnsavedChanges();
    }
    if (navigation.selectedEdge) {
      const filteredEdges = navigation.edges.filter((e) => e.id !== navigation.selectedEdge?.id);
      navigation.setEdges(filteredEdges);
      navigation.setSelectedEdge(null);
      navigation.markUnsavedChanges();
    }
  }, [navigation]);

  const resetNode = useCallback(
    (nodeId: string) => {
      console.log('Reset node:', nodeId);
      navigation.setIsNodeDialogOpen(false);
    },
    [navigation],
  );

  const discardChanges = useCallback(() => {
    navigation.setIsDiscardDialogOpen(true);
  }, [navigation]);

  const performDiscardChanges = useCallback(() => {
    navigation.resetToInitialState();
    navigation.setIsDiscardDialogOpen(false);
  }, [navigation]);

  const fitView = useCallback(() => {
    navigation.fitViewToNodes();
  }, [navigation]);

  const navigateToParent = useCallback(() => {
    // Simple fallback
    console.log('Navigate to parent');
  }, []);

  const setUserInterfaceFromProps = useCallback(
    (userInterface: any) => {
      navigation.setUserInterface(userInterface);
    },
    [navigation],
  );

  // Combine all functionality into the same interface as the original useNavigationEditor
  return useMemo(
    () => ({
      // State (filtered views for ReactFlow display)
      nodes: navigation.nodes,
      edges: navigation.edges,

      // Raw data (single source of truth)
      allNodes: navigation.nodes, // In unified context, nodes are already the source of truth
      allEdges: navigation.edges,

      // Tree and interface state
      treeName: navigation.currentTreeName,
      treeId: navigation.currentTreeId,
      interfaceId: navigation.interfaceId,
      currentTreeId: navigation.currentTreeId,
      currentTreeName: navigation.currentTreeName,
      navigationPath: navigation.navigationPath,
      navigationNamePath: navigation.navigationNamePath,
      userInterface: navigation.userInterface,
      rootTree: navigation.rootTree,
      viewPath: navigation.viewPath,

      // Loading states
      isLoadingInterface: navigation.isLoadingInterface,
      isLoading: navigation.isLoading,

      // Selection state
      selectedNode: navigation.selectedNode,
      selectedEdge: navigation.selectedEdge,

      // Dialog states
      isNodeDialogOpen: navigation.isNodeDialogOpen,
      isEdgeDialogOpen: navigation.isEdgeDialogOpen,
      isDiscardDialogOpen: navigation.isDiscardDialogOpen,

      // Form states
      isNewNode: navigation.isNewNode,
      nodeForm: navigation.nodeForm,
      edgeForm: navigation.edgeForm,

      // Error and success states
      error: navigation.error,
      success: navigation.success,
      hasUnsavedChanges: navigation.hasUnsavedChanges,

      // Focus and filtering
      focusNodeId: navigation.focusNodeId,
      maxDisplayDepth: navigation.maxDisplayDepth,
      availableFocusNodes: navigation.availableFocusNodes,

      // React Flow refs and state
      reactFlowWrapper: navigation.reactFlowWrapper,
      reactFlowInstance: navigation.reactFlowInstance,
      pendingConnection: null, // Not used in unified context

      // Setters (maintain compatibility)
      setNodes: navigation.setNodes,
      setEdges: navigation.setEdges,
      setHasUnsavedChanges: navigation.setHasUnsavedChanges,
      setTreeName: navigation.setCurrentTreeName,
      setIsLoadingInterface: navigation.setIsLoadingInterface,
      setSelectedNode: navigation.setSelectedNode,
      setSelectedEdge: navigation.setSelectedEdge,
      setIsNodeDialogOpen: navigation.setIsNodeDialogOpen,
      setIsEdgeDialogOpen: navigation.setIsEdgeDialogOpen,
      setIsNewNode: navigation.setIsNewNode,
      setNodeForm: navigation.setNodeForm,
      setEdgeForm: navigation.setEdgeForm,
      setIsLoading: navigation.setIsLoading,
      setError: navigation.setError,
      setSuccess: navigation.setSuccess,
      setPendingConnection: () => {}, // Not used
      setReactFlowInstance: navigation.setReactFlowInstance,
      setIsDiscardDialogOpen: navigation.setIsDiscardDialogOpen,

      // Event handlers
      onNodesChange: navigation.onNodesChange,
      onEdgesChange: navigation.onEdgesChange,
      onConnect,
      onNodeClick,
      onEdgeClick,
      onNodeDoubleClick,
      onPaneClick,

      // Focus management
      setFocusNode: navigation.setFocusNodeId,
      setDisplayDepth: navigation.setMaxDisplayDepth,
      resetFocus: () => {
        navigation.setFocusNodeId(null);
        navigation.setMaxDisplayDepth(5);
      },
      isNodeDescendantOf: () => false, // Not implemented in unified context

      // Config operations - from NavigationConfigContext
      loadFromConfig,
      saveToConfig,
      listAvailableTrees: navigationConfig.listAvailableUserInterfaces,
      createEmptyTreeConfig: navigationConfig.createEmptyTree,
      loadAvailableTrees: navigationConfig.listAvailableUserInterfaces,

      // Lock management - from NavigationConfigContext
      isLocked: navigationConfig.isLocked,
      lockInfo: navigationConfig.lockInfo,
      showReadOnlyOverlay: navigationConfig.showReadOnlyOverlay,
      setCheckingLockState: navigationConfig.setCheckingLockState,
      sessionId: navigationConfig.sessionId,
      lockNavigationTree: navigationConfig.lockNavigationTree,
      unlockNavigationTree: navigationConfig.unlockNavigationTree,
      setupAutoUnlock: navigationConfig.setupAutoUnlock,

      // Node/Edge management actions
      handleNodeFormSubmit,
      handleEdgeFormSubmit,
      handleDeleteNode: deleteSelected,
      handleDeleteEdge: deleteSelected,
      addNewNode,
      cancelNodeChanges,
      closeSelectionPanel,
      deleteSelected,
      resetNode,

      // Additional actions
      discardChanges,
      performDiscardChanges,
      fitView,

      // Navigation actions
      navigateToTreeLevel: () => {}, // Not implemented
      goBackToParent: navigateToParent,
      navigateToParentView: navigateToParent,
      navigateToParent,

      // Configuration
      defaultEdgeOptions: {
        type: 'uiNavigation',
        animated: false,
        style: { strokeWidth: 2, stroke: '#b1b1b7' },
      },

      // Connection rules
      getConnectionRulesSummary: () => 'No specific connection rules defined',

      // User interface management
      setUserInterfaceFromProps,

      // Device control state - from HostManager
      selectedHost: hostManager.selectedHost,
      isControlActive: hostManager.isControlActive,
      isRemotePanelOpen: hostManager.isRemotePanelOpen,
      showRemotePanel: hostManager.showRemotePanel,
      showAVPanel: hostManager.showAVPanel,
      isVerificationActive: false, // Not implemented

      // Device control handlers - from HostManager
      handleDeviceSelect: hostManager.handleDeviceSelect,
      handleControlStateChange: hostManager.handleControlStateChange,
      handleToggleRemotePanel: hostManager.handleToggleRemotePanel,
      handleConnectionChange: () => {}, // Not implemented
      handleDisconnectComplete: hostManager.handleDisconnectComplete,

      // Host data - from HostManager (filtered by userInterface models)
      availableHosts: hostManager.getHostsByModel(navigation.userInterface?.models || []),
      getHostByName: hostManager.getHostByName,
    }),
    [
      navigation,
      navigationConfig,
      hostManager,
      loadFromConfig,
      saveToConfig,
      onConnect,
      onNodeClick,
      onEdgeClick,
      onNodeDoubleClick,
      onPaneClick,
      handleNodeFormSubmit,
      handleEdgeFormSubmit,
      addNewNode,
      cancelNodeChanges,
      closeSelectionPanel,
      deleteSelected,
      resetNode,
      discardChanges,
      performDiscardChanges,
      fitView,
      navigateToParent,
      setUserInterfaceFromProps,
    ],
  );
};

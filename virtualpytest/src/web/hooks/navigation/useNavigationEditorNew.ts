import { useMemo } from 'react';

import { useNavigationNodesHook } from './useNavigationNodesHook';
import { useNavigationUIHook } from './useNavigationUIHook';
import { useNavigationFlowHook } from './useNavigationFlowHook';
import { useNavigationActionsHook } from './useNavigationActionsHook';

// Optional import for NodeEdgeManagement - will be available when wrapped with NodeEdgeManagementProvider
import { useNodeEdgeManagement } from '../../contexts/navigation/NodeEdgeManagementContext';

export const useNavigationEditorNew = () => {
  // Use all focused hooks
  const nodesHook = useNavigationNodesHook();
  const uiHook = useNavigationUIHook();
  const flowHook = useNavigationFlowHook();
  const actionsHook = useNavigationActionsHook();

  // Try to get NodeEdgeManagement context if available (will be undefined if not wrapped with provider)
  let nodeEdgeHook;
  try {
    nodeEdgeHook = useNodeEdgeManagement();
  } catch (error) {
    // NodeEdgeManagementProvider not available - this is expected in some contexts
    nodeEdgeHook = null;
  }

  // Combine all hook returns into the same interface as the original useNavigationEditor
  return useMemo(
    () => ({
      // State (filtered views for ReactFlow display)
      nodes: nodesHook.nodes,
      edges: nodesHook.edges,

      // Raw data (single source of truth)
      allNodes: nodesHook.allNodes,
      allEdges: nodesHook.allEdges,

      // Tree and interface state
      treeName: flowHook.currentTreeName,
      treeId: flowHook.currentTreeId,
      interfaceId: flowHook.interfaceId,
      currentTreeId: flowHook.currentTreeId,
      currentTreeName: flowHook.currentTreeName,
      navigationPath: flowHook.navigationPath,
      navigationNamePath: flowHook.navigationNamePath,
      userInterface: flowHook.userInterface,
      rootTree: flowHook.rootTree,
      viewPath: flowHook.viewPath,

      // Loading states
      isLoadingInterface: uiHook.isLoadingInterface,
      isLoading: uiHook.isSaving, // Map isSaving to isLoading for compatibility

      // Selection state
      selectedNode: nodesHook.selectedNode,
      selectedEdge: nodesHook.selectedEdge,

      // Dialog states
      isNodeDialogOpen: uiHook.isNodeDialogOpen,
      isEdgeDialogOpen: uiHook.isEdgeDialogOpen,
      isDiscardDialogOpen: uiHook.isDiscardDialogOpen,

      // Form states
      isNewNode: uiHook.isNewNode,
      nodeForm: uiHook.nodeForm,
      edgeForm: uiHook.edgeForm,

      // Error and success states
      error: uiHook.saveError,
      success: uiHook.successMessage,
      hasUnsavedChanges: uiHook.hasUnsavedChanges,

      // Focus and filtering
      focusNodeId: nodesHook.focusNodeId,
      maxDisplayDepth: nodesHook.maxDisplayDepth,
      availableFocusNodes: nodesHook.availableFocusNodes,

      // React Flow refs and state
      reactFlowWrapper: flowHook.reactFlowWrapper,
      reactFlowInstance: flowHook.reactFlowInstance,
      pendingConnection: nodesHook.pendingConnection,

      // Setters (maintain compatibility)
      setNodes: nodesHook.setNodes,
      setEdges: nodesHook.setEdges,
      setHasUnsavedChanges: uiHook.setHasUnsavedChanges,
      setTreeName: flowHook.setCurrentTreeName,
      setIsLoadingInterface: uiHook.setIsLoadingInterface,
      setSelectedNode: nodesHook.setSelectedNode,
      setSelectedEdge: nodesHook.setSelectedEdge,
      setIsNodeDialogOpen: uiHook.setIsNodeDialogOpen,
      setIsEdgeDialogOpen: uiHook.setIsEdgeDialogOpen,
      setIsNewNode: uiHook.setIsNewNode,
      setNodeForm: uiHook.setNodeForm,
      setEdgeForm: uiHook.setEdgeForm,
      setIsLoading: uiHook.setSavingState,
      setError: uiHook.setErrorMessage,
      setSuccess: uiHook.setSuccessMessage,
      setPendingConnection: nodesHook.setPendingConnection,
      setReactFlowInstance: flowHook.setReactFlowInstance,
      setIsDiscardDialogOpen: uiHook.setIsDiscardDialogOpen,

      // Event handlers
      onNodesChange: nodesHook.onNodesChange,
      onEdgesChange: nodesHook.onEdgesChange,
      onConnect: nodesHook.onConnect,
      onNodeClick: nodesHook.onNodeClick,
      onEdgeClick: nodesHook.onEdgeClick,
      onNodeDoubleClick: nodesHook.onNodeDoubleClick,
      onPaneClick: nodesHook.onPaneClick,

      // Focus management
      setFocusNode: nodesHook.setFocusNode,
      setDisplayDepth: nodesHook.setDisplayDepth,
      resetFocus: nodesHook.resetFocus,
      isNodeDescendantOf: nodesHook.isNodeDescendantOf,

      // Config operations
      loadFromConfig: actionsHook.loadFromConfig,
      saveToConfig: actionsHook.saveToConfig,
      listAvailableTrees: actionsHook.listAvailableTrees,
      createEmptyTreeConfig: actionsHook.createEmptyTreeConfig,
      loadAvailableTrees: actionsHook.loadAvailableTrees,

      // Lock management
      isLocked: actionsHook.isLocked,
      lockInfo: actionsHook.lockInfo,
      showReadOnlyOverlay: actionsHook.showReadOnlyOverlay,
      setCheckingLockState: actionsHook.setCheckingLockState,
      sessionId: actionsHook.sessionId,
      lockNavigationTree: actionsHook.lockNavigationTree,
      unlockNavigationTree: actionsHook.unlockNavigationTree,
      setupAutoUnlock: actionsHook.setupAutoUnlock,

      // Node/Edge management actions - use NodeEdgeManagement context if available, otherwise fallback to actions hook
      handleNodeFormSubmit: nodeEdgeHook?.saveNodeChanges || actionsHook.handleNodeFormSubmit,
      handleEdgeFormSubmit: nodeEdgeHook?.saveEdgeChanges || actionsHook.handleEdgeFormSubmit,
      handleDeleteNode: nodeEdgeHook?.deleteSelected || actionsHook.handleDeleteNode,
      handleDeleteEdge: nodeEdgeHook?.deleteSelected || actionsHook.handleDeleteEdge,
      addNewNode: nodeEdgeHook?.addNewNode || actionsHook.addNewNode,
      cancelNodeChanges: nodeEdgeHook?.cancelNodeChanges || actionsHook.cancelNodeChanges,
      closeSelectionPanel: nodeEdgeHook?.closeSelectionPanel || actionsHook.closeSelectionPanel,
      deleteSelected: nodeEdgeHook?.deleteSelected || actionsHook.deleteSelected,
      resetNode: nodeEdgeHook?.resetNode || actionsHook.resetNode,

      // Additional actions
      discardChanges: uiHook.discardChanges,
      performDiscardChanges: uiHook.performDiscardChanges,
      fitView: flowHook.fitView,

      // Navigation actions
      navigateToTreeLevel: flowHook.navigateToTreeLevel,
      goBackToParent: flowHook.goBackToParent,
      navigateToParentView: flowHook.navigateToParentView,
      navigateToParent: flowHook.navigateToParent,

      // Configuration
      defaultEdgeOptions: flowHook.defaultEdgeOptions,

      // Connection rules
      getConnectionRulesSummary: nodesHook.getConnectionRulesSummary,

      // User interface management
      setUserInterfaceFromProps: flowHook.setUserInterfaceFromProps,

      // Device control state
      selectedHost: actionsHook.selectedHost,
      isControlActive: actionsHook.isControlActive,
      isRemotePanelOpen: actionsHook.isRemotePanelOpen,
      showRemotePanel: actionsHook.showRemotePanel,
      showAVPanel: actionsHook.showAVPanel,
      isVerificationActive: actionsHook.isVerificationActive,

      // Device control handlers
      handleDeviceSelect: actionsHook.handleDeviceSelect,
      handleControlStateChange: actionsHook.handleControlStateChange,
      handleToggleRemotePanel: actionsHook.handleToggleRemotePanel,
      handleConnectionChange: actionsHook.handleConnectionChange,
      handleDisconnectComplete: actionsHook.handleDisconnectComplete,

      // Host data
      availableHosts: actionsHook.availableHosts,
      getHostByName: actionsHook.getHostByName,
    }),
    [nodesHook, uiHook, flowHook, actionsHook, nodeEdgeHook],
  );
};

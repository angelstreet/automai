import { useMemo } from 'react';

import { useHostManager } from '../../contexts';
import {
  useNavigationActions,
  useNavigationNodes,
  useNavigationUI,
  useNavigationFlow,
} from '../../contexts/navigation';

export const useNavigationActionsHook = () => {
  // Use the focused contexts
  const actionsContext = useNavigationActions();
  const nodesContext = useNavigationNodes();
  const uiContext = useNavigationUI();
  const flowContext = useNavigationFlow();
  const hostManagerContext = useHostManager();

  // Memoize the combined state to prevent unnecessary re-renders
  const combinedState = useMemo(() => {
    return {
      // Actions coordination
      ...actionsContext,

      // Core navigation state
      nodes: nodesContext.nodes,
      edges: nodesContext.edges,
      selectedNode: nodesContext.selectedNode,
      selectedEdge: nodesContext.selectedEdge,

      // UI state
      isNodeDialogOpen: uiContext.isNodeDialogOpen,
      isEdgeDialogOpen: uiContext.isEdgeDialogOpen,
      nodeForm: uiContext.nodeForm,
      edgeForm: uiContext.edgeForm,
      hasUnsavedChanges: uiContext.hasUnsavedChanges,

      // Flow state
      currentTreeId: flowContext.currentTreeId,
      navigationPath: flowContext.navigationPath,
      userInterface: flowContext.userInterface,
      reactFlowInstance: flowContext.reactFlowInstance,

      // Host manager state
      selectedHost: hostManagerContext.selectedHost,
      selectedDeviceId: hostManagerContext.selectedDeviceId,
      isControlActive: hostManagerContext.isControlActive,
      availableHosts: hostManagerContext.availableHosts,
      isRemotePanelOpen: hostManagerContext.isRemotePanelOpen,
      showRemotePanel: hostManagerContext.showRemotePanel,
      showAVPanel: hostManagerContext.showAVPanel,
      isVerificationActive: hostManagerContext.isVerificationActive,
      handleDeviceSelect: hostManagerContext.handleDeviceSelect,
      handleControlStateChange: hostManagerContext.handleControlStateChange,
      handleToggleRemotePanel: hostManagerContext.handleToggleRemotePanel,
      handleConnectionChange: hostManagerContext.handleConnectionChange,
      handleDisconnectComplete: hostManagerContext.handleDisconnectComplete,
      getHostByName: hostManagerContext.getHostByName,
    };
  }, [
    actionsContext,
    nodesContext.nodes,
    nodesContext.edges,
    nodesContext.selectedNode,
    nodesContext.selectedEdge,
    uiContext.isNodeDialogOpen,
    uiContext.isEdgeDialogOpen,
    uiContext.nodeForm,
    uiContext.edgeForm,
    uiContext.hasUnsavedChanges,
    flowContext.currentTreeId,
    flowContext.navigationPath,
    flowContext.userInterface,
    flowContext.reactFlowInstance,
    hostManagerContext,
  ]);

  return combinedState;
};

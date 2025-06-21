import { useCallback, useMemo } from 'react';

import { useNavigationActions } from '../../contexts/navigation';
import { useNavigationNodes, useNavigationUI, useNavigationFlow } from '../../contexts/navigation';

// Optional import for NavigationConfig - will be available when wrapped with NavigationConfigProvider
import { useNavigationConfig } from '../../contexts';

// Optional import for DeviceControl - will be available when wrapped with DeviceControlProvider
import { useDeviceControl } from '../../contexts/DeviceControlContext';

export const useNavigationActionsHook = () => {
  console.log('[@hook:useNavigationActionsHook] Initializing actions hook');

  // Use the focused contexts
  const actionsContext = useNavigationActions();
  const nodesContext = useNavigationNodes();
  const uiContext = useNavigationUI();
  const flowContext = useNavigationFlow();

  // Use existing context hooks with fallbacks for provider hierarchy issues
  let configHook;
  try {
    configHook = useNavigationConfig();
  } catch (error) {
    console.log('[@hook:useNavigationActionsHook] NavigationConfig context not available');
    configHook = null;
  }

  let deviceHook;
  try {
    deviceHook = useDeviceControl();
  } catch (error) {
    console.log('[@hook:useNavigationActionsHook] DeviceControl context not available');
    deviceHook = null;
  }

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

      // Optional config state (when available)
      ...(configHook && {
        loadFromConfig: configHook.loadFromConfig,
        saveToConfig: configHook.saveToConfig,
        isLocked: configHook.isLocked,
        lockInfo: configHook.lockInfo,
      }),

      // Optional device state (when available)
      ...(deviceHook && {
        selectedHost: deviceHook.selectedHost,
        isControlActive: deviceHook.isControlActive,
        availableHosts: deviceHook.availableHosts,
      }),
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
    configHook,
    deviceHook,
  ]);

  return combinedState;
};

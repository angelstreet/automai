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
        showReadOnlyOverlay: configHook.showReadOnlyOverlay,
        setCheckingLockState: configHook.setCheckingLockState,
        sessionId: configHook.sessionId,
        lockNavigationTree: configHook.lockNavigationTree,
        unlockNavigationTree: configHook.unlockNavigationTree,
        setupAutoUnlock: configHook.setupAutoUnlock,
        listAvailableTrees: configHook.listAvailableUserInterfaces,
        createEmptyTreeConfig: configHook.createEmptyTree,
        loadAvailableTrees: async () => {
          try {
            return await configHook.listAvailableUserInterfaces();
          } catch (error) {
            console.error('[@hook:useNavigationActionsHook] Error loading trees:', error);
            return [];
          }
        },
      }),

      // Fallback config functions when NavigationConfig context is not available
      ...(!configHook && {
        loadFromConfig: () =>
          console.warn('[@hook:useNavigationActionsHook] NavigationConfig not available'),
        saveToConfig: () =>
          console.warn('[@hook:useNavigationActionsHook] NavigationConfig not available'),
        isLocked: false,
        lockInfo: null,
        showReadOnlyOverlay: false,
        setCheckingLockState: () =>
          console.warn('[@hook:useNavigationActionsHook] NavigationConfig not available'),
        sessionId: 'fallback-session',
        lockNavigationTree: () => Promise.resolve(false),
        unlockNavigationTree: () => Promise.resolve(true),
        setupAutoUnlock: () => () => {},
        listAvailableTrees: () => Promise.resolve([]),
        createEmptyTreeConfig: () =>
          console.warn('[@hook:useNavigationActionsHook] NavigationConfig not available'),
        loadAvailableTrees: () => Promise.resolve([]),
      }),

      // Optional device state (when available)
      ...(deviceHook && {
        selectedHost: deviceHook.selectedHost,
        isControlActive: deviceHook.isControlActive,
        availableHosts: deviceHook.availableHosts,
        isRemotePanelOpen: deviceHook.isRemotePanelOpen,
        showRemotePanel: deviceHook.showRemotePanel,
        showAVPanel: deviceHook.showAVPanel,
        isVerificationActive: deviceHook.isVerificationActive,
        handleDeviceSelect: deviceHook.handleDeviceSelect,
        handleControlStateChange: deviceHook.handleControlStateChange,
        handleToggleRemotePanel: deviceHook.handleToggleRemotePanel,
        handleConnectionChange: deviceHook.handleConnectionChange,
        handleDisconnectComplete: deviceHook.handleDisconnectComplete,
        getHostByName: deviceHook.getHostByName,
        fetchHosts: deviceHook.fetchHosts,
      }),

      // Fallback device functions when DeviceControl context is not available
      ...(!deviceHook && {
        selectedHost: null,
        isControlActive: false,
        availableHosts: [],
        isRemotePanelOpen: false,
        showRemotePanel: false,
        showAVPanel: false,
        isVerificationActive: false,
        handleDeviceSelect: () =>
          console.warn('[@hook:useNavigationActionsHook] DeviceControl not available'),
        handleControlStateChange: () =>
          console.warn('[@hook:useNavigationActionsHook] DeviceControl not available'),
        handleToggleRemotePanel: () =>
          console.warn('[@hook:useNavigationActionsHook] DeviceControl not available'),
        handleConnectionChange: () =>
          console.warn('[@hook:useNavigationActionsHook] DeviceControl not available'),
        handleDisconnectComplete: () =>
          console.warn('[@hook:useNavigationActionsHook] DeviceControl not available'),
        getHostByName: () => null,
        fetchHosts: () => Promise.resolve([]),
      }),

      // Placeholder functions for NodeEdge management (will be provided by NodeEdgeManagementProvider)
      handleNodeFormSubmit: () =>
        console.warn('[@hook:useNavigationActionsHook] NodeEdgeManagement not available'),
      handleEdgeFormSubmit: () =>
        console.warn('[@hook:useNavigationActionsHook] NodeEdgeManagement not available'),
      handleDeleteNode: () =>
        console.warn('[@hook:useNavigationActionsHook] NodeEdgeManagement not available'),
      handleDeleteEdge: () =>
        console.warn('[@hook:useNavigationActionsHook] NodeEdgeManagement not available'),
      addNewNode: () =>
        console.warn('[@hook:useNavigationActionsHook] NodeEdgeManagement not available'),
      cancelNodeChanges: () =>
        console.warn('[@hook:useNavigationActionsHook] NodeEdgeManagement not available'),
      closeSelectionPanel: () =>
        console.warn('[@hook:useNavigationActionsHook] NodeEdgeManagement not available'),
      deleteSelected: () =>
        console.warn('[@hook:useNavigationActionsHook] NodeEdgeManagement not available'),
      resetNode: () =>
        console.warn('[@hook:useNavigationActionsHook] NodeEdgeManagement not available'),
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

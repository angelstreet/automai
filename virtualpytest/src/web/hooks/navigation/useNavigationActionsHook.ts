import { useCallback, useMemo } from 'react';

import { useNavigationActions } from '../../contexts/navigation';
import { useNavigationNodes, useNavigationUI, useNavigationFlow } from '../../contexts/navigation';

// Optional import for NavigationConfig - will be available when wrapped with NavigationConfigProvider
import { useNavigationConfig } from '../../contexts';

// Optional import for HostManager - will be available when wrapped with HostManagerProvider
import { useHostManager } from '../../contexts/index';

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

  let hostManagerHook;
  try {
    hostManagerHook = useHostManager();
  } catch (error) {
    console.log('[@hook:useNavigationActionsHook] HostManager context not available');
    hostManagerHook = null;
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
        loadFromConfig: (userInterfaceId: string) => {
          // Create state object with all required functions for NavigationConfig
          const configState = {
            nodes: nodesContext.nodes,
            edges: nodesContext.edges,
            userInterface: flowContext.userInterface,
            setNodes: nodesContext.setNodes,
            setEdges: nodesContext.setEdges,
            setUserInterface: flowContext.setUserInterface,
            setInitialState: nodesContext.setInitialState,
            setHasUnsavedChanges: uiContext.setHasUnsavedChanges,
            setIsLoading: uiContext.setIsLoadingInterface,
            setError: uiContext.setError,
          };
          return configHook.loadFromConfig(userInterfaceId, configState);
        },
        saveToConfig: (userInterfaceId: string) => {
          // Create state object with all required functions for NavigationConfig
          const configState = {
            nodes: nodesContext.nodes,
            edges: nodesContext.edges,
            userInterface: flowContext.userInterface,
            setNodes: nodesContext.setNodes,
            setEdges: nodesContext.setEdges,
            setUserInterface: flowContext.setUserInterface,
            setInitialState: nodesContext.setInitialState,
            setHasUnsavedChanges: uiContext.setHasUnsavedChanges,
            setIsLoading: uiContext.setIsLoadingInterface,
            setError: uiContext.setError,
          };
          return configHook.saveToConfig(userInterfaceId, configState);
        },
        isLocked: configHook.isLocked,
        lockInfo: configHook.lockInfo,
        showReadOnlyOverlay: configHook.showReadOnlyOverlay,
        setCheckingLockState: configHook.setCheckingLockState,
        sessionId: configHook.sessionId,
        lockNavigationTree: configHook.lockNavigationTree,
        unlockNavigationTree: configHook.unlockNavigationTree,
        setupAutoUnlock: configHook.setupAutoUnlock,
        listAvailableTrees: configHook.listAvailableUserInterfaces,
        createEmptyTreeConfig: (userInterfaceId: string) => {
          // Create state object with all required functions for NavigationConfig
          const configState = {
            nodes: nodesContext.nodes,
            edges: nodesContext.edges,
            userInterface: flowContext.userInterface,
            setNodes: nodesContext.setNodes,
            setEdges: nodesContext.setEdges,
            setUserInterface: flowContext.setUserInterface,
            setInitialState: nodesContext.setInitialState,
            setHasUnsavedChanges: uiContext.setHasUnsavedChanges,
            setIsLoading: uiContext.setIsLoadingInterface,
            setError: uiContext.setError,
          };
          return configHook.createEmptyTree(userInterfaceId, configState);
        },
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
        loadFromConfig: (userInterfaceId: string, state?: any) => {
          console.warn(
            '[@hook:useNavigationActionsHook] NavigationConfig not available - loadFromConfig called',
          );
          return Promise.resolve();
        },
        saveToConfig: (userInterfaceId: string, state?: any) => {
          console.warn(
            '[@hook:useNavigationActionsHook] NavigationConfig not available - saveToConfig called',
          );
          return Promise.resolve();
        },
        isLocked: false,
        lockInfo: null,
        showReadOnlyOverlay: false,
        setCheckingLockState: (checking: boolean) =>
          console.warn(
            '[@hook:useNavigationActionsHook] NavigationConfig not available - setCheckingLockState called',
          ),
        sessionId: 'fallback-session',
        lockNavigationTree: (userInterfaceId: string) => {
          console.warn(
            '[@hook:useNavigationActionsHook] NavigationConfig not available - lockNavigationTree called',
          );
          return Promise.resolve(false);
        },
        unlockNavigationTree: (userInterfaceId: string) => {
          console.warn(
            '[@hook:useNavigationActionsHook] NavigationConfig not available - unlockNavigationTree called',
          );
          return Promise.resolve(true);
        },
        setupAutoUnlock: (userInterfaceId: string) => {
          console.warn(
            '[@hook:useNavigationActionsHook] NavigationConfig not available - setupAutoUnlock called',
          );
          return () => {};
        },
        listAvailableTrees: () => {
          console.warn(
            '[@hook:useNavigationActionsHook] NavigationConfig not available - listAvailableTrees called',
          );
          return Promise.resolve([]);
        },
        createEmptyTreeConfig: (userInterfaceId: string, state?: any) => {
          console.warn(
            '[@hook:useNavigationActionsHook] NavigationConfig not available - createEmptyTreeConfig called',
          );
          return Promise.resolve();
        },
        loadAvailableTrees: () => {
          console.warn(
            '[@hook:useNavigationActionsHook] NavigationConfig not available - loadAvailableTrees called',
          );
          return Promise.resolve([]);
        },
      }),

      // Optional host manager state (when available)
      ...(hostManagerHook && {
        selectedHost: hostManagerHook.selectedHost,
        isControlActive: hostManagerHook.isControlActive,
        availableHosts: hostManagerHook.availableHosts,
        isRemotePanelOpen: hostManagerHook.isRemotePanelOpen,
        showRemotePanel: hostManagerHook.showRemotePanel,
        showAVPanel: hostManagerHook.showAVPanel,
        isVerificationActive: hostManagerHook.isVerificationActive,
        handleDeviceSelect: hostManagerHook.handleDeviceSelect,
        handleControlStateChange: hostManagerHook.handleControlStateChange,
        handleToggleRemotePanel: hostManagerHook.handleToggleRemotePanel,
        handleConnectionChange: hostManagerHook.handleConnectionChange,
        handleDisconnectComplete: hostManagerHook.handleDisconnectComplete,
        getHostByName: hostManagerHook.getHostByName,
      }),

      // Fallback host manager functions when HostManager context is not available
      ...(!hostManagerHook && {
        selectedHost: null,
        isControlActive: false,
        availableHosts: [],
        isRemotePanelOpen: false,
        showRemotePanel: false,
        showAVPanel: false,
        isVerificationActive: false,
        handleDeviceSelect: () =>
          console.warn('[@hook:useNavigationActionsHook] HostManager not available'),
        handleControlStateChange: () =>
          console.warn('[@hook:useNavigationActionsHook] HostManager not available'),
        handleToggleRemotePanel: () =>
          console.warn('[@hook:useNavigationActionsHook] HostManager not available'),
        handleConnectionChange: () =>
          console.warn('[@hook:useNavigationActionsHook] HostManager not available'),
        handleDisconnectComplete: () =>
          console.warn('[@hook:useNavigationActionsHook] HostManager not available'),
        getHostByName: () => null,
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
    hostManagerHook,
  ]);

  return combinedState;
};

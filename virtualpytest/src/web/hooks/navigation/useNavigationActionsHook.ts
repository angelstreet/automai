import { useCallback, useMemo } from 'react';

import { useDeviceControl, useNavigationConfig } from '../../contexts';
import { useNavigationActions } from '../../contexts/navigation';
import { useNavigationNodes, useNavigationUI, useNavigationFlow } from '../../contexts/navigation';

export const useNavigationActionsHook = () => {
  console.log('[@hook:useNavigationActionsHook] Initializing actions hook');

  // Use the focused contexts
  const actionsContext = useNavigationActions();
  const nodesContext = useNavigationNodes();
  const uiContext = useNavigationUI();
  const flowContext = useNavigationFlow();

  // Use existing context hooks
  const configHook = useNavigationConfig();
  const deviceControl = useDeviceControl();

  // Create config state object for context operations
  const configState = useMemo(
    () => ({
      nodes: nodesContext.nodes,
      edges: nodesContext.edges,
      userInterface: flowContext.userInterface,
      setNodes: nodesContext.setNodes,
      setEdges: nodesContext.setEdges,
      setUserInterface: flowContext.setUserInterface,
      setInitialState: nodesContext.setInitialState,
      setHasUnsavedChanges: uiContext.setHasUnsavedChanges,
      setIsLoading: uiContext.setIsLoading,
      setError: uiContext.setError,
    }),
    [
      nodesContext.nodes,
      nodesContext.edges,
      flowContext.userInterface,
      nodesContext.setNodes,
      nodesContext.setEdges,
      flowContext.setUserInterface,
      nodesContext.setInitialState,
      uiContext.setHasUnsavedChanges,
      uiContext.setIsLoading,
      uiContext.setError,
    ],
  );

  // Create wrapper functions for config operations
  const loadFromConfig = useCallback(
    (userInterfaceId: string) => {
      console.log('[@hook:useNavigationActionsHook] Loading from config:', userInterfaceId);
      return configHook.loadFromConfig(userInterfaceId, configState);
    },
    [configHook, configState],
  );

  const saveToConfig = useCallback(
    (userInterfaceId: string) => {
      console.log('[@hook:useNavigationActionsHook] Saving to config:', userInterfaceId);
      return configHook.saveToConfig(userInterfaceId, configState);
    },
    [configHook, configState],
  );

  const createEmptyTreeConfig = useCallback(
    (userInterfaceId: string) => {
      console.log('[@hook:useNavigationActionsHook] Creating empty tree config:', userInterfaceId);
      return configHook.createEmptyTree(userInterfaceId, configState);
    },
    [configHook, configState],
  );

  // Load available trees
  const loadAvailableTrees = useCallback(async () => {
    console.log('[@hook:useNavigationActionsHook] Loading available trees');
    try {
      const userInterfaces = await configHook.listAvailableUserInterfaces();
      return userInterfaces;
    } catch (error) {
      console.error('[@hook:useNavigationActionsHook] Error loading trees:', error);
      return [];
    }
  }, [configHook]);

  // Enhanced action functions that coordinate between contexts
  const openNodeDialogWithSetup = useCallback(
    (node?: any) => {
      console.log('[@hook:useNavigationActionsHook] Opening node dialog with setup');
      actionsContext.openNodeDialog(node);
    },
    [actionsContext],
  );

  const openEdgeDialogWithSetup = useCallback(
    (edge?: any) => {
      console.log('[@hook:useNavigationActionsHook] Opening edge dialog with setup');
      actionsContext.openEdgeDialog(edge);
    },
    [actionsContext],
  );

  const performSaveOperation = useCallback(
    async (userInterfaceId: string) => {
      console.log('[@hook:useNavigationActionsHook] Performing save operation');
      try {
        uiContext.setIsSaving(true);
        uiContext.setSaveError(null);

        await saveToConfig(userInterfaceId);

        uiContext.setSaveSuccess(true);
        uiContext.setHasUnsavedChanges(false);

        return true;
      } catch (error) {
        console.error('[@hook:useNavigationActionsHook] Save operation failed:', error);
        uiContext.setSaveError(error instanceof Error ? error.message : 'Save failed');
        return false;
      } finally {
        uiContext.setIsSaving(false);
      }
    },
    [saveToConfig, uiContext],
  );

  const performLoadOperation = useCallback(
    async (userInterfaceId: string) => {
      console.log('[@hook:useNavigationActionsHook] Performing load operation');
      try {
        uiContext.setIsLoadingInterface(true);
        uiContext.setError(null);

        await loadFromConfig(userInterfaceId);

        uiContext.setHasUnsavedChanges(false);

        return true;
      } catch (error) {
        console.error('[@hook:useNavigationActionsHook] Load operation failed:', error);
        uiContext.setError(error instanceof Error ? error.message : 'Load failed');
        return false;
      } finally {
        uiContext.setIsLoadingInterface(false);
      }
    },
    [loadFromConfig, uiContext],
  );

  // Return the hook interface
  return useMemo(
    () => ({
      // Context actions
      resetAll: actionsContext.resetAll,
      resetSelectionAndDialogs: actionsContext.resetSelectionAndDialogs,
      closeAllDialogs: actionsContext.closeAllDialogs,
      markUnsavedChanges: actionsContext.markUnsavedChanges,
      clearUnsavedChanges: actionsContext.clearUnsavedChanges,
      resetToHome: actionsContext.resetToHome,
      fitViewToNodes: actionsContext.fitViewToNodes,

      // Enhanced actions
      openNodeDialog: openNodeDialogWithSetup,
      openEdgeDialog: openEdgeDialogWithSetup,
      performSaveOperation,
      performLoadOperation,

      // Config operations
      loadFromConfig,
      saveToConfig,
      createEmptyTreeConfig,
      loadAvailableTrees,
      listAvailableTrees: configHook.listAvailableUserInterfaces,

      // Lock management from Config hook
      isLocked: configHook.isLocked,
      lockInfo: configHook.lockInfo,
      showReadOnlyOverlay: configHook.showReadOnlyOverlay,
      setCheckingLockState: configHook.setCheckingLockState,
      sessionId: configHook.sessionId,
      lockNavigationTree: configHook.lockNavigationTree,
      unlockNavigationTree: configHook.unlockNavigationTree,
      setupAutoUnlock: configHook.setupAutoUnlock,

      // Placeholder functions for NodeEdge management (will be provided by NodeEdgeManagementProvider)
      handleNodeFormSubmit: () =>
        console.warn(
          '[@hook:useNavigationActionsHook] handleNodeFormSubmit not available - use NodeEdgeManagement context',
        ),
      handleEdgeFormSubmit: () =>
        console.warn(
          '[@hook:useNavigationActionsHook] handleEdgeFormSubmit not available - use NodeEdgeManagement context',
        ),
      handleDeleteNode: () =>
        console.warn(
          '[@hook:useNavigationActionsHook] handleDeleteNode not available - use NodeEdgeManagement context',
        ),
      handleDeleteEdge: () =>
        console.warn(
          '[@hook:useNavigationActionsHook] handleDeleteEdge not available - use NodeEdgeManagement context',
        ),
      addNewNode: () =>
        console.warn(
          '[@hook:useNavigationActionsHook] addNewNode not available - use NodeEdgeManagement context',
        ),
      cancelNodeChanges: () =>
        console.warn(
          '[@hook:useNavigationActionsHook] cancelNodeChanges not available - use NodeEdgeManagement context',
        ),
      closeSelectionPanel: () =>
        console.warn(
          '[@hook:useNavigationActionsHook] closeSelectionPanel not available - use NodeEdgeManagement context',
        ),
      deleteSelected: () =>
        console.warn(
          '[@hook:useNavigationActionsHook] deleteSelected not available - use NodeEdgeManagement context',
        ),
      resetNode: () =>
        console.warn(
          '[@hook:useNavigationActionsHook] resetNode not available - use NodeEdgeManagement context',
        ),

      // Device control state
      selectedHost: deviceControl.selectedHost,
      isControlActive: deviceControl.isControlActive,
      isRemotePanelOpen: deviceControl.isRemotePanelOpen,
      showRemotePanel: deviceControl.showRemotePanel,
      showAVPanel: deviceControl.showAVPanel,
      isVerificationActive: deviceControl.isVerificationActive,

      // Device control handlers
      handleDeviceSelect: deviceControl.handleDeviceSelect,
      handleControlStateChange: deviceControl.handleControlStateChange,
      handleToggleRemotePanel: deviceControl.handleToggleRemotePanel,
      handleConnectionChange: deviceControl.handleConnectionChange,
      handleDisconnectComplete: deviceControl.handleDisconnectComplete,

      // Host data
      availableHosts: deviceControl.availableHosts,
      getHostByName: deviceControl.getHostByName,
      fetchHosts: deviceControl.fetchHosts,
    }),
    [
      actionsContext,
      configHook,
      deviceControl,
      openNodeDialogWithSetup,
      openEdgeDialogWithSetup,
      performSaveOperation,
      performLoadOperation,
      loadFromConfig,
      saveToConfig,
      createEmptyTreeConfig,
      loadAvailableTrees,
    ],
  );
};

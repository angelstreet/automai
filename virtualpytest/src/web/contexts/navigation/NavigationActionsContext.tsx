import React, { createContext, useContext, useCallback, useMemo } from 'react';

import {
  NavigationActionsContextType,
  NavigationActionsProviderProps,
} from '../../types/pages/NavigationContext_Types';

import { useNavigationFlow } from './NavigationFlowContext';
import { useNavigationNodes } from './NavigationNodesContext';
import { useNavigationUI } from './NavigationUIContext';

// ========================================
// CONTEXT
// ========================================

const NavigationActionsContext = createContext<NavigationActionsContextType | null>(null);

export const NavigationActionsProvider: React.FC<NavigationActionsProviderProps> = ({
  children,
}) => {
  // Use the focused contexts
  const nodesContext = useNavigationNodes();
  const uiContext = useNavigationUI();
  const flowContext = useNavigationFlow();

  // ========================================
  // ACTION COORDINATION
  // ========================================

  const resetAll = useCallback(() => {
    console.log('[@context:NavigationActionsProvider] Resetting all state');
    nodesContext.resetSelection();
    nodesContext.resetToInitialState();
    uiContext.resetDialogs();
    uiContext.resetForms();
    uiContext.setHasUnsavedChanges(false);
    uiContext.setError(null);
    uiContext.setSuccess(null);
  }, [nodesContext, uiContext]);

  const resetSelectionAndDialogs = useCallback(() => {
    console.log('[@context:NavigationActionsProvider] Resetting selection and dialogs');
    nodesContext.resetSelection();
    uiContext.resetDialogs();
    uiContext.resetForms();
  }, [nodesContext, uiContext]);

  // ========================================
  // UI COORDINATION
  // ========================================

  const openNodeDialog = useCallback(
    (node?: any) => {
      console.log('[@context:NavigationActionsProvider] Opening node dialog');
      if (node) {
        nodesContext.setSelectedNode(node);
        uiContext.setNodeForm({
          label: node.data?.label || '',
          type: node.data?.type || 'screen',
          description: node.data?.description || '',
          verifications: node.data?.verifications || [],
        });
        uiContext.setIsNewNode(false);
      } else {
        uiContext.setIsNewNode(true);
      }
      uiContext.setIsNodeDialogOpen(true);
    },
    [nodesContext, uiContext],
  );

  const openEdgeDialog = useCallback(
    (edge?: any) => {
      console.log('[@context:NavigationActionsProvider] Opening edge dialog');
      if (edge) {
        nodesContext.setSelectedEdge(edge);
        uiContext.setEdgeForm({
          actions: edge.data?.actions || [],
          retryActions: edge.data?.retryActions || [],
          finalWaitTime: edge.data?.finalWaitTime || 2000,
          description: edge.data?.description || '',
        });
      }
      uiContext.setIsEdgeDialogOpen(true);
    },
    [nodesContext, uiContext],
  );

  const closeAllDialogs = useCallback(() => {
    console.log('[@context:NavigationActionsProvider] Closing all dialogs');
    uiContext.resetDialogs();
  }, [uiContext]);

  // ========================================
  // STATE COORDINATION
  // ========================================

  const markUnsavedChanges = useCallback(() => {
    console.log('[@context:NavigationActionsProvider] Marking unsaved changes');
    uiContext.setHasUnsavedChanges(true);
  }, [uiContext]);

  const clearUnsavedChanges = useCallback(() => {
    console.log('[@context:NavigationActionsProvider] Clearing unsaved changes');
    uiContext.setHasUnsavedChanges(false);
  }, [uiContext]);

  // ========================================
  // NAVIGATION COORDINATION
  // ========================================

  const resetToHome = useCallback(() => {
    console.log('[@context:NavigationActionsProvider] Resetting to home');
    flowContext.setCurrentTreeId('home');
    flowContext.setCurrentTreeName('home');
    flowContext.setNavigationPath(['home']);
    flowContext.setNavigationNamePath(['home']);
    flowContext.setCurrentViewRootId(null);
    flowContext.setViewPath([]);
  }, [flowContext]);

  // ========================================
  // FLOW COORDINATION
  // ========================================

  const fitViewToNodes = useCallback(() => {
    console.log('[@context:NavigationActionsProvider] Fitting view to nodes');
    if (flowContext.reactFlowInstance) {
      flowContext.reactFlowInstance.fitView();
    }
  }, [flowContext]);

  // ========================================
  // CONTEXT VALUE
  // ========================================

  const contextValue: NavigationActionsContextType = useMemo(() => {
    return {
      // Action coordination
      resetAll,
      resetSelectionAndDialogs,

      // UI coordination
      openNodeDialog,
      openEdgeDialog,
      closeAllDialogs,

      // State coordination
      markUnsavedChanges,
      clearUnsavedChanges,

      // Navigation coordination
      resetToHome,

      // Flow coordination
      fitViewToNodes,
    };
  }, [
    // Add function dependencies
    resetAll,
    resetSelectionAndDialogs,
    openNodeDialog,
    openEdgeDialog,
    closeAllDialogs,
    markUnsavedChanges,
    clearUnsavedChanges,
    resetToHome,
    fitViewToNodes,
  ]);

  return (
    <NavigationActionsContext.Provider value={contextValue}>
      {children}
    </NavigationActionsContext.Provider>
  );
};

NavigationActionsProvider.displayName = 'NavigationActionsProvider';

// ========================================
// HOOK
// ========================================

export const useNavigationActions = (): NavigationActionsContextType => {
  const context = useContext(NavigationActionsContext);
  if (!context) {
    throw new Error('useNavigationActions must be used within a NavigationActionsProvider');
  }
  return context;
};

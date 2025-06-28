import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

import { NodeForm, EdgeForm } from '../../types/pages/Navigation_Types';
import {
  NavigationUIContextType,
  NavigationUIProviderProps,
} from '../../types/pages/NavigationContext_Types';

// ========================================
// CONTEXT
// ========================================

const NavigationUIContext = createContext<NavigationUIContextType | null>(null);

export const NavigationUIProvider: React.FC<NavigationUIProviderProps> = ({ children }) => {
  // ========================================
  // STATE
  // ========================================

  // Dialog state
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

  // Save operation states
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Interface loading state
  const [isLoadingInterface, setIsLoadingInterface] = useState(false);

  // ========================================
  // CALLBACK FUNCTIONS
  // ========================================

  const resetForms = useCallback(() => {
    console.log('[@context:NavigationUIProvider] Resetting forms');
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
    console.log('[@context:NavigationUIProvider] Resetting dialogs');
    setIsNodeDialogOpen(false);
    setIsEdgeDialogOpen(false);
    setIsDiscardDialogOpen(false);
  }, []);

  // ========================================
  // CONTEXT VALUE
  // ========================================

  const stableNodeForm = useMemo(() => nodeForm, [nodeForm]);
  const stableEdgeForm = useMemo(() => edgeForm, [edgeForm]);

  const contextValue: NavigationUIContextType = useMemo(() => {
    return {
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

      // Interface loading state
      isLoadingInterface,
      setIsLoadingInterface,

      // Callbacks
      resetForms,
      resetDialogs,
    };
  }, [
    // Only include state values that actually change, not function references
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
    isLoadingInterface,
    // Remove function dependencies to prevent cascade re-renders
    // resetForms and resetDialogs are stable due to their own useCallback dependencies
  ]);

  return (
    <NavigationUIContext.Provider value={contextValue}>{children}</NavigationUIContext.Provider>
  );
};

NavigationUIProvider.displayName = 'NavigationUIProvider';

// ========================================
// HOOK
// ========================================

export const useNavigationUI = (): NavigationUIContextType => {
  const context = useContext(NavigationUIContext);
  if (!context) {
    throw new Error('useNavigationUI must be used within a NavigationUIProvider');
  }
  return context;
};

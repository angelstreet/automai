import { useCallback, useMemo } from 'react';

import { useNavigationUI } from '../../contexts/navigation';

export const useNavigationUIHook = () => {
  // Use the focused context
  const uiContext = useNavigationUI();

  // Discard changes function with confirmation
  const discardChanges = useCallback(() => {
    console.log('[@hook:useNavigationUIHook] Discard changes requested');
    if (uiContext.hasUnsavedChanges) {
      uiContext.setIsDiscardDialogOpen(true);
    } else {
      // No changes to discard
      uiContext.resetDialogs();
      uiContext.resetForms();
    }
  }, [
    uiContext.hasUnsavedChanges,
    uiContext.setIsDiscardDialogOpen,
    uiContext.resetDialogs,
    uiContext.resetForms,
  ]);

  // Actually perform the discard operation
  const performDiscardChanges = useCallback(() => {
    console.log('[@hook:useNavigationUIHook] Performing discard changes');
    uiContext.setHasUnsavedChanges(false);
    uiContext.setSaveError(null);
    uiContext.setSaveSuccess(false);
    uiContext.setIsDiscardDialogOpen(false);
    uiContext.resetDialogs();
    uiContext.resetForms();
  }, [
    uiContext.setHasUnsavedChanges,
    uiContext.setSaveError,
    uiContext.setSaveSuccess,
    uiContext.setIsDiscardDialogOpen,
    uiContext.resetDialogs,
    uiContext.resetForms,
  ]);

  // Mark changes as saved
  const markChangesSaved = useCallback(() => {
    console.log('[@hook:useNavigationUIHook] Marking changes as saved');
    uiContext.setHasUnsavedChanges(false);
    uiContext.setSaveError(null);
    uiContext.setSaveSuccess(true);
  }, [uiContext.setHasUnsavedChanges, uiContext.setSaveError, uiContext.setSaveSuccess]);

  // Mark unsaved changes
  const markUnsavedChanges = useCallback(() => {
    console.log('[@hook:useNavigationUIHook] Marking unsaved changes');
    uiContext.setHasUnsavedChanges(true);
  }, [uiContext.setHasUnsavedChanges]);

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    console.log('[@hook:useNavigationUIHook] Clearing notifications');
    uiContext.setError(null);
    uiContext.setSuccess(null);
    uiContext.setSaveError(null);
    uiContext.setSaveSuccess(false);
  }, [uiContext.setError, uiContext.setSuccess, uiContext.setSaveError, uiContext.setSaveSuccess]);

  // Set loading state
  const setLoadingState = useCallback(
    (loading: boolean) => {
      console.log('[@hook:useNavigationUIHook] Setting loading state:', loading);
      uiContext.setIsLoading(loading);
    },
    [uiContext.setIsLoading],
  );

  // Set saving state
  const setSavingState = useCallback(
    (saving: boolean) => {
      console.log('[@hook:useNavigationUIHook] Setting saving state:', saving);
      uiContext.setIsSaving(saving);
    },
    [uiContext.setIsSaving],
  );

  // Set error message
  const setErrorMessage = useCallback(
    (error: string | null) => {
      console.log('[@hook:useNavigationUIHook] Setting error message:', error);
      uiContext.setError(error);
      uiContext.setSaveError(error);
    },
    [uiContext.setError, uiContext.setSaveError],
  );

  // Set success message
  const setSuccessMessage = useCallback(
    (success: string | null) => {
      console.log('[@hook:useNavigationUIHook] Setting success message:', success);
      uiContext.setSuccess(success);
      if (success) {
        uiContext.setSaveSuccess(true);
      }
    },
    [uiContext.setSuccess, uiContext.setSaveSuccess],
  );

  // Return the hook interface
  return useMemo(
    () => ({
      // Dialog states
      isNodeDialogOpen: uiContext.isNodeDialogOpen,
      isEdgeDialogOpen: uiContext.isEdgeDialogOpen,
      isDiscardDialogOpen: uiContext.isDiscardDialogOpen,

      // Form states
      isNewNode: uiContext.isNewNode,
      nodeForm: uiContext.nodeForm,
      edgeForm: uiContext.edgeForm,

      // Loading and error states
      isLoading: uiContext.isLoading,
      error: uiContext.error,
      success: uiContext.success,

      // Save states
      isSaving: uiContext.isSaving,
      saveError: uiContext.saveError,
      saveSuccess: uiContext.saveSuccess,
      hasUnsavedChanges: uiContext.hasUnsavedChanges,

      // Interface loading state
      isLoadingInterface: uiContext.isLoadingInterface,

      // Dialog setters
      setIsNodeDialogOpen: uiContext.setIsNodeDialogOpen,
      setIsEdgeDialogOpen: uiContext.setIsEdgeDialogOpen,
      setIsDiscardDialogOpen: uiContext.setIsDiscardDialogOpen,

      // Form setters
      setIsNewNode: uiContext.setIsNewNode,
      setNodeForm: uiContext.setNodeForm,
      setEdgeForm: uiContext.setEdgeForm,

      // State setters
      setIsLoading: uiContext.setIsLoading,
      setError: uiContext.setError,
      setSuccess: uiContext.setSuccess,
      setIsSaving: uiContext.setIsSaving,
      setSaveError: uiContext.setSaveError,
      setSaveSuccess: uiContext.setSaveSuccess,
      setHasUnsavedChanges: uiContext.setHasUnsavedChanges,
      setIsLoadingInterface: uiContext.setIsLoadingInterface,

      // Actions
      resetForms: uiContext.resetForms,
      resetDialogs: uiContext.resetDialogs,
      discardChanges,
      performDiscardChanges,
      markChangesSaved,
      markUnsavedChanges,
      clearNotifications,
      setLoadingState,
      setSavingState,
      setErrorMessage,
      setSuccessMessage,

      // Computed values
      successMessage: uiContext.saveSuccess
        ? 'Navigation tree saved successfully!'
        : uiContext.success,
    }),
    [
      uiContext.isNodeDialogOpen,
      uiContext.isEdgeDialogOpen,
      uiContext.isDiscardDialogOpen,
      uiContext.isNewNode,
      uiContext.nodeForm,
      uiContext.edgeForm,
      uiContext.isLoading,
      uiContext.error,
      uiContext.success,
      uiContext.isSaving,
      uiContext.saveError,
      uiContext.saveSuccess,
      uiContext.hasUnsavedChanges,
      uiContext.isLoadingInterface,
      discardChanges,
      performDiscardChanges,
      markChangesSaved,
      markUnsavedChanges,
      clearNotifications,
      setLoadingState,
      setSavingState,
      setErrorMessage,
      setSuccessMessage,
    ],
  );
};

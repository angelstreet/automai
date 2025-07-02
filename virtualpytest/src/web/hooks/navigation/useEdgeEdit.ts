import { useCallback, useState, useEffect } from 'react';

import { Host } from '../../types/common/Host_Types';
import { EdgeForm, EdgeAction } from '../../types/pages/Navigation_Types';
import { useAction } from '../actions';

export interface UseEdgeEditProps {
  isOpen: boolean;
  edgeForm: EdgeForm | null;
  setEdgeForm: (form: EdgeForm) => void;
  selectedHost?: Host | null;
  isControlActive?: boolean;
}

export const useEdgeEdit = ({
  isOpen,
  edgeForm,
  setEdgeForm,
  selectedHost,
  isControlActive = false,
}: UseEdgeEditProps) => {
  // Action hook for execution
  const actionHook = useAction({
    selectedHost,
    isControlActive,
  });

  // Local state for dialog-specific concerns
  const [localActions, setLocalActions] = useState<EdgeAction[]>([]);
  const [localRetryActions, setLocalRetryActions] = useState<EdgeAction[]>([]);
  const [actionResult, setActionResult] = useState<string | null>(null);

  // Initialize actions when dialog opens or edgeForm changes
  useEffect(() => {
    if (isOpen && edgeForm?.actions) {
      console.log('[useEdgeEdit] Initializing with actions:', edgeForm.actions.length);
      setLocalActions(edgeForm.actions);
    } else if (isOpen) {
      console.log('[useEdgeEdit] Dialog opened but no actions in edgeForm:', {
        hasEdgeForm: !!edgeForm,
        hasActions: !!edgeForm?.actions,
        actionsLength: edgeForm?.actions?.length || 0,
      });
    }
    if (isOpen && edgeForm?.retryActions) {
      console.log('[useEdgeEdit] Initializing with retry actions:', edgeForm.retryActions.length);
      setLocalRetryActions(edgeForm.retryActions);
    }
  }, [isOpen, edgeForm?.actions, edgeForm?.retryActions]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setLocalActions([]);
      setLocalRetryActions([]);
      setActionResult(null);
    }
  }, [isOpen]);

  // Convert EdgeAction to ControllerAction format
  const convertToControllerAction = useCallback((action: EdgeAction) => {
    return {
      command: action.command,
      params: action.params,
      description: action.description,
    };
  }, []);

  // Handle actions change
  const handleActionsChange = useCallback(
    (newActions: EdgeAction[]) => {
      if (!edgeForm) return;

      setLocalActions(newActions);
      setEdgeForm({
        ...edgeForm,
        actions: newActions,
      });
    },
    [edgeForm, setEdgeForm],
  );

  // Handle retry actions change
  const handleRetryActionsChange = useCallback(
    (newRetryActions: EdgeAction[]) => {
      if (!edgeForm) return;

      setLocalRetryActions(newRetryActions);
      setEdgeForm({
        ...edgeForm,
        retryActions: newRetryActions,
      });
    },
    [edgeForm, setEdgeForm],
  );

  // Execute local actions
  const executeLocalActions = useCallback(
    async (form: EdgeForm) => {
      if (!localActions || localActions.length === 0) return;

      if (actionHook.loading) {
        return;
      }

      setActionResult(null);

      try {
        const result = await actionHook.executeActions(
          localActions.map(convertToControllerAction),
          localRetryActions.map(convertToControllerAction),
          form?.finalWaitTime || 2000,
        );

        const formattedResult = actionHook.formatExecutionResults(result);
        setActionResult(formattedResult);
        return result;
      } catch (err: any) {
        const errorResult = `❌ Network error: ${err.message}`;
        setActionResult(errorResult);
        throw err;
      }
    },
    [actionHook, localActions, localRetryActions, convertToControllerAction],
  );

  // Validate form
  const isFormValid = useCallback((): boolean => {
    return localActions.every((action) => {
      if (!action.command || action.command.trim() === '') {
        return false;
      }

      // Check required parameters based on command
      if (
        action.command === 'input_text' &&
        (!action.params?.text || action.params.text.trim() === '')
      ) {
        return false;
      }
      if (
        action.command === 'click_element' &&
        (!action.params?.element_identifier || action.params.element_identifier.trim() === '')
      ) {
        return false;
      }
      if (
        (action.command === 'launch_app' || action.command === 'close_app') &&
        (!action.params?.package || action.params.package.trim() === '')
      ) {
        return false;
      }
      if (
        action.command === 'tap_coordinates' &&
        (action.params?.x === undefined || action.params?.y === undefined)
      ) {
        return false;
      }

      return true;
    });
  }, [localActions]);

  // Check if can run local actions
  const canRunLocalActions = useCallback((): boolean => {
    return (
      isControlActive &&
      Boolean(selectedHost) &&
      localActions.length > 0 &&
      !actionHook.loading &&
      isFormValid()
    );
  }, [isControlActive, selectedHost, localActions.length, actionHook.loading, isFormValid]);

  return {
    // Action execution
    actionHook,
    executeLocalActions,

    // Local state
    localActions,
    localRetryActions,
    actionResult,

    // Handlers
    handleActionsChange,
    handleRetryActionsChange,

    // Validation
    isFormValid,
    canRunLocalActions,
  };
};

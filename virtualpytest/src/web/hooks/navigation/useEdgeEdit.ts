import { useCallback, useState, useEffect } from 'react';

import { Host } from '../../types/common/Host_Types';
import { EdgeForm, EdgeAction, UINavigationEdge } from '../../types/pages/Navigation_Types';
import { useAction } from '../actions';
import { useEdge } from './useEdge';

export interface UseEdgeEditProps {
  isOpen: boolean;
  edgeForm: EdgeForm | null;
  setEdgeForm: (form: EdgeForm) => void;
  selectedEdge?: UINavigationEdge | null;
  selectedHost?: Host | null;
  isControlActive?: boolean;
}

export const useEdgeEdit = ({
  isOpen,
  edgeForm,
  setEdgeForm,
  selectedEdge,
  selectedHost,
  isControlActive = false,
}: UseEdgeEditProps) => {
  // Action hook for execution
  const actionHook = useAction({
    selectedHost,
    isControlActive,
  });

  // Edge hook for loading actions from IDs
  const edgeHook = useEdge({
    selectedHost,
    isControlActive,
  });

  // Local state for dialog-specific concerns
  const [localActions, setLocalActions] = useState<EdgeAction[]>([]);
  const [localRetryActions, setLocalRetryActions] = useState<EdgeAction[]>([]);
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [dependencyCheckResult, setDependencyCheckResult] = useState<any>(null);

  // Initialize actions when dialog opens or edgeForm/selectedEdge changes
  useEffect(() => {
    if (isOpen && edgeForm?.actions) {
      setLocalActions(edgeForm.actions);
    }

    // Load retry actions from selectedEdge using ID resolution if edgeForm has none
    if (isOpen && selectedEdge) {
      if (edgeForm?.retryActions && edgeForm.retryActions.length > 0) {
        // Use retry actions from form if they exist
        setLocalRetryActions(edgeForm.retryActions);
      } else {
        // Load retry actions from edge using ID resolution
        const resolvedRetryActions = edgeHook.getRetryActionsFromEdge(selectedEdge);
        setLocalRetryActions(resolvedRetryActions);

        // Update the form with resolved retry actions
        if (edgeForm) {
          setEdgeForm({
            ...edgeForm,
            retryActions: resolvedRetryActions,
          });
        }
      }
    }
  }, [isOpen, edgeForm?.actions, edgeForm?.retryActions, selectedEdge, edgeHook, setEdgeForm]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setLocalActions([]);
      setLocalRetryActions([]);
      setActionResult(null);
      setDependencyCheckResult(null);
    }
  }, [isOpen]);

  // Check dependencies for actions
  const checkDependencies = useCallback(async (actions: EdgeAction[]): Promise<any> => {
    // Filter actions with real DB IDs
    const actionsToCheck = actions.filter((action) => action.id && action.id.length > 10);

    if (actionsToCheck.length === 0) {
      console.log('No actions with DB IDs to check for dependencies');
      return { success: true, has_shared_actions: false, edges: [], count: 0 };
    }

    try {
      console.log(`Checking dependencies for ${actionsToCheck.length} actions`);
      const response = await fetch('/server/action/checkDependenciesBatch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action_ids: actionsToCheck.map((action) => action.id),
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Dependency check result:', result);
      setDependencyCheckResult(result);

      if (result.success && !result.has_shared_actions) {
        console.log('No dependencies found, edge can be saved directly');
      } else if (result.success && result.has_shared_actions) {
        console.log(`Found ${result.count} edges with shared actions`);
      }

      return result;
    } catch (error) {
      console.error('Failed to check dependencies:', error);
      return { success: false, error: String(error) };
    }
  }, []);

  // Convert EdgeAction to ControllerAction format
  const convertToControllerAction = useCallback((action: EdgeAction) => {
    return {
      command: action.command,
      params: {
        ...action.params,
        wait_time: action.params?.wait_time || 500, // Use wait_time in ms
      },
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
        (!action.params?.element_id || action.params.element_id.trim() === '')
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
    checkDependencies,

    // Local state
    localActions,
    localRetryActions,
    actionResult,
    dependencyCheckResult,

    // Handlers
    handleActionsChange,
    handleRetryActionsChange,

    // Validation
    isFormValid,
    canRunLocalActions,
  };
};

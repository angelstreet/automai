import { useCallback, useState } from 'react';

import { useDeviceData } from '../../contexts/device/DeviceDataContext';
import { Host } from '../../types/common/Host_Types';
import { Actions } from '../../types/controller/Action_Types';
import { UINavigationEdge, EdgeAction, EdgeForm } from '../../types/pages/Navigation_Types';
import { useAction } from '../actions';
import { useValidationColors } from '../validation';

export interface UseEdgeProps {
  selectedHost?: Host | null;
  selectedDeviceId?: string | null;
  isControlActive?: boolean;
  availableActions?: Actions;
}

export const useEdge = (props?: UseEdgeProps) => {
  // Action hook for edge operations
  const actionHook = useAction({
    selectedHost: props?.selectedHost || null,
    deviceId: props?.selectedDeviceId,
  });

  // Device data hook for getting saved actions
  const { getActions } = useDeviceData();

  // Validation colors hook for edge styling
  const { getEdgeColors } = useValidationColors([]);

  // State for edge operations
  const [runResult, setRunResult] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [localActions, setLocalActions] = useState<EdgeAction[]>([]);
  const [localRetryActions, setLocalRetryActions] = useState<EdgeAction[]>([]);

  /**
   * Get edge colors based on validation status
   */
  const getEdgeColorsForEdge = useCallback(
    (edgeId: string, isEntryEdge: boolean = false) => {
      return getEdgeColors(edgeId, isEntryEdge);
    },
    [getEdgeColors],
  );

  /**
   * Check if an edge is a protected edge (cannot be deleted)
   */
  const isProtectedEdge = useCallback((edge: UINavigationEdge): boolean => {
    return (
      edge.data?.from === 'entry' ||
      edge.data?.from === 'home' ||
      edge.data?.from?.toLowerCase() === 'entry point' ||
      edge.data?.from?.toLowerCase().includes('entry') ||
      edge.data?.from?.toLowerCase().includes('home') ||
      edge.source === 'entry-node' ||
      edge.source?.toLowerCase().includes('entry') ||
      edge.source?.toLowerCase().includes('home')
    );
  }, []);

  /**
   * Get actions from edge data in consistent format
   */
  const getActionsFromEdge = useCallback(
    (edge: UINavigationEdge): EdgeAction[] => {
      console.log(`[@hook:useEdge] Getting actions from edge:`, {
        edgeId: edge.id,
        edgeData: edge.data,
        hasActions: !!edge.data?.actions,
        actionsLength: edge.data?.actions?.length || 0,
        hasActionIds: !!edge.data?.action_ids,
        actionIdsLength: edge.data?.action_ids?.length || 0,
        hasLegacyAction: !!edge.data?.action,
        legacyActionType: typeof edge.data?.action,
      });

      // Handle new format (multiple actions)
      if (edge.data?.actions && edge.data.actions.length > 0) {
        console.log(`[@hook:useEdge] Found ${edge.data.actions.length} actions in new format`);
        return edge.data.actions;
      }

      // Handle action_ids format (similar to verification_ids in nodes)
      if (edge.data?.action_ids && edge.data.action_ids.length > 0) {
        console.log(
          `[@hook:useEdge] Found ${edge.data.action_ids.length} action IDs, resolving to action objects`,
        );
        console.log(`[@hook:useEdge] Action IDs:`, edge.data.action_ids);

        const allActions = getActions();
        console.log(`[@hook:useEdge] Available saved actions:`, allActions.length);

        // Match action_ids with actual action objects
        const edgeActions: EdgeAction[] = [];
        if (edge.data.action_ids && edge.data.action_ids.length > 0) {
          for (const actionId of edge.data.action_ids) {
            const action = allActions.find((a: any) => a.id === actionId);
            if (action) {
              // Convert saved action to EdgeAction format
              const edgeAction: EdgeAction = {
                id: action.id,
                label: action.label || action.command || 'Unnamed Action',
                command: action.command,
                params: action.params || {},
                requiresInput: action.requiresInput || false,
                inputValue: action.inputValue || '',
                waitTime: action.waitTime || 2000,
              };
              edgeActions.push(edgeAction);
              console.log(`[@hook:useEdge] Resolved action ID ${actionId} to:`, edgeAction);
            } else {
              console.warn(`[@hook:useEdge] Could not find action with ID: ${actionId}`);
              // Create a placeholder action for missing actions
              const placeholderAction: EdgeAction = {
                id: actionId,
                label: `Missing Action (ID: ${actionId.substring(0, 8)}...)`,
                command: '', // Empty command indicates it needs to be reconfigured
                params: {},
                requiresInput: false,
                inputValue: '',
                waitTime: 2000,
              };
              edgeActions.push(placeholderAction);
            }
          }
        }

        console.log(`[@hook:useEdge] Resolved ${edgeActions.length} actions from action IDs`);
        return edgeActions;
      }

      // Handle legacy format (single action) - convert to array
      if (edge.data?.action && typeof edge.data.action === 'object') {
        console.log(`[@hook:useEdge] Found legacy action, converting to array format`);
        const legacyAction = edge.data.action as any;
        return [
          {
            id: legacyAction.id,
            label: legacyAction.label,
            command: legacyAction.command,
            params: legacyAction.params,
            requiresInput: legacyAction.requiresInput,
            inputValue: legacyAction.inputValue,
            waitTime: legacyAction.waitTime || 2000, // Default wait time
          },
        ];
      }

      console.log(`[@hook:useEdge] No actions found in edge data`);
      return [];
    },
    [getActions],
  );

  /**
   * Get retry actions from edge data
   */
  const getRetryActionsFromEdge = useCallback((edge: UINavigationEdge): EdgeAction[] => {
    return edge.data?.retryActions || [];
  }, []);

  /**
   * Check if edge can run actions
   */
  const canRunActions = useCallback(
    (edge: UINavigationEdge): boolean => {
      const actions = getActionsFromEdge(edge);
      return (
        props?.isControlActive === true &&
        props?.selectedHost !== null &&
        actions.length > 0 &&
        !actionHook.loading
      );
    },
    [props?.isControlActive, props?.selectedHost, actionHook.loading, getActionsFromEdge],
  );

  /**
   * Check if edge can run actions for local actions (in dialog)
   */
  const canRunLocalActions = useCallback((): boolean => {
    return (
      props?.isControlActive === true &&
      props?.selectedHost !== null &&
      localActions.length > 0 &&
      !actionHook.loading
    );
  }, [props?.isControlActive, props?.selectedHost, localActions.length, actionHook.loading]);

  /**
   * Format run result for compact display
   */
  const formatRunResult = useCallback((result: string): string => {
    if (!result) return '';

    const lines = result.split('\n');
    const formattedLines: string[] = [];

    for (const line of lines) {
      // Skip verbose messages we don't want
      if (
        line.includes('⏹️ Execution stopped due to failed action') ||
        line.includes('📋 Processing') ||
        line.includes('retry action(s)')
      ) {
        continue;
      }

      // Format action lines to be more compact
      if (line.includes('Action') && (line.includes('✅') || line.includes('❌'))) {
        formattedLines.push(line);
      }
      // Format retry action lines to be more compact
      else if (line.includes('Retry Action') && (line.includes('✅') || line.includes('❌'))) {
        formattedLines.push(line);
      }
      // Keep confidence lines
      else if (line.includes('📊 Confidence:')) {
        formattedLines.push(line);
      }
      // Keep overall result
      else if (line.includes('OVERALL RESULT:')) {
        formattedLines.push(line);
      }
      // Keep starting retry actions message but make it shorter
      else if (line.includes('🔄 Main actions failed. Starting retry actions...')) {
        formattedLines.push('🔄 Starting retry actions...');
      }
    }

    return formattedLines.join('\n');
  }, []);

  /**
   * Execute actions for an edge
   */
  const executeEdgeActions = useCallback(
    async (edge: UINavigationEdge) => {
      const actions = getActionsFromEdge(edge);
      const retryActions = getRetryActionsFromEdge(edge);

      if (actions.length === 0) {
        console.log('[@hook:useEdge] No actions to run');
        return;
      }

      if (actionHook.loading) {
        console.log('[@hook:useEdge] Execution already in progress, ignoring duplicate request');
        return;
      }

      setRunResult(null);
      console.log(
        `[@hook:useEdge] Starting batch execution of ${actions.length} actions with ${retryActions.length} retry actions`,
      );

      try {
        const result = await actionHook.executeActions(
          actions,
          retryActions,
          edge.data?.finalWaitTime || 2000,
        );

        // Format the result for display
        const formattedResult = actionHook.formatExecutionResults(result);
        setRunResult(formattedResult);
        return result;
      } catch (err: any) {
        console.error('[@hook:useEdge] Error executing actions:', err);
        const errorResult = `❌ Network error: ${err.message}`;
        setRunResult(errorResult);
        throw err;
      }
    },
    [actionHook, getActionsFromEdge, getRetryActionsFromEdge],
  );

  /**
   * Execute local actions (for dialog)
   */
  const executeLocalActions = useCallback(
    async (edgeForm: EdgeForm) => {
      if (!localActions || localActions.length === 0) return;

      if (actionHook.loading) {
        console.log('[@hook:useEdge] Execution already in progress, ignoring duplicate request');
        return;
      }

      setActionResult(null);
      console.log(
        `[@hook:useEdge] Starting batch execution of ${localActions.length} actions with ${localRetryActions.length} retry actions`,
      );

      try {
        const result = await actionHook.executeActions(
          localActions,
          localRetryActions,
          edgeForm?.finalWaitTime || 2000,
        );

        // Format the result for display
        const formattedResult = actionHook.formatExecutionResults(result);
        setActionResult(formattedResult);
        return result;
      } catch (err: any) {
        console.error('[@hook:useEdge] Error executing actions:', err);
        const errorResult = `❌ Network error: ${err.message}`;
        setActionResult(errorResult);
        throw err;
      }
    },
    [actionHook, localActions, localRetryActions],
  );

  /**
   * Initialize actions from edge form when dialog opens
   */
  const initializeActions = useCallback((edgeForm: EdgeForm) => {
    console.log(`[@hook:useEdge] initializeActions called with:`, {
      edgeForm,
      hasActions: !!edgeForm?.actions,
      actionsLength: edgeForm?.actions?.length || 0,
      hasRetryActions: !!edgeForm?.retryActions,
      retryActionsLength: edgeForm?.retryActions?.length || 0,
    });

    if (edgeForm?.actions) {
      console.log(
        `[@hook:useEdge] Initializing ${edgeForm.actions.length} actions from edgeForm:`,
        edgeForm.actions,
      );
      setLocalActions(edgeForm.actions);
    } else {
      console.log(`[@hook:useEdge] No actions in edgeForm, setting empty array`);
      setLocalActions([]);
    }

    if (edgeForm?.retryActions) {
      console.log(
        `[@hook:useEdge] Initializing ${edgeForm.retryActions.length} retry actions from edgeForm:`,
        edgeForm.retryActions,
      );
      setLocalRetryActions(edgeForm.retryActions);
    } else {
      console.log(`[@hook:useEdge] No retry actions in edgeForm, setting empty array`);
      setLocalRetryActions([]);
    }
  }, []);

  /**
   * Handle actions change for dialog
   */
  const handleActionsChange = useCallback(
    (newActions: EdgeAction[], edgeForm: EdgeForm, setEdgeForm: (form: EdgeForm) => void) => {
      console.log(`[@hook:useEdge] Updating edgeForm with new actions:`, newActions);

      // Update both local state and edgeForm
      setLocalActions(newActions);
      setEdgeForm({
        ...edgeForm,
        actions: newActions,
      });
    },
    [],
  );

  /**
   * Handle retry actions change for dialog
   */
  const handleRetryActionsChange = useCallback(
    (newRetryActions: EdgeAction[], edgeForm: EdgeForm, setEdgeForm: (form: EdgeForm) => void) => {
      console.log(`[@hook:useEdge] Updating edgeForm with new retry actions:`, newRetryActions);

      // Update both local state and edgeForm
      setLocalRetryActions(newRetryActions);
      setEdgeForm({
        ...edgeForm,
        retryActions: newRetryActions,
      });
    },
    [],
  );

  /**
   * Check if edge form is valid
   */
  const isFormValid = useCallback((): boolean => {
    return localActions.every(
      (action) =>
        !action.id || !action.requiresInput || (action.inputValue && action.inputValue.trim()),
    );
  }, [localActions]);

  /**
   * Create edge form from edge data
   */
  const createEdgeForm = useCallback(
    (edge: UINavigationEdge): EdgeForm => {
      const actions = getActionsFromEdge(edge);
      const retryActions = getRetryActionsFromEdge(edge);

      const edgeForm = {
        description: edge.data?.description || '',
        actions: actions,
        retryActions: retryActions,
        finalWaitTime: edge.data?.finalWaitTime ?? 2000,
      };

      console.log(`[@hook:useEdge] createEdgeForm created:`, {
        edgeId: edge.id,
        description: edgeForm.description,
        actionsCount: edgeForm.actions.length,
        retryActionsCount: edgeForm.retryActions.length,
        finalWaitTime: edgeForm.finalWaitTime,
        edgeForm,
      });

      return edgeForm;
    },
    [getActionsFromEdge, getRetryActionsFromEdge],
  );

  /**
   * Clear results when edge changes
   */
  const clearResults = useCallback(() => {
    setRunResult(null);
    setActionResult(null);
  }, []);

  /**
   * Reset dialog state
   */
  const resetDialogState = useCallback(() => {
    setActionResult(null);
    setLocalActions([]);
    setLocalRetryActions([]);
  }, []);

  return {
    // Action hook
    actionHook,

    // State
    runResult,
    actionResult,
    localActions,
    localRetryActions,

    // Utility functions
    getEdgeColorsForEdge,
    isProtectedEdge,
    getActionsFromEdge,
    getRetryActionsFromEdge,
    canRunActions,
    canRunLocalActions,
    formatRunResult,
    isFormValid,
    createEdgeForm,

    // Action functions
    executeEdgeActions,
    executeLocalActions,
    initializeActions,
    handleActionsChange,
    handleRetryActionsChange,
    clearResults,
    resetDialogState,
  };
};

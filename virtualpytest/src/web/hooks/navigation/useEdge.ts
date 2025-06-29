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

  /**
   * Convert navigation EdgeAction to controller EdgeAction for action execution
   */
  const convertToControllerAction = useCallback((navAction: EdgeAction): any => {
    return {
      id: navAction.id,
      label: navAction.description || navAction.command,
      command: navAction.command,
      params: navAction.params,
      requiresInput: false, // We handle input differently now
      inputValue:
        navAction.params?.input ||
        navAction.params?.text ||
        navAction.params?.key ||
        navAction.params?.package ||
        navAction.params?.element_identifier ||
        '',
      waitTime: (navAction.params?.delay || 0.5) * 1000, // Convert seconds to milliseconds
    };
  }, []);

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
      // Handle new format (multiple actions)
      if (edge.data?.actions && edge.data.actions.length > 0) {
        return edge.data.actions;
      }

      // Handle action_ids format (similar to verification_ids in nodes)
      if (edge.data?.action_ids && edge.data.action_ids.length > 0) {
        const allActions = getActions();

        // Match action_ids with actual action objects
        const edgeActions: EdgeAction[] = [];
        if (edge.data.action_ids && edge.data.action_ids.length > 0) {
          for (const actionId of edge.data.action_ids) {
            const action = allActions.find((a: any) => a.id === actionId);
            if (action) {
              // Convert saved action to EdgeAction format
              const edgeAction: EdgeAction = {
                id: action.id,
                command: action.command,
                params: {
                  ...action.params,
                  delay: action.params?.delay || 0.5,
                },
                description:
                  action.description || action.label || action.command || 'Unnamed Action',
              };
              edgeActions.push(edgeAction);
            } else {
              // Create a placeholder action for missing actions
              const placeholderAction: EdgeAction = {
                id: actionId,
                command: '', // Empty command indicates it needs to be reconfigured
                params: { delay: 0.5 },
                description: `Missing Action (ID: ${actionId.substring(0, 8)}...)`,
              };
              edgeActions.push(placeholderAction);
            }
          }
        }

        return edgeActions;
      }

      // Handle legacy format (single action) - convert to array
      if (edge.data?.action && typeof edge.data.action === 'object') {
        const legacyAction = edge.data.action as any;
        return [
          {
            id: legacyAction.id || `legacy_${Date.now()}`,
            command: legacyAction.command,
            params: {
              ...legacyAction.params,
              delay: legacyAction.waitTime ? legacyAction.waitTime / 1000 : 0.5,
            },
            description: legacyAction.label || legacyAction.command || 'Legacy Action',
          },
        ];
      }

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
          actions.map(convertToControllerAction),
          retryActions.map(convertToControllerAction),
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
    [actionHook, getActionsFromEdge, getRetryActionsFromEdge, convertToControllerAction],
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
          localActions.map(convertToControllerAction),
          localRetryActions.map(convertToControllerAction),
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
    [actionHook, localActions, localRetryActions, convertToControllerAction],
  );

  /**
   * Initialize actions from edge form when dialog opens
   */
  const initializeActions = useCallback((edgeForm: EdgeForm) => {
    if (edgeForm?.actions) {
      setLocalActions(edgeForm.actions);
    } else {
      setLocalActions([]);
    }

    if (edgeForm?.retryActions) {
      setLocalRetryActions(edgeForm.retryActions);
    } else {
      setLocalRetryActions([]);
    }
  }, []);

  /**
   * Handle actions change for dialog
   */
  const handleActionsChange = useCallback(
    (newActions: EdgeAction[], edgeForm: EdgeForm, setEdgeForm: (form: EdgeForm) => void) => {
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
    return localActions.every((action) => {
      // Action must have a command
      if (!action.command || action.command.trim() === '') {
        return false;
      }

      // Check if action has required input based on command
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

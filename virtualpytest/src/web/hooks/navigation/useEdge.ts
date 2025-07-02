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

  /**
   * Convert navigation EdgeAction to controller EdgeAction for action execution
   */
  const convertToControllerAction = useCallback((navAction: EdgeAction): any => {
    return {
      id: navAction.id,
      label: navAction.description || navAction.command,
      command: navAction.command,
      params: navAction.params,
      requiresInput: false,
      inputValue:
        navAction.params?.input ||
        navAction.params?.text ||
        navAction.params?.key ||
        navAction.params?.package ||
        navAction.params?.element_identifier ||
        '',
      waitTime: (navAction.params?.delay || 0.5) * 1000,
    };
  }, []);

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
      const allActions = getActions();

      // Handle new format (multiple actions)
      if (edge.data?.actions && edge.data.actions.length > 0) {
        return edge.data.actions;
      }

      // Handle action_ids format (similar to verification_ids in nodes)
      if (edge.data?.action_ids && edge.data.action_ids.length > 0) {
        const edgeActions: EdgeAction[] = [];

        for (const actionId of edge.data.action_ids) {
          const action = allActions.find((a: any) => a.id === actionId);
          if (action) {
            const edgeAction: EdgeAction = {
              id: action.id,
              command: action.command,
              params: {
                ...action.params,
                delay: action.params?.delay || 0.5,
              },
              description: action.description || action.label || action.command || 'Unnamed Action',
            };
            edgeActions.push(edgeAction);
          } else {
            const placeholderAction: EdgeAction = {
              id: actionId,
              command: '',
              params: { delay: 0.5 },
              description: `Missing Action (ID: ${actionId.substring(0, 8)}...)`,
            };
            edgeActions.push(placeholderAction);
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
   * Format run result for compact display
   */
  const formatRunResult = useCallback((result: string): string => {
    if (!result) return '';

    const lines = result.split('\n');
    const formattedLines: string[] = [];

    for (const line of lines) {
      if (
        line.includes('⏹️ Execution stopped due to failed action') ||
        line.includes('📋 Processing') ||
        line.includes('⏳ Starting execution') ||
        line.includes('🔄 Executing action') ||
        line.includes('✅ Action completed') ||
        line.includes('❌ Action failed') ||
        line.includes('🎯 Final result')
      ) {
        continue;
      }

      if (line.trim()) {
        formattedLines.push(line);
      }
    }

    return formattedLines.join('\n');
  }, []);

  /**
   * Execute edge actions
   */
  const executeEdgeActions = useCallback(
    async (edge: UINavigationEdge) => {
      const actions = getActionsFromEdge(edge);
      const retryActions = getRetryActionsFromEdge(edge);

      if (actions.length === 0) {
        setRunResult('❌ No actions to execute');
        return;
      }

      if (!props?.isControlActive || !props?.selectedHost) {
        setRunResult('❌ Device control not active or host not available');
        return;
      }

      if (actionHook.loading) {
        return;
      }

      setRunResult(null);

      try {
        const result = await actionHook.executeActions(
          actions.map(convertToControllerAction),
          retryActions.map(convertToControllerAction),
          edge.data?.finalWaitTime || 2000,
        );

        const formattedResult = formatRunResult(actionHook.formatExecutionResults(result));
        setRunResult(formattedResult);
        return result;
      } catch (err: any) {
        const errorResult = `❌ Network error: ${err.message}`;
        setRunResult(errorResult);
        throw err;
      }
    },
    [
      actionHook,
      getActionsFromEdge,
      getRetryActionsFromEdge,
      convertToControllerAction,
      formatRunResult,
      props?.isControlActive,
      props?.selectedHost,
    ],
  );

  /**
   * Create edge form from edge data
   */
  const createEdgeForm = useCallback(
    (edge: UINavigationEdge): EdgeForm => {
      const actions = getActionsFromEdge(edge);
      const retryActions = getRetryActionsFromEdge(edge);

      return {
        description: edge.data?.description || '',
        actions: actions,
        retryActions: retryActions,
        finalWaitTime: edge.data?.finalWaitTime ?? 2000,
      };
    },
    [getActionsFromEdge, getRetryActionsFromEdge],
  );

  /**
   * Clear results when edge changes
   */
  const clearResults = useCallback(() => {
    setRunResult(null);
  }, []);

  return {
    // Action hook
    actionHook,

    // State
    runResult,

    // Utility functions
    getEdgeColorsForEdge,
    isProtectedEdge,
    getActionsFromEdge,
    getRetryActionsFromEdge,
    canRunActions,
    formatRunResult,
    createEdgeForm,

    // Action functions
    executeEdgeActions,
    clearResults,
  };
};

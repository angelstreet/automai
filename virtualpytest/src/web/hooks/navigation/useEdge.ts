import { useCallback, useState } from 'react';

import { useDeviceData } from '../../contexts/device/DeviceDataContext';
import { useNavigation } from '../../contexts/navigation/NavigationContext';
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

  // Navigation context for current position updates
  const { updateCurrentPosition } = useNavigation();

  // Device data hook (no longer needed for individual resolution)

  // Validation colors hook for edge styling
  const { getEdgeColors } = useValidationColors([]);

  // State for edge operations
  const [runResult, setRunResult] = useState<string | null>(null);

  /**
   * Convert navigation EdgeAction to controller EdgeAction for action execution
   */
  const convertToControllerAction = useCallback((navAction: EdgeAction): any => {
    // Safely extract input value from various parameter types
    const getInputValue = (params: any): string => {
      if (!params) return '';

      // Try different possible input fields
      return params.input || params.text || params.key || params.package || params.element_id || '';
    };

    // Safely get wait time
    const getWaitTime = (params: any): number => {
      return params?.wait_time || 0;
    };

    return {
      id: navAction.id,
      label: navAction.label || navAction.command,
      command: navAction.command,
      params: {
        ...navAction.params,
        wait_time: getWaitTime(navAction.params), // Use wait_time in ms
      },
      requiresInput: false,
      inputValue: getInputValue(navAction.params),
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
   * Get actions from edge data (already resolved by NavigationConfigContext)
   */
  const getActionsFromEdge = useCallback((edge: UINavigationEdge): EdgeAction[] => {
    return edge.data?.actions || [];
  }, []);

  /**
   * Get retry actions from edge data (already resolved by NavigationConfigContext)
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

        // Update current position to the target node if execution was successful
        // This follows the same pattern as executeNavigation in useNode.ts
        if (result && result.success !== false && edge.target) {
          updateCurrentPosition(edge.target, null);
        }

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
      updateCurrentPosition,
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
        edgeId: edge.id, // Include edge ID for tracking
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

import { useState, useCallback, useEffect } from 'react';

import { useDeviceData } from '../../contexts/device/DeviceDataContext';
import { Host } from '../../types/common/Host_Types';
import type { EdgeAction } from '../../types/controller/Action_Types';

// Define interfaces for action data structures
interface UseActionProps {
  selectedHost: Host | null;
  deviceId?: string | null;
}

interface ActionExecutionResult {
  success: boolean;
  message: string;
  results?: any[];
  passed_count?: number;
  total_count?: number;
  error?: string;
}

export const useAction = ({ selectedHost, deviceId }: UseActionProps) => {
  // Get actions from centralized context
  const { getAvailableActions } = useDeviceData();

  // State for action execution (not data fetching)
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [executionResults, setExecutionResults] = useState<EdgeAction[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Effect to clear success message after delay
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Execute batch actions
  const executeActions = useCallback(
    async (
      actions: EdgeAction[],
      retryActions: EdgeAction[] = [],
      finalWaitTime: number = 2000,
    ): Promise<ActionExecutionResult> => {
      if (!selectedHost) {
        const errorMsg = 'No host selected for action execution';
        setError(errorMsg);
        throw new Error(errorMsg);
      }

      if (actions.length === 0) {
        console.log('[useAction] No actions to execute');
        return { success: true, message: 'No actions to execute' };
      }

      console.log('[useAction] === ACTION EXECUTION DEBUG ===');
      console.log('[useAction] Number of actions:', actions.length);
      console.log('[useAction] Number of retry actions:', retryActions.length);

      // Filter out empty/invalid actions before execution
      const validActions = actions.filter((action, index) => {
        if (!action.command || action.command.trim() === '') {
          console.log(`[useAction] Removing action ${index}: No action type selected`);
          return false;
        }

        if (action.requiresInput) {
          const hasInputValue = action.inputValue && action.inputValue.trim() !== '';
          if (!hasInputValue) {
            console.log(`[useAction] Removing action ${index}: No input value specified`);
            return false;
          }
        }

        return true;
      });

      // Filter retry actions similarly
      const validRetryActions = retryActions.filter((action, index) => {
        if (!action.command || action.command.trim() === '') {
          console.log(`[useAction] Removing retry action ${index}: No action type selected`);
          return false;
        }

        if (action.requiresInput) {
          const hasInputValue = action.inputValue && action.inputValue.trim() !== '';
          if (!hasInputValue) {
            console.log(`[useAction] Removing retry action ${index}: No input value specified`);
            return false;
          }
        }

        return true;
      });

      if (validActions.length === 0) {
        const errorMsg = 'All actions were empty and have been removed. Please add valid actions.';
        setError(errorMsg);
        return { success: false, message: errorMsg };
      }

      try {
        setLoading(true);
        setError(null);
        setExecutionResults([]);

        console.log('[useAction] Submitting batch action request');
        console.log('[useAction] Valid actions count:', validActions.length);
        console.log('[useAction] Valid retry actions count:', validRetryActions.length);

        const batchPayload = {
          actions: validActions,
          retry_actions: validRetryActions,
          final_wait_time: finalWaitTime,
        };

        console.log('[useAction] Batch payload:', batchPayload);

        const response = await fetch('/server/action/executeBatch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host: selectedHost,
            device_id: deviceId,
            ...batchPayload,
          }),
        });

        console.log(
          `[useAction] Fetching from: /server/action/executeBatch with host: ${selectedHost?.host_name} and device: ${deviceId}`,
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('[useAction] Batch execution result:', result);

        if (result.success !== undefined) {
          setExecutionResults(result.results || []);
          console.log('[useAction] Execution results set:', result.results);

          const passedCount = result.passed_count || 0;
          const totalCount = result.total_count || 0;
          const summaryMessage = `Action execution completed: ${passedCount}/${totalCount} passed`;
          setSuccessMessage(summaryMessage);

          return {
            success: result.success,
            message: summaryMessage,
            results: result.results,
            passed_count: passedCount,
            total_count: totalCount,
          };
        } else {
          const errorMsg = result.error || 'Action execution failed';
          setError(errorMsg);
          return { success: false, message: errorMsg, error: errorMsg };
        }
      } catch (error) {
        console.error('[useAction] Error during action execution:', error);
        const errorMsg =
          error instanceof Error ? error.message : 'Unknown error during action execution';
        setError(errorMsg);
        return { success: false, message: errorMsg, error: errorMsg };
      } finally {
        setLoading(false);
      }
    },
    [selectedHost, deviceId],
  );

  // Format execution results for display
  const formatExecutionResults = useCallback((result: ActionExecutionResult): string => {
    if (!result.results || result.results.length === 0) {
      return result.message;
    }

    const lines: string[] = [];
    let mainActionIndex = 1;
    let retryActionIndex = 1;

    result.results.forEach((actionResult: any) => {
      const isRetryAction = actionResult.action_category === 'retry';
      let actionLabel: string;

      if (isRetryAction) {
        actionLabel = `Retry Action ${retryActionIndex}`;
        retryActionIndex++;
      } else {
        actionLabel = `Action ${mainActionIndex}`;
        mainActionIndex++;
      }

      if (actionResult.success) {
        lines.push(`✅ ${actionLabel}: ${actionResult.message || 'Success'}`);
      } else {
        lines.push(`❌ ${actionLabel}: ${actionResult.error || actionResult.message || 'Failed'}`);
      }
    });

    lines.push('');

    if (result.success) {
      lines.push(`✅ OVERALL RESULT: SUCCESS`);
    } else {
      lines.push(`❌ OVERALL RESULT: FAILED`);
    }

    // Count main actions vs retry actions for better reporting
    const mainActions = result.results.filter((r: any) => r.action_category !== 'retry');
    const retryActions = result.results.filter((r: any) => r.action_category === 'retry');
    const mainActionsPassed = mainActions.filter((r: any) => r.success).length;
    const retryActionsPassed = retryActions.filter((r: any) => r.success).length;

    if (retryActions.length > 0) {
      lines.push(
        `📊 ${mainActionsPassed}/${mainActions.length} main actions passed, ${retryActionsPassed}/${retryActions.length} retry actions passed`,
      );
    } else {
      lines.push(`📊 ${result.passed_count}/${result.total_count} actions passed`);
    }

    return lines.join('\n');
  }, []);

  return {
    // Get actions from context
    availableActions: getAvailableActions(),
    loading,
    error,
    executionResults,
    successMessage,
    executeActions,
    formatExecutionResults,
    selectedHost,
    deviceId,
  };
};

export type UseActionType = ReturnType<typeof useAction>;

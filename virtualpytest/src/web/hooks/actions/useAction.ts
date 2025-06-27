import { useState, useCallback, useEffect } from 'react';

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
  // State for action execution
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
        console.log('[@hook:useAction] No actions to execute');
        return { success: true, message: 'No actions to execute' };
      }

      console.log('[@hook:useAction] === ACTION EXECUTION DEBUG ===');
      console.log('[@hook:useAction] Number of actions:', actions.length);
      console.log('[@hook:useAction] Number of retry actions:', retryActions.length);

      // Filter out empty/invalid actions before execution
      const validActions = actions.filter((action, index) => {
        // Check if action has a command (is configured)
        if (!action.command || action.command.trim() === '') {
          console.log(`[@hook:useAction] Removing action ${index}: No action type selected`);
          return false;
        }

        // Check if action has required input
        if (action.requiresInput) {
          const hasInputValue = action.inputValue && action.inputValue.trim() !== '';
          if (!hasInputValue) {
            console.log(`[@hook:useAction] Removing action ${index}: No input value specified`);
            return false;
          }
        }

        return true;
      });

      // Filter retry actions similarly
      const validRetryActions = retryActions.filter((action, index) => {
        if (!action.command || action.command.trim() === '') {
          console.log(`[@hook:useAction] Removing retry action ${index}: No action type selected`);
          return false;
        }

        if (action.requiresInput) {
          const hasInputValue = action.inputValue && action.inputValue.trim() !== '';
          if (!hasInputValue) {
            console.log(
              `[@hook:useAction] Removing retry action ${index}: No input value specified`,
            );
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

        console.log('[@hook:useAction] Submitting batch action request');
        console.log('[@hook:useAction] Valid actions count:', validActions.length);
        console.log('[@hook:useAction] Valid retry actions count:', validRetryActions.length);

        const batchPayload = {
          actions: validActions,
          retry_actions: validRetryActions,
          final_wait_time: finalWaitTime,
        };

        console.log('[@hook:useAction] Batch payload:', batchPayload);

        // Use the consistent endpoint from our naming convention
        const response = await fetch('/server/action/execute_batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host: selectedHost, // Send full host object
            device_id: deviceId, // Send device ID
            ...batchPayload,
          }),
        });

        console.log(
          `[@hook:useAction] Fetching from: /server/action/execute_batch with host: ${selectedHost?.host_name} and device: ${deviceId}`,
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('[@hook:useAction] Batch execution result:', result);

        if (result.success !== undefined) {
          // Update results with executed actions
          const resultsWithStatus = validActions.map((action, index) => ({
            ...action,
            status: result.results?.[index]?.success ? 'passed' : 'failed',
            result_message: result.results?.[index]?.message || 'No message',
            execution_time: result.results?.[index]?.execution_time || 0,
          }));

          setExecutionResults(resultsWithStatus);
          console.log('[@hook:useAction] Execution results set:', resultsWithStatus);

          // Show summary message
          const passedCount = result.passed_count || 0;
          const totalCount = result.total_count || result.results?.length || 0;
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
        console.error('[@hook:useAction] Error during action execution:', error);
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

    // Add individual action results
    result.results.forEach((actionResult: any, index: number) => {
      if (actionResult.success) {
        lines.push(`✅ Action ${index + 1}: ${actionResult.message || 'Success'}`);
      } else {
        lines.push(
          `❌ Action ${index + 1}: ${actionResult.error || actionResult.message || 'Failed'}`,
        );
      }
    });

    // Add empty line
    lines.push('');

    // Add overall result
    if (result.success) {
      lines.push(`✅ OVERALL RESULT: SUCCESS`);
    } else {
      lines.push(`❌ OVERALL RESULT: FAILED`);
    }

    // Add summary
    lines.push(`📊 ${result.passed_count}/${result.total_count} actions passed`);

    return lines.join('\n');
  }, []);

  return {
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

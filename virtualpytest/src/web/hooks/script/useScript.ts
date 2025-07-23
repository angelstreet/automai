/**
 * Script Execution Hook
 *
 * This hook handles script execution operations with progress tracking and API calls.
 * Follows the same patterns as useValidation and other hooks.
 */

import { useState, useCallback } from 'react';

interface ScriptExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exit_code: number;
  host?: string;
  report_url?: string;
}

interface UseScriptReturn {
  executeScript: (
    scriptName: string,
    hostName: string,
    deviceId: string,
    parameters?: string,
  ) => Promise<ScriptExecutionResult>;
  isExecuting: boolean;
  lastResult: ScriptExecutionResult | null;
  error: string | null;
}

// Simple constant for the API base URL
const SCRIPT_API_BASE_URL = '/server/script';

export const useScript = (): UseScriptReturn => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<ScriptExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const executeScript = useCallback(
    async (
      scriptName: string,
      hostName: string,
      deviceId: string,
      parameters?: string,
    ): Promise<ScriptExecutionResult> => {
      console.log(
        `[@hook:useScript:executeScript] Executing script: ${scriptName} on ${hostName}:${deviceId}${parameters ? ` with parameters: ${parameters}` : ''}`,
      );

      setIsExecuting(true);
      setError(null);

      try {
        const requestBody: any = {
          script_name: scriptName,
          host_name: hostName,
          device_id: deviceId,
        };

        // Add parameters if provided
        if (parameters && parameters.trim()) {
          requestBody.parameters = parameters.trim();
        }

        // Start async script execution
        const response = await fetch(`${SCRIPT_API_BASE_URL}/execute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        const initialResult = await response.json();

        // Handle async task response (202 status code)
        if (response.status === 202 && initialResult.task_id) {
          console.log(
            `[@hook:useScript:executeScript] Script started async with task_id: ${initialResult.task_id}`,
          );

          // Poll for task completion
          const taskId = initialResult.task_id;
          const pollInterval = 2000; // 2 seconds
          const maxWaitTime = 300000; // 5 minutes
          const startTime = Date.now();

          while (Date.now() - startTime < maxWaitTime) {
            await new Promise((resolve) => setTimeout(resolve, pollInterval));

            try {
              const statusResponse = await fetch(`${SCRIPT_API_BASE_URL}/status/${taskId}`);
              const statusResult = await statusResponse.json();

              if (statusResult.success && statusResult.task) {
                const task = statusResult.task;

                if (task.status === 'completed') {
                  console.log(`[@hook:useScript:executeScript] Script completed successfully`);
                  const result: ScriptExecutionResult = {
                    success: task.result?.success || false,
                    stdout: task.result?.stdout || '',
                    stderr: task.result?.stderr || '',
                    exit_code: task.result?.exit_code || 0,
                    host: hostName,
                    report_url: task.result?.report_url,
                  };
                  setLastResult(result);
                  return result;
                } else if (task.status === 'failed') {
                  console.log(`[@hook:useScript:executeScript] Script failed:`, task.error);
                  throw new Error(task.error || 'Script execution failed');
                }
                // Continue polling if status is still 'started'
              }
            } catch (pollError) {
              console.warn(`[@hook:useScript:executeScript] Error polling task status:`, pollError);
              // Continue polling despite error
            }
          }

          throw new Error('Script execution timed out');
        } else {
          // Handle synchronous response or error
          if (!response.ok) {
            throw new Error(
              initialResult.stderr || initialResult.error || 'Script execution failed',
            );
          }

          console.log(`[@hook:useScript:executeScript] Script completed:`, initialResult);
          setLastResult(initialResult);
          return initialResult;
        }
      } catch (error) {
        console.error(`[@hook:useScript:executeScript] Error executing script:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setError(errorMessage);
        throw error;
      } finally {
        setIsExecuting(false);
      }
    },
    [],
  );

  return {
    executeScript,
    isExecuting,
    lastResult,
    error,
  };
};

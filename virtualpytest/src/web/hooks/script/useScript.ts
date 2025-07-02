/**
 * Script Execution Hook
 *
 * This hook handles script execution operations with progress tracking and API calls.
 * Follows the same patterns as useValidation and other hooks.
 */

import { useState, useCallback } from 'react';

import { Host } from '../../types/common/Host_Types';

interface ScriptExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exit_code: number;
  host?: string;
}

interface UseScriptReturn {
  executeScript: (
    scriptName: string,
    hostName: string,
    deviceId: string,
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
    ): Promise<ScriptExecutionResult> => {
      console.log(
        `[@hook:useScript:executeScript] Executing script: ${scriptName} on ${hostName}:${deviceId}`,
      );

      setIsExecuting(true);
      setError(null);

      try {
        const response = await fetch(`${SCRIPT_API_BASE_URL}/execute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            script_name: scriptName,
            host_name: hostName,
            device_id: deviceId,
          }),
        });

        const result: ScriptExecutionResult = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Script execution failed');
        }

        console.log(`[@hook:useScript:executeScript] Script completed:`, result);

        setLastResult(result);
        return result;
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

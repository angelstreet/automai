/**
 * Execution Results Hook
 *
 * This hook handles all execution results management functionality.
 */

import { useMemo } from 'react';

export interface ExecutionResult {
  id: string;
  team_id: string;
  tree_id: string;
  tree_name: string;
  node_id?: string;
  edge_id?: string;
  element_name: string;
  execution_type: 'action' | 'verification';
  host_name: string;
  device_model: string;
  success: boolean;
  execution_time_ms: number;
  message: string;
  error_details: any;
  executed_at: string;
}

export const useExecutionResults = () => {
  /**
   * Get all execution results
   */
  const getAllExecutionResults = useMemo(
    () => async (): Promise<ExecutionResult[]> => {
      try {
        console.log(
          '[@hook:useExecutionResults:getAllExecutionResults] Fetching all execution results from server',
        );

        const response = await fetch('/server/execution-results/getAllExecutionResults');

        console.log(
          '[@hook:useExecutionResults:getAllExecutionResults] Response status:',
          response.status,
        );
        console.log(
          '[@hook:useExecutionResults:getAllExecutionResults] Response headers:',
          response.headers.get('content-type'),
        );

        if (!response.ok) {
          // Try to get error message from response
          let errorMessage = `Failed to fetch execution results: ${response.status} ${response.statusText}`;
          try {
            const errorData = await response.text();
            console.log(
              '[@hook:useExecutionResults:getAllExecutionResults] Error response body:',
              errorData,
            );

            // Check if it's JSON
            if (response.headers.get('content-type')?.includes('application/json')) {
              const jsonError = JSON.parse(errorData);
              errorMessage = jsonError.error || errorMessage;
            } else {
              // It's HTML or other content, likely a proxy/server issue
              if (errorData.includes('<!doctype') || errorData.includes('<html')) {
                errorMessage =
                  'Server endpoint not available. Make sure the Flask server is running on the correct port and the proxy is configured properly.';
              }
            }
          } catch {
            console.log(
              '[@hook:useExecutionResults:getAllExecutionResults] Could not parse error response',
            );
          }

          throw new Error(errorMessage);
        }

        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error(
            `Expected JSON response but got ${contentType}. This usually means the Flask server is not running or the proxy is misconfigured.`,
          );
        }

        const executionResults = await response.json();
        console.log(
          `[@hook:useExecutionResults:getAllExecutionResults] Successfully loaded ${executionResults?.length || 0} execution results`,
        );
        return executionResults || [];
      } catch (error) {
        console.error(
          '[@hook:useExecutionResults:getAllExecutionResults] Error fetching execution results:',
          error,
        );
        throw error;
      }
    },
    [],
  );

  return {
    getAllExecutionResults,
  };
};

/**
 * Script Results Hook
 *
 * This hook handles all script results management functionality.
 */

import { useMemo } from 'react';

export interface ScriptResult {
  id: string;
  team_id: string;
  script_name: string;
  script_type: string;
  userinterface_name: string | null;
  host_name: string;
  device_name: string;
  success: boolean;
  execution_time_ms: number | null;
  started_at: string;
  completed_at: string;
  html_report_r2_path: string | null;
  html_report_r2_url: string | null;
  discard: boolean;
  error_msg: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export const useScriptResults = () => {
  /**
   * Get all script results
   */
  const getAllScriptResults = useMemo(
    () => async (): Promise<ScriptResult[]> => {
      try {
        console.log(
          '[@hook:useScriptResults:getAllScriptResults] Fetching all script results from server',
        );

        const response = await fetch('/server/script-results/getAllScriptResults');

        console.log(
          '[@hook:useScriptResults:getAllScriptResults] Response status:',
          response.status,
        );
        console.log(
          '[@hook:useScriptResults:getAllScriptResults] Response headers:',
          response.headers.get('content-type'),
        );

        if (!response.ok) {
          // Try to get error message from response
          let errorMessage = `Failed to fetch script results: ${response.status} ${response.statusText}`;
          try {
            const errorData = await response.text();
            console.log(
              '[@hook:useScriptResults:getAllScriptResults] Error response body:',
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
              '[@hook:useScriptResults:getAllScriptResults] Could not parse error response',
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

        const scriptResults = await response.json();
        console.log(
          `[@hook:useScriptResults:getAllScriptResults] Successfully loaded ${scriptResults?.length || 0} script results`,
        );
        return scriptResults || [];
      } catch (error) {
        console.error(
          '[@hook:useScriptResults:getAllScriptResults] Error fetching script results:',
          error,
        );
        throw error;
      }
    },
    [],
  );

  return {
    getAllScriptResults,
  };
}; 
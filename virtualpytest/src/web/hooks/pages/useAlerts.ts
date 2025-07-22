/**
 * Alerts Hook
 *
 * This hook handles all alerts management functionality for monitoring incidents.
 */

import { useMemo } from 'react';

export interface Alert {
  id: string;
  host_name: string;
  device_id: string;
  incident_type: string;
  status: 'active' | 'resolved';
  consecutive_count: number;
  start_time: string;
  end_time?: string;
  metadata: any;
}

export const useAlerts = () => {
  /**
   * Get all active alerts
   */
  const getActiveAlerts = useMemo(
    () => async (): Promise<Alert[]> => {
      try {
        console.log('[@hook:useAlerts:getActiveAlerts] Fetching active alerts from server');

        const response = await fetch('/server/alerts/getActiveAlerts');

        console.log('[@hook:useAlerts:getActiveAlerts] Response status:', response.status);

        if (!response.ok) {
          let errorMessage = `Failed to fetch active alerts: ${response.status} ${response.statusText}`;
          try {
            const errorData = await response.text();
            if (response.headers.get('content-type')?.includes('application/json')) {
              const jsonError = JSON.parse(errorData);
              errorMessage = jsonError.error || errorMessage;
            } else {
              if (errorData.includes('<!doctype') || errorData.includes('<html')) {
                errorMessage =
                  'Server endpoint not available. Make sure the Flask server is running on the correct port and the proxy is configured properly.';
              }
            }
          } catch {
            console.log('[@hook:useAlerts:getActiveAlerts] Could not parse error response');
          }

          throw new Error(errorMessage);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error(
            `Expected JSON response but got ${contentType}. This usually means the Flask server is not running or the proxy is misconfigured.`,
          );
        }

        const alerts = await response.json();
        console.log(
          `[@hook:useAlerts:getActiveAlerts] Successfully loaded ${alerts?.length || 0} active alerts`,
        );
        return alerts || [];
      } catch (error) {
        console.error('[@hook:useAlerts:getActiveAlerts] Error fetching active alerts:', error);
        throw error;
      }
    },
    [],
  );

  /**
   * Get all closed/resolved alerts
   */
  const getClosedAlerts = useMemo(
    () => async (): Promise<Alert[]> => {
      try {
        console.log('[@hook:useAlerts:getClosedAlerts] Fetching closed alerts from server');

        const response = await fetch('/server/alerts/getClosedAlerts');

        console.log('[@hook:useAlerts:getClosedAlerts] Response status:', response.status);

        if (!response.ok) {
          let errorMessage = `Failed to fetch closed alerts: ${response.status} ${response.statusText}`;
          try {
            const errorData = await response.text();
            if (response.headers.get('content-type')?.includes('application/json')) {
              const jsonError = JSON.parse(errorData);
              errorMessage = jsonError.error || errorMessage;
            } else {
              if (errorData.includes('<!doctype') || errorData.includes('<html')) {
                errorMessage =
                  'Server endpoint not available. Make sure the Flask server is running on the correct port and the proxy is configured properly.';
              }
            }
          } catch {
            console.log('[@hook:useAlerts:getClosedAlerts] Could not parse error response');
          }

          throw new Error(errorMessage);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error(
            `Expected JSON response but got ${contentType}. This usually means the Flask server is not running or the proxy is configured properly.`,
          );
        }

        const alerts = await response.json();
        console.log(
          `[@hook:useAlerts:getClosedAlerts] Successfully loaded ${alerts?.length || 0} closed alerts`,
        );
        return alerts || [];
      } catch (error) {
        console.error('[@hook:useAlerts:getClosedAlerts] Error fetching closed alerts:', error);
        throw error;
      }
    },
    [],
  );

  return {
    getActiveAlerts,
    getClosedAlerts,
  };
};

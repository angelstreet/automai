/**
 * Alerts Hook
 *
 * This hook handles all alerts management functionality for monitoring incidents.
 * Optimized to use a single database query with client-side filtering.
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
   * Get all alerts (optimized single query)
   */
  const getAllAlerts = useMemo(
    () => async (): Promise<Alert[]> => {
      try {
        console.log('[@hook:useAlerts:getAllAlerts] Fetching all alerts from server');

        const response = await fetch('/server/alerts/getAllAlerts');

        console.log('[@hook:useAlerts:getAllAlerts] Response status:', response.status);

        if (!response.ok) {
          let errorMessage = `Failed to fetch alerts: ${response.status} ${response.statusText}`;
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
            console.log('[@hook:useAlerts:getAllAlerts] Could not parse error response');
          }

          throw new Error(errorMessage);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error(
            `Expected JSON response but got ${contentType}. This usually means the Flask server is not running or the proxy is misconfigured.`,
          );
        }

        const result = await response.json();
        console.log(
          `[@hook:useAlerts:getAllAlerts] Successfully loaded ${result.alerts?.length || 0} total alerts`,
        );
        return result.alerts || [];
      } catch (error) {
        console.error('[@hook:useAlerts:getAllAlerts] Error fetching alerts:', error);
        throw error;
      }
    },
    [],
  );

  /**
   * Get all active alerts (client-side filtered)
   */
  const getActiveAlerts = useMemo(
    () => async (): Promise<Alert[]> => {
      try {
        const allAlerts = await getAllAlerts();
        const activeAlerts = allAlerts.filter((alert) => alert.status === 'active');
        console.log(
          `[@hook:useAlerts:getActiveAlerts] Filtered ${activeAlerts.length} active alerts from ${allAlerts.length} total`,
        );
        return activeAlerts;
      } catch (error) {
        console.error('[@hook:useAlerts:getActiveAlerts] Error filtering active alerts:', error);
        throw error;
      }
    },
    [getAllAlerts],
  );

  /**
   * Get all closed/resolved alerts (client-side filtered)
   */
  const getClosedAlerts = useMemo(
    () => async (): Promise<Alert[]> => {
      try {
        const allAlerts = await getAllAlerts();
        const closedAlerts = allAlerts.filter((alert) => alert.status === 'resolved');
        console.log(
          `[@hook:useAlerts:getClosedAlerts] Filtered ${closedAlerts.length} closed alerts from ${allAlerts.length} total`,
        );
        return closedAlerts;
      } catch (error) {
        console.error('[@hook:useAlerts:getClosedAlerts] Error filtering closed alerts:', error);
        throw error;
      }
    },
    [getAllAlerts],
  );

  return {
    getAllAlerts,
    getActiveAlerts,
    getClosedAlerts,
  };
};

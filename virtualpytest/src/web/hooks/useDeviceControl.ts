import { useCallback, useState, useEffect } from 'react';

import { Host } from '../types/common/Host_Types';
import { buildServerUrl } from '../utils/frontendUtils';

/**
 * Device Control Hook - Business Logic for Device Locking/Unlocking
 *
 * Handles device control operations via server endpoints with proper session tracking
 * to allow users to unlock their own locks.
 */
export const useDeviceControl = () => {
  // Track active locks by host name -> session ID
  const [activeLocks, setActiveLocks] = useState<Map<string, string>>(new Map());

  // Generate a unique session ID for this browser session
  const [browserSessionId] = useState(() => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `browser-session-${timestamp}-${random}`;
  });

  // Get user ID from browser storage if available
  const [userId] = useState(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('cached_user');
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          return user.id || 'browser-user';
        } catch (e) {
          // Ignore parsing errors
        }
      }
    }
    return 'browser-user';
  });

  // Clean up locks on unmount
  useEffect(() => {
    return () => {
      // Clean up any active locks when component unmounts
      activeLocks.forEach(async (sessionId, hostName) => {
        try {
          console.log(`[@hook:useDeviceControl] Cleaning up lock for ${hostName} on unmount`);
          await releaseControl(hostName, sessionId);
        } catch (error) {
          console.error(`[@hook:useDeviceControl] Error cleaning up lock for ${hostName}:`, error);
        }
      });
    };
  }, []);

  // Take control via server control endpoint with comprehensive error handling
  const takeControl = useCallback(
    async (
      hostName: string,
      sessionId?: string,
    ): Promise<{
      success: boolean;
      error?: string;
      errorType?:
        | 'stream_service_error'
        | 'adb_connection_error'
        | 'device_locked'
        | 'device_not_found'
        | 'network_error'
        | 'generic_error';
      details?: any;
    }> => {
      try {
        const effectiveSessionId = sessionId || browserSessionId;
        console.log(`[@hook:useDeviceControl] Taking control of device: ${hostName}`);

        const response = await fetch(buildServerUrl('/server/control/take-control'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            host_name: hostName,
            session_id: effectiveSessionId,
            user_id: userId,
          }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          console.log(`[@hook:useDeviceControl] Successfully took control of device: ${hostName}`);
          // Track this lock
          setActiveLocks((prev) => new Map(prev).set(hostName, effectiveSessionId));
          return { success: true };
        } else {
          // Handle specific error cases
          console.error(`[@hook:useDeviceControl] Failed to take control:`, result);

          let errorType: any = 'generic_error';
          let errorMessage = result.error || 'Failed to take control of device';

          if (result.error_type === 'stream_service_error') {
            errorType = 'stream_service_error';
            errorMessage = `AV Stream Error: ${result.error}`;
          } else if (result.error_type === 'adb_connection_error') {
            errorType = 'adb_connection_error';
            errorMessage = `Remote Connection Error: ${result.error}`;
          } else if (result.status === 'device_locked') {
            errorType = 'device_locked';
            errorMessage = `Device is locked by ${result.locked_by || 'another user'}`;
          } else if (result.status === 'device_not_found') {
            errorType = 'device_not_found';
            errorMessage = `Device ${hostName} not found or offline`;
          } else if (response.status === 409 && result.locked_by_same_user) {
            // Special case: locked by same user - treat as success
            console.log(
              `[@hook:useDeviceControl] Device ${hostName} locked by same user, treating as success`,
            );
            setActiveLocks((prev) => new Map(prev).set(hostName, effectiveSessionId));
            return { success: true };
          }

          return {
            success: false,
            error: errorMessage,
            errorType,
            details: result,
          };
        }
      } catch (error: any) {
        console.error(
          `[@hook:useDeviceControl] Exception taking control of device ${hostName}:`,
          error,
        );
        return {
          success: false,
          error: `Network error: ${error.message || 'Failed to communicate with server'}`,
          errorType: 'network_error',
          details: error,
        };
      }
    },
    [browserSessionId, userId],
  );

  // Release control via server control endpoint
  const releaseControl = useCallback(
    async (
      hostName: string,
      sessionId?: string,
    ): Promise<{
      success: boolean;
      error?: string;
      errorType?: 'network_error' | 'generic_error';
      details?: any;
    }> => {
      try {
        // Use provided session ID, or the one we used to lock this device, or browser session ID
        const effectiveSessionId = sessionId || activeLocks.get(hostName) || browserSessionId;

        console.log(`[@hook:useDeviceControl] Releasing control of device: ${hostName}`);

        const response = await fetch(buildServerUrl('/server/control/release-control'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            host_name: hostName,
            session_id: effectiveSessionId,
            user_id: userId,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to release control of device: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.success) {
          console.log(
            `[@hook:useDeviceControl] Successfully released control of device: ${hostName}`,
          );
          // Remove from active locks tracking
          setActiveLocks((prev) => {
            const newMap = new Map(prev);
            newMap.delete(hostName);
            return newMap;
          });
          return { success: true };
        } else {
          console.error(
            `[@hook:useDeviceControl] Server failed to release control of device: ${result.error}`,
          );
          return {
            success: false,
            error: result.error || 'Failed to release control of device',
            errorType: 'generic_error',
            details: result,
          };
        }
      } catch (error: any) {
        console.error(
          `[@hook:useDeviceControl] Exception releasing control of device ${hostName}:`,
          error,
        );
        return {
          success: false,
          error: `Network error: ${error.message || 'Failed to communicate with server'}`,
          errorType: 'network_error',
          details: error,
        };
      }
    },
    [activeLocks, browserSessionId, userId],
  );

  // Legacy methods for backward compatibility
  const lockDevice = useCallback(
    async (hostName: string, sessionId?: string): Promise<boolean> => {
      const result = await takeControl(hostName, sessionId);
      return result.success;
    },
    [takeControl],
  );

  const unlockDevice = useCallback(
    async (hostName: string, sessionId?: string): Promise<boolean> => {
      const result = await releaseControl(hostName, sessionId);
      return result.success;
    },
    [releaseControl],
  );

  // Check if device is locked (based on host data)
  const isDeviceLocked = useCallback((host: Host | null): boolean => {
    return host?.isLocked || false;
  }, []);

  // Check if device can be locked (based on host data)
  const canLockDevice = useCallback((host: Host | null): boolean => {
    if (!host) return false;
    return host.status === 'online' && !host.isLocked;
  }, []);

  return {
    // New methods with detailed error handling
    takeControl,
    releaseControl,

    // Legacy methods for backward compatibility
    lockDevice,
    unlockDevice,

    // Status checking methods
    isDeviceLocked,
    canLockDevice,
  };
};

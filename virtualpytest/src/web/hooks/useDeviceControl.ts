import { useCallback, useState, useEffect } from 'react';

import { Host } from '../types/common/Host_Types';
import { buildServerUrl } from '../utils/frontendUtils';

import { useUserSession } from './useUserSession';

/**
 * Device Control Hook - Business Logic for Device Locking/Unlocking
 *
 * Handles device control operations via server endpoints using consistent user identification.
 */
export const useDeviceControl = () => {
  // Use shared user session for consistent identification
  const { userId, sessionId: browserSessionId, isOurLock } = useUserSession();

  // Track active locks by host name -> user ID
  const [activeLocks, setActiveLocks] = useState<Map<string, string>>(new Map());

  // Automatically reclaim locks for devices that belong to this user
  const reclaimUserLocks = useCallback(async () => {
    try {
      console.log(`[@hook:useDeviceControl] Checking for locks to reclaim for user: ${userId}`);

      // Get list of all locked devices from server
      const response = await fetch(buildServerUrl('/server/control/locked-devices'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.locked_devices) {
          const userLockedDevices = Object.entries(result.locked_devices).filter(
            ([_, lockInfo]: [string, any]) => isOurLock(lockInfo),
          );

          if (userLockedDevices.length > 0) {
            console.log(
              `[@hook:useDeviceControl] Found ${userLockedDevices.length} devices locked by current user, reclaiming...`,
            );

            // Reclaim each device lock
            for (const [deviceId, lockInfo] of userLockedDevices) {
              const hostName = (lockInfo as any).hostName || deviceId;
              console.log(`[@hook:useDeviceControl] Reclaiming lock for device: ${hostName}`);
              setActiveLocks((prev) => new Map(prev).set(hostName, userId));
            }
          } else {
            console.log(`[@hook:useDeviceControl] No devices locked by current user found`);
          }
        }
      }
    } catch (error) {
      console.error(`[@hook:useDeviceControl] Error reclaiming user locks:`, error);
    }
  }, [userId, isOurLock]);

  // Initialize lock reclaim on mount
  useEffect(() => {
    reclaimUserLocks();
  }, [reclaimUserLocks]);

  // Clean up locks on unmount
  useEffect(() => {
    return () => {
      // Clean up any active locks when component unmounts
      activeLocks.forEach(async (lockUserId, hostName) => {
        try {
          console.log(`[@hook:useDeviceControl] Cleaning up lock for ${hostName} on unmount`);
          await releaseControl(hostName);
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
        console.log(`[@hook:useDeviceControl] Using user ID for lock: ${userId}`);

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
          setActiveLocks((prev) => new Map(prev).set(hostName, userId));
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
            console.log(
              `[@hook:useDeviceControl] Device ${hostName} locked by same user, reclaiming lock`,
            );
            setActiveLocks((prev) => new Map(prev).set(hostName, userId));
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
        const effectiveSessionId = sessionId || browserSessionId;

        console.log(`[@hook:useDeviceControl] Releasing control of device: ${hostName}`);
        console.log(`[@hook:useDeviceControl] Using user ID for unlock: ${userId}`);

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
    [browserSessionId, userId],
  );

  // Check if we have an active lock for a device
  const hasActiveLock = useCallback(
    (hostName: string): boolean => {
      return activeLocks.has(hostName);
    },
    [activeLocks],
  );

  // Check if device is locked (based on host data and local active locks)
  const isDeviceLocked = useCallback(
    (host: Host | null): boolean => {
      if (!host) return false;

      // If we have an active lock for this device, it's not locked for us
      if (hasActiveLock(host.host_name)) {
        return false;
      }

      // Otherwise, check the server-provided lock status
      return host.isLocked || false;
    },
    [hasActiveLock],
  );

  // Check if device can be locked (based on host data)
  const canLockDevice = useCallback((host: Host | null): boolean => {
    if (!host) return false;
    return host.status === 'online' && !host.isLocked;
  }, []);

  return {
    // Control methods
    takeControl,
    releaseControl,

    // Status checking methods
    isDeviceLocked,
    canLockDevice,
    hasActiveLock,

    // Lock management
    reclaimUserLocks,

    // User identification
    userId,
  };
};

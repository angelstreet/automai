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
          await unlockDevice(hostName, sessionId);
        } catch (error) {
          console.error(`[@hook:useDeviceControl] Error cleaning up lock for ${hostName}:`, error);
        }
      });
    };
  }, []);

  // Lock device via server control endpoint
  const lockDevice = useCallback(
    async (hostName: string, sessionId?: string): Promise<boolean> => {
      try {
        const effectiveSessionId = sessionId || browserSessionId;
        console.log(`[@hook:useDeviceControl] Attempting to lock device: ${hostName}`);

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
          return true;
        } else {
          // Check if it's locked by same user - if so, try to reacquire
          if (response.status === 409 && result.locked_by_same_user) {
            console.log(
              `[@hook:useDeviceControl] Device ${hostName} locked by same user, treating as success`,
            );
            setActiveLocks((prev) => new Map(prev).set(hostName, effectiveSessionId));
            return true;
          }

          console.error(
            `[@hook:useDeviceControl] Server failed to take control of device: ${result.error}`,
          );
          return false;
        }
      } catch (error: any) {
        console.error(
          `[@hook:useDeviceControl] Error taking control of device ${hostName}:`,
          error,
        );
        return false;
      }
    },
    [browserSessionId, userId],
  );

  // Unlock device via server control endpoint
  const unlockDevice = useCallback(
    async (hostName: string, sessionId?: string): Promise<boolean> => {
      try {
        // Use provided session ID, or the one we used to lock this device, or browser session ID
        const effectiveSessionId = sessionId || activeLocks.get(hostName) || browserSessionId;

        console.log(
          `[@hook:useDeviceControl] Attempting to release control of device: ${hostName}`,
        );

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
          return true;
        } else {
          console.error(
            `[@hook:useDeviceControl] Server failed to release control of device: ${result.error}`,
          );
          return false;
        }
      } catch (error: any) {
        console.error(
          `[@hook:useDeviceControl] Error releasing control of device ${hostName}:`,
          error,
        );
        return false;
      }
    },
    [activeLocks, browserSessionId, userId],
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
    lockDevice,
    unlockDevice,
    isDeviceLocked,
    canLockDevice,
  };
};

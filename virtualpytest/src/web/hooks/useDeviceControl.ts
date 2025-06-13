import { useCallback } from 'react';

import { Host } from '../types/common/Host_Types';
import { buildServerUrl } from '../utils/frontendUtils';

/**
 * Device Control Hook - Business Logic for Device Locking/Unlocking
 *
 * Handles device control operations via server endpoints
 */
export const useDeviceControl = () => {
  // Lock device via server control endpoint
  const lockDevice = useCallback(async (hostName: string, sessionId?: string): Promise<boolean> => {
    try {
      console.log(`[@hook:useDeviceControl] Attempting to lock device: ${hostName}`);

      const response = await fetch(buildServerUrl('/server/control/take-control'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host_name: hostName,
          session_id: sessionId || 'default-session',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to take control of device: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log(`[@hook:useDeviceControl] Successfully took control of device: ${hostName}`);
        return true;
      } else {
        console.error(
          `[@hook:useDeviceControl] Server failed to take control of device: ${result.error}`,
        );
        return false;
      }
    } catch (error: any) {
      console.error(`[@hook:useDeviceControl] Error taking control of device ${hostName}:`, error);
      return false;
    }
  }, []);

  // Unlock device via server control endpoint
  const unlockDevice = useCallback(async (hostName: string): Promise<boolean> => {
    try {
      console.log(`[@hook:useDeviceControl] Attempting to release control of device: ${hostName}`);

      const response = await fetch(buildServerUrl('/server/control/release-control'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host_name: hostName,
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
  }, []);

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

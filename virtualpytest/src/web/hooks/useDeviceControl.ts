import { useState, useCallback, useEffect, useRef } from 'react';

import { Host } from '../types/common/Host_Types';

import { useHostManager } from './useHostManager';

// ========================================
// TYPES
// ========================================

interface UseDeviceControlProps {
  host: Host | null;
  sessionId?: string;
  autoCleanup?: boolean; // Auto-release control on unmount
}

interface UseDeviceControlReturn {
  // Control state
  isControlActive: boolean;
  isControlLoading: boolean;
  controlError: string | null;

  // Control actions
  handleToggleControl: () => Promise<void>;
  handleTakeControl: () => Promise<boolean>;
  handleReleaseControl: () => Promise<boolean>;

  // Utility functions
  clearError: () => void;
}

// ========================================
// HOOK
// ========================================

export const useDeviceControl = ({
  host,
  sessionId,
  autoCleanup = true,
}: UseDeviceControlProps): UseDeviceControlReturn => {
  // ========================================
  // STATE
  // ========================================

  const [isControlActive, setIsControlActive] = useState(false);
  const [isControlLoading, setIsControlLoading] = useState(false);
  const [controlError, setControlError] = useState<string | null>(null);

  // Track if we need to cleanup on unmount
  const needsCleanupRef = useRef(false);

  // Get control functions from HostManager
  const { takeControl, releaseControl, hasActiveLock } = useHostManager();

  // ========================================
  // CONTROL HANDLERS
  // ========================================

  const handleTakeControl = useCallback(async (): Promise<boolean> => {
    if (!host) {
      setControlError('No host selected');
      return false;
    }

    setIsControlLoading(true);
    setControlError(null);

    try {
      console.log(`[useDeviceControl] Taking control of device: ${host.host_name}`);

      const result = await takeControl(host.host_name, sessionId);

      if (result.success) {
        setIsControlActive(true);
        needsCleanupRef.current = true;
        console.log(`[useDeviceControl] Successfully took control of: ${host.host_name}`);
        return true;
      } else {
        // Handle specific error types with user-friendly messages
        let errorMessage = result.error || 'Failed to take control';

        if (result.errorType === 'device_locked') {
          errorMessage = `Device is currently in use by another user`;
        } else if (result.errorType === 'device_not_found') {
          errorMessage = `Device is offline or not available`;
        } else if (result.errorType === 'stream_service_error') {
          errorMessage = `AV streaming service error: ${result.error}`;
        } else if (result.errorType === 'adb_connection_error') {
          errorMessage = `Remote connection error: ${result.error}`;
        } else if (result.errorType === 'network_error') {
          errorMessage = `Network error: Unable to reach device`;
        }

        setControlError(errorMessage);
        console.error(`[useDeviceControl] Failed to take control:`, result);
        return false;
      }
    } catch (error: any) {
      const errorMessage = `Connection failed: ${error.message || 'Unknown error'}`;
      setControlError(errorMessage);
      console.error(`[useDeviceControl] Exception taking control:`, error);
      return false;
    } finally {
      setIsControlLoading(false);
    }
  }, [host, sessionId, takeControl]);

  const handleReleaseControl = useCallback(async (): Promise<boolean> => {
    if (!host) {
      console.warn(`[useDeviceControl] No host to release control from`);
      return true; // Consider it success if no host
    }

    setIsControlLoading(true);
    setControlError(null);

    try {
      console.log(`[useDeviceControl] Releasing control of device: ${host.host_name}`);

      const result = await releaseControl(host.host_name, sessionId);

      if (result.success) {
        setIsControlActive(false);
        needsCleanupRef.current = false;
        console.log(`[useDeviceControl] Successfully released control of: ${host.host_name}`);
        return true;
      } else {
        const errorMessage = result.error || 'Failed to release control';
        setControlError(errorMessage);
        console.error(`[useDeviceControl] Failed to release control:`, result);
        return false;
      }
    } catch (error: any) {
      const errorMessage = `Failed to release control: ${error.message || 'Unknown error'}`;
      setControlError(errorMessage);
      console.error(`[useDeviceControl] Exception releasing control:`, error);
      return false;
    } finally {
      setIsControlLoading(false);
    }
  }, [host, sessionId, releaseControl]);

  const handleToggleControl = useCallback(async (): Promise<void> => {
    if (isControlActive) {
      await handleReleaseControl();
    } else {
      await handleTakeControl();
    }
  }, [isControlActive, handleTakeControl, handleReleaseControl]);

  const clearError = useCallback(() => {
    setControlError(null);
  }, []);

  // ========================================
  // EFFECTS
  // ========================================

  // Sync control state with HostManager lock status
  useEffect(() => {
    if (host) {
      const hasLock = hasActiveLock(host.host_name);
      if (hasLock !== isControlActive) {
        console.log(`[useDeviceControl] Syncing control state for ${host.host_name}: ${hasLock}`);
        setIsControlActive(hasLock);
        needsCleanupRef.current = hasLock;
      }
    }
  }, [host, hasActiveLock, isControlActive]);

  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoCleanup && needsCleanupRef.current && host) {
        console.log(`[useDeviceControl] Auto-cleanup: releasing control of ${host.host_name}`);
        // Don't await - this is cleanup
        releaseControl(host.host_name, sessionId).catch((error) => {
          console.error(`[useDeviceControl] Cleanup error:`, error);
        });
      }
    };
  }, [autoCleanup, host, sessionId, releaseControl]);

  // ========================================
  // RETURN
  // ========================================

  return {
    // Control state
    isControlActive,
    isControlLoading,
    controlError,

    // Control actions
    handleToggleControl,
    handleTakeControl,
    handleReleaseControl,

    // Utility functions
    clearError,
  };
};

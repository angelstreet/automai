import { useState, useEffect, useCallback } from 'react';

import { Host, Device } from '../../types/common/Host_Types';
import { useHostManager } from '../useHostManager';

interface UseRecReturn {
  avDevices: Array<{ host: Host; device: Device }>;
  isLoading: boolean;
  error: string | null;
  refreshHosts: () => Promise<void>;
}

export const useRec = (): UseRecReturn => {
  const [avDevices, setAvDevices] = useState<Array<{ host: Host; device: Device }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use the simplified HostManager function
  const { getDevicesByCapability } = useHostManager();

  // Get AV-capable devices
  const refreshHosts = useCallback(async (): Promise<void> => {
    console.log('[@hook:useRec] Refreshing AV devices');
    setIsLoading(true);
    setError(null);

    try {
      const devices = getDevicesByCapability('av');
      console.log(`[@hook:useRec] Found ${devices.length} AV-capable devices`);
      setAvDevices(devices);
    } catch (error) {
      console.error('[@hook:useRec] Error refreshing devices:', error);
      setError(error instanceof Error ? error.message : 'Failed to refresh devices');
    } finally {
      setIsLoading(false);
    }
  }, [getDevicesByCapability]);

  // Initialize on mount and set up auto-refresh
  useEffect(() => {
    console.log('[@hook:useRec] Initializing useRec hook');
    refreshHosts();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      console.log('[@hook:useRec] Auto-refreshing AV devices');
      refreshHosts();
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [refreshHosts]);

  return {
    avDevices,
    isLoading,
    error,
    refreshHosts,
  };
};

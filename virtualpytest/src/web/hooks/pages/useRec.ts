import { useState, useEffect, useCallback, useRef } from 'react';

import { Host } from '../../types/common/Host_Types';
import { useHostManager } from '../useHostManager';

interface HostWithAVStatus extends Host {
  avStatus: 'online' | 'offline' | 'checking';
}

interface UseRecReturn {
  hosts: HostWithAVStatus[];
  avDevices: Array<{ host: Host; device: any }>; // Add avDevices to return type
  isLoading: boolean;
  error: string | null;
  refreshHosts: () => Promise<void>;
  takeScreenshot: (host: Host, deviceId?: string) => Promise<string | null>;
  checkAVStatus: (host: Host, deviceId?: string) => Promise<boolean>;
}

export const useRec = (): UseRecReturn => {
  const [hosts, setHosts] = useState<HostWithAVStatus[]>([]);
  const [avDevices, setAvDevices] = useState<Array<{ host: Host; device: any }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const checkTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Use the new simplified HostManager functions (Phase 3.1)
  const { getDevicesByCapability, getAllHosts } = useHostManager();

  // Get AV-capable devices using the new function
  const getAVDevices = useCallback(() => {
    console.log('[@hook:useRec] Getting AV devices using getDevicesByCapability');
    const avDevices = getDevicesByCapability('av');
    console.log(`[@hook:useRec] Found ${avDevices.length} AV-capable devices`);
    return avDevices;
  }, [getDevicesByCapability]);

  // Check AV status for a specific device
  const checkAVStatus = useCallback(
    async (host: Host, deviceId: string = 'device1'): Promise<boolean> => {
      try {
        console.log(`[@hook:useRec] Checking AV status for ${host.host_name}:${deviceId}`);

        // Use server endpoint with proper device_id handling (Phase 3.1)
        const response = await fetch('/server/av/get-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            host: host,
            device_id: deviceId,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log(
            `[@hook:useRec] AV status for ${host.host_name}:${deviceId}:`,
            result.success,
          );
          return result.success === true;
        } else {
          console.warn(
            `[@hook:useRec] AV status check failed for ${host.host_name}:${deviceId}:`,
            response.status,
          );
          return false;
        }
      } catch (error) {
        console.error(
          `[@hook:useRec] Error checking AV status for ${host.host_name}:${deviceId}:`,
          error,
        );
        return false;
      }
    },
    [],
  );

  // Take screenshot for a specific device
  const takeScreenshot = useCallback(
    async (host: Host, deviceId: string = 'device1'): Promise<string | null> => {
      try {
        console.log(`[@hook:useRec] Taking screenshot for ${host.host_name}:${deviceId}`);

        // Use server endpoint with proper device_id handling (Phase 3.1)
        const response = await fetch('/server/av/take-screenshot', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            host: host,
            device_id: deviceId,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.screenshot_url) {
            console.log(
              `[@hook:useRec] Screenshot taken for ${host.host_name}:${deviceId}:`,
              result.screenshot_url,
            );
            return result.screenshot_url;
          }
        }

        console.warn(`[@hook:useRec] Screenshot failed for ${host.host_name}:${deviceId}`);
        return null;
      } catch (error) {
        console.error(
          `[@hook:useRec] Error taking screenshot for ${host.host_name}:${deviceId}:`,
          error,
        );
        return null;
      }
    },
    [],
  );

  // Refresh hosts data
  const refreshHosts = useCallback(async (): Promise<void> => {
    console.log('[@hook:useRec] Refreshing AV hosts');
    setIsLoading(true);
    setError(null);

    try {
      // Get AV devices directly using new function (Phase 3.1)
      const avDevicesData = getAVDevices();
      setAvDevices(avDevicesData);

      if (avDevicesData.length === 0) {
        console.log('[@hook:useRec] No AV devices found');
        setHosts([]);
        setIsLoading(false);
        return;
      }

      // Create unique hosts list from AV devices
      const uniqueHosts = new Map<string, Host>();
      avDevicesData.forEach(({ host }) => {
        uniqueHosts.set(host.host_name, host);
      });

      // Convert to HostWithAVStatus array and check status for online hosts
      const hostsToCheck = Array.from(uniqueHosts.values()).map((host) => ({
        ...host,
        avStatus: host.status === 'online' ? ('checking' as const) : ('offline' as const),
      }));

      setHosts(hostsToCheck);

      // Check AV status for online hosts (with device_id from their AV devices)
      for (const { host, device } of avDevicesData) {
        if (host.status === 'online') {
          // Clear any existing timeout for this host
          const timeoutKey = `${host.host_name}:${device.device_id || 'device1'}`;
          const existingTimeout = checkTimeoutsRef.current.get(timeoutKey);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
          }

          // Set timeout to check status
          const timeout = setTimeout(async () => {
            try {
              const status = await checkAVStatus(host, device.device_id || 'device1');
              setHosts((prevHosts) =>
                prevHosts.map((h) =>
                  h.host_name === host.host_name
                    ? { ...h, avStatus: status ? 'online' : 'offline' }
                    : h,
                ),
              );
            } catch (error) {
              console.error(`[@hook:useRec] Error checking status for ${host.host_name}:`, error);
              setHosts((prevHosts) =>
                prevHosts.map((h) =>
                  h.host_name === host.host_name ? { ...h, avStatus: 'offline' } : h,
                ),
              );
            } finally {
              checkTimeoutsRef.current.delete(timeoutKey);
            }
          }, 100);

          checkTimeoutsRef.current.set(timeoutKey, timeout);
        }
      }
    } catch (error) {
      console.error('[@hook:useRec] Error refreshing hosts:', error);
      setError(error instanceof Error ? error.message : 'Failed to refresh hosts');
    } finally {
      setIsLoading(false);
    }
  }, [getAVDevices, checkAVStatus]);

  // Initialize on mount
  useEffect(() => {
    console.log('[@hook:useRec] Initializing useRec hook');
    refreshHosts();

    // Cleanup timeouts on unmount
    const timeouts = checkTimeoutsRef.current;
    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
      timeouts.clear();
    };
  }, [refreshHosts]);

  // Auto-refresh when available hosts change
  useEffect(() => {
    const allHosts = getAllHosts();
    console.log(`[@hook:useRec] Host count changed: ${allHosts.length} hosts available`);
    if (allHosts.length > 0) {
      refreshHosts();
    }
  }, [getAllHosts, refreshHosts]);

  return {
    hosts,
    avDevices,
    isLoading,
    error,
    refreshHosts,
    takeScreenshot,
    checkAVStatus,
  };
};

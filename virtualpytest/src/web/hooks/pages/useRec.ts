import { useState, useEffect, useCallback, useRef } from 'react';

import { Host } from '../../types/common/Host_Types';
import { useHostManager } from '../useHostManager';

interface HostWithAVStatus extends Host {
  avStatus: 'online' | 'offline' | 'checking';
}

interface UseRecReturn {
  hosts: HostWithAVStatus[];
  isLoading: boolean;
  error: string | null;
  refreshHosts: () => Promise<void>;
  takeScreenshot: (host: Host, deviceId?: string) => Promise<string | null>;
  checkAVStatus: (host: Host) => Promise<boolean>;
}

export const useRec = (): UseRecReturn => {
  const [hosts, setHosts] = useState<HostWithAVStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchInProgressRef = useRef(false);

  // Get hosts from HostManager context instead of direct fetch
  const { availableHosts, fetchHosts: fetchHostsFromContext } = useHostManager();

  // Check AV status for a specific host
  const checkAVStatus = useCallback(async (host: Host): Promise<boolean> => {
    try {
      console.log(`[@hook:useRec] Checking AV status for host: ${host.host_name}`);

      const response = await fetch('/server/av/get-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ host }),
      });

      if (!response.ok) {
        console.log(
          `[@hook:useRec] AV status check failed for ${host.host_name}: ${response.status}`,
        );
        return false;
      }

      const data = await response.json();

      // Trust the server route response - if it says success, it's available
      const isAvailable = data.success;

      console.log(
        `[@hook:useRec] AV status for ${host.host_name}: ${isAvailable ? 'available' : 'unavailable'}`,
      );
      return isAvailable;
    } catch (err: any) {
      console.error(`[@hook:useRec] AV status check error for ${host.host_name}:`, err);
      return false;
    }
  }, []);

  // Fetch all connected hosts and filter for AV capabilities
  const fetchHosts = useCallback(async () => {
    // Prevent multiple simultaneous fetch requests
    if (fetchInProgressRef.current) {
      console.log('[@hook:useRec] Fetch already in progress, skipping');
      return;
    }

    fetchInProgressRef.current = true;
    setIsLoading(true);

    try {
      console.log('[@hook:useRec] Fetching connected hosts with AV capabilities');

      // First fetch hosts from context
      await fetchHostsFromContext();

      // Then filter for AV capabilities
      console.log(`[@hook:useRec] Received ${availableHosts.length} hosts from context`);

      // Filter hosts that have devices with AV capabilities and are online
      const avHosts = availableHosts.filter((host: Host) => {
        const hasDevicesWithAV =
          host.devices?.some((device: any) => device.capabilities?.av === 'hdmi_stream') || false;

        // Host must be online and have at least one device with AV capability
        return (
          host.status === 'online' && host.devices && host.devices.length > 0 && hasDevicesWithAV
        );
      });

      console.log(
        `[@hook:useRec] Found ${avHosts.length} hosts with AV-capable devices out of ${availableHosts.length} total hosts`,
      );

      // Check AV status for each host and add status property
      const hostsWithStatus: HostWithAVStatus[] = await Promise.all(
        avHosts.map(async (host: Host) => {
          const avStatus = await checkAVStatus(host);
          return {
            ...host,
            avStatus: avStatus ? 'online' : 'offline',
          };
        }),
      );

      console.log(`[@hook:useRec] Processed ${hostsWithStatus.length} hosts with AV status`);

      setHosts(hostsWithStatus);
      setError(null);
    } catch (err: any) {
      console.error('[@hook:useRec] Error fetching hosts:', err);
      setError(err.message || 'Failed to fetch hosts');
      setHosts([]);
    } finally {
      setIsLoading(false);
      fetchInProgressRef.current = false;
    }
  }, [availableHosts, fetchHostsFromContext, checkAVStatus]);

  // Take screenshot for a specific host and device
  const takeScreenshot = useCallback(
    async (host: Host, deviceId?: string): Promise<string | null> => {
      try {
        const deviceInfo = deviceId ? ` device: ${deviceId}` : '';
        console.log(`[@hook:useRec] Taking screenshot for host: ${host.host_name}${deviceInfo}`);

        const payload = { host };
        if (deviceId) {
          (payload as any).device_id = deviceId;
        }

        const response = await fetch('/server/av/take-screenshot', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Screenshot failed: ${response.status}`);
        }

        const result = await response.json();

        if (result.success && result.screenshot_url) {
          console.log(
            `[@hook:useRec] Screenshot taken for ${host.host_name}${deviceInfo}: ${result.screenshot_url}`,
          );
          return result.screenshot_url;
        } else {
          console.error(
            `[@hook:useRec] Screenshot failed for ${host.host_name}${deviceInfo}:`,
            result.error,
          );
          return null;
        }
      } catch (err: any) {
        console.error(`[@hook:useRec] Error taking screenshot for ${host.host_name}:`, err);
        return null;
      }
    },
    [],
  );

  // Refresh hosts function
  const refreshHosts = useCallback(async () => {
    await fetchHosts();
  }, [fetchHosts]);

  // Initial fetch - with ref to prevent React 18 double effects in development
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      fetchHosts();
    }
  }, [fetchHosts]);

  return {
    hosts,
    isLoading,
    error,
    refreshHosts,
    takeScreenshot,
    checkAVStatus,
  };
};

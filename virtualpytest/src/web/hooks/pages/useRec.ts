import { useState, useEffect, useCallback } from 'react';

import { Host, Device } from '../../types/common/Host_Types';
import { useHostManager } from '../useHostManager';

interface UseRecReturn {
  avDevices: Array<{ host: Host; device: Device }>;
  isLoading: boolean;
  error: string | null;
  refreshHosts: () => Promise<void>;
  baseUrlPatterns: Map<string, string>; // host_name-device_id -> base URL pattern
  initializeBaseUrl: (host: Host, device: Device) => Promise<boolean>; // One-time base URL setup
  generateThumbnailUrl: (host: Host, device: Device) => string | null; // Generate URL with current timestamp
}

/**
 * Hook for managing recording/AV device discovery and display
 *
 * Simplified to only handle device discovery:
 * - Stream URL fetching: Use useStream hook
 * - Device control: Use HostManager takeControl/releaseControl directly
 */
export const useRec = (): UseRecReturn => {
  const [avDevices, setAvDevices] = useState<Array<{ host: Host; device: Device }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [baseUrlPatterns, setBaseUrlPatterns] = useState<Map<string, string>>(new Map());

  // Use the simplified HostManager function and loading state
  const { getDevicesByCapability, isLoading: isHostManagerLoading } = useHostManager();

  // One-time initialization to get base URL pattern (only called once per device)
  const initializeBaseUrl = useCallback(
    async (host: Host, device: Device): Promise<boolean> => {
      const deviceKey = `${host.host_name}-${device.device_id}`;

      // Skip if base URL already exists
      if (baseUrlPatterns.has(deviceKey)) {
        console.log(`[@hook:useRec] Base URL already exists for ${deviceKey}`);
        return true;
      }

      try {
        console.log(`[@hook:useRec] Initializing base URL for device: ${deviceKey}`);

        const response = await fetch('/server/av/take-screenshot', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            host: host,
            device_id: device?.device_id || 'device1',
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.screenshot_url) {
            console.log(
              `[@hook:useRec] Initial screenshot taken for ${deviceKey}: ${result.screenshot_url}`,
            );

            // Extract base pattern: remove timestamp and .jpg, keep _thumbnail
            const basePattern = result.screenshot_url.replace(
              /\d{14}_thumbnail\.jpg$/,
              '{timestamp}_thumbnail.jpg',
            );
            console.log(`[@hook:useRec] Storing base URL pattern for ${deviceKey}: ${basePattern}`);

            // Update state synchronously
            setBaseUrlPatterns((prev) => {
              const newMap = new Map(prev);
              newMap.set(deviceKey, basePattern);
              console.log(`[@hook:useRec] Base URL pattern stored successfully for ${deviceKey}`);
              return newMap;
            });

            return true;
          }
        }

        console.warn(`[@hook:useRec] Base URL initialization failed for: ${deviceKey}`);
        return false;
      } catch (err: any) {
        console.error(`[@hook:useRec] Base URL initialization error for ${deviceKey}:`, err);
        return false;
      }
    },
    [baseUrlPatterns],
  );

  // Generate thumbnail URL with current timestamp (no server calls)
  const generateThumbnailUrl = useCallback(
    (host: Host, device: Device): string | null => {
      const deviceKey = `${host.host_name}-${device.device_id}`;
      const basePattern = baseUrlPatterns.get(deviceKey);

      // Debug: show all available patterns
      console.log(
        `[@hook:useRec] Available base URL patterns:`,
        Array.from(baseUrlPatterns.keys()),
      );
      console.log(`[@hook:useRec] Looking for pattern for device: ${deviceKey}`);

      if (!basePattern) {
        console.warn(`[@hook:useRec] No base URL pattern found for device: ${deviceKey}`);
        console.warn(
          `[@hook:useRec] Available patterns: ${Array.from(baseUrlPatterns.keys()).join(', ')}`,
        );
        return null;
      }

      // Generate current timestamp in YYYYMMDDHHMMSS format
      const now = new Date();
      const timestamp =
        now.getFullYear().toString() +
        (now.getMonth() + 1).toString().padStart(2, '0') +
        now.getDate().toString().padStart(2, '0') +
        now.getHours().toString().padStart(2, '0') +
        now.getMinutes().toString().padStart(2, '0') +
        now.getSeconds().toString().padStart(2, '0');

      const thumbnailUrl = basePattern.replace('{timestamp}', timestamp);
      console.log(`[@hook:useRec] Generated thumbnail URL for ${deviceKey}: ${thumbnailUrl}`);
      return thumbnailUrl;
    },
    [baseUrlPatterns],
  );

  // Get AV-capable devices - only when HostManager is ready
  const refreshHosts = useCallback(async (): Promise<void> => {
    // Don't fetch if HostManager is still loading
    if (isHostManagerLoading) {
      console.log('[@hook:useRec] HostManager still loading, skipping refresh');
      return;
    }

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
  }, [getDevicesByCapability, isHostManagerLoading]);

  // Trigger refresh when HostManager finishes loading
  useEffect(() => {
    if (!isHostManagerLoading) {
      console.log('[@hook:useRec] HostManager ready, refreshing AV devices');
      refreshHosts();
    }
  }, [isHostManagerLoading, refreshHosts]);

  // Initialize on mount and set up auto-refresh
  useEffect(() => {
    console.log('[@hook:useRec] Initializing useRec hook');

    // Initial refresh (will be skipped if HostManager is loading)
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
    baseUrlPatterns,
    initializeBaseUrl,
    generateThumbnailUrl,
  };
};

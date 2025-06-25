import { useState, useEffect, useCallback } from 'react';

import { Host, Device } from '../../types/common/Host_Types';
import { useHostManager } from '../useHostManager';

interface UseRecReturn {
  avDevices: Array<{ host: Host; device: Device }>;
  isLoading: boolean;
  error: string | null;
  refreshHosts: () => Promise<void>;
  baseUrlPatterns: Map<string, string>; // host_name -> base URL pattern
  takeScreenshot: (host: Host, device: Device) => Promise<string | null>; // Returns timestamp or null
  generateThumbnailUrl: (host: Host, timestamp: string) => string | null; // Generate URL from timestamp
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

  // Take screenshot and return timestamp for direct URL generation
  const takeScreenshot = useCallback(
    async (host: Host, device: Device): Promise<string | null> => {
      try {
        console.log(`[@hook:useRec] Taking screenshot for host: ${host.host_name}`);

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
            console.log(`[@hook:useRec] Screenshot taken: ${result.screenshot_url}`);

            // Extract and store base URL pattern if not already stored
            const hostKey = host.host_name;
            if (!baseUrlPatterns.has(hostKey)) {
              // Extract base pattern: remove timestamp and .jpg, keep _thumbnail
              const basePattern = result.screenshot_url.replace(
                /\d{14}_thumbnail\.jpg$/,
                '{timestamp}_thumbnail.jpg',
              );
              console.log(`[@hook:useRec] Storing base URL pattern for ${hostKey}: ${basePattern}`);
              setBaseUrlPatterns((prev) => new Map(prev).set(hostKey, basePattern));
            }

            // Extract timestamp from the URL (14 digits before _thumbnail.jpg)
            const timestampMatch = result.screenshot_url.match(/(\d{14})_thumbnail\.jpg$/);
            return timestampMatch ? timestampMatch[1] : null;
          }
        }

        console.warn(`[@hook:useRec] Screenshot capture failed for: ${host.host_name}`);
        return null;
      } catch (err: any) {
        console.error(`[@hook:useRec] Screenshot error for ${host.host_name}:`, err);
        return null;
      }
    },
    [baseUrlPatterns],
  );

  // Generate thumbnail URL from base pattern and timestamp
  const generateThumbnailUrl = useCallback(
    (host: Host, timestamp: string): string | null => {
      const basePattern = baseUrlPatterns.get(host.host_name);
      if (!basePattern) {
        console.warn(`[@hook:useRec] No base URL pattern found for host: ${host.host_name}`);
        return null;
      }

      const thumbnailUrl = basePattern.replace('{timestamp}', timestamp);
      console.log(`[@hook:useRec] Generated thumbnail URL for ${host.host_name}: ${thumbnailUrl}`);
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
    takeScreenshot,
    generateThumbnailUrl,
  };
};

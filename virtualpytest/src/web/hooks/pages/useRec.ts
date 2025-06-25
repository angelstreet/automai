import { useState, useEffect, useCallback, useRef } from 'react';

import { Host, Device } from '../../types/common/Host_Types';
import { useHostManager } from '../useHostManager';

// Global state to persist across React remounts in development mode
const globalBaseUrlPatterns = new Map<string, string>();

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

  // Use ref to persist baseUrlPatterns across React remounts in dev mode
  const baseUrlPatternsRef = useRef<Map<string, string>>(new Map());
  const [baseUrlPatterns, setBaseUrlPatterns] = useState<Map<string, string>>(
    baseUrlPatternsRef.current,
  );

  // Use the simplified HostManager function and loading state
  const { getDevicesByCapability, isLoading: isHostManagerLoading } = useHostManager();

  // One-time initialization to get base URL pattern (only called once per device)
  const initializeBaseUrl = useCallback(
    async (host: Host, device: Device): Promise<boolean> => {
      const deviceKey = `${host.host_name}-${device.device_id}`;

      // Check global state, ref, and local state for existing URL
      if (
        globalBaseUrlPatterns.has(deviceKey) ||
        baseUrlPatternsRef.current.has(deviceKey) ||
        baseUrlPatterns.has(deviceKey)
      ) {
        // Sync global to local if needed
        if (globalBaseUrlPatterns.has(deviceKey) && !baseUrlPatterns.has(deviceKey)) {
          const pattern = globalBaseUrlPatterns.get(deviceKey)!;
          baseUrlPatternsRef.current.set(deviceKey, pattern);
          setBaseUrlPatterns((prev) => {
            const newMap = new Map(prev);
            newMap.set(deviceKey, pattern);
            return newMap;
          });
        }

        return true;
      }

      try {
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
            // Extract base pattern: remove timestamp and .jpg, keep _thumbnail
            const basePattern = result.screenshot_url.replace(
              /\d{14}_thumbnail\.jpg$/,
              '{timestamp}_thumbnail.jpg',
            );

            // Update global state, ref (persistent), and local state (reactive)
            globalBaseUrlPatterns.set(deviceKey, basePattern);
            baseUrlPatternsRef.current.set(deviceKey, basePattern);
            setBaseUrlPatterns((prev) => {
              const newMap = new Map(prev);
              newMap.set(deviceKey, basePattern);
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

      // Check global first, then ref, then state
      let basePattern =
        globalBaseUrlPatterns.get(deviceKey) ||
        baseUrlPatternsRef.current.get(deviceKey) ||
        baseUrlPatterns.get(deviceKey);

      if (!basePattern) {
        console.warn(`[@hook:useRec] No base URL pattern found for device: ${deviceKey}`);
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
      return thumbnailUrl;
    },
    [baseUrlPatterns],
  );

  // Sync global and ref to state on mount (handles remount scenario)
  useEffect(() => {
    if (
      (globalBaseUrlPatterns.size > 0 || baseUrlPatternsRef.current.size > 0) &&
      baseUrlPatterns.size === 0
    ) {
      const mergedPatterns = new Map([...globalBaseUrlPatterns, ...baseUrlPatternsRef.current]);
      setBaseUrlPatterns(mergedPatterns);
      // Also sync to ref if global has more recent data
      if (globalBaseUrlPatterns.size > baseUrlPatternsRef.current.size) {
        baseUrlPatternsRef.current = new Map(globalBaseUrlPatterns);
      }
    }
  }, [baseUrlPatterns.size]);

  // Get AV-capable devices - only when HostManager is ready
  const refreshHosts = useCallback(async (): Promise<void> => {
    // Don't fetch if HostManager is still loading
    if (isHostManagerLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const devices = getDevicesByCapability('av');
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
      refreshHosts();
    }
  }, [isHostManagerLoading, refreshHosts]);

  // Initialize on mount and set up auto-refresh
  useEffect(() => {
    // Initial refresh (will be skipped if HostManager is loading)
    refreshHosts();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
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

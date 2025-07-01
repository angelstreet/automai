import { useState, useEffect, useCallback, useRef } from 'react';

import { useModal } from '../../contexts/ModalContext';
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
  generateThumbnailUrl: (host: Host, device: Device) => string | null; // Generate URL with current timestamp (blocked when modal open)
  restartStreams: () => Promise<void>; // Restart streams for all AV devices
  isRestarting: boolean; // Loading state for restart operation
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
  const [isRestarting, setIsRestarting] = useState(false);

  // Add modal context hook
  const { isAnyModalOpen } = useModal();

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
        const response = await fetch('/server/av/takeScreenshot', {
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
            // Extract base pattern: remove timestamp from capture_YYYYMMDDHHMMSS.jpg format
            const basePattern = result.screenshot_url.replace(
              /capture_\d{14}\.jpg$/,
              'capture_{timestamp}.jpg',
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

  // Generate thumbnail URL with current timestamp (no server calls) - blocked when modal open
  const generateThumbnailUrl = useCallback(
    (host: Host, device: Device): string | null => {
      const deviceKey = `${host.host_name}-${device.device_id}`;

      // Log which component initiated this call (using stack trace)
      const stack = new Error().stack;
      const callerLine = stack?.split('\n')[2]?.trim() || 'unknown caller';
      console.log(`[@hook:useRec] generateThumbnailUrl called for ${deviceKey} by: ${callerLine}`);

      // Check if any modal is open using ModalContext
      if (isAnyModalOpen) {
        console.log(`[@hook:useRec] Thumbnail generation paused for ${deviceKey} (modal open)`);
        return null;
      }

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

      // Convert basePattern from original image to thumbnail
      // basePattern is like: "http://host/path/capture_{timestamp}.jpg"
      // We need: "http://host/path/capture_{timestamp}_thumbnail.jpg"
      const thumbnailPattern = basePattern.replace(
        'capture_{timestamp}.jpg',
        'capture_{timestamp}_thumbnail.jpg',
      );
      const thumbnailUrl = thumbnailPattern.replace('{timestamp}', timestamp);

      console.log(`[@hook:useRec] generateThumbnailUrl for ${deviceKey}: ${thumbnailUrl}`);
      return thumbnailUrl;
    },
    [baseUrlPatterns, isAnyModalOpen],
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

  // Restart streams for all AV devices
  const restartStreams = useCallback(async (): Promise<void> => {
    if (isRestarting) return; // Prevent multiple concurrent restarts

    setIsRestarting(true);
    setError(null);

    try {
      console.log(`[@hook:useRec] Starting stream restart for ${avDevices.length} devices`);

      // Restart streams sequentially for each AV device
      for (const { host, device } of avDevices) {
        try {
          console.log(`[@hook:useRec] Restarting stream for ${host.host_name}-${device.device_id}`);

          const response = await fetch('/server/av/restartStream', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              host: host,
              device_id: device.device_id || 'device1',
            }),
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              console.log(
                `[@hook:useRec] Successfully restarted stream for ${host.host_name}-${device.device_id}`,
              );
            } else {
              console.error(
                `[@hook:useRec] Failed to restart stream for ${host.host_name}-${device.device_id}:`,
                result.error,
              );
            }
          } else {
            console.error(
              `[@hook:useRec] Restart request failed for ${host.host_name}-${device.device_id}:`,
              response.status,
            );
          }
        } catch (deviceError) {
          console.error(
            `[@hook:useRec] Error restarting stream for ${host.host_name}-${device.device_id}:`,
            deviceError,
          );
        }
      }

      console.log(`[@hook:useRec] Completed stream restart for all devices`);
    } catch (error) {
      console.error('[@hook:useRec] Error restarting streams:', error);
      setError(error instanceof Error ? error.message : 'Failed to restart streams');
    } finally {
      setIsRestarting(false);
    }
  }, [avDevices, isRestarting]);

  return {
    avDevices,
    isLoading,
    error,
    refreshHosts,
    baseUrlPatterns,
    initializeBaseUrl,
    generateThumbnailUrl,
    restartStreams,
    isRestarting,
  };
};

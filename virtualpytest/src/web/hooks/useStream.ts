import { useState, useEffect, useRef } from 'react';

import { Host } from '../types/common/Host_Types';

interface UseStreamProps {
  host: Host;
  device_id: string; // Always required - no optional
}

interface UseStreamReturn {
  streamUrl: string | null;
  isLoadingUrl: boolean;
  urlError: string | null;
  refetchStreamUrl: () => void; // Add manual refetch function
}

/**
 * Process stream URL with conditional HTTP to HTTPS proxy (same pattern as images)
 */
const processStreamUrl = (url: string): string => {
  if (!url) return url;
  // Handle data URLs - return as is (unlikely for streams but consistent)
  if (url.startsWith('data:')) {
    return url;
  }

  // Handle HTTPS URLs - return as is (no proxy needed)
  if (url.startsWith('https:')) {
    return url;
  }

  // Handle HTTP URLs - use proxy to convert to HTTPS
  if (url.startsWith('http:')) {
    const proxyUrl = `/server/av/proxy-stream?url=${encodeURIComponent(url)}`;
    console.log(`[@hook:useStream] Generated proxy URL for stream: ${proxyUrl}`);
    return proxyUrl;
  }
  return url;
};

/**
 * Hook for fetching stream URLs from hosts
 *
 * Simple, single-stream management with caching:
 * - Always requires host and device_id
 * - Auto-fetches on mount when host/device_id changes (only if not cached)
 * - Caches stream URLs per device to prevent duplicate requests
 * - One stream at a time per user
 * - No cleanup functions - React handles lifecycle
 * - Automatically handles HTTP-to-HTTPS proxy conversion
 * - Provides manual refetch function for force refresh
 *
 * Flow: Client → Server → Host → buildStreamUrl(host_info, device_id) → HTTP/HTTPS processing
 */
export const useStream = ({ host, device_id }: UseStreamProps): UseStreamReturn => {
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Cache to track which devices we've already fetched URLs for
  const fetchedDevicesRef = useRef<Set<string>>(new Set());

  // Track the current device to detect changes
  const currentDeviceRef = useRef<string | null>(null);

  const fetchStreamUrl = async (force: boolean = false) => {
    if (!host || !device_id) return;

    const deviceKey = `${host.host_name}-${device_id}`;

    // Skip if we already have a stream URL for this device and not forcing
    if (!force && fetchedDevicesRef.current.has(deviceKey) && streamUrl) {
      console.log(
        `[@hook:useStream] Stream URL already cached for device: ${deviceKey}, skipping fetch`,
      );
      return;
    }

    setIsLoadingUrl(true);
    setUrlError(null);

    try {
      console.log(
        `[@hook:useStream] Fetching stream URL for host: ${host.host_name}, device: ${device_id}`,
      );

      const response = await fetch('/server/av/get-stream-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: host,
          device_id: device_id,
        }),
      });

      const result = await response.json();

      if (result.success && result.stream_url) {
        console.log(`[@hook:useStream] Stream URL received: ${result.stream_url}`);

        // Process stream URL for HTTP-to-HTTPS conversion
        const processedUrl = processStreamUrl(result.stream_url);
        console.log(
          `[@hook:useStream] Stream URL processed: ${result.stream_url} -> ${processedUrl}`,
        );

        setStreamUrl(processedUrl);
        setUrlError(null);

        // Mark this device as fetched
        fetchedDevicesRef.current.add(deviceKey);
      } else {
        const errorMessage = result.error || 'Failed to get stream URL';
        console.error(`[@hook:useStream] Failed to get stream URL:`, errorMessage);
        setUrlError(errorMessage);
        setStreamUrl(null);
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Network error: Failed to communicate with server';
      console.error(`[@hook:useStream] Error getting stream URL:`, error);
      setUrlError(errorMessage);
      setStreamUrl(null);
    } finally {
      setIsLoadingUrl(false);
    }
  };

  // Manual refetch function for force refresh
  const refetchStreamUrl = () => {
    console.log(`[@hook:useStream] Manual refetch requested for device: ${device_id}`);
    fetchStreamUrl(true);
  };

  // Auto-fetch stream URL when host or device_id changes
  useEffect(() => {
    const deviceKey = `${host?.host_name}-${device_id}`;

    // Check if device changed
    if (currentDeviceRef.current !== deviceKey) {
      console.log(
        `[@hook:useStream] Device changed from ${currentDeviceRef.current} to ${deviceKey}`,
      );
      currentDeviceRef.current = deviceKey;

      // Clear current stream URL when switching devices
      if (currentDeviceRef.current !== null) {
        setStreamUrl(null);
        setUrlError(null);
      }

      // Fetch for new device (will check cache internally)
      fetchStreamUrl();
    }
  }, [host, device_id]); // Re-fetch when host or device_id changes

  return {
    streamUrl,
    isLoadingUrl,
    urlError,
    refetchStreamUrl,
  };
};

import { useState, useEffect } from 'react';

import { Host } from '../types/common/Host_Types';

interface UseStreamProps {
  host: Host;
  device_id: string; // Always required - no optional
}

interface UseStreamReturn {
  streamUrl: string | null;
  isLoadingUrl: boolean;
  urlError: string | null;
}

/**
 * Hook for fetching stream URLs from hosts
 *
 * Simple, single-stream management:
 * - Always requires host and device_id
 * - Auto-fetches on mount when host/device_id changes
 * - One stream at a time per user
 * - No cleanup functions - React handles lifecycle
 *
 * Flow: Client → Server → Host → buildStreamUrl(host_info, device_id)
 */
export const useStream = ({ host, device_id }: UseStreamProps): UseStreamReturn => {
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Auto-fetch stream URL when host or device_id changes
  useEffect(() => {
    const fetchStreamUrl = async () => {
      if (!host || !device_id) return;

      setIsLoadingUrl(true);
      setUrlError(null);
      setStreamUrl(null);

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
          setStreamUrl(result.stream_url);
          setUrlError(null);
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

    fetchStreamUrl();
  }, [host, device_id]); // Re-fetch when host or device_id changes

  return {
    streamUrl,
    isLoadingUrl,
    urlError,
  };
};

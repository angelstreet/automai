/**
 * Heatmap Hook
 *
 * This hook handles heatmap data fetching and generation functionality.
 * Manages mosaic image creation from host device captures over last 1 minute.
 */

import { useMemo, useState, useCallback, useRef } from 'react';

export interface HeatmapImage {
  host_name: string;
  device_id: string;
  image_url: string;
  timestamp: string;
  analysis_json: {
    has_audio: boolean;
    has_video: boolean;
    blackscreen: boolean;
    freeze: boolean;
    audio_loss: boolean;
  };
}

export interface HeatmapIncident {
  id: string;
  host_name: string;
  device_id: string;
  incident_type: string;
  start_time: string;
  end_time?: string;
  status: 'active' | 'resolved';
}

export interface HeatmapData {
  hosts_devices: Array<{
    host_name: string;
    device_id: string;
    host_url?: string; // Simplified - removed massive host_data
    description?: string;
  }>;
  images_by_timestamp: Record<string, HeatmapImage[]>; // timestamp -> array of images for that time
  incidents: HeatmapIncident[];
  timeline_timestamps: string[]; // chronologically ordered timestamps
}

export interface HeatmapGeneration {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number; // 0-100
  mosaic_urls?: string[]; // URLs to generated mosaic images (one per timestamp)
  error?: string;
}

// Cache interface for deduplicating requests
interface RequestCache {
  data: HeatmapData | null;
  timestamp: number;
  promise: Promise<HeatmapData> | null;
}

export const useHeatmap = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentGeneration, setCurrentGeneration] = useState<HeatmapGeneration | null>(null);

  // Request cache to prevent duplicate requests
  const requestCache = useRef<RequestCache>({
    data: null,
    timestamp: 0,
    promise: null,
  });

  /**
   * Get heatmap data (last 1 minute images + incidents)
   */
  const getHeatmapData = useMemo(
    () => async (): Promise<HeatmapData> => {
      try {
        // Check cache - use cached data if it's less than 5 seconds old
        const now = Date.now();
        if (requestCache.current.data && now - requestCache.current.timestamp < 5000) {
          console.log('[@hook:useHeatmap:getHeatmapData] Using cached data');
          return requestCache.current.data;
        }

        // If there's already a request in progress, return that promise
        if (requestCache.current.promise) {
          console.log(
            '[@hook:useHeatmap:getHeatmapData] Request already in progress, reusing promise',
          );
          return requestCache.current.promise;
        }

        console.log('[@hook:useHeatmap:getHeatmapData] Fetching heatmap data from server');

        // Create a new promise for the request
        requestCache.current.promise = (async () => {
          const response = await fetch('/server/heatmap/getData');

          console.log('[@hook:useHeatmap:getHeatmapData] Response status:', response.status);

          if (!response.ok) {
            let errorMessage = `Failed to fetch heatmap data: ${response.status} ${response.statusText}`;
            try {
              const errorData = await response.text();
              if (response.headers.get('content-type')?.includes('application/json')) {
                const jsonError = JSON.parse(errorData);
                errorMessage = jsonError.error || errorMessage;
              } else {
                if (errorData.includes('<!doctype') || errorData.includes('<html')) {
                  errorMessage =
                    'Server endpoint not available. Make sure the Flask server is running on the correct port and the proxy is configured properly.';
                }
              }
            } catch {
              console.log('[@hook:useHeatmap:getHeatmapData] Could not parse error response');
            }

            throw new Error(errorMessage);
          }

          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
            throw new Error(
              `Expected JSON response but got ${contentType}. This usually means the Flask server is not running or the proxy is misconfigured.`,
            );
          }

          const data = await response.json();
          console.log(
            `[@hook:useHeatmap:getHeatmapData] Successfully loaded data with ${data.timeline_timestamps?.length || 0} timestamps`,
          );

          // Update cache
          requestCache.current.data = data;
          requestCache.current.timestamp = Date.now();

          return data;
        })();

        // Wait for the promise to resolve
        const result = await requestCache.current.promise;

        // Clear the promise reference
        requestCache.current.promise = null;

        return result;
      } catch (error) {
        console.error('[@hook:useHeatmap:getHeatmapData] Error fetching heatmap data:', error);
        // Clear the promise reference on error
        requestCache.current.promise = null;
        throw error;
      }
    },
    [],
  );

  /**
   * Generate heatmap mosaics (similar to restartStreams in useRec)
   */
  const generateHeatmap = useCallback(async (): Promise<string> => {
    if (isGenerating) {
      console.log('[@hook:useHeatmap:generateHeatmap] Generation already in progress');
      return currentGeneration?.job_id || '';
    }

    setIsGenerating(true);

    try {
      console.log('[@hook:useHeatmap:generateHeatmap] Starting heatmap generation');

      const response = await fetch('/server/heatmap/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timeframe_minutes: 1, // Last 1 minute
        }),
      });

      if (!response.ok) {
        throw new Error(`Generation request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.job_id) {
        const generation: HeatmapGeneration = {
          job_id: result.job_id,
          status: 'pending',
          progress: 0,
        };

        setCurrentGeneration(generation);
        console.log(
          `[@hook:useHeatmap:generateHeatmap] Generation started with job_id: ${result.job_id}`,
        );
        return result.job_id;
      } else {
        throw new Error(result.error || 'Failed to start generation');
      }
    } catch (error) {
      console.error('[@hook:useHeatmap:generateHeatmap] Error starting generation:', error);
      setIsGenerating(false);
      throw error;
    }
  }, [isGenerating, currentGeneration]);

  /**
   * Check generation status
   */
  const checkGenerationStatus = useCallback(async (jobId: string): Promise<HeatmapGeneration> => {
    try {
      const response = await fetch(`/server/heatmap/status/${jobId}`);

      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      const generation: HeatmapGeneration = {
        job_id: jobId,
        status: result.status,
        progress: result.progress,
        mosaic_urls: result.mosaic_urls,
        error: result.error,
      };

      setCurrentGeneration(generation);

      // Update generating state
      if (result.status === 'completed' || result.status === 'failed') {
        setIsGenerating(false);
      }

      return generation;
    } catch (error) {
      console.error('[@hook:useHeatmap:checkGenerationStatus] Error checking status:', error);
      setIsGenerating(false);
      throw error;
    }
  }, []);

  /**
   * Cancel current generation
   */
  const cancelGeneration = useCallback(async (): Promise<void> => {
    if (!currentGeneration?.job_id) {
      return;
    }

    try {
      console.log(
        `[@hook:useHeatmap:cancelGeneration] Cancelling job: ${currentGeneration.job_id}`,
      );

      const response = await fetch(`/server/heatmap/cancel/${currentGeneration.job_id}`, {
        method: 'POST',
      });

      if (response.ok) {
        setIsGenerating(false);
        setCurrentGeneration(null);
        console.log('[@hook:useHeatmap:cancelGeneration] Generation cancelled successfully');
      } else {
        console.error('[@hook:useHeatmap:cancelGeneration] Failed to cancel generation');
      }
    } catch (error) {
      console.error('[@hook:useHeatmap:cancelGeneration] Error cancelling generation:', error);
    }
  }, [currentGeneration]);

  return {
    getHeatmapData,
    generateHeatmap,
    checkGenerationStatus,
    cancelGeneration,
    isGenerating,
    currentGeneration,
  };
};

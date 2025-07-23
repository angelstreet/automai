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
    freeze_details?: {
      frames_compared: string[];
      frame_differences: number[];
      threshold: number;
      comparison_method: string;
    };
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
    host_data?: any; // Put back host_data for now
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
  processing_time?: number; // Processing time in seconds
  heatmap_data?: HeatmapData; // The exact data used for generation
}

export const useHeatmap = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentGeneration, setCurrentGeneration] = useState<HeatmapGeneration | null>(null);

  /**
   * Get heatmap data (last 1 minute images + incidents) - Direct fetch without cache
   */
  const getHeatmapData = useMemo(
    () => async (): Promise<HeatmapData> => {
      try {
        console.log('[@hook:useHeatmap:getHeatmapData] Fetching heatmap data from server');

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

        return data;
      } catch (error) {
        console.error('[@hook:useHeatmap:getHeatmapData] Error fetching heatmap data:', error);
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

        // Store the exact data used for generation in the generation object
        if (result.heatmap_data) {
          generation.heatmap_data = result.heatmap_data;
          console.log('[@hook:useHeatmap:generateHeatmap] Stored heatmap data in generation object');
        }

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
        processing_time: result.processing_time,
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

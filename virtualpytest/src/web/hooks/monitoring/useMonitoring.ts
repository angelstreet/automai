import { useState, useEffect, useCallback } from 'react';
import {
  MonitoringFrame,
  MonitoringAnalysis,
} from '../../components/monitoring/types/MonitoringTypes';

interface UseMonitoringResult {
  frames: MonitoringFrame[];
  isLoading: boolean;
  error: string | null;
  refreshFrames: () => Promise<void>;
}

export function useMonitoring(host?: any, deviceId?: string): UseMonitoringResult {
  const [frames, setFrames] = useState<MonitoringFrame[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshFrames = useCallback(async () => {
    if (!host || !deviceId) {
      console.log('[@hook:useMonitoring] Missing host or deviceId, skipping refresh');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get list of captured images using the same pattern as takeScreenshot
      const response = await fetch('/server/av/listCaptures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: host,
          device_id: deviceId,
          limit: 180, // Last 180 frames (3 minutes at 1fps)
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get capture list');
      }

      console.log(
        `[@hook:useMonitoring] Received ${(data.captures || []).length} captures from server`,
      );
      console.log('[@hook:useMonitoring] First few captures:', (data.captures || []).slice(0, 3));

      // Process each capture file and try to load its JSON metadata
      const monitoringFrames: MonitoringFrame[] = [];

      for (const capture of data.captures || []) {
        const filename = capture.filename;
        const imageUrl = capture.url; // Already built by backend

        console.log(`[@hook:useMonitoring] Processing capture: ${filename}, URL: ${imageUrl}`);

        // Try to load JSON metadata for this capture
        let analysis: MonitoringAnalysis | null = null;

        try {
          // Build JSON URL by replacing .jpg with .json in the image URL
          const jsonUrl = imageUrl.replace('.jpg', '.json');

          const jsonResponse = await fetch(jsonUrl);
          if (jsonResponse.ok) {
            const jsonData = await jsonResponse.json();

            // Extract analysis from JSON file
            if (jsonData.analysis) {
              analysis = {
                blackscreen: jsonData.analysis.blackscreen || false,
                freeze: jsonData.analysis.freeze || false,
                subtitles: jsonData.analysis.subtitles || false,
                errors: jsonData.analysis.errors || false,
                language: jsonData.analysis.language || 'unknown',
                confidence: jsonData.analysis.confidence || 0,
              };
            }
          }
        } catch (jsonError) {
          // JSON file doesn't exist or couldn't be loaded - that's okay
          console.log(`[@hook:useMonitoring] No JSON metadata for ${filename}`);
        }

        monitoringFrames.push({
          filename: filename,
          timestamp: capture.timestamp || Date.now(),
          imageUrl: imageUrl,
          analysis: analysis,
        });
      }

      // Sort by timestamp (newest first)
      monitoringFrames.sort((a, b) => b.timestamp - a.timestamp);

      setFrames(monitoringFrames);
      console.log(`[@hook:useMonitoring] Loaded ${monitoringFrames.length} monitoring frames`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('[@hook:useMonitoring] Error loading frames:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [host, deviceId]);

  // Auto-refresh frames when host/device changes
  useEffect(() => {
    if (host && deviceId) {
      refreshFrames();
    }
  }, [host, deviceId, refreshFrames]);

  // Auto-refresh every 5 seconds to pick up new frames
  useEffect(() => {
    if (host && deviceId) {
      const interval = setInterval(refreshFrames, 5000);
      return () => clearInterval(interval);
    }
  }, [host, deviceId, refreshFrames]);

  return {
    frames,
    isLoading,
    error,
    refreshFrames,
  };
}

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
  analyzeFrame: (filename: string) => Promise<MonitoringAnalysis | null>;
}

export function useMonitoring(
  hostIp?: string,
  hostPort?: string,
  deviceId?: string,
): UseMonitoringResult {
  const [frames, setFrames] = useState<MonitoringFrame[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshFrames = useCallback(async () => {
    if (!hostIp || !deviceId) {
      console.log('[@hook:useMonitoring] Missing hostIp or deviceId, skipping refresh');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use existing image controller to get latest frames from HDMI capture folder
      const response = await fetch('/server/verification/image/getLatestFrames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host_ip: hostIp,
          host_port: hostPort || '5000',
          device_id: deviceId,
          count: 180, // 3 minutes at 1fps
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get frames');
      }

      // Convert to MonitoringFrame format with proper image URLs
      const monitoringFrames: MonitoringFrame[] = data.frames.map((frame: any) => ({
        filename: frame.filename,
        timestamp:
          typeof frame.timestamp === 'string' ? parseInt(frame.timestamp) : frame.timestamp,
        // Use existing image proxy system - build URL on backend
        imageUrl: `/server/av/proxyMonitoringImage/${frame.filename}?host_ip=${hostIp}&host_port=${hostPort || '5000'}&device_id=${deviceId}`,
        analysis: null, // Will be populated when analyzed
      }));

      setFrames(monitoringFrames);
      console.log(`[@hook:useMonitoring] Loaded ${monitoringFrames.length} monitoring frames`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('[@hook:useMonitoring] Error loading frames:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [hostIp, hostPort, deviceId]);

  const analyzeFrame = useCallback(
    async (filename: string): Promise<MonitoringAnalysis | null> => {
      if (!hostIp || !deviceId) {
        console.log('[@hook:useMonitoring] Missing hostIp or deviceId for analysis');
        return null;
      }

      try {
        // Use existing image controller for AI analysis
        const analysisResponse = await fetch('/server/verification/image/analyzeFrame', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            host_ip: hostIp,
            host_port: hostPort || '5000',
            device_id: deviceId,
            filename: filename,
          }),
        });

        if (!analysisResponse.ok) {
          throw new Error(
            `Analysis HTTP ${analysisResponse.status}: ${analysisResponse.statusText}`,
          );
        }

        const analysisData = await analysisResponse.json();

        if (!analysisData.success) {
          throw new Error(analysisData.error || 'Analysis failed');
        }

        const analysis: MonitoringAnalysis = {
          blackscreen: analysisData.analysis.blackscreen || false,
          freeze: analysisData.analysis.freeze || false,
          subtitles: analysisData.analysis.subtitles || false,
          errors: analysisData.analysis.errors || false,
          language: analysisData.analysis.language || 'unknown',
          confidence: analysisData.analysis.confidence || 0,
        };

        // Update the frame with analysis results
        setFrames((prevFrames) =>
          prevFrames.map((frame) => (frame.filename === filename ? { ...frame, analysis } : frame)),
        );

        return analysis;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Analysis error';
        console.error('[@hook:useMonitoring] Error analyzing frame:', errorMessage);
        return null;
      }
    },
    [hostIp, hostPort, deviceId],
  );

  // Auto-refresh frames when host/device changes
  useEffect(() => {
    if (hostIp && deviceId) {
      refreshFrames();
    }
  }, [hostIp, deviceId, refreshFrames]);

  return {
    frames,
    isLoading,
    error,
    refreshFrames,
    analyzeFrame,
  };
}

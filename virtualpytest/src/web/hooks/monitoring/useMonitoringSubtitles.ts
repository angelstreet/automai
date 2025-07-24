import { useState, useCallback, useMemo } from 'react';

import {
  MonitoringAnalysis,
  SubtitleAnalysis,
  SubtitleTrendAnalysis,
} from '../../types/pages/Monitoring_Types';

interface FrameRef {
  timestamp: string;
  imageUrl: string;
  jsonUrl: string;
  analysis?: MonitoringAnalysis | null;
  subtitleAnalysis?: SubtitleAnalysis | null; // Separate subtitle analysis
  subtitleDetectionPerformed?: boolean;
}

interface UseMonitoringSubtitlesReturn {
  // Subtitle detection
  detectSubtitles: () => Promise<void>;
  detectSubtitlesAI: () => Promise<void>;
  isDetectingSubtitles: boolean;
  isDetectingSubtitlesAI: boolean;
  hasSubtitleDetectionResults: boolean;
  // Current subtitle analysis (from backend)
  currentSubtitleAnalysis: SubtitleAnalysis | null;
  // Subtitle trend analysis (computed by frontend)
  subtitleTrendAnalysis: SubtitleTrendAnalysis | null;
}

interface UseMonitoringSubtitlesProps {
  frames: FrameRef[];
  currentIndex: number;
  setFrames: React.Dispatch<React.SetStateAction<FrameRef[]>>;
  setIsPlaying: (playing: boolean) => void;
  setUserSelectedFrame: (selected: boolean) => void;
  host: any;
  device: any;
}

export const useMonitoringSubtitles = ({
  frames,
  currentIndex,
  setFrames,
  setIsPlaying,
  setUserSelectedFrame,
  host,
  device,
}: UseMonitoringSubtitlesProps): UseMonitoringSubtitlesReturn => {
  const [isDetectingSubtitles, setIsDetectingSubtitles] = useState(false);
  const [isDetectingSubtitlesAI, setIsDetectingSubtitlesAI] = useState(false);

  // Check if current frame has subtitle detection results
  const hasSubtitleDetectionResults =
    frames.length > 0 &&
    currentIndex < frames.length &&
    frames[currentIndex]?.subtitleDetectionPerformed === true;

  // Subtitle trend analysis - moved from useMonitoring
  const subtitleTrendAnalysis = useMemo(() => {
    if (frames.length === 0) return null;

    // Get frames with subtitle data
    const framesWithSubtitles = frames.filter(
      (frame) => frame.subtitleAnalysis !== undefined && frame.subtitleDetectionPerformed === true,
    );

    if (framesWithSubtitles.length === 0) return null;

    // Use up to 3 frames for subtitle trend analysis
    const targetFrameCount = Math.min(3, framesWithSubtitles.length);
    const recentFrames = framesWithSubtitles.slice(-targetFrameCount);

    // Check for subtitle presence across frames
    let noSubtitlesCount = 0;
    let currentHasSubtitles = false;

    recentFrames.forEach((frame, index) => {
      const subtitleData = frame.subtitleAnalysis;
      if (!subtitleData) return;

      // Check current frame (most recent)
      if (index === recentFrames.length - 1) {
        currentHasSubtitles = subtitleData.subtitles_detected || false;
      }

      // Count frames without subtitles
      if (!subtitleData.subtitles_detected) {
        noSubtitlesCount++;
      }
    });

    // Red indicator logic:
    // - Show red if ALL analyzed frames have no subtitles
    // - AND we have analyzed at least the target number of frames
    const showRedIndicator =
      noSubtitlesCount === recentFrames.length && recentFrames.length >= targetFrameCount;

    return {
      showRedIndicator,
      currentHasSubtitles,
      framesAnalyzed: recentFrames.length,
      noSubtitlesStreak: noSubtitlesCount,
    };
  }, [frames]);

  // Get current subtitle data
  const currentSubtitleAnalysis = useMemo(() => {
    if (frames.length === 0 || currentIndex >= frames.length) return null;
    const currentFrame = frames[currentIndex];
    return currentFrame?.subtitleAnalysis || null;
  }, [frames, currentIndex]);

  // Subtitle detection function
  const detectSubtitles = useCallback(async () => {
    if (frames.length === 0 || currentIndex >= frames.length || isDetectingSubtitles) {
      return;
    }

    const currentFrame = frames[currentIndex];
    if (!currentFrame) {
      return;
    }

    // Pause the player when detecting subtitles
    setIsPlaying(false);
    setUserSelectedFrame(true);

    setIsDetectingSubtitles(true);

    try {
      console.log('[useMonitoringSubtitles] Detecting subtitles for frame:', currentFrame.imageUrl);

      const response = await fetch('/server/verification/video/detectSubtitles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: host,
          device_id: device?.device_id,
          image_source_url: currentFrame.imageUrl,
          extract_text: true,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[useMonitoringSubtitles] Subtitle detection result:', result);

        if (result.success) {
          // Extract subtitle data from the response
          const responseData = result.results && result.results.length > 0 ? result.results[0] : {};
          const hasSubtitles = result.subtitles_detected || false;
          const extractedText = result.combined_extracted_text || responseData.extracted_text || '';
          const detectedLanguage =
            result.detected_language || responseData.detected_language || undefined;

          // Create subtitle analysis using EXACT backend field names
          const newSubtitleData: SubtitleAnalysis = {
            subtitles_detected: hasSubtitles,
            combined_extracted_text: extractedText,
            detected_language: detectedLanguage !== 'unknown' ? detectedLanguage : undefined,
            confidence: responseData.confidence || (hasSubtitles ? 0.9 : 0.1),
          };

          // Update the frame's subtitle data and mark subtitle detection as performed
          setFrames((prev) =>
            prev.map((frame, index) =>
              index === currentIndex
                ? { ...frame, subtitleAnalysis: newSubtitleData, subtitleDetectionPerformed: true }
                : frame,
            ),
          );

          console.log(
            '[useMonitoringSubtitles] Updated frame with subtitle data:',
            newSubtitleData,
          );
        } else {
          console.error('[useMonitoringSubtitles] Subtitle detection failed:', result.error);
        }
      } else {
        console.error(
          '[useMonitoringSubtitles] Subtitle detection request failed:',
          response.status,
        );
      }
    } catch (error) {
      console.error('[useMonitoringSubtitles] Subtitle detection error:', error);
    } finally {
      setIsDetectingSubtitles(false);
    }
  }, [
    frames,
    currentIndex,
    isDetectingSubtitles,
    host,
    device?.device_id,
    setFrames,
    setIsPlaying,
    setUserSelectedFrame,
  ]);

  // AI Subtitle detection function
  const detectSubtitlesAI = useCallback(async () => {
    if (frames.length === 0 || currentIndex >= frames.length || isDetectingSubtitlesAI) {
      return;
    }

    const currentFrame = frames[currentIndex];
    if (!currentFrame) {
      return;
    }

    // Pause the player when detecting subtitles
    setIsPlaying(false);
    setUserSelectedFrame(true);

    setIsDetectingSubtitlesAI(true);

    try {
      console.log(
        '[useMonitoringSubtitles] Detecting AI subtitles for frame:',
        currentFrame.imageUrl,
      );

      const response = await fetch('/server/verification/video/detectSubtitlesAI', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: host,
          device_id: device?.device_id,
          image_source_url: currentFrame.imageUrl,
          extract_text: true,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[useMonitoringSubtitles] AI Subtitle detection result:', result);

        if (result.success) {
          // Extract subtitle data from the response
          const responseData = result.results && result.results.length > 0 ? result.results[0] : {};
          const hasSubtitles = result.subtitles_detected || false;
          const extractedText = result.combined_extracted_text || responseData.extracted_text || '';
          const detectedLanguage =
            result.detected_language || responseData.detected_language || undefined;

          // Create subtitle analysis using EXACT backend field names
          const newSubtitleData: SubtitleAnalysis = {
            subtitles_detected: hasSubtitles,
            combined_extracted_text: extractedText,
            detected_language: detectedLanguage !== 'unknown' ? detectedLanguage : undefined,
            confidence: responseData.confidence || (hasSubtitles ? 0.9 : 0.1),
          };

          // Update the frame's subtitle data and mark subtitle detection as performed
          setFrames((prev) =>
            prev.map((frame, index) =>
              index === currentIndex
                ? { ...frame, subtitleAnalysis: newSubtitleData, subtitleDetectionPerformed: true }
                : frame,
            ),
          );

          console.log(
            '[useMonitoringSubtitles] Updated frame with AI subtitle data:',
            newSubtitleData,
          );
        } else {
          console.error('[useMonitoringSubtitles] AI Subtitle detection failed:', result.error);
        }
      } else {
        console.error(
          '[useMonitoringSubtitles] AI Subtitle detection request failed:',
          response.status,
        );
      }
    } catch (error) {
      console.error('[useMonitoringSubtitles] AI Subtitle detection error:', error);
    } finally {
      setIsDetectingSubtitlesAI(false);
    }
  }, [
    frames,
    currentIndex,
    isDetectingSubtitlesAI,
    host,
    device?.device_id,
    setFrames,
    setIsPlaying,
    setUserSelectedFrame,
  ]);

  return {
    detectSubtitles,
    detectSubtitlesAI,
    isDetectingSubtitles,
    isDetectingSubtitlesAI,
    hasSubtitleDetectionResults,
    subtitleTrendAnalysis,
    currentSubtitleAnalysis,
  };
};

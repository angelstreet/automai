import { useState, useCallback } from 'react';

interface MonitoringAnalysis {
  blackscreen: boolean;
  freeze: boolean;
  subtitles: boolean;
  subtitles_trend?: {
    current: boolean;
    last_3_frames: boolean[];
    count_in_last_3: number;
    no_subtitles_for_3_frames: boolean;
  };
  errors: boolean;
  text: string;
  language?: string;
  confidence: number;
}

interface FrameRef {
  timestamp: string;
  imageUrl: string;
  jsonUrl: string;
  analysis?: MonitoringAnalysis | null;
  subtitleDetectionPerformed?: boolean;
}

interface UseMonitoringSubtitlesReturn {
  // Subtitle detection
  detectSubtitles: () => Promise<void>;
  detectSubtitlesAI: () => Promise<void>;
  isDetectingSubtitles: boolean;
  isDetectingSubtitlesAI: boolean;
  hasSubtitleDetectionResults: boolean;
}

interface UseMonitoringSubtitlesProps {
  frames: FrameRef[];
  currentIndex: number;
  selectedFrameAnalysis: MonitoringAnalysis | null;
  setSelectedFrameAnalysis: (analysis: MonitoringAnalysis | null) => void;
  setFrames: React.Dispatch<React.SetStateAction<FrameRef[]>>;
  setIsPlaying: (playing: boolean) => void;
  setUserSelectedFrame: (selected: boolean) => void;
  host: any;
  device: any;
}

export const useMonitoringSubtitles = ({
  frames,
  currentIndex,
  selectedFrameAnalysis,
  setSelectedFrameAnalysis,
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
          const subtitleData = result.results && result.results.length > 0 ? result.results[0] : {};
          const hasSubtitles = result.subtitles_detected || false;
          const extractedText = result.combined_extracted_text || subtitleData.extracted_text || '';
          const detectedLanguage =
            result.detected_language || subtitleData.detected_language || undefined;

          // Update the selectedFrameAnalysis with the detected subtitle data
          const updatedAnalysis: MonitoringAnalysis = {
            ...selectedFrameAnalysis,
            blackscreen: selectedFrameAnalysis?.blackscreen || false,
            freeze: selectedFrameAnalysis?.freeze || false,
            subtitles: hasSubtitles,
            errors: selectedFrameAnalysis?.errors || false,
            text: extractedText,
            language: detectedLanguage !== 'unknown' ? detectedLanguage : undefined,
            confidence: subtitleData.confidence || (hasSubtitles ? 0.9 : 0.1),
          };

          setSelectedFrameAnalysis(updatedAnalysis);

          // Update the frame's cached analysis and mark subtitle detection as performed
          setFrames((prev) =>
            prev.map((frame, index) =>
              index === currentIndex
                ? { ...frame, analysis: updatedAnalysis, subtitleDetectionPerformed: true }
                : frame,
            ),
          );

          console.log(
            '[useMonitoringSubtitles] Updated frame analysis with subtitle data:',
            updatedAnalysis,
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
    selectedFrameAnalysis,
    isDetectingSubtitles,
    host,
    device?.device_id,
    setSelectedFrameAnalysis,
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
          const subtitleData = result.results && result.results.length > 0 ? result.results[0] : {};
          const hasSubtitles = result.subtitles_detected || false;
          const extractedText = result.combined_extracted_text || subtitleData.extracted_text || '';
          const detectedLanguage =
            result.detected_language || subtitleData.detected_language || undefined;

          // Update the selectedFrameAnalysis with the detected subtitle data
          const updatedAnalysis: MonitoringAnalysis = {
            ...selectedFrameAnalysis,
            blackscreen: selectedFrameAnalysis?.blackscreen || false,
            freeze: selectedFrameAnalysis?.freeze || false,
            subtitles: hasSubtitles,
            errors: selectedFrameAnalysis?.errors || false,
            text: extractedText,
            language: detectedLanguage !== 'unknown' ? detectedLanguage : undefined,
            confidence: subtitleData.confidence || (hasSubtitles ? 0.9 : 0.1),
          };

          setSelectedFrameAnalysis(updatedAnalysis);

          // Update the frame's cached analysis and mark subtitle detection as performed
          setFrames((prev) =>
            prev.map((frame, index) =>
              index === currentIndex
                ? { ...frame, analysis: updatedAnalysis, subtitleDetectionPerformed: true }
                : frame,
            ),
          );

          console.log(
            '[useMonitoringSubtitles] Updated frame analysis with AI subtitle data:',
            updatedAnalysis,
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
    selectedFrameAnalysis,
    isDetectingSubtitlesAI,
    host,
    device?.device_id,
    setSelectedFrameAnalysis,
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
  };
};

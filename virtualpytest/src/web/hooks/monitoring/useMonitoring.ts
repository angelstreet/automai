import { useState, useEffect, useCallback, useMemo } from 'react';

interface FrameRef {
  timestamp: string;
  imageUrl: string;
  jsonUrl: string;
  analysis?: MonitoringAnalysis | null;
  subtitleDetectionPerformed?: boolean; // Flag to track if manual subtitle detection was done
}

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

interface ErrorTrendData {
  blackscreenConsecutive: number;
  freezeConsecutive: number;
  hasWarning: boolean;
  hasError: boolean;
}

interface UseMonitoringReturn {
  // Frame management
  frames: FrameRef[];
  currentIndex: number;
  currentFrameUrl: string;
  selectedFrameAnalysis: MonitoringAnalysis | null;
  isHistoricalFrameLoaded: boolean;

  // Playback controls
  isPlaying: boolean;
  userSelectedFrame: boolean;

  // Actions
  handlePlayPause: () => void;
  handleSliderChange: (event: Event, newValue: number | number[]) => void;
  handleHistoricalFrameLoad: () => void;

  // Subtitle detection
  detectSubtitles: () => Promise<void>;
  isDetectingSubtitles: boolean;
  hasSubtitleDetectionResults: boolean; // Whether current frame has subtitle detection results

  // Subtitle trend analysis
  subtitleTrendData: {
    showRedIndicator: boolean;
    currentHasSubtitles: boolean;
    framesAnalyzed: number;
    noSubtitlesStreak: number;
  } | null;

  // Error trend analysis
  errorTrendData: ErrorTrendData | null;
}

interface UseMonitoringProps {
  host: any; // Host object for API requests
  device: any; // Device object for API requests
  baseUrlPattern?: string; // Base URL pattern from useRec - optional
}

export const useMonitoring = ({
  host,
  device,
  baseUrlPattern,
}: UseMonitoringProps): UseMonitoringReturn => {
  const [frames, setFrames] = useState<FrameRef[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('');
  const [userSelectedFrame, setUserSelectedFrame] = useState(false);
  const [selectedFrameAnalysis, setSelectedFrameAnalysis] = useState<MonitoringAnalysis | null>(
    null,
  );
  const [isHistoricalFrameLoaded, setIsHistoricalFrameLoaded] = useState(false);
  const [isDetectingSubtitles, setIsDetectingSubtitles] = useState(false);

  // Generate monitoring URL (same as useRec pattern)
  const generateMonitoringUrl = useCallback((): string => {
    if (!baseUrlPattern) {
      console.warn('[useMonitoring] No baseUrlPattern provided, monitoring disabled');
      return '';
    }

    // Generate current timestamp in YYYYMMDDHHMMSS format (same as useRec)
    const now = new Date();
    const timestamp =
      now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0') +
      now.getHours().toString().padStart(2, '0') +
      now.getMinutes().toString().padStart(2, '0') +
      now.getSeconds().toString().padStart(2, '0');

    // Replace {timestamp} placeholder in pattern (not existing timestamp digits)
    return baseUrlPattern.replace('{timestamp}', timestamp);
  }, [baseUrlPattern]);

  // Generate monitoring frames
  useEffect(() => {
    const generateFrame = () => {
      const newImageUrl = generateMonitoringUrl();

      if (newImageUrl && newImageUrl !== currentImageUrl) {
        setCurrentImageUrl(newImageUrl);

        // Extract timestamp from the generated URL
        const timestampMatch = newImageUrl.match(/capture_(\d{14})/);
        if (timestampMatch) {
          const timestamp = timestampMatch[1];

          // Generate JSON URL - monitoring needs original filename + _thumbnail.json
          const jsonUrl = newImageUrl.replace('.jpg', '_thumbnail.json');

          // Add 300ms delay to allow image to be captured and available
          setTimeout(() => {
            setFrames((prev) => {
              const newFrames = [...prev, { timestamp, imageUrl: newImageUrl, jsonUrl }];
              const updatedFrames = newFrames.slice(-50); // Always keep last 50 frames

              // ONLY auto-follow when actively playing
              if (isPlaying && !userSelectedFrame) {
                setCurrentIndex(updatedFrames.length - 1);
              }
              // ONLY move user if their selected frame was deleted from buffer
              else if (userSelectedFrame) {
                const currentFrameStillExists = currentIndex < updatedFrames.length;
                if (!currentFrameStillExists) {
                  // Frame was deleted, move to newest and resume playing
                  setCurrentIndex(updatedFrames.length - 1);
                  setIsPlaying(true); // Resume playing since we had to move
                  setUserSelectedFrame(false); // No longer user-selected
                }
                // Otherwise: DO NOTHING - stay on selected frame
              }

              return updatedFrames;
            });
          }, 300);
        }
      }
    };

    // Generate initial frame immediately
    generateFrame();

    // Set up interval for continuous monitoring
    const interval = setInterval(generateFrame, 3000); // Generate every 3 seconds
    return () => clearInterval(interval);
  }, [
    currentImageUrl,
    generateMonitoringUrl,
    isPlaying,
    userSelectedFrame,
    baseUrlPattern,
    currentIndex,
  ]);

  // Auto-play functionality
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && frames.length > 1 && !userSelectedFrame) {
      interval = setInterval(() => {
        setCurrentIndex((prev) => {
          const next = prev + 1;
          if (next >= frames.length) {
            // Stay on latest frame when we reach the end
            return frames.length - 1;
          }
          return next;
        });
      }, 2000); // 2 seconds per frame
    }
    return () => clearInterval(interval);
  }, [isPlaying, frames.length, userSelectedFrame]);

  // Load analysis for selected frame
  useEffect(() => {
    const loadSelectedFrameAnalysis = async () => {
      if (frames.length === 0 || currentIndex >= frames.length) {
        setSelectedFrameAnalysis(null);
        return;
      }

      const selectedFrame = frames[currentIndex];
      if (!selectedFrame) {
        setSelectedFrameAnalysis(null);
        return;
      }

      // If we already have analysis data (including null from failed load), use it
      if (selectedFrame.hasOwnProperty('analysis')) {
        setSelectedFrameAnalysis(selectedFrame.analysis || null);
        return;
      }

      // Add 600ms delay before fetching JSON to ensure analysis is complete
      // (Total delay: 300ms for image + 600ms for JSON = 900ms from capture)
      setTimeout(async () => {
        // Load analysis for this frame
        try {
          const response = await fetch(selectedFrame.jsonUrl);
          if (response.ok) {
            const data = await response.json();
            const analysis = data.analysis || null;

            // Cache the analysis in the frame reference
            setFrames((prev) =>
              prev.map((frame, index) => (index === currentIndex ? { ...frame, analysis } : frame)),
            );

            setSelectedFrameAnalysis(analysis);
          } else {
            // Cache the failed load as null to avoid repeated attempts
            setFrames((prev) =>
              prev.map((frame, index) =>
                index === currentIndex ? { ...frame, analysis: null } : frame,
              ),
            );
            setSelectedFrameAnalysis(null);
          }
        } catch {
          // Cache the failed load as null to avoid repeated attempts
          setFrames((prev) =>
            prev.map((frame, index) =>
              index === currentIndex ? { ...frame, analysis: null } : frame,
            ),
          );
          setSelectedFrameAnalysis(null);
        }
      }, 600);
    };

    loadSelectedFrameAnalysis();
  }, [currentIndex, frames]);

  // Error trend analysis - track consecutive blackscreen and freeze errors
  const errorTrendData = useMemo((): ErrorTrendData | null => {
    if (frames.length === 0) return null;

    // Get frames with analysis data loaded (recent frames for trend analysis)
    const framesWithAnalysis = frames.filter((frame) => frame.analysis !== undefined);

    if (framesWithAnalysis.length === 0) return null;

    // Analyze up to the last 10 frames for error trends
    const recentFrames = framesWithAnalysis.slice(-10);

    let blackscreenConsecutive = 0;
    let freezeConsecutive = 0;

    // Count consecutive errors from the end (most recent frames)
    for (let i = recentFrames.length - 1; i >= 0; i--) {
      const analysis = recentFrames[i].analysis;
      if (!analysis) break;

      // Count consecutive blackscreen errors
      if (analysis.blackscreen) {
        blackscreenConsecutive++;
      } else if (blackscreenConsecutive > 0) {
        // Stop counting if we hit a non-error frame
        break;
      }

      // Count consecutive freeze errors
      if (analysis.freeze) {
        freezeConsecutive++;
      } else if (freezeConsecutive > 0) {
        // Stop counting if we hit a non-error frame
        break;
      }

      // If neither error is present, stop the consecutive count
      if (!analysis.blackscreen && !analysis.freeze) {
        break;
      }
    }

    // Determine warning/error states
    const maxConsecutive = Math.max(blackscreenConsecutive, freezeConsecutive);
    const hasWarning = maxConsecutive >= 1 && maxConsecutive < 3;
    const hasError = maxConsecutive >= 3;

    console.log('[useMonitoring] Error trend analysis:', {
      blackscreenConsecutive,
      freezeConsecutive,
      maxConsecutive,
      hasWarning,
      hasError,
      framesAnalyzed: recentFrames.length,
    });

    return {
      blackscreenConsecutive,
      freezeConsecutive,
      hasWarning,
      hasError,
    };
  }, [frames]);

  // Subtitle trend analysis - using adaptive frame count
  const subtitleTrendData = useMemo(() => {
    if (frames.length === 0) return null;

    // Get frames with analysis data loaded
    const framesWithAnalysis = frames.filter((frame) => frame.analysis !== undefined);

    if (framesWithAnalysis.length === 0) return null;

    // Adaptive frame count based on available data:
    // - If we have cache (script analysis with subtitle_trend), use up to 5 frames
    // - If no cache (only current frame analysis), use up to 3 frames
    let targetFrameCount = 3; // Default minimum
    const latestFrame = framesWithAnalysis[framesWithAnalysis.length - 1];

    if (latestFrame?.analysis?.subtitles_trend) {
      // We have enhanced analysis with multi-frame data
      targetFrameCount = Math.min(5, framesWithAnalysis.length);
    } else {
      // We only have current frame analysis
      targetFrameCount = Math.min(3, framesWithAnalysis.length);
    }

    // Get the most recent frames for analysis
    const recentFrames = framesWithAnalysis.slice(-targetFrameCount);

    // Check for subtitle presence across frames
    let noSubtitlesCount = 0;
    let currentHasSubtitles = false;

    recentFrames.forEach((frame, index) => {
      const analysis = frame.analysis;
      if (!analysis) return;

      // Check current frame (most recent)
      if (index === recentFrames.length - 1) {
        currentHasSubtitles = analysis.subtitles || false;
      }

      // Count frames without subtitles
      if (!analysis.subtitles) {
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

  // Handlers
  const handlePlayPause = useCallback(() => {
    if (!isPlaying) {
      // When starting play, reset to follow new images automatically
      setUserSelectedFrame(false);
      setCurrentIndex(frames.length - 1);
    } else {
      // When pausing, mark as user-selected to stop auto-following
      setUserSelectedFrame(true);
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, frames.length]);

  const handleSliderChange = useCallback((_event: Event, newValue: number | number[]) => {
    const index = newValue as number;
    setCurrentIndex(index);
    setIsPlaying(false);
    setUserSelectedFrame(true); // Mark as manually selected
    setIsHistoricalFrameLoaded(false); // Reset loading state when changing frames
  }, []);

  const handleHistoricalFrameLoad = useCallback(() => {
    setIsHistoricalFrameLoaded(true);
  }, []);

  // Reset loading state when current frame changes
  useEffect(() => {
    setIsHistoricalFrameLoaded(false);
  }, [currentIndex]);

  // Get current frame URL for display
  const currentFrameUrl = frames[currentIndex]?.imageUrl || '';

  // Check if current frame has subtitle detection results
  const hasSubtitleDetectionResults = useMemo(() => {
    if (frames.length === 0 || currentIndex >= frames.length) return false;
    const currentFrame = frames[currentIndex];
    const hasResults = currentFrame?.subtitleDetectionPerformed === true;

    if (hasResults) {
      console.log('[useMonitoring] Frame has cached subtitle results:', {
        frameIndex: currentIndex,
        timestamp: currentFrame?.timestamp,
        subtitles: currentFrame?.analysis?.subtitles,
        textLength: currentFrame?.analysis?.text?.length || 0,
      });
    }

    return hasResults;
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
      console.log('[useMonitoring] Detecting subtitles for frame:', currentFrame.imageUrl);

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
        console.log('[useMonitoring] Subtitle detection result:', result);

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
            '[useMonitoring] Updated frame analysis with subtitle data:',
            updatedAnalysis,
          );
          console.log('[useMonitoring] Cached subtitle results for frame:', {
            frameIndex: currentIndex,
            timestamp: currentFrame.timestamp,
          });
        } else {
          console.error('[useMonitoring] Subtitle detection failed:', result.error);
        }
      } else {
        console.error('[useMonitoring] Subtitle detection request failed:', response.status);
      }
    } catch (error) {
      console.error('[useMonitoring] Subtitle detection error:', error);
    } finally {
      setIsDetectingSubtitles(false);
    }
  }, [frames, currentIndex, selectedFrameAnalysis, isDetectingSubtitles, host, device?.device_id]);

  return {
    // Frame management
    frames,
    currentIndex,
    currentFrameUrl,
    selectedFrameAnalysis,
    isHistoricalFrameLoaded,

    // Playback controls
    isPlaying,
    userSelectedFrame,

    // Actions
    handlePlayPause,
    handleSliderChange,
    handleHistoricalFrameLoad,

    // Subtitle detection
    detectSubtitles,
    isDetectingSubtitles,
    hasSubtitleDetectionResults,

    // Subtitle trend analysis
    subtitleTrendData,

    // Error trend analysis
    errorTrendData,
  };
};

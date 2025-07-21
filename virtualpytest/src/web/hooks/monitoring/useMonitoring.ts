import { useState, useEffect, useCallback, useMemo } from 'react';

import { useMonitoringAI } from './useMonitoringAI';
import { useMonitoringSubtitles } from './useMonitoringSubtitles';

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
  audio?: {
    has_audio: boolean;
    volume_percentage: number;
  };
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
  detectSubtitlesAI: () => Promise<void>;
  isDetectingSubtitles: boolean;
  isDetectingSubtitlesAI: boolean;
  hasSubtitleDetectionResults: boolean; // Whether current frame has subtitle detection results

  // AI Query functionality
  isAIQueryVisible: boolean;
  aiQuery: string;
  aiResponse: string;
  isProcessingAIQuery: boolean;
  toggleAIPanel: () => void;
  submitAIQuery: () => Promise<void>;
  clearAIQuery: () => void;
  handleAIQueryChange: (query: string) => void;

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

  // Use dedicated hooks for subtitle detection
  const subtitleHook = useMonitoringSubtitles({
    frames,
    currentIndex,
    selectedFrameAnalysis,
    setSelectedFrameAnalysis,
    setFrames,
    setIsPlaying,
    setUserSelectedFrame,
    host,
    device,
  });

  // Use dedicated hook for AI functionality
  const aiHook = useMonitoringAI({
    frames,
    currentIndex,
    setIsPlaying,
    setUserSelectedFrame,
    host,
    device,
  });

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

          // Generate JSON URL - frame analysis creates regular .json files
          const jsonUrl = newImageUrl.replace('_thumbnail.jpg', '.json');

          // Add 300ms delay to allow image to be captured and available
          setTimeout(() => {
            setFrames((prev) => {
              const newFrames = [...prev, { timestamp, imageUrl: newImageUrl, jsonUrl }];
              const updatedFrames = newFrames.slice(-100); // Always keep last 100 frames

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
          console.log('[useMonitoring] Loading frame analysis:', selectedFrame.jsonUrl);
          const response = await fetch(selectedFrame.jsonUrl);
          let analysis = null;

          if (response.ok) {
            const data = await response.json();
            analysis = data.analysis || null;
            console.log('[useMonitoring] Frame analysis loaded successfully:', analysis);
          } else {
            console.log(
              '[useMonitoring] Frame analysis failed:',
              response.status,
              response.statusText,
            );
          }

          // Try to load audio data - preserve existing audio data if file not found
          try {
            // Use exact same format: capture_YYYYMMDDHHMMSS_audio.json (in captures folder)
            const audioUrl = selectedFrame.jsonUrl.replace('.json', '_audio.json');
            console.log('[useMonitoring] Attempting to load audio from:', audioUrl);
            const audioResponse = await fetch(audioUrl);

            if (audioResponse.ok) {
              const audioData = await audioResponse.json();
              console.log('[useMonitoring] Audio response data:', audioData);

              if (audioData.audio_analysis) {
                // Initialize analysis object if it doesn't exist
                if (!analysis) {
                  analysis = {};
                  console.log('[useMonitoring] Created new analysis object for audio data');
                }
                analysis.audio = {
                  has_audio: audioData.audio_analysis.has_audio,
                  volume_percentage: audioData.audio_analysis.volume_percentage,
                };
                console.log('[useMonitoring] Audio analysis loaded successfully:', analysis.audio);
              } else {
                console.log('[useMonitoring] Audio data missing audio_analysis field');
              }
            } else {
              console.log(
                '[useMonitoring] Audio request failed:',
                audioResponse.status,
                audioResponse.statusText,
              );
              // Audio file not found - preserve previous audio data if available
              const currentFrameWithAudio = frames.find(
                (frame, index) => index < currentIndex && frame.analysis?.audio,
              );
              if (currentFrameWithAudio?.analysis?.audio) {
                // Initialize analysis object if it doesn't exist
                if (!analysis) {
                  analysis = {};
                }
                analysis.audio = currentFrameWithAudio.analysis.audio;
                console.log('[useMonitoring] Using previous audio data:', analysis.audio);
              } else {
                console.log('[useMonitoring] No previous audio data found');
              }
            }
          } catch (audioError) {
            console.log('[useMonitoring] Audio loading error:', audioError);
            // Audio loading failed - preserve previous audio data if available
            const currentFrameWithAudio = frames.find(
              (frame, index) => index < currentIndex && frame.analysis?.audio,
            );
            if (currentFrameWithAudio?.analysis?.audio) {
              // Initialize analysis object if it doesn't exist
              if (!analysis) {
                analysis = {};
              }
              analysis.audio = currentFrameWithAudio.analysis.audio;
              console.log('[useMonitoring] Using previous audio data after error:', analysis.audio);
            } else {
              console.log('[useMonitoring] No previous audio data found after error');
            }
          }

          // Cache the analysis in the frame reference
          setFrames((prev) =>
            prev.map((frame, index) => (index === currentIndex ? { ...frame, analysis } : frame)),
          );

          setSelectedFrameAnalysis(analysis);
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

    // Subtitle detection (from dedicated hook)
    detectSubtitles: subtitleHook.detectSubtitles,
    detectSubtitlesAI: subtitleHook.detectSubtitlesAI,
    isDetectingSubtitles: subtitleHook.isDetectingSubtitles,
    isDetectingSubtitlesAI: subtitleHook.isDetectingSubtitlesAI,
    hasSubtitleDetectionResults: subtitleHook.hasSubtitleDetectionResults,

    // AI Query functionality (from dedicated hook)
    isAIQueryVisible: aiHook.isAIQueryVisible,
    aiQuery: aiHook.aiQuery,
    aiResponse: aiHook.aiResponse,
    isProcessingAIQuery: aiHook.isProcessingAIQuery,
    toggleAIPanel: aiHook.toggleAIPanel,
    submitAIQuery: aiHook.submitAIQuery,
    clearAIQuery: aiHook.clearAIQuery,
    handleAIQueryChange: aiHook.handleAIQueryChange,

    // Subtitle trend analysis
    subtitleTrendData,

    // Error trend analysis
    errorTrendData,
  };
};

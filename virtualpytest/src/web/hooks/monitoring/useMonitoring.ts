import { useState, useEffect, useCallback, useMemo } from 'react';

import {
  MonitoringAnalysis,
  SubtitleAnalysis,
  SubtitleTrendAnalysis,
} from '../../types/pages/Monitoring_Types';

import { useMonitoringAI } from './useMonitoringAI';
import { useMonitoringSubtitles } from './useMonitoringSubtitles';

interface FrameRef {
  timestamp: string;
  imageUrl: string;
  jsonUrl: string;
  analysis?: MonitoringAnalysis | null;
  subtitleDetectionPerformed?: boolean; // Flag to track if manual subtitle detection was done
}

interface ErrorTrendData {
  blackscreenConsecutive: number;
  freezeConsecutive: number;
  audioLossConsecutive: number;
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
  isInitialLoading: boolean;

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
  subtitleTrendAnalysis: SubtitleTrendAnalysis | null;

  // Error trend analysis
  errorTrendData: ErrorTrendData | null;

  // Current subtitle analysis for components that need subtitle data
  currentSubtitleAnalysis: SubtitleAnalysis | null;
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
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Initial loading buffer - increased to account for processing time
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 5000); // Increased to 5 seconds - backend needs ~4-5 seconds total processing time
    return () => clearTimeout(timer);
  }, []);

  // Use dedicated hooks for subtitle detection
  const subtitleHook = useMonitoringSubtitles({
    frames,
    currentIndex,
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

  // Generate monitoring URL with 3-second delay and mechanical fallback
  const generateMonitoringUrl = useCallback((): string => {
    if (!baseUrlPattern) {
      console.warn('[useMonitoring] No baseUrlPattern provided, monitoring disabled');
      return '';
    }

    // Generate timestamp for 5 seconds ago to ensure analysis exists
    const now = new Date();
    const delayedTime = new Date(now.getTime() - 5000); // Increased to 5 second delay

    const timestamp =
      delayedTime.getFullYear().toString() +
      (delayedTime.getMonth() + 1).toString().padStart(2, '0') +
      delayedTime.getDate().toString().padStart(2, '0') +
      delayedTime.getHours().toString().padStart(2, '0') +
      delayedTime.getMinutes().toString().padStart(2, '0') +
      delayedTime.getSeconds().toString().padStart(2, '0');

    // Replace {timestamp} placeholder in pattern
    return baseUrlPattern.replace('{timestamp}', timestamp);
  }, [baseUrlPattern]);

  // Generate monitoring frames (only after initial loading)
  useEffect(() => {
    if (isInitialLoading) return; // Skip during initial loading

    const generateFrame = () => {
      const newImageUrl = generateMonitoringUrl();

      if (newImageUrl && newImageUrl !== currentImageUrl) {
        setCurrentImageUrl(newImageUrl);

        // Extract timestamp from the generated URL
        const timestampMatch = newImageUrl.match(/capture_(\d{14})/);
        if (timestampMatch) {
          const timestamp = timestampMatch[1];

          // Generate JSON URL - frame analysis creates regular .json files
          console.log('[useMonitoring] Generated image URL:', newImageUrl);
          const jsonUrl = newImageUrl.replace('.jpg', '.json');
          console.log('[useMonitoring] Generated JSON URL:', jsonUrl);

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
    isInitialLoading,
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
          console.log('[useMonitoring] Loading analysis:', selectedFrame.jsonUrl);
          const response = await fetch(selectedFrame.jsonUrl);
          let analysis = null;

          if (response.ok) {
            const data = await response.json();

            analysis = {
              timestamp: data.timestamp || '',
              filename: data.filename || '',
              thumbnail: data.thumbnail || '',
              blackscreen: data.blackscreen || false,
              blackscreen_percentage: data.blackscreen_percentage || 0,
              freeze: data.freeze || false,
              freeze_diffs: data.freeze_diffs || [],
              last_3_filenames: data.last_3_filenames || [],
              last_3_thumbnails: data.last_3_thumbnails || [],
              audio: data.audio || false,
              volume_percentage: data.volume_percentage || 0,
              mean_volume_db: data.mean_volume_db || -100,
            };

            console.log('[useMonitoring] Analysis loaded:', analysis);
          } else {
            console.log('[useMonitoring] Analysis failed:', response.status, response.statusText);

            // Use previous data if available
            const previousFrame = frames.find(
              (frame, index) => index < currentIndex && frame.analysis,
            );
            analysis = previousFrame?.analysis || null;
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
    let audioLossConsecutive = 0;

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

      // Count consecutive audio loss errors (no audio detected)
      if (!analysis.audio) {
        audioLossConsecutive++;
      } else if (audioLossConsecutive > 0) {
        // Stop counting if we hit a non-error frame
        break;
      }

      // If no errors are present, stop the consecutive count
      if (!analysis.blackscreen && !analysis.freeze && analysis.audio) {
        break;
      }
    }

    // Determine warning/error states
    const maxConsecutive = Math.max(
      blackscreenConsecutive,
      freezeConsecutive,
      audioLossConsecutive,
    );
    const hasWarning = maxConsecutive >= 1 && maxConsecutive < 3;
    const hasError = maxConsecutive >= 3;

    console.log('[useMonitoring] Error trend analysis:', {
      blackscreenConsecutive,
      freezeConsecutive,
      audioLossConsecutive,
      maxConsecutive,
      hasWarning,
      hasError,
      framesAnalyzed: recentFrames.length,
    });

    return {
      blackscreenConsecutive,
      freezeConsecutive,
      audioLossConsecutive,
      hasWarning,
      hasError,
    };
  }, [frames]);

  // Subtitle trend analysis moved to useMonitoringSubtitles
  const subtitleTrendAnalysis = subtitleHook.subtitleTrendAnalysis;

  // Get current subtitle analysis from the subtitle hook
  const currentSubtitleAnalysis = subtitleHook.currentSubtitleAnalysis;

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
    isInitialLoading,

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
    subtitleTrendAnalysis,

    // Error trend analysis
    errorTrendData,

    // Current subtitle analysis for components that need subtitle data
    currentSubtitleAnalysis,
  };
};

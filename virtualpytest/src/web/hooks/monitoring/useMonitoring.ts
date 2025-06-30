import { useState, useEffect, useCallback, useMemo } from 'react';

interface FrameRef {
  timestamp: string;
  imageUrl: string;
  jsonUrl: string;
  analysis?: MonitoringAnalysis | null;
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
  language: string;
  confidence: number;
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

  // Subtitle trend analysis
  subtitleTrendData: {
    showRedIndicator: boolean;
    currentHasSubtitles: boolean;
    framesAnalyzed: number;
    noSubtitlesStreak: number;
  } | null;
}

export const useMonitoring = (): UseMonitoringReturn => {
  const [frames, setFrames] = useState<FrameRef[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('');
  const [userSelectedFrame, setUserSelectedFrame] = useState(false);
  const [selectedFrameAnalysis, setSelectedFrameAnalysis] = useState<MonitoringAnalysis | null>(
    null,
  );
  const [isHistoricalFrameLoaded, setIsHistoricalFrameLoaded] = useState(false);

  // Monitor RecHostPreview for new images
  useEffect(() => {
    const detectImageUrl = () => {
      const imgElement = document.querySelector('[alt="Current screenshot"]') as HTMLImageElement;
      if (imgElement && imgElement.src && imgElement.src !== currentImageUrl) {
        const newImageUrl = imgElement.src;
        setCurrentImageUrl(newImageUrl);

        // Extract timestamp and create frame reference
        const timestampMatch = newImageUrl.match(/capture_(\d{14})/);
        if (timestampMatch) {
          const timestamp = timestampMatch[1];

          // Add 3-second delay to ensure image and JSON are fully generated before we try to display
          const timestampDate = new Date(
            parseInt(timestamp.substring(0, 4)), // year
            parseInt(timestamp.substring(4, 6)) - 1, // month (0-based)
            parseInt(timestamp.substring(6, 8)), // day
            parseInt(timestamp.substring(8, 10)), // hour
            parseInt(timestamp.substring(10, 12)), // minute
            parseInt(timestamp.substring(12, 14)), // second
          );

          const delayedTimestamp = new Date(timestampDate.getTime() - 2000); // 2 seconds earlier
          const delayedTimestampString =
            delayedTimestamp.getFullYear().toString() +
            (delayedTimestamp.getMonth() + 1).toString().padStart(2, '0') +
            delayedTimestamp.getDate().toString().padStart(2, '0') +
            delayedTimestamp.getHours().toString().padStart(2, '0') +
            delayedTimestamp.getMinutes().toString().padStart(2, '0') +
            delayedTimestamp.getSeconds().toString().padStart(2, '0');

          // Use delayed timestamp for image URLs to ensure they exist
          // For monitoring, always use full-size images, not thumbnails
          const originalImageUrl = newImageUrl
            .replace(`capture_${timestamp}`, `capture_${delayedTimestampString}`)
            .replace('_thumbnail.jpg', '.jpg');
          const jsonUrl = newImageUrl
            .replace(`capture_${timestamp}`, `capture_${delayedTimestampString}`)
            .replace('_thumbnail.jpg', '_thumbnail.json');

          setFrames((prev) => {
            const newFrames = [...prev, { timestamp, imageUrl: originalImageUrl, jsonUrl }];
            const updatedFrames = newFrames.slice(-100); // Keep last 100 frames

            // Auto-follow new images unless user manually selected a previous frame
            if (!userSelectedFrame || isPlaying) {
              setCurrentIndex(updatedFrames.length - 1);
            }

            return updatedFrames;
          });
        }
      }
    };

    const interval = setInterval(detectImageUrl, 1000);
    return () => clearInterval(interval);
  }, [currentImageUrl, frames.length, isPlaying, userSelectedFrame]);

  // Auto-play functionality
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && frames.length > 1) {
      interval = setInterval(() => {
        setCurrentIndex((prev) => {
          // If user manually selected a frame, don't auto-advance
          if (userSelectedFrame) {
            return prev;
          }

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
    };

    loadSelectedFrameAnalysis();
  }, [currentIndex, frames]);

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

    // Subtitle trend analysis
    subtitleTrendData,
  };
};

import { useState, useEffect, useCallback, useRef } from 'react';

import { Host, Device } from '../../types/common/Host_Types';

export interface RestartFrame {
  filename: string;
  timestamp: string; // YYYYMMDDHHMMSS format
  image_url: string;
  frame_json_url?: string;
  audio_json_url?: string;
  has_frame_analysis: boolean;
  has_audio_analysis: boolean;
  file_mtime: number;
}

export interface RestartAnalysis {
  blackscreen: boolean;
  freeze: boolean;
  subtitles: boolean;
  errors: boolean;
  text: string;
  language?: string;
  timestamp: string;
  audio?: {
    has_audio: boolean;
    volume_percentage: number;
  };
}

interface UseRestartParams {
  host: Host;
  device: Device;
}

interface UseRestartReturn {
  frames: RestartFrame[];
  currentIndex: number;
  currentFrameUrl: string | null;
  selectedFrameAnalysis: RestartAnalysis | null;
  isPlaying: boolean;
  isInitialLoading: boolean;
  handlePlayPause: () => void;
  handleSliderChange: (event: Event, newValue: number | number[]) => void;
}

// Cache interface for analysis data
interface AnalysisCache {
  [url: string]: RestartAnalysis;
}

export const useRestart = ({ host, device }: UseRestartParams): UseRestartReturn => {
  const [frames, setFrames] = useState<RestartFrame[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedFrameAnalysis, setSelectedFrameAnalysis] = useState<RestartAnalysis | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Analysis cache to prevent refetching
  const analysisCache = useRef<AnalysisCache>({});

  // Auto-play timer
  const playTimer = useRef<NodeJS.Timeout | null>(null);

  // Fetch 5-minute historical images
  const fetchRestartImages = useCallback(async () => {
    try {
      setIsInitialLoading(true);
      console.log(
        `[@hook:useRestart] Fetching restart images for ${host.host_name}-${device.device_id}`,
      );

      const response = await fetch('/server/rec/getRestartImages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: host,
          device_id: device.device_id || 'device1',
          timeframe_minutes: 5, // 5 minutes as specified
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch restart images: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      if (data.success && data.frames) {
        console.log(`[@hook:useRestart] Successfully loaded ${data.frames.length} restart frames`);
        setFrames(data.frames);

        // Set to latest frame initially (newest first)
        if (data.frames.length > 0) {
          setCurrentIndex(0);
        }
      } else {
        console.warn(`[@hook:useRestart] No frames available or request failed:`, data.error);
        setFrames([]);
      }
    } catch (error) {
      console.error(`[@hook:useRestart] Error fetching restart images:`, error);
      setFrames([]);
    } finally {
      setIsInitialLoading(false);
    }
  }, [host, device.device_id]);

  // Fetch analysis for current frame
  const fetchFrameAnalysis = useCallback(async (frame: RestartFrame) => {
    // Check cache first
    const cacheKey = frame.frame_json_url || frame.image_url;
    if (analysisCache.current[cacheKey]) {
      setSelectedFrameAnalysis(analysisCache.current[cacheKey]);
      return;
    }

    if (!frame.has_frame_analysis || !frame.frame_json_url) {
      // Create basic analysis from timestamp if no analysis available
      const basicAnalysis: RestartAnalysis = {
        blackscreen: false,
        freeze: false,
        subtitles: false,
        errors: false,
        text: '',
        timestamp: frame.timestamp,
      };
      setSelectedFrameAnalysis(basicAnalysis);
      return;
    }

    try {
      console.log(`[@hook:useRestart] Fetching frame analysis from: ${frame.frame_json_url}`);

      const response = await fetch(frame.frame_json_url);

      if (response.ok) {
        const analysisData = await response.json();

        // Transform to expected format with timestamp
        const analysis: RestartAnalysis = {
          blackscreen: analysisData.blackscreen || false,
          freeze: analysisData.freeze || false,
          subtitles: analysisData.subtitles || false,
          errors: analysisData.errors || false,
          text: analysisData.text || '',
          language: analysisData.language,
          timestamp: frame.timestamp,
          audio: analysisData.audio,
        };

        // Cache the analysis
        analysisCache.current[cacheKey] = analysis;
        setSelectedFrameAnalysis(analysis);

        console.log(`[@hook:useRestart] Successfully loaded analysis for frame: ${frame.filename}`);
      } else {
        console.warn(`[@hook:useRestart] Failed to fetch analysis for frame: ${frame.filename}`);
        // Create basic analysis with timestamp
        const basicAnalysis: RestartAnalysis = {
          blackscreen: false,
          freeze: false,
          subtitles: false,
          errors: false,
          text: '',
          timestamp: frame.timestamp,
        };
        setSelectedFrameAnalysis(basicAnalysis);
      }
    } catch (error) {
      console.error(`[@hook:useRestart] Error fetching frame analysis:`, error);
      // Create basic analysis with timestamp
      const basicAnalysis: RestartAnalysis = {
        blackscreen: false,
        freeze: false,
        subtitles: false,
        errors: false,
        text: '',
        timestamp: frame.timestamp,
      };
      setSelectedFrameAnalysis(basicAnalysis);
    }
  }, []);

  // Auto-play functionality
  const startAutoPlay = useCallback(() => {
    if (playTimer.current) {
      clearInterval(playTimer.current);
    }

    playTimer.current = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = prevIndex + 1;
        if (nextIndex >= frames.length) {
          // Loop back to start
          return 0;
        }
        return nextIndex;
      });
    }, 3000); // 3 seconds per frame
  }, [frames.length]);

  const stopAutoPlay = useCallback(() => {
    if (playTimer.current) {
      clearInterval(playTimer.current);
      playTimer.current = null;
    }
  }, []);

  // Handle play/pause
  const handlePlayPause = useCallback(() => {
    setIsPlaying((prev) => {
      const newPlaying = !prev;
      if (newPlaying) {
        startAutoPlay();
      } else {
        stopAutoPlay();
      }
      return newPlaying;
    });
  }, [startAutoPlay, stopAutoPlay]);

  // Handle slider change
  const handleSliderChange = useCallback(
    (event: Event, newValue: number | number[]) => {
      const index = Array.isArray(newValue) ? newValue[0] : newValue;
      setCurrentIndex(index);

      // Pause auto-play when manually scrubbing
      if (isPlaying) {
        setIsPlaying(false);
        stopAutoPlay();
      }
    },
    [isPlaying, stopAutoPlay],
  );

  // Get current frame URL
  const currentFrameUrl =
    frames.length > 0 && currentIndex < frames.length ? frames[currentIndex].image_url : null;

  // Load analysis when current frame changes
  useEffect(() => {
    if (frames.length > 0 && currentIndex < frames.length) {
      const currentFrame = frames[currentIndex];
      fetchFrameAnalysis(currentFrame);
    } else {
      setSelectedFrameAnalysis(null);
    }
  }, [currentIndex, frames, fetchFrameAnalysis]);

  // Initial data fetch
  useEffect(() => {
    fetchRestartImages();
  }, [fetchRestartImages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAutoPlay();
    };
  }, [stopAutoPlay]);

  return {
    frames,
    currentIndex,
    currentFrameUrl,
    selectedFrameAnalysis,
    isPlaying,
    isInitialLoading,
    handlePlayPause,
    handleSliderChange,
  };
};

import { useState, useEffect, useCallback, useRef } from 'react';

import { Host, Device } from '../../types/common/Host_Types';

export interface RestartFrame {
  filename: string;
  timestamp: string; // YYYYMMDDHHMMSS format
  image_url?: string; // Optional - loaded progressively
  file_mtime: number;
}

interface UseRestartParams {
  host: Host;
  device: Device;
}

interface UseRestartReturn {
  frames: RestartFrame[];
  currentIndex: number;
  currentFrameUrl: string | null;
  isPlaying: boolean;
  isInitialLoading: boolean;
  handlePlayPause: () => void;
  handleSliderChange: (_event: Event, newValue: number | number[]) => void;
}

export const useRestart = ({ host, device }: UseRestartParams): UseRestartReturn => {
  const [frames, setFrames] = useState<RestartFrame[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Auto-play timer
  const playTimer = useRef<NodeJS.Timeout | null>(null);

  // Load all frames at once
  const loadAllFrames = useCallback(async () => {
    try {
      setIsInitialLoading(true);
      console.log(
        `[@hook:useRestart] Loading all frames for ${host.host_name}-${device.device_id}`,
      );

      const response = await fetch('/server/rec/getRestartImages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: host,
          device_id: device.device_id || 'device1',
          timeframe_minutes: 5,
          max_frames: 100, // Limit to 100 frames
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to load frames: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.frames) {
        console.log(
          `[@hook:useRestart] Successfully loaded ${data.frames.length} frames with URLs`,
        );

        setFrames(data.frames);

        // Set to oldest frame initially (oldest first)
        if (data.frames.length > 0) {
          setCurrentIndex(0);
        }
      } else {
        console.warn(`[@hook:useRestart] No frames available or request failed:`, data.error);
        setFrames([]);
      }
    } catch (error) {
      console.error(`[@hook:useRestart] Error loading frames:`, error);
      setFrames([]);
    } finally {
      setIsInitialLoading(false);
    }
  }, [host, device.device_id]);

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
    (_event: Event, newValue: number | number[]) => {
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
    frames.length > 0 && currentIndex < frames.length
      ? frames[currentIndex].image_url || null
      : null;

  // Initial data fetch - load all frames at once
  useEffect(() => {
    loadAllFrames();
  }, [loadAllFrames]);

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
    isPlaying,
    isInitialLoading,
    handlePlayPause,
    handleSliderChange,
  };
};

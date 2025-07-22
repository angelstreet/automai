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

  // Loading cache to prevent duplicate requests
  const loadingRanges = useRef<Set<string>>(new Set());

  // Load URLs for a specific range of frames
  const loadFrameBatch = useCallback(
    async (centerIndex: number, allFrames?: RestartFrame[]) => {
      const framesToUse = allFrames || frames;
      if (framesToUse.length === 0) return;

      // Define batch range around center index
      const batchSize = 20;
      const startIndex = Math.max(0, centerIndex - Math.floor(batchSize / 2));
      const endIndex = Math.min(framesToUse.length, startIndex + batchSize);

      // Create cache key for this range
      const rangeKey = `${startIndex}-${endIndex}`;

      // Skip if already loading this range
      if (loadingRanges.current.has(rangeKey)) {
        console.log(`[@hook:useRestart] Already loading range ${rangeKey}, skipping`);
        return;
      }

      // Check if any frames in this range need URLs
      const needsLoading = framesToUse
        .slice(startIndex, endIndex)
        .some((frame) => !frame.image_url);
      if (!needsLoading) {
        console.log(`[@hook:useRestart] Range ${rangeKey} already loaded, skipping`);
        return;
      }

      try {
        loadingRanges.current.add(rangeKey);
        console.log(
          `[@hook:useRestart] Loading frame batch ${startIndex}-${endIndex} around index ${centerIndex}`,
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
            start_index: startIndex,
            batch_size: endIndex - startIndex,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to load frame batch: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success && data.frames) {
          console.log(
            `[@hook:useRestart] Loaded ${data.frames.length} frame URLs for batch ${startIndex}-${endIndex}`,
          );

          // Update frames with URLs
          setFrames((prevFrames) => {
            const newFrames = [...prevFrames];
            data.frames.forEach((loadedFrame: any, index: number) => {
              const frameIndex = startIndex + index;
              if (frameIndex < newFrames.length) {
                newFrames[frameIndex] = {
                  ...newFrames[frameIndex],
                  image_url: loadedFrame.image_url,
                };
              }
            });
            return newFrames;
          });
        }
      } catch (error) {
        console.error(`[@hook:useRestart] Error loading frame batch:`, error);
      } finally {
        loadingRanges.current.delete(rangeKey);
      }
    },
    [host, device.device_id, frames],
  );

  // Initial metadata fetch - get ALL frame metadata (fast)
  const fetchFrameMetadata = useCallback(async () => {
    try {
      setIsInitialLoading(true);
      console.log(
        `[@hook:useRestart] Fetching frame metadata for ${host.host_name}-${device.device_id}`,
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
          metadata_only: true, // Just get frame list, no URLs
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch frame metadata: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      if (data.success && data.frames) {
        console.log(
          `[@hook:useRestart] Successfully loaded metadata for ${data.frames.length} frames`,
        );
        // Set frames with just metadata (no URLs yet)
        const frameMetadata = data.frames.map((frame: any) => ({
          ...frame,
          image_url: undefined, // Will be loaded progressively
        }));

        setFrames(frameMetadata);

        // Set to latest frame initially (newest first)
        if (frameMetadata.length > 0) {
          setCurrentIndex(0);
          // Load initial batch around first frame
          setTimeout(() => {
            loadFrameBatch(0, frameMetadata);
          }, 100);
        }
      } else {
        console.warn(`[@hook:useRestart] No frames available or request failed:`, data.error);
        setFrames([]);
      }
    } catch (error) {
      console.error(`[@hook:useRestart] Error fetching frame metadata:`, error);
      setFrames([]);
    } finally {
      setIsInitialLoading(false);
    }
  }, [host, device.device_id, loadFrameBatch]);

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

      // Load frames around new position
      loadFrameBatch(index);

      // Pause auto-play when manually scrubbing
      if (isPlaying) {
        setIsPlaying(false);
        stopAutoPlay();
      }
    },
    [isPlaying, stopAutoPlay, loadFrameBatch],
  );

  // Load frames around current index when it changes
  useEffect(() => {
    if (frames.length > 0 && !isInitialLoading) {
      loadFrameBatch(currentIndex);
    }
  }, [currentIndex, frames.length, isInitialLoading, loadFrameBatch]);

  // Get current frame URL
  const currentFrameUrl =
    frames.length > 0 && currentIndex < frames.length
      ? frames[currentIndex].image_url || null
      : null;

  // Initial data fetch
  useEffect(() => {
    fetchFrameMetadata();
  }, [fetchFrameMetadata]);

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

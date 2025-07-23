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

  // Track loaded ranges to prevent duplicate requests
  const loadedRanges = useRef<Array<{ start: number; end: number }>>([]);
  const loadingRanges = useRef<Set<string>>(new Set());

  // Check if a frame range is already loaded
  const isRangeLoaded = useCallback((start: number, end: number): boolean => {
    return loadedRanges.current.some((range) => range.start <= start && range.end >= end);
  }, []);

  // Smart batch loading - only when actually needed
  const loadFrameBatch = useCallback(
    async (startIndex: number, batchSize: number = 20) => {
      if (frames.length === 0) return;

      const endIndex = Math.min(frames.length, startIndex + batchSize);

      // Check if this range is already loaded
      if (isRangeLoaded(startIndex, endIndex)) {
        return;
      }

      // Create cache key for this range
      const rangeKey = `${startIndex}-${endIndex}`;

      // Skip if already loading this range
      if (loadingRanges.current.has(rangeKey)) {
        return;
      }

      // Check if any frames in this range actually need URLs
      const needsLoading = frames.slice(startIndex, endIndex).some((frame) => !frame.image_url);
      if (!needsLoading) {
        // Mark as loaded if all frames have URLs
        loadedRanges.current.push({ start: startIndex, end: endIndex });
        return;
      }

      try {
        loadingRanges.current.add(rangeKey);
        console.log(`[@hook:useRestart] Loading frame batch ${startIndex}-${endIndex}`);

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

          // Track this range as loaded
          loadedRanges.current.push({ start: startIndex, end: endIndex });
        }
      } catch (error) {
        console.error(`[@hook:useRestart] Error loading frame batch:`, error);
      } finally {
        loadingRanges.current.delete(rangeKey);
      }
    },
    [host, device.device_id, frames, isRangeLoaded],
  );

  // Smart preloading based on current position and direction
  const smartPreload = useCallback(
    (targetIndex: number) => {
      if (frames.length === 0) return;

      const batchSize = 20;

      // Find which batch this index belongs to
      const currentBatch = Math.floor(targetIndex / batchSize);
      const currentBatchStart = currentBatch * batchSize;

      // Always ensure current batch is loaded
      if (
        !isRangeLoaded(currentBatchStart, Math.min(frames.length, currentBatchStart + batchSize))
      ) {
        loadFrameBatch(currentBatchStart, batchSize);
      }

      // Smart preloading: only preload if we're near boundaries
      const positionInBatch = targetIndex - currentBatchStart;

      // If we're in the last 5 frames of current batch, preload next batch
      if (positionInBatch >= batchSize - 5) {
        const nextBatchStart = currentBatchStart + batchSize;
        if (
          nextBatchStart < frames.length &&
          !isRangeLoaded(nextBatchStart, Math.min(frames.length, nextBatchStart + batchSize))
        ) {
          console.log(`[@hook:useRestart] Preloading next batch starting at ${nextBatchStart}`);
          loadFrameBatch(nextBatchStart, batchSize);
        }
      }

      // If we're in the first 5 frames of current batch, preload previous batch
      if (positionInBatch <= 5 && currentBatchStart > 0) {
        const prevBatchStart = Math.max(0, currentBatchStart - batchSize);
        if (!isRangeLoaded(prevBatchStart, currentBatchStart)) {
          console.log(`[@hook:useRestart] Preloading previous batch starting at ${prevBatchStart}`);
          loadFrameBatch(prevBatchStart, batchSize);
        }
      }
    },
    [frames, loadFrameBatch, isRangeLoaded],
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

  // Handle slider change - this is where smart loading happens
  const handleSliderChange = useCallback(
    (_event: Event, newValue: number | number[]) => {
      const index = Array.isArray(newValue) ? newValue[0] : newValue;
      setCurrentIndex(index);

      // Smart preload only when user manually changes position
      smartPreload(index);

      // Pause auto-play when manually scrubbing
      if (isPlaying) {
        setIsPlaying(false);
        stopAutoPlay();
      }
    },
    [isPlaying, stopAutoPlay, smartPreload],
  );

  // Get current frame URL
  const currentFrameUrl =
    frames.length > 0 && currentIndex < frames.length
      ? frames[currentIndex].image_url || null
      : null;

  // Initial data fetch
  useEffect(() => {
    fetchFrameMetadata();
  }, [fetchFrameMetadata]);

  // Load initial batch when frames are available (only once)
  const hasLoadedInitial = useRef(false);
  useEffect(() => {
    if (frames.length > 0 && !isInitialLoading && !hasLoadedInitial.current) {
      hasLoadedInitial.current = true;
      smartPreload(0);
    }
  }, [frames.length, isInitialLoading, smartPreload]);

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

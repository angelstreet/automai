import { PlayArrow, Pause } from '@mui/icons-material';
import { Box, Slider, IconButton, Typography, CircularProgress } from '@mui/material';
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';

import { getStreamViewerLayout } from '../../config/layoutConfig';
import { useRestart } from '../../hooks/pages/useRestart';
import { Host, Device } from '../../types/common/Host_Types';

import { RestartOverlay } from './RestartOverlay';

interface RestartPlayerProps {
  host: Host;
  device: Device;
}

// Image cache to store loaded images and prevent refetching
const imageCache = new Map<string, HTMLImageElement>();
const MAX_CACHE_SIZE = 50; // Keep last 50 images

// Simple mobile detection function (matching RecHostPreview logic)
const isMobileModel = (model?: string): boolean => {
  if (!model) return false;
  const modelLower = model.toLowerCase();
  return modelLower.includes('mobile');
};

export const RestartPlayer: React.FC<RestartPlayerProps> = ({ host, device }) => {
  // Image transition states for smooth fade effects
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [previousImageUrl, setPreviousImageUrl] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Track timing for 2-second delays between image changes
  const lastImageChangeTime = useRef<number>(0);
  const imageChangeTimeout = useRef<NodeJS.Timeout | null>(null);

  // Restart hook - fetch 5-minute historical images
  const {
    frames,
    currentIndex,
    currentFrameUrl,
    selectedFrameAnalysis,
    isPlaying,
    isInitialLoading,
    handlePlayPause,
    handleSliderChange,
  } = useRestart({
    host: host,
    device: device,
  });

  // Device model detection for proper image sizing
  const isMobile = useMemo(() => {
    return isMobileModel(device?.device_model);
  }, [device?.device_model]);

  // Layout configuration matching HLSVideoPlayer
  const layoutConfig = useMemo(() => {
    return getStreamViewerLayout(device?.device_model);
  }, [device?.device_model]);

  // Preload image and cache it
  const preloadImage = useCallback((url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      // Check cache first
      if (imageCache.has(url)) {
        resolve(imageCache.get(url)!);
        return;
      }

      const img = new Image();
      img.onload = () => {
        // Add to cache
        imageCache.set(url, img);

        // Clean cache if it gets too large (keep only last 50 images)
        if (imageCache.size > MAX_CACHE_SIZE) {
          const keys = Array.from(imageCache.keys());
          const keysToDelete = keys.slice(0, imageCache.size - MAX_CACHE_SIZE);
          keysToDelete.forEach((key) => imageCache.delete(key));
        }

        resolve(img);
      };
      img.onerror = reject;
      img.src = url;
    });
  }, []);

  // Handle smooth transition when new image loads (matching RecHostPreview logic)
  const handleImageLoad = useCallback(() => {
    if (isTransitioning) {
      // Clear the previous image after a brief delay to allow smooth transition
      setTimeout(() => {
        setPreviousImageUrl(null);
        setIsTransitioning(false);
      }, 300); // Small delay for smooth transition
    }
  }, [isTransitioning]);

  // Load new image with 2-second delay and smooth transition
  const loadNewImage = useCallback(
    async (newUrl: string) => {
      if (!newUrl || newUrl === currentImageUrl) return;

      const now = Date.now();
      const timeSinceLastChange = now - lastImageChangeTime.current;

      // Clear any existing timeout
      if (imageChangeTimeout.current) {
        clearTimeout(imageChangeTimeout.current);
      }

      const performImageChange = async () => {
        try {
          // Preload the new image
          await preloadImage(newUrl);

          // Smooth transition: store previous URL and set new one (matching RecHostPreview)
          if (currentImageUrl && currentImageUrl !== newUrl) {
            setPreviousImageUrl(currentImageUrl);
            setIsTransitioning(true);
          }

          setCurrentImageUrl(newUrl);
          lastImageChangeTime.current = Date.now();
        } catch (error) {
          console.error(`[RestartPlayer] Failed to load image: ${newUrl}`, error);
        }
      };

      // Ensure 2-second delay between image changes (matching RecHostPreview principle)
      if (timeSinceLastChange < 2000) {
        const delay = 2000 - timeSinceLastChange;
        imageChangeTimeout.current = setTimeout(performImageChange, delay);
      } else {
        performImageChange();
      }
    },
    [currentImageUrl, preloadImage],
  );

  // Update image when frame changes
  useEffect(() => {
    if (frames.length > 0 && currentFrameUrl) {
      loadNewImage(currentFrameUrl);
    } else {
      // Reset to empty state when no frames
      setCurrentImageUrl(null);
      setPreviousImageUrl(null);
      setIsTransitioning(false);
    }
  }, [currentFrameUrl, frames.length, loadNewImage]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (imageChangeTimeout.current) {
        clearTimeout(imageChangeTimeout.current);
      }
    };
  }, []);

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        '& .MuiCard-root': {
          height: '100%',
          borderRadius: 0,
          border: 'none',
        },
      }}
    >
      {/* Initial loading state */}
      {isInitialLoading && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'white',
            gap: 2,
          }}
        >
          <CircularProgress sx={{ color: 'white' }} />
          <Typography>Loading restart player (5 minutes)...</Typography>
        </Box>
      )}

      {/* Historical frame display - only when we have frames and not loading */}
      {!isInitialLoading && frames.length > 0 && currentImageUrl && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'transparent',
            zIndex: 1,
            overflow: 'hidden',
          }}
        >
          {/* Previous image - fading out */}
          {previousImageUrl && isTransitioning && (
            <Box
              component="img"
              src={previousImageUrl}
              alt="Previous frame"
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: isMobile ? 'auto' : '100%',
                height: isMobile ? '100%' : 'auto',
                objectFit: layoutConfig.objectFit || 'contain',
                objectPosition: 'top center',
                opacity: 0,
                transition: 'opacity 300ms ease-in-out',
              }}
              draggable={false}
            />
          )}

          {/* Current image - fading in */}
          <Box
            component="img"
            src={currentImageUrl}
            alt={`Frame ${currentIndex + 1}`}
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: isMobile ? 'auto' : '100%',
              height: isMobile ? '100%' : 'auto',
              objectFit: layoutConfig.objectFit || 'contain',
              objectPosition: 'top center',
              opacity: 1,
              transition: 'opacity 300ms ease-in-out',
            }}
            draggable={false}
            onLoad={handleImageLoad}
            onError={() => {
              console.error(`[RestartPlayer] Failed to load frame: ${currentImageUrl}`);
              if (isTransitioning) {
                setPreviousImageUrl(null);
                setIsTransitioning(false);
              }
            }}
          />
        </Box>
      )}

      {/* No frames state */}
      {!isInitialLoading && frames.length === 0 && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'white',
          }}
        >
          <Typography>No restart data available (last 5 minutes)</Typography>
        </Box>
      )}

      {/* Restart overlay */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1000000,
          pointerEvents: 'none',
        }}
      >
        <RestartOverlay
          analysis={frames.length > 0 ? selectedFrameAnalysis || undefined : undefined}
          timestamp={
            frames.length > 0 && selectedFrameAnalysis ? selectedFrameAnalysis.timestamp : undefined
          }
        />
      </Box>

      {/* Timeline controls - only when we have frames and not loading */}
      {!isInitialLoading && frames.length > 0 && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
            p: 1,
            zIndex: 1000010, // Much higher than AndroidMobileOverlay (1000000)
          }}
        >
          {/* Play/Pause button */}
          <Box sx={{ position: 'absolute', bottom: 8, left: 8 }}>
            <IconButton
              size="medium"
              onClick={handlePlayPause}
              sx={{
                color: '#ffffff',
                backgroundColor: 'rgba(255,255,255,0.1)',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.2)',
                },
              }}
            >
              {isPlaying ? <Pause /> : <PlayArrow />}
            </IconButton>
          </Box>

          {/* Frame counter */}
          <Box sx={{ position: 'absolute', bottom: 16, right: 16 }}>
            <Typography
              variant="caption"
              sx={{
                color: '#ffffff',
                fontSize: '0.8rem',
                textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
              }}
            >
              {currentIndex + 1} / {frames.length}
            </Typography>
          </Box>

          {/* Timeline scrubber */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 12,
              left: '60px', // Just after play/pause button
              right: '80px',
            }}
          >
            <Slider
              value={currentIndex}
              min={0}
              max={Math.max(0, frames.length - 1)}
              onChange={handleSliderChange}
              sx={{
                color: '#ffffff',
                '& .MuiSlider-thumb': {
                  width: 16,
                  height: 16,
                  backgroundColor: '#fff',
                },
                '& .MuiSlider-track': {
                  backgroundColor: '#fff',
                },
                '& .MuiSlider-rail': {
                  backgroundColor: 'rgba(255,255,255,0.3)',
                },
              }}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
};

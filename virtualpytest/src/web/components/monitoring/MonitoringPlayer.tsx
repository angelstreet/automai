import { PlayArrow, Pause, Subtitles, SmartToy, Send } from '@mui/icons-material';
import {
  Box,
  Slider,
  IconButton,
  Typography,
  CircularProgress,
  TextField,
  Button,
} from '@mui/material';
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';

import { getStreamViewerLayout } from '../../config/layoutConfig';
import { useMonitoring } from '../../hooks/monitoring/useMonitoring';
import { Host, Device } from '../../types/common/Host_Types';

import { MonitoringOverlay } from './MonitoringOverlay';

interface MonitoringPlayerProps {
  host: Host;
  device: Device;
  baseUrlPattern?: string; // Base URL pattern from useRec
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

export const MonitoringPlayer: React.FC<MonitoringPlayerProps> = ({
  host,
  device,
  baseUrlPattern,
}) => {
  // Image transition states for smooth fade effects
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [previousImageUrl, setPreviousImageUrl] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Track timing for 2-second delays between image changes
  const lastImageChangeTime = useRef<number>(0);
  const imageChangeTimeout = useRef<NodeJS.Timeout | null>(null);

  // Monitoring hook - only detects images when control is active
  const {
    frames,
    currentIndex,
    currentFrameUrl,
    selectedFrameAnalysis,
    isPlaying,
    handlePlayPause,
    handleSliderChange,
    errorTrendData,
    detectSubtitles,
    detectSubtitlesAI,
    isDetectingSubtitles,
    isDetectingSubtitlesAI,
    hasSubtitleDetectionResults,
    // AI Query functionality
    isAIQueryVisible,
    aiQuery,
    aiResponse,
    isProcessingAIQuery,
    toggleAIPanel,
    submitAIQuery,
    clearAIQuery,
    handleAIQueryChange,
  } = useMonitoring({
    host: host,
    device: device,
    baseUrlPattern: baseUrlPattern,
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
          console.error(`[MonitoringPlayer] Failed to load image: ${newUrl}`, error);
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
    if (frames.length > 0 && currentIndex < frames.length - 1 && currentFrameUrl) {
      // Show historical frame
      loadNewImage(currentFrameUrl);
    } else if (frames.length > 0 && currentIndex === frames.length - 1 && currentFrameUrl) {
      // Show latest frame (but still from frames array to ensure it's the most recent capture)
      loadNewImage(currentFrameUrl);
    } else {
      // Reset to live feed when no frames or other edge cases
      setCurrentImageUrl(null);
      setPreviousImageUrl(null);
      setIsTransitioning(false);
    }
  }, [currentFrameUrl, currentIndex, frames.length, loadNewImage]);

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
      {/* Historical frame display - only when we have frames */}
      {frames.length > 0 && currentImageUrl && (
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
              console.error(`[MonitoringPlayer] Failed to load frame: ${currentImageUrl}`);
              if (isTransitioning) {
                setPreviousImageUrl(null);
                setIsTransitioning(false);
              }
            }}
          />
        </Box>
      )}

      {/* No frames state */}
      {frames.length === 0 && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'white',
          }}
        >
          <Typography>Waiting for monitoring data...</Typography>
        </Box>
      )}

      {/* Monitoring overlay */}
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
        <MonitoringOverlay
          overrideAnalysis={frames.length > 0 ? selectedFrameAnalysis || undefined : undefined}
          errorTrendData={errorTrendData}
          showSubtitles={
            isDetectingSubtitles || isDetectingSubtitlesAI || hasSubtitleDetectionResults
          }
        />
      </Box>

      {/* Timeline controls - only when we have frames */}
      {frames.length > 0 && (
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

          {/* Subtitle detection button */}
          <Box sx={{ position: 'absolute', bottom: 8, left: 60 }}>
            <IconButton
              size="medium"
              onClick={detectSubtitles}
              disabled={isDetectingSubtitles || isDetectingSubtitlesAI}
              sx={{
                color: selectedFrameAnalysis?.subtitles ? '#4caf50' : '#ffffff',
                backgroundColor: 'rgba(255,255,255,0.1)',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.2)',
                },
                '&:disabled': {
                  color: 'rgba(255,255,255,0.5)',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                },
              }}
              title={
                isDetectingSubtitles
                  ? 'Detecting subtitles...'
                  : 'Detect subtitles in current frame'
              }
            >
              {isDetectingSubtitles ? (
                <CircularProgress size={20} sx={{ color: '#ffffff' }} />
              ) : (
                <Subtitles />
              )}
            </IconButton>
          </Box>

          {/* AI Subtitle detection button */}
          <Box sx={{ position: 'absolute', bottom: 8, left: 112 }}>
            <IconButton
              size="medium"
              onClick={detectSubtitlesAI}
              disabled={isDetectingSubtitles || isDetectingSubtitlesAI}
              sx={{
                color: selectedFrameAnalysis?.subtitles ? '#ff9800' : '#ffffff',
                backgroundColor: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,152,0,0.3)',
                '&:hover': {
                  backgroundColor: 'rgba(255,152,0,0.1)',
                  borderColor: 'rgba(255,152,0,0.5)',
                },
                '&:disabled': {
                  color: 'rgba(255,255,255,0.5)',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderColor: 'rgba(255,255,255,0.1)',
                },
              }}
              title={
                isDetectingSubtitlesAI
                  ? 'Detecting AI subtitles...'
                  : 'Detect subtitles using AI in current frame'
              }
            >
              {isDetectingSubtitlesAI ? (
                <CircularProgress size={20} sx={{ color: '#ffffff' }} />
              ) : (
                <Box
                  sx={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Subtitles />
                  <Typography
                    variant="caption"
                    sx={{
                      position: 'absolute',
                      bottom: -2,
                      right: -1,
                      fontSize: '0.6rem',
                      fontWeight: 'bold',
                      color: '#ff9800',
                      textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                    }}
                  >
                    AI
                  </Typography>
                </Box>
              )}
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
              left: '172px', // Adjusted to account for both subtitle buttons
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

      {/* AI Query Panel - positioned vertically centered on right side */}
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          right: 16,
          transform: 'translateY(-50%)',
          zIndex: 1000020, // Higher than timeline controls
          pointerEvents: 'auto',
        }}
      >
        {/* AI Button - always visible */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            mb: isAIQueryVisible ? 1 : 0,
          }}
        >
          <IconButton
            size="medium"
            onClick={toggleAIPanel}
            disabled={frames.length === 0}
            sx={{
              color: '#ffffff',
              backgroundColor: 'rgba(0,150,255,0.2)',
              border: '1px solid rgba(0,150,255,0.3)',
              '&:hover': {
                backgroundColor: 'rgba(0,150,255,0.3)',
                borderColor: 'rgba(0,150,255,0.5)',
              },
              '&:disabled': {
                color: 'rgba(255,255,255,0.3)',
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderColor: 'rgba(255,255,255,0.1)',
              },
            }}
            title="Ask AI about this image"
          >
            <SmartToy />
          </IconButton>
        </Box>

        {/* Sliding Query Panel */}
        <Box
          sx={{
            position: 'relative',
            width: isAIQueryVisible ? '320px' : '0px',
            height: isAIQueryVisible ? 'auto' : '0px',
            overflow: 'hidden',
            transition: 'width 300ms ease-in-out, height 300ms ease-in-out',
            backgroundColor: 'rgba(0,0,0,0.85)',
            borderRadius: 1,
            border: isAIQueryVisible ? '1px solid rgba(255,255,255,0.2)' : 'none',
          }}
        >
          {isAIQueryVisible && (
            <Box sx={{ p: 2, minWidth: '320px' }}>
              {/* Input field and send button */}
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <TextField
                  value={aiQuery}
                  onChange={(e) => handleAIQueryChange(e.target.value)}
                  placeholder="Ask about this image... (max 100 chars)"
                  variant="outlined"
                  size="small"
                  multiline={false}
                  disabled={isProcessingAIQuery}
                  inputProps={{
                    maxLength: 100,
                  }}
                  sx={{
                    flex: 1,
                    '& .MuiOutlinedInput-root': {
                      color: '#ffffff',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      '& fieldset': {
                        borderColor: 'rgba(255,255,255,0.3)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255,255,255,0.5)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: 'rgba(0,150,255,0.7)',
                      },
                    },
                    '& .MuiInputBase-input::placeholder': {
                      color: 'rgba(255,255,255,0.5)',
                      opacity: 1,
                    },
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      submitAIQuery();
                    }
                  }}
                />
                <IconButton
                  onClick={submitAIQuery}
                  disabled={!aiQuery.trim() || isProcessingAIQuery}
                  sx={{
                    color: '#ffffff',
                    backgroundColor: 'rgba(0,150,255,0.2)',
                    '&:hover': {
                      backgroundColor: 'rgba(0,150,255,0.3)',
                    },
                    '&:disabled': {
                      color: 'rgba(255,255,255,0.3)',
                      backgroundColor: 'rgba(255,255,255,0.05)',
                    },
                  }}
                >
                  {isProcessingAIQuery ? (
                    <CircularProgress size={20} sx={{ color: '#ffffff' }} />
                  ) : (
                    <Send />
                  )}
                </IconButton>
              </Box>

              {/* Character counter */}
              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '0.7rem',
                  mt: 0.5,
                  display: 'block',
                }}
              >
                {aiQuery.length}/100
              </Typography>

              {/* AI Response */}
              {aiResponse && (
                <Box
                  sx={{
                    mt: 2,
                    p: 1.5,
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderRadius: 1,
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      lineHeight: 1.4,
                      whiteSpace: 'pre-line', // Preserve line breaks
                    }}
                  >
                    {aiResponse}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

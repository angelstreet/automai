import { PlayArrow, Pause } from '@mui/icons-material';
import { Box, Slider, IconButton, Typography } from '@mui/material';
import React, { useState, useEffect, useCallback } from 'react';

import { Host, Device } from '../../types/common/Host_Types';
import { RecHostPreview } from '../rec/RecHostPreview';

import { MonitoringOverlay } from './MonitoringOverlay';

interface FrameRef {
  timestamp: string;
  imageUrl: string;
  jsonUrl: string;
  analysis?: any;
}

interface MonitoringPlayerProps {
  host: Host;
  device?: Device;
  initializeBaseUrl?: (host: Host, device: Device) => Promise<boolean>;
  generateThumbnailUrl?: (host: Host, device: Device) => string | null;
}

export const MonitoringPlayer: React.FC<MonitoringPlayerProps> = ({
  host,
  device,
  initializeBaseUrl,
  generateThumbnailUrl,
}) => {
  const [frames, setFrames] = useState<FrameRef[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('');
  const [userSelectedFrame, setUserSelectedFrame] = useState(false);
  const [selectedFrameAnalysis, setSelectedFrameAnalysis] = useState<any>(null);

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
          const jsonUrl = newImageUrl.replace('.jpg', '.json');

          setFrames((prev) => {
            const newFrames = [...prev, { timestamp, imageUrl: newImageUrl, jsonUrl }];
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
  }, []);

  // Get current frame URL for display
  const currentFrameUrl = frames[currentIndex]?.imageUrl || '';

  // Load analysis for selected frame
  useEffect(() => {
    const loadSelectedFrameAnalysis = async () => {
      if (frames.length === 0 || currentIndex >= frames.length) {
        setSelectedFrameAnalysis(null);
        return;
      }

      const selectedFrame = frames[currentIndex];
      if (!selectedFrame || selectedFrame.analysis) {
        setSelectedFrameAnalysis(selectedFrame?.analysis || null);
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
          setSelectedFrameAnalysis(null);
        }
      } catch {
        setSelectedFrameAnalysis(null);
      }
    };

    loadSelectedFrameAnalysis();
  }, [currentIndex, frames]);

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        '& .MuiCard-root': {
          height: '100%',
          borderRadius: 0,
          border: 'none',
        },
        '& img': {
          objectFit: 'contain',
          width: '100%',
          height: '100%',
        },
      }}
    >
      {/* RecHostPreview for live feed */}
      <RecHostPreview
        host={host}
        device={device}
        initializeBaseUrl={initializeBaseUrl}
        generateThumbnailUrl={generateThumbnailUrl}
        hideHeader={true}
      />

      {/* Override image if viewing historical frame */}
      {frames.length > 0 && currentIndex < frames.length - 1 && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'black',
            zIndex: 1,
          }}
        >
          <img
            src={currentFrameUrl}
            alt={`Frame ${currentIndex + 1}`}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />
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
          zIndex: 1000000, // Same as AndroidMobileOverlay click animation, but appears after in DOM
          pointerEvents: 'none', // Don't block clicks to underlying remote controls
        }}
      >
        <MonitoringOverlay
          overrideImageUrl={
            frames.length > 0 && currentIndex < frames.length - 1 ? currentFrameUrl : undefined
          }
          overrideAnalysis={
            frames.length > 0 && currentIndex < frames.length - 1
              ? selectedFrameAnalysis
              : undefined
          }
        />
      </Box>

      {/* Timeline controls */}
      {frames.length > 0 && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
            p: 1,
            zIndex: 1000001, // Higher than AndroidMobileOverlay (1000000)
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
              left: '80px',
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

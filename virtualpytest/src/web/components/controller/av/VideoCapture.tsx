import { PlayArrow, Pause } from '@mui/icons-material';
import { Box, Slider, IconButton, Typography } from '@mui/material';
import React, { useState, useEffect, useRef } from 'react';

import { getStreamViewerLayout } from '../../../config/layoutConfig';

import { DragSelectionOverlay } from './DragSelectionOverlay';

interface DragArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface VideoCaptureProps {
  // Core functionality props
  currentFrame?: number;
  totalFrames?: number;
  onFrameChange?: (frame: number) => void;
  onImageLoad?: (
    ref: React.RefObject<HTMLImageElement>,
    dimensions: { width: number; height: number },
    sourcePath: string,
  ) => void;
  selectedArea?: DragArea | null;
  onAreaSelected?: (area: DragArea) => void;
  isCapturing?: boolean;
  videoFramePath?: string; // Current frame image path/URL
  model?: string;
  sx?: any;
}

export function VideoCapture({
  currentFrame = 0,
  totalFrames = 0,
  onFrameChange,
  onImageLoad,
  selectedArea,
  onAreaSelected,
  isCapturing = false,
  videoFramePath,
  model,
  sx = {},
}: VideoCaptureProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentValue, setCurrentValue] = useState(currentFrame);
  const imageRef = useRef<HTMLImageElement>(null);

  // Get layout configuration based on device model
  const layoutConfig = getStreamViewerLayout(model);

  // Handle frame playback for captured images
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && totalFrames > 0) {
      interval = setInterval(() => {
        setCurrentValue((prev) => {
          const next = prev + 1;
          if (next >= totalFrames) {
            // Stop playing when reaching the last frame
            console.log('[@component:VideoCapture] Reached last frame, stopping playback');
            setIsPlaying(false);
            return totalFrames - 1; // Stay on last frame
          }
          return next;
        });
      }, 1000); // 1 second per frame (adjustable)
    }
    return () => clearInterval(interval);
  }, [isPlaying, totalFrames]);

  // Sync with external frame changes
  useEffect(() => {
    setCurrentValue(currentFrame);
  }, [currentFrame]);

  const handleSliderChange = (_event: Event, newValue: number | number[]) => {
    const frame = newValue as number;
    setCurrentValue(frame);
    onFrameChange?.(frame);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  // Handle image load to pass ref and dimensions to parent
  const handleImageLoad = () => {
    if (imageRef.current && onImageLoad && videoFramePath) {
      const img = imageRef.current;
      const dimensions = {
        width: img.naturalWidth,
        height: img.naturalHeight,
      };
      console.log(
        '[@component:VideoCapture] Image loaded successfully:',
        videoFramePath,
        dimensions,
      );
      onImageLoad(imageRef, dimensions, videoFramePath);
    }
  };

  // Use processed URL directly from backend
  const imageUrl = videoFramePath || '';

  console.log(
    `[@component:VideoCapture] Rendering with imageUrl: ${imageUrl}, totalFrames: ${totalFrames}, isCapturing: ${isCapturing}`,
  );

  // Determine if drag selection should be enabled
  const allowDragSelection = totalFrames > 0 && onAreaSelected && imageRef.current;

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'transparent',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        ...sx,
      }}
    >
      {/* Header - only show when we have captured frames (not while recording) */}
      {totalFrames > 0 && !isCapturing && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 8px',
            borderBottom: '1px solid #333',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* Green indicator for captured frames */}
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#4caf50',
                marginRight: 1,
              }}
            />
            <Typography variant="caption" sx={{ color: '#ffffff', fontSize: '10px' }}>
              CAPTURED FRAMES
            </Typography>
          </Box>

          {/* Frame count */}
          <Typography variant="caption" sx={{ color: '#cccccc', fontSize: '10px' }}>
            {totalFrames} frames
          </Typography>
        </Box>
      )}

      {/* Main content area */}
      <Box
        sx={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent',
        }}
      >
        {/* Drag Selection Overlay - lower z-index */}
        {allowDragSelection && (
          <DragSelectionOverlay
            imageRef={imageRef}
            onAreaSelected={onAreaSelected}
            selectedArea={selectedArea || null}
            sx={{ zIndex: 5 }}
          />
        )}

        {/* Captured images display - same logic as ScreenshotCapture */}
        {totalFrames > 0 && imageUrl && !isCapturing && (
          <img
            ref={imageRef}
            src={imageUrl}
            alt={`Captured Frame ${currentValue + 1}`}
            style={{
              maxWidth: layoutConfig.isMobileModel ? 'auto' : '100%',
              maxHeight: '100%',
              width: layoutConfig.isMobileModel ? 'auto' : '100%',
              height: 'auto',
              objectFit: layoutConfig.objectFit,
              backgroundColor: 'transparent',
            }}
            draggable={false}
            onLoad={handleImageLoad}
            onError={(e) => {
              const imgSrc = (e.target as HTMLImageElement).src;
              console.error(`[@component:VideoCapture] Failed to load image: ${imgSrc}`);

              // Set a transparent fallback image
              (e.target as HTMLImageElement).src =
                'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

              // Add placeholder styling
              const img = e.target as HTMLImageElement;
              img.style.backgroundColor = 'transparent';
              img.style.border = '1px solid #E0E0E0';
              img.style.maxWidth = '100%';
              img.style.maxHeight = '100%';
              img.style.width = 'auto';
              img.style.height = 'auto';
              img.style.objectFit = 'contain';
              img.style.padding = '4px';
            }}
          />
        )}

        {/* Recording state overlay */}
        {isCapturing && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.3)',
              zIndex: 10,
            }}
          >
            <Typography
              variant="body1"
              sx={{ color: '#ffffff', textAlign: 'center', opacity: 0.8 }}
            >
              Recording in progress...
            </Typography>
          </Box>
        )}

        {/* Placeholder when no frames available and not recording */}
        {totalFrames === 0 && !isCapturing && (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
              border: '1px solid #333333',
            }}
          >
            <Typography variant="caption" sx={{ color: '#666666' }}>
              No Captured Frames Available
            </Typography>
          </Box>
        )}
      </Box>

      {/* Playback controls - only show when we have captured frames */}
      {totalFrames > 0 && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
            p: 1,
            backgroundColor: 'transparent',
            zIndex: 15,
          }}
        >
          {/* Play/Pause button - bottom left */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              zIndex: 20,
            }}
          >
            <IconButton
              size="medium"
              onClick={handlePlayPause}
              sx={{
                color: '#ffffff',
                backgroundColor: 'rgba(255,255,255,0.1)',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.2)',
                },
                zIndex: 20,
              }}
            >
              {isPlaying ? <Pause /> : <PlayArrow />}
            </IconButton>
          </Box>

          {/* Frame counter - bottom right */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              zIndex: 20,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: '#ffffff',
                fontSize: '0.8rem',
                textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
              }}
            >
              {currentValue + 1} / {totalFrames}
            </Typography>
          </Box>

          {/* Scrubber - centered horizontally, at bottom */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 12,
              left: '80px',
              right: '80px',
              zIndex: 20,
            }}
          >
            <Slider
              value={currentValue}
              min={0}
              max={Math.max(0, totalFrames - 1)}
              onChange={handleSliderChange}
              sx={{
                color: '#ffffff',
                '& .MuiSlider-thumb': {
                  width: 16,
                  height: 16,
                  backgroundColor: '#fff',
                  '&:hover': {
                    boxShadow: '0px 0px 0px 8px rgba(255, 255, 255, 0.16)',
                  },
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
}

export default VideoCapture;

import React, { useState, useEffect } from 'react';
import {
  Box,
  Slider,
  IconButton,
  Typography,
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  SkipNext,
  SkipPrevious,
} from '@mui/icons-material';

interface CapturePreviewEditorProps {
  mode: 'screenshot' | 'video';
  screenshotPath?: string;
  videoFramesPath?: string;
  currentFrame?: number;
  totalFrames?: number;
  onFrameChange?: (frame: number) => void;
  sx?: any;
}

export function CapturePreviewEditor({
  mode,
  screenshotPath,
  videoFramesPath,
  currentFrame = 0,
  totalFrames = 0,
  onFrameChange,
  sx = {}
}: CapturePreviewEditorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentValue, setCurrentValue] = useState(currentFrame);

  // Handle frame playback
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && mode === 'video') {
      interval = setInterval(() => {
        setCurrentValue((prev) => {
          const next = prev + 1;
          if (next >= totalFrames) {
            setIsPlaying(false);
            return prev;
          }
          return next;
        });
      }, 1000 / 30); // 30fps playback
    }
    return () => clearInterval(interval);
  }, [isPlaying, totalFrames, mode]);

  // Sync with external frame changes
  useEffect(() => {
    setCurrentValue(currentFrame);
  }, [currentFrame]);

  const handleSliderChange = (event: Event, newValue: number | number[]) => {
    const frame = newValue as number;
    setCurrentValue(frame);
    onFrameChange?.(frame);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handlePrevFrame = () => {
    const newFrame = Math.max(0, currentValue - 1);
    setCurrentValue(newFrame);
    onFrameChange?.(newFrame);
  };

  const handleNextFrame = () => {
    const newFrame = Math.min(totalFrames - 1, currentValue + 1);
    setCurrentValue(newFrame);
    onFrameChange?.(newFrame);
  };

  // Add a utility function to convert file paths to browser-accessible URLs
  const getImageUrl = (path: string | undefined): string => {
    if (!path) return '';
    
    // Debug the path
    console.log(`[@component:CapturePreviewEditor] Processing image path: ${path}`);
    
    // Generate a cache-busting timestamp
    const timestamp = new Date().getTime();
    
    // If it's already a URL, return it with cache-busting parameter
    if (path.startsWith('http')) return `${path}?t=${timestamp}`;
    
    // For paths like /tmp/screenshots/filename.jpg, convert to API endpoint URL
    if (path.includes('/tmp/screenshots/')) {
      const filename = path.split('/').pop();
      return `http://localhost:5009/api/virtualpytest/screen-definition/images/screenshot/${filename}?t=${timestamp}`;
    }
    
    // Default case - pass to a general API endpoint that can serve files by path
    return `http://localhost:5009/api/virtualpytest/screen-definition/images?path=${encodeURIComponent(path)}&t=${timestamp}`;
  };

  return (
    <Box sx={{ 
      bgcolor: '#000000',
      border: '2px solid #000000',
      borderRadius: 0, // No border radius when in grid
      display: 'flex',
      flexDirection: 'column',
      height: '100%', // Fill available height
      ...sx 
    }}>
      {/* Preview Area */}
      <Box sx={{ 
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000000'
      }}>
        {mode === 'screenshot' && screenshotPath && (
          <>
            <img 
              src={getImageUrl(screenshotPath)}
              alt="Screenshot"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain'
              }}
              onError={(e) => {
                console.error(`[@component:CapturePreviewEditor] Failed to load image: ${(e.target as HTMLImageElement).src}`);
                (e.target as HTMLImageElement).src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='; // 1x1 transparent image
              }}
            />
            <Typography 
              variant="caption" 
              sx={{ 
                position: 'absolute', 
                bottom: 5, 
                left: 5, 
                color: 'rgba(255,255,255,0.7)',
                fontSize: '0.7rem',
                backgroundColor: 'rgba(0,0,0,0.5)',
                px: 1,
                borderRadius: 1
              }}
            >
              {screenshotPath.split('/').pop()?.split('?')[0]}
            </Typography>
          </>
        )}
        {mode === 'video' && videoFramesPath && (
          <>
            <img 
              src={getImageUrl(`${videoFramesPath}/frame_${currentValue.toString().padStart(4, '0')}.jpg`)}
              alt={`Frame ${currentValue}`}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain'
              }}
              onError={(e) => {
                console.error(`[@component:CapturePreviewEditor] Failed to load frame: ${(e.target as HTMLImageElement).src}`);
                (e.target as HTMLImageElement).src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
              }}
            />
            <Typography 
              variant="caption" 
              sx={{ 
                position: 'absolute', 
                bottom: 5, 
                left: 5, 
                color: 'rgba(255,255,255,0.7)',
                fontSize: '0.7rem',
                backgroundColor: 'rgba(0,0,0,0.5)',
                px: 1,
                borderRadius: 1
              }}
            >
              Frame {currentValue + 1}
            </Typography>
          </>
        )}
      </Box>

      {/* Controls for video mode */}
      {mode === 'video' && (
        <Box sx={{ 
          p: 2,
          borderTop: '1px solid #333',
          backgroundColor: '#000000'
        }}>
          {/* Frame counter */}
          <Typography variant="caption" sx={{ color: '#666', display: 'block', textAlign: 'center', mb: 1 }}>
            Frame {currentValue + 1} / {totalFrames}
          </Typography>

          {/* Scrubber */}
          <Slider
            value={currentValue}
            min={0}
            max={Math.max(0, totalFrames - 1)}
            onChange={handleSliderChange}
            sx={{ 
              color: '#666',
              '& .MuiSlider-thumb': {
                width: 14,
                height: 14,
                backgroundColor: '#fff',
              },
              '& .MuiSlider-rail': {
                backgroundColor: '#333',
              }
            }}
          />

          {/* Playback controls */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center',
            gap: 1,
            mt: 1
          }}>
            <IconButton 
              size="small" 
              onClick={handlePrevFrame}
              sx={{ color: '#666' }}
            >
              <SkipPrevious />
            </IconButton>
            
            <IconButton 
              size="small" 
              onClick={handlePlayPause}
              sx={{ color: '#666' }}
            >
              {isPlaying ? <Pause /> : <PlayArrow />}
            </IconButton>
            
            <IconButton 
              size="small" 
              onClick={handleNextFrame}
              sx={{ color: '#666' }}
            >
              <SkipNext />
            </IconButton>
          </Box>
        </Box>
      )}
    </Box>
  );
} 
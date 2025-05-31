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

  return (
    <Box sx={{ 
      width: '300px',
      height: '500px',
      bgcolor: '#000000',
      border: '2px solid #000000',
      borderRadius: 1,
      display: 'flex',
      flexDirection: 'column',
      ml: 2,
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
          <img 
            src={screenshotPath} 
            alt="Screenshot"
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain'
            }}
          />
        )}
        {mode === 'video' && videoFramesPath && (
          <img 
            src={`${videoFramesPath}/frame_${currentValue.toString().padStart(4, '0')}.jpg`}
            alt={`Frame ${currentValue}`}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain'
            }}
          />
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
import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Slider,
  IconButton,
  Typography,
  Button,
} from '@mui/material';
import {
  PlayArrow,
  Pause,
  SkipNext,
  SkipPrevious,
  RadioButtonChecked,
  Stop,
} from '@mui/icons-material';
import { useCapture } from '../../hooks/useCapture';

interface VideoCaptureProps {
  deviceModel?: string;
  videoDevice?: string;
  videoFramesPath?: string;
  currentFrame?: number;
  totalFrames?: number;
  onFrameChange?: (frame: number) => void;
  sx?: any;
}

// Blinking red button component
function BlinkingStopButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <Button
      variant="contained"
      onClick={onClick}
      disabled={disabled}
      startIcon={<Stop />}
      sx={{
        backgroundColor: '#ff4444',
        color: 'white',
        animation: 'blink 1s infinite',
        '&:hover': {
          backgroundColor: '#cc3333',
        },
        '&:disabled': {
          backgroundColor: '#666666',
          animation: 'none',
        },
        '@keyframes blink': {
          '0%, 50%': {
            opacity: 1,
          },
          '51%, 100%': {
            opacity: 0.5,
          },
        },
      }}
    >
      STOP CAPTURE
    </Button>
  );
}

export function VideoCapture({
  deviceModel = 'android_mobile',
  videoDevice = '/dev/video0',
  videoFramesPath,
  currentFrame = 0,
  totalFrames = 0,
  onFrameChange,
  sx = {}
}: VideoCaptureProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentValue, setCurrentValue] = useState(currentFrame);

  // Use the capture hook for rolling buffer functionality
  const {
    captureStatus,
    startCapture,
    stopCapture,
    lastCaptureResult,
    isLoading,
    error,
  } = useCapture(deviceModel, videoDevice);

  // Handle frame playback
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && videoFramesPath && totalFrames > 0) {
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
  }, [isPlaying, totalFrames, videoFramesPath]);

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

  const handleStartCapture = async () => {
    console.log('[@component:VideoCapture] Starting capture...');
    await startCapture();
  };

  const handleStopCapture = async () => {
    console.log('[@component:VideoCapture] Stopping capture...');
    await stopCapture();
  };

  // Memoize video frame URL
  const videoFrameUrl = useMemo(() => {
    if (!videoFramesPath || !totalFrames) return '';
    
    const timestamp = new Date().getTime();
    const framePath = `${videoFramesPath}/frame_${currentValue.toString().padStart(4, '0')}.jpg`;
    return `http://localhost:5009/api/virtualpytest/screen-definition/images?path=${encodeURIComponent(framePath)}&t=${timestamp}`;
  }, [videoFramesPath, currentValue, totalFrames]);

  // Format duration for display
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Box sx={{ 
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#000000',
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
        backgroundColor: 'transparent',
        p: 0.5,
      }}>
        {/* Rolling Buffer Capture Mode */}
        {!videoFramesPath && (
          <Box sx={{
            width: '100%',
            height: '100%',
            minHeight: '400px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
            border: '1px solid #333333',
            p: 2,
            gap: 3
          }}>
            {/* Capture Status Display */}
            {captureStatus?.is_capturing ? (
              <>
                {/* Recording indicator */}
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 2
                }}>
                  <Box sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: '#ff4444',
                    animation: 'pulse 1s infinite',
                    '@keyframes pulse': {
                      '0%': { opacity: 1 },
                      '50%': { opacity: 0.3 },
                      '100%': { opacity: 1 },
                    }
                  }} />
                  <Typography variant="h6" sx={{ color: '#ff4444', fontWeight: 'bold' }}>
                    RECORDING
                  </Typography>
                </Box>

                {/* Duration and progress */}
                <Typography variant="body1" sx={{ color: '#ffffff', textAlign: 'center' }}>
                  Duration: {formatDuration(captureStatus.duration)} / {formatDuration(captureStatus.max_duration)}
                </Typography>
                
                <Typography variant="caption" sx={{ color: '#cccccc', textAlign: 'center' }}>
                  Capturing at {captureStatus.fps} FPS • Rolling 30s buffer
                </Typography>

                {/* Progress bar */}
                <Box sx={{ width: '80%', mb: 2 }}>
                  <Box sx={{
                    width: '100%',
                    height: 8,
                    backgroundColor: '#333333',
                    borderRadius: 4,
                    overflow: 'hidden'
                  }}>
                    <Box sx={{
                      width: `${Math.min(100, (captureStatus.duration / captureStatus.max_duration) * 100)}%`,
                      height: '100%',
                      backgroundColor: '#ff4444',
                      transition: 'width 0.5s ease-in-out'
                    }} />
                  </Box>
                </Box>

                {/* Stop button */}
                <BlinkingStopButton 
                  onClick={handleStopCapture} 
                  disabled={isLoading}
                />
              </>
            ) : (
              <>
                {/* Not recording state */}
                <RadioButtonChecked sx={{ fontSize: 60, color: '#666666', mb: 2 }} />
                
                <Typography variant="h6" sx={{ color: '#cccccc', textAlign: 'center', mb: 1 }}>
                  Ready to Capture
                </Typography>
                
                <Typography variant="caption" sx={{ color: '#666666', textAlign: 'center', mb: 3 }}>
                  10 FPS • 30 second rolling buffer • Max 300 frames
                </Typography>

                {/* Start button */}
                <Button
                  variant="contained"
                  onClick={handleStartCapture}
                  disabled={isLoading}
                  startIcon={<RadioButtonChecked />}
                  sx={{
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    px: 4,
                    py: 1.5,
                    '&:hover': {
                      backgroundColor: '#45a049',
                    },
                    '&:disabled': {
                      backgroundColor: '#666666',
                    },
                  }}
                >
                  START CAPTURE
                </Button>
              </>
            )}

            {/* Error display */}
            {error && (
              <Typography variant="caption" sx={{ color: '#ff4444', textAlign: 'center', mt: 2 }}>
                Error: {error}
              </Typography>
            )}

            {/* Last capture result */}
            {lastCaptureResult && !captureStatus?.is_capturing && (
              <Typography variant="caption" sx={{ color: '#4CAF50', textAlign: 'center', mt: 2 }}>
                Last capture: {lastCaptureResult.framesDownloaded} frames in {lastCaptureResult.captureDuration}s
              </Typography>
            )}
          </Box>
        )}

        {/* Video playback mode */}
        {videoFramesPath && totalFrames > 0 && (
          <>
            <img 
              src={videoFrameUrl}
              alt={`Frame ${currentValue}`}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain'
              }}
              onError={(e) => {
                console.error(`[@component:VideoCapture] Failed to load frame: ${(e.target as HTMLImageElement).src}`);
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

        {/* Placeholder when no video frames and not in capture mode */}
        {!videoFramesPath && !captureStatus?.is_capturing && (
          <Box sx={{
            width: '100%',
            height: '100%',
            minHeight: '400px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
            border: '1px solid #333333',
            p: 0.5,
          }}>
            <Typography variant="caption" sx={{ color: '#666666' }}>
              No Video Available
            </Typography>
          </Box>
        )}
      </Box>

      {/* Controls for video playback */}
      {videoFramesPath && totalFrames > 0 && (
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

export default VideoCapture; 
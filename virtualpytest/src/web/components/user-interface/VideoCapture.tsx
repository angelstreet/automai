import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  const captureStartedRef = useRef(false);
  const [currentFrameNumber, setCurrentFrameNumber] = useState<number>(0);
  const [lastFetchTime, setLastFetchTime] = useState(Date.now());

  // Use the capture hook for rolling buffer functionality
  const {
    captureStatus,
    startCapture,
    stopCapture,
    lastCaptureResult,
    isLoading,
    error,
    isCapturing
  } = useCapture(deviceModel, videoDevice);

  // Auto-start capture when component mounts
  useEffect(() => {
    // Only start if we're not already capturing and haven't started yet
    if (!isCapturing && !captureStartedRef.current && !videoFramesPath) {
      console.log('[@component:VideoCapture] Auto-starting capture...');
      startCapture();
      captureStartedRef.current = true;
    }
  }, [isCapturing, startCapture, videoFramesPath]);

  // Fetch the latest frame periodically - just update the timestamp for cache busting
  useEffect(() => {
    if (!isCapturing || videoFramesPath) return;
    
    const updateFrame = () => {
      setLastFetchTime(Date.now());
      
      // Update frame number from capture status
      if (captureStatus && captureStatus.current_frame !== undefined) {
        setCurrentFrameNumber(captureStatus.current_frame);
      }
    };
    
    // Initial update
    updateFrame();
    
    // Set up interval to update timestamp for cache busting
    const interval = setInterval(updateFrame, 100);
    
    return () => clearInterval(interval);
  }, [isCapturing, videoFramesPath, captureStatus]);

  // Handle frame playback for recorded video
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

  // Generate URL for the current captured frame with cache-busting
  const currentCapturedFrameUrl = useMemo(() => {
    // Use the correct path structure - no "latest" folder, use local TMP_DIR path
    return `http://localhost:5009/api/virtualpytest/screen-definition/images?path=/tmp/captures/capture_latest.jpg&t=${lastFetchTime}`;
  }, [lastFetchTime]);

  // Memoize video frame URL for playback mode
  const videoFrameUrl = useMemo(() => {
    if (!videoFramesPath || !totalFrames) return '';
    
    const timestamp = new Date().getTime();
    const framePath = `${videoFramesPath}/frame_${currentValue.toString().padStart(4, '0')}.jpg`;
    return `http://localhost:5009/api/virtualpytest/screen-definition/images?path=${encodeURIComponent(framePath)}&t=${timestamp}`;
  }, [videoFramesPath, currentValue, totalFrames]);

  return (
    <Box sx={{ 
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#000000',
      ...sx 
    }}>
      {/* Minimal recording indicator header - only shown during capture */}
      {isCapturing && !videoFramesPath && (
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '4px 8px',
          borderBottom: '1px solid #333'
        }}>
          {/* Blinking record indicator */}
          <Box sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: '#ff4444',
            marginRight: 1,
            animation: 'pulse 1s infinite',
            '@keyframes pulse': {
              '0%': { opacity: 1 },
              '50%': { opacity: 0.3 },
              '100%': { opacity: 1 },
            }
          }} />
          <Typography variant="caption" sx={{ color: '#ffffff', fontSize: '10px' }}>
            RECORDING
          </Typography>
          
          {/* Display current frame number */}
          {currentFrameNumber > 0 && (
            <Typography variant="caption" sx={{ color: '#cccccc', fontSize: '10px', ml: 1 }}>
              Frame: {currentFrameNumber}
            </Typography>
          )}
        </Box>
      )}

      {/* Main content area */}
      <Box sx={{ 
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
      }}>
        {/* Live capture view - show the latest captured frame */}
        {isCapturing && !videoFramesPath && (
          <img 
            src={currentCapturedFrameUrl}
            alt="Live Capture"
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain'
            }}
            onError={(e) => {
              console.error(`[@component:VideoCapture] Failed to load frame: ${(e.target as HTMLImageElement).src}`);
              // Keep the current image instead of showing an error placeholder
            }}
          />
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

        {/* Placeholder when no capture is happening */}
        {!isCapturing && !videoFramesPath && (
          <Box sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
            border: '1px solid #333333',
          }}>
            <Typography variant="caption" sx={{ color: '#666666' }}>
              No Video Available
            </Typography>
          </Box>
        )}

        {/* Error display - only show if critical */}
        {error && (
          <Typography 
            variant="caption" 
            sx={{ 
              position: 'absolute', 
              bottom: 5, 
              right: 5, 
              color: '#ff4444',
              fontSize: '0.7rem',
              backgroundColor: 'rgba(0,0,0,0.5)',
              px: 1,
              borderRadius: 1
            }}
          >
            Error: {error}
          </Typography>
        )}
      </Box>

      {/* Controls for video playback - only show in playback mode */}
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
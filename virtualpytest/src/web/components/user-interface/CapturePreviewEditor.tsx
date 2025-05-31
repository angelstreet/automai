import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Slider,
  IconButton,
  Typography,
  CircularProgress,
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

interface CapturePreviewEditorProps {
  mode: 'screenshot' | 'video' | 'capture';
  screenshotPath?: string;
  videoFramesPath?: string;
  currentFrame?: number;
  totalFrames?: number;
  onFrameChange?: (frame: number) => void;
  resolutionInfo?: {
    device: { width: number; height: number } | null;
    capture: string | null;
    stream: string | null;
  };
  isCapturing?: boolean;
  onStartCapture?: () => void;
  onStopCapture?: () => void;
  captureStatus?: {
    is_capturing: boolean;
    duration: number;
    max_duration: number;
    fps: number;
  };
  sx?: any;
}

// Reusable placeholder component
function CapturePreviewPlaceholder({ text }: { text: string }) {
  return (
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
        {text}
      </Typography>
    </Box>
  );
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

export function CapturePreviewEditor({
  mode,
  screenshotPath,
  videoFramesPath,
  currentFrame = 0,
  totalFrames = 0,
  onFrameChange,
  resolutionInfo,
  isCapturing,
  onStartCapture,
  onStopCapture,
  captureStatus,
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

  // Memoize the image URL to prevent multiple re-calculations
  const imageUrl = useMemo(() => {
    if (!screenshotPath) return '';
    
    console.log(`[@component:CapturePreviewEditor] Processing image path: ${screenshotPath}`);
    
    // Handle data URLs (base64 from remote system) - return as is
    if (screenshotPath.startsWith('data:')) {
      console.log('[@component:CapturePreviewEditor] Using data URL from remote system');
      return screenshotPath;
    }
    
    // Generate a cache-busting timestamp for file-based screenshots
    const timestamp = new Date().getTime();
    
    // For FFmpeg screenshots stored locally in /tmp/screenshots/ (full path)
    if (screenshotPath.includes('/tmp/screenshots/')) {
      // Extract just the filename without path or query string
      const filename = screenshotPath.split('/').pop()?.split('?')[0];
      console.log(`[@component:CapturePreviewEditor] Using FFmpeg screenshot: ${filename}`);
      
      if (!filename) {
        console.error(`[@component:CapturePreviewEditor] Failed to extract filename from path: ${screenshotPath}`);
        return '';
      }
      
      // Create URL pointing to our screenshot serve endpoint
      const finalUrl = `http://localhost:5009/api/virtualpytest/screen-definition/images/screenshot/${filename}?t=${timestamp}`;
      console.log(`[@component:CapturePreviewEditor] Generated image URL: ${finalUrl}`);
      return finalUrl;
    }
    
    // For just a filename (like android_mobile.jpg) - assume it's in /tmp/screenshots/
    if (!screenshotPath.includes('/') && screenshotPath.endsWith('.jpg')) {
      const filename = screenshotPath.split('?')[0]; // Remove any query params
      console.log(`[@component:CapturePreviewEditor] Using filename screenshot: ${filename}`);
      
      // Create URL pointing to our screenshot serve endpoint
      const finalUrl = `http://localhost:5009/api/virtualpytest/screen-definition/images/screenshot/${filename}?t=${timestamp}`;
      console.log(`[@component:CapturePreviewEditor] Generated image URL from filename: ${finalUrl}`);
      return finalUrl;
    }
    
    // If it's already a full URL (but without timestamp)
    if (screenshotPath.startsWith('http') && !screenshotPath.includes('?t=')) {
      const finalUrl = `${screenshotPath}?t=${timestamp}`;
      console.log(`[@component:CapturePreviewEditor] Added timestamp to URL: ${finalUrl}`);
      return finalUrl;
    }
    
    // If it's already a full URL with timestamp, return as is
    if (screenshotPath.startsWith('http') && screenshotPath.includes('?t=')) {
      console.log(`[@component:CapturePreviewEditor] Using existing URL with timestamp: ${screenshotPath}`);
      return screenshotPath;
    }
    
    // Default case - convert to API endpoint URL
    // First clean the path of any query parameters
    const cleanPath = screenshotPath.split('?')[0];
    const finalUrl = `http://localhost:5009/api/virtualpytest/screen-definition/images?path=${encodeURIComponent(cleanPath)}&t=${timestamp}`;
    console.log(`[@component:CapturePreviewEditor] Generated default URL: ${finalUrl}`);
    return finalUrl;
  }, [screenshotPath]); // Only recalculate when screenshotPath changes

  // Memoize video frame URL
  const videoFrameUrl = useMemo(() => {
    if (!videoFramesPath) return '';
    
    const timestamp = new Date().getTime();
    const framePath = `${videoFramesPath}/frame_${currentValue.toString().padStart(4, '0')}.jpg`;
    return `http://localhost:5009/api/virtualpytest/screen-definition/images?path=${encodeURIComponent(framePath)}&t=${timestamp}`;
  }, [videoFramesPath, currentValue]);

  // Format duration for display
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
        backgroundColor: 'transparent',
        p: 0.5, // Minimal padding
      }}>
        {mode === 'screenshot' && screenshotPath && (
          <>
            <img 
              src={imageUrl}
              alt="Screenshot"
              style={{
                maxWidth: 'auto',
                maxHeight: '100%',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                backgroundColor: 'transparent'
              }}
              onError={(e) => {
                const imgSrc = (e.target as HTMLImageElement).src;
                console.error(`[@component:CapturePreviewEditor] Failed to load image: ${imgSrc}`);
                
                // Set a transparent fallback image
                (e.target as HTMLImageElement).src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
                
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
            <Typography 
              variant="caption" 
              sx={{ 
                position: 'absolute', 
                bottom: 5, 
                left: 5, 
                color: '#666666',
                fontSize: '0.7rem',
                backgroundColor: 'rgba(255,255,255,0.8)',
                px: 1,
                borderRadius: 1
              }}
            >
              {typeof screenshotPath === 'string' ? 
                screenshotPath.split('/').pop()?.split('?')[0] || 'Screenshot' : 
                'Screenshot'}
            </Typography>
          </>
        )}

        {/* Capture Mode */}
        {mode === 'capture' && (
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
                  onClick={() => onStopCapture?.()} 
                  disabled={!onStopCapture}
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
                  onClick={() => onStartCapture?.()}
                  disabled={!onStartCapture}
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
          </Box>
        )}

        {/* Show loading when capturing */}
        {mode === 'screenshot' && isCapturing && (
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
            p: 0.5,
            gap: 2
          }}>
            {/* Simple carousel-style loading */}
            <Box sx={{
              display: 'flex',
              gap: 1,
              alignItems: 'center'
            }}>
              {[0, 1, 2].map((index) => (
                <Box
                  key={index}
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: '#666666',
                    animation: 'pulse 1.4s ease-in-out infinite both',
                    animationDelay: `${index * 0.16}s`,
                    '@keyframes pulse': {
                      '0%, 80%, 100%': {
                        transform: 'scale(0)',
                        opacity: 0.5,
                      },
                      '40%': {
                        transform: 'scale(1)',
                        opacity: 1,
                      },
                    },
                  }}
                />
              ))}
            </Box>
            <Typography variant="caption" sx={{ color: '#666666', textAlign: 'center' }}>
              Capturing Screenshot...
            </Typography>
          </Box>
        )}
        {/* Show placeholder when no screenshot and not capturing */}
        {mode === 'screenshot' && !screenshotPath && !isCapturing && (
          <CapturePreviewPlaceholder text="No Screenshot Available" />
        )}
        {mode === 'video' && videoFramesPath && (
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
        {/* Show placeholder when no video frames */}
        {mode === 'video' && (!videoFramesPath || !videoFrameUrl) && (
          <CapturePreviewPlaceholder text="No Video Available" />
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
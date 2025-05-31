import React, { useState, useEffect, useMemo } from 'react';
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
  screenshotStyle?: React.CSSProperties;
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

export function CapturePreviewEditor({
  mode,
  screenshotPath,
  videoFramesPath,
  currentFrame = 0,
  totalFrames = 0,
  onFrameChange,
  screenshotStyle,
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

  return (
    <Box sx={{ 
      bgcolor: '#1E1E1E',
      border: '2px solid #1E1E1E',
      borderRadius: 0,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      ...sx 
    }}>
      {/* Preview Area */}
      <Box sx={{ 
        flex: 1,
        position: 'relative',
        overflow: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        p: 0.5,
      }}>
        {mode === 'screenshot' && screenshotPath && (
          <>
            <img 
              src={imageUrl}
              alt="Screenshot"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                backgroundColor: 'transparent',
                ...(screenshotStyle || {})
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
                img.style.width = 'auto';
                img.style.height = 'auto';
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
        {/* Show placeholder when no screenshot */}
        {mode === 'screenshot' && !screenshotPath && (
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
          backgroundColor: '#1E1E1E'
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
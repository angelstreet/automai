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
} from '@mui/icons-material';
import { DragSelectionOverlay } from './DragSelectionOverlay';
import { getStreamViewerLayout } from '../../../config/layoutConfig';

interface DragArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface VideoCaptureProps {
  deviceModel?: string;
  videoDevice?: string;
  hostIp?: string;
  hostPort?: string;
  videoFramesPath?: string;
  currentFrame?: number;
  totalFrames?: number;
  onFrameChange?: (frame: number) => void;
  onBackToStream?: () => void;
  isSaving?: boolean;
  savedFrameCount?: number;
  onImageLoad?: (ref: React.RefObject<HTMLImageElement>, dimensions: {width: number, height: number}, sourcePath: string) => void;
  selectedArea?: DragArea | null;
  onAreaSelected?: (area: DragArea) => void;
  captureStartTime?: Date | null;
  captureEndTime?: Date | null;
  sx?: any;
}

export function VideoCapture({
  deviceModel = 'android_mobile',
  videoDevice = '/dev/video0',
  hostIp,
  hostPort,
  videoFramesPath,
  currentFrame = 0,
  totalFrames = 0,
  onFrameChange,
  onBackToStream,
  isSaving = false,
  savedFrameCount = 0,
  onImageLoad,
  selectedArea,
  onAreaSelected,
  captureStartTime,
  captureEndTime,
  sx = {}
}: VideoCaptureProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentValue, setCurrentValue] = useState(currentFrame);
  const imageRef = useRef<HTMLImageElement>(null);
  
  // State for timestamped capture images
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);

  // Get layout configuration based on device model
  const layoutConfig = getStreamViewerLayout(deviceModel);

  // Generate timestamped frame URLs based on capture duration (1 frame per second)
  const generateCaptureFrameUrls = (startTime: Date, frameCount: number) => {
    console.log(`[@component:VideoCapture] Generating ${frameCount} frame URLs starting from:`, startTime);
    
    const imageUrls: string[] = [];
    
    for (let i = 0; i < frameCount; i++) {
      // Calculate timestamp for each frame (1 second intervals)
      const frameTime = new Date(startTime.getTime() + (i * 1000)); // Add i seconds
      
      // Format timestamp in Zurich timezone: YYYYMMDDHHMMSS
      const zurichTime = new Date(frameTime.toLocaleString("en-US", {timeZone: "Europe/Zurich"}));
      const year = zurichTime.getFullYear();
      const month = String(zurichTime.getMonth() + 1).padStart(2, '0');
      const day = String(zurichTime.getDate()).padStart(2, '0');
      const hours = String(zurichTime.getHours()).padStart(2, '0');
      const minutes = String(zurichTime.getMinutes()).padStart(2, '0');
      const seconds = String(zurichTime.getSeconds()).padStart(2, '0');
      
      const frameTimestamp = `${year}${month}${day}${hours}${minutes}${seconds}`;
      const imageUrl = `https://${hostIp}:${hostPort}/stream/captures/capture_${frameTimestamp}.jpg`;
      imageUrls.push(imageUrl);
      
      console.log(`[@component:VideoCapture] Frame ${i + 1}: ${frameTimestamp} -> ${imageUrl}`);
    }
    
    return imageUrls;
  };

  // Load captured images when totalFrames is set (after capture is stopped)
  useEffect(() => {
    const loadCapturedImages = async () => {
      if (totalFrames === 0 || !hostIp || !hostPort) {
        console.log('[@component:VideoCapture] No frames to load or missing host info');
        return;
      }
      
      console.log(`[@component:VideoCapture] Loading ${totalFrames} captured frames...`);
      setIsLoadingImages(true);
      
      try {
        // Get capture timing information from the server
        const response = await fetch('http://localhost:5009/api/virtualpytest/screen-definition/capture/timing');
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.start_time) {
            console.log('[@component:VideoCapture] Got capture timing from server:', data);
            
            const startTime = new Date(data.start_time);
            setCaptureStartTime(startTime);
            
            if (data.end_time) {
              setCaptureEndTime(new Date(data.end_time));
            }
            
            // Generate frame URLs based on actual start time and frame count
            const frameUrls = generateCaptureFrameUrls(startTime, totalFrames);
            setCapturedImages(frameUrls);
            
            console.log(`[@component:VideoCapture] Generated ${frameUrls.length} frame URLs`);
          } else {
            console.warn('[@component:VideoCapture] No timing info from server, using current time as fallback');
            // Fallback: use current time minus totalFrames seconds as start time
            const fallbackStartTime = new Date(Date.now() - (totalFrames * 1000));
            setCaptureStartTime(fallbackStartTime);
            
            const frameUrls = generateCaptureFrameUrls(fallbackStartTime, totalFrames);
            setCapturedImages(frameUrls);
          }
        } else {
          console.warn('[@component:VideoCapture] Failed to get timing info, using current time as fallback');
          // Fallback: use current time minus totalFrames seconds as start time
          const fallbackStartTime = new Date(Date.now() - (totalFrames * 1000));
          setCaptureStartTime(fallbackStartTime);
          
          const frameUrls = generateCaptureFrameUrls(fallbackStartTime, totalFrames);
          setCapturedImages(frameUrls);
        }
      } catch (error) {
        console.error('[@component:VideoCapture] Error getting capture timing:', error);
        // Fallback: use current time minus totalFrames seconds as start time
        const fallbackStartTime = new Date(Date.now() - (totalFrames * 1000));
        setCaptureStartTime(fallbackStartTime);
        
        const frameUrls = generateCaptureFrameUrls(fallbackStartTime, totalFrames);
        setCapturedImages(frameUrls);
      } finally {
        setIsLoadingImages(false);
      }
    };

    loadCapturedImages();
  }, [totalFrames, hostIp, hostPort]);

  // Handle frame playback for captured images
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && capturedImages.length > 0) {
      interval = setInterval(() => {
        setCurrentValue((prev) => {
          const next = prev + 1;
          if (next >= capturedImages.length) {
            // Loop back to start
            return 0;
          }
          return next;
        });
      }, 1000); // 1 second per frame (adjustable)
    }
    return () => clearInterval(interval);
  }, [isPlaying, capturedImages.length]);

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

  // Handle image load to pass ref and dimensions to parent
  const handleImageLoad = () => {
    if (imageRef.current && onImageLoad) {
      const img = imageRef.current;
      const dimensions = {
        width: img.naturalWidth,
        height: img.naturalHeight
      };
      const sourcePath = capturedImages[currentValue] || '';
      onImageLoad(imageRef, dimensions, sourcePath);
    }
  };

  // Get current image URL
  const currentImageUrl = useMemo(() => {
    if (capturedImages.length === 0) return '';
    
    const imageUrl = capturedImages[currentValue] || capturedImages[0];
    // Add cache busting parameter
    const separator = imageUrl.includes('?') ? '&' : '?';
    return `${imageUrl}${separator}t=${Date.now()}`;
  }, [capturedImages, currentValue]);

  // Determine if drag selection should be enabled
  const allowDragSelection = capturedImages.length > 0 && onAreaSelected && imageRef.current;

  return (
    <Box sx={{ 
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'transparent',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      MozUserSelect: 'none',
      msUserSelect: 'none',
      ...sx 
    }}>
      {/* Header with capture info - only show when we have frames */}
      {capturedImages.length > 0 && (
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 8px',
          borderBottom: '1px solid #333'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* Status indicator */}
            <Box sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: '#4caf50',
              marginRight: 1
            }} />
            <Typography variant="caption" sx={{ color: '#ffffff', fontSize: '10px' }}>
              CAPTURED FRAMES
            </Typography>
          </Box>
          
          {/* Frame count */}
          <Typography variant="caption" sx={{ color: '#cccccc', fontSize: '10px' }}>
            {capturedImages.length} frames
          </Typography>
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
        {/* Drag Selection Overlay - lower z-index */}
        {allowDragSelection && (
          <DragSelectionOverlay
            imageRef={imageRef}
            onAreaSelected={onAreaSelected}
            selectedArea={selectedArea || null}
            sx={{ zIndex: 5 }}
          />
        )}

        {/* Captured images display */}
        {capturedImages.length > 0 && currentImageUrl && (
          <img 
            ref={imageRef}
            src={currentImageUrl}
            alt={`Captured Frame ${currentValue + 1}`}
            style={{
              maxWidth: layoutConfig.isMobileModel ? 'auto' : '100%',
              maxHeight: '100%',
              width: layoutConfig.isMobileModel ? 'auto' : '100%',
              height: 'auto',
              objectFit: layoutConfig.objectFit,
              backgroundColor: 'transparent'
            }}
            draggable={false}
            onLoad={handleImageLoad}
            onError={(e) => {
              console.error(`[@component:VideoCapture] Failed to load image: ${(e.target as HTMLImageElement).src}`);
              // Keep the current image instead of showing an error placeholder
            }}
          />
        )}

        {/* Loading state */}
        {isLoadingImages && (
          <Box sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
          }}>
            <Box sx={{
              display: 'flex',
              gap: 1,
              alignItems: 'center',
              mb: 2
            }}>
              {[0, 1, 2].map((index) => (
                <Box
                  key={index}
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: '#4caf50',
                    animation: 'loadPulse 1.4s ease-in-out infinite both',
                    animationDelay: `${index * 0.16}s`,
                    '@keyframes loadPulse': {
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
            <Typography variant="body2" sx={{ color: '#ffffff', textAlign: 'center' }}>
              Loading captured frames...
            </Typography>
          </Box>
        )}

        {/* Placeholder when no frames available */}
        {!isLoadingImages && capturedImages.length === 0 && (
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
              No Captured Frames Available
            </Typography>
          </Box>
        )}
      </Box>

      {/* Playback controls - only show when we have captured frames - higher z-index */}
      {capturedImages.length > 0 && !isLoadingImages && (
        <Box sx={{ 
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
          p: 1,
          backgroundColor: 'transparent',
          zIndex: 15 // Higher than drag overlay
        }}>
          {/* Play/Pause button - bottom left */}
          <Box sx={{ 
            position: 'absolute',
            bottom: 8,
            left: 8,
            zIndex: 20 // Even higher to ensure clickability
          }}>
            <IconButton 
              size="medium" 
              onClick={handlePlayPause}
              sx={{ 
                color: '#ffffff',
                backgroundColor: 'rgba(255,255,255,0.1)',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.2)',
                },
                zIndex: 20 // Ensure button is clickable
              }}
            >
              {isPlaying ? <Pause /> : <PlayArrow />}
            </IconButton>
          </Box>

          {/* Frame counter - bottom right */}
          <Box sx={{ 
            position: 'absolute',
            bottom: 16,
            right: 16,
            zIndex: 20
          }}>
            <Typography variant="caption" sx={{ 
              color: '#ffffff', 
              fontSize: '0.8rem',
              textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
            }}>
              {currentValue + 1} / {capturedImages.length}
            </Typography>
          </Box>

          {/* Scrubber - centered horizontally, at bottom */}
          <Box sx={{
            position: 'absolute',
            bottom: 12,
            left: '80px',
            right: '80px',
            zIndex: 20
          }}>
            <Slider
              value={currentValue}
              min={0}
              max={Math.max(0, capturedImages.length - 1)}
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
                }
              }}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
}

export default VideoCapture; 
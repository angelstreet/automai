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
import { DragSelectionOverlay } from './UserInterface_DragSelectionOverlay';
import { getStreamViewerLayout } from '../../config/layoutConfig';
import { useRegistration } from '../../contexts/RegistrationContext';

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
  isCapturing?: boolean;
  sx?: any;
  selectedHostDevice?: any;
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
  isCapturing = false,
  sx = {},
  selectedHostDevice
}: VideoCaptureProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentValue, setCurrentValue] = useState(currentFrame);
  const imageRef = useRef<HTMLImageElement>(null);
  
  // State for timestamped capture images
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  
  // State for recording timer
  const [recordingTime, setRecordingTime] = useState(0);

  // Get layout configuration based on device model
  const layoutConfig = getStreamViewerLayout(deviceModel);

  // Recording timer effect - increments every second when capturing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isCapturing) {
      console.log('[@component:VideoCapture] Starting recording timer');
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000); // Increment every second
    } else {
      console.log('[@component:VideoCapture] Stopping recording timer, resetting to 0');
      setRecordingTime(0); // Reset timer when not capturing
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isCapturing]);

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
      // Always use port 444, matching ScreenDefinitionEditor's URL construction
      const imageUrl = `https://${hostIp}:444/stream/captures/capture_${frameTimestamp}.jpg`;
      imageUrls.push(imageUrl);
      
      console.log(`[@component:VideoCapture] Frame ${i + 1}: ${frameTimestamp} -> ${imageUrl}`);
    }
    
    return imageUrls;
  };

  // Generate frame URLs when we have the required data
  useEffect(() => {
    if (totalFrames === 0 || !hostIp || !hostPort) {
      console.log('[@component:VideoCapture] No frames to load or missing host info', {
        totalFrames,
        hostIp,
        hostPort
      });
      setCapturedImages([]);
      return;
    }
    
    console.log(`[@component:VideoCapture] Generating ${totalFrames} frame URLs with host: ${hostIp}:444 (using fixed port 444)`);
    
    // Use the passed-in capture start time if available
    if (captureStartTime) {
      console.log('[@component:VideoCapture] Using passed capture start time:', captureStartTime);
      const frameUrls = generateCaptureFrameUrls(captureStartTime, totalFrames);
      setCapturedImages(frameUrls);
      console.log(`[@component:VideoCapture] Generated ${frameUrls.length} frame URLs:`, frameUrls.slice(0, 3)); // Log first 3 URLs
    } else {
      console.warn('[@component:VideoCapture] No capture start time provided, using current time as fallback');
      // Fallback: use current time minus totalFrames seconds as start time
      const fallbackStartTime = new Date(Date.now() - (totalFrames * 1000));
      const frameUrls = generateCaptureFrameUrls(fallbackStartTime, totalFrames);
      setCapturedImages(frameUrls);
      console.log(`[@component:VideoCapture] Generated ${frameUrls.length} fallback frame URLs:`, frameUrls.slice(0, 3)); // Log first 3 URLs
    }
  }, [totalFrames, hostIp, hostPort, captureStartTime]);

  // Handle frame playback for captured images
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && capturedImages.length > 0) {
      interval = setInterval(() => {
        setCurrentValue((prev) => {
          const next = prev + 1;
          if (next >= capturedImages.length) {
            // Stop playing when reaching the last frame
            console.log('[@component:VideoCapture] Reached last frame, stopping playback');
            setIsPlaying(false);
            return capturedImages.length - 1; // Stay on last frame
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

  // Get image URL using server route instead of AV controller proxy
  const imageUrl = useMemo(() => {
    const screenshotPath = capturedImages[currentValue] || capturedImages[0];
    if (!screenshotPath) return '';
    
    console.log(`[@component:VideoCapture] Processing image path: ${screenshotPath}`);
    
    // Handle data URLs (base64) - return as is
    if (screenshotPath.startsWith('data:')) {
      console.log('[@component:VideoCapture] Using data URL');
      return screenshotPath;
    }
    
    // Handle full URLs - return as is  
    if (screenshotPath.startsWith('http')) {
      console.log('[@component:VideoCapture] Using complete URL');
      return screenshotPath;
    }
    
    // For file paths, use server route for image serving
    if (!selectedHostDevice) {
      console.error('[@component:VideoCapture] No host device available for image serving');
      return '';
    }
    
    console.log('[@component:VideoCapture] Using server route for image serving');
    
    // Extract filename from path
    const filename = screenshotPath.split('/').pop()?.split('?')[0];
    if (!filename) {
      console.error(`[@component:VideoCapture] Failed to extract filename: ${screenshotPath}`);
      return '';
    }

    // Use server route to serve images
    try {
      const imageUrl = `/server/av/screenshot/${filename}?host_name=${selectedHostDevice.host_name}`;
      console.log(`[@component:VideoCapture] Generated image URL: ${imageUrl}`);
      return imageUrl;
    } catch (error) {
      console.error('[@component:VideoCapture] Error building image URL:', error);
      return '';
    }
  }, [capturedImages, currentValue, selectedHostDevice]);

  // Determine if drag selection should be enabled
  const allowDragSelection = capturedImages.length > 0 && onAreaSelected && imageRef.current;

  // Format recording time as MM:SS
  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCapture = async () => {
    if (!selectedHostDevice) {
      console.error('[@component:VideoCapture] No host device selected for capture');
      return;
    }
    
    setIsCapturing(true);
    setCaptureError(null);
    
    try {
      console.log('[@component:VideoCapture] Starting capture using server route...');
      
      // Use server route instead of AV controller proxy
      const response = await fetch(`/server/av/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host_name: selectedHostDevice.host_name
        })
      });
      
      const result = await response.json();
      
      if (result.success && result.imagePath) {
        const newImages = [...capturedImages, result.imagePath];
        setCapturedImages(newImages);
        setCurrentValue(newImages.length - 1);
        console.log(`[@component:VideoCapture] Capture successful: ${result.imagePath}`);
      } else {
        throw new Error(result.error || 'Capture failed');
      }
    } catch (error: any) {
      console.error('[@component:VideoCapture] Capture failed:', error);
      setCaptureError(error.message || 'Failed to capture image');
    } finally {
      setIsCapturing(false);
    }
  };

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
      {/* Header with capture info - show when recording or when we have frames */}
      {(isCapturing || capturedImages.length > 0) && (
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 8px',
          borderBottom: '1px solid #333'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* Status indicator - blinking red when recording, green when showing captured frames */}
            <Box sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: isCapturing ? '#ff4444' : '#4caf50',
              marginRight: 1,
              // Add blinking animation when recording
              ...(isCapturing && {
                animation: 'blink 1s infinite',
                '@keyframes blink': {
                  '0%, 50%': { opacity: 1 },
                  '51%, 100%': { opacity: 0.3 },
                },
              }),
            }} />
            <Typography variant="caption" sx={{ color: '#ffffff', fontSize: '10px' }}>
              {isCapturing ? 'RECORDING' : 'CAPTURED FRAMES'}
            </Typography>
          </Box>
          
          {/* Timer when recording, frame count when showing captured frames */}
          <Typography variant="caption" sx={{ color: '#cccccc', fontSize: '10px' }}>
            {isCapturing ? formatRecordingTime(recordingTime) : `${capturedImages.length} frames`}
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

        {/* Captured images display - same logic as ScreenshotCapture */}
        {capturedImages.length > 0 && imageUrl && !isCapturing && (
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
              backgroundColor: 'transparent'
            }}
            draggable={false}
            onLoad={handleImageLoad}
            onError={(e) => {
              const imgSrc = (e.target as HTMLImageElement).src;
              console.error(`[@component:VideoCapture] Failed to load image: ${imgSrc}`);
              
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
        )}

        {/* Loading state when recording */}
        {isCapturing && (
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.7)',
            zIndex: 10
          }}>
            {/* Large recording timer display */}
            <Typography variant="h4" sx={{ 
              color: '#ff4444', 
              fontWeight: 'bold',
              mb: 2,
              fontFamily: 'monospace'
            }}>
              {formatRecordingTime(recordingTime)}
            </Typography>
            
            {/* Simple carousel-style loading */}
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
                    backgroundColor: '#ff4444',
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
            <Typography variant="caption" sx={{ color: '#ffffff', textAlign: 'center' }}>
              Recording in progress...
            </Typography>
          </Box>
        )}

        {/* Placeholder when no frames available and not recording */}
        {capturedImages.length === 0 && !isCapturing && (
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
      {capturedImages.length > 0 && (
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
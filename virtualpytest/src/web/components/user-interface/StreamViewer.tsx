import React, { useRef, useEffect, useState } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { PlayArrow, Stop, Camera } from '@mui/icons-material';
import { CapturePreviewEditor } from './CapturePreviewEditor';

interface StreamViewerProps {
  streamUrl?: string;
  isConnected: boolean;
  width?: string | number;
  height?: string | number;
  lastScreenshotPath?: string | null;
  previewMode?: 'screenshot' | 'video';
  onScreenshotTaken?: (path: string) => void;
  isCompactView?: boolean;
  streamStatus?: 'running' | 'stopped' | 'unknown';
  onStreamStatusChange?: (status: 'running' | 'stopped' | 'unknown') => void;
  sx?: any;
}

export function StreamViewer({ 
  streamUrl, 
  isConnected, 
  width = '100%', 
  height = '100%',
  lastScreenshotPath,
  previewMode = 'screenshot',
  onScreenshotTaken,
  isCompactView = false,
  streamStatus = 'unknown',
  onStreamStatusChange,
  sx = {} 
}: StreamViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [streamLoaded, setStreamLoaded] = useState(false);
  const [showPreview, setShowPreview] = useState(!!lastScreenshotPath);
  const [screenshotPath, setScreenshotPath] = useState<string | null>(lastScreenshotPath || null);

  // Update screenshot path when prop changes
  useEffect(() => {
    if (lastScreenshotPath !== undefined) {
      setScreenshotPath(lastScreenshotPath);
      if (lastScreenshotPath) {
        setShowPreview(true);
      }
    }
  }, [lastScreenshotPath]);

  // Clean up stream resources
  const cleanupStream = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = '';
      videoRef.current.load();
    }
    
    setStreamLoaded(false);
    setStreamError(null);
  };

  // Initialize stream when connected and URL is available
  useEffect(() => {
    if (isConnected && streamUrl && videoRef.current && streamStatus === 'running' && !showPreview) {
      initializeStream();
    } else {
      cleanupStream();
    }

    return () => {
      cleanupStream();
    };
  }, [isConnected, streamUrl, streamStatus, showPreview]);

  const handleTakeScreenshot = async () => {
    try {
      const response = await fetch('http://localhost:5009/api/virtualpytest/screen-definition/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_model: 'android_mobile' })
      });
      
      const data = await response.json();
      if (data.success) {
        setScreenshotPath(data.screenshot_path);
        setShowPreview(true);
        
        // Notify parent component
        if (onScreenshotTaken) {
          onScreenshotTaken(data.screenshot_path);
        }
      } else {
        console.error('[@component:StreamViewer] Screenshot failed:', data.error);
      }
    } catch (error) {
      console.error('[@component:StreamViewer] Screenshot request failed:', error);
    }
  };

  const initializeStream = async () => {
    if (!streamUrl || !videoRef.current) {
      setStreamError('Stream URL or video element not available');
      return;
    }

    setStreamError(null);
    setStreamLoaded(false);

    try {
      console.log('[@component:StreamViewer] Initializing stream:', streamUrl);
      
      // Clean up any existing stream first
      cleanupStream();
      
      // Dynamically import HLS.js
      const HLSModule = await import('hls.js');
      const HLS = HLSModule.default;
      
      if (!HLS.isSupported()) {
        console.log('[@component:StreamViewer] HLS.js not supported, trying native playback');
        // Try native HLS (Safari)
        if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
          videoRef.current.src = streamUrl;
          videoRef.current.addEventListener('loadedmetadata', () => {
            setStreamLoaded(true);
            videoRef.current?.play().catch((err) => {
              console.error('[@component:StreamViewer] Autoplay failed:', err);
            });
          });
          
          videoRef.current.addEventListener('error', () => {
            setStreamError('Stream error - Unable to play the stream');
          });
        } else {
          throw new Error('HLS is not supported in this browser');
        }
        return;
      }
      
      // Create HLS instance with low latency settings
      const hls = new HLS({
        enableWorker: true,
        lowLatencyMode: true,
        liveSyncDuration: 1,
        liveMaxLatencyDuration: 5,
        liveDurationInfinity: true,
        maxBufferLength: 5,
        maxMaxBufferLength: 10,
      });
      
      hlsRef.current = hls;
      
      // Setup event handlers
      hls.on(HLS.Events.MANIFEST_PARSED, () => {
        console.log('[@component:StreamViewer] Stream manifest parsed successfully');
        setStreamLoaded(true);
        videoRef.current?.play().catch((err) => {
          console.error('[@component:StreamViewer] Autoplay failed:', err);
        });
      });
      
      hls.on(HLS.Events.ERROR, (_: any, data: any) => {
        if (data.fatal) {
          console.error('[@component:StreamViewer] Fatal HLS error:', data.type, data.details);
          setStreamError(`Stream error: ${data.details || data.type}`);
          
          // Destroy instance on fatal error
          hls.destroy();
          hlsRef.current = null;
        } else {
          console.warn('[@component:StreamViewer] Non-fatal HLS error:', data.details);
        }
      });
      
      // Load and attach the stream
      hls.loadSource(streamUrl);
      hls.attachMedia(videoRef.current);
      
    } catch (error: any) {
      console.error('[@component:StreamViewer] Stream initialization failed:', error);
      setStreamError(error.message || 'Failed to initialize stream');
    }
  };

  return (
    <Box sx={{ 
      position: 'relative', 
      width, 
      height,
      backgroundColor: '#000000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      ...sx 
    }}>
      {/* Video element - only visible when stream is loaded and preview is not shown */}
      <video 
        ref={videoRef}
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%', 
          height: '100%', 
          objectFit: 'cover',
          display: streamLoaded && !showPreview ? 'block' : 'none',
          backgroundColor: '#000000'
        }}
        playsInline
        muted
      />
      
      {/* Screenshot preview - only visible when showPreview is true */}
      {showPreview && screenshotPath && (
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <CapturePreviewEditor
            mode={previewMode || 'screenshot'}
            screenshotPath={screenshotPath}
            sx={{ height: '100%' }}
          />
        </Box>
      )}
      
      {/* Placeholder/Error display */}
      {!streamLoaded && !showPreview && (
        <Box sx={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000000'
        }}>
          <Typography variant="caption" sx={{ color: '#666', textAlign: 'center' }}>
            {streamError ? streamError : 
             isConnected && streamUrl ? 'Loading stream...' : 
             'No Stream Available'}
          </Typography>
        </Box>
      )}
    </Box>
  );
} 
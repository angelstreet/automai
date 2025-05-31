import React, { useRef, useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';

interface StreamViewerProps {
  streamUrl?: string;
  isConnected: boolean;
  width?: string | number;
  height?: string | number;
  sx?: any;
}

export function StreamViewer({ 
  streamUrl, 
  isConnected, 
  width = '100%', 
  height = '100%',
  sx = {} 
}: StreamViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [streamLoaded, setStreamLoaded] = useState(false);

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
    if (isConnected && streamUrl && videoRef.current) {
      initializeStream();
    } else {
      cleanupStream();
    }

    return () => {
      cleanupStream();
    };
  }, [isConnected, streamUrl]);

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
      {/* Video element - always rendered but only visible when stream is loaded */}
      <video 
        ref={videoRef}
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%', 
          height: '100%', 
          objectFit: 'cover',
          display: streamLoaded ? 'block' : 'none',
          backgroundColor: '#000000'
        }}
        playsInline
        muted
      />
      
      {/* Placeholder/Error display */}
      {!streamLoaded && (
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
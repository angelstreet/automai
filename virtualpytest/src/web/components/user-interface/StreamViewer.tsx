import React, { useRef, useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import Hls from 'hls.js';

interface StreamViewerProps {
  streamUrl?: string;
  isStreamActive?: boolean;
  sx?: any;
}

export function StreamViewer({
  streamUrl,
  isStreamActive = false,
  sx = {}
}: StreamViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [streamLoaded, setStreamLoaded] = useState(false);
  const [currentStreamUrl, setCurrentStreamUrl] = useState<string | null>(null);

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

  // Initialize stream when URL is available and active
  useEffect(() => {
    if (streamUrl && isStreamActive && videoRef.current) {
      // Only initialize if URL changed or no stream is loaded
      if (currentStreamUrl !== streamUrl || !hlsRef.current) {
        console.log('[@component:StreamViewer] Stream URL changed or no stream loaded, initializing:', streamUrl);
        initializeStream();
      }
    } else if (!isStreamActive) {
      cleanupStream();
    }

    return () => {
      // Only cleanup on unmount, not on every effect run
    };
  }, [streamUrl, isStreamActive]);

  const initializeStream = async () => {
    if (!streamUrl || !videoRef.current) {
      setStreamError('Stream URL or video element not available');
      return;
    }

    setStreamError(null);
    setStreamLoaded(false);

    try {
      console.log('[@component:StreamViewer] Initializing stream:', streamUrl);
      
      // Only cleanup if URL changed
      if (currentStreamUrl !== streamUrl) {
        cleanupStream();
      }
      
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
      width: '100%',
      height: '100%',
      backgroundColor: '#000000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      MozUserSelect: 'none',
      msUserSelect: 'none',
      ...sx 
    }}>
      {/* Video element - visible when stream is loaded */}
      <video 
        ref={videoRef}
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%', 
          height: '100%', 
          objectFit: 'cover',
          backgroundColor: '#000000',
          display: streamLoaded ? 'block' : 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          pointerEvents: 'none'
        }}
        playsInline
        muted
        draggable={false}
      />
      
      {/* Loading/Error display */}
      {!streamLoaded && streamUrl && isStreamActive && (
        <Box sx={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent'
        }}>
          <Typography variant="caption" sx={{ color: '#666666', textAlign: 'center' }}>
            {streamError ? streamError : 'Loading stream...'}
          </Typography>
        </Box>
      )}
      
      {/* Stream not available placeholder */}
      {(!streamUrl || !isStreamActive) && (
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
          gap: 2
        }}>
          {!isStreamActive ? (
            <>
              <Typography variant="h6" sx={{ color: '#666666', textAlign: 'center' }}>
                Stream Offline
              </Typography>
              <Typography variant="caption" sx={{ color: '#666666', textAlign: 'center' }}>
                Start the stream service to view live video
              </Typography>
            </>
          ) : (
            <>
              <Typography variant="h6" sx={{ color: '#666666', textAlign: 'center' }}>
                No Stream URL
              </Typography>
              <Typography variant="caption" sx={{ color: '#666666', textAlign: 'center' }}>
                Stream URL not configured
              </Typography>
            </>
          )}
        </Box>
      )}
    </Box>
  );
}

export default StreamViewer; 
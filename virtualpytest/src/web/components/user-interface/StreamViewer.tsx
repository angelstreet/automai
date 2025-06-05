import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { StreamViewerLayoutConfig, getStreamViewerLayout } from '../../../config/layoutConfig';
import { StreamClickOverlay } from './StreamClickOverlay';

interface StreamViewerProps {
  streamUrl?: string;
  isStreamActive?: boolean;
  isCapturing?: boolean;
  sx?: any;
  videoElementRef?: React.RefObject<HTMLVideoElement>;
  model?: string;
  layoutConfig?: StreamViewerLayoutConfig; // Allow direct override if needed
  // New props for click functionality
  enableClick?: boolean;
  deviceResolution?: { width: number; height: number };
  deviceId?: string;
  onTap?: (x: number, y: number) => void;
}

export function StreamViewer({
  streamUrl,
  isStreamActive = false,
  isCapturing = false,
  sx = {},
  videoElementRef,
  model,
  layoutConfig,
  enableClick,
  deviceResolution,
  deviceId,
  onTap,
}: StreamViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [streamLoaded, setStreamLoaded] = useState(false);
  const [currentStreamUrl, setCurrentStreamUrl] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [requiresUserInteraction, setRequiresUserInteraction] = useState(false);
  const [useNativePlayer, setUseNativePlayer] = useState(false);
  const maxRetries = 3; // Reduced from 5
  const retryDelay = 2000; // Reduced from 3000
  const lastInitTime = useRef<number>(0);

  // Debug component lifecycle
  useEffect(() => {
    console.log('[@component:StreamViewer] Component mounted with props:', {
      streamUrl,
      isStreamActive,
      isCapturing,
      model,
      layoutConfig,
      hasVideoRef: !!videoRef.current
    });
    
    return () => {
      console.log('[@component:StreamViewer] Component unmounting');
    };
  }, []); // Empty dependency array - only runs on mount/unmount

  // Use the provided layout config or get it from the model type
  const finalLayoutConfig = layoutConfig || getStreamViewerLayout(model);

  // Expose video ref to parent if provided
  useEffect(() => {
    if (videoElementRef && videoRef.current) {
      (videoElementRef as any).current = videoRef.current;
    }
  }, [videoElementRef]);

  // Clean up stream resources
  const cleanupStream = useCallback(() => {
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch (error) {
        console.warn('[@component:StreamViewer] Error destroying HLS instance:', error);
      }
      hlsRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = '';
      videoRef.current.load();
    }

    setStreamLoaded(false);
    setStreamError(null);
  }, []);

  // Attempt to play the video, handling autoplay restrictions
  const attemptPlay = useCallback(() => {
    if (!videoRef.current) return;

    const playPromise = videoRef.current.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('[@component:StreamViewer] Autoplay failed:', err.message);
        if (err.name === 'NotAllowedError' || err.message.includes('user interaction')) {
          setRequiresUserInteraction(true);
        } else {
          console.warn('[@component:StreamViewer] Play failed, but continuing:', err.message);
        }
      });
    }
  }, []);

  // Handle user-initiated play
  const handleUserPlay = useCallback(() => {
    setRequiresUserInteraction(false);
    attemptPlay();
  }, [attemptPlay]);

  // Try native HTML5 video as fallback
  const tryNativePlayback = useCallback(async () => {
    if (!streamUrl || !videoRef.current) return false;

    console.log('[@component:StreamViewer] Trying native HTML5 playback');
    setUseNativePlayer(true);
    
    try {
      // Clean up any existing HLS
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      const video = videoRef.current;
      
      // Set up event listeners for native playback
      const handleLoadedMetadata = () => {
        console.log('[@component:StreamViewer] Native playback loaded successfully');
        setStreamLoaded(true);
        setStreamError(null);
        setRetryCount(0);
        attemptPlay();
      };

      const handleError = (e: any) => {
        console.warn('[@component:StreamViewer] Native playback error:', e);
        setStreamError('Stream connection issues. Retrying...');
      };

      const handleCanPlay = () => {
        setStreamLoaded(true);
        setStreamError(null);
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('error', handleError);
      video.addEventListener('canplay', handleCanPlay);

      // Try direct URL first, then with cache busting
      video.src = streamUrl + (streamUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
      video.load();

      return true;
    } catch (error) {
      console.error('[@component:StreamViewer] Native playback setup failed:', error);
      return false;
    }
  }, [streamUrl, attemptPlay]);

  // Initialize or reinitialize stream with simplified approach
  const initializeStream = useCallback(async () => {
    const now = Date.now();
    if (now - lastInitTime.current < 1000) { // Reduced debounce
      return;
    }
    lastInitTime.current = now;

    if (!streamUrl || !videoRef.current) {
      setStreamError('Stream URL or video element not available');
      return;
    }

    setStreamError(null);
    setStreamLoaded(false);
    setRequiresUserInteraction(false);

    // If we've had too many failures, try native playback first
    if (retryCount >= 2 || useNativePlayer) {
      const nativeSuccess = await tryNativePlayback();
      if (nativeSuccess) return;
    }

    try {
      console.log('[@component:StreamViewer] Initializing HLS stream:', streamUrl);

      if (currentStreamUrl !== streamUrl || hlsRef.current) {
        cleanupStream();
      }

      setCurrentStreamUrl(streamUrl);

      // Dynamic import of HLS.js
      const HLSModule = await import('hls.js');
      const HLS = HLSModule.default;

      // Check if HLS is supported
      if (!HLS.isSupported()) {
        console.log('[@component:StreamViewer] HLS.js not supported, using native playback');
        await tryNativePlayback();
        return;
      }

      // Create HLS instance with simplified, robust config
      const hls = new HLS({
        // Simplified config - more like VLC's approach
        enableWorker: false, // Disable worker to avoid parsing issues
        lowLatencyMode: false, // Disable low latency for stability
        liveSyncDuration: 3, // Increased for stability
        liveMaxLatencyDuration: 10, // Increased for stability
        maxBufferLength: 30, // Increased buffer
        maxMaxBufferLength: 60, // Increased max buffer
        backBufferLength: 10, // Keep some back buffer
        maxBufferSize: 60 * 1000 * 1000, // 60MB buffer
        maxBufferHole: 0.5, // Allow small holes
        // Error recovery
        fragLoadingTimeOut: 20000, // 20 second timeout
        manifestLoadingTimeOut: 10000, // 10 second timeout
        levelLoadingTimeOut: 10000, // 10 second timeout
      });

      hlsRef.current = hls;

      // Simplified event handling
      hls.on(HLS.Events.MANIFEST_PARSED, () => {
        console.log('[@component:StreamViewer] HLS manifest parsed successfully');
        setStreamLoaded(true);
        setRetryCount(0);
        attemptPlay();
      });

      hls.on(HLS.Events.ERROR, (_: any, data: any) => {
        console.warn('[@component:StreamViewer] HLS error:', data.type, data.details);
        
        if (data.fatal) {
          console.error('[@component:StreamViewer] Fatal HLS error, trying native playback');
          // Don't retry HLS, switch to native immediately
          setUseNativePlayer(true);
          setTimeout(() => tryNativePlayback(), 500);
        } else {
          // Non-fatal errors - try to recover
          if (data.details === 'fragParsingError' || data.details === 'fragLoadError') {
            console.log('[@component:StreamViewer] Fragment error, attempting HLS recovery');
            try {
              if (data.details === 'fragParsingError') {
                hls.recoverMediaError();
              } else {
                hls.startLoad();
              }
            } catch (recoveryError) {
              console.warn('[@component:StreamViewer] HLS recovery failed, switching to native');
              setUseNativePlayer(true);
              setTimeout(() => tryNativePlayback(), 500);
            }
          }
        }
      });

      // Load the stream
      hls.loadSource(streamUrl);
      hls.attachMedia(videoRef.current);

    } catch (error: any) {
      console.error('[@component:StreamViewer] HLS initialization failed, trying native:', error);
      await tryNativePlayback();
    }
  }, [streamUrl, currentStreamUrl, cleanupStream, attemptPlay, retryCount, useNativePlayer, tryNativePlayback]);

  // Handle stream errors with simplified retry logic
  const handleStreamError = useCallback(() => {
    if (retryCount >= maxRetries) {
      console.warn('[@component:StreamViewer] Max retries reached, switching to native playback');
      setUseNativePlayer(true);
      setTimeout(() => tryNativePlayback(), 1000);
      return;
    }

    setRetryCount((prev) => prev + 1);
    console.log(`[@component:StreamViewer] Retrying stream (${retryCount + 1}/${maxRetries})`);

    const timeout = setTimeout(() => {
      if (isStreamActive && streamUrl) {
        initializeStream();
      }
    }, retryDelay);

    return () => clearTimeout(timeout);
  }, [retryCount, isStreamActive, streamUrl, initializeStream, maxRetries, retryDelay, tryNativePlayback]);

  // Handle tab visibility changes - simplified
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isStreamActive && streamUrl) {
        // Reset retry count when tab becomes visible
        setRetryCount(0);
        setTimeout(() => initializeStream(), 1000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isStreamActive, streamUrl, initializeStream]);

  // Initialize stream when URL is available and active
  useEffect(() => {
    if (streamUrl && isStreamActive && videoRef.current) {
      console.log('[@component:StreamViewer] Stream URL changed, initializing:', streamUrl);
      // Reset state for new stream
      setUseNativePlayer(false);
      setRetryCount(0);
      setStreamLoaded(false); // Force reload by resetting loaded state
      setStreamError(null);
      
      // Add a small delay to ensure clean state reset
      setTimeout(() => {
        initializeStream();
      }, 100);
    } else if (!isStreamActive && videoRef.current) {
      cleanupStream();
    }

    return () => {
      cleanupStream();
    };
  }, [streamUrl, isStreamActive, initializeStream, cleanupStream]);

  // Log click overlay status
  useEffect(() => {
    if (enableClick) {
      const overlayEnabled = streamLoaded && !requiresUserInteraction && deviceResolution && videoRef.current;
      console.log('[@component:StreamViewer] Click overlay status:', {
        enabled: overlayEnabled,
        streamLoaded,
        requiresUserInteraction,
        hasDeviceResolution: !!deviceResolution,
        hasVideoRef: !!videoRef.current,
        deviceResolution
      });
    }
  }, [enableClick, streamLoaded, requiresUserInteraction, deviceResolution, videoRef.current]);

  return (
    <Box
      sx={{
        position: 'relative',
        width: finalLayoutConfig.isMobileModel ? '100%' : 'calc(100% + 200px)',
        maxWidth: finalLayoutConfig.isMobileModel ? 'none' : 'none',
        height: '100%',
        minHeight: finalLayoutConfig.minHeight,
        aspectRatio: finalLayoutConfig.aspectRatio,
        backgroundColor: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        ...(finalLayoutConfig.isMobileModel && {
          maxHeight: 'none',
          flexGrow: 1,
        }),
        ...(!finalLayoutConfig.isMobileModel && {
          margin: '0 auto',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }),
        ...sx,
      }}
    >
      <video
        ref={videoRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: finalLayoutConfig.objectFit,
          backgroundColor: '#000000',
          display: streamLoaded && !requiresUserInteraction ? 'block' : 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          pointerEvents: 'none',
        }}
        playsInline
        muted
        draggable={false}
        // Add some native video attributes for better compatibility
        preload="none"
        crossOrigin="anonymous"
      />

      {streamLoaded && requiresUserInteraction && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
          }}
        >
          <IconButton
            onClick={handleUserPlay}
            sx={{ color: '#ffffff', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          >
            <PlayArrowIcon fontSize="large" />
          </IconButton>
        </Box>
      )}

      {!streamLoaded && streamUrl && isStreamActive && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
            flexDirection: 'column',
            padding: 2,
            gap: 1,
          }}
        >
          <Typography variant="caption" sx={{ color: '#999999', textAlign: 'center' }}>
            {streamError
              ? retryCount < maxRetries
                ? `Connecting... (${retryCount + 1}/${maxRetries})`
                : 'Connecting with fallback player...'
              : 'Loading stream...'}
          </Typography>
          
          {streamError && (
            <Typography variant="caption" sx={{ color: '#777777', textAlign: 'center', fontSize: '0.65rem', maxWidth: '80%' }}>
              {useNativePlayer ? 'Using native player for better compatibility' : 'Stream will auto-reconnect'}
            </Typography>
          )}
        </Box>
      )}

      {/* Stream Click Overlay - only show when click is enabled and stream is loaded */}
      {enableClick && 
       streamLoaded && 
       !requiresUserInteraction && 
       deviceResolution && 
       videoRef.current && (
        <StreamClickOverlay
          videoRef={videoRef}
          deviceResolution={deviceResolution}
          deviceId={deviceId}
          onTap={onTap}
        />
      )}

      {(!streamUrl || !isStreamActive) && (
        <Box
          sx={{
            width: '100%',
            height: '100%',
            minHeight: finalLayoutConfig.minHeight,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
            border: '1px solid #333333',
            p: 2,
            gap: 2,
          }}
        >
          {!isStreamActive ? (
            <>
              <Typography variant="h6" sx={{ color: '#666666', textAlign: 'center' }}>
                Stream Offline
              </Typography>
              <Typography variant="caption" sx={{ color: '#666666', textAlign: 'center' }}>
                Stream service is not running. Press the refresh button to try again.
              </Typography>
            </>
          ) : (
            <>
              <Typography variant="h6" sx={{ color: '#666666', textAlign: 'center' }}>
                No Stream URL
              </Typography>
              <Typography variant="caption" sx={{ color: '#666666', textAlign: 'center' }}>
                Stream URL not configured in device settings.
              </Typography>
            </>
          )}
        </Box>
      )}
    </Box>
  );
}

export default React.memo(StreamViewer, (prevProps, nextProps) => {
  // Compare all props that could cause stream reinitialization
  const isEqual = prevProps.streamUrl === nextProps.streamUrl && 
         prevProps.isStreamActive === nextProps.isStreamActive &&
         prevProps.isCapturing === nextProps.isCapturing &&
         prevProps.model === nextProps.model &&
         prevProps.enableClick === nextProps.enableClick &&
         prevProps.deviceId === nextProps.deviceId &&
         prevProps.layoutConfig === nextProps.layoutConfig &&
         JSON.stringify(prevProps.sx) === JSON.stringify(nextProps.sx) &&
         JSON.stringify(prevProps.deviceResolution) === JSON.stringify(nextProps.deviceResolution);
  
  if (!isEqual) {
    console.log('[@component:StreamViewer] Props changed, component will re-render:', {
      streamUrl: prevProps.streamUrl !== nextProps.streamUrl ? { prev: prevProps.streamUrl, next: nextProps.streamUrl } : 'same',
      isStreamActive: prevProps.isStreamActive !== nextProps.isStreamActive ? { prev: prevProps.isStreamActive, next: nextProps.isStreamActive } : 'same',
      isCapturing: prevProps.isCapturing !== nextProps.isCapturing ? { prev: prevProps.isCapturing, next: nextProps.isCapturing } : 'same',
      model: prevProps.model !== nextProps.model ? { prev: prevProps.model, next: nextProps.model } : 'same',
      enableClick: prevProps.enableClick !== nextProps.enableClick ? { prev: prevProps.enableClick, next: nextProps.enableClick } : 'same',
      deviceId: prevProps.deviceId !== nextProps.deviceId ? { prev: prevProps.deviceId, next: nextProps.deviceId } : 'same',
      layoutConfig: prevProps.layoutConfig !== nextProps.layoutConfig ? { prev: prevProps.layoutConfig, next: nextProps.layoutConfig } : 'same',
      sx: JSON.stringify(prevProps.sx) !== JSON.stringify(nextProps.sx) ? { prev: prevProps.sx, next: nextProps.sx } : 'same',
      deviceResolution: JSON.stringify(prevProps.deviceResolution) !== JSON.stringify(nextProps.deviceResolution) ? { prev: prevProps.deviceResolution, next: nextProps.deviceResolution } : 'same',
    });
  }
  
  return isEqual;
});
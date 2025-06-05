import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import Hls from 'hls.js';
import { StreamViewerLayoutConfig, getStreamViewerLayout } from '../../../config/layoutConfig';

interface StreamViewerProps {
  streamUrl?: string;
  isStreamActive?: boolean;
  isCapturing?: boolean;
  sx?: any;
  videoElementRef?: React.RefObject<HTMLVideoElement>;
  model?: string;
  layoutConfig?: StreamViewerLayoutConfig; // Allow direct override if needed
}

export function StreamViewer({
  streamUrl,
  isStreamActive = false,
  isCapturing = false,
  sx = {},
  videoElementRef,
  model,
  layoutConfig,
}: StreamViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [streamLoaded, setStreamLoaded] = useState(false);
  const [currentStreamUrl, setCurrentStreamUrl] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [requiresUserInteraction, setRequiresUserInteraction] = useState(false);
  const maxRetries = 5;
  const retryDelay = 3000;
  const lastInitTime = useRef<number>(0);

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
  }, []);

  // Attempt to play the video, handling autoplay restrictions
  const attemptPlay = useCallback(() => {
    if (!videoRef.current) return;

    const playPromise = videoRef.current.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.error('[@component:StreamViewer] Autoplay failed:', err);
        if (
          err.name === 'AbortError' &&
          err.message.includes('background media was paused to save power')
        ) {
          setRequiresUserInteraction(true);
        } else {
          setStreamError('Playback failed: ' + err.message);
        }
      });
    }
  }, []);

  // Handle user-initiated play
  const handleUserPlay = useCallback(() => {
    setRequiresUserInteraction(false);
    attemptPlay();
  }, [attemptPlay]);

  // Initialize or reinitialize stream
  const initializeStream = useCallback(async () => {
    const now = Date.now();
    if (now - lastInitTime.current < 3000) {
      console.log('[@component:StreamViewer] Skipping stream initialization due to debounce');
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

    try {
      console.log('[@component:StreamViewer] Initializing stream:', streamUrl);

      if (currentStreamUrl !== streamUrl || hlsRef.current) {
        cleanupStream();
      }

      setCurrentStreamUrl(streamUrl);

      const HLSModule = await import('hls.js');
      const HLS = HLSModule.default;

      if (!HLS.isSupported()) {
        console.log('[@component:StreamViewer] HLS.js not supported, trying native playback');
        if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
          videoRef.current.src = streamUrl;
          videoRef.current.addEventListener('loadedmetadata', () => {
            setStreamLoaded(true);
            setRetryCount(0);
            attemptPlay();
          });

          videoRef.current.addEventListener('error', () => {
            setStreamError('Stream error - Unable to play the stream');
            handleStreamError();
          });
        } else {
          throw new Error('HLS is not supported in this browser');
        }
        return;
      }

      const hls = new HLS({
        enableWorker: true,
        lowLatencyMode: true,
        liveSyncDuration: 1,
        liveMaxLatencyDuration: 5,
        liveDurationInfinity: true,
        maxBufferLength: 10,
        maxMaxBufferLength: 20,
        backBufferLength: 0,
      });

      hlsRef.current = hls;

      hls.on(HLS.Events.MANIFEST_PARSED, () => {
        console.log('[@component:StreamViewer] Stream manifest parsed successfully');
        setStreamLoaded(true);
        setRetryCount(0);
        attemptPlay();
      });

      hls.on(HLS.Events.ERROR, (_: any, data: any) => {
        console.warn('[@component:StreamViewer] HLS error:', data.type, data.details);
        if (data.fatal) {
          console.error('[@component:StreamViewer] Fatal HLS error:', data.type, data.details);
          setStreamError(`Stream error: ${data.details || data.type}`);
          handleStreamError();
        } else if (data.details === 'bufferStalledError' || data.details === 'bufferNudgeOnStall') {
          console.log('[@component:StreamViewer] Buffer issue detected, attempting recovery');
          setStreamError('Buffering...');
          setTimeout(() => setStreamError(null), 2000);
        }
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(videoRef.current);
    } catch (error: any) {
      console.error('[@component:StreamViewer] Stream initialization failed:', error);
      setStreamError(error.message || 'Failed to initialize stream');
      handleStreamError();
    }
  }, [streamUrl, currentStreamUrl, cleanupStream, attemptPlay]);

  // Handle stream errors with retry logic
  const handleStreamError = useCallback(() => {
    if (retryCount >= maxRetries) {
      console.warn(`[@component:StreamViewer] Maximum retry attempts (${maxRetries}) reached, but will continue to retry less frequently`);
      // Still show an error but don't give up completely
      setStreamError('Stream connection issues. Retrying...');
      
      // Keep retrying but less frequently
      const timeout = setTimeout(() => {
        if (isStreamActive && streamUrl) {
          console.log(`[@component:StreamViewer] Continuing to retry stream connection after max retries...`);
          setRetryCount(0); // Reset retry count to start a new cycle
          initializeStream();
        }
      }, retryDelay * 2); // Longer delay after max retries
      
      return () => clearTimeout(timeout);
    }

    setRetryCount((prev) => prev + 1);
    console.log(`[@component:StreamViewer] Attempting to reconnect (${retryCount + 1}/${maxRetries})...`);

    const timeout = setTimeout(() => {
      if (isStreamActive && streamUrl) {
        initializeStream();
      }
    }, retryDelay);

    return () => clearTimeout(timeout);
  }, [retryCount, isStreamActive, streamUrl, initializeStream, maxRetries, retryDelay]);

  // Handle tab visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (hlsRef.current) {
          hlsRef.current.stopLoad();
        }
      } else if (isStreamActive && streamUrl) {
        initializeStream();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isStreamActive, streamUrl, initializeStream]);

  // Initialize stream when URL is available and active
  useEffect(() => {
    if (streamUrl && isStreamActive && videoRef.current) {
      console.log('[@component:StreamViewer] Stream URL or status changed, initializing:', streamUrl);
      initializeStream();
    } else if (!isStreamActive && videoRef.current) {
      // Stream inactive, clean up resources
      cleanupStream();
    }

    return () => {
      cleanupStream();
    };
  }, [streamUrl, isStreamActive, initializeStream, cleanupStream]);

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
      />

      {/* Red blinking dot during capture */}
      {isCapturing && (
        <Box sx={{
          position: 'absolute',
          top: 8,
          left: 8,
          width: 12,
          height: 12,
          borderRadius: '50%',
          backgroundColor: '#ff4444',
          zIndex: 10,
          animation: 'captureBlink 1s infinite',
          '@keyframes captureBlink': {
            '0%, 50%': { opacity: 1 },
            '51%, 100%': { opacity: 0.3 }
          }
        }} />
      )}

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
                ? `Reconnecting... (${retryCount + 1}/${maxRetries})`
                : `${streamError} Continue waiting or try restarting.`
              : 'Loading stream...'}
          </Typography>
          
          {streamError && (
            <Typography variant="caption" sx={{ color: '#777777', textAlign: 'center', fontSize: '0.65rem', maxWidth: '80%' }}>
              The stream will automatically reconnect. Make sure ffmpeg is running on the device.
            </Typography>
          )}
        </Box>
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
  return prevProps.streamUrl === nextProps.streamUrl && prevProps.isStreamActive === nextProps.isStreamActive;
});
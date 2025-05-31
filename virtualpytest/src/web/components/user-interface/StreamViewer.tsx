import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import Hls from 'hls.js';

interface StreamViewerProps {
  streamUrl?: string;
  isStreamActive?: boolean;
  sx?: any;
  videoElementRef?: React.RefObject<HTMLVideoElement>;
}

export function StreamViewer({
  streamUrl,
  isStreamActive = false,
  sx = {},
  videoElementRef,
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
      setStreamError('Maximum retry attempts reached. Please check the stream source.');
      return;
    }

    setRetryCount((prev) => prev + 1);
    console.log(`[@component:StreamViewer] Attempting to reconnect (${retryCount + 1}/${maxRetries})...`);

    const timeout = setTimeout(() => {
      if (isStreamActive && streamUrl) {
        initializeStream();
      }
    }, retryDelay);

    return () => clearTimeout(timeout);
  }, [retryCount, isStreamActive, streamUrl, initializeStream]);

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
    } else {
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
          objectFit: 'cover',
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
          }}
        >
          <Typography variant="caption" sx={{ color: '#666666', textAlign: 'center' }}>
            {streamError
              ? retryCount < maxRetries
                ? `Reconnecting... (${retryCount + 1}/${maxRetries})`
                : streamError
              : 'Loading stream...'}
          </Typography>
        </Box>
      )}

      {(!streamUrl || !isStreamActive) && (
        <Box
          sx={{
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
            gap: 2,
          }}
        >
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
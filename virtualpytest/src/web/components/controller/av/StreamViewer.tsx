import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { Box, Typography, IconButton } from '@mui/material';
import React, { useRef, useEffect, useState, useCallback } from 'react';

import { StreamViewerLayoutConfig, getStreamViewerLayout } from '../../../config/layoutConfig';
import { getZIndex } from '../../../utils/zIndexUtils';

interface StreamViewerProps {
  streamUrl?: string;
  isStreamActive?: boolean;
  isCapturing?: boolean;
  sx?: any;
  videoElementRef?: React.RefObject<HTMLVideoElement>;
  model?: string;
  layoutConfig?: StreamViewerLayoutConfig;
  isExpanded?: boolean;
}

export function StreamViewer({
  streamUrl,
  isStreamActive = false,
  isCapturing = false,
  sx = {},
  videoElementRef,
  model,
  layoutConfig,
  isExpanded = false,
}: StreamViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [streamLoaded, setStreamLoaded] = useState(false);
  const [currentStreamUrl, setCurrentStreamUrl] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [requiresUserInteraction, setRequiresUserInteraction] = useState(false);
  const [useNativePlayer, setUseNativePlayer] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const maxRetries = 3;
  const retryDelay = 2000;
  const lastInitTime = useRef<number>(0);

  useEffect(() => {
    console.log('[@component:StreamViewer] Component mounted with props:', {
      streamUrl,
      isStreamActive,
      isCapturing,
      model,
      layoutConfig,
      hasVideoRef: !!videoRef.current,
    });

    return () => {
      console.log('[@component:StreamViewer] Component unmounting');
    };
  }, []);

  const finalLayoutConfig = layoutConfig || getStreamViewerLayout(model);

  useEffect(() => {
    if (videoElementRef && videoRef.current) {
      (videoElementRef as any).current = videoRef.current;
    }
  }, [videoElementRef]);

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

  const handleUserPlay = useCallback(() => {
    setRequiresUserInteraction(false);
    attemptPlay();
  }, [attemptPlay]);

  const tryNativePlayback = useCallback(async () => {
    if (!streamUrl || !videoRef.current) return false;

    console.log('[@component:StreamViewer] Trying native HTML5 playback');
    setUseNativePlayer(true);

    try {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      const video = videoRef.current;

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

      video.src = streamUrl + (streamUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
      video.load();

      return true;
    } catch (error) {
      console.error('[@component:StreamViewer] Native playback setup failed:', error);
      return false;
    }
  }, [streamUrl, attemptPlay]);

  const initializeStream = useCallback(async () => {
    const now = Date.now();
    if (now - lastInitTime.current < 1000) {
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

      const HLSModule = await import('hls.js');
      const HLS = HLSModule.default;

      if (!HLS.isSupported()) {
        console.log('[@component:StreamViewer] HLS.js not supported, using native playback');
        await tryNativePlayback();
        return;
      }

      const hls = new HLS({
        enableWorker: false,
        lowLatencyMode: false,
        liveSyncDuration: 3,
        liveMaxLatencyDuration: 10,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        backBufferLength: 10,
        maxBufferSize: 60 * 1000 * 1000,
        maxBufferHole: 0.5,
        fragLoadingTimeOut: 20000,
        manifestLoadingTimeOut: 10000,
        levelLoadingTimeOut: 10000,
      });

      hlsRef.current = hls;

      hls.on(HLS.Events.MANIFEST_PARSED, () => {
        console.log('[@component:StreamViewer] HLS manifest parsed successfully');
        setStreamLoaded(true);
        setRetryCount(0);
        attemptPlay();
      });

      hls.on(HLS.Events.ERROR, (_event, data) => {
        // Ignore buffer stall errors - they are temporary and self-recovering
        if (data.details === 'bufferStalledError') {
          return;
        }

        if (data.fatal) {
          console.error('[@component:StreamViewer] Fatal HLS error, trying native playback');
          setUseNativePlayer(true);
          setTimeout(() => tryNativePlayback(), 500);
        } else {
          if (data.details === 'fragParsingError' || data.details === 'fragLoadError') {
            console.log('[@component:StreamViewer] Fragment error, attempting HLS recovery');
            try {
              hls.startLoad();
            } catch (recoveryError) {
              console.warn('[@component:StreamViewer] HLS recovery failed:', recoveryError);
              setStreamError('Stream connection issues. Retrying...');
              setTimeout(() => {
                setRetryCount((prev) => prev + 1);
              }, retryDelay);
            }
          } else {
            setStreamError('Stream connection issues. Retrying...');
          }
        }
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(videoRef.current);
    } catch (error: any) {
      console.error('[@component:StreamViewer] Stream initialization failed:', error);
      setStreamError(`Stream initialization failed: ${error.message}`);
      setTimeout(() => {
        setRetryCount((prev) => prev + 1);
      }, retryDelay);
    }
  }, [streamUrl]);

  const handleStreamError = useCallback(() => {
    if (retryCount >= maxRetries) {
      console.warn('[@component:StreamViewer] Max retries reached, switching to native playback');
      setUseNativePlayer(true);
      setTimeout(() => tryNativePlayback(), 1000);
      return;
    }

    console.log(
      `[@component:StreamViewer] Stream error, retrying in ${retryDelay}ms (attempt ${retryCount + 1}/${maxRetries})`,
    );

    setTimeout(() => {
      setRetryCount((prev) => {
        const newCount = prev + 1;
        console.log(`[@component:StreamViewer] Incrementing retry count: ${prev} -> ${newCount}`);
        return newCount;
      });
      initializeStream();
    }, retryDelay);
  }, [retryCount, maxRetries, retryDelay, initializeStream, tryNativePlayback, setUseNativePlayer]);

  useEffect(() => {
    if (streamError && retryCount < maxRetries) {
      console.log(
        `[@component:StreamViewer] Stream error detected, current retry count: ${retryCount}/${maxRetries}`,
      );
      handleStreamError();
    } else if (streamError && retryCount >= maxRetries) {
      console.warn(
        `[@component:StreamViewer] Max retries (${maxRetries}) reached, stopping retry attempts`,
      );
    }
  }, [streamError, retryCount, maxRetries, handleStreamError]);

  useEffect(() => {
    if (useNativePlayer && streamUrl && isStreamActive) {
      tryNativePlayback();
    }
  }, [useNativePlayer, streamUrl, isStreamActive, tryNativePlayback]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isStreamActive && streamUrl) {
        setRetryCount(0);
        setTimeout(() => initializeStream(), 1000);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isStreamActive, streamUrl, initializeStream]);

  useEffect(() => {
    if (streamUrl && isStreamActive && videoRef.current) {
      console.log('[@component:StreamViewer] Stream URL changed, initializing:', streamUrl);
      setUseNativePlayer(false);
      // Only reset retry count if the stream URL actually changed, not on every render
      if (currentStreamUrl !== streamUrl) {
        setRetryCount(0);
      }
      setStreamLoaded(false);
      setStreamError(null);

      setTimeout(() => {
        initializeStream();
      }, 100);
    } else if (!isStreamActive && videoRef.current) {
      cleanupStream();
    }

    return () => {
      cleanupStream();
    };
  }, [streamUrl, isStreamActive, currentStreamUrl, initializeStream, cleanupStream]);

  useEffect(() => {
    const checkVideoReady = () => {
      const ready = !!videoRef.current;
      if (ready !== isVideoReady) {
        setIsVideoReady(ready);
        console.log('[@component:StreamViewer] Video ready state changed:', ready);
      }
    };

    checkVideoReady();

    const interval = setInterval(checkVideoReady, 100);

    return () => clearInterval(interval);
  }, [streamLoaded, isVideoReady]);

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
        ...sx,
      }}
    >
      <video
        ref={videoRef}
        style={{
          width: finalLayoutConfig.isMobileModel ? 'auto' : '100%', // Mobile: auto width, Non-mobile: full width
          height: finalLayoutConfig.isMobileModel ? '100%' : 'auto', // Mobile: full height, Non-mobile: auto height
          objectFit: isExpanded ? 'fill' : finalLayoutConfig.objectFit || 'contain',
          backgroundColor: '#000000',
          display: streamLoaded ? 'block' : 'none',
        }}
        autoPlay
        playsInline
        muted
        draggable={false}
        preload="none"
        crossOrigin="anonymous"
      />

      {streamError && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: 'white',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: 2,
            borderRadius: 1,
            zIndex: getZIndex('STREAM_VIEWER'),
          }}
        >
          <Typography variant="body2" sx={{ mb: 1 }}>
            {streamError}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Retry {retryCount}/{maxRetries}
          </Typography>
        </Box>
      )}

      {!streamLoaded && !streamError && streamUrl && isStreamActive && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: 'white',
            zIndex: getZIndex('STREAM_VIEWER'),
          }}
        >
          <Typography variant="body2">Loading stream...</Typography>
        </Box>
      )}

      {requiresUserInteraction && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: 'white',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 3,
            borderRadius: 2,
            zIndex: getZIndex('STREAM_VIEWER'),
          }}
        >
          <Typography variant="body2" sx={{ mb: 2 }}>
            Click to start stream
          </Typography>
          <IconButton
            onClick={handleUserPlay}
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.3)',
              },
            }}
          >
            <PlayArrowIcon />
          </IconButton>
        </Box>
      )}

      {(!streamUrl || !isStreamActive) && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: 'text.secondary',
            zIndex: getZIndex('STREAM_VIEWER'),
          }}
        >
          <Typography variant="body2">No stream available</Typography>
        </Box>
      )}

      {isCapturing && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            backgroundColor: 'error.main',
            color: 'white',
            px: 1,
            py: 0.5,
            borderRadius: 1,
            fontSize: '0.75rem',
            zIndex: getZIndex('STREAM_VIEWER'),
          }}
        >
          RECORDING
        </Box>
      )}
    </Box>
  );
}

export default React.memo(StreamViewer, (prevProps, nextProps) => {
  const isEqual =
    prevProps.streamUrl === nextProps.streamUrl &&
    prevProps.isStreamActive === nextProps.isStreamActive &&
    prevProps.isCapturing === nextProps.isCapturing &&
    prevProps.model === nextProps.model &&
    prevProps.layoutConfig === nextProps.layoutConfig &&
    prevProps.isExpanded === nextProps.isExpanded &&
    JSON.stringify(prevProps.sx) === JSON.stringify(nextProps.sx);

  if (!isEqual) {
    console.log('[@component:StreamViewer] Props changed, component will re-render:', {
      streamUrl:
        prevProps.streamUrl !== nextProps.streamUrl
          ? { prev: prevProps.streamUrl, next: nextProps.streamUrl }
          : 'same',
      isStreamActive:
        prevProps.isStreamActive !== nextProps.isStreamActive
          ? { prev: prevProps.isStreamActive, next: nextProps.isStreamActive }
          : 'same',
      isCapturing:
        prevProps.isCapturing !== nextProps.isCapturing
          ? { prev: prevProps.isCapturing, next: nextProps.isCapturing }
          : 'same',
      model:
        prevProps.model !== nextProps.model
          ? { prev: prevProps.model, next: nextProps.model }
          : 'same',
      layoutConfig:
        prevProps.layoutConfig !== nextProps.layoutConfig
          ? { prev: prevProps.layoutConfig, next: nextProps.layoutConfig }
          : 'same',
      isExpanded:
        prevProps.isExpanded !== nextProps.isExpanded
          ? { prev: prevProps.isExpanded, next: nextProps.isExpanded }
          : 'same',
      sx:
        JSON.stringify(prevProps.sx) !== JSON.stringify(nextProps.sx)
          ? { prev: prevProps.sx, next: nextProps.sx }
          : 'same',
    });
  }

  return isEqual;
});

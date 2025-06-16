import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { Box, Typography, IconButton } from '@mui/material';
import React, { useRef, useEffect, useState, useCallback } from 'react';

import { StreamViewerLayoutConfig, getStreamViewerLayout } from '../../../config/layoutConfig';

interface StreamViewerProps {
  streamUrl?: string;
  isStreamActive?: boolean;
  isCapturing?: boolean;
  sx?: any;
  videoElementRef?: React.RefObject<HTMLVideoElement>;
  model?: string;
  layoutConfig?: StreamViewerLayoutConfig;
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
  const hlsRef = useRef<any>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [streamLoaded, setStreamLoaded] = useState(false);
  const [currentStreamUrl, setCurrentStreamUrl] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [requiresUserInteraction, setRequiresUserInteraction] = useState(false);
  const [useNativePlayer, setUseNativePlayer] = useState(false);
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

      hls.on(HLS.Events.ERROR, (_: any, data: any) => {
        console.warn('[@component:StreamViewer] HLS error:', data.type, data.details);

        if (data.fatal) {
          console.error('[@component:StreamViewer] Fatal HLS error, trying native playback');
          setUseNativePlayer(true);
          setTimeout(() => tryNativePlayback(), 500);
        } else {
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

      hls.loadSource(streamUrl);
      hls.attachMedia(videoRef.current);
    } catch (error: any) {
      console.error('[@component:StreamViewer] HLS initialization failed, trying native:', error);
      await tryNativePlayback();
    }
  }, [
    streamUrl,
    currentStreamUrl,
    cleanupStream,
    attemptPlay,
    retryCount,
    useNativePlayer,
    tryNativePlayback,
  ]);

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
  }, [
    retryCount,
    isStreamActive,
    streamUrl,
    initializeStream,
    maxRetries,
    retryDelay,
    tryNativePlayback,
  ]);

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
      setRetryCount(0);
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
            <Typography
              variant="caption"
              sx={{ color: '#777777', textAlign: 'center', fontSize: '0.65rem', maxWidth: '80%' }}
            >
              {useNativePlayer
                ? 'Using native player for better compatibility'
                : 'Stream will auto-reconnect'}
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
  const isEqual =
    prevProps.streamUrl === nextProps.streamUrl &&
    prevProps.isStreamActive === nextProps.isStreamActive &&
    prevProps.isCapturing === nextProps.isCapturing &&
    prevProps.model === nextProps.model &&
    prevProps.layoutConfig === nextProps.layoutConfig &&
    JSON.stringify(prevProps.sx) === JSON.stringify(nextProps.sx);

  if (!isEqual) {
    console.log('[@component:StreamViewer] Props changed, re-rendering');
  }

  return isEqual;
});

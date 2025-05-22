'use client';

import { useEffect, useRef, useState } from 'react';

interface RecStreamPreviewProps {
  streamUrl: string;
  title: string;
  onClick?: () => void;
}

export function RecStreamPreview({ streamUrl, title, onClick }: RecStreamPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDisconnected, setIsDisconnected] = useState(false);
  const connectionCheckRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const hlsRef = useRef<any>(null);
  const isDisconnectedRef = useRef(false);

  // Keep the ref in sync with the state
  useEffect(() => {
    isDisconnectedRef.current = isDisconnected;
  }, [isDisconnected]);

  useEffect(() => {
    let lastLoadedSegment = 0;

    async function setupStream() {
      try {
        setIsDisconnected(false);
        isDisconnectedRef.current = false;
        setError(null);
        setIsLoading(true);
        reconnectAttemptsRef.current = 0;

        // Clean up previous instance if it exists
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }

        const HLS = (await import('hls.js')).default;

        if (videoRef.current) {
          if (HLS.isSupported()) {
            console.log('[@component:RecStreamPreview] Setting up HLS stream:', streamUrl);

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

            hls.loadSource(streamUrl);
            hls.attachMedia(videoRef.current);

            hls.on(HLS.Events.MANIFEST_PARSED, () => {
              setIsLoading(false);
              videoRef.current?.play().catch((err) => {
                console.error('[@component:RecStreamPreview] Autoplay failed:', err);
              });
            });

            // Track fragment loading to detect stalled streams
            hls.on(HLS.Events.FRAG_LOADED, () => {
              lastLoadedSegment = Date.now();
            });

            hls.on(HLS.Events.ERROR, (_: any, data: any) => {
              // Immediately return without logging for common buffer stall errors
              if (data.details === HLS.ErrorDetails.BUFFER_STALLED_ERROR) {
                // Silently try to recover
                if (data.type === HLS.ErrorTypes.MEDIA_ERROR) {
                  hls.recoverMediaError();
                }
                return;
              }

              // Only log fatal errors as errors, treat others as debug info
              if (data.fatal) {
                // These are critical errors worth logging
                console.error(
                  '[@component:RecStreamPreview] Fatal HLS error:',
                  data.type,
                  data.details,
                );

                switch (data.type) {
                  case HLS.ErrorTypes.NETWORK_ERROR:
                    // For network errors, try to recover silently
                    if (reconnectAttemptsRef.current < 3) {
                      console.log(
                        `[@component:RecStreamPreview] Attempting stream reconnect (${reconnectAttemptsRef.current + 1}/3)...`,
                      );
                      reconnectAttemptsRef.current++;
                      hls.startLoad();
                      return;
                    }
                    break;

                  case HLS.ErrorTypes.MEDIA_ERROR:
                    // For other media errors, try to recover silently
                    if (reconnectAttemptsRef.current < 5) {
                      console.log(
                        `[@component:RecStreamPreview] Media error, attempting recovery (${reconnectAttemptsRef.current + 1}/5)...`,
                      );
                      reconnectAttemptsRef.current++;
                      hls.recoverMediaError();
                      return;
                    }
                    break;
                }

                setError(`Stream error: ${data.type}`);
                setIsDisconnected(true);
              } else {
                // For non-fatal errors, don't log to console at all for specific common types
                if (data.details !== HLS.ErrorDetails.BUFFER_NUDGE_ON_STALL) {
                  // Only log uncommon non-fatal errors as debug info
                  console.debug('[@component:RecStreamPreview] Non-fatal HLS issue:', data.details);
                }

                // Try recovery for some non-fatal errors that might affect playback
                if (data.type === HLS.ErrorTypes.MEDIA_ERROR) {
                  hls.recoverMediaError();
                }
              }
            });
          } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
            // For browsers that natively support HLS (Safari)
            videoRef.current.src = streamUrl;
            videoRef.current.addEventListener('loadedmetadata', () => {
              setIsLoading(false);
              videoRef.current?.play().catch((err) => {
                console.error('[@component:RecStreamPreview] Autoplay failed:', err);
              });
            });

            // Handle end of stream for Safari
            videoRef.current.addEventListener('ended', () => {
              setIsDisconnected(true);
              setError('Stream ended');
            });

            videoRef.current.addEventListener('error', () => {
              setIsDisconnected(true);
              setError('Stream error');
            });
          } else {
            setError('HLS is not supported in this browser');
          }
        }

        // Setup connection check
        if (connectionCheckRef.current) {
          clearInterval(connectionCheckRef.current);
        }

        connectionCheckRef.current = setInterval(() => {
          if (!lastLoadedSegment || !hlsRef.current) return;

          // If no new segments for 15 seconds, try to reconnect
          const timeSinceLastSegment = Date.now() - lastLoadedSegment;
          if (timeSinceLastSegment > 15000 && !isDisconnectedRef.current) {
            // This happens during normal operation, so debug level is sufficient
            console.debug(
              '[@component:RecStreamPreview] No segments for 15s, attempting stream reconnection...',
            );

            // Try to reconnect if under the max attempts
            if (reconnectAttemptsRef.current < 3) {
              reconnectAttemptsRef.current++;
              hlsRef.current.stopLoad();
              hlsRef.current.startLoad();
            } else {
              setIsDisconnected(true);
              setError('Stream disconnected');
            }
          }
        }, 5000);
      } catch (err) {
        console.error('[@component:RecStreamPreview] Failed to setup HLS:', err);
        setError('Failed to load video player');
      }
    }

    setupStream();

    return () => {
      // Cleanup
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      if (connectionCheckRef.current) {
        clearInterval(connectionCheckRef.current);
        connectionCheckRef.current = null;
      }
    };
  }, [streamUrl]); // Only depend on streamUrl for re-initialization

  // Add ended event handler
  useEffect(() => {
    const video = videoRef.current;

    const handleEnded = () => {
      console.log('[@component:RecStreamPreview] Video ended');
      setIsDisconnected(true);
      setError('Stream ended');
    };

    if (video) {
      video.addEventListener('ended', handleEnded);
    }

    return () => {
      if (video) {
        video.removeEventListener('ended', handleEnded);
      }
    };
  }, []);

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <div
      className="relative overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 hover:border-blue-500 transition-colors cursor-pointer"
      style={{ height: '160px' }}
      onClick={handleClick}
    >
      {/* Loading state */}
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <span className="mt-2 text-xs text-gray-500">Loading stream...</span>
          </div>
        </div>
      )}

      {/* Error state - only show persistent errors */}
      {(error || isDisconnected) && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
          <div className="text-red-500 text-center p-2">
            <p className="font-medium">{isDisconnected ? 'Disconnected' : 'Error'}</p>
            <p className="text-xs">{error}</p>
          </div>
        </div>
      )}

      {/* Video Stream */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        muted
        playsInline
        disablePictureInPicture
      />

      {/* Transparent overlay to capture clicks */}
      <div className="absolute inset-0 z-10" aria-hidden="true" />

      {/* Stream info footer */}
      <div className="absolute bottom-0 left-0 right-0 bg-gray-800 bg-opacity-80 text-white p-1 text-xs z-20">
        <div className="flex justify-between items-center">
          <span>{title}</span>
          <span className={isDisconnected ? 'text-red-400' : 'text-green-400'}>
            {isDisconnected ? 'OFFLINE' : 'LIVE'}
          </span>
        </div>
      </div>
    </div>
  );
}

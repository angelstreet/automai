'use client';

import { X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { connectToHost, disconnectFromHost } from '@/app/actions/adbActions';

import { RecStreamAdbRemote } from './RecStreamAdbRemote';
import { RecStreamUsbAdbRemote } from './RecStreamUsbAdbRemote';

// Remote control types
export type RemoteType = 'adb' | 'usbAdb';

interface RecStreamModalProps {
  streamUrl: string;
  _title: string; // Prefix with _ to indicate intentionally unused
  isOpen: boolean;
  onClose: () => void;
  hostId?: string;
  deviceId?: string;
  remoteType?: RemoteType;
}

export function RecStreamModal({
  streamUrl,
  _title,
  isOpen,
  onClose,
  hostId,
  deviceId,
  remoteType = 'adb', // Default to standard ADB remote
}: RecStreamModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [showRemote, setShowRemote] = useState(false);
  const connectionCheckRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const hlsRef = useRef<any>(null);
  const isDisconnectedRef = useRef(false);

  // Keep the ref in sync with the state
  useEffect(() => {
    isDisconnectedRef.current = isDisconnected;
  }, [isDisconnected]);

  // Toggle remote control
  const toggleRemote = async () => {
    const newShowRemote = !showRemote;

    // If showing remote, connect to SSH and ADB
    if (newShowRemote && hostId && deviceId) {
      try {
        console.log('[@component:RecStreamModal] Connecting to host and ADB...');
        const result = await connectToHost(hostId, deviceId);
        if (!result.success) {
          console.error('[@component:RecStreamModal] Failed to connect:', result.error);
          // Don't show remote if connection failed
          return;
        }
        console.log('[@component:RecStreamModal] Successfully connected to host');
      } catch (error) {
        console.error('[@component:RecStreamModal] Error connecting to host:', error);
        return;
      }
    } else if (!newShowRemote && hostId) {
      // If hiding remote, disconnect from SSH
      try {
        console.log('[@component:RecStreamModal] Disconnecting from host...');
        await disconnectFromHost(hostId);
      } catch (error) {
        console.error('[@component:RecStreamModal] Error disconnecting from host:', error);
      }
    }

    // Update state after connection/disconnection
    setShowRemote(newShowRemote);
  };

  // Handle modal close
  const handleClose = useCallback(() => {
    // Disconnect SSH when closing modal if remote is shown
    if (showRemote && hostId) {
      disconnectFromHost(hostId).catch((error) => {
        console.error('[@component:RecStreamModal] Error disconnecting on close:', error);
      });
    }

    // Always hide remote when closing modal
    setShowRemote(false);
    onClose();
  }, [onClose, showRemote, hostId]);

  const setupHlsStream = async (url: string) => {
    try {
      if (!videoRef.current) return;

      // Clean up previous instance if it exists
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      const HLS = (await import('hls.js')).default;

      if (!HLS.isSupported()) {
        console.log('[@component:RecStreamModal] HLS.js is not supported, trying native playback');
        // Try native HLS
        if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
          videoRef.current.src = url;
          videoRef.current.addEventListener('loadedmetadata', () => {
            setIsLoading(false);
            videoRef.current?.play().catch((err) => {
              console.error('[@component:RecStreamModal] Autoplay failed:', err);
            });
          });

          // Handle end of stream for Safari
          videoRef.current.addEventListener('ended', () => {
            setIsDisconnected(true);
            setError('Stream ended - The live stream is no longer available');
          });

          videoRef.current.addEventListener('error', () => {
            setIsDisconnected(true);
            setError('Stream error - Connection to the live stream was lost');
          });
        } else {
          setError('HLS is not supported in this browser');
        }
        return;
      }

      console.log('[@component:RecStreamModal] Setting up HLS stream:', url);

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

      let lastLoadedSegment = Date.now();

      hls.loadSource(url);
      hls.attachMedia(videoRef.current);

      hls.on(HLS.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection
        videoRef.current?.play().catch((err) => {
          console.error('[@component:RecStreamModal] Autoplay failed:', err);
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
          console.error('[@component:RecStreamModal] Fatal HLS error:', data.type, data.details);

          // Handle different error types
          switch (data.type) {
            case HLS.ErrorTypes.NETWORK_ERROR:
              // For network errors, try to recover silently
              if (reconnectAttemptsRef.current < 3) {
                console.log(
                  `[@component:RecStreamModal] Attempting stream reconnect (${reconnectAttemptsRef.current + 1}/3)...`,
                );
                reconnectAttemptsRef.current++;
                hls.startLoad();
                return;
              } else {
                setError('Network error - Unable to connect to the stream after multiple attempts');
              }
              break;

            case HLS.ErrorTypes.MEDIA_ERROR:
              // For other media errors, try to recover silently
              if (reconnectAttemptsRef.current < 5) {
                console.log(
                  `[@component:RecStreamModal] Media error, attempting recovery (${reconnectAttemptsRef.current + 1}/5)...`,
                );
                reconnectAttemptsRef.current++;
                hls.recoverMediaError();
                return;
              } else {
                setError('Media error - The stream cannot be played');
              }
              break;

            default:
              setError(`Stream error: ${data.type}`);
              break;
          }

          setIsDisconnected(true);
        } else {
          // For non-fatal errors, don't log to console at all for specific common types
          if (data.details !== HLS.ErrorDetails.BUFFER_NUDGE_ON_STALL) {
            // Only log uncommon non-fatal errors as debug info
            console.debug('[@component:RecStreamModal] Non-fatal HLS issue:', data.details);
          }

          // Try recovery for some non-fatal errors that might affect playback
          if (data.type === HLS.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          }
        }
      });

      // Setup connection check using the lastLoadedSegment from closure
      if (connectionCheckRef.current) {
        clearInterval(connectionCheckRef.current);
      }

      connectionCheckRef.current = setInterval(() => {
        // If no new segments for 15 seconds, try to reconnect
        const timeSinceLastSegment = Date.now() - lastLoadedSegment;
        if (timeSinceLastSegment > 15000 && !isDisconnectedRef.current) {
          // This happens during normal operation, so debug level is sufficient
          console.debug(
            '[@component:RecStreamModal] No segments for 15s, attempting stream reconnection...',
          );

          // Try to reconnect if under the max attempts
          if (reconnectAttemptsRef.current < 3) {
            reconnectAttemptsRef.current++;
            hls.stopLoad();
            hls.startLoad();
          } else {
            setIsDisconnected(true);
            setError('Stream disconnected - No new video data received');
          }
        }
      }, 5000);
    } catch (err) {
      console.error('[@component:RecStreamModal] Failed to setup HLS:', err);
      setError('Failed to load video player');
    }
  };

  useEffect(() => {
    reconnectAttemptsRef.current = 0;

    async function setupStream() {
      try {
        // Only setup the stream if the modal is open
        if (!isOpen) return;

        setIsDisconnected(false);
        isDisconnectedRef.current = false;
        setError(null);
        setIsLoading(true);

        await setupHlsStream(streamUrl);
      } catch (err) {
        console.error('[@component:RecStreamModal] Failed to setup stream:', err);
        setError('Failed to load video player');
      }
    }

    setupStream();

    // Handle escape key press to close the modal
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      // Cleanup
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      document.removeEventListener('keydown', handleEscape);

      if (connectionCheckRef.current) {
        clearInterval(connectionCheckRef.current);
        connectionCheckRef.current = null;
      }
    };
  }, [isOpen, handleClose, streamUrl]);

  // Add ended event handler
  useEffect(() => {
    const video = videoRef.current;

    const handleEnded = () => {
      console.log('[@component:RecStreamModal] Video ended');
      setIsDisconnected(true);
      setError('Stream ended - The live stream is no longer available');
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

  if (!isOpen) return null;

  // Check if we can show the remote (need both hostId and deviceId)
  const canShowRemote = !!hostId && !!deviceId;

  // Get the title based on remote type
  const remoteTitle = remoteType === 'usbAdb' ? 'USB ADB' : 'Android ADB';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
      <div className="w-[95vw] h-[90vh] bg-white dark:bg-gray-800 rounded-lg shadow-lg flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-2 bg-gray-800 text-white flex justify-between items-center rounded-t-lg">
          <h2 className="text-lg font-medium">
            {isDisconnected ? 'Stream Disconnected' : `${remoteTitle}`}
          </h2>
          <div className="flex items-center space-x-2">
            {canShowRemote && (
              <button
                onClick={toggleRemote}
                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {showRemote ? 'Hide Remote' : 'Show Remote'}
              </button>
            )}
            <button
              onClick={handleClose}
              className="text-gray-300 hover:text-white focus:outline-none"
              aria-label="Close"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden bg-black">
          {/* Stream Viewer */}
          <div
            className={`relative ${showRemote && canShowRemote ? 'w-3/4' : 'w-full'} overflow-hidden`}
          >
            {/* Loading state */}
            {isLoading && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  <span className="mt-2 text-gray-500">Connecting to stream...</span>
                </div>
              </div>
            )}

            {/* Error state - only show persistent errors */}
            {(error || isDisconnected) && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
                <div className="text-red-500 text-center p-4">
                  <p className="font-medium">
                    {isDisconnected ? 'Stream Disconnected' : 'Stream Error'}
                  </p>
                  <p>{error}</p>
                  <button
                    onClick={handleClose}
                    className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* Video Stream */}
            <video
              ref={videoRef}
              className="w-full h-full"
              playsInline
              autoPlay
              muted
              disablePictureInPicture
              style={{ backgroundColor: 'black' }}
            />
          </div>

          {/* Remote Control Panel - Show only if we have required props and user toggled it on */}
          {showRemote && canShowRemote && (
            <div className="w-1/4 bg-gray-100 dark:bg-gray-900 border-l border-gray-300 dark:border-gray-700 p-4 overflow-y-auto flex flex-col items-center justify-center">
              {remoteType === 'usbAdb' ? (
                <RecStreamUsbAdbRemote hostId={hostId!} deviceId={deviceId!} />
              ) : (
                <RecStreamAdbRemote hostId={hostId!} deviceId={deviceId!} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

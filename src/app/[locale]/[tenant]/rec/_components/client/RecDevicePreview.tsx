'use client';

import { useEffect, useRef, useState } from 'react';

import { DeviceConfig, DevicePreviewProps } from '../types/recDeviceTypes';

/**
 * Unified device preview component
 * Handles AndroidTV, AndroidPhone, and Host device previews
 * Single click: Toggle stream preview
 * Double click: Open full modal
 */
export function RecDevicePreview({ device, onClick }: DevicePreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle click events (single vs double click)
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();

    if (clickTimeoutRef.current) {
      // Double click detected
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      handleDoubleClick();
    } else {
      // Potential single click, wait to see if double click follows
      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null;
        handleSingleClick();
      }, 250);
    }
  };

  // Single click: Toggle stream preview
  const handleSingleClick = () => {
    if (device.type === 'host') {
      // For VNC hosts, toggle VNC streaming
      if (isStreaming) {
        stopVncStreaming();
      } else {
        startVncStreaming();
      }
      return;
    }

    // For Android devices, toggle streaming
    if (isStreaming) {
      stopStreaming();
    } else {
      startStreaming();
    }
  };

  // Double click: Open modal
  const handleDoubleClick = () => {
    onClick(device);
  };

  // Start HLS streaming for Android devices
  const startStreaming = async () => {
    if (device.type === 'host') return;

    const androidDevice = device as DeviceConfig & { type: 'androidTv' | 'androidPhone' };

    setIsLoading(true);
    setError(null);

    try {
      if (!videoRef.current) {
        setError('Video element not ready');
        setIsLoading(false);
        return;
      }

      console.log('[@component:RecDevicePreview] Starting stream for:', androidDevice.streamUrl);

      const HLS = (await import('hls.js')).default;

      if (!HLS.isSupported()) {
        console.log('[@component:RecDevicePreview] HLS.js not supported, trying native');
        // Try native HLS
        if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
          videoRef.current.src = androidDevice.streamUrl;
          videoRef.current.addEventListener('loadedmetadata', () => {
            console.log('[@component:RecDevicePreview] Native HLS loaded');
            setIsLoading(false);
            setIsStreaming(true);
            videoRef.current?.play().catch((err) => {
              console.error('[@component:RecDevicePreview] Autoplay failed:', err);
            });
          });

          videoRef.current.addEventListener('error', (e) => {
            console.error('[@component:RecDevicePreview] Native video error:', e);
            setError('Native HLS error');
            setIsLoading(false);
          });
        } else {
          setError('HLS not supported');
          setIsLoading(false);
        }
        return;
      }

      // Clean up any existing HLS instance
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      const hls = new HLS({
        enableWorker: true,
        lowLatencyMode: true,
        liveSyncDuration: 1,
        liveMaxLatencyDuration: 5,
        liveDurationInfinity: true,
        maxBufferLength: 3, // Reduced for preview
        maxMaxBufferLength: 5, // Reduced for preview
      });

      hlsRef.current = hls;

      hls.on(HLS.Events.MANIFEST_PARSED, () => {
        console.log('[@component:RecDevicePreview] HLS manifest parsed');
        setIsLoading(false);
        setIsStreaming(true);
        videoRef.current?.play().catch((err) => {
          console.error('[@component:RecDevicePreview] Autoplay failed:', err);
        });
      });

      hls.on(HLS.Events.ERROR, (_: any, data: any) => {
        if (data.fatal) {
          console.error('[@component:RecDevicePreview] Fatal HLS error:', data.type, data.details);
          setError(`Stream error: ${data.details || data.type}`);
          setIsLoading(false);
          setIsStreaming(false);
        } else {
          console.warn('[@component:RecDevicePreview] Non-fatal HLS error:', data.details);
        }
      });

      // Load and attach
      hls.loadSource(androidDevice.streamUrl);
      hls.attachMedia(videoRef.current);
    } catch (err) {
      console.error('[@component:RecDevicePreview] Failed to start stream:', err);
      setError('Failed to load stream');
      setIsLoading(false);
    }
  };

  // Stop streaming
  const stopStreaming = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = '';
    }

    setIsStreaming(false);
    setIsLoading(false);
    setError(null);
  };

  // Start VNC streaming for Host devices
  const startVncStreaming = () => {
    if (device.type !== 'host') return;

    console.log('[@component:RecDevicePreview] Starting VNC stream for host');
    setIsLoading(true);
    setError(null);

    // Simulate connection delay for VNC
    setTimeout(() => {
      setIsLoading(false);
      setIsStreaming(true);
    }, 1000);
  };

  // Stop VNC streaming
  const stopVncStreaming = () => {
    console.log('[@component:RecDevicePreview] Stopping VNC stream for host');
    setIsStreaming(false);
    setIsLoading(false);
    setError(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  // Render Android device preview
  const renderAndroidPreview = (device: DeviceConfig & { type: 'androidTv' | 'androidPhone' }) => {
    return (
      <div className="relative w-full h-full bg-black">
        {/* Video element - always present for HLS attachment */}
        <video
          ref={videoRef}
          className={`w-full h-full object-cover ${isStreaming ? 'block' : 'hidden'}`}
          muted
          playsInline
          disablePictureInPicture
          style={{ backgroundColor: 'black' }}
        />

        {/* Invisible click layer when streaming - ensures consistent mouse event handling */}
        {isStreaming && (
          <div
            className="absolute inset-0 z-10 bg-transparent cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();

              if (clickTimeoutRef.current) {
                // Double click detected - open modal
                clearTimeout(clickTimeoutRef.current);
                clickTimeoutRef.current = null;
                onClick(device);
              } else {
                // Single click - stop streaming
                clickTimeoutRef.current = setTimeout(() => {
                  clickTimeoutRef.current = null;
                  // For Android devices, stop HLS streaming
                  if (device.type !== 'host') {
                    stopStreaming();
                  } else {
                    // For VNC hosts, stop VNC streaming
                    stopVncStreaming();
                  }
                }, 250);
              }
            }}
            title="Click to stop stream or double-click to open modal"
          />
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
              <span className="mt-1 text-xs text-gray-500">Loading stream...</span>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
            <div className="text-center">
              <div className="text-red-500 text-xs">{error}</div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setError(null);
                  startStreaming();
                }}
                className="text-xs text-blue-500 mt-1 hover:underline"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Not streaming placeholder */}
        {!isStreaming && !isLoading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
            <div className="text-center">
              <div className="text-2xl mb-2">{device.type === 'androidTv' ? '📺' : '📱'}</div>
              <div className="text-xs text-gray-500">
                {device.type === 'androidTv' ? 'Android TV' : 'Android Phone'}
              </div>
              <div className="text-xs text-blue-500 mt-1">Click to start stream</div>
            </div>
          </div>
        )}

        {/* Stream controls overlay */}
        {isStreaming && (
          <div className="absolute top-2 right-2 z-20">
            <button
              onClick={(e) => {
                e.stopPropagation();
                stopStreaming();
              }}
              className="bg-red-500 text-white p-1 rounded text-xs hover:bg-red-600"
              title="Stop stream"
            >
              ⏹
            </button>
          </div>
        )}

        {/* Fullscreen/Modal open button */}
        <div className="absolute top-2 left-2 z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick(device);
            }}
            className="bg-black bg-opacity-60 text-white p-1 rounded text-xs hover:bg-opacity-80"
            title="Open in modal"
          >
            ⛶
          </button>
        </div>
      </div>
    );
  };

  // Render Host device preview with VNC
  const renderHostPreview = (device: DeviceConfig & { type: 'host' }) => {
    const { vncConfig } = device;
    const vncUrl = `https://${vncConfig.ip}:${vncConfig.port}/vnc/vnc_lite.html?host=${vncConfig.ip}&port=${vncConfig.port}&path=websockify&encrypt=0&view_only=1${vncConfig.password ? `&password=${vncConfig.password}` : ''}`;

    return (
      <div className="relative w-full h-full bg-black">
        {/* VNC iframe - always present but controlled by isStreaming */}
        {isStreaming && (
          <iframe
            src={vncUrl}
            className="w-full h-full"
            style={{ border: 'none' }}
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        )}

        {/* Invisible click layer when streaming - ensures consistent mouse event handling */}
        {isStreaming && (
          <div
            className="absolute inset-0 z-10 bg-transparent cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();

              if (clickTimeoutRef.current) {
                // Double click detected - open modal
                clearTimeout(clickTimeoutRef.current);
                clickTimeoutRef.current = null;
                onClick(device);
              } else {
                // Single click - stop streaming
                clickTimeoutRef.current = setTimeout(() => {
                  clickTimeoutRef.current = null;
                  // For VNC hosts, stop VNC streaming
                  stopVncStreaming();
                }, 250);
              }
            }}
            title="Click to interact with VNC or double-click to open modal"
          />
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
              <span className="mt-1 text-xs text-gray-500">Connecting to VNC...</span>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
            <div className="text-center">
              <div className="text-red-500 text-xs">{error}</div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setError(null);
                  startVncStreaming();
                }}
                className="text-xs text-blue-500 mt-1 hover:underline"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Not streaming placeholder */}
        {!isStreaming && !isLoading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
            <div className="text-center">
              <div className="text-2xl mb-2">{getDeviceInfo(device).icon}</div>
              <div className="text-xs text-gray-500">{getDeviceInfo(device).label}</div>
              <div className="text-xs text-blue-500 mt-1">Click to connect</div>
            </div>
          </div>
        )}

        {/* Stream controls overlay */}
        {isStreaming && (
          <div className="absolute top-2 right-2 z-20">
            <button
              onClick={(e) => {
                e.stopPropagation();
                stopVncStreaming();
              }}
              className="bg-red-500 text-white p-1 rounded text-xs hover:bg-red-600"
              title="Disconnect VNC"
            >
              ⏹
            </button>
          </div>
        )}

        {/* Fullscreen/Modal open button */}
        <div className="absolute top-2 left-2 z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick(device);
            }}
            className="bg-black bg-opacity-60 text-white p-1 rounded text-xs hover:bg-opacity-80"
            title="Open in modal"
          >
            ⛶
          </button>
        </div>
      </div>
    );
  };

  // Get device type label and icon
  const getDeviceInfo = (device: DeviceConfig) => {
    switch (device.type) {
      case 'androidTv':
        return { icon: '📺', label: 'Android TV', status: isStreaming ? 'STREAMING' : 'READY' };
      case 'androidPhone':
        return { icon: '📱', label: 'Android Phone', status: isStreaming ? 'STREAMING' : 'READY' };
      case 'host':
        // Use device_type from database to show Linux/Windows instead of "Host VNC"
        const hostDevice = device as DeviceConfig & { type: 'host'; device_type?: string };
        let label = 'Host';
        let icon = '🖥️';
        
        if (hostDevice.device_type === 'linux') {
          label = 'Linux';
          icon = '🐧';
        } else if (hostDevice.device_type === 'windows') {
          label = 'Windows';
          icon = '🪟';
        }
        
        return { icon, label, status: isStreaming ? 'STREAMING' : 'READY' };
      default:
        return { icon: '❓', label: 'Unknown', status: 'UNKNOWN' };
    }
  };

  const deviceInfo = getDeviceInfo(device);

  return (
    <div
      className="relative overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 hover:border-blue-500 transition-colors cursor-pointer"
      style={{ height: '160px' }}
      onClick={handleClick}
    >
      {/* Device preview content */}
      {device.type === 'host' ? renderHostPreview(device) : renderAndroidPreview(device)}

      {/* Device info footer */}
      <div className="absolute bottom-0 left-0 right-0 bg-gray-800 bg-opacity-80 text-white p-1 text-xs z-20">
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1">
            <span>{deviceInfo.icon}</span>
            <span>{device.name}</span>
          </span>
          <span
            className={`${
              deviceInfo.status === 'STREAMING'
                ? 'text-red-400'
                : deviceInfo.status === 'READY'
                  ? 'text-green-400'
                  : 'text-blue-400'
            }`}
          >
            {deviceInfo.status}
          </span>
        </div>
      </div>
    </div>
  );
}

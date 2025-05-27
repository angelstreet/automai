'use client';

import { X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { connectToHost, disconnectFromHost, AndroidElement } from '@/app/actions/adbActions';
import { useToast } from '@/components/shadcn/use-toast';
import { DeviceConfig, DeviceModalProps, RemoteType } from '@/types/recDeviceTypes';

import { RecAndroidPhoneRemote } from './RecAndroidPhoneRemote';
import { RecAndroidTvRemote } from './RecAndroidTvRemote';
import { UIElementsOverlay } from './UIElementsOverlay';

/**
 * Unified device modal component
 * Handles AndroidTV, AndroidPhone, and Host device viewing
 */
export function RecDeviceModal({ device, isOpen, onClose }: DeviceModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [showRemote, setShowRemote] = useState(false);
  const { toast } = useToast();
  const connectionCheckRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const hlsRef = useRef<any>(null);
  const isDisconnectedRef = useRef(false);

  // Overlay state
  const [overlayElements, setOverlayElements] = useState<AndroidElement[]>([]);
  const [deviceResolution, setDeviceResolution] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState<number | undefined>();
  const [elementClickHandler, setElementClickHandler] = useState<
    ((element: AndroidElement) => void) | null
  >(null);

  // Keep the ref in sync with the state
  useEffect(() => {
    isDisconnectedRef.current = isDisconnected;
  }, [isDisconnected]);

  // Handle overlay callbacks from remote components
  const handleElementsUpdate = (
    elements: AndroidElement[],
    deviceWidth: number,
    deviceHeight: number,
  ) => {
    setOverlayElements(elements);
    setDeviceResolution({ width: deviceWidth, height: deviceHeight });
    setSelectedElementId(undefined);
  };

  const handleOverlayToggle = (visible: boolean) => {
    setShowOverlay(visible);
    if (!visible) {
      setOverlayElements([]);
      setSelectedElementId(undefined);
    }
  };

  // Handle element click handler from remote component
  const handleElementClickHandler = useCallback(
    (clickHandler: (element: AndroidElement) => void) => {
      setElementClickHandler(() => clickHandler);
    },
    [],
  );

  // Handle element click from overlay
  const handleOverlayElementClick = useCallback(
    (element: AndroidElement) => {
      console.log(`[@component:RecDeviceModal] Overlay clicked element ID ${element.id}`);
      if (elementClickHandler) {
        elementClickHandler(element);
        // Update selected element for visual feedback
        setSelectedElementId(element.id);
      }
    },
    [elementClickHandler],
  );

  // Handle modal close
  const handleClose = useCallback(() => {
    // Disconnect SSH when closing modal if remote is shown for Android devices
    if (showRemote && device?.type !== 'host' && 'remoteConfig' in device! && device.remoteConfig) {
      disconnectFromHost(device.remoteConfig.hostId).catch((error) => {
        console.error('[@component:RecDeviceModal] Error disconnecting on close:', error);
      });
    }

    // Clear overlay when closing modal
    handleOverlayToggle(false);

    // Always hide remote when closing modal
    setShowRemote(false);
    onClose();
  }, [onClose, showRemote, device]);

  // Toggle remote control for Android devices
  const toggleRemote = async () => {
    if (!device || device.type === 'host') return;

    const androidDevice = device as DeviceConfig & { type: 'androidTv' | 'androidPhone' };
    const newShowRemote = !showRemote;

    // Check if remoteConfig is available
    if (!androidDevice.remoteConfig) {
      toast({
        title: 'Remote Control Unavailable',
        description:
          'No ADB host configured for this device. Please configure an ADB host in the device settings.',
        variant: 'destructive',
      });
      return;
    }

    // Extract remoteConfig after null check
    const remoteConfig = androidDevice.remoteConfig;

    // If showing remote, connect to SSH and ADB
    if (newShowRemote) {
      try {
        console.log('[@component:RecDeviceModal] Connecting to host and ADB...');
        const result = await connectToHost(remoteConfig.hostId, remoteConfig.deviceId);
        if (!result.success) {
          console.error('[@component:RecDeviceModal] Failed to connect:', result.error);
          toast({
            title: 'Connection Failed',
            description: result.error || 'Failed to connect to device',
            variant: 'destructive',
          });
          return;
        }
        console.log('[@component:RecDeviceModal] Successfully connected to host');
      } catch (error) {
        console.error('[@component:RecDeviceModal] Error connecting to host:', error);
        toast({
          title: 'Connection Error',
          description: error instanceof Error ? error.message : 'Unknown error occurred',
          variant: 'destructive',
        });
        return;
      }
    } else {
      // If hiding remote, disconnect from SSH
      try {
        console.log('[@component:RecDeviceModal] Disconnecting from host...');
        await disconnectFromHost(remoteConfig.hostId);
      } catch (error) {
        console.error('[@component:RecDeviceModal] Error disconnecting from host:', error);
        toast({
          title: 'Disconnection Error',
          description: error instanceof Error ? error.message : 'Failed to disconnect cleanly',
          variant: 'destructive',
        });
      }

      // Clear overlay when hiding remote
      handleOverlayToggle(false);
    }

    setShowRemote(newShowRemote);
  };

  // Setup HLS stream for Android devices
  const setupHlsStream = async (streamUrl: string) => {
    try {
      if (!videoRef.current) return;

      // Clean up previous instance if it exists
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      const HLS = (await import('hls.js')).default;

      if (!HLS.isSupported()) {
        // Try native HLS
        if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
          videoRef.current.src = streamUrl;
          videoRef.current.addEventListener('loadedmetadata', () => {
            setIsLoading(false);
            videoRef.current?.play().catch((err) => {
              console.error('[@component:RecDeviceModal] Autoplay failed:', err);
            });
          });
        } else {
          setError('HLS is not supported in this browser');
        }
        return;
      }

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
        reconnectAttemptsRef.current = 0;
        videoRef.current?.play().catch((err) => {
          console.error('[@component:RecDeviceModal] Autoplay failed:', err);
        });
      });

      // Handle HLS errors (simplified error handling)
      hls.on(HLS.Events.ERROR, (_: any, data: any) => {
        if (data.fatal) {
          console.error('[@component:RecDeviceModal] Fatal HLS error:', data.type, data.details);
          setError(`Stream error: ${data.type}`);
          setIsDisconnected(true);
        }
      });
    } catch (err) {
      console.error('[@component:RecDeviceModal] Failed to setup HLS:', err);
      setError('Failed to load video player');
    }
  };

  // Initialize device viewer
  useEffect(() => {
    if (!isOpen || !device) return;

    setIsDisconnected(false);
    isDisconnectedRef.current = false;
    setError(null);
    setIsLoading(true);

    // Setup based on device type
    if (device.type === 'host') {
      // For host devices, we don't need to setup HLS, just mark as loaded
      setIsLoading(false);
    } else {
      // For Android devices, setup HLS stream
      const androidDevice = device as DeviceConfig & { type: 'androidTv' | 'androidPhone' };
      setupHlsStream(androidDevice.streamUrl);
    }

    // Handle escape key press to close the modal
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);

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
  }, [isOpen, device, handleClose]);

  if (!isOpen || !device) return null;

  // Get device-specific information
  const getDeviceInfo = (device: DeviceConfig) => {
    switch (device.type) {
      case 'androidTv':
        return { title: 'Android TV', remoteType: 'androidTv' as RemoteType, canShowRemote: true };
      case 'androidPhone':
        return {
          title: 'Android Phone',
          remoteType: 'androidPhone' as RemoteType,
          canShowRemote: true,
        };
      case 'host':
        // Use device_type from database to show Linux/Windows instead of "Host VNC"
        const hostDevice = device as DeviceConfig & { type: 'host'; device_type?: string };
        let title = 'Host VNC';

        if (hostDevice.device_type === 'linux') {
          title = 'Linux VNC';
        } else if (hostDevice.device_type === 'windows') {
          title = 'Windows VNC';
        }

        return { title, remoteType: 'none' as RemoteType, canShowRemote: false };
      default:
        return { title: 'Unknown Device', remoteType: 'none' as RemoteType, canShowRemote: false };
    }
  };

  const deviceInfo = getDeviceInfo(device);

  // Render Android device viewer (HLS stream)
  const renderAndroidViewer = (device: DeviceConfig & { type: 'androidTv' | 'androidPhone' }) => (
    <div className="relative w-full h-full">
      {/* Loading state */}
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <span className="mt-2 text-gray-500">Connecting to stream...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {(error || isDisconnected) && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
          <div className="text-red-500 text-center p-4">
            <p className="font-medium">{isDisconnected ? 'Stream Disconnected' : 'Stream Error'}</p>
            <p>{error}</p>
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
  );

  // Render Host device viewer (VNC iframe)
  const renderHostViewer = (device: DeviceConfig & { type: 'host' }) => {
    const { vncConfig } = device;
    const vncUrl = `https://${vncConfig.ip}:${vncConfig.port}/vnc/vnc_lite.html?host=${vncConfig.ip}&port=${vncConfig.port}&path=websockify&encrypt=0${vncConfig.password ? `&password=${vncConfig.password}` : ''}`;

    return (
      <div className="relative w-full h-full">
        {/* Loading state */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              <span className="mt-2 text-gray-500">Connecting to VNC...</span>
            </div>
          </div>
        )}

        {/* VNC iframe */}
        <iframe
          src={vncUrl}
          className="w-full h-full"
          style={{ border: 'none', display: 'block' }}
          sandbox="allow-scripts allow-same-origin allow-forms"
          onLoad={() => setIsLoading(false)}
          title={`VNC Stream - ${device.name}`}
        />
      </div>
    );
  };

  // Render remote control panel
  const renderRemoteControl = () => {
    if (!showRemote || !deviceInfo.canShowRemote || device.type === 'host') return null;

    const androidDevice = device as DeviceConfig & { type: 'androidTv' | 'androidPhone' };

    // Check if remoteConfig is available
    if (!androidDevice.remoteConfig) {
      return (
        <div className="w-1/4 bg-gray-100 dark:bg-gray-900 border-l border-gray-300 dark:border-gray-700 p-4 overflow-y-auto flex flex-col items-center justify-center">
          <div className="text-center p-4">
            <p className="text-red-500 font-medium">Remote Control Unavailable</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              No ADB host configured for this device.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="w-1/4 bg-gray-100 dark:bg-gray-900 border-l border-gray-300 dark:border-gray-700 p-4 overflow-y-auto flex flex-col items-center justify-center">
        {deviceInfo.remoteType === 'androidTv' && (
          <RecAndroidTvRemote
            hostId={androidDevice.remoteConfig.hostId}
            deviceId={androidDevice.remoteConfig.deviceId}
            onElementsUpdate={handleElementsUpdate}
            onOverlayToggle={handleOverlayToggle}
            onElementClickHandler={handleElementClickHandler}
          />
        )}
        {deviceInfo.remoteType === 'androidPhone' && (
          <RecAndroidPhoneRemote
            hostId={androidDevice.remoteConfig.hostId}
            deviceId={androidDevice.remoteConfig.deviceId}
            onElementsUpdate={handleElementsUpdate}
            onOverlayToggle={handleOverlayToggle}
            onElementClickHandler={handleElementClickHandler}
          />
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
      <div className="w-[95vw] h-[90vh] bg-white dark:bg-gray-800 rounded-lg shadow-lg flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-2 bg-gray-800 text-white flex justify-between items-center rounded-t-lg">
          <h2 className="text-lg font-medium">
            {device.name} - {deviceInfo.title}
          </h2>
          <div className="flex items-center space-x-2">
            {deviceInfo.canShowRemote && (
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
          {/* Device Viewer */}
          <div
            className={`relative ${showRemote && deviceInfo.canShowRemote ? 'w-3/4' : 'w-full'} overflow-hidden`}
          >
            {device.type === 'host' ? renderHostViewer(device) : renderAndroidViewer(device)}
          </div>

          {/* Remote Control Panel */}
          {renderRemoteControl()}
        </div>

        {/* UI Elements Overlay */}
        {device.type !== 'host' && showOverlay && deviceResolution && (
          <UIElementsOverlay
            elements={overlayElements}
            videoElement={videoRef.current}
            deviceWidth={deviceResolution.width}
            deviceHeight={deviceResolution.height}
            isVisible={showOverlay}
            selectedElementId={selectedElementId}
            onElementClick={handleOverlayElementClick}
          />
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback, useMemo } from 'react';

import {
  ScreenEditorState,
  ScreenEditorActions,
  ScreenViewMode,
  StreamStatus,
  SelectedArea,
} from '../../types/pages/UserInterface_Types';
import {
  createCompactLayoutConfig,
  getVerificationLayout,
  createDeviceResolution,
  createStreamViewerSx,
} from '../../utils/userinterface/screenEditorUtils';

export const useScreenEditor = (selectedHost: any, selectedDeviceId: string | null) => {
  // Get the specific device from the host
  const device = selectedHost?.devices?.find((d: any) => d.device_id === selectedDeviceId);

  // Extract device information from the specific device
  const deviceModel = device?.model || 'android_mobile';
  const deviceConfig = selectedHost?.controller_configs;
  const avConfig = deviceConfig?.av?.parameters;

  // Memoize layout configs to prevent new object references
  const compactLayoutConfig = useMemo(() => createCompactLayoutConfig(deviceModel), [deviceModel]);
  const verificationEditorLayout = useMemo(() => getVerificationLayout(deviceModel), [deviceModel]);
  const deviceResolution = useMemo(() => createDeviceResolution(), []);

  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Additional state for capture management
  const [lastScreenshotPath, setLastScreenshotPath] = useState<string | undefined>(undefined);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [viewMode, setViewMode] = useState<ScreenViewMode>('stream');

  // Memoize sx props to prevent new object references
  const streamViewerSx = useMemo(() => createStreamViewerSx(viewMode), [viewMode]);

  // Stream status state
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('running');

  // Capture timing state
  const [captureStartTime, setCaptureStartTime] = useState<Date | null>(null);
  const [captureEndTime, setCaptureEndTime] = useState<Date | null>(null);

  // Stream URL state
  const [streamUrl, setStreamUrl] = useState<string | undefined>(undefined);

  // Screenshot and area selection state
  const [isScreenshotLoading, setIsScreenshotLoading] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isStoppingCapture, setIsStoppingCapture] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedArea, setSelectedArea] = useState<SelectedArea | null>(null);

  // Derived resolution info
  const resolutionInfo = useMemo(() => {
    if (!device) return null;
    return {
      width: device.resolution?.width || deviceResolution.width,
      height: device.resolution?.height || deviceResolution.height,
    };
  }, [device, deviceResolution]);

  // Get stream URL from AV controller - using controller proxy
  const getStreamUrl = useCallback(async () => {
    if (!selectedHost || !device) {
      console.log('[@hook:useScreenEditor] No selectedHost or device available');
      return undefined;
    }

    try {
      console.log(
        `[@hook:useScreenEditor] Getting stream URL from AV controller proxy for device: ${device.name} (${device.model})...`,
      );

      // Get the AV controller proxy from selectedHost
      const avControllerProxy = selectedHost.controllerProxies?.av;

      if (!avControllerProxy) {
        console.log('[@hook:useScreenEditor] AV controller proxy not available');
        return undefined;
      }

      console.log('[@hook:useScreenEditor] AV controller proxy found, calling get_stream_url...');

      // Call get_stream_url on the AV controller proxy
      const streamUrl = await avControllerProxy.get_stream_url();

      if (streamUrl) {
        console.log('[@hook:useScreenEditor] Got stream URL from proxy:', streamUrl);
        return streamUrl;
      } else {
        console.log('[@hook:useScreenEditor] No stream URL returned from proxy');
        return undefined;
      }
    } catch (error) {
      console.error('[@hook:useScreenEditor] Error getting stream URL from proxy:', error);
      return undefined;
    }
  }, [selectedHost, device]);

  // Fetch stream URL when component mounts and device is available
  useEffect(() => {
    if (selectedHost && device && isConnected) {
      console.log(`[@hook:useScreenEditor] Fetching stream URL for device: ${device.name}...`);
      getStreamUrl()
        .then((url) => {
          setStreamUrl(url);
        })
        .catch((error) => {
          console.error('[@hook:useScreenEditor] Error fetching stream URL:', error);
          setStreamUrl(undefined);
        });
    }
  }, [selectedHost, device, isConnected, getStreamUrl]);

  // Memoize onTap callback to prevent new function references
  const handleTap = useCallback(
    async (x: number, y: number) => {
      if (!device) {
        console.log('[@hook:useScreenEditor] Cannot tap: no device selected');
        return;
      }

      console.log(
        `🎯 [@hook:useScreenEditor] Tapped at device coordinates: ${x}, ${y} on device: ${device.name} (${device.model})`,
      );

      // Try to use remote controller proxy if available
      if (selectedHost?.controllerProxies?.remote) {
        try {
          console.log(
            `[@hook:useScreenEditor] Using remote controller proxy to tap at coordinates: (${x}, ${y}) for device: ${device.name}`,
          );
          const result = await selectedHost.controllerProxies.remote.tap(x, y);

          if (result.success) {
            console.log(
              `[@hook:useScreenEditor] Tap successful at coordinates: (${x}, ${y}) on device: ${device.name}`,
            );
          } else {
            console.error(`[@hook:useScreenEditor] Tap failed: ${result.error}`);
          }
        } catch (error) {
          console.error(`[@hook:useScreenEditor] Error during tap operation:`, error);
        }
      } else {
        console.log(
          `[@hook:useScreenEditor] No remote controller proxy available - tap coordinates logged only`,
        );
      }
    },
    [selectedHost, device],
  );

  // Handle start capture
  const handleStartCapture = useCallback(async () => {
    if (!device) {
      console.log('[@hook:useScreenEditor] Cannot start capture: no device selected');
      return;
    }

    setIsCapturing(true);
    setCaptureStartTime(new Date());

    console.log(
      `[@hook:useScreenEditor] Started capture for device: ${device.name} (${device.model})`,
    );
  }, [device]);

  // Handle stop capture
  const handleStopCapture = useCallback(async () => {
    if (!device) {
      console.log('[@hook:useScreenEditor] Cannot stop capture: no device selected');
      return;
    }

    setIsStoppingCapture(true);
    setIsCapturing(false);
    setCaptureEndTime(new Date());

    console.log(
      `[@hook:useScreenEditor] Stopped capture for device: ${device.name} (${device.model})`,
    );

    // Simulate processing delay
    setTimeout(() => {
      setIsStoppingCapture(false);
    }, 2000);
  }, [device]);

  // Handle take screenshot
  const handleTakeScreenshot = useCallback(async () => {
    if (!device) {
      console.log('[@hook:useScreenEditor] Cannot take screenshot: no device selected');
      return;
    }

    setIsScreenshotLoading(true);
    setViewMode('screenshot');

    console.log(
      `[@hook:useScreenEditor] Taking screenshot for device: ${device.name} (${device.model})`,
    );

    // Simulate screenshot API call
    setTimeout(() => {
      setIsScreenshotLoading(false);
      setLastScreenshotPath(`/screenshots/${device.model}_${Date.now()}.png`);
    }, 1500);
  }, [device]);

  // Restart stream - just close capture/video and return to stream view
  const restartStream = useCallback(async () => {
    if (!device) {
      console.log('[@hook:useScreenEditor] Cannot restart stream: no device selected');
      return;
    }

    console.log(
      `[@hook:useScreenEditor] Closing capture/video and returning to stream view for device: ${device.name} (${device.model})`,
    );

    // Close capture/video screen and return to stream view
    setViewMode('stream');
    setSelectedArea(null);
    setStreamStatus('running');
  }, [device]);

  // Handle toggle expanded
  const handleToggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  // Handle frame change
  const handleFrameChange = useCallback((frame: number) => {
    setCurrentFrame(frame);
  }, []);

  // Handle back to stream
  const handleBackToStream = useCallback(() => {
    setViewMode('stream');
    setSelectedArea(null);
  }, []);

  // Handle area selected
  const handleAreaSelected = useCallback((area: SelectedArea) => {
    setSelectedArea(area);
    console.log('[@hook:useScreenEditor] Area selected:', area);
  }, []);

  // State object
  const state: ScreenEditorState = useMemo(
    () => ({
      isConnected,
      connectionError,
      streamStatus,
      streamUrl,
      lastScreenshotPath,
      currentFrame,
      viewMode,
      isCapturing,
      isStoppingCapture,
      captureStartTime,
      captureEndTime,
      isExpanded,
      isScreenshotLoading,
      selectedArea,
      resolutionInfo: {
        device: resolutionInfo || null,
        capture: null,
        stream: null,
      },
    }),
    [
      isConnected,
      connectionError,
      streamStatus,
      streamUrl,
      lastScreenshotPath,
      currentFrame,
      viewMode,
      isCapturing,
      isStoppingCapture,
      captureStartTime,
      captureEndTime,
      isExpanded,
      isScreenshotLoading,
      selectedArea,
      resolutionInfo,
    ],
  );

  // Actions object
  const actions: ScreenEditorActions = useMemo(
    () => ({
      handleStartCapture,
      handleStopCapture,
      handleTakeScreenshot,
      restartStream,
      handleToggleExpanded,
      handleFrameChange,
      handleBackToStream,
      handleAreaSelected,
      handleClearSelection: () => {
        setSelectedArea(null);
      },
      handleTap,
      getStreamUrl,
    }),
    [
      handleStartCapture,
      handleStopCapture,
      handleTakeScreenshot,
      restartStream,
      handleToggleExpanded,
      handleFrameChange,
      handleBackToStream,
      handleAreaSelected,
      handleTap,
      getStreamUrl,
    ],
  );

  // Auto-connect when device is available
  useEffect(() => {
    if (selectedHost && device) {
      console.log(
        `[@hook:useScreenEditor] Auto-connecting to device: ${device.name} (${device.model})`,
      );
      setIsConnected(true);
      setConnectionError(null);
    } else {
      console.log('[@hook:useScreenEditor] No device selected, disconnecting');
      setIsConnected(false);
      setStreamUrl(undefined);
    }
  }, [selectedHost, device]);

  return {
    state,
    actions,
    deviceModel,
    avConfig,
    compactLayoutConfig,
    verificationEditorLayout,
    streamViewerSx,
  };
};

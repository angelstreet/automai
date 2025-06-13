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
  calculateExpectedFrames,
} from '../../utils/userinterface/screenEditorUtils';

export const useScreenEditor = (selectedHostDevice: any, onDisconnectComplete?: () => void) => {
  // Extract everything from selectedHostDevice
  const deviceModel = selectedHostDevice?.device_model || selectedHostDevice?.model;
  const deviceConfig = selectedHostDevice?.controller_configs;
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
  const [videoFramesPath, setVideoFramesPath] = useState<string | undefined>(undefined);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [viewMode, setViewMode] = useState<ScreenViewMode>('stream');

  // Memoize sx props to prevent new object references
  const streamViewerSx = useMemo(() => createStreamViewerSx(viewMode), [viewMode]);

  // Stream status state
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('running');

  // Capture timing state
  const [captureStartTime, setCaptureStartTime] = useState<Date | null>(null);
  const [captureEndTime, setCaptureEndTime] = useState<Date | null>(null);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [savedFrameCount, setSavedFrameCount] = useState(0);

  // Capture state
  const [isCapturing, setIsCapturing] = useState(false);
  const [isStoppingCapture, setIsStoppingCapture] = useState(false);

  // UI state
  const [isExpanded, setIsExpanded] = useState(false);

  // Stream URL state
  const [streamUrl, setStreamUrl] = useState<string | undefined>(undefined);

  // Screenshot loading state
  const [isScreenshotLoading, setIsScreenshotLoading] = useState(false);

  const [resolutionInfo, setResolutionInfo] = useState<{
    device: { width: number; height: number } | null;
    capture: string | null;
    stream: string | null;
  }>({
    device: null,
    capture: null,
    stream: null,
  });

  // VerificationEditor integration state
  const [captureImageRef, setCaptureImageRef] = useState<
    React.RefObject<HTMLImageElement> | undefined
  >(undefined);
  const [captureImageDimensions, setCaptureImageDimensions] = useState<
    { width: number; height: number } | undefined
  >(undefined);
  const [captureSourcePath, setCaptureSourcePath] = useState<string | undefined>(undefined);

  // Drag selection state
  const [selectedArea, setSelectedArea] = useState<SelectedArea | null>(null);

  // Check for existing remote connection ONCE (no loops)
  useEffect(() => {
    // Controllers are configured during registration
    setIsConnected(true);
    setConnectionError(null);
    setStreamStatus('running');
  }, []);

  // Initialize stream status
  useEffect(() => {
    if (isConnected) {
      setStreamStatus('running');
    }
  }, [isConnected]);

  // Get stream URL from AV controller - using controller proxy
  const getStreamUrl = useCallback(async () => {
    if (!selectedHostDevice) {
      console.log('[@component:ScreenDefinitionEditor] No selectedHostDevice available');
      return undefined;
    }

    try {
      console.log(
        '[@component:ScreenDefinitionEditor] Getting stream URL from AV controller proxy...',
      );

      // Get the AV controller proxy from selectedHostDevice
      const avControllerProxy = selectedHostDevice.controllerProxies?.av;

      if (!avControllerProxy) {
        console.log('[@component:ScreenDefinitionEditor] AV controller proxy not available');
        return undefined;
      }

      console.log(
        '[@component:ScreenDefinitionEditor] AV controller proxy found, calling get_stream_url...',
      );

      // Call get_stream_url on the AV controller proxy
      const streamUrl = await avControllerProxy.get_stream_url();

      if (streamUrl) {
        console.log('[@component:ScreenDefinitionEditor] Got stream URL from proxy:', streamUrl);
        return streamUrl;
      } else {
        console.log('[@component:ScreenDefinitionEditor] No stream URL returned from proxy');
        return undefined;
      }
    } catch (error) {
      console.error(
        '[@component:ScreenDefinitionEditor] Error getting stream URL from proxy:',
        error,
      );
      return undefined;
    }
  }, [selectedHostDevice]);

  // Fetch stream URL when component mounts and selectedHostDevice is available
  useEffect(() => {
    if (selectedHostDevice && isConnected) {
      console.log('[@component:ScreenDefinitionEditor] Fetching stream URL...');
      getStreamUrl()
        .then((url) => {
          setStreamUrl(url);
        })
        .catch((error) => {
          console.error('[@component:ScreenDefinitionEditor] Error fetching stream URL:', error);
          setStreamUrl(undefined);
        });
    }
  }, [selectedHostDevice, isConnected, getStreamUrl]);

  // Memoize onTap callback to prevent new function references
  const handleTap = useCallback(
    async (x: number, y: number) => {
      console.log(
        `🎯 [@component:ScreenDefinitionEditor] Tapped at device coordinates: ${x}, ${y}`,
      );

      // Try to use remote controller proxy if available
      if (selectedHostDevice?.controllerProxies?.remote) {
        try {
          console.log(
            `[@component:ScreenDefinitionEditor] Using remote controller proxy to tap at coordinates: (${x}, ${y})`,
          );
          const result = await selectedHostDevice.controllerProxies.remote.tap(x, y);

          if (result.success) {
            console.log(
              `[@component:ScreenDefinitionEditor] Tap successful at coordinates: (${x}, ${y})`,
            );
          } else {
            console.error(`[@component:ScreenDefinitionEditor] Tap failed: ${result.error}`);
          }
        } catch (error) {
          console.error(`[@component:ScreenDefinitionEditor] Error during tap operation:`, error);
        }
      } else {
        console.log(
          `[@component:ScreenDefinitionEditor] No remote controller proxy available - tap coordinates logged only`,
        );
      }
    },
    [selectedHostDevice],
  );

  // Restart stream - simplified to just reload the player
  const restartStream = useCallback(async () => {
    try {
      console.log('[@component:ScreenDefinitionEditor] Reloading stream in player...');

      // Simply switch to stream view and let the StreamViewer component handle reloading
      setStreamStatus('running');
      setViewMode('stream');
      setLastScreenshotPath(undefined);
      setVideoFramesPath(undefined);
      setCurrentFrame(0);
      setTotalFrames(0);
      setSavedFrameCount(0);

      // Log the stream URL from the remote controller
      const streamUrl = await getStreamUrl();
      if (streamUrl) {
        console.log('[@component:ScreenDefinitionEditor] Stream URL from controller:', streamUrl);
      } else {
        console.log('[@component:ScreenDefinitionEditor] No stream URL available from controller');
      }

      console.log('[@component:ScreenDefinitionEditor] Stream player will reload automatically');
    } catch (error) {
      console.error('[@component:ScreenDefinitionEditor] Error during stream reload:', error);
    }
  }, [getStreamUrl]);

  // Start video capture - new simple logic: just record timestamp and show LED
  const handleStartCapture = useCallback(async () => {
    console.log(
      `[@component:ScreenDefinitionEditor] handleStartCapture called - viewMode: ${viewMode}, isConnected: ${isConnected}, isCapturing: ${isCapturing}`,
    );

    if (!isConnected || isCapturing) {
      console.log(
        `[@component:ScreenDefinitionEditor] Early return - isConnected: ${isConnected}, isCapturing: ${isCapturing}`,
      );
      return;
    }

    // If already in capture mode (viewing saved frames), restart stream first, then start capturing
    if (viewMode === 'capture') {
      console.log(
        '[@component:ScreenDefinitionEditor] Already in capture mode, restarting stream first...',
      );
      setViewMode('stream');
      setLastScreenshotPath(undefined);
      setVideoFramesPath(undefined);
      setCurrentFrame(0);
      setTotalFrames(0);
      setSavedFrameCount(0);
      setCaptureStartTime(null);
      setCaptureEndTime(null);
      await restartStream();

      // After restart, automatically proceed with capture start
      console.log('[@component:ScreenDefinitionEditor] Stream restarted, now starting capture...');
    }

    try {
      console.log(
        '[@component:ScreenDefinitionEditor] Starting video capture (timestamp tracking only)...',
      );

      // Record capture start time in Zurich timezone
      const startTime = new Date();
      setCaptureStartTime(startTime);
      setCaptureEndTime(null); // Clear end time

      console.log(
        '[@component:ScreenDefinitionEditor] Capture start time:',
        startTime.toISOString(),
      );

      // Reset frame count and set capturing state (just for UI)
      setSavedFrameCount(0);
      setIsCapturing(true);

      // If in screenshot view, restart stream first
      if (viewMode === 'screenshot') {
        await restartStream();
      }

      // No backend API calls - host handles capture automatically
      console.log(
        '[@component:ScreenDefinitionEditor] Capture started - host will handle frame capture automatically',
      );
      console.log('[@component:ScreenDefinitionEditor] Showing red LED, staying in stream view');
    } catch (error) {
      console.error('[@component:ScreenDefinitionEditor] Failed to start capture:', error);
      setIsCapturing(false);
      setCaptureStartTime(null);
    }
  }, [viewMode, isConnected, isCapturing, restartStream]);

  // Stop video capture - new simple logic: calculate duration and switch to video view
  const handleStopCapture = useCallback(async () => {
    if (!isCapturing || isStoppingCapture) return;

    try {
      console.log(
        '[@component:ScreenDefinitionEditor] Stopping video capture (timestamp tracking only)...',
      );

      // Record capture end time
      const endTime = new Date();
      setCaptureEndTime(endTime);

      console.log('[@component:ScreenDefinitionEditor] Capture end time:', endTime.toISOString());

      // Calculate duration and expected frame count (1 frame per second)
      const expectedFrames = calculateExpectedFrames(captureStartTime, endTime);
      console.log(`[@component:ScreenDefinitionEditor] Expected frames: ${expectedFrames}`);

      // Disable the stop button to prevent multiple clicks
      setIsStoppingCapture(true);

      // No backend API calls - just local state management
      console.log('[@component:ScreenDefinitionEditor] Capture stopped - no backend calls needed');

      // Set up for viewing captured frames
      if (expectedFrames > 0) {
        setSavedFrameCount(expectedFrames);
        setVideoFramesPath('/tmp/captures'); // Not used, but kept for compatibility
        setTotalFrames(expectedFrames);
        setCurrentFrame(0); // Start with first frame
        setViewMode('capture'); // Switch to capture view
        console.log(
          `[@component:ScreenDefinitionEditor] Switching to capture view with ${expectedFrames} frames`,
        );
      } else {
        console.log(
          '[@component:ScreenDefinitionEditor] No frames expected (duration too short), staying in stream view',
        );
      }
    } catch (error) {
      console.error('[@component:ScreenDefinitionEditor] Failed to stop capture:', error);
      // Use expected frames as fallback
      if (captureStartTime) {
        const endTime = new Date();
        const expectedFrames = calculateExpectedFrames(captureStartTime, endTime);
        setSavedFrameCount(expectedFrames);
        if (expectedFrames > 0) {
          setVideoFramesPath('/tmp/captures');
          setTotalFrames(expectedFrames);
          setCurrentFrame(0);
          setViewMode('capture');
        }
      }
    } finally {
      // Always update local state
      setIsCapturing(false);

      // Reset the stopping state
      setIsStoppingCapture(false);
    }
  }, [isCapturing, isStoppingCapture, captureStartTime]);

  // Take screenshot using controller directly - no control logic needed
  const handleTakeScreenshot = useCallback(async () => {
    if (!isConnected || !selectedHostDevice) return;

    try {
      setIsScreenshotLoading(true);
      setViewMode('screenshot');

      console.log(
        '[@component:ScreenDefinitionEditor] Taking screenshot using AV controller proxy...',
      );

      // Get the AV controller proxy from selectedHostDevice
      const avControllerProxy = selectedHostDevice.controllerProxies?.av;

      if (!avControllerProxy) {
        throw new Error(
          'AV controller proxy not available. Host may not have AV capabilities or proxy creation failed.',
        );
      }

      console.log(
        '[@component:ScreenDefinitionEditor] AV controller proxy found, calling take_screenshot...',
      );

      // Call take_screenshot on the AV controller proxy
      const screenshotUrl = await avControllerProxy.take_screenshot();

      if (screenshotUrl) {
        console.log(
          '[@component:ScreenDefinitionEditor] Screenshot taken successfully:',
          screenshotUrl,
        );
        setLastScreenshotPath(screenshotUrl);
        setStreamStatus('stopped');
      } else {
        console.error('[@component:ScreenDefinitionEditor] Screenshot failed - no URL returned');
      }
    } catch (error) {
      console.error('[@component:ScreenDefinitionEditor] Screenshot operation failed:', error);
    } finally {
      setIsScreenshotLoading(false);
    }
  }, [isConnected, selectedHostDevice]);

  // Disconnect handler
  const handleDisconnect = useCallback(async () => {
    try {
      setIsConnected(false);
      setConnectionError(null);
      setStreamStatus('unknown');

      // Clean up any active captures
      if (isCapturing) {
        await handleStopCapture();
      }

      // Reset states
      setLastScreenshotPath(undefined);
      setVideoFramesPath(undefined);
      setCurrentFrame(0);
      setTotalFrames(0);
      setViewMode('stream');

      // Clear drag selection when disconnecting
      setSelectedArea(null);

      if (onDisconnectComplete) {
        onDisconnectComplete();
      }
    } catch (error) {
      console.error('[@component:ScreenDefinitionEditor] Disconnect error:', error);
    }
  }, [isCapturing, handleStopCapture, onDisconnectComplete]);

  const handleToggleExpanded = useCallback(async () => {
    // If we're collapsing and currently in capture or screenshot view, restart stream
    if (isExpanded && (viewMode === 'capture' || viewMode === 'screenshot')) {
      console.log(
        '[@component:ScreenDefinitionEditor] Collapsing from capture/screenshot view, restarting stream...',
      );
      await restartStream();
    }

    setIsExpanded(!isExpanded);
    // Clear drag selection when collapsing
    if (isExpanded) {
      setSelectedArea(null);
    }
  }, [isExpanded, viewMode, restartStream]);

  // Handle frame change in preview
  const handleFrameChange = useCallback((frame: number) => {
    setCurrentFrame(frame);
  }, []);

  // Handle returning to stream view from capture view
  const handleBackToStream = useCallback(() => {
    console.log('[@component:ScreenDefinitionEditor] Returning to stream view from capture view');
    setViewMode('stream');
    setVideoFramesPath(undefined);
    setCurrentFrame(0);
    setTotalFrames(0);
    setSavedFrameCount(0);
    // Clear drag selection when returning to stream
    setSelectedArea(null);
  }, []);

  // Add type safety to the onScreenshotTaken handler
  const handleScreenshotTaken = useCallback((path: string) => {
    setLastScreenshotPath(path);
    setViewMode('screenshot');
  }, []);

  // Initialize verification image state
  const handleImageLoad = useCallback(
    (
      ref: React.RefObject<HTMLImageElement>,
      dimensions: { width: number; height: number },
      sourcePath: string,
    ) => {
      console.log('[@component:ScreenDefinitionEditor] Image loaded for verification:', {
        dimensions,
        sourcePath,
      });
      setCaptureImageRef(ref);
      setCaptureImageDimensions(dimensions);
      setCaptureSourcePath(sourcePath);
    },
    [],
  );

  // Handle area selection from drag overlay
  const handleAreaSelected = useCallback((area: SelectedArea) => {
    console.log('[@component:ScreenDefinitionEditor] Area selected:', area);
    setSelectedArea(area);
  }, []);

  // Handle clearing selection
  const handleClearSelection = useCallback(() => {
    console.log('[@component:ScreenDefinitionEditor] Clearing selection');
    setSelectedArea(null);
  }, []);

  // Clear drag selection when view mode changes away from screenshot/capture
  useEffect(() => {
    if (viewMode === 'stream') {
      setSelectedArea(null);
    }
  }, [viewMode]);

  const state: ScreenEditorState = {
    isConnected,
    connectionError,
    streamStatus,
    streamUrl,
    lastScreenshotPath,
    videoFramesPath,
    currentFrame,
    totalFrames,
    viewMode,
    isCapturing,
    isStoppingCapture,
    captureStartTime,
    captureEndTime,
    isExpanded,
    isScreenshotLoading,
    isSaving,
    savedFrameCount,
    selectedArea,
    captureImageRef,
    captureImageDimensions,
    captureSourcePath,
    resolutionInfo,
  };

  const actions: ScreenEditorActions = {
    handleStartCapture,
    handleStopCapture,
    handleTakeScreenshot,
    restartStream,
    handleDisconnect,
    handleToggleExpanded,
    handleFrameChange,
    handleBackToStream,
    handleScreenshotTaken,
    handleImageLoad,
    handleAreaSelected,
    handleClearSelection,
    handleTap,
    getStreamUrl,
  };

  return {
    state,
    actions,
    deviceModel,
    deviceConfig,
    avConfig,
    compactLayoutConfig,
    verificationEditorLayout,
    deviceResolution,
    streamViewerSx,
  };
};

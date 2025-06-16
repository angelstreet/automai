import {
  PhotoCamera,
  VideoCall,
  StopCircle,
  Fullscreen,
  FullscreenExit,
  Refresh,
} from '@mui/icons-material';
import { Box, IconButton, Tooltip } from '@mui/material';
import { useEffect, useState, useCallback } from 'react';

import { useHdmiStream } from '../../../hooks/controller';
import { Host } from '../../../types/common/Host_Types';

import {
  RecordingOverlay,
  LoadingOverlay,
  ModeIndicatorDot,
  StatusIndicator,
} from './ScreenEditorOverlay';
import { ScreenshotCapture } from './ScreenshotCapture';
import { StreamViewer } from './StreamViewer';
import { VideoCapture } from './VideoCapture';

interface HDMIStreamProps {
  host: Host;
  onDisconnectComplete?: () => void;
  onExpandedChange?: (isExpanded: boolean) => void;
  sx?: any;
}

export function HDMIStream({
  host,
  onDisconnectComplete: _onDisconnectComplete,
  onExpandedChange,
  sx = {},
}: HDMIStreamProps) {
  // Stream URL fetching state
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [isStreamActive, setIsStreamActive] = useState<boolean>(false);
  const [isLoadingStream, setIsLoadingStream] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isScreenshotLoading, setIsScreenshotLoading] = useState<boolean>(false);

  // Use the existing hook with our fetched stream data
  const {
    // State from hook
    captureMode,
    isCaptureActive,
    captureImageRef: _captureImageRef,
    captureImageDimensions: _captureImageDimensions,
    originalImageDimensions: _originalImageDimensions,
    captureSourcePath,
    selectedArea,
    screenshotPath,
    videoFramesPath,
    totalFrames,
    currentFrame,
    layoutConfig,

    // Actions from hook
    setCaptureMode,
    setCurrentFrame,
    handleAreaSelected,
    handleClearSelection,
    handleImageLoad,
    handleTakeScreenshot: hookTakeScreenshot,
  } = useHdmiStream({
    host,
    streamUrl,
    isStreamActive,
  });

  // Fetch stream URL from server
  const fetchStreamUrl = useCallback(async () => {
    if (!host) return;

    setIsLoadingStream(true);
    try {
      console.log(`[@component:HDMIStream] Fetching stream URL for host: ${host.host_name}`);

      const response = await fetch('/server/av/get-stream-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: host,
        }),
      });

      const result = await response.json();

      if (result.success && result.stream_url) {
        console.log(`[@component:HDMIStream] Stream URL received: ${result.stream_url}`);
        setStreamUrl(result.stream_url);
        setIsStreamActive(true);
      } else {
        console.error(`[@component:HDMIStream] Failed to get stream URL:`, result.error);
        setStreamUrl('');
        setIsStreamActive(false);
      }
    } catch (error) {
      console.error(`[@component:HDMIStream] Error getting stream URL:`, error);
      setStreamUrl('');
      setIsStreamActive(false);
    } finally {
      setIsLoadingStream(false);
    }
  }, [host]);

  // Initialize stream URL on mount and when host changes
  useEffect(() => {
    fetchStreamUrl();
  }, [fetchStreamUrl]);

  // Notify parent of initial expanded state
  useEffect(() => {
    onExpandedChange?.(isExpanded);
  }, [isExpanded, onExpandedChange]);

  // Enhanced screenshot handler that updates capture mode
  const handleTakeScreenshot = useCallback(async () => {
    setIsScreenshotLoading(true);
    try {
      await hookTakeScreenshot();
      setCaptureMode('screenshot');
    } finally {
      setIsScreenshotLoading(false);
    }
  }, [hookTakeScreenshot, setCaptureMode]);

  // Start video capture
  const handleStartCapture = useCallback(async () => {
    try {
      console.log(`[@component:HDMIStream] Starting video capture`);
      setCaptureMode('video');
      // Add actual capture start logic here if needed
    } catch (error) {
      console.error(`[@component:HDMIStream] Error starting capture:`, error);
    }
  }, [setCaptureMode]);

  // Stop video capture
  const handleStopCapture = useCallback(async () => {
    try {
      console.log(`[@component:HDMIStream] Stopping video capture`);
      setCaptureMode('stream');
      // Add actual capture stop logic here if needed
    } catch (error) {
      console.error(`[@component:HDMIStream] Error stopping capture:`, error);
    }
  }, [setCaptureMode]);

  // Restart stream
  const restartStream = useCallback(() => {
    console.log(`[@component:HDMIStream] Restarting stream`);
    setStreamUrl('');
    setIsStreamActive(false);
    setTimeout(() => {
      fetchStreamUrl();
    }, 1000);
  }, [fetchStreamUrl]);

  // Toggle expanded view
  const handleToggleExpanded = useCallback(() => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onExpandedChange?.(newExpanded);
  }, [isExpanded, onExpandedChange]);

  // Back to stream from other modes
  const handleBackToStream = useCallback(() => {
    setCaptureMode('stream');
  }, [setCaptureMode]);

  // Handle frame changes in video capture
  const handleFrameChange = useCallback(
    (frame: number) => {
      setCurrentFrame(frame);
    },
    [setCurrentFrame],
  );

  // Handle tap on stream (for remote control)
  const handleTap = useCallback((x: number, y: number) => {
    console.log(`[@component:HDMIStream] Tap at coordinates: ${x}, ${y}`);
    // Add tap handling logic here if needed
  }, []);

  // Get device resolution for click overlay
  const deviceResolution = { width: 1920, height: 1080 }; // Default, should come from host config

  // Determine stream status for UI
  const streamStatus = isLoadingStream ? 'loading' : isStreamActive ? 'running' : 'stopped';

  // Compact dimensions based on device model
  const compactDimensions = {
    width: layoutConfig.isMobileModel ? 300 : 400,
    height: layoutConfig.isMobileModel ? 600 : 300,
  };

  // Base container styles
  const baseContainerStyles = {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    ...sx,
  };

  return (
    <Box sx={baseContainerStyles}>
      {isExpanded ? (
        // Expanded view with header controls
        <Box
          sx={{
            display: 'flex',
            gap: 0,
            boxShadow: 2,
            borderRadius: 1,
            overflow: 'hidden',
          }}
        >
          {/* Main HDMI Stream Panel */}
          <Box
            sx={{
              width: 800,
              height: 600,
              bgcolor: '#1E1E1E',
              border: '2px solid #1E1E1E',
              borderRadius: '1px 0 0 1px',
            }}
          >
            {/* Header with controls */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 1,
                borderBottom: '1px solid #333',
                height: '48px',
              }}
            >
              {/* Left section - status indicator */}
              <Box
                sx={{
                  width: '80px',
                  display: 'flex',
                  justifyContent: 'flex-start',
                }}
              >
                <StatusIndicator streamStatus={streamStatus} />
              </Box>

              {/* Center section - action buttons */}
              <Box
                sx={{
                  display: 'flex',
                  gap: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 1,
                }}
              >
                <Tooltip title="Take Screenshot">
                  <span>
                    <IconButton
                      size="small"
                      onClick={handleTakeScreenshot}
                      sx={{
                        color:
                          captureMode === 'screenshot' || isScreenshotLoading
                            ? '#ff4444'
                            : '#ffffff',
                        borderBottom:
                          captureMode === 'screenshot' || isScreenshotLoading
                            ? '2px solid #ff4444'
                            : 'none',
                      }}
                      disabled={!isStreamActive || isCaptureActive || isScreenshotLoading}
                    >
                      <PhotoCamera />
                    </IconButton>
                  </span>
                </Tooltip>

                {isCaptureActive ? (
                  <Tooltip title="Stop Capture">
                    <span>
                      <IconButton
                        size="small"
                        onClick={handleStopCapture}
                        sx={{
                          color: captureMode === 'video' || isCaptureActive ? '#ff4444' : '#ffffff',
                          borderBottom:
                            captureMode === 'video' || isCaptureActive
                              ? '2px solid #ff4444'
                              : 'none',
                        }}
                      >
                        <StopCircle />
                      </IconButton>
                    </span>
                  </Tooltip>
                ) : (
                  <Tooltip title="Start Capture">
                    <span>
                      <IconButton
                        size="small"
                        onClick={handleStartCapture}
                        sx={{
                          color:
                            captureMode === 'capture' || isCaptureActive ? '#ff4444' : '#ffffff',
                          borderBottom:
                            captureMode === 'capture' || isCaptureActive
                              ? '2px solid #ff4444'
                              : 'none',
                        }}
                        disabled={!isStreamActive}
                      >
                        <VideoCall />
                      </IconButton>
                    </span>
                  </Tooltip>
                )}

                <Tooltip title="Restart Stream">
                  <span>
                    <IconButton
                      size="small"
                      onClick={restartStream}
                      sx={{ color: '#ffffff' }}
                      disabled={!isStreamActive || isCaptureActive}
                    >
                      <Refresh />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>

              {/* Right section - minimize button */}
              <Box
                sx={{
                  width: '40px',
                  display: 'flex',
                  justifyContent: 'flex-end',
                }}
              >
                <Tooltip title="Minimize">
                  <span>
                    <IconButton
                      size="small"
                      onClick={handleToggleExpanded}
                      sx={{ color: '#ffffff' }}
                    >
                      <FullscreenExit />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </Box>

            {/* Main viewing area */}
            <Box
              sx={{
                flex: 1,
                position: 'relative',
                overflow: 'hidden',
                height: 'calc(100% - 48px)',
              }}
            >
              {/* Stream viewer - always rendered at top level */}
              <StreamViewer
                key="main-stream-viewer"
                streamUrl={streamUrl}
                isStreamActive={isStreamActive && !isScreenshotLoading}
                isCapturing={isCaptureActive}
                model={host.device_model}
                enableClick={true}
                deviceResolution={deviceResolution}
                deviceId={`${host.host_ip}:5555`}
                onTap={handleTap}
                selectedHostDevice={host}
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                }}
              />

              {/* Screenshot capture overlay */}
              {captureMode === 'screenshot' && (
                <ScreenshotCapture
                  screenshotPath={screenshotPath}
                  isCapturing={false}
                  isSaving={isScreenshotLoading}
                  onImageLoad={handleImageLoad}
                  selectedArea={selectedArea}
                  onAreaSelected={handleAreaSelected}
                  model={host.device_model}
                  selectedHostDevice={host}
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: 5,
                  }}
                />
              )}

              {/* Video capture overlay */}
              {captureMode === 'capture' && (
                <VideoCapture
                  deviceModel={host.device_model}
                  hostIp={host.host_ip}
                  hostPort="444"
                  videoFramesPath={videoFramesPath}
                  currentFrame={currentFrame}
                  totalFrames={totalFrames}
                  onFrameChange={handleFrameChange}
                  onBackToStream={handleBackToStream}
                  isSaving={false}
                  savedFrameCount={0}
                  onImageLoad={handleImageLoad}
                  selectedArea={selectedArea}
                  onAreaSelected={handleAreaSelected}
                  isCapturing={isCaptureActive}
                  selectedHostDevice={host}
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: 5,
                  }}
                />
              )}

              {/* Overlays */}
              <LoadingOverlay isScreenshotLoading={isScreenshotLoading} />
              <RecordingOverlay isCapturing={isCaptureActive} />
            </Box>
          </Box>
        </Box>
      ) : (
        // Compact view
        <Box
          sx={{
            width: compactDimensions.width,
            height: compactDimensions.height,
            bgcolor: '#1E1E1E',
            border: '2px solid #1E1E1E',
            borderRadius: 1,
            overflow: 'hidden',
            position: 'relative',
            boxShadow: 2,
          }}
        >
          {/* Stream viewer - always rendered */}
          <StreamViewer
            key="compact-stream-viewer"
            streamUrl={streamUrl}
            isStreamActive={isStreamActive && !isScreenshotLoading}
            isCapturing={isCaptureActive}
            model={host.device_model}
            enableClick={true}
            deviceResolution={deviceResolution}
            deviceId={`${host.host_ip}:5555`}
            onTap={handleTap}
            selectedHostDevice={host}
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
            }}
          />

          {/* Screenshot capture overlay */}
          {captureMode === 'screenshot' && (
            <ScreenshotCapture
              screenshotPath={screenshotPath}
              isCapturing={false}
              isSaving={isScreenshotLoading}
              onImageLoad={handleImageLoad}
              selectedArea={selectedArea}
              onAreaSelected={handleAreaSelected}
              model={host.device_model}
              selectedHostDevice={host}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 5,
              }}
            />
          )}

          {/* Video capture overlay */}
          {captureMode === 'capture' && (
            <VideoCapture
              deviceModel={host.device_model}
              hostIp={host.host_ip}
              hostPort="444"
              videoFramesPath={videoFramesPath}
              currentFrame={currentFrame}
              totalFrames={totalFrames}
              onFrameChange={handleFrameChange}
              onBackToStream={handleBackToStream}
              isSaving={false}
              savedFrameCount={0}
              onImageLoad={handleImageLoad}
              selectedArea={selectedArea}
              onAreaSelected={handleAreaSelected}
              isCapturing={isCaptureActive}
              selectedHostDevice={host}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 5,
              }}
            />
          )}

          {/* Mode indicator dot */}
          <ModeIndicatorDot viewMode={captureMode} />

          {/* Expand button */}
          <IconButton
            size="small"
            onClick={handleToggleExpanded}
            sx={{
              position: 'absolute',
              top: 4,
              right: 4,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              color: '#ffffff',
              zIndex: 1,
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
              },
            }}
          >
            <Fullscreen sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      )}
    </Box>
  );
}

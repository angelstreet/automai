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

import { getConfigurableAVPanelLayout, loadAVConfig } from '../../../config/av';
import { useHdmiStream } from '../../../hooks/controller';
import { Host } from '../../../types/common/Host_Types';

import { RecordingOverlay, LoadingOverlay, ModeIndicatorDot } from './ScreenEditorOverlay';
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
  const [_isLoadingStream, setIsLoadingStream] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isScreenshotLoading, setIsScreenshotLoading] = useState<boolean>(false);

  // AV config state
  const [avConfig, setAvConfig] = useState<any>(null);

  // Load AV config
  useEffect(() => {
    const loadConfig = async () => {
      const config = await loadAVConfig('hdmi_stream', host.device_model);
      setAvConfig(config);
    };

    loadConfig();
  }, [host.device_model]);

  // Get configurable layout from AV config
  const panelLayout = getConfigurableAVPanelLayout(host.device_model, avConfig);

  // Use the existing hook with our fetched stream data
  const {
    // State from hook
    captureMode,
    isCaptureActive,
    captureImageRef: _captureImageRef,
    captureImageDimensions: _captureImageDimensions,
    originalImageDimensions: _originalImageDimensions,
    captureSourcePath: _captureSourcePath,
    selectedArea,
    screenshotPath,
    videoFramesPath,
    totalFrames,
    currentFrame,
    layoutConfig: _layoutConfig,

    // Actions from hook
    setCaptureMode,
    setCurrentFrame,
    handleAreaSelected,
    handleClearSelection: _handleClearSelection,
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

  // Handle frame changes in video capture
  const handleFrameChange = useCallback(
    (frame: number) => {
      setCurrentFrame(frame);
    },
    [setCurrentFrame],
  );

  // Back to stream from other modes
  const handleBackToStream = useCallback(() => {
    setCaptureMode('stream');
  }, [setCaptureMode]);

  // Handle tap on stream (for remote control)
  const handleTap = useCallback((x: number, y: number) => {
    console.log(`[@component:HDMIStream] Tap at coordinates: ${x}, ${y}`);
    // Add tap handling logic here if needed
  }, []);

  // Get device resolution for click overlay
  const deviceResolution = { width: 1920, height: 1080 }; // Default, should come from host config

  // Use dimensions directly from the loaded config (no device_specific needed)
  const collapsedWidth = panelLayout.collapsed.width;
  const collapsedHeight = panelLayout.collapsed.height;
  const expandedWidth = panelLayout.expanded.width;
  const expandedHeight = panelLayout.expanded.height;

  // Build position styles - simple container without scaling
  const positionStyles: any = {
    position: 'fixed',
    zIndex: panelLayout.zIndex,
    // Always anchor at bottom-left (collapsed position)
    bottom: panelLayout.collapsed.position.bottom || '20px',
    left: panelLayout.collapsed.position.left || '20px',
    // Remove scaling - we'll animate the inner container instead
    ...sx,
  };

  return (
    <Box sx={positionStyles}>
      {/* Inner content container - uses appropriate size for state */}
      <Box
        sx={{
          width: isExpanded ? expandedWidth : collapsedWidth,
          height: isExpanded ? expandedHeight : collapsedHeight,
          position: 'absolute',
          // Simple positioning - bottom and left anchored
          bottom: 0,
          left: 0,
          backgroundColor: '#1E1E1E',
          border: '2px solid #1E1E1E',
          borderRadius: 1,
          overflow: 'hidden',
          transition: 'width 0.3s ease-in-out, height 0.3s ease-in-out',
        }}
      >
        {/* Header with toggle button */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: parseInt(avConfig?.panel_layout?.header?.padding || '8px') / 8,
            height: avConfig?.panel_layout?.header?.height || '48px',
            borderBottom: `1px solid ${avConfig?.panel_layout?.header?.borderColor || '#333'}`,
            bgcolor: avConfig?.panel_layout?.header?.backgroundColor || '#1E1E1E',
            color: avConfig?.panel_layout?.header?.textColor || '#ffffff',
          }}
        >
          <Box
            sx={{
              fontSize: avConfig?.panel_layout?.header?.fontSize || '0.875rem',
              fontWeight: avConfig?.panel_layout?.header?.fontWeight || 'bold',
            }}
          >
            {avConfig?.stream_info?.name || 'HDMI Stream'}
          </Box>
          <Tooltip title={isExpanded ? 'Collapse Panel' : 'Expand Panel'}>
            <IconButton
              size={avConfig?.panel_layout?.header?.iconSize || 'small'}
              onClick={handleToggleExpanded}
              sx={{ color: 'inherit' }}
            >
              {isExpanded ? (
                <FullscreenExit fontSize={avConfig?.panel_layout?.header?.iconSize || 'small'} />
              ) : (
                <Fullscreen fontSize={avConfig?.panel_layout?.header?.iconSize || 'small'} />
              )}
            </IconButton>
          </Tooltip>
        </Box>

        {/* Stream Content */}
        <Box
          sx={{
            height: `calc(100% - ${avConfig?.panel_layout?.header?.height || '48px'})`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Stream viewer - always rendered */}
          <StreamViewer
            key="stream-viewer"
            streamUrl={streamUrl}
            isStreamActive={isStreamActive && !isScreenshotLoading}
            isCapturing={isCaptureActive}
            model={host.device_model}
            enableClick={true}
            deviceResolution={deviceResolution}
            deviceId={`${host.host_name}:5555`}
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
              hostIp={host.host_name}
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

          {/* Mode indicator dot for collapsed view */}
          {!isExpanded && <ModeIndicatorDot viewMode={captureMode} />}

          {/* Action buttons for expanded view */}
          {isExpanded && panelLayout.showControlsInExpanded && (
            <Box
              sx={{
                position: 'absolute',
                top: 8,
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: 1,
                zIndex: 10,
              }}
            >
              <Tooltip title="Take Screenshot">
                <IconButton
                  size={avConfig?.panel_layout?.actionButtons?.buttonSize || 'small'}
                  onClick={handleTakeScreenshot}
                  sx={{
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    color:
                      captureMode === 'screenshot' || isScreenshotLoading ? '#ff4444' : '#ffffff',
                    '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.7)' },
                  }}
                  disabled={!isStreamActive || isCaptureActive || isScreenshotLoading}
                >
                  <PhotoCamera
                    sx={{ fontSize: avConfig?.panel_layout?.actionButtons?.iconSize || 16 }}
                  />
                </IconButton>
              </Tooltip>

              {isCaptureActive ? (
                <Tooltip title="Stop Capture">
                  <IconButton
                    size={avConfig?.panel_layout?.actionButtons?.buttonSize || 'small'}
                    onClick={handleStopCapture}
                    sx={{
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      color: '#ff4444',
                      '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.7)' },
                    }}
                  >
                    <StopCircle
                      sx={{ fontSize: avConfig?.panel_layout?.actionButtons?.iconSize || 16 }}
                    />
                  </IconButton>
                </Tooltip>
              ) : (
                <Tooltip title="Start Capture">
                  <IconButton
                    size={avConfig?.panel_layout?.actionButtons?.buttonSize || 'small'}
                    onClick={handleStartCapture}
                    sx={{
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      color: captureMode === 'capture' ? '#ff4444' : '#ffffff',
                      '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.7)' },
                    }}
                    disabled={!isStreamActive}
                  >
                    <VideoCall
                      sx={{ fontSize: avConfig?.panel_layout?.actionButtons?.iconSize || 16 }}
                    />
                  </IconButton>
                </Tooltip>
              )}

              <Tooltip title="Restart Stream">
                <IconButton
                  size={avConfig?.panel_layout?.actionButtons?.buttonSize || 'small'}
                  onClick={restartStream}
                  sx={{
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    color: '#ffffff',
                    '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.7)' },
                  }}
                  disabled={!isStreamActive || isCaptureActive}
                >
                  <Refresh
                    sx={{ fontSize: avConfig?.panel_layout?.actionButtons?.iconSize || 16 }}
                  />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

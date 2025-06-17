import {
  PhotoCamera,
  VideoCall,
  StopCircle,
  Refresh,
  OpenInFull,
  CloseFullscreen,
  KeyboardArrowDown,
  KeyboardArrowUp,
} from '@mui/icons-material';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { useEffect, useState, useCallback, useMemo } from 'react';

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
  onCollapsedChange?: (isCollapsed: boolean) => void;
  deviceResolution?: { width: number; height: number };
  sx?: any;
}

export function HDMIStream({
  host,
  onDisconnectComplete: _onDisconnectComplete,
  onCollapsedChange,
  deviceResolution: _deviceResolution,
  sx = {},
}: HDMIStreamProps) {
  console.log(`[@component:HDMIStream] Rendering HDMI stream for device: ${host.device_model}`);

  console.log(`[@component:HDMIStream] Using hardcoded resolution: 1920x1080`);

  // Stream URL fetching state
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [isStreamActive, setIsStreamActive] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
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

  // Get configurable layout from AV config - memoized to prevent infinite loops
  const panelLayout = useMemo(() => {
    return getConfigurableAVPanelLayout(host.device_model, avConfig);
  }, [host.device_model, avConfig]);

  // Use the existing hook with our fetched stream data
  const {
    // State from hook
    captureMode,
    isCaptureActive,
    selectedArea,
    screenshotPath,
    videoFramesPath,
    totalFrames,
    currentFrame,

    // Actions from hook
    setCaptureMode,
    setCurrentFrame,
    handleAreaSelected,
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
        // Set both URL and active state together to prevent double initialization
        if (result.stream_url !== streamUrl) {
          setStreamUrl(result.stream_url);
          setIsStreamActive(true);
        } else if (!isStreamActive) {
          setIsStreamActive(true);
        }
      } else {
        console.error(`[@component:HDMIStream] Failed to get stream URL:`, result.error);
        setStreamUrl('');
        setIsStreamActive(false);
      }
    } catch (error) {
      console.error(`[@component:HDMIStream] Error getting stream URL:`, error);
      setStreamUrl('');
      setIsStreamActive(false);
    }
  }, [host, streamUrl, isStreamActive]); // Include all dependencies

  // Initialize stream URL on mount and when host changes
  useEffect(() => {
    fetchStreamUrl();
  }, [fetchStreamUrl]);

  // NOTE: Removed automatic onExpandedChange call to prevent infinite loops
  // onExpandedChange is now only called when user manually toggles expand/collapse

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

  // Smart toggle handlers with minimized state logic
  const handleMinimizeToggle = () => {
    if (isMinimized) {
      // Restore from minimized to collapsed state
      setIsMinimized(false);
      setIsExpanded(false);
      console.log(
        `[@component:HDMIStream] Restored from minimized to collapsed for ${host.device_model}`,
      );
    } else {
      // Minimize the panel
      setIsMinimized(true);
      console.log(`[@component:HDMIStream] Minimized panel for ${host.device_model}`);
    }
  };

  const handleExpandCollapseToggle = () => {
    if (isMinimized) {
      // First restore from minimized to collapsed, then user can click again to expand
      setIsMinimized(false);
      setIsExpanded(false);
      console.log(
        `[@component:HDMIStream] Restored from minimized to collapsed for ${host.device_model}`,
      );
    } else {
      // Normal expand/collapse logic
      const newExpanded = !isExpanded;
      setIsExpanded(newExpanded);
      onCollapsedChange?.(!newExpanded);
      console.log(
        `[@component:HDMIStream] Toggling panel state to ${newExpanded ? 'expanded' : 'collapsed'} for ${host.device_model}`,
      );
    }
  };

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

  const headerHeight = panelLayout.header?.height || '40px';

  // Calculate panel dimensions based on state
  const getPanelWidth = () => {
    if (isMinimized) return collapsedWidth; // Use collapsed width when minimized
    return isExpanded ? expandedWidth : collapsedWidth;
  };

  const getPanelHeight = () => {
    if (isMinimized) return headerHeight; // Only header height when minimized
    return isExpanded ? expandedHeight : collapsedHeight;
  };

  return (
    <Box sx={positionStyles}>
      {/* Inner content container - uses appropriate size for state */}
      <Box
        sx={{
          width: getPanelWidth(),
          height: getPanelHeight(),
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
        {/* Header with minimize and expand/collapse buttons */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 1,
            height: headerHeight,
            borderBottom: isMinimized ? 'none' : '1px solid #333',
            bgcolor: '#1E1E1E',
            color: '#ffffff',
          }}
        >
          {/* Left side: Action buttons (only visible when expanded) */}
          {isExpanded && (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title="Take Screenshot">
                <IconButton
                  size="small"
                  onClick={handleTakeScreenshot}
                  sx={{
                    color:
                      captureMode === 'screenshot' || isScreenshotLoading ? '#ff4444' : '#ffffff',
                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                  }}
                  disabled={!isStreamActive || isCaptureActive || isScreenshotLoading}
                >
                  <PhotoCamera sx={{ fontSize: 20 }} />
                </IconButton>
              </Tooltip>

              {isCaptureActive ? (
                <Tooltip title="Stop Capture">
                  <IconButton
                    size="small"
                    onClick={handleStopCapture}
                    sx={{
                      color: '#ff4444',
                      '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                    }}
                  >
                    <StopCircle sx={{ fontSize: 20 }} />
                  </IconButton>
                </Tooltip>
              ) : (
                <Tooltip title="Start Capture">
                  <IconButton
                    size="small"
                    onClick={handleStartCapture}
                    sx={{
                      color: captureMode === 'video' ? '#ff4444' : '#ffffff',
                      '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                    }}
                    disabled={!isStreamActive}
                  >
                    <VideoCall sx={{ fontSize: 20 }} />
                  </IconButton>
                </Tooltip>
              )}

              <Tooltip title="Restart Stream">
                <IconButton
                  size="small"
                  onClick={restartStream}
                  sx={{
                    color: '#ffffff',
                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                  }}
                  disabled={!isStreamActive || isCaptureActive}
                >
                  <Refresh sx={{ fontSize: 20 }} />
                </IconButton>
              </Tooltip>
            </Box>
          )}

          {/* Center: Title */}
          <Typography
            variant="subtitle2"
            sx={{
              fontSize: '0.875rem',
              fontWeight: 'bold',
              flex: 1,
              textAlign: 'center',
            }}
          >
            HDMI Stream
          </Typography>

          {/* Right side: Minimize and Expand/Collapse buttons */}
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {/* Minimize/Restore button */}
            <Tooltip title={isMinimized ? 'Restore Panel' : 'Minimize Panel'}>
              <IconButton size="small" onClick={handleMinimizeToggle} sx={{ color: 'inherit' }}>
                {isMinimized ? (
                  <KeyboardArrowUp fontSize="small" />
                ) : (
                  <KeyboardArrowDown fontSize="small" />
                )}
              </IconButton>
            </Tooltip>

            {/* Expand/Collapse button */}
            <Tooltip
              title={isMinimized ? 'Restore Panel' : isExpanded ? 'Collapse Panel' : 'Expand Panel'}
            >
              <IconButton
                size="small"
                onClick={handleExpandCollapseToggle}
                sx={{ color: 'inherit' }}
              >
                {isExpanded ? (
                  <CloseFullscreen fontSize="small" />
                ) : (
                  <OpenInFull fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Stream Content - hidden when minimized */}
        {!isMinimized && (
          <Box
            sx={{
              height: `calc(100% - ${headerHeight})`,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            {/* Stream viewer - always rendered */}
            <StreamViewer
              key="stream-viewer"
              streamUrl={streamUrl}
              isStreamActive={isStreamActive && !isScreenshotLoading}
              isCapturing={isCaptureActive}
              model={host.device_model}
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
            {captureMode === 'video' && (
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
          </Box>
        )}
      </Box>
    </Box>
  );
}

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
import { VerificationEditor } from '../verification';

import { RecordingOverlay, LoadingOverlay, ModeIndicatorDot } from './ScreenEditorOverlay';
import { ScreenshotCapture } from './ScreenshotCapture';
import { StreamViewer } from './StreamViewer';
import { VideoCapture } from './VideoCapture';

interface HDMIStreamProps {
  host: Host;
  onCollapsedChange?: (isCollapsed: boolean) => void;
  onMinimizedChange?: (isMinimized: boolean) => void;
  onCaptureModeChange?: (mode: 'stream' | 'screenshot' | 'video') => void;
  sx?: any;
}

export function HDMIStream({
  host,
  onCollapsedChange,
  onMinimizedChange,
  onCaptureModeChange,
  sx = {},
}: HDMIStreamProps) {
  console.log(`[@component:HDMIStream] Rendering HDMI stream for device: ${host.device_model}`);

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
    totalFrames,
    currentFrame,
    captureStartTime,
    recordingStartTime,

    // Actions from hook
    setCaptureMode,
    setCurrentFrame,
    setIsCaptureActive,
    setTotalFrames,
    setCaptureStartTime,
    setRecordingStartTime,
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

  // Enhanced screenshot handler that updates capture mode
  const handleTakeScreenshot = useCallback(async () => {
    setIsScreenshotLoading(true);
    try {
      await hookTakeScreenshot();
      setCaptureMode('screenshot');
      onCaptureModeChange?.('screenshot');
    } finally {
      setIsScreenshotLoading(false);
    }
  }, [hookTakeScreenshot, setCaptureMode, onCaptureModeChange]);

  // Start video capture
  const handleStartCapture = useCallback(async () => {
    try {
      console.log(`[@component:HDMIStream] Starting video capture`);
      const startTime = new Date();
      setIsCaptureActive(true);
      setRecordingStartTime(startTime);
      setCaptureMode('video');
      onCaptureModeChange?.('video');
      console.log(`[@component:HDMIStream] Recording started at:`, startTime);
    } catch (error) {
      console.error(`[@component:HDMIStream] Error starting capture:`, error);
    }
  }, [setIsCaptureActive, setRecordingStartTime, setCaptureMode, onCaptureModeChange]);

  // Stop video capture
  const handleStopCapture = useCallback(async () => {
    try {
      console.log(`[@component:HDMIStream] Stopping video capture`);
      const endTime = new Date();
      setIsCaptureActive(false);

      // Calculate how many frames we captured (1 per second)
      if (recordingStartTime) {
        const recordingDuration = endTime.getTime() - recordingStartTime.getTime();
        const frameCount = Math.floor(recordingDuration / 1000); // 1 frame per second

        console.log(
          `[@component:HDMIStream] Recording duration: ${recordingDuration}ms, frames: ${frameCount}`,
        );

        setTotalFrames(frameCount);
        setCaptureStartTime(recordingStartTime); // VideoCapture needs this for URL generation
        setCaptureMode('video'); // Keep showing video component with frames
      } else {
        console.warn(`[@component:HDMIStream] No recording start time found`);
        setCaptureMode('stream');
      }
    } catch (error) {
      console.error(`[@component:HDMIStream] Error stopping capture:`, error);
    }
  }, [setIsCaptureActive, setTotalFrames, setCaptureStartTime, setCaptureMode, recordingStartTime]);

  // Return to stream view (remove overlays, keep stream playing)
  const returnToStream = useCallback(() => {
    console.log(`[@component:HDMIStream] Returning to stream view - removing capture overlays`);
    // Reset capture mode to stream (removes screenshot/video capture components)
    // Stream continues playing in background
    setCaptureMode('stream');
    onCaptureModeChange?.('stream');
  }, [setCaptureMode, onCaptureModeChange]);

  // Smart toggle handlers with minimized state logic
  const handleMinimizeToggle = () => {
    if (isMinimized) {
      // Restore from minimized to collapsed state
      setIsMinimized(false);
      setIsExpanded(false);
      onMinimizedChange?.(false);
      console.log(
        `[@component:HDMIStream] Restored from minimized to collapsed for ${host.device_model}`,
      );
    } else {
      // Minimize the panel
      setIsMinimized(true);
      onMinimizedChange?.(true);
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

  // Generate current video frame URL when in video mode
  const currentVideoFramePath = useMemo(() => {
    if (captureMode === 'video' && totalFrames > 0 && captureStartTime) {
      // Generate current frame URL for video capture
      const frameTime = new Date(captureStartTime.getTime() + currentFrame * 1000);
      const zurichTime = new Date(frameTime.toLocaleString('en-US', { timeZone: 'Europe/Zurich' }));
      const year = zurichTime.getFullYear();
      const month = String(zurichTime.getMonth() + 1).padStart(2, '0');
      const day = String(zurichTime.getDate()).padStart(2, '0');
      const hours = String(zurichTime.getHours()).padStart(2, '0');
      const minutes = String(zurichTime.getMinutes()).padStart(2, '0');
      const seconds = String(zurichTime.getSeconds()).padStart(2, '0');
      const frameTimestamp = `${year}${month}${day}${hours}${minutes}${seconds}`;
      return `https://${host.host_name}:444/stream/captures/capture_${frameTimestamp}.jpg`;
    }
    return undefined;
  }, [captureMode, totalFrames, captureStartTime, currentFrame, host.host_name]);

  // Check if verification editor should be visible
  const isVerificationVisible = captureMode === 'screenshot' || captureMode === 'video';

  return (
    <>
      {/* Main HDMIStream Panel */}
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
            borderRadius: isVerificationVisible ? '1px 0 0 1px' : 1, // Connect to side panel when visible
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

                <Tooltip title="Return to Stream">
                  <IconButton
                    size="small"
                    onClick={returnToStream}
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
                title={
                  isMinimized ? 'Restore Panel' : isExpanded ? 'Collapse Panel' : 'Expand Panel'
                }
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
              {/* Stream viewer - always rendered in background */}
              <StreamViewer
                key="stream-viewer"
                streamUrl={streamUrl}
                isStreamActive={isStreamActive}
                isCapturing={isCaptureActive}
                model={host.device_model}
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  zIndex: 1, // Background layer
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
                    zIndex: 1000001, // Above AndroidMobileOverlay (1000000)
                  }}
                />
              )}

              {/* Video capture overlay */}
              {captureMode === 'video' && (
                <VideoCapture
                  currentFrame={currentFrame}
                  totalFrames={totalFrames}
                  onFrameChange={handleFrameChange}
                  onImageLoad={handleImageLoad}
                  selectedArea={selectedArea}
                  onAreaSelected={handleAreaSelected}
                  isCapturing={isCaptureActive}
                  videoFramePath={currentVideoFramePath} // Pass current frame URL
                  model={host.device_model}
                  selectedHostDevice={host}
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: 1000001, // Above AndroidMobileOverlay (1000000)
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

      {/* Verification Editor Side Panel - appears when in capture mode */}
      {isVerificationVisible && (
        <Box
          sx={{
            position: 'fixed',
            zIndex: panelLayout.zIndex,
            // Position right next to the main panel
            bottom: panelLayout.collapsed.position.bottom || '20px',
            left: `calc(${panelLayout.collapsed.position.left || '20px'} + ${getPanelWidth()})`,
            width: '400px', // Fixed width for verification editor
            height: getPanelHeight(),
            backgroundColor: '#1E1E1E',
            border: '2px solid #1E1E1E',
            borderLeft: 'none', // No border between panels to make them appear connected
            borderRadius: '0 1px 1px 0', // Round only right side
            transition: 'height 0.3s ease-in-out',
          }}
        >
          <VerificationEditor
            isVisible={isVerificationVisible}
            isScreenshotMode={captureMode === 'screenshot'}
            isCaptureActive={isCaptureActive}
            captureSourcePath={
              captureMode === 'screenshot' ? screenshotPath : currentVideoFramePath
            }
            selectedArea={selectedArea}
            onAreaSelected={handleAreaSelected}
            onClearSelection={() => handleAreaSelected({ x: 0, y: 0, width: 0, height: 0 })}
            model={host.device_model}
            screenshotPath={screenshotPath}
            selectedHostDevice={host}
            sx={{
              width: '100%',
              height: '100%',
              p: 1,
            }}
          />
        </Box>
      )}
    </>
  );
}

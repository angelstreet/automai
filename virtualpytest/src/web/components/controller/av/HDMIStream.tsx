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
import React, { useEffect, useState, useCallback, useMemo } from 'react';

import { getConfigurableAVPanelLayout, loadAVConfig } from '../../../config/av';
import { useHdmiStream, useStream } from '../../../hooks/controller';
import { Host } from '../../../types/common/Host_Types';
import { VerificationEditor } from '../verification';

import { RecordingOverlay, LoadingOverlay, ModeIndicatorDot } from './ScreenEditorOverlay';
import { ScreenshotCapture } from './ScreenshotCapture';
import { StreamViewer } from './StreamViewer';
import { VideoCapture } from './VideoCapture';

interface HDMIStreamProps {
  host: Host;
  deviceId: string;
  deviceModel?: string;
  isControlActive?: boolean;
  onCollapsedChange?: (isCollapsed: boolean) => void;
  onMinimizedChange?: (isMinimized: boolean) => void;
  onCaptureModeChange?: (mode: 'stream' | 'screenshot' | 'video') => void;
  sx?: any;
}

export const HDMIStream = React.memo(
  function HDMIStream({
    host,
    deviceId,
    deviceModel,
    isControlActive = false,
    onCollapsedChange,
    onMinimizedChange,
    onCaptureModeChange,
    sx = {},
  }: HDMIStreamProps) {
    // Stream state
    const [isExpanded, setIsExpanded] = useState<boolean>(false);
    const [isMinimized, setIsMinimized] = useState<boolean>(false);
    const [isScreenshotLoading, setIsScreenshotLoading] = useState<boolean>(false);

    // AV config state
    const [avConfig, setAvConfig] = useState<any>(null);

    // Use new stream hook - auto-fetches when host/deviceId changes
    const { streamUrl, isLoadingUrl, urlError } = useStream({ host, device_id: deviceId });
    const isStreamActive = !!streamUrl && !isLoadingUrl;

    // Get device model from device or use override
    const effectiveDeviceModel = useMemo(() => {
      if (deviceModel) return deviceModel;
      const device = host.devices?.find((d) => d.device_id === deviceId);
      return device?.device_model || 'unknown';
    }, [deviceModel, host.devices, deviceId]);

    // Load AV config
    useEffect(() => {
      const loadConfig = async () => {
        const config = await loadAVConfig('hdmi_stream', effectiveDeviceModel);
        setAvConfig(config);
      };

      loadConfig();
    }, [effectiveDeviceModel]);

    // Get configurable layout from AV config - memoized to prevent infinite loops
    const panelLayout = useMemo(() => {
      return getConfigurableAVPanelLayout(effectiveDeviceModel, avConfig);
    }, [effectiveDeviceModel, avConfig]);

    // Use the existing hook with our fetched stream data
    const {
      // State from hook
      captureMode,
      isCaptureActive,
      selectedArea,
      screenshotPath,
      totalFrames,
      currentFrame,
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
      deviceModel: effectiveDeviceModel,
      streamUrl: streamUrl || '', // Handle null by providing empty string fallback
      isStreamActive,
    });

    // Show URL error if stream fetch failed
    useEffect(() => {
      if (urlError) {
        console.error(`[@component:HDMIStream] Stream URL error: ${urlError}`);
      }
    }, [urlError]);

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
    }, [
      setIsCaptureActive,
      setTotalFrames,
      setCaptureStartTime,
      setCaptureMode,
      recordingStartTime,
    ]);

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
          `[@component:HDMIStream] Restored from minimized to collapsed for ${effectiveDeviceModel}`,
        );
      } else {
        // Minimize the panel
        setIsMinimized(true);
        onMinimizedChange?.(true);
        console.log(`[@component:HDMIStream] Minimized panel for ${effectiveDeviceModel}`);
      }
    };

    const handleExpandCollapseToggle = () => {
      if (isMinimized) {
        // First restore from minimized to collapsed, then user can click again to expand
        setIsMinimized(false);
        setIsExpanded(false);
        console.log(
          `[@component:HDMIStream] Restored from minimized to collapsed for ${effectiveDeviceModel}`,
        );
      } else {
        // Normal expand/collapse logic
        const newExpanded = !isExpanded;
        setIsExpanded(newExpanded);
        onCollapsedChange?.(!newExpanded);
        console.log(
          `[@component:HDMIStream] Toggling panel state to ${newExpanded ? 'expanded' : 'collapsed'} for ${effectiveDeviceModel}`,
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

    // Video frame URLs should come from backend API calls
    // For now, use empty string - this needs to be implemented via API
    const currentVideoFramePath = '';

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
                          captureMode === 'screenshot' || isScreenshotLoading
                            ? '#ff4444'
                            : '#ffffff',
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
                  streamUrl={streamUrl || undefined}
                  isStreamActive={isStreamActive}
                  isCapturing={isCaptureActive}
                  model={effectiveDeviceModel}
                  isExpanded={isExpanded}
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
                    model={effectiveDeviceModel}
                    selectedHost={host}
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
                    model={effectiveDeviceModel}
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
              isCaptureActive={isCaptureActive}
              captureSourcePath={
                captureMode === 'screenshot' ? screenshotPath : currentVideoFramePath
              }
              selectedArea={selectedArea}
              onAreaSelected={handleAreaSelected}
              onClearSelection={() => handleAreaSelected({ x: 0, y: 0, width: 0, height: 0 })}
              selectedHost={host}
              selectedDeviceId={deviceId}
              isControlActive={isControlActive}
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
  },
  (prevProps, nextProps) => {
    // Custom comparison function to prevent unnecessary re-renders
    const hostChanged = JSON.stringify(prevProps.host) !== JSON.stringify(nextProps.host);
    const sxChanged = JSON.stringify(prevProps.sx) !== JSON.stringify(nextProps.sx);
    const onCollapsedChangeChanged = prevProps.onCollapsedChange !== nextProps.onCollapsedChange;
    const onMinimizedChangeChanged = prevProps.onMinimizedChange !== nextProps.onMinimizedChange;
    const onCaptureModeChangeChanged =
      prevProps.onCaptureModeChange !== nextProps.onCaptureModeChange;

    // Only re-render if meaningful props have changed
    const shouldRerender =
      hostChanged ||
      sxChanged ||
      onCollapsedChangeChanged ||
      onMinimizedChangeChanged ||
      onCaptureModeChangeChanged;

    if (shouldRerender) {
      console.log('[@component:HDMIStream] Props changed, re-rendering:', {
        hostChanged,
        sxChanged,
        onCollapsedChangeChanged,
        onMinimizedChangeChanged,
        onCaptureModeChangeChanged,
      });
    }

    return !shouldRerender; // Return true to skip re-render, false to re-render
  },
);

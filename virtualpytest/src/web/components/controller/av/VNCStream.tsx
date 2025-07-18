import {
  PhotoCamera,
  VideoCall,
  StopCircle,
  Refresh,
  OpenInFull,
  CloseFullscreen,
  KeyboardArrowDown,
  KeyboardArrowUp,
  Monitor,
} from '@mui/icons-material';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import React, { useEffect, useState, useCallback, useMemo } from 'react';

import { getConfigurableAVPanelLayout, loadAVConfig } from '../../../config/av';
import { useVncStream, useStream } from '../../../hooks/controller';
import { Host } from '../../../types/common/Host_Types';
import { getZIndex } from '../../../utils/zIndexUtils';
import { VerificationEditor } from '../verification';

import { RecordingOverlay, LoadingOverlay, ModeIndicatorDot } from './ScreenEditorOverlay';
import { ScreenshotCapture } from './ScreenshotCapture';
import { VideoCapture } from './VideoCapture';

interface VNCStreamProps {
  host: Host;
  deviceId: string;
  deviceModel?: string;
  isControlActive?: boolean;
  onCollapsedChange?: (isCollapsed: boolean) => void;
  onMinimizedChange?: (isMinimized: boolean) => void;
  onCaptureModeChange?: (mode: 'stream' | 'screenshot' | 'video') => void;
  sx?: any;
}

// VNC Viewer Component for iframe display
const VNCViewer = ({
  host,
  isExpanded,
  sx = {},
}: {
  host: Host;
  isExpanded: boolean;
  sx?: any;
}) => {
  const [isVncLoading, setIsVncLoading] = useState(true);

  // Get VNC connection details from host
  const vncPort = host?.vnc_port;
  const vncPassword = host?.vnc_password;

  // Build VNC URL similar to RecVncPreview
  const vncUrl = vncPort
    ? `https://${host.ip}:${vncPort}/vnc/vnc_lite.html?host=${host.ip}&port=${vncPort}&path=websockify&encrypt=0${vncPassword ? `&password=${vncPassword}` : ''}${isExpanded ? '' : '&view_only=1'}`
    : null;

  const handleVncLoad = () => {
    setIsVncLoading(false);
  };

  if (!vncUrl) {
    return (
      <Box
        sx={{
          ...sx,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
        }}
      >
        <Typography>VNC not configured</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ ...sx, position: 'relative', width: '100%', height: '100%' }}>
      {/* Loading state */}
      {isVncLoading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(0,0,0,0.8)',
            zIndex: 10,
          }}
        >
          <Box sx={{ textAlign: 'center', color: 'white' }}>
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <Typography variant="caption" sx={{ mt: 1 }}>
              Connecting to VNC...
            </Typography>
          </Box>
        </Box>
      )}

      {/* VNC iframe */}
      <iframe
        src={vncUrl}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          backgroundColor: 'black',
        }}
        sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock"
        onLoad={handleVncLoad}
        title={`VNC Stream - ${host.host_name}`}
        allow="fullscreen"
      />
    </Box>
  );
};

export const VNCStream = React.memo(
  function VNCStream({
    host,
    deviceId,
    deviceModel,
    isControlActive = false,
    onCollapsedChange,
    onMinimizedChange,
    onCaptureModeChange,
    sx = {},
  }: VNCStreamProps) {
    // Stream state
    const [isExpanded, setIsExpanded] = useState<boolean>(false);
    const [isMinimized, setIsMinimized] = useState<boolean>(false);
    const [isScreenshotLoading, setIsScreenshotLoading] = useState<boolean>(false);

    // AV config state
    const [avConfig, setAvConfig] = useState<any>(null);

    // Use stream hook for VNC stream URL (though VNC mainly uses iframe)
    const { streamUrl, isLoadingUrl, urlError } = useStream({ host, device_id: deviceId });
    const isStreamActive = !!host.vnc_port; // VNC is active if VNC port is configured

    // Get device model (always host_vnc for VNC)
    const effectiveDeviceModel = useMemo(() => {
      return deviceModel || 'host_vnc';
    }, [deviceModel]);

    // Load AV config for VNC
    useEffect(() => {
      const loadConfig = async () => {
        const config = await loadAVConfig('vnc_stream', effectiveDeviceModel);
        setAvConfig(config);
      };

      loadConfig();
    }, [effectiveDeviceModel]);

    // Get configurable layout from AV config
    const panelLayout = useMemo(() => {
      return getConfigurableAVPanelLayout(effectiveDeviceModel, avConfig);
    }, [effectiveDeviceModel, avConfig]);

    // Use the VNC hook
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
    } = useVncStream({
      host,
      deviceModel: effectiveDeviceModel,
      streamUrl: streamUrl || '',
      isStreamActive,
    });

    // Enhanced screenshot handler
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
        console.log(`[@component:VNCStream] Starting video capture`);
        const startTime = new Date();
        setIsCaptureActive(true);
        setRecordingStartTime(startTime);
        setCaptureMode('video');
        onCaptureModeChange?.('video');
        console.log(`[@component:VNCStream] Recording started at:`, startTime);
      } catch (error) {
        console.error(`[@component:VNCStream] Error starting capture:`, error);
      }
    }, [setIsCaptureActive, setRecordingStartTime, setCaptureMode, onCaptureModeChange]);

    // Stop video capture
    const handleStopCapture = useCallback(async () => {
      try {
        console.log(`[@component:VNCStream] Stopping video capture`);
        const endTime = new Date();
        setIsCaptureActive(false);

        if (recordingStartTime) {
          const recordingDuration = endTime.getTime() - recordingStartTime.getTime();
          const frameCount = Math.floor(recordingDuration / 1000);

          console.log(
            `[@component:VNCStream] Recording duration: ${recordingDuration}ms, frames: ${frameCount}`,
          );

          setTotalFrames(frameCount);
          setCaptureStartTime(recordingStartTime);
          setCaptureMode('video');
        } else {
          console.warn(`[@component:VNCStream] No recording start time found`);
          setCaptureMode('stream');
        }
      } catch (error) {
        console.error(`[@component:VNCStream] Error stopping capture:`, error);
      }
    }, [
      setIsCaptureActive,
      setTotalFrames,
      setCaptureStartTime,
      setCaptureMode,
      recordingStartTime,
    ]);

    // Return to stream view
    const returnToStream = useCallback(() => {
      console.log(`[@component:VNCStream] Returning to stream view`);
      setCaptureMode('stream');
      onCaptureModeChange?.('stream');
    }, [setCaptureMode, onCaptureModeChange]);

    // Toggle handlers
    const handleMinimizeToggle = () => {
      if (isMinimized) {
        setIsMinimized(false);
        setIsExpanded(false);
        onMinimizedChange?.(false);
        console.log(
          `[@component:VNCStream] Restored from minimized to collapsed for ${effectiveDeviceModel}`,
        );
      } else {
        setIsMinimized(true);
        onMinimizedChange?.(true);
        console.log(`[@component:VNCStream] Minimized panel for ${effectiveDeviceModel}`);
      }
    };

    const handleExpandCollapseToggle = () => {
      if (isMinimized) {
        setIsMinimized(false);
        setIsExpanded(false);
        console.log(
          `[@component:VNCStream] Restored from minimized to collapsed for ${effectiveDeviceModel}`,
        );
      } else {
        const newExpanded = !isExpanded;
        setIsExpanded(newExpanded);
        onCollapsedChange?.(!newExpanded);
        console.log(
          `[@component:VNCStream] Toggling panel to ${newExpanded ? 'expanded' : 'collapsed'} for ${effectiveDeviceModel}`,
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

    // Panel dimensions
    const collapsedWidth = panelLayout.collapsed.width;
    const collapsedHeight = panelLayout.collapsed.height;
    const expandedWidth = panelLayout.expanded.width;
    const expandedHeight = panelLayout.expanded.height;

    // Position styles
    const positionStyles: any = {
      position: 'fixed',
      zIndex: getZIndex('VNC_STREAM'),
      bottom: panelLayout.collapsed.position.bottom || '20px',
      left: panelLayout.collapsed.position.left || '370px', // Offset from HDMI
      ...sx,
    };

    const headerHeight = panelLayout.header?.height || '40px';

    // Calculate panel dimensions
    const getPanelWidth = () => {
      if (isMinimized) return collapsedWidth;
      return isExpanded ? expandedWidth : collapsedWidth;
    };

    const getPanelHeight = () => {
      if (isMinimized) return headerHeight;
      return isExpanded ? expandedHeight : collapsedHeight;
    };

    const currentVideoFramePath = '';
    const isVerificationVisible = captureMode === 'screenshot' || captureMode === 'video';

    return (
      <>
        {/* Main VNC Stream Panel */}
        <Box sx={positionStyles}>
          <Box
            sx={{
              width: getPanelWidth(),
              height: getPanelHeight(),
              position: 'absolute',
              bottom: 0,
              left: 0,
              backgroundColor: '#2A2A2A', // Slightly different from HDMI
              border: '2px solid #2A2A2A',
              borderRadius: isVerificationVisible ? '1px 0 0 1px' : 1,
              overflow: 'hidden',
              transition: 'width 0.3s ease-in-out, height 0.3s ease-in-out',
            }}
          >
            {/* Header */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 1,
                height: headerHeight,
                borderBottom: isMinimized ? 'none' : '1px solid #444',
                bgcolor: '#2A2A2A',
                color: '#ffffff',
              }}
            >
              {/* Left side: Action buttons */}
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

              {/* Center: Title with VNC icon */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  flex: 1,
                  justifyContent: 'center',
                }}
              >
                <Monitor sx={{ fontSize: 16 }} />
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontSize: '0.875rem',
                    fontWeight: 'bold',
                  }}
                >
                  VNC Stream
                </Typography>
              </Box>

              {/* Right side: Minimize and Expand/Collapse buttons */}
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Tooltip title={isMinimized ? 'Restore Panel' : 'Minimize Panel'}>
                  <IconButton size="small" onClick={handleMinimizeToggle} sx={{ color: 'inherit' }}>
                    {isMinimized ? (
                      <KeyboardArrowUp fontSize="small" />
                    ) : (
                      <KeyboardArrowDown fontSize="small" />
                    )}
                  </IconButton>
                </Tooltip>

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

            {/* VNC Content */}
            {!isMinimized && (
              <Box
                sx={{
                  height: `calc(100% - ${headerHeight})`,
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                {/* VNC viewer - always rendered in background */}
                <VNCViewer
                  host={host}
                  isExpanded={isExpanded}
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: 1,
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
                      zIndex: 1000001,
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
                    videoFramePath={currentVideoFramePath}
                    model={effectiveDeviceModel}
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      zIndex: 1000001,
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

        {/* Verification Editor Side Panel */}
        {isVerificationVisible && (
          <Box
            sx={{
              position: 'fixed',
              zIndex: getZIndex('VERIFICATION_EDITOR'),
              bottom: panelLayout.collapsed.position.bottom || '20px',
              left: `calc(${panelLayout.collapsed.position.left || '370px'} + ${getPanelWidth()})`,
              width: '400px',
              height: getPanelHeight(),
              backgroundColor: '#2A2A2A',
              border: '2px solid #2A2A2A',
              borderLeft: 'none',
              borderRadius: '0 1px 1px 0',
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
    // Custom comparison to prevent unnecessary re-renders
    const hostChanged = JSON.stringify(prevProps.host) !== JSON.stringify(nextProps.host);
    const sxChanged = JSON.stringify(prevProps.sx) !== JSON.stringify(nextProps.sx);
    const onCollapsedChangeChanged = prevProps.onCollapsedChange !== nextProps.onCollapsedChange;
    const onMinimizedChangeChanged = prevProps.onMinimizedChange !== nextProps.onMinimizedChange;
    const onCaptureModeChangeChanged =
      prevProps.onCaptureModeChange !== nextProps.onCaptureModeChange;

    const shouldRerender =
      hostChanged ||
      sxChanged ||
      onCollapsedChangeChanged ||
      onMinimizedChangeChanged ||
      onCaptureModeChangeChanged;

    if (shouldRerender) {
      console.log('[@component:VNCStream] Props changed, re-rendering:', {
        hostChanged,
        sxChanged,
        onCollapsedChangeChanged,
        onMinimizedChangeChanged,
        onCaptureModeChangeChanged,
      });
    }

    return !shouldRerender;
  },
);

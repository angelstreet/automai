import {
  PhotoCamera,
  VideoCall,
  StopCircle,
  Fullscreen,
  FullscreenExit,
  Refresh,
} from '@mui/icons-material';
import { Box, IconButton, Tooltip } from '@mui/material';
import React from 'react';

import { useScreenEditor } from '../../../hooks/pages/useScreenEditor';
import { ScreenDefinitionEditorProps } from '../../../types/pages/UserInterface_Types';
import {
  getCompactViewDimensions,
  createBaseContainerStyles,
} from '../../../utils/userinterface/screenEditorUtils';

import {
  RecordingOverlay,
  LoadingOverlay,
  ModeIndicatorDot,
  StatusIndicator,
} from './ScreenEditorOverlay';
import { ScreenshotCapture } from './ScreenshotCapture';
import { StreamViewer } from './StreamViewer';
import { VideoCapture } from './VideoCapture';

export const ScreenDefinitionEditor: React.FC<ScreenDefinitionEditorProps> = ({
  selectedHost,
  onDisconnectComplete,
}) => {
  const {
    state,
    actions,
    deviceModel,
    avConfig,
    compactLayoutConfig,
    verificationEditorLayout,

    streamViewerSx,
  } = useScreenEditor(selectedHost, onDisconnectComplete);

  const {
    isConnected,
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

    resolutionInfo,
  } = state;

  const {
    handleStartCapture,
    handleStopCapture,
    handleTakeScreenshot,
    restartStream,
    handleToggleExpanded,
    handleFrameChange,
    handleBackToStream,
    handleImageLoad,
    handleAreaSelected,

    handleTap,
  } = actions;

  const compactDimensions = getCompactViewDimensions(deviceModel);
  const baseContainerStyles = createBaseContainerStyles();

  return (
    <Box sx={baseContainerStyles}>
      {isExpanded ? (
        // Expanded view with VerificationEditor side panel
        <Box
          sx={{
            display: 'flex',
            gap: 0,
            boxShadow: 2,
            borderRadius: 1,
            overflow: 'hidden',
          }}
        >
          {/* Main Screen Definition Editor Panel */}
          <Box
            sx={{
              width: verificationEditorLayout.width,
              height: verificationEditorLayout.height,
              bgcolor: '#1E1E1E',
              border: '2px solid #1E1E1E',
              borderRadius: '1px 0 0 1px',
            }}
          >
            {/* Header with controls - fixed width sections to prevent flickering */}
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
                          viewMode === 'screenshot' || isScreenshotLoading ? '#ff4444' : '#ffffff',
                        borderBottom:
                          viewMode === 'screenshot' || isScreenshotLoading
                            ? '2px solid #ff4444'
                            : 'none',
                      }}
                      disabled={!isConnected || isCapturing || isScreenshotLoading}
                    >
                      <PhotoCamera />
                    </IconButton>
                  </span>
                </Tooltip>

                {isCapturing ? (
                  <Tooltip title="Stop Capture">
                    <span>
                      <IconButton
                        size="small"
                        onClick={handleStopCapture}
                        sx={{
                          color: viewMode === 'capture' || isCapturing ? '#ff4444' : '#ffffff',
                          borderBottom:
                            viewMode === 'capture' || isCapturing ? '2px solid #ff4444' : 'none',
                        }}
                        disabled={isStoppingCapture}
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
                          color: viewMode === 'capture' || isCapturing ? '#ff4444' : '#ffffff',
                          borderBottom:
                            viewMode === 'capture' || isCapturing ? '2px solid #ff4444' : 'none',
                        }}
                        disabled={!isConnected}
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
                      disabled={!isConnected || isCapturing}
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

            {/* Main viewing area using new component architecture */}
            <Box
              sx={{
                flex: 1,
                position: 'relative',
                overflow: 'hidden',
                height: 'calc(100% - 48px)',
              }}
            >
              {/* Stream viewer - always rendered at top level to prevent unmount/remount */}
              <StreamViewer
                key="main-stream-viewer"
                streamUrl={streamUrl}
                isStreamActive={streamStatus === 'running' && !isScreenshotLoading}
                isCapturing={isCapturing}
                model={deviceModel}
                layoutConfig={!isExpanded ? compactLayoutConfig : undefined}
                onTap={handleTap}
                selectedHost={selectedHost}
                sx={streamViewerSx}
              />

              {/* Other components rendered on top when needed */}
              {viewMode === 'screenshot' && (
                <ScreenshotCapture
                  screenshotPath={lastScreenshotPath}
                  resolutionInfo={resolutionInfo}
                  isCapturing={false}
                  isSaving={isSaving || isScreenshotLoading}
                  onImageLoad={handleImageLoad}
                  selectedArea={selectedArea}
                  onAreaSelected={handleAreaSelected}
                  model={deviceModel}
                  selectedHost={selectedHost}
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

              {viewMode === 'capture' && (
                <VideoCapture
                  deviceModel={deviceModel}
                  videoDevice={avConfig?.video_device}
                  hostIp={avConfig?.host_ip}
                  hostPort={avConfig?.host_port}
                  videoFramesPath={videoFramesPath}
                  currentFrame={currentFrame}
                  totalFrames={totalFrames}
                  onFrameChange={handleFrameChange}
                  onBackToStream={handleBackToStream}
                  isSaving={isSaving}
                  savedFrameCount={savedFrameCount}
                  onImageLoad={handleImageLoad}
                  selectedArea={selectedArea}
                  onAreaSelected={handleAreaSelected}
                  captureStartTime={captureStartTime}
                  captureEndTime={captureEndTime}
                  isCapturing={isCapturing}
                  selectedHost={selectedHost}
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
              <RecordingOverlay isCapturing={isCapturing} />
            </Box>
          </Box>
        </Box>
      ) : (
        // Compact view - exact same layout as before
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
          {/* Stream viewer - always rendered to prevent unmount/remount */}
          <StreamViewer
            key="compact-stream-viewer"
            streamUrl={streamUrl}
            isStreamActive={streamStatus === 'running' && !isScreenshotLoading}
            isCapturing={isCapturing}
            model={deviceModel}
            layoutConfig={compactLayoutConfig}
            deviceId={avConfig?.host_ip ? `${avConfig.host_ip}:5555` : undefined}
            onTap={handleTap}
            selectedHost={selectedHost}
            sx={streamViewerSx}
          />

          {/* Other components rendered on top when needed */}
          {viewMode === 'screenshot' && (
            <ScreenshotCapture
              screenshotPath={lastScreenshotPath}
              resolutionInfo={resolutionInfo}
              isCapturing={false}
              isSaving={isSaving || isScreenshotLoading}
              onImageLoad={handleImageLoad}
              selectedArea={selectedArea}
              onAreaSelected={handleAreaSelected}
              model={deviceModel}
              selectedHost={selectedHost}
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

          {viewMode === 'capture' && (
            <VideoCapture
              deviceModel={deviceModel}
              videoDevice={avConfig?.video_device}
              hostIp={avConfig?.host_ip}
              hostPort={avConfig?.host_port}
              videoFramesPath={videoFramesPath}
              currentFrame={currentFrame}
              totalFrames={totalFrames}
              onFrameChange={handleFrameChange}
              onBackToStream={handleBackToStream}
              isSaving={isSaving}
              savedFrameCount={savedFrameCount}
              onImageLoad={handleImageLoad}
              selectedArea={selectedArea}
              onAreaSelected={handleAreaSelected}
              captureStartTime={captureStartTime}
              captureEndTime={captureEndTime}
              isCapturing={isCapturing}
              selectedHost={selectedHost}
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
          <ModeIndicatorDot viewMode={viewMode} />

          {/* Only the expand button - recording/saving indicators are now overlays within the stream */}
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
};

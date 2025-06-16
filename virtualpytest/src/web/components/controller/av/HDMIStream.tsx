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
  const [isExpanded, setIsExpanded] = useState(false);
  const [avConfig, setAVConfig] = useState<any>(null);

  const {
    streamUrl,
    isStreamActive,
    captureMode,
    screenshotPath,
    isScreenshotLoading,
    isCaptureActive,
    selectedArea,
    handleImageLoad,
    handleAreaSelected,
    deviceResolution,
  } = useHdmiStream({ host });

  useEffect(() => {
    const loadConfig = async () => {
      const config = await loadAVConfig(host.device_model);
      setAVConfig(config);
    };

    loadConfig();
  }, [host.device_model]);

  const panelLayout = getConfigurableAVPanelLayout(host.device_model, avConfig);

  const collapsedWidth = panelLayout.collapsed.width;
  const collapsedHeight = panelLayout.collapsed.height;
  const expandedWidth = panelLayout.expanded.width;
  const expandedHeight = panelLayout.expanded.height;

  const toggleExpanded = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    if (onExpandedChange) {
      onExpandedChange(newExpanded);
    }
    console.log(
      `[@component:HDMIStream] Toggling panel state to ${newExpanded ? 'expanded' : 'collapsed'} for ${host.device_model}`,
    );
  };

  const positionStyles: any = {
    position: 'fixed',
    zIndex: panelLayout.zIndex,
    bottom: panelLayout.collapsed.position.bottom || '20px',
    right: panelLayout.collapsed.position.right || '20px',
  };

  return (
    <Box sx={positionStyles}>
      <Box
        sx={{
          width: isExpanded ? expandedWidth : collapsedWidth,
          height: isExpanded ? expandedHeight : collapsedHeight,
          position: 'absolute',
          bottom: 0,
          right: 0,
          backgroundColor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          boxShadow: 3,
          overflow: 'hidden',
          transition: 'width 0.3s ease-in-out, height 0.3s ease-in-out',
        }}
      >
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
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <IconButton size="small" sx={{ color: 'inherit' }}>
              <PhotoCamera fontSize="small" />
            </IconButton>
            <IconButton size="small" sx={{ color: 'inherit' }}>
              <VideoCall fontSize="small" />
            </IconButton>
            <IconButton size="small" sx={{ color: 'inherit' }}>
              <StopCircle fontSize="small" />
            </IconButton>
            <IconButton size="small" sx={{ color: 'inherit' }}>
              <Refresh fontSize="small" />
            </IconButton>
          </Box>
          <Tooltip title={isExpanded ? 'Collapse Panel' : 'Expand Panel'}>
            <IconButton
              size={avConfig?.panel_layout?.header?.iconSize || 'small'}
              onClick={toggleExpanded}
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

        <Box
          sx={{
            height: `calc(100% - ${avConfig?.panel_layout?.header?.height || '48px'})`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
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

          {captureMode === 'video' && (
            <VideoCapture
              deviceModel={host.device_model}
              videoDevice={avConfig?.video_device}
              hostIp={avConfig?.host_ip}
              hostPort={avConfig?.host_port}
              videoFramesPath="/tmp/captures"
              currentFrame={0}
              totalFrames={0}
              onFrameChange={() => {}}
              onBackToStream={() => {}}
              isSaving={false}
              savedFrameCount={0}
              onImageLoad={handleImageLoad}
              selectedArea={selectedArea}
              onAreaSelected={handleAreaSelected}
              captureStartTime={null}
              captureEndTime={null}
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

          <LoadingOverlay isScreenshotLoading={isScreenshotLoading} />
          <RecordingOverlay isCapturing={isCaptureActive} />
          <ModeIndicatorDot viewMode={captureMode} />
        </Box>
      </Box>
    </Box>
  );
}

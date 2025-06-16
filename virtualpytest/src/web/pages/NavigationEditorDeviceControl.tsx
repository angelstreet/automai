import { Close as CloseIcon } from '@mui/icons-material';
import { Box, Typography, IconButton } from '@mui/material';
import React, { useMemo, useState, useCallback, useRef } from 'react';

import { ScreenDefinitionEditor } from '../components/controller/av/ScreenDefinitionEditor';
import { AndroidMobileRemote } from '../components/controller/remote/AndroidMobileRemote';
import { RemotePanel } from '../components/controller/remote/RemotePanel';
import { VerificationResultsDisplay } from '../components/verification/VerificationResultsDisplay';
import { NavigationEditorDeviceControlProps } from '../types/pages/Navigation_Types';

const getDeviceRemoteConfig = (selectedHost: any) => {
  return selectedHost?.controller_configs?.remote || null;
};

export const NavigationEditorDeviceControl: React.FC<NavigationEditorDeviceControlProps> = ({
  selectedHost,
  isControlActive,
  isRemotePanelOpen,
  verificationResults,
  verificationPassCondition,
  lastVerifiedNodeId,
  nodes,
  selectedNode,
  selectedEdge,
  onReleaseControl,
  onSetVerificationResults,
  onSetLastVerifiedNodeId,
  onSetVerificationPassCondition,
}) => {
  // Stream integration state for AndroidMobileRemote
  const [streamInfo, setStreamInfo] = useState<{
    position: { x: number; y: number };
    size: { width: number; height: number };
    resolution: { width: number; height: number };
    videoElement: HTMLVideoElement | null;
  } | null>(null);

  // Ref to track the ScreenDefinitionEditor container for position calculation
  const screenEditorRef = useRef<HTMLDivElement>(null);

  // Memoize computed values based on selectedHost from registration context
  const remoteConfig = useMemo(() => {
    return selectedHost ? getDeviceRemoteConfig(selectedHost) : null;
  }, [selectedHost]);

  const hasAVCapabilities = useMemo(() => {
    return selectedHost?.controller_configs?.av?.parameters != null;
  }, [selectedHost]);

  // Effect to find and track the video element from ScreenDefinitionEditor
  React.useEffect(() => {
    if (!screenEditorRef.current || !isControlActive || !hasAVCapabilities) {
      setStreamInfo(null);
      return;
    }

    const updateStreamInfo = () => {
      const videoElement = screenEditorRef.current?.querySelector('video') as HTMLVideoElement;

      if (!videoElement) {
        setStreamInfo(null);
        return;
      }

      const videoRect = videoElement.getBoundingClientRect();

      // Only update if video has actual dimensions
      if (videoRect.width > 0 && videoRect.height > 0) {
        setStreamInfo({
          position: { x: videoRect.left, y: videoRect.top },
          size: { width: videoRect.width, height: videoRect.height },
          resolution: { width: 1920, height: 1080 }, // Default device resolution
          videoElement,
        });

        console.log('[@component:NavigationEditorDeviceControl] Stream info updated:', {
          position: { x: videoRect.left, y: videoRect.top },
          size: { width: videoRect.width, height: videoRect.height },
        });
      }
    };

    // Initial update
    updateStreamInfo();

    // Update on resize/scroll
    const handleUpdate = () => updateStreamInfo();
    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate);

    // Use MutationObserver to detect when video element is added/changed
    const observer = new MutationObserver(() => {
      updateStreamInfo();
    });

    observer.observe(screenEditorRef.current, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'style'],
    });

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate);
      observer.disconnect();
    };
  }, [isControlActive, hasAVCapabilities, selectedHost]);

  return (
    <>
      {/* Screen Definition Editor - Show when device has AV capabilities and control is active */}
      {selectedHost && hasAVCapabilities && isControlActive && (
        <div ref={screenEditorRef}>
          <ScreenDefinitionEditor
            selectedHostDevice={selectedHost}
            autoConnect={true}
            onDisconnectComplete={onReleaseControl}
          />
        </div>
      )}

      {/* Verification Results Display - Show when there are verification results */}
      {(() => {
        const shouldShow = verificationResults.length > 0 && lastVerifiedNodeId;

        if (shouldShow) {
        }
        return shouldShow;
      })() && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            right: selectedNode || selectedEdge ? '220px' : '16px', // Account for selection panel
            maxWidth: '800px',
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            p: 2,
            zIndex: 900,
            maxHeight: '300px',
            overflow: 'auto',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          }}
        >
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
          >
            <Typography variant="h6" sx={{ fontSize: '1rem', mb: 1 }}>
              Verification Results - Node:{' '}
              {nodes.find((n) => n.id === lastVerifiedNodeId)?.data.label || lastVerifiedNodeId}
            </Typography>
            <IconButton
              size="small"
              onClick={() => {
                onSetVerificationResults([]);
                onSetLastVerifiedNodeId(null);
              }}
              sx={{ p: 0.25 }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <VerificationResultsDisplay
            testResults={verificationResults}
            verifications={nodes.find((n) => n.id === lastVerifiedNodeId)?.data.verifications || []}
            passCondition={verificationPassCondition}
            onPassConditionChange={onSetVerificationPassCondition}
            showPassConditionSelector={true}
            compact={false}
          />
        </Box>
      )}

      {/* Remote Control Panel - Only show if device has remote capabilities */}
      {isRemotePanelOpen && remoteConfig && (
        <>
          {/* Android Mobile uses compact component instead of modal */}
          {remoteConfig.type === 'android_mobile' ? (
            <Box
              sx={{
                position: 'fixed',
                right: 0,
                top: '130px',
                width: '320px',
                height: 'calc(100vh - 130px)',
                bgcolor: 'background.paper',
                borderLeft: '1px solid',
                borderColor: 'divider',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.1)',
              }}
            >
              <Box
                sx={{
                  p: 1,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Typography variant="h6" component="div">
                  Android Mobile Remote
                </Typography>
              </Box>

              <AndroidMobileRemote
                host={selectedHost}
                onDisconnectComplete={onReleaseControl}
                streamPosition={streamInfo?.position}
                streamSize={streamInfo?.size}
                streamResolution={streamInfo?.resolution}
                videoElement={streamInfo?.videoElement || undefined}
              />
            </Box>
          ) : (
            <Box
              sx={{
                position: 'fixed',
                right: 0,
                top: '130px',
                width: '320px',
                height: 'calc(100vh - 130px)',
                bgcolor: 'background.paper',
                borderLeft: '1px solid',
                borderColor: 'divider',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.1)',
              }}
            >
              <Box
                sx={{
                  p: 0,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Typography variant="h6" component="div">
                  {remoteConfig.type === 'android_tv'
                    ? 'Android TV Remote'
                    : remoteConfig.type === 'ir_remote'
                      ? 'IR Remote'
                      : remoteConfig.type === 'bluetooth_remote'
                        ? 'Bluetooth Remote'
                        : 'Remote Control'}
                </Typography>
              </Box>

              {/* Remote Panel Content - Dynamic based on device type */}
              {remoteConfig.type === 'android_tv' ? (
                <RemotePanel host={selectedHost} onReleaseControl={onReleaseControl} />
              ) : remoteConfig.type === 'ir_remote' ? (
                <RemotePanel host={selectedHost} onReleaseControl={onReleaseControl} />
              ) : remoteConfig.type === 'bluetooth_remote' ? (
                <RemotePanel host={selectedHost} onReleaseControl={onReleaseControl} />
              ) : (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="textSecondary">
                    Unsupported remote type: {remoteConfig.type}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </>
      )}
    </>
  );
};

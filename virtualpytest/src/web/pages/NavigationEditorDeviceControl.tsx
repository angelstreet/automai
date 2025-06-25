import { Close as CloseIcon } from '@mui/icons-material';
import { Box, Typography, IconButton } from '@mui/material';
import React, { useMemo, useState, useRef } from 'react';

import { ScreenDefinitionEditor } from '../components/controller/av/ScreenDefinitionEditor';
import { AndroidMobileRemote } from '../components/controller/remote/AndroidMobileRemote';
import { RemotePanel } from '../components/controller/remote/RemotePanel';
import { VerificationResultsDisplay } from '../components/verification/VerificationResultsDisplay';
import { NavigationEditorDeviceControlProps } from '../types/pages/Navigation_Types';

const getDeviceRemoteConfig = (selectedHost: any, selectedDeviceId: string) => {
  // Find device-specific remote controller config
  if (!selectedHost?.devices || !selectedDeviceId) return null;

  const device = selectedHost.devices.find((d: any) => d.device_id === selectedDeviceId);
  if (!device || !device.device_capabilities) return null;

  // Check if device has remote capability
  if (device.device_capabilities.remote) {
    return {
      type: device.device_capabilities.remote,
      device_id: selectedDeviceId,
      device_name: device.device_name,
      device_model: device.device_model,
    };
  }

  return null;
};

const getDeviceAVConfig = (selectedHost: any, selectedDeviceId: string) => {
  // Find device-specific AV controller config
  if (!selectedHost?.devices || !selectedDeviceId) return null;

  const device = selectedHost.devices.find((d: any) => d.device_id === selectedDeviceId);
  if (!device || !device.device_capabilities) return null;

  // Check if device has AV capability
  if (device.device_capabilities.av) {
    return {
      type: device.device_capabilities.av,
      device_id: selectedDeviceId,
      device_name: device.device_name,
      device_model: device.device_model,
    };
  }

  return null;
};

export const NavigationEditorDeviceControl: React.FC<NavigationEditorDeviceControlProps> = ({
  selectedHost,
  selectedDeviceId,
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

  // Memoize computed values based on selectedHost and selectedDeviceId
  const remoteConfig = useMemo(() => {
    return selectedHost && selectedDeviceId
      ? getDeviceRemoteConfig(selectedHost, selectedDeviceId)
      : null;
  }, [selectedHost, selectedDeviceId]);

  const avConfig = useMemo(() => {
    return selectedHost && selectedDeviceId
      ? getDeviceAVConfig(selectedHost, selectedDeviceId)
      : null;
  }, [selectedHost, selectedDeviceId]);

  const hasAVCapabilities = useMemo(() => {
    return avConfig !== null;
  }, [avConfig]);

  const hasRemoteCapabilities = useMemo(() => {
    return remoteConfig !== null;
  }, [remoteConfig]);

  // Log device capabilities for debugging
  React.useEffect(() => {
    if (selectedHost && selectedDeviceId) {
      const device = selectedHost.devices?.find((d: any) => d.device_id === selectedDeviceId);
      if (device) {
        console.log(
          `[@component:NavigationEditorDeviceControl] Device capabilities for ${device.device_name}:`,
          {
            device_id: selectedDeviceId,
            av: device.device_capabilities?.av || 'none',
            remote: device.device_capabilities?.remote || 'none',
            hasAV: hasAVCapabilities,
            hasRemote: hasRemoteCapabilities,
          },
        );
      }
    }
  }, [selectedHost, selectedDeviceId, hasAVCapabilities, hasRemoteCapabilities]);

  // NEW: Debug logging for control and panel state
  React.useEffect(() => {
    console.log(`[@component:NavigationEditorDeviceControl] State debug:`, {
      selectedHost: selectedHost?.host_name,
      selectedDeviceId,
      hasRemoteCapabilities,
      isControlActive,
      isRemotePanelOpen,
      willShowRemotePanel:
        selectedHost &&
        selectedDeviceId &&
        hasRemoteCapabilities &&
        isControlActive &&
        isRemotePanelOpen,
    });
  }, [selectedHost, selectedDeviceId, hasRemoteCapabilities, isControlActive, isRemotePanelOpen]);

  return (
    <>
      {/* Screen Definition Editor - Show when device has AV capabilities and control is active */}
      {selectedHost && selectedDeviceId && hasAVCapabilities && isControlActive && (
        <div ref={screenEditorRef}>
          <ScreenDefinitionEditor
            selectedHost={selectedHost}
            selectedDeviceId={selectedDeviceId}
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
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 1,
            }}
          >
            <Typography variant="h6" sx={{ fontSize: '1rem' }}>
              Verification Results
            </Typography>
            <IconButton
              size="small"
              onClick={() => {
                onSetVerificationResults([]);
                onSetLastVerifiedNodeId(null);
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
          <VerificationResultsDisplay
            results={verificationResults}
            passCondition={verificationPassCondition}
            onSetPassCondition={onSetVerificationPassCondition}
          />
        </Box>
      )}

      {/* Remote Panel - Show when control is active and device has remote capabilities */}
      {selectedHost &&
        selectedDeviceId &&
        hasRemoteCapabilities &&
        isControlActive &&
        isRemotePanelOpen && (
          <>
            {/* Android Mobile Remote - Special handling for mobile devices with AV overlay */}
            {remoteConfig.type === 'android_mobile' && hasAVCapabilities ? (
              <AndroidMobileRemote
                host={selectedHost}
                deviceId={selectedDeviceId}
                streamInfo={streamInfo}
                onReleaseControl={onReleaseControl}
                collapsedPosition={{ x: window.innerWidth - 320, y: 130 }}
                collapsedSize={{ width: 320, height: window.innerHeight - 130 }}
                expandedPosition={{ x: 0, y: 130 }}
                expandedSize={{ width: window.innerWidth, height: window.innerHeight - 130 }}
                deviceResolution={{ width: 1080, height: 1920 }}
                onStreamInfoUpdate={setStreamInfo}
              />
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
                    p: 2,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    justifyContent: 'space-between',
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
                          : `${remoteConfig.device_name} Remote`}
                  </Typography>
                  <IconButton onClick={onReleaseControl} size="small">
                    <CloseIcon />
                  </IconButton>
                </Box>

                {/* Remote Panel Content - Dynamic based on device type */}
                <RemotePanel
                  host={selectedHost}
                  deviceId={selectedDeviceId}
                  deviceModel={remoteConfig.type}
                  isConnected={isControlActive}
                  onReleaseControl={onReleaseControl}
                  initialCollapsed={false}
                  deviceResolution={{ width: 1920, height: 1080 }}
                />
              </Box>
            )}
          </>
        )}
    </>
  );
};

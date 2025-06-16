import { Close as CloseIcon } from '@mui/icons-material';
import { Box, Typography, IconButton } from '@mui/material';
import React, { useMemo } from 'react';

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
  // Memoize computed values based on selectedHost from registration context
  const remoteConfig = useMemo(() => {
    return selectedHost ? getDeviceRemoteConfig(selectedHost) : null;
  }, [selectedHost]);

  const hasAVCapabilities = useMemo(() => {
    return selectedHost?.controller_configs?.av?.parameters != null;
  }, [selectedHost]);

  return (
    <>
      {/* Screen Definition Editor - Show when device has AV capabilities and control is active */}
      {selectedHost && hasAVCapabilities && isControlActive && (
        <ScreenDefinitionEditor
          selectedHostDevice={selectedHost}
          autoConnect={true}
          onDisconnectComplete={onReleaseControl}
        />
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

              <AndroidMobileRemote host={selectedHost} onDisconnectComplete={onReleaseControl} />
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

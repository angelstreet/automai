import { Close as CloseIcon, Tv as TvIcon } from '@mui/icons-material';
import { Box, IconButton, Typography, Button, CircularProgress } from '@mui/material';
import React, { useState, useCallback, useEffect, useMemo } from 'react';

import { StreamViewer } from '../controller/av/StreamViewer';
import { RemotePanel } from '../controller/remote/RemotePanel';
import { useDeviceControl } from '../../hooks/useDeviceControl';
import { useToast } from '../../hooks/useToast';
import { Host } from '../../types/common/Host_Types';

interface RecHostStreamModalProps {
  host: Host | null;
  isOpen: boolean;
  onClose: () => void;
  showRemoteByDefault?: boolean;
  initialControlActive?: boolean;
}

export const RecHostStreamModal: React.FC<RecHostStreamModalProps> = ({
  host,
  isOpen,
  onClose,
  showRemoteByDefault = false,
  initialControlActive = false,
}) => {
  // Local state
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [isStreamActive, setIsStreamActive] = useState<boolean>(false);
  const [showRemote, setShowRemote] = useState<boolean>(showRemoteByDefault);
  const [isControlLoading, setIsControlLoading] = useState<boolean>(false);
  const [isControlActive, setIsControlActive] = useState<boolean>(initialControlActive);

  // Hooks
  const { takeControl, releaseControl, isDeviceLocked } = useDeviceControl();
  const { showError, showWarning } = useToast();

  // Check if host has remote capabilities
  const hasRemoteCapabilities = useMemo(() => {
    if (!host) return false;
    return host.controller_configs?.remote != null;
  }, [host]);

  // Fetch stream URL from server
  const fetchStreamUrl = useCallback(async () => {
    if (!host) return;

    try {
      console.log(
        `[@component:RecHostStreamModal] Fetching stream URL for host: ${host.host_name}`,
      );

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
        console.log(`[@component:RecHostStreamModal] Stream URL received: ${result.stream_url}`);
        setStreamUrl(result.stream_url);
        setIsStreamActive(true);
      } else {
        console.error(`[@component:RecHostStreamModal] Failed to get stream URL:`, result.error);
        showError(`Failed to get stream URL: ${result.error || 'Unknown error'}`);
        setStreamUrl('');
        setIsStreamActive(false);
      }
    } catch (error: any) {
      console.error(`[@component:RecHostStreamModal] Error getting stream URL:`, error);
      showError(`Network error: ${error.message || 'Failed to communicate with server'}`);
      setStreamUrl('');
      setIsStreamActive(false);
    }
  }, [host, showError]);

  // Handle device control
  const handleTakeControl = useCallback(async () => {
    if (!host) {
      console.warn('[@component:RecHostStreamModal] No host selected for take control');
      showWarning('No host selected');
      return;
    }

    console.log(
      `[@component:RecHostStreamModal] ${isControlActive ? 'Releasing' : 'Taking'} control of device: ${host.host_name}`,
    );
    setIsControlLoading(true);

    try {
      if (isControlActive) {
        // Release control
        const result = await releaseControl(host.host_name, 'rec-preview-session');

        if (result.success) {
          console.log(
            `[@component:RecHostStreamModal] Successfully released control of device: ${host.host_name}`,
          );
          setIsControlActive(false);
          setShowRemote(false); // Hide remote when control is released
        } else {
          console.error(`[@component:RecHostStreamModal] Failed to release control:`, result);
          showError(result.error || 'Failed to release control of device');
          setIsControlActive(false);
        }
      } else {
        // Take control
        const result = await takeControl(host.host_name, 'rec-preview-session');

        if (result.success) {
          console.log(
            `[@component:RecHostStreamModal] Successfully took control of device: ${host.host_name}`,
          );
          setIsControlActive(true);
        } else {
          console.error(`[@component:RecHostStreamModal] Failed to take control:`, result);

          // Handle specific error types with appropriate toast duration
          if (
            result.errorType === 'stream_service_error' ||
            result.errorType === 'adb_connection_error'
          ) {
            showError(result.error || 'Service error occurred', { duration: 6000 });
          } else {
            showError(result.error || 'Failed to take control of device');
          }

          setIsControlActive(false);
        }
      }
    } catch (error: any) {
      console.error('[@component:RecHostStreamModal] Exception during control operation:', error);
      showError(`Unexpected error: ${error.message || 'Failed to communicate with server'}`);
      setIsControlActive(false);
    } finally {
      setIsControlLoading(false);
    }
  }, [host, isControlActive, takeControl, releaseControl, showError, showWarning]);

  // Handle remote toggle
  const handleToggleRemote = useCallback(() => {
    if (!hasRemoteCapabilities) {
      showWarning('This device does not support remote control');
      return;
    }

    if (!isControlActive) {
      showWarning('Please take control of the device first');
      return;
    }

    setShowRemote((prev) => !prev);
    console.log(`[@component:RecHostStreamModal] Remote panel toggled: ${!showRemote}`);
  }, [hasRemoteCapabilities, isControlActive, showRemote, showWarning]);

  // Handle modal close
  const handleClose = useCallback(async () => {
    console.log('[@component:RecHostStreamModal] Closing modal');

    // Release control if active
    if (isControlActive && host) {
      try {
        console.log(
          `[@component:RecHostStreamModal] Releasing control on close for: ${host.host_name}`,
        );
        await releaseControl(host.host_name, 'rec-preview-session');
      } catch (error) {
        console.error('[@component:RecHostStreamModal] Error releasing control on close:', error);
      }
    }

    // Reset state
    setIsControlActive(false);
    setShowRemote(false);
    setStreamUrl('');
    setIsStreamActive(false);

    onClose();
  }, [isControlActive, host, releaseControl, onClose]);

  // Initialize when modal opens
  useEffect(() => {
    if (isOpen && host) {
      console.log(`[@component:RecHostStreamModal] Modal opened for host: ${host.host_name}`);
      fetchStreamUrl();
    }
  }, [isOpen, host, fetchStreamUrl]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, handleClose]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isControlActive && host) {
        console.log(
          `[@component:RecHostStreamModal] Cleanup: releasing control for: ${host.host_name}`,
        );
        releaseControl(host.host_name, 'rec-preview-session').catch((error) => {
          console.error('[@component:RecHostStreamModal] Error during cleanup:', error);
        });
      }
    };
  }, []);

  if (!isOpen || !host) return null;

  // Check if device is locked by another user
  const deviceLocked = isDeviceLocked(host);

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
      }}
    >
      <Box
        sx={{
          width: '95vw',
          height: '90vh',
          backgroundColor: 'background.paper',
          borderRadius: 2,
          boxShadow: 24,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 2,
            backgroundColor: 'grey.800',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: '8px 8px 0 0',
          }}
        >
          <Typography variant="h6" component="h2">
            {host.device_name || host.host_name} - Live Stream
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Take Control Button */}
            <Button
              variant={isControlActive ? 'contained' : 'outlined'}
              size="small"
              onClick={handleTakeControl}
              disabled={isControlLoading || deviceLocked}
              startIcon={isControlLoading ? <CircularProgress size={16} /> : <TvIcon />}
              color={isControlActive ? 'success' : 'primary'}
              sx={{
                fontSize: '0.75rem',
                minWidth: 120,
                color: isControlActive ? 'white' : 'inherit',
              }}
              title={
                isControlLoading
                  ? 'Processing...'
                  : deviceLocked
                    ? 'Device is locked by another user'
                    : isControlActive
                      ? 'Release Control'
                      : 'Take Control'
              }
            >
              {isControlLoading
                ? 'Processing...'
                : isControlActive
                  ? 'Release Control'
                  : 'Take Control'}
            </Button>

            {/* Remote Toggle Button */}
            {hasRemoteCapabilities && (
              <Button
                variant="outlined"
                size="small"
                onClick={handleToggleRemote}
                disabled={!isControlActive}
                sx={{
                  fontSize: '0.75rem',
                  minWidth: 100,
                  color: 'inherit',
                }}
                title={
                  !isControlActive
                    ? 'Take control first to use remote'
                    : showRemote
                      ? 'Hide Remote'
                      : 'Show Remote'
                }
              >
                {showRemote ? 'Hide Remote' : 'Show Remote'}
              </Button>
            )}

            {/* Close Button */}
            <IconButton
              onClick={handleClose}
              sx={{ color: 'grey.300', '&:hover': { color: 'white' } }}
              aria-label="Close"
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Main Content */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            overflow: 'hidden',
            backgroundColor: 'black',
          }}
        >
          {/* Stream Viewer */}
          <Box
            sx={{
              width: showRemote && hasRemoteCapabilities && isControlActive ? '75%' : '100%',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {streamUrl && isStreamActive ? (
              <StreamViewer
                streamUrl={streamUrl}
                isStreamActive={isStreamActive}
                isCapturing={false}
                model={host.device_model}
                isExpanded={true}
                sx={{
                  width: '100%',
                  height: '100%',
                }}
              />
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: 'white',
                }}
              >
                <Typography>Loading stream...</Typography>
              </Box>
            )}
          </Box>

          {/* Remote Control Panel */}
          {showRemote && hasRemoteCapabilities && isControlActive && (
            <Box
              sx={{
                width: '25%',
                backgroundColor: 'background.default',
                borderLeft: '1px solid',
                borderColor: 'divider',
                overflow: 'hidden',
              }}
            >
              <RemotePanel
                host={host}
                onReleaseControl={() => {
                  setIsControlActive(false);
                  setShowRemote(false);
                }}
                initialCollapsed={false}
                deviceResolution={{ width: 1920, height: 1080 }}
                streamCollapsed={false}
                streamMinimized={false}
              />
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

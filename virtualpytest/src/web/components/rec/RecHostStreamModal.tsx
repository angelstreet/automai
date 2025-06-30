import { Close as CloseIcon, Tv as TvIcon, Analytics as AnalyticsIcon } from '@mui/icons-material';
import { Box, IconButton, Typography, Button, CircularProgress } from '@mui/material';
import React, { useState, useCallback, useEffect, useMemo } from 'react';

import { useStream } from '../../hooks/controller';
import { useDeviceControl } from '../../hooks/useDeviceControl';
import { useToast } from '../../hooks/useToast';
import { Host, Device } from '../../types/common/Host_Types';
import { HLSVideoPlayer } from '../common/HLSVideoPlayer';
import { RemotePanel } from '../controller/remote/RemotePanel';
import { MonitoringPlayer } from '../monitoring/MonitoringPlayer';

interface RecHostStreamModalProps {
  host: Host;
  device?: Device; // Optional device for device-specific operations
  isOpen: boolean;
  onClose: () => void;
  showRemoteByDefault?: boolean;
}

export const RecHostStreamModal: React.FC<RecHostStreamModalProps> = ({
  host,
  device,
  isOpen,
  onClose,
  showRemoteByDefault = false,
}) => {
  // Early return if not open - prevents hooks from running
  if (!isOpen || !host) return null;

  return (
    <RecHostStreamModalContent
      host={host}
      device={device}
      onClose={onClose}
      showRemoteByDefault={showRemoteByDefault}
    />
  );
};

// Separate component that only mounts when modal is open
const RecHostStreamModalContent: React.FC<{
  host: Host;
  device?: Device;
  onClose: () => void;
  showRemoteByDefault: boolean;
}> = ({ host, device, onClose, showRemoteByDefault }) => {
  // Local state
  const [showRemote, setShowRemote] = useState<boolean>(showRemoteByDefault);
  const [monitoringMode, setMonitoringMode] = useState<boolean>(false);

  // Hooks - now only run when modal is actually open
  const { showError, showWarning } = useToast();

  // NEW: Use device control hook (replaces all duplicate control logic)
  const { isControlActive, isControlLoading, controlError, handleToggleControl, clearError } =
    useDeviceControl({
      host,
      device_id: device?.device_id || 'device1',
      sessionId: 'rec-stream-modal-session',
      autoCleanup: true, // Auto-release on unmount
    });

  // Use new stream hook - auto-fetches when host/device_id changes
  const { streamUrl, isLoadingUrl, urlError } = useStream({
    host,
    device_id: device?.device_id || 'device1',
  });

  // Calculate stream container dimensions for overlay alignment
  const streamContainerDimensions = useMemo(() => {
    // Use stable window dimensions to prevent infinite re-renders
    const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;

    // Modal dimensions (95vw x 90vh)
    const modalWidth = windowWidth * 0.95;
    const modalHeight = windowHeight * 0.9;

    // Header height (matches the minHeight + padding)
    const headerHeight = 48; // minHeight from header styling

    // Stream area dimensions
    const streamAreaWidth = showRemote && isControlActive ? modalWidth * 0.75 : modalWidth;
    const streamAreaHeight = modalHeight - headerHeight;

    // Modal position (centered)
    const modalX = (windowWidth - modalWidth) / 2;
    const modalY = (windowHeight - modalHeight) / 2;

    // Stream container position
    const streamX = modalX;
    const streamY = modalY + headerHeight;

    const dimensions = {
      width: Math.round(streamAreaWidth),
      height: Math.round(streamAreaHeight),
      x: Math.round(streamX),
      y: Math.round(streamY),
    };

    console.log(
      '[@component:RecHostStreamModal] Calculated stream container dimensions:',
      dimensions,
    );
    return dimensions;
  }, [showRemote, isControlActive]);

  // Handle remote toggle
  const handleToggleRemote = useCallback(() => {
    if (!isControlActive) {
      showWarning('Please take control of the device first');
      return;
    }

    setShowRemote((prev) => !prev);
    console.log(`[@component:RecHostStreamModal] Remote panel toggled: ${!showRemote}`);
  }, [isControlActive, showRemote, showWarning]);

  // Handle monitoring mode toggle
  const handleToggleMonitoring = useCallback(() => {
    if (!isControlActive) {
      showWarning('Please take control of the device first to enable monitoring');
      return;
    }

    setMonitoringMode((prev) => {
      const newMode = !prev;
      console.log(`[@component:RecHostStreamModal] Monitoring mode toggled: ${newMode}`);

      // Auto-show remote when enabling monitoring for full control
      if (newMode && !showRemote) {
        setShowRemote(true);
      }

      return newMode;
    });
  }, [isControlActive, showRemote, showWarning]);

  // Stable device resolution to prevent re-renders
  const stableDeviceResolution = useMemo(() => ({ width: 1920, height: 1080 }), []);

  // Stable onReleaseControl callback to prevent re-renders
  const handleReleaseControl = useCallback(() => {
    setShowRemote(false);
    // Control release handled by useDeviceControl
  }, []);

  // Handle modal close
  const handleClose = useCallback(async () => {
    console.log('[@component:RecHostStreamModal] Closing modal');

    // Reset state (useDeviceControl handles cleanup automatically)
    setShowRemote(false);
    setMonitoringMode(false);
    onClose();
  }, [onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [handleClose]);

  // Show control errors
  useEffect(() => {
    if (controlError) {
      showError(controlError);
      clearError();
    }
  }, [controlError, showError, clearError]);

  // Show URL error if stream fetch failed
  useEffect(() => {
    if (urlError) {
      showError(`Stream URL error: ${urlError}`);
    }
  }, [urlError, showError]);

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
            px: 2,
            py: 1,
            backgroundColor: 'grey.800',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: '8px 8px 0 0',
            minHeight: 48,
          }}
        >
          <Typography variant="h6" component="h2">
            {device?.device_name || host.host_name} -{' '}
            {monitoringMode ? 'Monitoring' : 'Live Stream'}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Take Control Button */}
            <Button
              variant={isControlActive ? 'contained' : 'outlined'}
              size="small"
              onClick={handleToggleControl}
              disabled={isControlLoading}
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

            {/*M onitoring Toggle Button */}
            <Button
              variant={monitoringMode ? 'contained' : 'outlined'}
              size="small"
              onClick={handleToggleMonitoring}
              disabled={!isControlActive}
              startIcon={<AnalyticsIcon />}
              color={monitoringMode ? 'warning' : 'primary'}
              sx={{
                fontSize: '0.75rem',
                minWidth: 120,
                color: monitoringMode ? 'white' : 'inherit',
              }}
              title={
                !isControlActive
                  ? 'Take control first to enable monitoring'
                  : monitoringMode
                    ? 'Disable Monitoring'
                    : 'Enable Monitoring'
              }
            >
              {monitoringMode ? 'Stop Monitoring' : 'Monitoring'}
            </Button>

            {/* Remote Toggle Button */}
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
          {/* Stream Viewer / Monitoring Player */}
          <Box
            sx={{
              width: showRemote && isControlActive ? '75%' : '100%',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'black',
            }}
          >
            {monitoringMode ? (
              <MonitoringPlayer
                host={host}
                deviceId={device?.device_id || 'device1'}
                model={device?.device_model || 'unknown'}
              />
            ) : streamUrl ? (
              <HLSVideoPlayer
                streamUrl={streamUrl}
                isStreamActive={true}
                isCapturing={false}
                model={device?.device_model || 'unknown'}
                isExpanded={false}
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
                <Typography>
                  {isLoadingUrl
                    ? 'Loading stream...'
                    : urlError
                      ? 'Stream error'
                      : 'No stream available'}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Remote Control Panel */}
          {showRemote && isControlActive && (
            <Box
              sx={{
                width: '25%',
                backgroundColor: 'background.default',
                borderLeft: '1px solid',
                borderColor: 'divider',
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
              }}
            >
              <RemotePanel
                host={host}
                deviceId={device?.device_id || 'device1'}
                deviceModel={device?.device_model || 'unknown'}
                isConnected={isControlActive}
                onReleaseControl={handleReleaseControl}
                initialCollapsed={false}
                deviceResolution={stableDeviceResolution}
                streamCollapsed={false}
                streamMinimized={false}
                streamContainerDimensions={streamContainerDimensions}
              />
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

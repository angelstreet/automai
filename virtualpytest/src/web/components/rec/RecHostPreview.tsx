import { Fullscreen as FullscreenIcon, Error as ErrorIcon } from '@mui/icons-material';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  CircularProgress,
} from '@mui/material';
import React, { useState, useCallback, useEffect } from 'react';

import { useHostManager } from '../../hooks/useHostManager';
import { useToast } from '../../hooks/useToast';
import { Host } from '../../types/common/Host_Types';
import { ScreenshotCapture } from '../controller/av/ScreenshotCapture';

import { RecHostStreamModal } from './RecHostStreamModal';

interface RecHostPreviewProps {
  host: Host;
  device?: any; // Optional device for multi-device support
  takeScreenshot: (host: Host, deviceId?: string) => Promise<string | null>;
  onFullscreen?: (host: Host) => void;
}

export const RecHostPreview: React.FC<RecHostPreviewProps> = ({
  host,
  device,
  takeScreenshot,
  onFullscreen,
}) => {
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStreamModalOpen, setIsStreamModalOpen] = useState(false);

  // Hooks for device control and notifications
  const { takeControl } = useHostManager();
  const { showError } = useToast();

  // Take screenshot function
  const handleTakeScreenshot = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log(`[@component:RecHostPreview] Taking screenshot for host: ${host.host_name}`);

      const url = await takeScreenshot(host, device?.device_id);

      if (url) {
        setScreenshotUrl(url);
        console.log(
          `[@component:RecHostPreview] Screenshot captured successfully for: ${host.host_name}`,
        );
      } else {
        setError('Failed to capture screenshot');
        console.warn(
          `[@component:RecHostPreview] Screenshot capture failed for: ${host.host_name}`,
        );
      }
    } catch (err: any) {
      console.error(`[@component:RecHostPreview] Screenshot error for ${host.host_name}:`, err);
      setError(err.message || 'Screenshot failed');
    } finally {
      setIsLoading(false);
    }
  }, [takeScreenshot, host, device]);

  // Auto-take screenshot on mount
  useEffect(() => {
    handleTakeScreenshot();
  }, [handleTakeScreenshot]);

  // Handle opening stream modal with automatic take control
  const handleOpenStreamModal = useCallback(async () => {
    console.log(`[@component:RecHostPreview] Opening stream modal for host: ${host.host_name}`);

    // Don't attempt if host is offline
    if (host.status !== 'online') {
      console.warn(`[@component:RecHostPreview] Cannot take control - host status: ${host.status}`);
      showError('Host is not online');
      return;
    }

    try {
      console.log(
        `[@component:RecHostPreview] Attempting to take control of device: ${host.host_name}`,
      );

      const result = await takeControl(host.host_name, 'rec-preview-session');

      if (result.success) {
        console.log(
          `[@component:RecHostPreview] Successfully took control, opening stream modal for: ${host.host_name}`,
        );
        setIsStreamModalOpen(true);
      } else {
        console.error(`[@component:RecHostPreview] Failed to take control:`, result);

        // Handle specific error types with appropriate toast duration
        if (
          result.errorType === 'stream_service_error' ||
          result.errorType === 'adb_connection_error'
        ) {
          showError(result.error || 'Service error occurred', { duration: 6000 });
        } else {
          showError(result.error || 'Failed to take control of device');
        }
      }
    } catch (error: any) {
      console.error(`[@component:RecHostPreview] Exception during take control:`, error);
      showError(`Unexpected error: ${error.message || 'Failed to communicate with server'}`);
    }
  }, [host, takeControl, showError]);

  // Handle closing stream modal
  const handleCloseStreamModal = useCallback(() => {
    console.log(`[@component:RecHostPreview] Closing stream modal for host: ${host.host_name}`);
    setIsStreamModalOpen(false);
  }, [host]);

  // Handle fullscreen
  const handleFullscreen = useCallback(() => {
    if (onFullscreen) {
      onFullscreen(host);
    }
  }, [onFullscreen, host]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'success';
      case 'offline':
        return 'error';
      default:
        return 'default';
    }
  };

  // Clean display values - will throw if required properties are missing
  const displayName = device ? `${host.host_name}` : host.host_name;

  const displayInfo = device ? `${device.name} (${device.model})` : host.host_name;

  const displayUrl = device?.device_ip || host.host_url;

  return (
    <Card
      sx={{
        height: 280,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        '&:hover': {
          boxShadow: 4,
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 1,
          pb: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="subtitle2" noWrap sx={{ flex: 1, mr: 1 }}>
          {displayName}
        </Typography>
        <Chip
          label={host.status}
          size="small"
          color={getStatusColor(host.status) as any}
          sx={{ fontSize: '0.7rem', height: 20 }}
        />
      </Box>

      {/* Device info */}
      <Box sx={{ px: 1, pb: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {displayInfo} • {displayUrl}
        </Typography>
      </Box>

      {/* Screenshot area */}
      <CardContent sx={{ flex: 1, p: 1, pt: 0, position: 'relative', minHeight: 0 }}>
        <Box
          sx={{
            height: '100%',
            border: '1px solid #e0e0e0',
            borderRadius: 1,
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: 'transparent',
          }}
        >
          {error ? (
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'error.main',
              }}
            >
              <ErrorIcon sx={{ mb: 1 }} />
              <Typography variant="caption" align="center">
                {error}
              </Typography>
            </Box>
          ) : screenshotUrl ? (
            <ScreenshotCapture
              screenshotPath={screenshotUrl}
              isCapturing={isLoading}
              model={device?.model}
              sx={{
                width: '100%',
                height: '100%',
                '& img': {
                  cursor: 'pointer',
                },
              }}
            />
          ) : (
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
              }}
            >
              {isLoading ? (
                <>
                  <CircularProgress size={24} />
                  <Typography variant="caption" color="text.secondary">
                    Capturing screenshot...
                  </Typography>
                </>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  No screenshot available
                </Typography>
              )}
            </Box>
          )}

          {/* Fullscreen button - only show when there's a screenshot and onFullscreen is provided */}
          {onFullscreen && screenshotUrl && (
            <Box
              sx={{
                position: 'absolute',
                top: 4,
                right: 4,
              }}
            >
              <IconButton
                size="small"
                onClick={handleFullscreen}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.9)' },
                }}
                title="View Fullscreen"
              >
                <FullscreenIcon fontSize="small" />
              </IconButton>
            </Box>
          )}

          {/* Click overlay for fullscreen */}
          {onFullscreen && screenshotUrl && (
            <Box
              onClick={handleFullscreen}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                cursor: 'pointer',
                backgroundColor: 'transparent',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.05)',
                },
              }}
            />
          )}

          {/* Click overlay for stream modal - when no onFullscreen prop */}
          {!onFullscreen && screenshotUrl && (
            <Box
              onClick={handleOpenStreamModal}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                cursor: 'pointer',
                backgroundColor: 'transparent',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.05)',
                },
              }}
            />
          )}
        </Box>
      </CardContent>

      {/* Stream Modal */}
      <RecHostStreamModal
        host={host}
        isOpen={isStreamModalOpen}
        onClose={handleCloseStreamModal}
        showRemoteByDefault={false}
        initialControlActive={true}
      />
    </Card>
  );
};

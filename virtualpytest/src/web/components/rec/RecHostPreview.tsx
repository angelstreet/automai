import {
  Refresh as RefreshIcon,
  Fullscreen as FullscreenIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import React, { useState, useEffect, useRef, useCallback } from 'react';

import { useDeviceControl } from '../../hooks/useDeviceControl';
import { useToast } from '../../hooks/useToast';
import { Host } from '../../types/common/Host_Types';
import { ScreenshotCapture } from '../controller/av/ScreenshotCapture';

import { RecHostStreamModal } from './RecHostStreamModal';

interface HostWithAVStatus extends Host {
  avStatus: 'online' | 'offline' | 'checking';
}

interface RecHostPreviewProps {
  host: HostWithAVStatus;
  device?: any; // Optional device for multi-device support
  takeScreenshot: (host: Host, deviceId?: string) => Promise<string | null>;
  onFullscreen?: (host: Host) => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const RecHostPreview: React.FC<RecHostPreviewProps> = ({
  host,
  device,
  takeScreenshot,
  onFullscreen,
  autoRefresh = true,
  refreshInterval = 10000,
}) => {
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isStreamModalOpen, setIsStreamModalOpen] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Hooks for device control and notifications
  const { takeControl } = useDeviceControl();
  const { showError } = useToast();

  // Take screenshot function - only show loading for initial load
  const handleTakeScreenshot = useCallback(async () => {
    // Don't take screenshot if AV is offline
    if (host.avStatus === 'offline') {
      setError('AV Controller Offline');
      setIsInitialLoading(false);
      return;
    }

    try {
      setError(null);

      const url = await takeScreenshot(host, device?.device_id);

      if (url) {
        setScreenshotUrl(url);
        setLastUpdate(new Date());
        setIsInitialLoading(false);
      } else {
        setError('Failed to capture screenshot');
        setIsInitialLoading(false);
      }
    } catch (err: any) {
      console.error(`[@component:RecHostPreview] Screenshot error for ${host.host_name}:`, err);
      setError(err.message || 'Screenshot failed');
      setIsInitialLoading(false);
    }
  }, [takeScreenshot, host, device]);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      // Take initial screenshot
      handleTakeScreenshot();

      // Set up interval for auto-refresh
      intervalRef.current = setInterval(() => {
        handleTakeScreenshot();
      }, refreshInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, host.host_name, handleTakeScreenshot]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleFullscreen = () => {
    if (onFullscreen) {
      onFullscreen(host);
    }
  };

  // Handle opening stream modal with automatic take control
  const handleOpenStreamModal = useCallback(async () => {
    console.log(`[@component:RecHostPreview] Opening stream modal for host: ${host.host_name}`);

    // Don't attempt if host or AV is offline
    if (host.status !== 'online' || host.avStatus === 'offline') {
      console.warn(
        `[@component:RecHostPreview] Cannot take control - host status: ${host.status}, AV status: ${host.avStatus}`,
      );
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

        // Handle specific error types with appropriate toast duration (same as NavigationEditor)
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
  }, [host.host_name]);

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

  const getAVStatusColor = (avStatus: string) => {
    switch (avStatus) {
      case 'online':
        return 'success';
      case 'offline':
        return 'error';
      case 'checking':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatLastUpdate = (date: Date | null) => {
    if (!date) return 'Never';

    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 1000) return 'Just now';
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return date.toLocaleTimeString();
  };

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
        sx={{ p: 1, pb: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Typography variant="subtitle2" noWrap sx={{ flex: 1, mr: 1 }}>
          {device ? `${host.host_name} - ${device.device_name}` : host.host_name}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Chip
            label={host.status}
            size="small"
            color={getStatusColor(host.status) as any}
            sx={{ fontSize: '0.7rem', height: 20 }}
          />
          <Chip
            label={`AV: ${host.avStatus}`}
            size="small"
            color={getAVStatusColor(host.avStatus) as any}
            sx={{ fontSize: '0.7rem', height: 20 }}
          />
        </Box>
      </Box>

      {/* Device info */}
      <Box sx={{ px: 1, pb: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {device ? `${device.device_name} (${device.device_model})` : host.host_name} •{' '}
          {device?.device_ip || host.host_url}
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
              isCapturing={false}
              model={device?.device_model || 'unknown'}
              sx={{
                width: '100%',
                height: '100%',
                '& img': {
                  cursor: onFullscreen ? 'pointer' : 'default',
                },
              }}
            />
          ) : (
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isInitialLoading ? (
                <CircularProgress size={24} />
              ) : (
                <Typography variant="caption" color="text.secondary">
                  No capture available
                </Typography>
              )}
            </Box>
          )}

          {/* Action buttons */}
          <Box
            sx={{
              position: 'absolute',
              top: 4,
              right: 4,
              display: 'flex',
              gap: 0.5,
            }}
          >
            <Tooltip title="Refresh">
              <IconButton
                size="small"
                onClick={handleTakeScreenshot}
                disabled={false}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.9)' },
                }}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            {onFullscreen && (
              <Tooltip title="View Fullscreen">
                <IconButton
                  size="small"
                  onClick={handleFullscreen}
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.9)' },
                  }}
                >
                  <FullscreenIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>

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

      {/* Footer */}
      <Box sx={{ px: 1, pb: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Last update: {formatLastUpdate(lastUpdate)}
        </Typography>
      </Box>

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

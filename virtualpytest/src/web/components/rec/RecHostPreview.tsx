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
import {
  Refresh as RefreshIcon,
  Fullscreen as FullscreenIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import React, { useState, useEffect, useRef } from 'react';

import { ScreenshotCapture } from '../controller/av/ScreenshotCapture';
import { Host } from '../../types/common/Host_Types';

interface RecHostPreviewProps {
  host: Host;
  takeScreenshot: (host: Host) => Promise<string | null>;
  onFullscreen?: (host: Host) => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const RecHostPreview: React.FC<RecHostPreviewProps> = ({
  host,
  takeScreenshot,
  onFullscreen,
  autoRefresh = true,
  refreshInterval = 1000,
}) => {
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Take screenshot function
  const handleTakeScreenshot = async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      setError(null);

      const url = await takeScreenshot(host);

      if (url) {
        setScreenshotUrl(url);
        setLastUpdate(new Date());
      } else {
        setError('Failed to capture screenshot');
      }
    } catch (err: any) {
      console.error(`[@component:RecHostPreview] Screenshot error for ${host.host_name}:`, err);
      setError(err.message || 'Screenshot failed');
    } finally {
      setIsLoading(false);
    }
  };

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
  }, [autoRefresh, refreshInterval, host.host_name]);

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
          {host.host_name}
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
          {host.device_model} • {host.device_ip || host.host_url}
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
            backgroundColor: '#f5f5f5',
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
              model={host.device_model}
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
              {isLoading ? (
                <CircularProgress size={24} />
              ) : (
                <Typography variant="caption" color="text.secondary">
                  No capture available
                </Typography>
              )}
            </Box>
          )}

          {/* Loading overlay */}
          {isLoading && screenshotUrl && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CircularProgress size={20} sx={{ color: 'white' }} />
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
                disabled={isLoading}
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
          {onFullscreen && screenshotUrl && !isLoading && (
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
        </Box>
      </CardContent>

      {/* Footer */}
      <Box sx={{ px: 1, pb: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Last update: {formatLastUpdate(lastUpdate)}
        </Typography>
      </Box>
    </Card>
  );
};

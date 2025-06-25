import { Error as ErrorIcon } from '@mui/icons-material';
import { Card, CardContent, Typography, Box, Chip, CircularProgress } from '@mui/material';
import React, { useState, useCallback, useEffect } from 'react';

import { useToast } from '../../hooks/useToast';
import { Host, Device } from '../../types/common/Host_Types';

import { RecHostStreamModal } from './RecHostStreamModal';

interface RecHostPreviewProps {
  host: Host;
  device?: Device;
}

export const RecHostPreview: React.FC<RecHostPreviewProps> = ({ host, device }) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [previousThumbnailUrl, setPreviousThumbnailUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStreamModalOpen, setIsStreamModalOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Hook for notifications only
  const { showError } = useToast();

  // Handle smooth transition when new image loads
  const handleImageLoad = useCallback(() => {
    if (isTransitioning) {
      // Clear the previous image after a brief delay to allow smooth transition
      setTimeout(() => {
        setPreviousThumbnailUrl(null);
        setIsTransitioning(false);
      }, 300); // Small delay for smooth transition
    }
  }, [isTransitioning]);

  // Process screenshot URL with conditional HTTP to HTTPS proxy (similar to ScreenshotCapture)
  const getImageUrl = useCallback((screenshotPath: string) => {
    if (!screenshotPath) return '';

    console.log(`[@component:RecHostPreview] Processing thumbnail path: ${screenshotPath}`);

    // Handle data URLs (base64 from remote system) - return as is
    if (screenshotPath.startsWith('data:')) {
      console.log('[@component:RecHostPreview] Using data URL from remote system');
      return screenshotPath;
    }

    // Handle HTTPS URLs - return as is (no proxy needed)
    if (screenshotPath.startsWith('https:')) {
      console.log('[@component:RecHostPreview] Using HTTPS URL directly');
      return screenshotPath;
    }

    // Handle HTTP URLs - use proxy to convert to HTTPS
    if (screenshotPath.startsWith('http:')) {
      console.log('[@component:RecHostPreview] HTTP thumbnail URL detected, using proxy');
      const proxyUrl = `/server/av/proxy-image?url=${encodeURIComponent(screenshotPath)}`;
      console.log(`[@component:RecHostPreview] Generated proxy URL for thumbnail: ${proxyUrl}`);
      console.log(`[@component:RecHostPreview] Original thumbnail URL: ${screenshotPath}`);
      return proxyUrl;
    }

    // For relative paths or other formats, use directly (assuming they are accessible)
    console.log('[@component:RecHostPreview] Using path directly');
    return screenshotPath;
  }, []);

  // Take screenshot function - now internal
  const handleTakeScreenshot = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log(`[@component:RecHostPreview] Taking screenshot for host: ${host.host_name}`);

      const response = await fetch('/server/av/take-screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: host,
          device_id: device?.device_id || 'device1',
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.screenshot_url) {
          console.log(`[@component:RecHostPreview] Screenshot taken: ${result.screenshot_url}`);

          // Convert screenshot URL to thumbnail URL
          // Replace .jpg with _thumbnail.jpg at the end of the filename
          const thumbnailUrlFromScreenshot = result.screenshot_url.replace(
            /\.jpg$/i,
            '_thumbnail.jpg',
          );
          console.log(`[@component:RecHostPreview] Thumbnail URL: ${thumbnailUrlFromScreenshot}`);

          // Add 1 second delay to ensure thumbnail is properly generated and available
          setTimeout(() => {
            console.log(
              `[@component:RecHostPreview] Setting thumbnail URL after delay: ${thumbnailUrlFromScreenshot}`,
            );

            // Smooth transition: store previous URL and set new one
            if (thumbnailUrl && thumbnailUrl !== thumbnailUrlFromScreenshot) {
              setPreviousThumbnailUrl(thumbnailUrl);
              setIsTransitioning(true);
            }
            setThumbnailUrl(thumbnailUrlFromScreenshot);
          }, 1000); // 1 second delay
        } else {
          setError('Failed to capture screenshot');
          console.warn(
            `[@component:RecHostPreview] Screenshot capture failed for: ${host.host_name}`,
          );
        }
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
  }, [host, device, thumbnailUrl]);

  // Auto-take screenshot every 5 seconds - but only when device data is stable
  useEffect(() => {
    if (!host || !device) return;

    // Initial screenshot after device data is stable
    const initialTimer = setTimeout(() => {
      console.log(
        `[@component:RecHostPreview] Device data stable, taking initial screenshot for: ${host.host_name}`,
      );
      handleTakeScreenshot();
    }, 4000); // Small delay to prevent racing with data loading

    // Set up interval for periodic screenshots every 5 seconds
    const screenshotInterval = setInterval(() => {
      if (host && device && host.status === 'online') {
        console.log(
          `[@component:RecHostPreview] Taking periodic screenshot for: ${host.host_name}`,
        );
        handleTakeScreenshot();
      }
    }, 1200); // 1 seconds

    return () => {
      clearTimeout(initialTimer);
      clearInterval(screenshotInterval);
    };
  }, [host, device, handleTakeScreenshot]);

  // Handle opening stream modal - control will be handled by the modal itself
  const handleOpenStreamModal = useCallback(() => {
    console.log(`[@component:RecHostPreview] Opening stream modal for host: ${host.host_name}`);

    // Basic check if host is online
    if (host.status !== 'online') {
      console.warn(`[@component:RecHostPreview] Cannot open modal - host status: ${host.status}`);
      showError('Host is not online');
      return;
    }

    // Just open the modal - let it handle control logic
    setIsStreamModalOpen(true);
  }, [host, showError]);

  // Handle closing stream modal
  const handleCloseStreamModal = useCallback(() => {
    console.log(`[@component:RecHostPreview] Closing stream modal for host: ${host.host_name}`);
    setIsStreamModalOpen(false);
  }, [host]);

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

  // Clean display values with better logging
  const displayName = device ? `${host.host_name}` : host.host_name;

  const displayInfo = device
    ? `${device.device_name || 'Unknown Device'} (${device.device_model || 'Unknown Model'})`
    : host.host_name;

  // Debug log device data
  useEffect(() => {
    if (device) {
      console.log(`[@component:RecHostPreview] Device data for ${host.host_name}:`, {
        device_name: device.device_name,
        device_model: device.device_model,
        device_id: device.device_id,
        device_capabilities: device.device_capabilities,
      });
    }
  }, [host.host_name, device]);

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
          {displayInfo}
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
          ) : thumbnailUrl ? (
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'transparent',
                overflow: 'hidden',
              }}
            >
              {/* Previous image - fading out */}
              {previousThumbnailUrl && isTransitioning && (
                <Box
                  component="img"
                  src={getImageUrl(previousThumbnailUrl)}
                  alt="Previous screenshot"
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    opacity: isTransitioning ? 0 : 1,
                    transition: 'opacity 300ms ease-in-out',
                    cursor: 'pointer',
                  }}
                  draggable={false}
                />
              )}

              {/* Current image - fading in */}
              <Box
                component="img"
                src={getImageUrl(thumbnailUrl)}
                alt="Current screenshot"
                sx={{
                  position: previousThumbnailUrl && isTransitioning ? 'absolute' : 'relative',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  opacity: 1,
                  transition: 'opacity 300ms ease-in-out',
                  cursor: 'pointer',
                }}
                draggable={false}
                onLoad={handleImageLoad}
                onError={(_e) => {
                  console.error(
                    `[@component:RecHostPreview] Failed to load image: ${thumbnailUrl}`,
                  );
                  setError('Failed to load screenshot');
                }}
              />
            </Box>
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

          {/* Click overlay to open stream modal */}
          {thumbnailUrl && (
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
        device={device}
        isOpen={isStreamModalOpen}
        onClose={handleCloseStreamModal}
        showRemoteByDefault={false}
      />
    </Card>
  );
};

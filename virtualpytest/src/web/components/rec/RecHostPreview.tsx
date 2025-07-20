import { Error as ErrorIcon } from '@mui/icons-material';
import { Card, Typography, Box, Chip, CircularProgress } from '@mui/material';
import React, { useState, useCallback, useEffect, useMemo } from 'react';

import { useModal } from '../../contexts/ModalContext';
import { useStream } from '../../hooks/controller';
import { useToast } from '../../hooks/useToast';
import { Host, Device } from '../../types/common/Host_Types';

import { RecHostStreamModal } from './RecHostStreamModal';

interface RecHostPreviewProps {
  host: Host;
  device?: Device;
  initializeBaseUrl?: (host: Host, device: Device) => Promise<boolean>;
  generateThumbnailUrl?: (host: Host, device: Device) => string | null;
  hideHeader?: boolean;
}

// Simple mobile detection function to match MonitoringPlayer logic
const isMobileModel = (model?: string): boolean => {
  if (!model) return false;
  const modelLower = model.toLowerCase();
  return modelLower.includes('mobile');
};

export const RecHostPreview: React.FC<RecHostPreviewProps> = ({
  host,
  device,
  initializeBaseUrl,
  generateThumbnailUrl,
  hideHeader = false,
}) => {
  // Global modal state
  const { isAnyModalOpen } = useModal();

  // Simple 2-image state
  const [image1Url, setImage1Url] = useState<string | null>(null);
  const [image2Url, setImage2Url] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStreamModalOpen, setIsStreamModalOpen] = useState(false);

  // Detect if this is a mobile device model for proper sizing
  const isMobile = useMemo(() => {
    return isMobileModel(device?.device_model);
  }, [device?.device_model]);

  // Check if this is a VNC device
  const isVncDevice = useMemo(() => {
    return device?.device_model === 'host_vnc';
  }, [device?.device_model]);

  // For VNC devices, get the stream URL directly
  const { streamUrl: vncStreamUrl } = useStream({
    host,
    device_id: device?.device_id || 'device1',
  });

  // Hook for notifications only
  const { showError } = useToast();

  // Stabilize host and device objects to prevent infinite re-renders
  const stableHost = useMemo(() => host, [host]);
  const stableDevice = useMemo(() => device, [device]);

  // Handle when an image loads successfully
  const handleImageLoad = useCallback((imageNumber: 1 | 2) => {
    setActiveImage(imageNumber); // Switch to the newly loaded image
  }, []);

  // Process screenshot URL with conditional HTTP to HTTPS proxy
  const getImageUrl = useCallback((screenshotPath: string) => screenshotPath || '', []);

  // Simple screenshot taking logic
  const handleTakeScreenshot = useCallback(async () => {
    // Skip screenshots for VNC devices - they use iframe
    if (isVncDevice) {
      return;
    }

    // Don't take screenshots when modal is open
    if (isAnyModalOpen) {
      console.log(
        `[RecHostPreview] ${stableHost.host_name}-${stableDevice?.device_id}: Screenshot skipped (modal open)`,
      );
      return;
    }

    if (!generateThumbnailUrl || !stableDevice) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Generate thumbnail URL directly with current timestamp
      const newThumbnailUrl = generateThumbnailUrl(stableHost, stableDevice);

      if (newThumbnailUrl) {
        // Add 1.5 second delay to ensure thumbnail is properly generated and available
        setTimeout(() => {
          // Simple algorithm: alternate between image1 and image2
          if (activeImage === 1) {
            setImage2Url(newThumbnailUrl); // Preload image2
          } else {
            setImage1Url(newThumbnailUrl); // Preload image1
          }
        }, 1500);
      } else {
        setError('Base URL not initialized');

        // If base URL is not available, try to initialize it again
        if (initializeBaseUrl) {
          setTimeout(async () => {
            const reInitialized = await initializeBaseUrl(stableHost, stableDevice);
            if (reInitialized) {
              // Try taking screenshot again after re-initialization
              setTimeout(() => handleTakeScreenshot(), 500);
            }
          }, 1000);
        }
      }
    } catch (err: any) {
      console.error(
        `[@component:RecHostPreview] Thumbnail generation error for ${stableHost.host_name}-${stableDevice.device_id}:`,
        err,
      );
      setError(err.message || 'Thumbnail generation failed');
    } finally {
      setIsLoading(false);
    }
  }, [
    stableHost,
    stableDevice,
    activeImage,
    generateThumbnailUrl,
    initializeBaseUrl,
    isAnyModalOpen,
    isVncDevice,
  ]);

  // Initialize base URL once, then auto-generate URLs (skip for VNC devices)
  useEffect(() => {
    // Skip screenshot polling for VNC devices
    if (isVncDevice) {
      return;
    }

    // Immediately return if any modal is open - no polling activity should occur
    if (isStreamModalOpen || isAnyModalOpen) {
      return;
    }

    if (!stableHost || !stableDevice || !initializeBaseUrl || !generateThumbnailUrl) return;

    let screenshotInterval: NodeJS.Timeout | null = null;
    let isMounted = true;

    const initializeAndStartUpdates = async () => {
      if (!isMounted) {
        return;
      }

      try {
        // Initialize base URL pattern (only called once)
        const initialized = await initializeBaseUrl(stableHost, stableDevice);

        if (!isMounted) {
          return;
        }

        if (initialized) {
          // Wait a moment for state to settle, then take initial screenshot
          setTimeout(() => {
            if (!isMounted) return;

            handleTakeScreenshot();

            // Set up interval for periodic screenshot URL updates (every 30 seconds)
            screenshotInterval = setInterval(() => {
              // Double-check modal state before taking screenshot
              if (isMounted && !isStreamModalOpen && !isAnyModalOpen) {
                handleTakeScreenshot();
              }
            }, 30000);
          }, 500);
        } else {
          if (isMounted) {
            setError('Failed to initialize base URL');
          }
        }
      } catch (error) {
        console.error(
          `[@component:RecHostPreview] Error during initialization for: ${stableHost.host_name}-${stableDevice.device_id}`,
          error,
        );
        if (isMounted) {
          setError('Initialization error');
        }
      }
    };

    initializeAndStartUpdates();

    // Cleanup function
    return () => {
      isMounted = false;
      if (screenshotInterval) {
        clearInterval(screenshotInterval);
        screenshotInterval = null;
      }
    };
  }, [
    stableHost,
    stableDevice,
    initializeBaseUrl,
    generateThumbnailUrl,
    handleTakeScreenshot,
    isStreamModalOpen,
    isAnyModalOpen,
    isVncDevice,
  ]);

  // Handle opening stream modal
  const handleOpenStreamModal = useCallback(() => {
    // Basic check if host is online
    if (stableHost.status !== 'online') {
      showError('Host is not online');
      return;
    }

    // Just open the modal - let it handle control logic
    setIsStreamModalOpen(true);
  }, [stableHost, showError]);

  // Handle closing stream modal
  const handleCloseStreamModal = useCallback(() => {
    setIsStreamModalOpen(false);
  }, []);

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

  // Clean display values - special handling for VNC devices
  const displayName = stableDevice
    ? stableDevice.device_model === 'host_vnc'
      ? stableHost.host_name // For VNC devices, show just the host name
      : `${stableDevice.device_name} - ${stableHost.host_name}`
    : stableHost.host_name;

  return (
    <Card
      sx={{
        height: 200,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        p: 0,
        backgroundColor: 'transparent',
        backgroundImage: 'none',
        boxShadow: 'none',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        '&:hover': {
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        },
        '& .MuiCard-root': {
          padding: 0,
        },
      }}
    >
      {/* Header */}
      {!hideHeader && (
        <Box
          sx={{
            px: 1,
            py: 0.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="subtitle2" noWrap sx={{ flex: 1, mr: 1 }}>
            {displayName}
          </Typography>
          <Chip
            label={stableHost.status}
            size="small"
            color={getStatusColor(stableHost.status) as any}
            sx={{ fontSize: '0.7rem', height: 20 }}
          />
        </Box>
      )}

      {/* Content area - VNC iframe or screenshot */}
      <Box sx={{ flex: 1, position: 'relative', minHeight: 0, overflow: 'hidden' }}>
        <Box
          sx={{
            height: '100%',
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: 'transparent',
          }}
        >
          {/* VNC devices: Show iframe preview */}
          {isVncDevice ? (
            vncStreamUrl ? (
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'black',
                  overflow: 'hidden',
                }}
              >
                <iframe
                  src={vncStreamUrl}
                  style={{
                    width: '400%',
                    height: '400%',
                    border: 'none',
                    backgroundColor: '#000',
                    pointerEvents: 'none',
                    transform: 'scale(0.25)',
                    transformOrigin: 'top left',
                  }}
                  title="VNC Desktop Preview"
                />
                {/* Click overlay to open full modal */}
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
                      backgroundColor: 'rgba(0, 0, 0, 0.1)',
                    },
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
                <CircularProgress size={24} />
                <Typography variant="caption" color="text.secondary">
                  Loading VNC stream...
                </Typography>
              </Box>
            )
          ) : (
            // Non-VNC devices: Show screenshot thumbnails with simple 2-image algorithm
            <>
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
              ) : image1Url || image2Url ? (
                <Box
                  sx={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'transparent',
                    overflow: 'hidden',
                  }}
                >
                  {/* Image 1 */}
                  {image1Url && (
                    <Box
                      component="img"
                      src={getImageUrl(image1Url)}
                      alt="Screenshot 1"
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: isMobile ? 'auto' : '100%',
                        height: isMobile ? '100%' : 'auto',
                        objectFit: 'cover',
                        objectPosition: 'top center',
                        opacity: activeImage === 1 ? 1 : 0,
                        cursor: 'pointer',
                      }}
                      draggable={false}
                      onLoad={() => handleImageLoad(1)}
                      onError={() => {
                        console.log(
                          `[RecHostPreview] Image 1 failed to load: ${image1Url} - keeping current image`,
                        );
                        // Do nothing - keep current active image
                      }}
                    />
                  )}

                  {/* Image 2 */}
                  {image2Url && (
                    <Box
                      component="img"
                      src={getImageUrl(image2Url)}
                      alt="Screenshot 2"
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: isMobile ? 'auto' : '100%',
                        height: isMobile ? '100%' : 'auto',
                        objectFit: 'cover',
                        objectPosition: 'top center',
                        opacity: activeImage === 2 ? 1 : 0,
                        cursor: 'pointer',
                      }}
                      draggable={false}
                      onLoad={() => handleImageLoad(2)}
                      onError={() => {
                        console.log(
                          `[RecHostPreview] Image 2 failed to load: ${image2Url} - keeping current image`,
                        );
                        // Do nothing - keep current active image
                      }}
                    />
                  )}

                  {/* Click overlay to open stream modal */}
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
            </>
          )}
        </Box>
      </Box>

      {/* Stream Modal */}
      <RecHostStreamModal
        host={stableHost}
        device={stableDevice}
        isOpen={isStreamModalOpen}
        onClose={handleCloseStreamModal}
      />
    </Card>
  );
};

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

  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [previousThumbnailUrl, setPreviousThumbnailUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStreamModalOpen, setIsStreamModalOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);

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

  // State to track if polling paused message has been logged
  const [hasLoggedPaused, setHasLoggedPaused] = useState(false);

  // Stabilize host and device objects to prevent infinite re-renders
  // Only recreate when the actual data changes, not the object reference
  const stableHost = useMemo(() => host, [host]);

  const stableDevice = useMemo(() => device, [device]);

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
  // Use processed URL directly from backend
  const getImageUrl = useCallback((screenshotPath: string) => screenshotPath || '', []);

  // Optimized approach - just generate URL with current timestamp (no server calls after init)
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
      // Generate thumbnail URL directly with current timestamp (no server call)
      const newThumbnailUrl = generateThumbnailUrl(stableHost, stableDevice);

      if (newThumbnailUrl) {
        // Add 1 second delay to ensure thumbnail is properly generated and available
        setTimeout(() => {
          // Smooth transition: store previous URL and set new one
          if (thumbnailUrl && thumbnailUrl !== newThumbnailUrl) {
            setPreviousThumbnailUrl(thumbnailUrl);
            setIsTransitioning(true);
          }
          setThumbnailUrl(newThumbnailUrl);
          setImageLoadError(false); // Reset error state when setting new URL
        }, 1000); // 1 second delay to ensure server has generated the thumbnail
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
    thumbnailUrl,
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
    let isMounted = true; // Track mount status to prevent race conditions

    const initializeAndStartUpdates = async () => {
      // Early return if component was unmounted during async operation
      if (!isMounted) {
        return;
      }

      try {
        // Initialize base URL pattern (only called once)
        const initialized = await initializeBaseUrl(stableHost, stableDevice);

        // Check if still mounted after async operation
        if (!isMounted) {
          return;
        }

        if (initialized) {
          // Wait a moment for state to settle, then take initial screenshot
          setTimeout(() => {
            if (!isMounted) return; // Check mount status before proceeding

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
      isMounted = false; // Mark as unmounted
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

  // Log modal state changes for debugging (only once per state change)
  useEffect(() => {
    if (isStreamModalOpen || isAnyModalOpen) {
      if (!hasLoggedPaused) {
        console.log(
          `[RecHostPreview] ${stableHost.host_name}-${stableDevice?.device_id}: Polling paused (modal open)`,
        );
        setHasLoggedPaused(true);
      }
    } else {
      setHasLoggedPaused(false); // Reset for next time modal opens
      if (hasLoggedPaused) {
        // Only log resume if we previously logged pause
        console.log(
          `[RecHostPreview] ${stableHost.host_name}-${stableDevice?.device_id}: Polling resumed`,
        );
      }
    }
  }, [
    isStreamModalOpen,
    isAnyModalOpen,
    stableHost.host_name,
    stableDevice?.device_id,
    hasLoggedPaused,
  ]);

  // Handle opening stream modal - control will be handled by the modal itself
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
        height: 200, // Revert back to fixed height
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        p: 0, // Remove all padding from Card
        backgroundColor: 'transparent', // Transparent background
        backgroundImage: 'none', // Remove any background image
        boxShadow: 'none', // Remove default shadow
        border: '1px solid rgba(255, 255, 255, 0.1)', // Subtle border for definition
        '&:hover': {
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.3)', // Darker shadow on hover
          border: '1px solid rgba(255, 255, 255, 0.2)', // Slightly more visible border on hover
        },
        '& .MuiCard-root': {
          padding: 0, // Ensure no default card padding
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
                    width: '400%', // Make iframe larger to contain full desktop
                    height: '400%', // Make iframe larger to contain full desktop
                    border: 'none',
                    backgroundColor: '#000',
                    pointerEvents: 'none', // Disable interaction in preview
                    transform: 'scale(0.25)', // Scale down to 25% to fit the preview
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
            // Non-VNC devices: Show screenshot thumbnails
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
              ) : thumbnailUrl ? (
                <Box
                  sx={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'transparent',
                    overflow: 'hidden',
                  }}
                >
                  {/* Previous image - keep visible if current fails */}
                  {previousThumbnailUrl && (isTransitioning || imageLoadError) && (
                    <Box
                      component="img"
                      src={getImageUrl(previousThumbnailUrl)}
                      alt="Previous screenshot"
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: isMobile ? 'auto' : '100%', // Mobile: auto width, Non-mobile: full width
                        height: isMobile ? '100%' : 'auto', // Mobile: full height, Non-mobile: auto height
                        objectFit: 'cover', // Fill entire container
                        objectPosition: 'top center', // Center horizontally, anchor to top
                        opacity: imageLoadError ? 1 : isTransitioning ? 0 : 1, // Stay visible if current image failed
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
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: isMobile ? 'auto' : '100%', // Mobile: auto width, Non-mobile: full width
                      height: isMobile ? '100%' : 'auto', // Mobile: full height, Non-mobile: auto height
                      objectFit: 'cover', // Fill entire container
                      objectPosition: 'top center', // Center horizontally, anchor to top
                      opacity: 1,
                      transition: 'opacity 300ms ease-in-out',
                      cursor: 'pointer',
                    }}
                    draggable={false}
                    onLoad={() => {
                      setImageLoadError(false); // Image loaded successfully
                      handleImageLoad();
                    }}
                    onError={(_e) => {
                      console.log(
                        `[RecHostPreview] ${host.host_name}-${device?.device_id}: Image not available: ${thumbnailUrl} - waiting for next capture`,
                      );
                      setImageLoadError(true); // Mark image as failed to load
                      // Don't reset transition state - keep previous image visible
                    }}
                    style={{
                      display: imageLoadError ? 'none' : 'block', // Hide broken images
                    }}
                  />

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

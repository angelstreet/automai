import { Error as ErrorIcon } from '@mui/icons-material';
import { Card, Typography, Box, Chip, CircularProgress } from '@mui/material';
import React, { useState, useCallback, useEffect, useMemo } from 'react';

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
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [previousThumbnailUrl, setPreviousThumbnailUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStreamModalOpen, setIsStreamModalOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Detect if this is a mobile device model for proper sizing
  const isMobile = useMemo(() => {
    return isMobileModel(device?.device_model);
  }, [device?.device_model]);

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
  // Use processed URL directly from backend
  const getImageUrl = useCallback((screenshotPath: string) => screenshotPath || '', []);

  // Optimized approach - just generate URL with current timestamp (no server calls after init)
  const handleTakeScreenshot = useCallback(async () => {
    if (!generateThumbnailUrl || !device) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Generate thumbnail URL directly with current timestamp (no server call)
      const newThumbnailUrl = generateThumbnailUrl(host, device);

      if (newThumbnailUrl) {
        // Add 1 second delay to ensure thumbnail is properly generated and available
        setTimeout(() => {
          // Smooth transition: store previous URL and set new one
          if (thumbnailUrl && thumbnailUrl !== newThumbnailUrl) {
            setPreviousThumbnailUrl(thumbnailUrl);
            setIsTransitioning(true);
          }
          setThumbnailUrl(newThumbnailUrl);
        }, 1000); // 1 second delay to ensure server has generated the thumbnail
      } else {
        setError('Base URL not initialized');

        // If base URL is not available, try to initialize it again
        if (initializeBaseUrl) {
          setTimeout(async () => {
            const reInitialized = await initializeBaseUrl(host, device);
            if (reInitialized) {
              // Try taking screenshot again after re-initialization
              setTimeout(() => handleTakeScreenshot(), 500);
            }
          }, 1000);
        }
      }
    } catch (err: any) {
      console.error(
        `[@component:RecHostPreview] Thumbnail generation error for ${host.host_name}-${device.device_id}:`,
        err,
      );
      setError(err.message || 'Thumbnail generation failed');
    } finally {
      setIsLoading(false);
    }
  }, [host, device, thumbnailUrl, generateThumbnailUrl, initializeBaseUrl]);

  // Initialize base URL once, then auto-generate URLs
  useEffect(() => {
    if (!host || !device || !initializeBaseUrl || !generateThumbnailUrl) return;

    let screenshotInterval: NodeJS.Timeout | null = null;
    let isMounted = true; // Track mount status to prevent race conditions

    const initializeAndStartUpdates = async () => {
      // Early return if component was unmounted during async operation
      if (!isMounted) {
        return;
      }

      try {
        // Initialize base URL pattern (only called once)
        const initialized = await initializeBaseUrl(host, device);

        // Check if still mounted after async operation
        if (!isMounted) {
          return;
        }

        if (initialized) {
          // Wait a moment for state to settle, then take initial screenshot
          setTimeout(() => {
            if (!isMounted) return; // Check mount status before proceeding

            handleTakeScreenshot();

            // Set up interval AFTER first screenshot is taken and base URL is confirmed to work
            setTimeout(() => {
              if (!isMounted) return; // Check mount status before starting interval

              screenshotInterval = setInterval(() => {
                // Stop polling when modal is open to avoid conflicts and unnecessary requests
                if (isMounted && host && device && host.status === 'online' && !isStreamModalOpen) {
                  handleTakeScreenshot();
                } else if (isStreamModalOpen) {
                  console.log(
                    `[RecHostPreview] ${host.host_name}-${device?.device_id}: Polling paused (modal open)`,
                  );
                }
              }, 5000); // 5 seconds for debugging
            }, 1500); // Wait 1.5 seconds after first screenshot before starting interval
          }, 500);
        } else {
          if (isMounted) {
            setError('Failed to initialize base URL');
          }
        }
      } catch (error) {
        console.error(
          `[@component:RecHostPreview] Error during initialization for: ${host.host_name}-${device.device_id}`,
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
    host,
    device,
    initializeBaseUrl,
    generateThumbnailUrl,
    handleTakeScreenshot,
    isStreamModalOpen,
  ]);

  // Log modal state changes for debugging
  useEffect(() => {
    console.log(
      `[RecHostPreview] ${host.host_name}-${device?.device_id}: Modal ${isStreamModalOpen ? 'opened' : 'closed'} - polling ${isStreamModalOpen ? 'paused' : 'resumed'}`,
    );
  }, [isStreamModalOpen, host.host_name, device?.device_id]);

  // Handle opening stream modal - control will be handled by the modal itself
  const handleOpenStreamModal = useCallback(() => {
    // Basic check if host is online
    if (host.status !== 'online') {
      showError('Host is not online');
      return;
    }

    // Just open the modal - let it handle control logic
    setIsStreamModalOpen(true);
  }, [host, showError]);

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

  // Clean display values
  const displayName = device ? `${device.device_name} - ${host.host_name}` : host.host_name;

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
            label={host.status}
            size="small"
            color={getStatusColor(host.status) as any}
            sx={{ fontSize: '0.7rem', height: 20 }}
          />
        </Box>
      )}

      {/* Screenshot area */}
      <Box sx={{ flex: 1, position: 'relative', minHeight: 0, overflow: 'hidden' }}>
        <Box
          sx={{
            height: '100%',
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
                    width: isMobile ? 'auto' : '100%', // Mobile: auto width, Non-mobile: full width
                    height: isMobile ? '100%' : 'auto', // Mobile: full height, Non-mobile: auto height
                    objectFit: 'cover', // Fill entire container
                    objectPosition: 'top center', // Center horizontally, anchor to top
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
                onLoad={handleImageLoad}
                onError={(_e) => {
                  console.error(
                    `[RecHostPreview] ${host.host_name}-${device?.device_id}: Failed to load image: ${thumbnailUrl}`,
                  );
                  // Retry with timestamp minus 1 second to handle timing issues
                  if (generateThumbnailUrl && device) {
                    // Generate a URL with timestamp 1 second earlier
                    const now = new Date(Date.now() - 1000); // 1 second ago
                    const timestamp =
                      now.getFullYear().toString() +
                      (now.getMonth() + 1).toString().padStart(2, '0') +
                      now.getDate().toString().padStart(2, '0') +
                      now.getHours().toString().padStart(2, '0') +
                      now.getMinutes().toString().padStart(2, '0') +
                      now.getSeconds().toString().padStart(2, '0');

                    // Get base pattern and create retry URL
                    const retryUrl = generateThumbnailUrl(host, device)?.replace(
                      /capture_\d{14}\.jpg$/,
                      `capture_${timestamp}.jpg`,
                    );

                    if (retryUrl && retryUrl !== thumbnailUrl) {
                      setThumbnailUrl(retryUrl);
                    } else {
                      // If retry fails, reset transition state
                      if (isTransitioning) {
                        setPreviousThumbnailUrl(null);
                        setIsTransitioning(false);
                      }
                    }
                  }
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
      </Box>

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

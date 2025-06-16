import { Box } from '@mui/material';
import React, { useCallback, useRef } from 'react';

interface StreamClickOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  deviceResolution: { width: number; height: number };
  deviceId?: string;
  onTap?: (x: number, y: number) => void;
  sx?: any;
  selectedHostDevice?: any; // Add host device prop for controller proxy access
  showOverlay?: boolean; // Make optional since StreamViewer handles conditional rendering
  isActive?: boolean; // Make optional since StreamViewer handles conditional rendering
}

export const StreamClickOverlay: React.FC<StreamClickOverlayProps> = ({
  videoRef,
  deviceResolution,
  sx = {},
  selectedHostDevice,
  showOverlay = true, // Default to true since StreamViewer handles conditional rendering
  isActive = true, // Default to true since StreamViewer handles conditional rendering
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isActive || !selectedHostDevice) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert screen coordinates to device coordinates if needed
    const deviceX = Math.round((x * (deviceResolution?.width || 1)) / rect.width);
    const deviceY = Math.round((y * (deviceResolution?.height || 1)) / rect.height);

    console.log(
      `[@component:StreamClickOverlay] Click at screen (${x}, ${y}) -> device (${deviceX}, ${deviceY})`,
    );

    try {
      // Use server route instead of remote controller proxy
      const response = await fetch(`/server/remote/tap-element`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: selectedHostDevice, // Send full host object instead of just host_name
          x: deviceX,
          y: deviceY,
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log(
          `[@component:StreamClickOverlay] Tap successful at device coordinates (${deviceX}, ${deviceY})`,
        );
      } else {
        console.error(`[@component:StreamClickOverlay] Tap failed:`, result.error);
      }
    } catch (error) {
      console.error('[@component:StreamClickOverlay] Error performing tap:', error);
    }
  };

  // Render overlay with appropriate styling
  const shouldRender = selectedHostDevice && (showOverlay || isActive);
  console.log('[@component:StreamClickOverlay] Rendering overlay:', shouldRender);
  console.log('[@component:StreamClickOverlay] Has host device:', !!selectedHostDevice);

  if (!shouldRender) {
    return null;
  }

  // Log when overlay is mounted
  React.useEffect(() => {
    console.log(
      '[@component:StreamClickOverlay] 🎯 Click overlay mounted and ready! Device resolution:',
      deviceResolution,
    );
    console.log('[@component:StreamClickOverlay] Video ref current:', !!videoRef.current);
    console.log('[@component:StreamClickOverlay] Overlay ref current:', !!overlayRef.current);
    return () => {
      console.log('[@component:StreamClickOverlay] Click overlay unmounted');
    };
  }, [deviceResolution, selectedHostDevice]);

  // Add mouse event logging for debugging
  const handleMouseMove = useCallback((_e: React.MouseEvent) => {
    // Only log occasionally to avoid spam
    if (Math.random() < 0.01) {
      // 1% chance
      console.log('[@component:StreamClickOverlay] Mouse move detected');
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    // Mouse enter - no logging needed to avoid console spam
  }, []);

  const handleMouseLeave = useCallback(() => {
    // Mouse leave - no logging needed to avoid console spam
  }, []);

  return (
    <Box
      ref={overlayRef}
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        cursor: 'crosshair',
        userSelect: 'none',
        pointerEvents: 'auto',
        zIndex: 1,
        // Invisible overlay - no borders or background
        '&:hover': {
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
        },
        ...sx,
      }}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* LED indicator moved to top-left */}
      <Box
        sx={{
          position: 'absolute',
          top: 4,
          left: 4,
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: '#00ff00',
          opacity: 0.6,
          pointerEvents: 'none',
          zIndex: 10,
          animation: 'breathe 2s ease-in-out infinite',
          '@keyframes breathe': {
            '0%, 100%': { opacity: 0.3 },
            '50%': { opacity: 0.8 },
          },
        }}
      />
    </Box>
  );
};

export default StreamClickOverlay;

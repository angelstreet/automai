import React, { useCallback, useRef, useState } from 'react';
import { Box } from '@mui/material';

interface StreamClickOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  deviceResolution: { width: number; height: number };
  deviceId?: string;
  onTap?: (x: number, y: number) => void;
  sx?: any;
  selectedHostDevice?: any; // Add host device prop for controller proxy access
}

export const StreamClickOverlay: React.FC<StreamClickOverlayProps> = ({
  videoRef,
  deviceResolution,
  deviceId,
  onTap,
  sx = {},
  selectedHostDevice
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [clickAnimation, setClickAnimation] = useState<{ x: number; y: number; id: number } | null>(null);

  const getVideoBounds = useCallback(() => {
    if (!videoRef.current || !overlayRef.current) {
      return null;
    }

    const video = videoRef.current;
    const overlay = overlayRef.current;
    
    const videoRect = video.getBoundingClientRect();
    const overlayRect = overlay.getBoundingClientRect();
    
    // Calculate the actual displayed video dimensions (accounting for object-fit)
    const videoAspectRatio = deviceResolution.width / deviceResolution.height;
    const containerAspectRatio = videoRect.width / videoRect.height;
    
    let displayedWidth, displayedHeight, offsetX, offsetY;
    
    if (videoAspectRatio > containerAspectRatio) {
      // Video is wider than container - limited by width
      displayedWidth = videoRect.width;
      displayedHeight = videoRect.width / videoAspectRatio;
      offsetX = 0;
      offsetY = (videoRect.height - displayedHeight) / 2;
    } else {
      // Video is taller than container - limited by height
      displayedWidth = videoRect.height * videoAspectRatio;
      displayedHeight = videoRect.height;
      offsetX = (videoRect.width - displayedWidth) / 2;
      offsetY = 0;
    }
    
    return {
      left: videoRect.left - overlayRect.left + offsetX,
      top: videoRect.top - overlayRect.top + offsetY,
      width: displayedWidth,
      height: displayedHeight,
      scaleX: deviceResolution.width / displayedWidth,
      scaleY: deviceResolution.height / displayedHeight
    };
  }, [videoRef, deviceResolution]);

  const sendTapCommand = useCallback(async (x: number, y: number) => {
    try {
      console.log(`[@component:StreamClickOverlay] Sending tap command: ${x}, ${y}`);
      
      // Use remote controller proxy if available
      if (selectedHostDevice?.controllerProxies?.remote) {
        console.log(`[@component:StreamClickOverlay] Using remote controller proxy to tap at coordinates: (${x}, ${y})`);
        const result = await selectedHostDevice.controllerProxies.remote.tap(x, y);
        
        if (result.success) {
          console.log(`[@component:StreamClickOverlay] ✅ Tap successful at (${x}, ${y})`);
        } else {
          console.error(`[@component:StreamClickOverlay] ❌ Tap failed: ${result.error}`);
        }
      } else {
        console.log(`[@component:StreamClickOverlay] No remote controller proxy available - tap coordinates logged only`);
      }
    } catch (error) {
      console.error(`[@component:StreamClickOverlay] ❌ Tap request failed:`, error);
    }
  }, [selectedHostDevice]);

  const showClickAnimation = useCallback((x: number, y: number) => {
    const animationId = Date.now();
    setClickAnimation({ x, y, id: animationId });
    
    // Remove animation after 500ms
    setTimeout(() => {
      setClickAnimation(prev => prev?.id === animationId ? null : prev);
    }, 500);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!videoRef.current) return;
    
    const bounds = getVideoBounds();
    if (!bounds) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if click is within video bounds
    if (x >= bounds.left && x <= bounds.left + bounds.width && 
        y >= bounds.top && y <= bounds.top + bounds.height) {
      
      // Convert to device coordinates
      const deviceX = Math.round((x - bounds.left) * bounds.scaleX);
      const deviceY = Math.round((y - bounds.top) * bounds.scaleY);
      
      console.log(`[@component:StreamClickOverlay] 🎯 Click at display (${Math.round(x - bounds.left)}, ${Math.round(y - bounds.top)}) -> device (${deviceX}, ${deviceY})`);
      
      // Show click animation at click position
      showClickAnimation(x, y);
      
      // Send tap command via controller proxy
      sendTapCommand(deviceX, deviceY);
      
      // Call optional callback
      if (onTap) {
        onTap(deviceX, deviceY);
      }
      
      e.preventDefault();
      e.stopPropagation();
    }
  }, [videoRef, getVideoBounds, sendTapCommand, onTap, showClickAnimation]);

  // Log when overlay is mounted
  React.useEffect(() => {
    console.log('[@component:StreamClickOverlay] 🎯 Click overlay mounted and ready! Device resolution:', deviceResolution);
    console.log('[@component:StreamClickOverlay] Video ref current:', !!videoRef.current);
    console.log('[@component:StreamClickOverlay] Overlay ref current:', !!overlayRef.current);
    console.log('[@component:StreamClickOverlay] Has remote controller proxy:', !!selectedHostDevice?.controllerProxies?.remote);
    return () => {
      console.log('[@component:StreamClickOverlay] Click overlay unmounted');
    };
  }, [deviceResolution, selectedHostDevice]);

  // Add mouse event logging for debugging
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Only log occasionally to avoid spam
    if (Math.random() < 0.01) { // 1% chance
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
        ...sx
      }}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Click animation - make it more visible */}
      {clickAnimation && (
        <Box
          sx={{
            position: 'absolute',
            left: clickAnimation.x - 20,
            top: clickAnimation.y - 20,
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: '3px solid #00ff00',
            backgroundColor: 'rgba(0, 255, 0, 0.3)',
            pointerEvents: 'none',
            zIndex: 10,
            animation: 'clickPulse 0.6s ease-out',
            '@keyframes clickPulse': {
              '0%': {
                transform: 'scale(0.3)',
                opacity: 1,
              },
              '100%': {
                transform: 'scale(2.5)',
                opacity: 0,
              },
            },
          }}
        />
      )}
      
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
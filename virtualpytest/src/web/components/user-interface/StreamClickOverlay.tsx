import React, { useCallback, useRef } from 'react';
import { Box } from '@mui/material';

interface StreamClickOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  deviceResolution: { width: number; height: number };
  deviceId?: string;
  onTap?: (x: number, y: number) => void;
  sx?: any;
}

export const StreamClickOverlay: React.FC<StreamClickOverlayProps> = ({
  videoRef,
  deviceResolution,
  deviceId,
  onTap,
  sx = {}
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);

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
      
      const response = await fetch('/api/virtualpytest/android-mobile/execute-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: 'tap_coordinates',
          x: x,
          y: y
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`[@component:StreamClickOverlay] Tap successful at (${x}, ${y})`);
      } else {
        console.error(`[@component:StreamClickOverlay] Tap failed: ${result.error}`);
      }
    } catch (error) {
      console.error(`[@component:StreamClickOverlay] Tap request failed:`, error);
    }
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
      
      console.log(`[@component:StreamClickOverlay] Click at display (${Math.round(x - bounds.left)}, ${Math.round(y - bounds.top)}) -> device (${deviceX}, ${deviceY})`);
      
      // Send ADB tap command
      sendTapCommand(deviceX, deviceY);
      
      // Call optional callback
      if (onTap) {
        onTap(deviceX, deviceY);
      }
      
      e.preventDefault();
      e.stopPropagation();
    }
  }, [videoRef, getVideoBounds, sendTapCommand, onTap]);

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
        zIndex: 5,
        ...sx
      }}
      onClick={handleClick}
    />
  );
};

export default StreamClickOverlay; 
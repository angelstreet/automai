import { Box, Typography } from '@mui/material';
import React, { useMemo, useRef } from 'react';

import { getStreamViewerLayout } from '../../../config/layoutConfig';
import { buildCaptureUrl } from '../../../utils/buildUrlUtils';

import { DragSelectionOverlay } from './DragSelectionOverlay';

interface DragArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ScreenshotCaptureProps {
  screenshotPath?: string;
  isCapturing?: boolean;
  isSaving?: boolean;
  resolutionInfo?: {
    device: { width: number; height: number } | null;
    capture: string | null;
    stream: string | null;
  };
  onImageLoad?: (
    ref: React.RefObject<HTMLImageElement>,
    dimensions: { width: number; height: number },
    sourcePath: string,
  ) => void;
  selectedArea?: DragArea | null;
  onAreaSelected?: (area: DragArea) => void;
  model?: string;
  sx?: any;
  selectedHost?: any;
}

export function ScreenshotCapture({
  screenshotPath,
  isCapturing,
  onImageLoad,
  selectedArea,
  onAreaSelected,
  model,
  sx = {},
}: ScreenshotCaptureProps) {
  const imageRef = useRef<HTMLImageElement>(null);

  // Get layout configuration based on model
  const layoutConfig = getStreamViewerLayout(model);

  // Handle image load to pass ref and dimensions to parent
  const handleImageLoad = () => {
    if (imageRef.current && onImageLoad && screenshotPath) {
      const img = imageRef.current;
      const dimensions = {
        width: img.naturalWidth,
        height: img.naturalHeight,
      };
      onImageLoad(imageRef, dimensions, screenshotPath);
    }
  };

  // Get image URL with conditional HTTP to HTTPS proxy
  const imageUrl = useMemo(() => {
    if (!screenshotPath) return '';

    console.log(`[@component:ScreenshotCapture] Processing screenshot path: ${screenshotPath}`);

    // Handle data URLs (base64 from remote system) - return as is
    if (screenshotPath.startsWith('data:')) {
      console.log('[@component:ScreenshotCapture] Using data URL from remote system');
      return screenshotPath;
    }

    // Handle HTTPS URLs - return as is (no proxy needed)
    if (screenshotPath.startsWith('https:')) {
      console.log('[@component:ScreenshotCapture] Using HTTPS URL directly');
      return screenshotPath;
    }

    // Handle HTTP URLs - use proxy to convert to HTTPS
    if (screenshotPath.startsWith('http:')) {
      console.log('[@component:ScreenshotCapture] HTTP URL detected, using proxy');
      const proxyUrl = `/server/av/proxy-image?url=${encodeURIComponent(screenshotPath)}`;
      console.log(`[@component:ScreenshotCapture] Generated proxy URL: ${proxyUrl}`);
      return proxyUrl;
    }

    // For relative paths or other formats, use directly (assuming they are accessible)
    console.log('[@component:ScreenshotCapture] Using path directly');
    return screenshotPath;
  }, [screenshotPath]);

  // Determine if drag selection should be enabled
  const allowDragSelection =
    screenshotPath && imageUrl && !isCapturing && onAreaSelected && imageRef.current;

  return (
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
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        ...sx,
      }}
    >
      {/* Drag Selection Overlay - positioned over the entire content area */}
      {allowDragSelection && (
        <DragSelectionOverlay
          imageRef={imageRef}
          onAreaSelected={onAreaSelected}
          selectedArea={selectedArea || null}
          sx={{ zIndex: 10 }}
        />
      )}

      {/* Screenshot display - only shown when not capturing */}
      {screenshotPath && imageUrl && !isCapturing && (
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Screenshot"
          style={{
            maxWidth: layoutConfig.isMobileModel ? 'auto' : '100%',
            maxHeight: '100%',
            width: layoutConfig.isMobileModel ? 'auto' : '100%',
            height: 'auto',
            objectFit: layoutConfig.objectFit,
            backgroundColor: 'transparent',
          }}
          draggable={false}
          onLoad={handleImageLoad}
          onError={(e) => {
            const imgSrc = (e.target as HTMLImageElement).src;
            console.error(`[@component:ScreenshotCapture] Failed to load image: ${imgSrc}`);

            // Set a transparent fallback image
            (e.target as HTMLImageElement).src =
              'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

            // Add placeholder styling
            const img = e.target as HTMLImageElement;
            img.style.backgroundColor = 'transparent';
            img.style.border = '1px solid #E0E0E0';
            img.style.maxWidth = '100%';
            img.style.maxHeight = '100%';
            img.style.width = 'auto';
            img.style.height = 'auto';
            img.style.objectFit = 'contain';
            img.style.padding = '4px';
          }}
        />
      )}

      {/* Placeholder when no screenshot and not capturing */}
      {!screenshotPath && !isCapturing && (
        <Box
          sx={{
            width: '100%',
            height: '100%',
            minHeight: '400px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
            border: '1px solid #333333',
            p: 0.5,
          }}
        >
          <Typography variant="caption" sx={{ color: '#666666' }}>
            No Screenshot Available
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default ScreenshotCapture;

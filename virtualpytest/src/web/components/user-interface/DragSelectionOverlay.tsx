import React, { useState, useCallback, useRef } from 'react';
import { Box, Typography } from '@mui/material';

interface DragArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DragSelectionOverlayProps {
  imageRef: React.RefObject<HTMLImageElement>;
  onAreaSelected: (area: DragArea) => void;
  selectedArea: DragArea | null;
  sx?: any;
}

export const DragSelectionOverlay: React.FC<DragSelectionOverlayProps> = ({
  imageRef,
  onAreaSelected,
  selectedArea,
  sx = {}
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDrag, setCurrentDrag] = useState<DragArea | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Debug logs
  console.log('[@component:DragSelectionOverlay] Rendered with props:', {
    hasImageRef: !!imageRef,
    imageRefCurrent: !!imageRef?.current,
    selectedArea,
    isDragging
  });

  const getImageBounds = useCallback(() => {
    if (!imageRef.current || !overlayRef.current) {
      console.log('[@component:DragSelectionOverlay] getImageBounds: missing refs', {
        imageRef: !!imageRef.current,
        overlayRef: !!overlayRef.current
      });
      return null;
    }
    
    const imageRect = imageRef.current.getBoundingClientRect();
    const overlayRect = overlayRef.current.getBoundingClientRect();
    
    const bounds = {
      left: imageRect.left - overlayRect.left,
      top: imageRect.top - overlayRect.top,
      width: imageRect.width,
      height: imageRect.height
    };

    console.log('[@component:DragSelectionOverlay] getImageBounds:', bounds);
    return bounds;
  }, [imageRef]);

  const getRelativeCoordinates = useCallback((clientX: number, clientY: number) => {
    if (!overlayRef.current) return { x: 0, y: 0 };
    
    const overlayRect = overlayRef.current.getBoundingClientRect();
    const imageBounds = getImageBounds();
    if (!imageBounds) return { x: 0, y: 0 };

    let x = clientX - overlayRect.left - imageBounds.left;
    let y = clientY - overlayRect.top - imageBounds.top;

    // Constrain to image bounds
    x = Math.max(0, Math.min(x, imageBounds.width));
    y = Math.max(0, Math.min(y, imageBounds.height));

    return { x, y };
  }, [getImageBounds]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    console.log('[@component:DragSelectionOverlay] handleMouseDown called');
    
    const imageBounds = getImageBounds();
    if (!imageBounds) {
      console.log('[@component:DragSelectionOverlay] handleMouseDown: no image bounds');
      return;
    }

    const coords = getRelativeCoordinates(e.clientX, e.clientY);
    console.log('[@component:DragSelectionOverlay] Starting drag at:', coords);
    
    setDragStart(coords);
    setIsDragging(true);
    setCurrentDrag({ x: coords.x, y: coords.y, width: 0, height: 0 });
  }, [getImageBounds, getRelativeCoordinates]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragStart) return;

    const coords = getRelativeCoordinates(e.clientX, e.clientY);
    
    const newArea: DragArea = {
      x: Math.min(dragStart.x, coords.x),
      y: Math.min(dragStart.y, coords.y),
      width: Math.abs(coords.x - dragStart.x),
      height: Math.abs(coords.y - dragStart.y)
    };

    setCurrentDrag(newArea);
  }, [isDragging, dragStart, getRelativeCoordinates]);

  const handleMouseUp = useCallback(() => {
    if (!currentDrag || !isDragging) return;

    console.log('[@component:DragSelectionOverlay] handleMouseUp:', currentDrag);

    // Check minimum size (10x10px)
    if (currentDrag.width >= 10 && currentDrag.height >= 10) {
      console.log('[@component:DragSelectionOverlay] Area selected:', currentDrag);
      onAreaSelected(currentDrag);
    } else {
      console.log('[@component:DragSelectionOverlay] Area too small, minimum 10x10px');
    }

    setIsDragging(false);
    setDragStart(null);
    setCurrentDrag(null);
  }, [currentDrag, isDragging, onAreaSelected]);

  const displayArea = currentDrag || selectedArea;
  const imageBounds = getImageBounds();

  console.log('[@component:DragSelectionOverlay] Render state:', {
    displayArea,
    imageBounds,
    isDragging,
    hasOverlayRef: !!overlayRef.current
  });

  return (
    <Box
      ref={overlayRef}
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        cursor: isDragging ? 'crosshair' : 'crosshair',
        userSelect: 'none',
        pointerEvents: 'all',
        backgroundColor: 'rgba(255, 0, 0, 0.1)', // Debug: add slight red tint to see overlay
        border: '1px solid red', // Debug: border to see overlay bounds
        ...sx
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Selection Rectangle */}
      {displayArea && imageBounds && (
        <Box
          sx={{
            position: 'absolute',
            left: imageBounds.left + displayArea.x,
            top: imageBounds.top + displayArea.y,
            width: displayArea.width,
            height: displayArea.height,
            border: '2px solid white',
            pointerEvents: 'none',
            boxSizing: 'border-box'
          }}
        />
      )}

      {/* Coordinates Display */}
      {displayArea && imageBounds && !isDragging && (
        <Box
          sx={{
            position: 'absolute',
            left: imageBounds.left + displayArea.x,
            top: imageBounds.top + displayArea.y - 25,
            backgroundColor: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '2px 6px',
            fontSize: '0.7rem',
            borderRadius: '2px',
            pointerEvents: 'none'
          }}
        >
          <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
            x: {Math.round(displayArea.x)}, y: {Math.round(displayArea.y)}, w: {Math.round(displayArea.width)}, h: {Math.round(displayArea.height)}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default DragSelectionOverlay; 
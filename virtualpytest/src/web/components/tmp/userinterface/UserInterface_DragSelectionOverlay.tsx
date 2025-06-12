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
  const [isHoveringImage, setIsHoveringImage] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const getImageBounds = useCallback(() => {
    if (!imageRef.current || !overlayRef.current) {
      return null;
    }

    const image = imageRef.current;
    const overlay = overlayRef.current;
    
    const imageRect = image.getBoundingClientRect();
    const overlayRect = overlay.getBoundingClientRect();
    
    // Calculate the actual displayed image dimensions (accounting for object-fit: contain)
    const imageAspectRatio = image.naturalWidth / image.naturalHeight;
    const containerAspectRatio = imageRect.width / imageRect.height;
    
    let displayedWidth, displayedHeight, offsetX, offsetY;
    
    if (imageAspectRatio > containerAspectRatio) {
      // Image is wider than container - limited by width
      displayedWidth = imageRect.width;
      displayedHeight = imageRect.width / imageAspectRatio;
      offsetX = 0;
      offsetY = (imageRect.height - displayedHeight) / 2;
    } else {
      // Image is taller than container - limited by height
      displayedWidth = imageRect.height * imageAspectRatio;
      displayedHeight = imageRect.height;
      offsetX = (imageRect.width - displayedWidth) / 2;
      offsetY = 0;
    }
    
    return {
      left: imageRect.left - overlayRect.left + offsetX,
      top: imageRect.top - overlayRect.top + offsetY,
      width: displayedWidth,
      height: displayedHeight,
      scaleX: image.naturalWidth / displayedWidth,
      scaleY: image.naturalHeight / displayedHeight
    };
  }, [imageRef]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!imageRef.current) return;
    
    const bounds = getImageBounds();
    if (!bounds) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if click is within image bounds
    if (x >= bounds.left && x <= bounds.left + bounds.width && 
        y >= bounds.top && y <= bounds.top + bounds.height) {
      
      setIsDragging(true);
      setDragStart({ x, y });
      setCurrentDrag(null);
      e.preventDefault();
      e.stopPropagation();
    }
  }, [imageRef, getImageBounds]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!imageRef.current) return;
    
    const bounds = getImageBounds();
    if (!bounds) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if hovering over image area
    const isOverImage = x >= bounds.left && x <= bounds.left + bounds.width && 
                       y >= bounds.top && y <= bounds.top + bounds.height;
    setIsHoveringImage(isOverImage);
    
    // Handle dragging logic only if currently dragging
    if (!isDragging || !dragStart) return;
    
    // Constrain mouse to image bounds during drag
    const constrainedX = Math.max(bounds.left, Math.min(bounds.left + bounds.width, x));
    const constrainedY = Math.max(bounds.top, Math.min(bounds.top + bounds.height, y));
    
    const startX = Math.max(bounds.left, Math.min(bounds.left + bounds.width, dragStart.x));
    const startY = Math.max(bounds.top, Math.min(bounds.top + bounds.height, dragStart.y));
    
    const left = Math.min(startX, constrainedX) - bounds.left;
    const top = Math.min(startY, constrainedY) - bounds.top;
    const width = Math.abs(constrainedX - startX);
    const height = Math.abs(constrainedY - startY);
    
    // Minimum size constraint
    if (width >= 10 && height >= 10) {
      setCurrentDrag({ x: left, y: top, width, height });
    }
  }, [isDragging, dragStart, imageRef, getImageBounds]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging || !currentDrag || !imageRef.current) {
      setIsDragging(false);
      setDragStart(null);
      setCurrentDrag(null);
      return;
    }
    
    const bounds = getImageBounds();
    if (!bounds || !onAreaSelected) {
      setIsDragging(false);
      setDragStart(null);
      setCurrentDrag(null);
      return;
    }
    
    // Convert to original image coordinates
    const originalArea = {
      x: currentDrag.x * bounds.scaleX,
      y: currentDrag.y * bounds.scaleY,
      width: currentDrag.width * bounds.scaleX,
      height: currentDrag.height * bounds.scaleY
    };
    
    onAreaSelected(originalArea);
    setIsDragging(false);
    setDragStart(null);
    setCurrentDrag(null);
  }, [isDragging, currentDrag, imageRef, getImageBounds, onAreaSelected]);

  const displayArea = currentDrag || (selectedArea && getImageBounds() ? {
    x: selectedArea.x / getImageBounds()!.scaleX,
    y: selectedArea.y / getImageBounds()!.scaleY,
    width: selectedArea.width / getImageBounds()!.scaleX,
    height: selectedArea.height / getImageBounds()!.scaleY
  } : null);

  return (
    <Box
      ref={overlayRef}
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        cursor: isDragging ? 'crosshair' : (isHoveringImage ? 'crosshair' : 'default'),
        userSelect: 'none',
        pointerEvents: 'auto', // Always allow pointer events
        zIndex: 5,
        ...sx
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Selection rectangle */}
      {displayArea && getImageBounds() && (
        <Box
          sx={{
            position: 'absolute',
            left: getImageBounds()!.left + displayArea.x,
            top: getImageBounds()!.top + displayArea.y,
            width: displayArea.width,
            height: displayArea.height,
            border: '2px solid white',
            backgroundColor: 'transparent',
            pointerEvents: 'none',
            boxSizing: 'border-box',
            zIndex: 2
          }}
        />
      )}
      
      {/* Coordinates display */}
      {displayArea && getImageBounds() && (
        <Box
          sx={{
            position: 'absolute',
            left: getImageBounds()!.left + displayArea.x,
            top: getImageBounds()!.top + displayArea.y - 25,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '0.7rem',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            zIndex: 2
          }}
        >
          {selectedArea ? 
            `x: ${Math.round(selectedArea.x)}, y: ${Math.round(selectedArea.y)}, w: ${Math.round(selectedArea.width)}, h: ${Math.round(selectedArea.height)}` :
            'Drag to select area'
          }
        </Box>
      )}
    </Box>
  );
};

export default DragSelectionOverlay; 
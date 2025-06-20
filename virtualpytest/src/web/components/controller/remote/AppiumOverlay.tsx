import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Box, Tooltip, Paper, Typography, Chip } from '@mui/material';
import { AppiumElement } from '../../../types/controller/Remote_Types';

interface AppiumOverlayProps {
  elements: AppiumElement[];
  onElementClick: (element: AppiumElement) => void;
  selectedElementId?: string;
  highlightColors?: string[];
  maxElements?: number;
}

export const AppiumOverlay: React.FC<AppiumOverlayProps> = ({
  elements,
  onElementClick,
  selectedElementId,
  highlightColors = ['#FF0000', '#0066FF', '#FFD700', '#00CC00', '#9900FF'],
  maxElements = 100,
}) => {
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  console.log(`[@component:AppiumOverlay] Rendering overlay with ${elements.length} elements`);

  // Limit elements to prevent performance issues
  const displayElements = elements.slice(0, maxElements);

  // Get color for element based on its index
  const getElementColor = (index: number) => {
    return highlightColors[index % highlightColors.length];
  };

  // Handle element click
  const handleElementClick = useCallback(
    (element: AppiumElement, event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      console.log(`[@component:AppiumOverlay] Element clicked:`, {
        id: element.id,
        text: element.text,
        className: element.className,
        platform: element.platform,
      });

      onElementClick(element);
    },
    [onElementClick],
  );

  // Handle element hover
  const handleElementHover = useCallback((elementId: string | null) => {
    setHoveredElement(elementId);
  }, []);

  // Calculate element styles based on bounds
  const getElementStyle = (element: AppiumElement, index: number) => {
    const { bounds } = element;
    const color = getElementColor(index);
    const isSelected = selectedElementId === element.id;
    const isHovered = hoveredElement === element.id;

    return {
      position: 'absolute' as const,
      left: bounds.left,
      top: bounds.top,
      width: bounds.right - bounds.left,
      height: bounds.bottom - bounds.top,
      border: `2px solid ${color}`,
      backgroundColor: isSelected ? `${color}40` : isHovered ? `${color}20` : `${color}10`,
      cursor: element.clickable ? 'pointer' : 'default',
      zIndex: isSelected ? 1002 : isHovered ? 1001 : 1000,
      borderRadius: '2px',
      transition: 'all 0.2s ease-in-out',
      opacity: isSelected ? 0.9 : isHovered ? 0.7 : 0.5,
      boxShadow: isSelected ? `0 0 8px ${color}` : isHovered ? `0 0 4px ${color}` : 'none',
    };
  };

  // Get tooltip content for element
  const getTooltipContent = (element: AppiumElement) => {
    const parts = [];

    if (element.text) {
      parts.push(`Text: "${element.text}"`);
    }

    if (element.className) {
      parts.push(`Class: ${element.className}`);
    }

    if (element.platform === 'android' && element.resource_id) {
      parts.push(`ID: ${element.resource_id}`);
    }

    if (element.platform === 'ios' && element.accessibility_id) {
      parts.push(`Accessibility ID: ${element.accessibility_id}`);
    }

    if (element.contentDesc) {
      parts.push(`Description: ${element.contentDesc}`);
    }

    parts.push(`Platform: ${element.platform}`);
    parts.push(`Clickable: ${element.clickable ? 'Yes' : 'No'}`);
    parts.push(
      `Bounds: (${element.bounds.left}, ${element.bounds.top}) - (${element.bounds.right}, ${element.bounds.bottom})`,
    );

    return parts.join('\n');
  };

  // Filter out elements with invalid bounds
  const validElements = displayElements.filter((element) => {
    const { bounds } = element;
    return bounds.right > bounds.left && bounds.bottom > bounds.top;
  });

  console.log(
    `[@component:AppiumOverlay] Displaying ${validElements.length} valid elements out of ${displayElements.length}`,
  );

  return (
    <Box
      ref={overlayRef}
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'auto',
        zIndex: 999,
      }}
    >
      {/* Element overlays */}
      {validElements.map((element, index) => (
        <Tooltip
          key={element.id}
          title={
            <Box>
              <Typography variant="body2" component="div" sx={{ whiteSpace: 'pre-line' }}>
                {getTooltipContent(element)}
              </Typography>
            </Box>
          }
          arrow
          placement="top"
        >
          <Box
            style={getElementStyle(element, index)}
            onClick={(e) => handleElementClick(element, e)}
            onMouseEnter={() => handleElementHover(element.id)}
            onMouseLeave={() => handleElementHover(null)}
          >
            {/* Element label for identification */}
            {(hoveredElement === element.id || selectedElementId === element.id) && (
              <Box
                sx={{
                  position: 'absolute',
                  top: -24,
                  left: 0,
                  zIndex: 1003,
                }}
              >
                <Chip
                  label={`#${element.id}`}
                  size="small"
                  sx={{
                    backgroundColor: getElementColor(index),
                    color: 'white',
                    fontSize: '10px',
                    height: '20px',
                  }}
                />
              </Box>
            )}

            {/* Platform indicator */}
            {element.platform &&
              (hoveredElement === element.id || selectedElementId === element.id) && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: -24,
                    right: 0,
                    zIndex: 1003,
                  }}
                >
                  <Chip
                    label={element.platform.toUpperCase()}
                    size="small"
                    variant="outlined"
                    sx={{
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      fontSize: '8px',
                      height: '18px',
                    }}
                  />
                </Box>
              )}
          </Box>
        </Tooltip>
      ))}

      {/* Overlay info panel */}
      <Paper
        elevation={3}
        sx={{
          position: 'fixed',
          top: 16,
          right: 16,
          p: 2,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(4px)',
          zIndex: 1004,
          maxWidth: '300px',
        }}
      >
        <Typography variant="subtitle2" gutterBottom>
          Appium Element Overlay
        </Typography>
        <Typography variant="body2" color="textSecondary">
          {validElements.length} elements displayed
        </Typography>
        {maxElements < elements.length && (
          <Typography variant="caption" color="warning.main" display="block">
            Showing first {maxElements} of {elements.length} elements
          </Typography>
        )}
        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
          • Hover for details • Click to interact • Colors distinguish elements
        </Typography>
        {selectedElementId && (
          <Box sx={{ mt: 1 }}>
            <Chip label={`Selected: #${selectedElementId}`} size="small" color="primary" />
          </Box>
        )}
      </Paper>
    </Box>
  );
};

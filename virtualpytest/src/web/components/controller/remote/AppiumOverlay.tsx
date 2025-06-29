import React, { useEffect, useState } from 'react';

import { PanelInfo } from '../../../types/controller/Panel_Types';
import { AppiumElement } from '../../../types/controller/Remote_Types';

interface ScaledElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  label: string;
}

interface AppiumOverlayProps {
  elements: AppiumElement[];
  deviceWidth: number;
  deviceHeight: number;
  isVisible: boolean;
  onElementClick?: (element: AppiumElement) => void;
  panelInfo: PanelInfo; // Made required - no fallback to screenshot
  host: any; // Add host for direct server calls
}

// Same colors as the original UIElementsOverlay
const COLORS = ['#FF0000', '#0066FF', '#FFD700', '#00CC00', '#9900FF'];

export const AppiumOverlay = React.memo(function AppiumOverlay({
  elements,
  deviceWidth,
  deviceHeight,
  isVisible,
  onElementClick,
  panelInfo,
  host,
}: AppiumOverlayProps) {
  console.log(
    `[@component:AppiumOverlay] Component called with: elements=${elements.length}, isVisible=${isVisible}, deviceSize=${deviceWidth}x${deviceHeight}`,
  );
  console.log(`[@component:AppiumOverlay] PanelInfo:`, panelInfo);

  const [scaledElements, setScaledElements] = useState<ScaledElement[]>([]);
  const [clickAnimation, setClickAnimation] = useState<{
    x: number;
    y: number;
    id: string;
  } | null>(null);

  // Add CSS animation keyframes to document head if not already present
  React.useEffect(() => {
    const styleId = 'click-animation-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
          @keyframes clickPulse {
            0% {
              transform: scale(0.3);
              opacity: 1;
            }
            100% {
              transform: scale(1.5);
              opacity: 0;
            }
          }
        `;
      document.head.appendChild(style);
    }
  }, []);

  const parseBounds = (bounds: { left: number; top: number; right: number; bottom: number }) => {
    // Validate input bounds
    if (
      typeof bounds.left !== 'number' ||
      typeof bounds.top !== 'number' ||
      typeof bounds.right !== 'number' ||
      typeof bounds.bottom !== 'number' ||
      isNaN(bounds.left) ||
      isNaN(bounds.top) ||
      isNaN(bounds.right) ||
      isNaN(bounds.bottom)
    ) {
      console.warn(`[@component:AppiumOverlay] Invalid bounds object:`, bounds);
      return null;
    }

    const width = bounds.right - bounds.left;
    const height = bounds.bottom - bounds.top;

    // Ensure positive dimensions
    if (width <= 0 || height <= 0) {
      console.warn(`[@component:AppiumOverlay] Invalid dimensions: ${width}x${height}`);
      return null;
    }

    return {
      x: bounds.left,
      y: bounds.top,
      width: width,
      height: height,
    };
  };

  // Calculate actual content width and horizontal offset (mobile case - height is reference)
  const { actualContentWidth, horizontalOffset } = React.useMemo(() => {
    if (!panelInfo || !panelInfo.deviceResolution || !panelInfo.size) {
      return { actualContentWidth: 0, horizontalOffset: 0 };
    }

    // For iOS mobile: height is reference, calculate width based on device aspect ratio
    const deviceAspectRatio = deviceWidth / deviceHeight;
    const actualWidth = panelInfo.size.height * deviceAspectRatio;
    const hOffset = (panelInfo.size.width - actualWidth) / 2;

    console.log(`[@component:AppiumOverlay] Content width calculated:`, {
      deviceAspectRatio,
      panelHeight: panelInfo.size.height,
      actualWidth,
      hOffset,
    });

    return {
      actualContentWidth: actualWidth,
      horizontalOffset: hOffset,
    };
  }, [panelInfo, deviceWidth, deviceHeight]);

  // Direct server tap function - bypasses useRemoteConfigs double conversion
  const handleDirectTap = async (deviceX: number, deviceY: number) => {
    try {
      console.log(
        `[@component:AppiumOverlay] Direct tap at device coordinates (${deviceX}, ${deviceY})`,
      );

      const response = await fetch('/server/remote/tapCoordinates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: host,
          x: deviceX,
          y: deviceY,
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log(`[@component:AppiumOverlay] Direct tap executed successfully`);
      } else {
        console.error(`[@component:AppiumOverlay] Direct tap failed:`, result.error);
      }
    } catch (error) {
      console.error(`[@component:AppiumOverlay] Direct tap error:`, error);
    }
  };

  // Calculate scaled coordinates for panel positioning
  useEffect(() => {
    if (elements.length === 0) {
      console.log(`[@component:AppiumOverlay] No elements, clearing overlay elements`);
      setScaledElements([]);
      return;
    }

    // Skip calculation if panelInfo is not properly defined
    if (!panelInfo || !panelInfo.deviceResolution || !panelInfo.size) {
      console.log(`[@component:AppiumOverlay] Invalid panelInfo, skipping element scaling`);
      setScaledElements([]);
      return;
    }

    console.log(`[@component:AppiumOverlay] Processing ${elements.length} elements for overlay`);
    console.log(`[@component:AppiumOverlay] Panel position:`, panelInfo.position);
    console.log(`[@component:AppiumOverlay] Panel size:`, panelInfo.size);
    console.log(`[@component:AppiumOverlay] Device resolution:`, panelInfo.deviceResolution);

    const scaled = elements
      .map((element, index) => {
        const bounds = parseBounds(element.bounds);
        if (!bounds) {
          console.warn(
            `[@component:AppiumOverlay] Skipping element ${index + 1} due to invalid bounds`,
          );
          return null;
        }

        const getElementLabel = (el: AppiumElement) => {
          // Priority for iOS: Text → Accessibility ID → Class Name
          if (el.text && el.text !== '<no text>' && el.text.trim() !== '') {
            return `"${el.text}"`;
          } else if (
            el.accessibility_id &&
            el.accessibility_id !== '<no accessibility-id>' &&
            el.accessibility_id.trim() !== ''
          ) {
            return el.accessibility_id;
          } else {
            return el.className?.split('.').pop() || 'Unknown';
          }
        };

        // Scale from device coordinates to panel coordinates
        const scaleX = actualContentWidth / deviceWidth;
        const scaleY = panelInfo.size.height / deviceHeight;

        const scaledX = bounds.x * scaleX + panelInfo.position.x + horizontalOffset;
        const scaledY = bounds.y * scaleY + panelInfo.position.y;
        const scaledWidth = bounds.width * scaleX;
        const scaledHeight = bounds.height * scaleY;

        const color = COLORS[index % COLORS.length];
        const label = getElementLabel(element);

        // Debug logging for first few elements
        if (index < 3) {
          console.log(`[@component:AppiumOverlay] Element ${index + 1} scaling debug:`, {
            original: bounds,
            scaleFactors: { scaleX, scaleY },
            panelOffset: { x: panelInfo.position.x, y: panelInfo.position.y },
            horizontalOffset,
            scaled: { x: scaledX, y: scaledY, width: scaledWidth, height: scaledHeight },
            label,
          });
        }

        return {
          id: element.id,
          x: scaledX,
          y: scaledY,
          width: scaledWidth,
          height: scaledHeight,
          color,
          label,
        };
      })
      .filter((item): item is ScaledElement => item !== null);

    console.log(`[@component:AppiumOverlay] Scaled ${scaled.length} elements for display`);
    setScaledElements(scaled);
  }, [elements, panelInfo, deviceWidth, deviceHeight, actualContentWidth, horizontalOffset]);

  // Handle element click with animation and callback
  const handleElementClick = async (scaledElement: ScaledElement, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    console.log(`[@component:AppiumOverlay] Element clicked:`, {
      id: scaledElement.id,
      label: scaledElement.label,
      scaledPosition: { x: scaledElement.x, y: scaledElement.y },
    });

    // Find the original element
    const originalElement = elements.find((el) => el.id === scaledElement.id);
    if (!originalElement) {
      console.error(
        `[@component:AppiumOverlay] Original element not found for ID: ${scaledElement.id}`,
      );
      return;
    }

    // Show click animation
    setClickAnimation({
      x: scaledElement.x + scaledElement.width / 2,
      y: scaledElement.y + scaledElement.height / 2,
      id: scaledElement.id,
    });

    // Clear animation after duration
    setTimeout(() => setClickAnimation(null), 500);

    // Calculate device coordinates for direct tap
    const scaleX = actualContentWidth / deviceWidth;
    const scaleY = panelInfo.size.height / deviceHeight;

    const deviceX =
      (scaledElement.x - panelInfo.position.x - horizontalOffset) / scaleX +
      scaledElement.width / scaleX / 2;
    const deviceY =
      (scaledElement.y - panelInfo.position.y) / scaleY + scaledElement.height / scaleY / 2;

    console.log(`[@component:AppiumOverlay] Calculated device coordinates for tap:`, {
      deviceX: Math.round(deviceX),
      deviceY: Math.round(deviceY),
    });

    // Execute direct tap
    await handleDirectTap(Math.round(deviceX), Math.round(deviceY));

    // Call the callback if provided
    if (onElementClick) {
      onElementClick(originalElement);
    }
  };

  // Handle base tap (clicking on empty space)
  const handleBaseTap = async (event: React.MouseEvent) => {
    // Only handle clicks on the base layer (not on elements)
    if (event.target !== event.currentTarget) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    console.log(`[@component:AppiumOverlay] Base tap at panel coordinates (${clickX}, ${clickY})`);

    // Convert panel coordinates to device coordinates
    const scaleX = actualContentWidth / deviceWidth;
    const scaleY = panelInfo.size.height / deviceHeight;

    const deviceX = (clickX - panelInfo.position.x - horizontalOffset) / scaleX;
    const deviceY = (clickY - panelInfo.position.y) / scaleY;

    // Validate coordinates are within device bounds
    if (deviceX < 0 || deviceX > deviceWidth || deviceY < 0 || deviceY > deviceHeight) {
      console.log(`[@component:AppiumOverlay] Base tap outside device bounds, ignoring`);
      return;
    }

    console.log(`[@component:AppiumOverlay] Base tap device coordinates:`, {
      deviceX: Math.round(deviceX),
      deviceY: Math.round(deviceY),
    });

    // Show click animation
    setClickAnimation({
      x: clickX,
      y: clickY,
      id: 'base-tap',
    });

    // Clear animation after duration
    setTimeout(() => setClickAnimation(null), 500);

    // Execute direct tap
    await handleDirectTap(Math.round(deviceX), Math.round(deviceY));
  };

  // Don't render if not visible or no elements
  if (!isVisible) {
    console.log(`[@component:AppiumOverlay] Not visible, not rendering overlay`);
    return null;
  }

  return (
    <>
      {/* Base tap layer - positioned over the entire panel area */}
      <div
        style={{
          position: 'fixed',
          left: panelInfo.position.x + horizontalOffset,
          top: panelInfo.position.y,
          width: actualContentWidth,
          height: panelInfo.size.height,
          zIndex: 1000,
          pointerEvents: 'auto',
          cursor: 'crosshair',
        }}
        onClick={handleBaseTap}
      />

      {/* Element overlays */}
      {scaledElements.map((scaledElement) => (
        <div
          key={scaledElement.id}
          style={{
            position: 'fixed',
            left: scaledElement.x,
            top: scaledElement.y,
            width: scaledElement.width,
            height: scaledElement.height,
            border: `2px solid ${scaledElement.color}`,
            backgroundColor: `${scaledElement.color}20`,
            zIndex: 1001,
            pointerEvents: 'auto',
            cursor: 'pointer',
            borderRadius: '2px',
            transition: 'all 0.2s ease-in-out',
          }}
          onClick={(e) => handleElementClick(scaledElement, e)}
          title={`Element ${scaledElement.id}: ${scaledElement.label}`}
        >
          {/* Element ID label */}
          <div
            style={{
              position: 'absolute',
              top: -20,
              left: 0,
              backgroundColor: scaledElement.color,
              color: 'white',
              padding: '2px 4px',
              fontSize: '10px',
              borderRadius: '2px',
              whiteSpace: 'nowrap',
              zIndex: 1002,
            }}
          >
            {scaledElement.id}
          </div>
        </div>
      ))}

      {/* Click animation */}
      {clickAnimation && (
        <div
          style={{
            position: 'fixed',
            left: clickAnimation.x - 15,
            top: clickAnimation.y - 15,
            width: 30,
            height: 30,
            border: '3px solid #FF6B6B',
            borderRadius: '50%',
            pointerEvents: 'none',
            zIndex: 1003,
            animation: 'clickPulse 0.5s ease-out',
          }}
        />
      )}
    </>
  );
});

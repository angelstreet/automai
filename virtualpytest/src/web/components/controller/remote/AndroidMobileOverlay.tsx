import React, { useEffect, useState } from 'react';

import { PanelInfo } from '../../../types/controller/Panel_Types';
import { AndroidElement } from '../../../types/controller/Remote_Types';

interface ScaledElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  label: string;
}

interface AndroidMobileOverlayProps {
  elements: AndroidElement[];
  deviceWidth: number;
  deviceHeight: number;
  isVisible: boolean;
  onElementClick?: (element: AndroidElement) => void;
  panelInfo: PanelInfo; // Made required - no fallback to screenshot
  onPanelTap?: (x: number, y: number) => Promise<void>;
}

// Same colors as the original UIElementsOverlay
const COLORS = ['#FF0000', '#0066FF', '#FFD700', '#00CC00', '#9900FF'];

export const AndroidMobileOverlay = React.memo(
  function AndroidMobileOverlay({
    elements,
    deviceWidth,
    deviceHeight,
    isVisible,
    onElementClick,
    panelInfo,
    onPanelTap,
  }: AndroidMobileOverlayProps) {
    console.log(
      `[@component:AndroidMobileOverlay] Component called with: elements=${elements.length}, isVisible=${isVisible}, deviceSize=${deviceWidth}x${deviceHeight}`,
    );
    console.log(`[@component:AndroidMobileOverlay] PanelInfo:`, panelInfo);

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
        console.warn(`[@component:AndroidMobileOverlay] Invalid bounds object:`, bounds);
        return null;
      }

      const width = bounds.right - bounds.left;
      const height = bounds.bottom - bounds.top;

      // Ensure positive dimensions
      if (width <= 0 || height <= 0) {
        console.warn(`[@component:AndroidMobileOverlay] Invalid dimensions: ${width}x${height}`);
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

      // For mobile: height is reference, calculate width based on device aspect ratio
      const deviceAspectRatio = deviceWidth / deviceHeight;
      const actualWidth = panelInfo.size.height * deviceAspectRatio;
      const hOffset = (panelInfo.size.width - actualWidth) / 2;

      console.log(`[@component:AndroidMobileOverlay] Content width calculated:`, {
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

    // Calculate scaled coordinates for panel positioning
    useEffect(() => {
      if (elements.length === 0) {
        console.log(`[@component:AndroidMobileOverlay] No elements, clearing overlay elements`);
        setScaledElements([]);
        return;
      }

      // Skip calculation if panelInfo is not properly defined
      if (!panelInfo || !panelInfo.deviceResolution || !panelInfo.size) {
        console.log(
          `[@component:AndroidMobileOverlay] Invalid panelInfo, skipping element scaling`,
        );
        setScaledElements([]);
        return;
      }

      console.log(
        `[@component:AndroidMobileOverlay] Processing ${elements.length} elements for overlay`,
      );
      console.log(`[@component:AndroidMobileOverlay] Panel position:`, panelInfo.position);
      console.log(`[@component:AndroidMobileOverlay] Panel size:`, panelInfo.size);
      console.log(
        `[@component:AndroidMobileOverlay] Device resolution:`,
        panelInfo.deviceResolution,
      );

      const scaled = elements
        .map((element, index) => {
          const bounds = parseBounds(element.bounds);
          if (!bounds) {
            console.warn(
              `[@component:AndroidMobileOverlay] Skipping element ${index + 1} due to invalid bounds`,
            );
            return null;
          }

          const getElementLabel = (el: AndroidElement) => {
            // Priority: ContentDesc → Text → Class Name (same as AndroidMobileRemote)
            if (
              el.contentDesc &&
              el.contentDesc !== '<no content-desc>' &&
              el.contentDesc.trim() !== ''
            ) {
              return el.contentDesc.substring(0, 20);
            } else if (el.text && el.text !== '<no text>' && el.text.trim() !== '') {
              return `"${el.text}"`.substring(0, 20);
            } else {
              return el.className?.split('.').pop()?.substring(0, 20) || 'Unknown';
            }
          };

          // Scale elements to fit the actual stream content size (not panel size)
          const scaleX = actualContentWidth / deviceWidth;
          const scaleY = panelInfo.size.height / deviceHeight;

          const scaledElement = {
            id: element.id,
            x: bounds.x * scaleX + horizontalOffset, // Add offset to center horizontally
            y: bounds.y * scaleY, // No vertical offset needed
            width: bounds.width * scaleX,
            height: bounds.height * scaleY,
            color: COLORS[index % COLORS.length],
            label: getElementLabel(element),
          };

          // Debug first few elements
          if (index < 3) {
            console.log(
              `[@component:AndroidMobileOverlay] Element ${index + 1}: device(${bounds.x},${bounds.y},${bounds.width},${bounds.height}) → scaled(${scaledElement.x.toFixed(1)},${scaledElement.y.toFixed(1)},${scaledElement.width.toFixed(1)},${scaledElement.height.toFixed(1)})`,
            );
          }

          return scaledElement;
        })
        .filter(Boolean) as ScaledElement[];

      console.log(`[@component:AndroidMobileOverlay] Created ${scaled.length} scaled elements`);
      setScaledElements(scaled);
    }, [elements, deviceWidth, deviceHeight, panelInfo, actualContentWidth, horizontalOffset]);

    // Handle element click (higher priority)
    const handleElementClick = async (scaledElement: ScaledElement) => {
      // Show click animation at element center
      const animationX = scaledElement.x + scaledElement.width / 2;
      const animationY = scaledElement.y + scaledElement.height / 2;
      const animationId = `element-${scaledElement.id}-${Date.now()}`;

      setClickAnimation({ x: animationX, y: animationY, id: animationId });

      // Clear animation after 300ms
      setTimeout(() => setClickAnimation(null), 300);

      const originalElement = elements.find((el) => el.id === scaledElement.id);
      if (!originalElement) return;

      if (onPanelTap) {
        // Convert overlay coordinates back to device coordinates
        const deviceX = Math.round(
          ((scaledElement.x - horizontalOffset) * panelInfo.deviceResolution.width) /
            actualContentWidth,
        );
        const deviceY = Math.round(
          (scaledElement.y * panelInfo.deviceResolution.height) / panelInfo.size.height,
        );

        console.log(
          `[@component:AndroidMobileOverlay] Element tap - element ${scaledElement.id} at device coordinates (${deviceX}, ${deviceY})`,
        );

        await onPanelTap(deviceX, deviceY);
      } else if (onElementClick) {
        console.log(
          `[@component:AndroidMobileOverlay] Clicked element ID ${scaledElement.id}: ${scaledElement.label}`,
        );
        onElementClick(originalElement);
      }
    };

    // Handle base layer tap (lower priority, only when not clicking on elements)
    const handleBaseTap = async (event: React.MouseEvent) => {
      if (!onPanelTap) return;

      // Get click coordinates relative to the actual content area (not full panel)
      const rect = event.currentTarget.getBoundingClientRect();
      const contentX = event.clientX - rect.left; // Already relative to content area
      const contentY = event.clientY - rect.top; // Already relative to content area

      // Show click animation at tap location (relative to full panel for positioning)
      const animationId = `base-tap-${Date.now()}`;
      setClickAnimation({ x: contentX, y: contentY, id: animationId });

      // Clear animation after 300ms
      setTimeout(() => setClickAnimation(null), 300);

      // Convert content coordinates directly to device coordinates
      const deviceX = Math.round(
        (contentX * panelInfo.deviceResolution.width) / actualContentWidth,
      );
      const deviceY = Math.round(
        (contentY * panelInfo.deviceResolution.height) / panelInfo.size.height,
      );

      console.log(
        `[@component:AndroidMobileOverlay] Base tap at content(${contentX.toFixed(1)}, ${contentY.toFixed(1)}) → device(${deviceX}, ${deviceY})`,
      );

      await onPanelTap(deviceX, deviceY);
    };

    if (!isVisible) {
      console.log(`[@component:AndroidMobileOverlay] Not visible, not rendering`);
      return null;
    }

    console.log(
      '[@component:AndroidMobileOverlay] Rendering overlay with base tap layer and',
      scaledElements.length,
      'element overlays',
    );

    return (
      <>
        {/* Base transparent tap layer - Always visible, lower z-index */}
        <div
          style={{
            position: 'fixed',
            left: `${panelInfo.position.x + horizontalOffset}px`,
            top: `${panelInfo.position.y}px`,
            width: `${actualContentWidth}px`,
            height: `${panelInfo.size.height}px`,
            zIndex: 999998, // Lower z-index than elements
            contain: 'layout style size',
            willChange: 'transform',
            pointerEvents: 'auto', // Allow tapping on base layer
            border: '1px solid rgba(0, 123, 255, 0.3)', // Subtle blue border for tap area
            cursor: 'crosshair',
          }}
          onClick={handleBaseTap}
        ></div>

        {/* Elements layer - Higher z-index, only visible when elements exist */}
        {scaledElements.length > 0 && (
          <div
            style={{
              position: 'fixed',
              left: `${panelInfo.position.x}px`,
              top: `${panelInfo.position.y}px`,
              width: `${panelInfo.size.width}px`,
              height: `${panelInfo.size.height}px`,
              zIndex: 999999, // Higher z-index than base layer
              contain: 'layout style size',
              willChange: 'transform',
              pointerEvents: 'none', // Allow clicks to pass through to individual elements
            }}
          >
            {/* Render scaled elements as colored rectangles */}
            {scaledElements.map((scaledElement) => (
              <div
                key={scaledElement.id}
                style={{
                  position: 'absolute',
                  left: `${scaledElement.x}px`,
                  top: `${scaledElement.y}px`,
                  width: `${scaledElement.width}px`,
                  height: `${scaledElement.height}px`,
                  backgroundColor: `${scaledElement.color}1A`, // 10% transparency (1A in hex = 26/255 ≈ 10%)
                  border: `2px solid ${scaledElement.color}`, // Colored border instead of white
                  pointerEvents: 'auto', // Allow clicks on elements (higher priority)
                  cursor: 'pointer',
                  overflow: 'hidden',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                }}
                onClick={() => handleElementClick(scaledElement)}
                title={`${scaledElement.id}.${scaledElement.label}`}
              >
                {/* Number positioned at bottom right corner */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '2px',
                    right: '2px',
                    fontSize: '10px',
                    color: scaledElement.color, // Colored text instead of white
                    fontWeight: 'bold',
                    lineHeight: '1',
                  }}
                >
                  {scaledElement.id}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Click animation - Highest z-index */}
        {clickAnimation && (
          <div
            key={clickAnimation.id}
            style={{
              position: 'fixed',
              left: `${panelInfo.position.x + horizontalOffset + clickAnimation.x - 15}px`, // Center the 30px circle, account for content offset
              top: `${panelInfo.position.y + clickAnimation.y - 15}px`,
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              border: '2px solid rgba(0, 123, 255, 0.8)',
              zIndex: 1000000, // Highest z-index
              pointerEvents: 'none',
              animation: 'clickPulse 0.3s ease-out forwards',
            }}
          />
        )}
      </>
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if props have actually changed
    return (
      prevProps.elements === nextProps.elements &&
      prevProps.deviceWidth === nextProps.deviceWidth &&
      prevProps.deviceHeight === nextProps.deviceHeight &&
      prevProps.isVisible === nextProps.isVisible &&
      prevProps.onElementClick === nextProps.onElementClick &&
      JSON.stringify(prevProps.panelInfo) === JSON.stringify(nextProps.panelInfo) &&
      prevProps.onPanelTap === nextProps.onPanelTap
    );
  },
);

import { useEffect, useState, useRef } from 'react';
import React from 'react';

import { AndroidElement } from '../../../types/controller/Remote_Types';
import { PanelInfo } from '../../../types/controller/Panel_Types';

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
  selectedElementId?: string;
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
    selectedElementId,
    onElementClick,
    panelInfo,
    onPanelTap,
  }: AndroidMobileOverlayProps) {
    console.log(
      `[@component:AndroidMobileOverlay] Component called with: elements=${elements.length}, isVisible=${isVisible}, deviceSize=${deviceWidth}x${deviceHeight}`,
    );
    console.log(`[@component:AndroidMobileOverlay] PanelInfo:`, panelInfo);

    const [scaledElements, setScaledElements] = useState<ScaledElement[]>([]);

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

    // Calculate scaled coordinates for panel positioning
    useEffect(() => {
      if (!isVisible || elements.length === 0) {
        console.log(
          `[@component:AndroidMobileOverlay] Not visible or no elements, clearing overlay`,
        );
        setScaledElements([]);
        return;
      }

      console.log(
        `[@component:AndroidMobileOverlay] Using panel positioning - ${panelInfo.isCollapsed ? 'collapsed' : 'expanded'}`,
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
            if (el.text && el.text !== '<no text>' && el.text.trim() !== '') {
              return el.text.substring(0, 20);
            }
            if (el.package && el.package !== '<no package>' && el.package.trim() !== '') {
              return el.package.split('.').pop()?.substring(0, 20) || '';
            }
            return el.className?.split('.').pop()?.substring(0, 20) || 'Element';
          };

          // Scale elements to fit the stream/panel size
          // The overlay container will be positioned at panelInfo.position
          const scaleX = panelInfo.size.width / deviceWidth;
          const scaleY = panelInfo.size.height / deviceHeight;

          const scaledElement = {
            id: element.id,
            x: bounds.x * scaleX,
            y: bounds.y * scaleY,
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
    }, [elements, deviceWidth, deviceHeight, isVisible, panelInfo]);

    // Handle element click
    const handleElementClick = async (scaledElement: ScaledElement) => {
      const originalElement = elements.find((el) => el.id === scaledElement.id);
      if (!originalElement) return;

      if (onPanelTap) {
        // Convert overlay coordinates back to device coordinates
        // Since we scaled directly without offsets, conversion is straightforward
        const deviceX = Math.round(
          (scaledElement.x * panelInfo.deviceResolution.width) / panelInfo.size.width,
        );
        const deviceY = Math.round(
          (scaledElement.y * panelInfo.deviceResolution.height) / panelInfo.size.height,
        );

        console.log(
          `[@component:AndroidMobileOverlay] Panel tap - element ${scaledElement.id} at device coordinates (${deviceX}, ${deviceY}) - panel ${panelInfo.isCollapsed ? 'collapsed' : 'expanded'}`,
        );

        await onPanelTap(deviceX, deviceY);
      } else if (onElementClick) {
        console.log(
          `[@component:AndroidMobileOverlay] Clicked element ID ${scaledElement.id}: ${scaledElement.label}`,
        );
        onElementClick(originalElement);
      }
    };

    if (!isVisible || scaledElements.length === 0) {
      console.log(
        `[@component:AndroidMobileOverlay] Not rendering overlay - visible: ${isVisible}, elements: ${scaledElements.length}`,
      );
      return null;
    }

    console.log(
      '[@component:AndroidMobileOverlay] Rendering overlay with',
      scaledElements.length,
      'elements at position',
      panelInfo.position,
    );

    return (
      <div
        style={{
          position: 'fixed',
          left: `${panelInfo.position.x}px`,
          top: `${panelInfo.position.y}px`,
          width: `${panelInfo.size.width}px`,
          height: `${panelInfo.size.height}px`,
          zIndex: 999999,
          contain: 'layout style size',
          willChange: 'transform',
          pointerEvents: 'none', // Allow clicks to pass through the container
        }}
      >
        {scaledElements.map((element, index) => (
          <div
            key={element.id}
            style={{
              position: 'absolute',
              left: `${element.x}px`,
              top: `${element.y}px`,
              width: `${element.width}px`,
              height: `${element.height}px`,
              border: `${selectedElementId === element.id ? '3px' : '2px'} solid ${element.color}`,
              backgroundColor: `${element.color}20`, // 20% opacity
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              pointerEvents: 'auto', // Re-enable pointer events for individual elements
            }}
            onClick={() => handleElementClick(element)}
            title={`Click to interact with: ${element.label}`}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `${element.color}40`; // 40% opacity on hover
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = `${element.color}20`; // Back to 20% opacity
            }}
          >
            {/* Number label at bottom-right */}
            <div
              style={{
                position: 'absolute',
                bottom: '0px',
                right: '0px',
                backgroundColor: element.color,
                color: 'white',
                fontSize: '10px',
                lineHeight: '12px',
                padding: '1px 3px',
                borderRadius: '2px',
                fontWeight: 'bold',
                pointerEvents: 'none',
              }}
            >
              {index + 1}
            </div>

            {/* Debug coordinates for first 3 elements */}
            {index < 3 && element.x !== undefined && element.y !== undefined && (
              <div
                style={{
                  position: 'absolute',
                  top: '-20px',
                  left: '0px',
                  fontSize: '8px',
                  backgroundColor: 'black',
                  color: 'white',
                  padding: '1px 3px',
                  borderRadius: '2px',
                  opacity: 0.75,
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {element.x.toFixed(0)},{element.y.toFixed(0)}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if props have actually changed
    return (
      prevProps.elements === nextProps.elements &&
      prevProps.deviceWidth === nextProps.deviceWidth &&
      prevProps.deviceHeight === nextProps.deviceHeight &&
      prevProps.isVisible === nextProps.isVisible &&
      prevProps.selectedElementId === nextProps.selectedElementId &&
      prevProps.onElementClick === nextProps.onElementClick &&
      JSON.stringify(prevProps.panelInfo) === JSON.stringify(nextProps.panelInfo) &&
      prevProps.onPanelTap === nextProps.onPanelTap
    );
  },
);

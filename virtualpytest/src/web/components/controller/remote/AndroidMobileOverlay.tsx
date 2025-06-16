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
      if (elements.length === 0) {
        console.log(`[@component:AndroidMobileOverlay] No elements, clearing overlay elements`);
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
            if (el.text && el.text !== '<no text>' && el.text.trim() !== '') {
              return el.text.substring(0, 20);
            }
            if (el.package && el.package !== '<no package>' && el.package.trim() !== '') {
              return el.package.split('.').pop()?.substring(0, 20) || '';
            }
            return el.className?.split('.').pop()?.substring(0, 20) || 'Element';
          };

          // Scale elements to fit the stream/panel size
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
    }, [elements, deviceWidth, deviceHeight, panelInfo]);

    // Handle element click (higher priority)
    const handleElementClick = async (scaledElement: ScaledElement) => {
      const originalElement = elements.find((el) => el.id === scaledElement.id);
      if (!originalElement) return;

      if (onPanelTap) {
        // Convert overlay coordinates back to device coordinates
        const deviceX = Math.round(
          (scaledElement.x * panelInfo.deviceResolution.width) / panelInfo.size.width,
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

      // Get click coordinates relative to the overlay container
      const rect = event.currentTarget.getBoundingClientRect();
      const overlayX = event.clientX - rect.left;
      const overlayY = event.clientY - rect.top;

      // Convert to device coordinates
      const deviceX = Math.round(
        (overlayX * panelInfo.deviceResolution.width) / panelInfo.size.width,
      );
      const deviceY = Math.round(
        (overlayY * panelInfo.deviceResolution.height) / panelInfo.size.height,
      );

      console.log(
        `[@component:AndroidMobileOverlay] Base tap at overlay(${overlayX.toFixed(1)}, ${overlayY.toFixed(1)}) → device(${deviceX}, ${deviceY})`,
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
            left: `${panelInfo.position.x}px`,
            top: `${panelInfo.position.y}px`,
            width: `${panelInfo.size.width}px`,
            height: `${panelInfo.size.height}px`,
            zIndex: 999998, // Lower z-index than elements
            contain: 'layout style size',
            willChange: 'transform',
            pointerEvents: 'auto', // Allow tapping on base layer
            border: '3px solid blue', // Blue border for debugging
            backgroundColor: 'rgba(0, 0, 255, 0.2)', // Blue background with 20% transparency
            cursor: 'crosshair',
          }}
          onClick={handleBaseTap}
        >
          {/* Debug info overlay */}
          <div
            style={{
              position: 'absolute',
              top: '5px',
              left: '5px',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '5px',
              fontSize: '12px',
              borderRadius: '3px',
              pointerEvents: 'none',
            }}
          >
            <div>Elements: {elements.length}</div>
            <div>
              Position: {panelInfo.position.x},{panelInfo.position.y}
            </div>
            <div>
              Size: {panelInfo.size.width}x{panelInfo.size.height}
            </div>
            <div>
              Device: {panelInfo.deviceResolution.width}x{panelInfo.deviceResolution.height}
            </div>
            <div style={{ color: 'cyan', marginTop: '5px' }}>
              {elements.length === 0
                ? 'Tap anywhere • Dump UI for elements'
                : 'Elements have priority'}
            </div>
          </div>

          {/* Show message when no elements are available */}
          {elements.length === 0 && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                padding: '10px',
                borderRadius: '5px',
                fontSize: '14px',
                textAlign: 'center',
                pointerEvents: 'none',
              }}
            >
              Stream Tap Layer Active
              <br />
              <small>Tap anywhere to interact • Dump UI for precise elements</small>
            </div>
          )}
        </div>

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
                  backgroundColor: scaledElement.color,
                  border: '2px solid rgba(255, 255, 255, 0.8)',
                  pointerEvents: 'auto', // Allow clicks on elements (higher priority)
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  color: 'white',
                  textShadow: '1px 1px 1px rgba(0, 0, 0, 0.8)',
                  overflow: 'hidden',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                }}
                onClick={() => handleElementClick(scaledElement)}
                title={`Element ${scaledElement.id}: ${scaledElement.label}`}
              >
                {scaledElement.id}
              </div>
            ))}
          </div>
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

import { useEffect, useState, useRef } from 'react';

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
  screenshotElement: HTMLImageElement | null;
  deviceWidth: number;
  deviceHeight: number;
  isVisible: boolean;
  selectedElementId?: string;
  onElementClick?: (element: AndroidElement) => void;
}

// Same colors as the original UIElementsOverlay
const COLORS = ['#FF0000', '#0066FF', '#FFD700', '#00CC00', '#9900FF'];

export function AndroidMobileOverlay({
  elements,
  screenshotElement,
  deviceWidth,
  deviceHeight,
  isVisible,
  selectedElementId,
  onElementClick,
}: AndroidMobileOverlayProps) {
  console.log(
    `[@component:AndroidMobileOverlay] Component called with: elements=${elements.length}, isVisible=${isVisible}, deviceSize=${deviceWidth}x${deviceHeight}`,
  );

  const [scaledElements, setScaledElements] = useState<ScaledElement[]>([]);
  const overlayRef = useRef<HTMLDivElement>(null);

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

  // Calculate scaled coordinates - same logic as UIElementsOverlay
  useEffect(() => {
    if (!isVisible || elements.length === 0) {
      setScaledElements([]);
      return;
    }

    // If no screenshot element, we can't position properly, but still create elements for debugging
    if (!screenshotElement) {
      console.log(
        `[@component:AndroidMobileOverlay] No screenshot element, creating elements with original bounds`,
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

          // Ensure all values are valid numbers
          if (isNaN(bounds.x) || isNaN(bounds.y) || isNaN(bounds.width) || isNaN(bounds.height)) {
            console.warn(
              `[@component:AndroidMobileOverlay] Invalid bounds for element ${index + 1}, skipping`,
            );
            return null;
          }

          return {
            id: element.id,
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            color: COLORS[index % COLORS.length],
            label: getElementLabel(element),
          };
        })
        .filter(Boolean) as ScaledElement[];

      setScaledElements(scaled);
      return;
    }

    // Original screenshot-based positioning logic (same as UIElementsOverlay)
    const imageRect = screenshotElement.getBoundingClientRect();

    // Debug logging
    console.log(`[@component:AndroidMobileOverlay] Debug info:`);
    console.log(`  Device resolution: ${deviceWidth}x${deviceHeight}`);
    console.log(
      `  Screenshot element rect: ${imageRect.width}x${imageRect.height} at (${imageRect.left}, ${imageRect.top})`,
    );

    // Calculate actual image content dimensions accounting for letterboxing
    const deviceAspectRatio = deviceWidth / deviceHeight;
    const containerAspectRatio = imageRect.width / imageRect.height;

    console.log(`  Device aspect ratio: ${deviceAspectRatio.toFixed(3)}`);
    console.log(`  Container aspect ratio: ${containerAspectRatio.toFixed(3)}`);

    let actualImageWidth, actualImageHeight, offsetX, offsetY;

    if (deviceAspectRatio > containerAspectRatio) {
      // Image is wider - letterboxed top/bottom
      actualImageWidth = imageRect.width;
      actualImageHeight = imageRect.width / deviceAspectRatio;
      offsetX = 0;
      offsetY = (imageRect.height - actualImageHeight) / 2;
    } else {
      // Image is taller - letterboxed left/right
      actualImageWidth = imageRect.height * deviceAspectRatio;
      actualImageHeight = imageRect.height;
      offsetX = (imageRect.width - actualImageWidth) / 2;
      offsetY = 0;
    }

    console.log(
      `  Actual image content: ${actualImageWidth.toFixed(1)}x${actualImageHeight.toFixed(1)}`,
    );
    console.log(`  Content offset: (${offsetX.toFixed(1)}, ${offsetY.toFixed(1)})`);

    // HARDCODED FIXES based on UIElementsOverlay
    const MODAL_HEADER_HEIGHT_OFFSET = 0; // Move overlay up by reducing offset
    const WIDTH_CORRECTION_FACTOR = 1; // Increase scale slightly from 0.75 to 0.85

    const scaleX = (actualImageWidth * WIDTH_CORRECTION_FACTOR) / deviceWidth;
    const scaleY = actualImageHeight / deviceHeight;

    console.log(`  Scale factors: X=${scaleX.toFixed(4)}, Y=${scaleY.toFixed(4)}`);
    console.log(
      `  Applied corrections: header_offset=${MODAL_HEADER_HEIGHT_OFFSET}, width_factor=${WIDTH_CORRECTION_FACTOR}`,
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

        const scaledX = bounds.x * scaleX + offsetX;
        const scaledY = bounds.y * scaleY + offsetY + MODAL_HEADER_HEIGHT_OFFSET;

        // Debug first few elements
        if (index < 3) {
          console.log(
            `  Element ${index + 1}: device(${bounds.x},${bounds.y},${bounds.width},${bounds.height}) → screen(${scaledX.toFixed(1)},${scaledY.toFixed(1)},${(bounds.width * scaleX).toFixed(1)},${(bounds.height * scaleY).toFixed(1)})`,
          );
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

        // Ensure all values are valid numbers
        if (
          isNaN(scaledX) ||
          isNaN(scaledY) ||
          isNaN(bounds.width * scaleX) ||
          isNaN(bounds.height * scaleY)
        ) {
          console.warn(
            `[@component:AndroidMobileOverlay] Invalid coordinates for element ${index + 1}, skipping`,
          );
          return null;
        }

        return {
          id: element.id,
          x: scaledX,
          y: scaledY,
          width: bounds.width * scaleX,
          height: bounds.height * scaleY,
          color: COLORS[index % COLORS.length],
          label: getElementLabel(element),
        };
      })
      .filter(Boolean) as ScaledElement[];

    setScaledElements(scaled);
  }, [elements, screenshotElement, deviceWidth, deviceHeight, isVisible]);

  // Update overlay position when image moves/resizes
  useEffect(() => {
    if (!screenshotElement || !isVisible) return;

    const updatePosition = () => {
      const imageRect = screenshotElement.getBoundingClientRect();
      if (overlayRef.current) {
        // Position overlay to match exactly the image element's position
        overlayRef.current.style.left = `${imageRect.left}px`;
        overlayRef.current.style.top = `${imageRect.top}px`;
        overlayRef.current.style.width = `${imageRect.width}px`;
        overlayRef.current.style.height = `${imageRect.height}px`;

        console.log(
          `[@component:AndroidMobileOverlay] Overlay positioned at: (${imageRect.left}, ${imageRect.top}) size: ${imageRect.width}x${imageRect.height}`,
        );
      }
    };

    updatePosition();

    // Update on resize/scroll
    const handleUpdate = () => updatePosition();
    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate);

    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate);
    };
  }, [screenshotElement, isVisible]);

  // Handle element click
  const handleElementClick = (scaledElement: ScaledElement) => {
    const originalElement = elements.find((el) => el.id === scaledElement.id);
    if (originalElement && onElementClick) {
      console.log(
        `[@component:AndroidMobileOverlay] Clicked element ID ${scaledElement.id}: ${scaledElement.label}`,
      );
      onElementClick(originalElement);
    }
  };

  if (!isVisible || scaledElements.length === 0) return null;

  console.log(
    '[@component:AndroidMobileOverlay] Rendering overlay with',
    scaledElements.length,
    'elements',
  );

  return (
    <div
      ref={overlayRef}
      style={{
        position: 'fixed',
        zIndex: 999999,
        // Prevent overlay from affecting page layout and scrollbars
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
          {/* Number label at bottom-right - same as UIElementsOverlay */}
          <div
            style={{
              position: 'absolute',
              bottom: '0px',
              right: '0px',
              backgroundColor: element.color,
              color: 'white',
              fontSize: '60px',
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
}

'use client';

import { useEffect, useState, useRef } from 'react';

import { AndroidElement } from '@/app/actions/adbActions';

interface UIElementsOverlayProps {
  elements: AndroidElement[];
  videoElement: HTMLVideoElement | null;
  deviceWidth: number;
  deviceHeight: number;
  isVisible: boolean;
  selectedElementId?: number;
}

interface ScaledElement {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  label: string;
}

const COLORS = ['#FF0000', '#0066FF', '#FFD700', '#00CC00', '#9900FF'];

export function UIElementsOverlay({
  elements,
  videoElement,
  deviceWidth,
  deviceHeight,
  isVisible,
  selectedElementId,
}: UIElementsOverlayProps) {
  const [scaledElements, setScaledElements] = useState<ScaledElement[]>([]);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Parse bounds string like "[0,0][1080,2340]" or "0,0,1080,2340"
  const parseBounds = (bounds: string) => {
    // Try bracket format first: [0,0][1080,2340]
    const bracketMatch = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (bracketMatch) {
      return {
        x: parseInt(bracketMatch[1]),
        y: parseInt(bracketMatch[2]),
        width: parseInt(bracketMatch[3]) - parseInt(bracketMatch[1]),
        height: parseInt(bracketMatch[4]) - parseInt(bracketMatch[2]),
      };
    }

    // Try comma format: 0,0,1080,2340
    const commaMatch = bounds.match(/(\d+),(\d+),(\d+),(\d+)/);
    if (commaMatch) {
      return {
        x: parseInt(commaMatch[1]),
        y: parseInt(commaMatch[2]),
        width: parseInt(commaMatch[3]) - parseInt(commaMatch[1]),
        height: parseInt(commaMatch[4]) - parseInt(commaMatch[2]),
      };
    }

    return null;
  };

  // Calculate scaled coordinates
  useEffect(() => {
    if (!videoElement || !isVisible || elements.length === 0) {
      setScaledElements([]);
      return;
    }

    const videoRect = videoElement.getBoundingClientRect();

    // Debug logging
    console.log(`[@component:UIElementsOverlay] Debug info:`);
    console.log(`  Device resolution: ${deviceWidth}x${deviceHeight}`);
    console.log(
      `  Video element rect: ${videoRect.width}x${videoRect.height} at (${videoRect.left}, ${videoRect.top})`,
    );

    // Calculate actual video content dimensions accounting for letterboxing
    const videoAspectRatio = deviceWidth / deviceHeight;
    const containerAspectRatio = videoRect.width / videoRect.height;

    console.log(`  Device aspect ratio: ${videoAspectRatio.toFixed(3)}`);
    console.log(`  Container aspect ratio: ${containerAspectRatio.toFixed(3)}`);

    let actualVideoWidth, actualVideoHeight, offsetX, offsetY;

    if (videoAspectRatio > containerAspectRatio) {
      // Video is wider - letterboxed top/bottom
      actualVideoWidth = videoRect.width;
      actualVideoHeight = videoRect.width / videoAspectRatio;
      offsetX = 0;
      offsetY = (videoRect.height - actualVideoHeight) / 2;
    } else {
      // Video is taller - letterboxed left/right
      actualVideoWidth = videoRect.height * videoAspectRatio;
      actualVideoHeight = videoRect.height;
      offsetX = (videoRect.width - actualVideoWidth) / 2 + 34;
      offsetY = 0;
    }

    console.log(
      `  Actual video content: ${actualVideoWidth.toFixed(1)}x${actualVideoHeight.toFixed(1)}`,
    );
    console.log(`  Content offset: (${offsetX.toFixed(1)}, ${offsetY.toFixed(1)})`);

    // HARDCODED FIXES based on user feedback
    const MODAL_HEADER_HEIGHT_OFFSET = 45; // Modal header compensation
    const WIDTH_CORRECTION_FACTOR = 0.75; // Reduce width by 5% to fix scaling

    const scaleX = (actualVideoWidth * WIDTH_CORRECTION_FACTOR) / deviceWidth;
    const scaleY = actualVideoHeight / deviceHeight;

    console.log(`  Scale factors: X=${scaleX.toFixed(4)}, Y=${scaleY.toFixed(4)}`);
    console.log(
      `  Applied corrections: header_offset=${MODAL_HEADER_HEIGHT_OFFSET}, width_factor=${WIDTH_CORRECTION_FACTOR}`,
    );

    const scaled = elements
      .map((element, index) => {
        const bounds = parseBounds(element.bounds);
        if (!bounds) return null;

        const scaledX = bounds.x * scaleX + offsetX;
        const scaledY = bounds.y * scaleY + offsetY + MODAL_HEADER_HEIGHT_OFFSET;

        // Debug first few elements
        if (index < 3) {
          console.log(
            `  Element ${index + 1}: device(${bounds.x},${bounds.y},${bounds.width},${bounds.height}) → screen(${scaledX.toFixed(1)},${scaledY.toFixed(1)},${(bounds.width * scaleX).toFixed(1)},${(bounds.height * scaleY).toFixed(1)})`,
          );
        }

        const getElementLabel = (el: AndroidElement) => {
          if (el.contentDesc && el.contentDesc !== '<no content-desc>') {
            return el.contentDesc.substring(0, 20);
          }
          if (el.text && el.text !== '<no text>') {
            return el.text.substring(0, 20);
          }
          if (el.resourceId && el.resourceId !== '<no resource-id>') {
            return el.resourceId.split('/').pop()?.substring(0, 20) || '';
          }
          return el.tag.substring(0, 20);
        };

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
  }, [elements, videoElement, deviceWidth, deviceHeight, isVisible]);

  // Update overlay position when video moves/resizes
  useEffect(() => {
    if (!videoElement || !overlayRef.current || !isVisible) return;

    const updatePosition = () => {
      const videoRect = videoElement.getBoundingClientRect();
      const overlay = overlayRef.current;
      if (overlay) {
        // Position overlay to match exactly the video element's position
        overlay.style.left = `${videoRect.left}px`;
        overlay.style.top = `${videoRect.top}px`;
        overlay.style.width = `${videoRect.width}px`;
        overlay.style.height = `${videoRect.height}px`;

        console.log(
          `[@component:UIElementsOverlay] Overlay positioned at: (${videoRect.left}, ${videoRect.top}) size: ${videoRect.width}x${videoRect.height}`,
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
  }, [videoElement, isVisible]);

  if (!isVisible || scaledElements.length === 0) return null;

  return (
    <div ref={overlayRef} className="fixed pointer-events-none z-50" style={{ position: 'fixed' }}>
      {/* Debug: Show calculated video content area with a dashed border */}
      {scaledElements.length > 0 && (
        <div
          className="absolute border-2 border-dashed border-white opacity-50"
          style={{
            left: '0px',
            top: '0px',
            width: '100%',
            height: '100%',
          }}
        >
          <div className="absolute top-2 left-2 bg-white text-black text-xs px-2 py-1 rounded">
            DEBUG: Video Area
          </div>
        </div>
      )}

      {scaledElements.map((element, index) => (
        <div
          key={element.id}
          className="absolute border-2"
          style={{
            left: `${element.x}px`,
            top: `${element.y}px`,
            width: `${element.width}px`,
            height: `${element.height}px`,
            borderColor: element.color,
            backgroundColor: `${element.color}20`, // 20% opacity
            borderWidth: selectedElementId === element.id ? '3px' : '2px',
          }}
        >
          {/* Number label at bottom-right */}
          <div
            className="absolute text-xs font-bold px-1 rounded"
            style={{
              bottom: '0px',
              right: '0px',
              backgroundColor: element.color,
              color: 'white',
              fontSize: '10px',
              lineHeight: '12px',
            }}
          >
            {index + 1}
          </div>

          {/* Debug coordinates for first 3 elements */}
          {index < 3 && (
            <div
              className="absolute text-xs bg-black text-white px-1 rounded opacity-75"
              style={{
                top: '-20px',
                left: '0px',
                fontSize: '8px',
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

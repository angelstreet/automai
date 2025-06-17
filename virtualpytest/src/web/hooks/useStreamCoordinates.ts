import { useMemo, useCallback } from 'react';

interface DragArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface StreamCoordinates {
  actualContentWidth: number;
  horizontalOffset: number;
  scaleX: number;
  scaleY: number;
  deviceToScreen: (deviceX: number, deviceY: number) => { x: number; y: number };
  screenToDevice: (screenX: number, screenY: number) => { x: number; y: number };
  transformArea: (area: DragArea, direction: 'deviceToScreen' | 'screenToDevice') => DragArea;
}

/**
 * Hook for handling coordinate transformations between device and screen space
 * Extracted from AndroidMobileOverlay to be reusable across components
 *
 * @param deviceWidth - Native device width (e.g., 1080)
 * @param deviceHeight - Native device height (e.g., 1920)
 * @param displayWidth - Current display panel width
 * @param displayHeight - Current display panel height
 * @returns Object with coordinate transformation functions and calculated values
 */
export const useStreamCoordinates = (
  deviceWidth: number,
  deviceHeight: number,
  displayWidth: number,
  displayHeight: number,
): StreamCoordinates => {
  // Calculate actual content width and horizontal offset (mobile case - height is reference)
  const { actualContentWidth, horizontalOffset } = useMemo(() => {
    if (!deviceWidth || !deviceHeight || !displayWidth || !displayHeight) {
      return { actualContentWidth: 0, horizontalOffset: 0 };
    }

    // For mobile: height is reference, calculate width based on device aspect ratio
    const deviceAspectRatio = deviceWidth / deviceHeight;
    const actualWidth = displayHeight * deviceAspectRatio;
    const hOffset = (displayWidth - actualWidth) / 2;

    console.log('[@hook:useStreamCoordinates] Content width calculated:', {
      deviceAspectRatio,
      displayHeight,
      actualWidth,
      hOffset,
    });

    return {
      actualContentWidth: actualWidth,
      horizontalOffset: hOffset,
    };
  }, [deviceWidth, deviceHeight, displayWidth, displayHeight]);

  // Calculate scale factors
  const scaleX = useMemo(() => actualContentWidth / deviceWidth, [actualContentWidth, deviceWidth]);
  const scaleY = useMemo(() => displayHeight / deviceHeight, [displayHeight, deviceHeight]);

  // Device to Screen conversion
  const deviceToScreen = useCallback(
    (deviceX: number, deviceY: number) => ({
      x: deviceX * scaleX + horizontalOffset,
      y: deviceY * scaleY,
    }),
    [scaleX, scaleY, horizontalOffset],
  );

  // Screen to Device conversion
  const screenToDevice = useCallback(
    (screenX: number, screenY: number) => ({
      x: Math.round((screenX - horizontalOffset) / scaleX),
      y: Math.round(screenY / scaleY),
    }),
    [scaleX, scaleY, horizontalOffset],
  );

  // Transform drag areas between coordinate spaces
  const transformArea = useCallback(
    (area: DragArea, direction: 'deviceToScreen' | 'screenToDevice'): DragArea => {
      if (direction === 'deviceToScreen') {
        const topLeft = deviceToScreen(area.x, area.y);
        return {
          x: topLeft.x,
          y: topLeft.y,
          width: area.width * scaleX,
          height: area.height * scaleY,
        };
      } else {
        const topLeft = screenToDevice(area.x, area.y);
        return {
          x: topLeft.x,
          y: topLeft.y,
          width: Math.round(area.width / scaleX),
          height: Math.round(area.height / scaleY),
        };
      }
    },
    [deviceToScreen, screenToDevice, scaleX, scaleY],
  );

  return {
    actualContentWidth,
    horizontalOffset,
    scaleX,
    scaleY,
    deviceToScreen,
    screenToDevice,
    transformArea,
  };
};

/**
 * Resolution Utilities for handling alignment between different capture methods
 * 
 * This module handles the complex resolution mapping between:
 * 1. Mobile device resolution (from ADB): e.g., 1080x2340 (portrait)
 * 2. Screenshot FFmpeg resolution: Now dynamic based on device orientation
 * 3. Stream resolution: 640x360 (hardcoded landscape)
 */

export interface Resolution {
  width: number;
  height: number;
}

export interface DeviceResolution extends Resolution {
  orientation: 'portrait' | 'landscape';
}

export interface ResolutionMapping {
  device: DeviceResolution;
  screenshot: Resolution;
  stream: Resolution;
  scalingFactors: {
    deviceToScreenshot: { x: number; y: number };
    deviceToStream: { x: number; y: number };
    screenshotToStream: { x: number; y: number };
  };
}

/**
 * Parse resolution string like "1080x2340" into Resolution object
 */
export function parseResolution(resolutionString: string): Resolution | null {
  const match = resolutionString.match(/(\d+)x(\d+)/);
  if (!match) return null;
  
  return {
    width: parseInt(match[1]),
    height: parseInt(match[2])
  };
}

/**
 * Determine device orientation based on dimensions
 */
export function getDeviceOrientation(width: number, height: number): 'portrait' | 'landscape' {
  return height > width ? 'portrait' : 'landscape';
}

/**
 * Create device resolution object with orientation
 */
export function createDeviceResolution(width: number, height: number): DeviceResolution {
  return {
    width,
    height,
    orientation: getDeviceOrientation(width, height)
  };
}

/**
 * Calculate scaling factors between different resolutions
 */
export function calculateScalingFactors(
  source: Resolution, 
  target: Resolution
): { x: number; y: number } {
  return {
    x: target.width / source.width,
    y: target.height / source.height
  };
}

/**
 * Create comprehensive resolution mapping for all three resolution types
 */
export function createResolutionMapping(
  deviceWidth: number,
  deviceHeight: number,
  screenshotResolution?: string,
  streamResolution: string = '640x360'
): ResolutionMapping {
  const device = createDeviceResolution(deviceWidth, deviceHeight);
  
  // Screenshot resolution: Now matches device resolution (no more black bars!)
  const screenshot: Resolution = screenshotResolution 
    ? parseResolution(screenshotResolution) || { width: deviceWidth, height: deviceHeight }
    : { width: deviceWidth, height: deviceHeight };
  
  // Stream resolution: Always landscape 640x360
  const stream = parseResolution(streamResolution) || { width: 640, height: 360 };
  
  const scalingFactors = {
    deviceToScreenshot: calculateScalingFactors(device, screenshot),
    deviceToStream: calculateScalingFactors(device, stream),
    screenshotToStream: calculateScalingFactors(screenshot, stream)
  };
  
  return {
    device,
    screenshot,
    stream,
    scalingFactors
  };
}

/**
 * Calculate letterboxing/pillarboxing for mismatched aspect ratios
 */
export interface LetterboxInfo {
  actualWidth: number;
  actualHeight: number;
  offsetX: number;
  offsetY: number;
  scale: number;
}

export function calculateLetterboxing(
  sourceResolution: Resolution,
  containerWidth: number,
  containerHeight: number
): LetterboxInfo {
  const sourceAspectRatio = sourceResolution.width / sourceResolution.height;
  const containerAspectRatio = containerWidth / containerHeight;
  
  let actualWidth, actualHeight, offsetX, offsetY, scale;
  
  if (sourceAspectRatio > containerAspectRatio) {
    // Source is wider - letterboxed top/bottom
    actualWidth = containerWidth;
    actualHeight = containerWidth / sourceAspectRatio;
    offsetX = 0;
    offsetY = (containerHeight - actualHeight) / 2;
    scale = containerWidth / sourceResolution.width;
  } else {
    // Source is taller - letterboxed left/right
    actualWidth = containerHeight * sourceAspectRatio;
    actualHeight = containerHeight;
    offsetX = (containerWidth - actualWidth) / 2;
    offsetY = 0;
    scale = containerHeight / sourceResolution.height;
  }
  
  return {
    actualWidth,
    actualHeight,
    offsetX,
    offsetY,
    scale
  };
}

/**
 * Convert coordinates from one resolution space to another
 */
export function convertCoordinates(
  x: number,
  y: number,
  fromResolution: Resolution,
  toResolution: Resolution,
  toContainerWidth?: number,
  toContainerHeight?: number
): { x: number; y: number } {
  // If container dimensions are provided, account for letterboxing
  if (toContainerWidth && toContainerHeight) {
    const letterbox = calculateLetterboxing(toResolution, toContainerWidth, toContainerHeight);
    const scaleX = letterbox.scale * (toResolution.width / fromResolution.width);
    const scaleY = letterbox.scale * (toResolution.height / fromResolution.height);
    
    return {
      x: x * scaleX + letterbox.offsetX,
      y: y * scaleY + letterbox.offsetY
    };
  }
  
  // Simple scaling without letterboxing
  const scaleX = toResolution.width / fromResolution.width;
  const scaleY = toResolution.height / fromResolution.height;
  
  return {
    x: x * scaleX,
    y: y * scaleY
  };
}

/**
 * Get appropriate capture resolution based on device orientation
 * This eliminates black bars by matching the device's natural orientation
 */
export function getOptimalCaptureResolution(
  deviceWidth: number,
  deviceHeight: number,
  maxWidth: number = 1920,
  maxHeight: number = 1080
): string {
  const deviceOrientation = getDeviceOrientation(deviceWidth, deviceHeight);
  
  if (deviceOrientation === 'portrait') {
    // For portrait devices, capture in portrait mode
    // Scale down proportionally if needed
    const scale = Math.min(maxHeight / deviceWidth, maxWidth / deviceHeight);
    const captureWidth = Math.round(deviceWidth * scale);
    const captureHeight = Math.round(deviceHeight * scale);
    return `${captureWidth}x${captureHeight}`;
  } else {
    // For landscape devices, capture in landscape mode
    const scale = Math.min(maxWidth / deviceWidth, maxHeight / deviceHeight);
    const captureWidth = Math.round(deviceWidth * scale);
    const captureHeight = Math.round(deviceHeight * scale);
    return `${captureWidth}x${captureHeight}`;
  }
}

/**
 * Debug helper to log resolution information
 */
export function logResolutionInfo(mapping: ResolutionMapping, label: string = '') {
  console.log(`[@ResolutionUtils] ${label} Resolution Mapping:`);
  console.log(`  Device: ${mapping.device.width}x${mapping.device.height} (${mapping.device.orientation})`);
  console.log(`  Screenshot: ${mapping.screenshot.width}x${mapping.screenshot.height}`);
  console.log(`  Stream: ${mapping.stream.width}x${mapping.stream.height}`);
  console.log(`  Scaling Factors:`);
  console.log(`    Device→Screenshot: ${mapping.scalingFactors.deviceToScreenshot.x.toFixed(3)}x, ${mapping.scalingFactors.deviceToScreenshot.y.toFixed(3)}y`);
  console.log(`    Device→Stream: ${mapping.scalingFactors.deviceToStream.x.toFixed(3)}x, ${mapping.scalingFactors.deviceToStream.y.toFixed(3)}y`);
  console.log(`    Screenshot→Stream: ${mapping.scalingFactors.screenshotToStream.x.toFixed(3)}x, ${mapping.scalingFactors.screenshotToStream.y.toFixed(3)}y`);
}

/**
 * Validate that resolutions are reasonable
 */
export function validateResolution(resolution: Resolution, label: string = ''): boolean {
  const isValid = resolution.width > 0 && resolution.height > 0 && 
                  resolution.width <= 4096 && resolution.height <= 4096;
  
  if (!isValid) {
    console.warn(`[@ResolutionUtils] Invalid resolution ${label}: ${resolution.width}x${resolution.height}`);
  }
  
  return isValid;
} 
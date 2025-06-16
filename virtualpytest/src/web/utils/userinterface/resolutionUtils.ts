/**
 * Simple Resolution Utilities
 *
 * Basic utilities for handling device resolution information.
 * Complex scaling and coordinate mapping removed since screenshots now
 * capture at native device resolution and display uses CSS for fitting.
 */

export interface Resolution {
  width: number;
  height: number;
}

export interface DeviceResolution extends Resolution {
  orientation: 'portrait' | 'landscape';
}

/**
 * Parse resolution string like "1080x2340" into Resolution object
 */
export function parseResolution(resolutionString: string): Resolution | null {
  const match = resolutionString.match(/(\d+)x(\d+)/);
  if (!match) return null;

  return {
    width: parseInt(match[1]),
    height: parseInt(match[2]),
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
    orientation: getDeviceOrientation(width, height),
  };
}

/**
 * Validate that resolutions are reasonable
 */
export function validateResolution(resolution: Resolution, label: string = ''): boolean {
  const isValid =
    resolution.width > 0 &&
    resolution.height > 0 &&
    resolution.width <= 4096 &&
    resolution.height <= 4096;

  if (!isValid) {
    console.warn(
      `[@ResolutionUtils] Invalid resolution ${label}: ${resolution.width}x${resolution.height}`,
    );
  }

  return isValid;
}

/**
 * Format resolution as string
 */
export function formatResolution(resolution: Resolution): string {
  return `${resolution.width}x${resolution.height}`;
}

/**
 * Debug helper to log basic resolution information
 */
export function logResolutionInfo(resolution: DeviceResolution, label: string = '') {
  console.log(
    `[@ResolutionUtils] ${label} Resolution: ${formatResolution(resolution)} (${resolution.orientation})`,
  );
}

import { LayoutConfig, DeviceResolution } from '../../types/pages/UserInterface_Types';
import { getVerificationEditorLayout } from '../../config/layoutConfig';
import { getZIndex } from '../zIndexUtils';

/**
 * Creates layout configuration for compact view based on device model
 */
export const createCompactLayoutConfig = (deviceModel: string): LayoutConfig => ({
  minHeight: deviceModel === 'android_mobile' ? '300px' : '250px',
  aspectRatio: deviceModel === 'android_mobile' ? '3/5' : '8/5',
  objectFit: 'cover' as const,
  isMobileModel: deviceModel === 'android_mobile',
});

/**
 * Gets verification editor layout configuration
 */
export const getVerificationLayout = (deviceModel: string) => {
  return getVerificationEditorLayout(deviceModel);
};

/**
 * Creates device resolution object
 */
export const createDeviceResolution = (): DeviceResolution => ({
  width: 1080,
  height: 2340,
});

/**
 * Gets device dimensions for compact view
 */
export const getCompactViewDimensions = (deviceModel: string) => ({
  width: deviceModel === 'android_mobile' ? '180px' : '400px',
  height: deviceModel === 'android_mobile' ? '300px' : '250px',
});

/**
 * Formats recording time from seconds to MM:SS format
 */
export const formatRecordingTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Calculates expected frame count based on capture duration
 */
export const calculateExpectedFrames = (startTime: Date | null, endTime: Date): number => {
  if (!startTime) return 0;

  const durationMs = endTime.getTime() - startTime.getTime();
  const durationSeconds = Math.floor(durationMs / 1000);
  return Math.max(1, durationSeconds); // At least 1 frame
};

/**
 * Creates stream viewer sx styles based on view mode
 */
export const createStreamViewerSx = (viewMode: string) => ({
  width: '100%',
  height: '100%',
  display: viewMode === 'stream' ? 'block' : 'none',
});

/**
 * Gets device ID from AV config
 */
export const getDeviceId = (avConfig: any): string | undefined => {
  return avConfig?.host_ip ? `${avConfig.host_ip}:5555` : undefined;
};

/**
 * Creates base container styles for screen editor
 */
export const createBaseContainerStyles = () => ({
  position: 'fixed' as const,
  bottom: 0,
  left: 0,
  display: 'flex',
  zIndex: getZIndex('UI_ELEMENTS'),
  userSelect: 'none' as const,
  WebkitUserSelect: 'none' as const,
  MozUserSelect: 'none' as const,
  msUserSelect: 'none' as const,
  '& @keyframes blink': {
    '0%, 50%': { opacity: 1 },
    '51%, 100%': { opacity: 0.3 },
  },
});

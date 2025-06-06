/**
 * Central configuration for layout settings based on device model type
 * This ensures consistent layout behavior across components
 */

// Layout configuration for StreamViewer component
export interface StreamViewerLayoutConfig {
  minHeight: string;
  aspectRatio: string;
  objectFit: 'cover' | 'contain' | 'fill';
  isMobileModel: boolean;
}

// Layout configuration for VerificationEditor component
export interface VerificationEditorLayoutConfig {
  width: number;
  height: number;
  captureHeight: number;
  objectFit: 'fill' | 'contain';
  isMobileModel: boolean;
}

// Layout configuration for Remote components
export interface RemoteLayoutConfig {
  containerWidth: number;
  fallbackImageWidth: number;
  fallbackImageHeight: number;
}

/**
 * Determines if a model name refers to a mobile device
 * @param model The model name string
 * @returns boolean indicating if this is a mobile model
 */
export const isMobileModel = (model?: string): boolean => {
  if (!model) return false;
  const modelLower = model.toLowerCase();
  return (
    modelLower.includes('mobile') || modelLower.includes('android') || modelLower.includes('ios')
  );
};

/**
 * Get the appropriate StreamViewer layout configuration based on model type
 * @param model The model name string
 * @returns StreamViewerLayoutConfig with the appropriate settings
 */
export const getStreamViewerLayout = (model?: string): StreamViewerLayoutConfig => {
  const mobile = isMobileModel(model);
  return mobile
    ? {
        minHeight: '400px',
        aspectRatio: '9/16', // Portrait for mobile
        objectFit: 'cover',
        isMobileModel: true,
      }
    : {
        minHeight: '300px',
        aspectRatio: '16/9', // Landscape for non-mobile
        objectFit: 'cover',
        isMobileModel: false,
      };
};

/**
 * Get the appropriate VerificationEditor layout configuration based on model type
 * @param model The model name string
 * @returns VerificationEditorLayoutConfig with the appropriate settings
 */
export const getVerificationEditorLayout = (model?: string): VerificationEditorLayoutConfig => {
  const mobile = isMobileModel(model);
  return mobile
    ? {
        width: 300,
        height: 510,
        captureHeight: 200,
        objectFit: 'fill',
        isMobileModel: true,
      }
    : {
        width: 640,
        height: 510,
        captureHeight: 140,
        objectFit: 'contain',
        isMobileModel: false,
      };
};

/**
 * Get the appropriate Remote layout configuration based on remote type
 * @param remoteType The remote type string (e.g., 'android-mobile', 'android-tv', 'ir', 'bluetooth')
 * @returns RemoteLayoutConfig with the appropriate settings
 */
export const getRemoteLayout = (remoteType?: string): RemoteLayoutConfig => {
  switch (remoteType) {
    case 'android-mobile':
      return {
        containerWidth: 300,
        fallbackImageWidth: 300,
        fallbackImageHeight: 400,
      };
    case 'android-tv':
      return {
        containerWidth: 400,
        fallbackImageWidth: 400,
        fallbackImageHeight: 200,
      };
    case 'ir':
    case 'bluetooth':
      return {
        containerWidth: 350,
        fallbackImageWidth: 350,
        fallbackImageHeight: 250,
      };
    default:
      return {
        containerWidth: 350,
        fallbackImageWidth: 350,
        fallbackImageHeight: 250,
      };
  }
};

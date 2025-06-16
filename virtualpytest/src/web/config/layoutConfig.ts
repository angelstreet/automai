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
  compactMaxWidth: number;
}

// New configurable remote panel layout from device config
export interface ConfigurableRemotePanelLayout {
  collapsed: {
    width: string;
    height: string;
    position: {
      top?: string;
      bottom?: string;
      left?: string;
      right?: string;
    };
  };
  expanded: {
    width: string;
    height: string;
    position: {
      top?: string;
      bottom?: string;
      left?: string;
      right?: string;
    };
  };
  zIndex: number;
  showScreenshotInCollapsed: boolean;
  showScreenshotInExpanded: boolean;
}

export interface ConfigurableAVPanelLayout {
  collapsed: {
    width: string;
    height: string;
    position: {
      top?: string;
      bottom?: string;
      left?: string;
      right?: string;
    };
  };
  expanded: {
    width: string;
    height: string;
    position: {
      top?: string;
      bottom?: string;
      left?: string;
      right?: string;
    };
  };
  zIndex: number;
  showControlsInCollapsed: boolean;
  showControlsInExpanded: boolean;
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
        width: 360,
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
        compactMaxWidth: 400,
      };
    case 'android-tv':
      return {
        containerWidth: 400,
        fallbackImageWidth: 400,
        fallbackImageHeight: 200,
        compactMaxWidth: 500,
      };
    case 'ir':
    case 'bluetooth':
      return {
        containerWidth: 350,
        fallbackImageWidth: 350,
        fallbackImageHeight: 250,
        compactMaxWidth: 400,
      };
    default:
      return {
        containerWidth: 350,
        fallbackImageWidth: 350,
        fallbackImageHeight: 250,
        compactMaxWidth: 400,
      };
  }
};

/**
 * Get configurable remote panel layout from device config
 * @param remoteType The remote type (e.g., 'android_mobile', 'android_tv')
 * @param remoteConfig The loaded remote configuration object
 * @returns ConfigurableRemotePanelLayout with device-specific or default settings
 */
export const getConfigurableRemotePanelLayout = (
  remoteType?: string,
  remoteConfig?: any,
): ConfigurableRemotePanelLayout => {
  // Try to get layout from device config
  if (remoteConfig?.panel_layout) {
    const panelLayout = remoteConfig.panel_layout;
    return {
      collapsed: {
        width: panelLayout.collapsed?.width || '200px',
        height: panelLayout.collapsed?.height || '300px',
        position: {
          top: panelLayout.collapsed?.position?.top,
          bottom: panelLayout.collapsed?.position?.bottom || '20px',
          left: panelLayout.collapsed?.position?.left || '20px',
          right: panelLayout.collapsed?.position?.right,
        },
      },
      expanded: {
        width: panelLayout.expanded?.width || '400px',
        height: panelLayout.expanded?.height || 'calc(100vh - 140px)',
        position: {
          top: panelLayout.expanded?.position?.top || '100px',
          bottom: panelLayout.expanded?.position?.bottom,
          left: panelLayout.expanded?.position?.left,
          right: panelLayout.expanded?.position?.right || '20px',
        },
      },
      zIndex: panelLayout.zIndex || 1000,
      showScreenshotInCollapsed: panelLayout.showScreenshotInCollapsed ?? false,
      showScreenshotInExpanded: panelLayout.showScreenshotInExpanded ?? true,
    };
  }

  // Fallback to default values based on remote type
  switch (remoteType) {
    case 'android_mobile':
      return {
        collapsed: {
          width: '200px',
          height: '300px',
          position: {
            bottom: '20px',
            left: '20px',
          },
        },
        expanded: {
          width: '400px',
          height: 'calc(100vh - 140px)',
          position: {
            top: '100px',
            right: '20px',
          },
        },
        zIndex: 1000,
        showScreenshotInCollapsed: false,
        showScreenshotInExpanded: true,
      };
    case 'android_tv':
      return {
        collapsed: {
          width: '250px',
          height: '200px',
          position: {
            bottom: '20px',
            left: '20px',
          },
        },
        expanded: {
          width: '450px',
          height: 'calc(100vh - 140px)',
          position: {
            top: '100px',
            right: '20px',
          },
        },
        zIndex: 1000,
        showScreenshotInCollapsed: false,
        showScreenshotInExpanded: false,
      };
    default:
      return {
        collapsed: {
          width: '200px',
          height: '250px',
          position: {
            bottom: '20px',
            left: '20px',
          },
        },
        expanded: {
          width: '400px',
          height: 'calc(100vh - 140px)',
          position: {
            top: '100px',
            right: '20px',
          },
        },
        zIndex: 1000,
        showScreenshotInCollapsed: false,
        showScreenshotInExpanded: true,
      };
  }
};

export const getConfigurableAVPanelLayout = (
  deviceModel: string,
  avConfig: any,
): ConfigurableAVPanelLayout => {
  // Default fallback layout
  const defaultLayout: ConfigurableAVPanelLayout = {
    collapsed: {
      width: '300px',
      height: '200px',
      position: {
        bottom: '20px',
        left: '20px',
      },
    },
    expanded: {
      width: '800px',
      height: '600px',
      position: {
        top: '100px',
        left: '20px',
      },
    },
    zIndex: 1000,
    showControlsInCollapsed: false,
    showControlsInExpanded: true,
  };

  if (!avConfig?.panel_layout) {
    return defaultLayout;
  }

  const panelLayout = avConfig.panel_layout;
  const deviceSpecific = avConfig.device_specific?.[deviceModel];

  return {
    collapsed: {
      width:
        deviceSpecific?.collapsed?.width ||
        panelLayout.collapsed?.width ||
        defaultLayout.collapsed.width,
      height:
        deviceSpecific?.collapsed?.height ||
        panelLayout.collapsed?.height ||
        defaultLayout.collapsed.height,
      position: {
        ...defaultLayout.collapsed.position,
        ...panelLayout.collapsed?.position,
      },
    },
    expanded: {
      width:
        deviceSpecific?.expanded?.width ||
        panelLayout.expanded?.width ||
        defaultLayout.expanded.width,
      height:
        deviceSpecific?.expanded?.height ||
        panelLayout.expanded?.height ||
        defaultLayout.expanded.height,
      position: {
        ...defaultLayout.expanded.position,
        ...panelLayout.expanded?.position,
      },
    },
    zIndex: panelLayout.zIndex || defaultLayout.zIndex,
    showControlsInCollapsed:
      panelLayout.showControlsInCollapsed ?? defaultLayout.showControlsInCollapsed,
    showControlsInExpanded:
      panelLayout.showControlsInExpanded ?? defaultLayout.showControlsInExpanded,
  };
};

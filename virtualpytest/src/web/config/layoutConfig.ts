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

// Remote layout configuration for the actual remote control within the panel
export interface ConfigurableRemoteLayout {
  collapsed: {
    width: string;
    height: string;
    scale: number;
    padding: string;
  };
  expanded: {
    width: string;
    height: string;
    scale: number;
    padding: string;
  };
  background_image: {
    url: string;
    width: number;
    height: number;
  };
  global_offset: {
    x: number;
    y: number;
  };
  text_style?: {
    fontSize: string;
    fontWeight: string;
    color: string;
    textShadow: string;
  };
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

/**
 * Get configurable remote layout from device config
 * @param remoteConfig The loaded remote configuration object
 * @returns ConfigurableRemoteLayout with device-specific settings
 */
export const getConfigurableRemoteLayout = (remoteConfig?: any): ConfigurableRemoteLayout => {
  // Default fallback layout
  const defaultLayout: ConfigurableRemoteLayout = {
    collapsed: {
      width: '180px',
      height: '280px',
      scale: 0.8,
      padding: '20px',
    },
    expanded: {
      width: '300px',
      height: '450px',
      scale: 1.0,
      padding: '35px',
    },
    background_image: {
      url: '/default-remote.png',
      width: 300,
      height: 450,
    },
    global_offset: {
      x: 0,
      y: 0,
    },
  };

  // Try to get layout from device config
  if (remoteConfig?.remote_layout) {
    const remoteLayout = remoteConfig.remote_layout;
    return {
      collapsed: {
        width: remoteLayout.collapsed?.width || defaultLayout.collapsed.width,
        height: remoteLayout.collapsed?.height || defaultLayout.collapsed.height,
        scale: remoteLayout.collapsed?.scale || defaultLayout.collapsed.scale,
        padding: remoteLayout.collapsed?.padding || defaultLayout.collapsed.padding,
      },
      expanded: {
        width: remoteLayout.expanded?.width || defaultLayout.expanded.width,
        height: remoteLayout.expanded?.height || defaultLayout.expanded.height,
        scale: remoteLayout.expanded?.scale || defaultLayout.expanded.scale,
        padding: remoteLayout.expanded?.padding || defaultLayout.expanded.padding,
      },
      background_image: {
        url: remoteLayout.background_image?.url || defaultLayout.background_image.url,
        width: remoteLayout.background_image?.width || defaultLayout.background_image.width,
        height: remoteLayout.background_image?.height || defaultLayout.background_image.height,
      },
      global_offset: {
        x: remoteLayout.global_offset?.x || defaultLayout.global_offset.x,
        y: remoteLayout.global_offset?.y || defaultLayout.global_offset.y,
      },
      text_style: remoteLayout.text_style,
    };
  }

  return defaultLayout;
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

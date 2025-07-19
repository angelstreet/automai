/**
 * Remote Panel Layout Configuration
 * Handles all remote panel positioning, sizing, and layout logic
 */

import { getZIndex } from '../../utils/zIndexUtils';

// Import configurations
import { androidMobileRemoteConfig } from './androidMobileRemote';
import { androidTvRemoteConfig } from './androidTvRemote';
import { appiumRemoteConfig } from './appiumRemote';
import { bluetoothRemoteConfig } from './bluetoothRemote';
import { infraredRemoteConfig } from './infraredRemote';

// Remote panel layout configuration from device config
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
          left: panelLayout.collapsed?.position?.left,
          right: panelLayout.collapsed?.position?.right || '20px',
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
      zIndex: getZIndex('REMOTE_PANELS'),
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
            right: '20px',
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
        zIndex: getZIndex('REMOTE_PANELS'),
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
            right: '20px',
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
        zIndex: getZIndex('REMOTE_PANELS'),
        showScreenshotInCollapsed: false,
        showScreenshotInExpanded: false,
      };
    case 'ir_remote':
      return {
        collapsed: {
          width: '200px',
          height: '280px',
          position: {
            bottom: '20px',
            right: '20px',
          },
        },
        expanded: {
          width: '380px',
          height: 'calc(100vh - 140px)',
          position: {
            top: '100px',
            right: '20px',
          },
        },
        zIndex: getZIndex('REMOTE_PANELS'),
        showScreenshotInCollapsed: false,
        showScreenshotInExpanded: false,
      };
    case 'bluetooth_remote':
      return {
        collapsed: {
          width: '200px',
          height: '280px',
          position: {
            bottom: '20px',
            right: '20px',
          },
        },
        expanded: {
          width: '380px',
          height: 'calc(100vh - 140px)',
          position: {
            top: '100px',
            right: '20px',
          },
        },
        zIndex: getZIndex('REMOTE_PANELS'),
        showScreenshotInCollapsed: false,
        showScreenshotInExpanded: false,
      };
    case 'ios_mobile':
      return {
        collapsed: {
          width: '200px',
          height: '350px',
          position: {
            bottom: '20px',
            right: '20px',
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
        zIndex: getZIndex('REMOTE_PANELS'),
        showScreenshotInCollapsed: false,
        showScreenshotInExpanded: true,
      };
    default:
      return {
        collapsed: {
          width: '200px',
          height: '250px',
          position: {
            bottom: '20px',
            right: '20px',
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
        zIndex: getZIndex('REMOTE_PANELS'),
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

/**
 * Load remote configuration from TypeScript config
 * @param deviceModel The device model (e.g., 'android_mobile', 'android_tv')
 * @returns The loaded configuration or null if failed
 */
export const loadRemoteConfig = (deviceModel: string): any => {
  try {
    let config = null;
    switch (deviceModel) {
      case 'android_mobile':
        config = androidMobileRemoteConfig;
        break;
      case 'android_tv':
        config = androidTvRemoteConfig;
        break;
      case 'ir_remote':
        config = infraredRemoteConfig;
        break;
      case 'bluetooth_remote':
        config = bluetoothRemoteConfig;
        break;
      case 'ios_mobile':
        config = appiumRemoteConfig;
        break;
      case 'host_vnc':
        // VNC hosts don't need a specific remote config, use default layout
        config = null;
        break;
      default:
        console.warn(
          `[@config:remotePanelLayout] No config found for device model: ${deviceModel}`,
        );
        return null;
    }

    console.log(`[@config:remotePanelLayout] Loaded config for ${deviceModel}:`, config);
    return config;
  } catch (error) {
    console.error(`[@config:remotePanelLayout] Failed to load config for ${deviceModel}:`, error);
    return null;
  }
};

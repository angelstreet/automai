/**
 * AV Panel Layout Configuration
 * Handles all AV panel positioning, sizing, and layout logic
 */

import { getZIndex } from '../../utils/zIndexUtils';

import { hdmiStreamConfig, hdmiStreamMobileConfig } from './hdmiStream';
import { vncStreamConfig } from './vncStream';

// AV panel layout configuration from device config
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
  header?: {
    height?: string;
    fontSize?: string;
    fontWeight?: string;
    iconSize?: string;
    padding?: string;
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
  };
}

/**
 * Get configurable AV panel layout from device config
 * @param deviceModel The device model (e.g., 'android_mobile', 'android_tv')
 * @param avConfig The loaded AV configuration object
 * @returns ConfigurableAVPanelLayout with device-specific or default settings
 */
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
      height: '500px',
      position: {
        top: '100px',
        left: '20px',
      },
    },
    zIndex: getZIndex('UI_ELEMENTS'),
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
    zIndex: getZIndex('UI_ELEMENTS'),
    showControlsInCollapsed:
      panelLayout.showControlsInCollapsed ?? defaultLayout.showControlsInCollapsed,
    showControlsInExpanded:
      panelLayout.showControlsInExpanded ?? defaultLayout.showControlsInExpanded,
    header: panelLayout.header || undefined,
  };
};

/**
 * Check if device model is mobile
 * @param deviceModel The device model string
 * @returns boolean indicating if device is mobile
 */
const isMobileDevice = (deviceModel: string): boolean => {
  return deviceModel.includes('mobile') || deviceModel === 'android_mobile';
};

/**
 * Load AV configuration based on stream type and device model
 * @param streamType The stream type (e.g., 'hdmi_stream')
 * @param deviceModel The device model (optional, for mobile detection)
 * @returns Promise<any> The loaded configuration or null if failed
 */
export const loadAVConfig = async (streamType: string, deviceModel?: string): Promise<any> => {
  try {
    console.log(`[@config:avPanelLayout] Loading config for ${streamType}, device: ${deviceModel}`);

    switch (streamType) {
      case 'hdmi_stream':
        // Use mobile config if device is mobile, otherwise use regular config
        if (deviceModel && isMobileDevice(deviceModel)) {
          console.log(`[@config:avPanelLayout] Using mobile HDMI config for ${deviceModel}`);
          return hdmiStreamMobileConfig;
        } else {
          console.log(`[@config:avPanelLayout] Using regular HDMI config for ${deviceModel}`);
          return hdmiStreamConfig;
        }
      case 'vnc_stream':
        // VNC is always landscape (desktop/host screens) - no mobile variant needed
        console.log(`[@config:avPanelLayout] Using VNC config for ${deviceModel || 'host_vnc'}`);
        return vncStreamConfig;
      default:
        console.warn(`[@config:avPanelLayout] No config found for stream type: ${streamType}`);
        return null;
    }
  } catch (error) {
    console.error(`[@config:avPanelLayout] Failed to load config for ${streamType}:`, error);
    return null;
  }
};

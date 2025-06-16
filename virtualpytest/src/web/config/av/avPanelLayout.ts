/**
 * AV Panel Layout Configuration
 * Handles all AV panel positioning, sizing, and layout logic
 */

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

/**
 * Load AV configuration from JSON file
 * @param streamType The stream type (e.g., 'hdmi_stream')
 * @returns Promise<any> The loaded configuration or null if failed
 */
export const loadAVConfig = async (streamType: string): Promise<any> => {
  try {
    let configPath = '';
    switch (streamType) {
      case 'hdmi_stream':
        configPath = '/src/web/config/av/hdmi_stream.json';
        break;
      default:
        console.warn(`[@config:avPanelLayout] No config found for stream type: ${streamType}`);
        return null;
    }

    const response = await fetch(configPath);
    if (response.ok) {
      const config = await response.json();
      console.log(`[@config:avPanelLayout] Loaded config for ${streamType}:`, config);
      return config;
    } else {
      console.error(
        `[@config:avPanelLayout] Failed to fetch config for ${streamType}: ${response.status}`,
      );
      return null;
    }
  } catch (error) {
    console.error(`[@config:avPanelLayout] Failed to load config for ${streamType}:`, error);
    return null;
  }
};

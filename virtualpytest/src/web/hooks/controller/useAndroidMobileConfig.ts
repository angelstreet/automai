import { useState, useEffect } from 'react';

// Import the configuration directly from the config directory
import androidMobileRemoteConfig from '../../../config/remote/android_mobile_remote.json';

interface AndroidMobileConfig {
  remote_info: {
    name: string;
    type: string;
    image_url: string;
    default_scale: number;
    min_scale: number;
    max_scale: number;
    button_scale_factor: number;
    global_offset: {
      x: number;
      y: number;
    };
  };
  button_layout: {
    [key: string]: {
      key: string;
      position: { x: number; y: number };
      size: { width: number; height: number };
      shape: string;
      comment: string;
    };
  };
}

interface AndroidMobileLayoutConfig {
  containerWidth: number;
  containerHeight: number;
  deviceResolution: {
    width: number;
    height: number;
  };
  overlayConfig: {
    defaultPosition: {
      left: string;
      top: string;
    };
    defaultScale: {
      x: number;
      y: number;
    };
  };
  autoDumpDelay: number;
}

export function useAndroidMobileConfig() {
  const [config, setConfig] = useState<AndroidMobileConfig | null>(null);
  const [layoutConfig, setLayoutConfig] = useState<AndroidMobileLayoutConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      console.log('[@hook:useAndroidMobileConfig] Loading Android Mobile configuration');

      // Load the configuration from the imported JSON
      const androidConfig = androidMobileRemoteConfig as AndroidMobileConfig;
      setConfig(androidConfig);

      // Create layout configuration based on the remote config
      const layout: AndroidMobileLayoutConfig = {
        containerWidth: 300, // From existing getRemoteLayout
        containerHeight: 600, // From existing getRemoteLayout
        deviceResolution: {
          width: 1080, // Standard Android mobile resolution
          height: 2340, // Standard Android mobile resolution
        },
        overlayConfig: {
          defaultPosition: {
            left: '74px', // From existing hard-coded values
            top: '186px', // From existing hard-coded values
          },
          defaultScale: {
            x: 0.198, // From existing hard-coded values
            y: 0.195, // From existing hard-coded values
          },
        },
        autoDumpDelay: 1200, // From existing hard-coded value
      };

      setLayoutConfig(layout);
      setLoading(false);

      console.log('[@hook:useAndroidMobileConfig] Configuration loaded successfully');
    } catch (err: any) {
      console.error('[@hook:useAndroidMobileConfig] Failed to load configuration:', err);
      setError(err.message || 'Failed to load Android Mobile configuration');
      setLoading(false);
    }
  }, []);

  // Helper function to get button configuration by key
  const getButtonConfig = (buttonKey: string) => {
    if (!config) return null;

    const buttonName = buttonKey.toLowerCase().replace('_', '');
    return config.button_layout[buttonName] || null;
  };

  // Helper function to get all available button keys
  const getAvailableButtons = () => {
    if (!config) return [];

    return Object.values(config.button_layout).map((button) => button.key);
  };

  // Helper function to get remote info
  const getRemoteInfo = () => {
    return config?.remote_info || null;
  };

  return {
    config,
    layoutConfig,
    loading,
    error,
    getButtonConfig,
    getAvailableButtons,
    getRemoteInfo,
  };
}

export interface DeviceRemoteConfig {
  type: 'android_mobile' | 'android_tv' | 'ir_remote' | 'bluetooth_remote' | 'hdmi_stream';
  connectionConfig: any;
}

export const getDeviceRemoteConfig = (device: any): DeviceRemoteConfig | null => {
  const remoteConfig = device?.controller_configs?.remote;
  if (!remoteConfig || !remoteConfig.implementation) {
    console.log(`[@util:deviceRemoteMapping] Device ${device?.name} has no remote configuration`);
    return null;
  }
  
  // Validate that the implementation is a supported type
  const supportedTypes: DeviceRemoteConfig['type'][] = [
    'android_mobile', 
    'android_tv', 
    'ir_remote', 
    'bluetooth_remote', 
    'hdmi_stream'
  ];
  
  if (!supportedTypes.includes(remoteConfig.implementation)) {
    console.warn(`[@util:deviceRemoteMapping] Unknown remote implementation: ${remoteConfig.implementation}`);
    return null;
  }
  
  console.log(`[@util:deviceRemoteMapping] Device ${device.name} has remote type: ${remoteConfig.implementation}`);
  
  return {
    type: remoteConfig.implementation,
    connectionConfig: remoteConfig // Pass through the entire config as-is
  };
};

export const extractConnectionConfigForAndroid = (remoteConfig: any) => {
  if (!remoteConfig) return undefined;
  
  // Handle both flat structure (legacy) and nested structure (current)
  const params = remoteConfig.parameters || remoteConfig;
  
  const config = {
    device_ip: params.device_ip,
    device_port: params.device_port || '5555',
  };
  
  console.log('[@util:deviceRemoteMapping] Extracted Android connection config:', config);
  return config;
};

export const extractConnectionConfigForIR = (remoteConfig: any) => {
  if (!remoteConfig) return undefined;
  
  // Handle both flat structure (legacy) and nested structure (current)
  const params = remoteConfig.parameters || remoteConfig;
  
  const config = {
    device_path: params.ir_device || params.device_path,
    protocol: params.protocol,
    frequency: params.frequency,
  };
  
  console.log('[@util:deviceRemoteMapping] Extracted IR connection config:', config);
  return config;
};

export const extractConnectionConfigForBluetooth = (remoteConfig: any) => {
  if (!remoteConfig) return undefined;
  
  // Handle both flat structure (legacy) and nested structure (current)
  const params = remoteConfig.parameters || remoteConfig;
  
  const config = {
    device_address: params.device_address,
    device_name: params.device_name,
    pairing_pin: params.pairing_pin,
  };
  
  console.log('[@util:deviceRemoteMapping] Extracted Bluetooth connection config:', config);
  return config;
};

export const extractConnectionConfigForAV = (avConfig: any) => {
  if (!avConfig) return undefined;
  
  // Handle both flat structure (legacy) and nested structure (current)
  const params = avConfig.parameters || avConfig;
  
  const config = {
    fps: params.fps || 30,
    resolution: params.resolution || '1920x1080',
    stream_url: params.stream_url,
    stream_path: params.stream_path,
    video_device: params.video_device || '/dev/video0',
    connection_timeout: params.connection_timeout || 15,
  };
  
  console.log('[@util:deviceRemoteMapping] Extracted AV connection config:', config);
  return config;
}; 
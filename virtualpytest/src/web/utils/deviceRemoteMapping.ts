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
  
  // Map implementation names to types
  let type: DeviceRemoteConfig['type'];
  
  switch (remoteConfig.implementation) {
    case 'android_tv':
      type = 'android_tv';
      break;
    case 'real_android_mobile':
    case 'android_mobile':
      type = 'android_mobile';
      break;
    case 'ir_remote':
      type = 'ir_remote';
      break;
    case 'bluetooth_remote':
      type = 'bluetooth_remote';
      break;
    case 'hdmi_stream':
      type = 'hdmi_stream';
      break;
    default:
      console.warn(`[@util:deviceRemoteMapping] Unknown remote implementation: ${remoteConfig.implementation}`);
      return null;
  }
  
  console.log(`[@util:deviceRemoteMapping] Device ${device.name} has remote type: ${type} (implementation: ${remoteConfig.implementation})`);
  
  return {
    type: type,
    connectionConfig: remoteConfig // Pass through the entire config as-is
  };
};

export const extractConnectionConfigForAndroid = (remoteConfig: any) => {
  if (!remoteConfig) return undefined;
  
  // Handle both flat structure (legacy) and nested structure (current)
  const params = remoteConfig.parameters || remoteConfig;
  
  const config = {
    host_ip: params.host_ip,
    host_port: params.host_port || '22',
    host_username: params.host_username,
    host_password: params.host_password,
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
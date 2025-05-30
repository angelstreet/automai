export interface DeviceRemoteConfig {
  type: 'android_mobile' | 'android_tv' | 'ir_remote' | 'bluetooth_remote' | 'hdmi_stream';
  connectionConfig: any;
}

export const getDeviceRemoteConfig = (device: any): DeviceRemoteConfig | null => {
  const remoteConfig = device?.controller_configs?.remote;
  if (!remoteConfig || !remoteConfig.type) {
    return null;
  }
  
  console.log(`[@util:deviceRemoteMapping] Device ${device.name} has remote type: ${remoteConfig.type}`);
  
  return {
    type: remoteConfig.type,
    connectionConfig: remoteConfig // Pass through the entire config as-is
  };
};

export const extractConnectionConfigForAndroid = (remoteConfig: any) => {
  if (!remoteConfig) return undefined;
  
  return {
    host_ip: remoteConfig.host_ip,
    host_port: remoteConfig.host_port || '22',
    host_username: remoteConfig.host_username,
    host_password: remoteConfig.host_password,
    device_ip: remoteConfig.device_ip,
    device_port: remoteConfig.device_port || '5555',
  };
};

export const extractConnectionConfigForIR = (remoteConfig: any) => {
  if (!remoteConfig) return undefined;
  
  return {
    device_path: remoteConfig.ir_device || remoteConfig.device_path,
    protocol: remoteConfig.protocol,
    frequency: remoteConfig.frequency,
  };
};

export const extractConnectionConfigForBluetooth = (remoteConfig: any) => {
  if (!remoteConfig) return undefined;
  
  return {
    device_address: remoteConfig.device_address,
    device_name: remoteConfig.device_name,
    pairing_pin: remoteConfig.pairing_pin,
  };
}; 
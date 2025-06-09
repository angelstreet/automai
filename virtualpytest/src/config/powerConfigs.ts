// Power controller configuration types
export type PowerType = 'usb-power';

export interface PowerDeviceConfig {
  type: PowerType;
  name: string;
  icon: string;
  // Abstract power controller endpoints
  serverEndpoints: {
    powerOn: string;
    powerOff: string;
    reboot: string;
  };
}

// USB Power configuration - uses abstract power controller
export const USB_POWER_CONFIG: PowerDeviceConfig = {
  type: 'usb-power',
  name: 'USB Power Control',
  icon: 'Power',
  serverEndpoints: {
    powerOn: '/server/power/power-on',    // Abstract power controller
    powerOff: '/server/power/power-off',  // Abstract power controller
    reboot: '/server/power/reboot'        // Abstract power controller
  }
};

// Power configuration registry
export const POWER_CONFIGS = {
  'usb-power': USB_POWER_CONFIG,
} as const;

// Helper function to get power config by type
export function getPowerConfig(powerType: string): PowerDeviceConfig | null {
  return POWER_CONFIGS[powerType as keyof typeof POWER_CONFIGS] || null;
} 
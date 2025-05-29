import { 
  ControllerConfigMap, 
  ControllerConfiguration, 
  ControllerInputField 
} from '../types/controllerConfig.types';

/**
 * Controller Configuration Service
 * 
 * This service defines the input field requirements for each controller type and implementation.
 * Based on the VirtualPyTest controller system requirements.
 */

// Helper function to create common SSH connection fields
const createSSHConnectionFields = (): ControllerInputField[] => [
  {
    name: 'host_ip',
    label: 'Host IP Address',
    type: 'text',
    required: true,
    placeholder: '192.168.1.100',
    description: 'IP address of the SSH host that will execute ADB commands',
    validation: {
      pattern: '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$'
    }
  },
  {
    name: 'host_port',
    label: 'Host Port',
    type: 'number',
    required: false,
    defaultValue: 22,
    placeholder: '22',
    description: 'SSH port on the host',
    validation: {
      min: 1,
      max: 65535
    }
  },
  {
    name: 'host_username',
    label: 'Host Username',
    type: 'text',
    required: true,
    placeholder: 'root',
    description: 'SSH username for the host'
  },
  {
    name: 'host_password',
    label: 'Host Password',
    type: 'password',
    required: true,
    placeholder: '••••••••',
    description: 'SSH password for the host'
  }
];

// Helper function to create device IP fields
const createDeviceIPFields = (): ControllerInputField[] => [
  {
    name: 'device_ip',
    label: 'Device IP Address',
    type: 'text',
    required: true,
    placeholder: '192.168.1.200',
    description: 'IP address of the target device',
    validation: {
      pattern: '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$'
    }
  },
  {
    name: 'device_port',
    label: 'Device Port',
    type: 'number',
    required: false,
    defaultValue: 5555,
    placeholder: '5555',
    description: 'ADB port on the device',
    validation: {
      min: 1,
      max: 65535
    }
  }
];

// Define controller configurations
const CONTROLLER_CONFIGURATIONS: ControllerConfigMap = {
  remote: [
    {
      id: 'android_tv',
      name: 'Android TV (SSH+ADB)',
      description: 'Real Android TV control via SSH+ADB connection',
      implementation: 'android_tv',
      status: 'available',
      inputFields: [
        ...createSSHConnectionFields(),
        ...createDeviceIPFields(),
        {
          name: 'connection_timeout',
          label: 'Connection Timeout (seconds)',
          type: 'number',
          required: false,
          defaultValue: 10,
          placeholder: '10',
          description: 'Timeout for establishing connections',
          validation: {
            min: 5,
            max: 120
          }
        }
      ]
    },
    {
      id: 'real_android_mobile',
      name: 'Android Mobile (SSH+ADB)',
      description: 'Real Android Mobile control via SSH+ADB connection',
      implementation: 'real_android_mobile',
      status: 'available',
      inputFields: [
        ...createSSHConnectionFields(),
        ...createDeviceIPFields(),
        {
          name: 'connection_timeout',
          label: 'Connection Timeout (seconds)',
          type: 'number',
          required: false,
          defaultValue: 10,
          placeholder: '10',
          description: 'Timeout for establishing connections',
          validation: {
            min: 5,
            max: 120
          }
        }
      ]
    },
    {
      id: 'ir_remote',
      name: 'IR Remote',
      description: 'Infrared remote control with classic TV/STB buttons',
      implementation: 'ir_remote',
      status: 'available',
      inputFields: [
        {
          name: 'device_path',
          label: 'Device Path',
          type: 'text',
          required: true,
          placeholder: '/dev/lirc0',
          description: 'Path to the IR device'
        },
        {
          name: 'protocol',
          label: 'Protocol',
          type: 'select',
          required: true,
          description: 'IR protocol to use',
          options: [
            { value: 'RC5', label: 'RC5' },
            { value: 'RC6', label: 'RC6' },
            { value: 'NEC', label: 'NEC' },
            { value: 'Samsung', label: 'Samsung' },
            { value: 'Sony', label: 'Sony' }
          ]
        },
        {
          name: 'frequency',
          label: 'Frequency (Hz)',
          type: 'number',
          required: false,
          defaultValue: 38000,
          placeholder: '38000',
          description: 'IR carrier frequency',
          validation: {
            min: 30000,
            max: 60000
          }
        }
      ]
    },
    {
      id: 'bluetooth_remote',
      name: 'Bluetooth Remote',
      description: 'Bluetooth HID remote control',
      implementation: 'bluetooth_remote',
      status: 'available',
      inputFields: [
        {
          name: 'device_address',
          label: 'Bluetooth Address',
          type: 'text',
          required: true,
          placeholder: '00:11:22:33:44:55',
          description: 'MAC address of the Bluetooth device',
          validation: {
            pattern: '^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$'
          }
        },
        {
          name: 'pairing_pin',
          label: 'Pairing PIN',
          type: 'text',
          required: false,
          placeholder: '0000',
          description: 'PIN for pairing if required'
        },
        {
          name: 'connection_timeout',
          label: 'Connection Timeout (seconds)',
          type: 'number',
          required: false,
          defaultValue: 30,
          placeholder: '30',
          description: 'Timeout for Bluetooth connection',
          validation: {
            min: 10,
            max: 120
          }
        }
      ]
    }
  ],
  av: [
    {
      id: 'hdmi_stream',
      name: 'HDMI Stream',
      description: 'HDMI stream URL viewer and controller',
      implementation: 'hdmi_stream',
      status: 'available',
      inputFields: [
        {
          name: 'stream_url',
          label: 'Stream URL',
          type: 'text',
          required: true,
          placeholder: 'http://192.168.1.100:8080/stream',
          description: 'URL of the HDMI stream'
        },
        {
          name: 'stream_quality',
          label: 'Stream Quality',
          type: 'select',
          required: false,
          description: 'Preferred stream quality',
          options: [
            { value: 'auto', label: 'Auto' },
            { value: '1080p', label: '1080p' },
            { value: '720p', label: '720p' },
            { value: '480p', label: '480p' }
          ]
        },
        {
          name: 'connection_timeout',
          label: 'Connection Timeout (seconds)',
          type: 'number',
          required: false,
          defaultValue: 15,
          placeholder: '15',
          description: 'Timeout for stream connection',
          validation: {
            min: 5,
            max: 60
          }
        }
      ]
    }
  ],
  network: [
    {
      id: 'network',
      name: 'Network Stream',
      description: 'Network-based audio/video streaming',
      implementation: 'network',
      status: 'placeholder',
      inputFields: [
        {
          name: 'network_url',
          label: 'Network URL',
          type: 'text',
          required: true,
          placeholder: 'rtmp://server/stream',
          description: 'Network stream URL'
        }
      ]
    },
    {
      id: 'rtsp',
      name: 'RTSP Stream',
      description: 'Real-Time Streaming Protocol capture',
      implementation: 'rtsp',
      status: 'placeholder',
      inputFields: [
        {
          name: 'rtsp_url',
          label: 'RTSP URL',
          type: 'text',
          required: true,
          placeholder: 'rtsp://192.168.1.100:554/stream',
          description: 'RTSP stream URL'
        }
      ]
    }
  ],
  power: [
    {
      id: 'mock',
      name: 'Mock Power Controller',
      description: 'Mock power controller for testing',
      implementation: 'mock',
      status: 'available',
      inputFields: [
        {
          name: 'delay_seconds',
          label: 'Action Delay (seconds)',
          type: 'number',
          required: false,
          defaultValue: 1,
          placeholder: '1',
          description: 'Delay to simulate power operations',
          validation: {
            min: 0,
            max: 10
          }
        }
      ]
    },
    {
      id: 'smart_plug',
      name: 'Smart Plug',
      description: 'Smart plug power control',
      implementation: 'smart_plug',
      status: 'placeholder',
      inputFields: [
        {
          name: 'plug_ip',
          label: 'Smart Plug IP',
          type: 'text',
          required: true,
          placeholder: '192.168.1.150',
          description: 'IP address of the smart plug'
        },
        {
          name: 'plug_type',
          label: 'Plug Type',
          type: 'select',
          required: true,
          description: 'Type of smart plug',
          options: [
            { value: 'tplink', label: 'TP-Link Kasa' },
            { value: 'wemo', label: 'Belkin WeMo' },
            { value: 'tuya', label: 'Tuya/Smart Life' }
          ]
        }
      ]
    }
  ]
};

export class ControllerConfigService {
  /**
   * Get all controller configurations
   */
  static getAllConfigurations(): ControllerConfigMap {
    return CONTROLLER_CONFIGURATIONS;
  }

  /**
   * Get configurations for a specific controller type
   */
  static getConfigurationsByType(type: keyof ControllerConfigMap): ControllerConfiguration[] {
    return CONTROLLER_CONFIGURATIONS[type] || [];
  }

  /**
   * Get configuration for a specific controller implementation
   */
  static getConfigurationByImplementation(
    type: keyof ControllerConfigMap, 
    implementation: string
  ): ControllerConfiguration | null {
    const configs = CONTROLLER_CONFIGURATIONS[type] || [];
    return configs.find(config => config.implementation === implementation) || null;
  }

  /**
   * Get only available controllers (excluding placeholders)
   */
  static getAvailableConfigurations(): ControllerConfigMap {
    const result: ControllerConfigMap = {
      remote: [],
      av: [],
      network: [],
      power: []
    };

    Object.keys(CONTROLLER_CONFIGURATIONS).forEach(type => {
      const typeKey = type as keyof ControllerConfigMap;
      result[typeKey] = CONTROLLER_CONFIGURATIONS[typeKey].filter(
        config => config.status === 'available'
      );
    });

    return result;
  }

  /**
   * Validate controller parameters against the configuration
   */
  static validateParameters(
    type: keyof ControllerConfigMap,
    implementation: string,
    parameters: { [key: string]: any }
  ): { isValid: boolean; errors: string[] } {
    const config = this.getConfigurationByImplementation(type, implementation);
    if (!config) {
      return { isValid: false, errors: ['Invalid controller configuration'] };
    }

    const errors: string[] = [];

    config.inputFields.forEach(field => {
      const value = parameters[field.name];

      // Check required fields
      if (field.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field.label} is required`);
        return;
      }

      // Skip validation if field is not required and empty
      if (!field.required && (value === undefined || value === null || value === '')) {
        return;
      }

      // Type-specific validation
      if (field.type === 'number' && typeof value !== 'number' && isNaN(Number(value))) {
        errors.push(`${field.label} must be a valid number`);
        return;
      }

      // Validation rules
      if (field.validation) {
        const numValue = Number(value);
        const strValue = String(value);

        if (field.validation.min !== undefined && numValue < field.validation.min) {
          errors.push(`${field.label} must be at least ${field.validation.min}`);
        }

        if (field.validation.max !== undefined && numValue > field.validation.max) {
          errors.push(`${field.label} must be at most ${field.validation.max}`);
        }

        if (field.validation.pattern && !new RegExp(field.validation.pattern).test(strValue)) {
          errors.push(`${field.label} format is invalid`);
        }

        if (field.validation.minLength !== undefined && strValue.length < field.validation.minLength) {
          errors.push(`${field.label} must be at least ${field.validation.minLength} characters`);
        }

        if (field.validation.maxLength !== undefined && strValue.length > field.validation.maxLength) {
          errors.push(`${field.label} must be at most ${field.validation.maxLength} characters`);
        }
      }
    });

    return { isValid: errors.length === 0, errors };
  }
} 
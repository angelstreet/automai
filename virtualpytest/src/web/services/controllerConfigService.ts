import {
  ControllerConfigMap,
  ControllerConfiguration,
  ControllerInputField,
} from '../types/controllerConfigTypes';

/**
 * Controller Configuration Service
 * 
 * This service defines the input field requirements for each controller type and implementation.
 * Based on the VirtualPyTest controller system requirements.
 */

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
      name: 'Android TV (ADB)',
      description: 'Android TV control with ADB',
      implementation: 'android_tv',
      status: 'available',
      inputFields: [
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
      id: 'android_mobile',
      name: 'Android Mobile (ADB)',
      description: 'Android Mobile control with ADB',
      implementation: 'android_mobile',
      status: 'available',
      inputFields: [
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
          description: 'Path to the IR device on the host'
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
      name: 'HDMI Stream (Video Capture)',
      description: 'HDMI video capture via Flask host with video device',
      implementation: 'hdmi_stream',
      status: 'available',
      inputFields: [
        {
          name: 'video_device',
          label: 'Video Capture Device',
          type: 'text',
          required: true,
          defaultValue: '/dev/video0',
          placeholder: '/dev/video0',
          description: 'Path to the video capture device on the host (e.g., /dev/video0, /dev/video1)',
          validation: {
            pattern: '^/dev/video[0-9]+$'
          }
        },
        {
          name: 'stream_path',
          label: 'Stream Output Path',
          type: 'text',
          required: true,
          defaultValue: '/tmp/output.m3u8',
          placeholder: '/tmp/output.m3u8',
          description: 'Path where the stream file will be saved on the host'
        },
        {
          name: 'stream_url',
          label: 'Stream URL',
          type: 'text',
          required: true,
          placeholder: 'http://192.168.1.100:8080/stream.m3u8',
          description: 'URL where the stream can be accessed (HTTP/HTTPS endpoint)'
        },
        {
          name: 'resolution',
          label: 'Video Resolution',
          type: 'select',
          required: false,
          defaultValue: '1920x1080',
          description: 'Video capture resolution',
          options: [
            { value: '1920x1080', label: '1920x1080 (1080p)' },
            { value: '1280x720', label: '1280x720 (720p)' },
            { value: '854x480', label: '854x480 (480p)' },
            { value: '640x360', label: '640x360 (360p)' }
          ]
        },
        {
          name: 'fps',
          label: 'Frame Rate (FPS)',
          type: 'number',
          required: false,
          defaultValue: 30,
          placeholder: '30',
          description: 'Video capture frame rate',
          validation: {
            min: 1,
            max: 60
          }
        },
        {
          name: 'connection_timeout',
          label: 'Connection Timeout (seconds)',
          type: 'number',
          required: false,
          defaultValue: 15,
          placeholder: '15',
          description: 'Timeout for Flask connection and stream setup',
          validation: {
            min: 5,
            max: 120
          }
        }
      ]
    }
  ],
  verification: [
    {
      id: 'adb_verification',
      name: 'ADB Verification',
      description: 'Android Debug Bridge verification via Flask host',
      implementation: 'adb_verification',
      status: 'available',
      inputFields: [
        ...createDeviceIPFields(),
        {
          name: 'verification_timeout',
          label: 'Verification Timeout (seconds)',
          type: 'number',
          required: false,
          defaultValue: 30,
          placeholder: '30',
          description: 'Timeout for verification operations',
          validation: {
            min: 5,
            max: 300
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
      description: 'Smart plug power control via Flask host',
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
      verification: [],
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
/**
 * Controller Configuration Hook
 * 
 * This hook provides controller configuration definitions and validation logic.
 * Based on the VirtualPyTest controller system requirements.
 */

import { useMemo } from 'react';
import {
  ControllerConfigMap,
  ControllerConfiguration,
  ControllerInputField,
} from '../../types/controller/Controller_Types';

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
          required: false,
          defaultValue: '/tmp/video_stream',
          placeholder: '/tmp/video_stream',
          description: 'Directory path where video streams will be saved'
        },
        {
          name: 'resolution',
          label: 'Capture Resolution',
          type: 'select',
          required: false,
          defaultValue: '1920x1080',
          description: 'Video capture resolution',
          options: [
            { value: '1920x1080', label: '1920x1080 (Full HD)' },
            { value: '1280x720', label: '1280x720 (HD)' },
            { value: '3840x2160', label: '3840x2160 (4K)' }
          ]
        },
        {
          name: 'framerate',
          label: 'Frame Rate (fps)',
          type: 'number',
          required: false,
          defaultValue: 30,
          placeholder: '30',
          description: 'Video capture frame rate',
          validation: {
            min: 1,
            max: 60
          }
        }
      ]
    }
  ],
  verification: [
    {
      id: 'opencv_verification',
      name: 'OpenCV Verification',
      description: 'Image verification using OpenCV',
      implementation: 'opencv_verification',
      status: 'available',
      inputFields: [
        {
          name: 'confidence_threshold',
          label: 'Confidence Threshold',
          type: 'number',
          required: false,
          defaultValue: 0.8,
          placeholder: '0.8',
          description: 'Minimum confidence for image matching (0.0-1.0)',
          validation: {
            min: 0.0,
            max: 1.0
          }
        },
        {
          name: 'timeout',
          label: 'Verification Timeout (seconds)',
          type: 'number',
          required: false,
          defaultValue: 10,
          placeholder: '10',
          description: 'Maximum time to wait for verification',
          validation: {
            min: 1,
            max: 300
          }
        }
      ]
    }
  ]
};

export const useControllerConfig = () => {
  // Memoize the configurations to prevent unnecessary re-renders
  const configurations = useMemo(() => CONTROLLER_CONFIGURATIONS, []);

  const getAllConfigurations = (): ControllerConfigMap => {
    console.log('[@hook:useControllerConfig:getAllConfigurations] Getting all controller configurations');
    return configurations;
  };

  const getConfigurationsByType = (type: keyof ControllerConfigMap): ControllerConfiguration[] => {
    console.log(`[@hook:useControllerConfig:getConfigurationsByType] Getting configurations for type: ${type}`);
    return configurations[type] || [];
  };

  const getConfigurationByImplementation = (
    type: keyof ControllerConfigMap, 
    implementation: string
  ): ControllerConfiguration | null => {
    console.log(`[@hook:useControllerConfig:getConfigurationByImplementation] Getting configuration for ${type}:${implementation}`);
    const typeConfigs = configurations[type] || [];
    return typeConfigs.find(config => config.implementation === implementation) || null;
  };

  const getAvailableConfigurations = (): ControllerConfigMap => {
    console.log('[@hook:useControllerConfig:getAvailableConfigurations] Getting available controller configurations');
    const available: ControllerConfigMap = {};
    
    for (const [type, configs] of Object.entries(configurations)) {
      available[type as keyof ControllerConfigMap] = configs.filter(config => config.status === 'available');
    }
    
    return available;
  };

  const validateParameters = (
    type: keyof ControllerConfigMap,
    implementation: string,
    parameters: { [key: string]: any }
  ): { isValid: boolean; errors: string[] } => {
    console.log(`[@hook:useControllerConfig:validateParameters] Validating parameters for ${type}:${implementation}`);
    
    const config = getConfigurationByImplementation(type, implementation);
    if (!config) {
      return {
        isValid: false,
        errors: [`Configuration not found for ${type}:${implementation}`]
      };
    }

    const errors: string[] = [];

    // Validate each required field
    for (const field of config.inputFields) {
      const value = parameters[field.name];
      
      // Check required fields
      if (field.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field.label} is required`);
        continue;
      }
      
      // Skip validation if field is not provided and not required
      if (value === undefined || value === null || value === '') {
        continue;
      }
      
      // Type validation
      if (field.type === 'number') {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          errors.push(`${field.label} must be a valid number`);
          continue;
        }
        
        // Range validation
        if (field.validation?.min !== undefined && numValue < field.validation.min) {
          errors.push(`${field.label} must be at least ${field.validation.min}`);
        }
        if (field.validation?.max !== undefined && numValue > field.validation.max) {
          errors.push(`${field.label} must be at most ${field.validation.max}`);
        }
      }
      
      // Pattern validation
      if (field.validation?.pattern && typeof value === 'string') {
        const regex = new RegExp(field.validation.pattern);
        if (!regex.test(value)) {
          errors.push(`${field.label} format is invalid`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  return useMemo(() => ({
    getAllConfigurations,
    getConfigurationsByType,
    getConfigurationByImplementation,
    getAvailableConfigurations,
    validateParameters,
  }), [configurations]);
}; 
/**
 * Controller Configuration Hook - Minimal Implementation
 */

import {
  ControllerConfigMap,
  ControllerConfiguration,
} from '../../types/controller/Controller_Types';

// Minimal controller configurations - only what's actually used
const CONTROLLER_CONFIGURATIONS: ControllerConfigMap = {
  remote: [
    {
      id: 'android_tv',
      name: 'Android TV',
      description: '',
      implementation: 'android_tv',
      status: 'available',
      inputFields: [],
    },
    {
      id: 'android_mobile',
      name: 'Android Mobile',
      description: '',
      implementation: 'android_mobile',
      status: 'available',
      inputFields: [],
    },
    {
      id: 'appium_remote',
      name: 'Appium Remote',
      description: '',
      implementation: 'appium_remote',
      status: 'available',
      inputFields: [],
    },
  ],
  av: [
    {
      id: 'hdmi_stream',
      name: 'HDMI Stream',
      description: '',
      implementation: 'hdmi_stream',
      status: 'available',
      inputFields: [],
    },
    {
      id: 'vnc_stream',
      name: 'VNC Stream',
      description: '',
      implementation: 'vnc_stream',
      status: 'available',
      inputFields: [],
    },
  ],
  verification: [
    {
      id: 'image',
      name: 'Image',
      description: '',
      implementation: 'image',
      status: 'available',
      inputFields: [],
    },
    {
      id: 'text',
      name: 'Text',
      description: '',
      implementation: 'text',
      status: 'available',
      inputFields: [],
    },
    {
      id: 'appium',
      name: 'Appium',
      description: '',
      implementation: 'appium',
      status: 'available',
      inputFields: [],
    },
  ],
  network: [],
  power: [
    {
      id: 'usb',
      name: 'USB Power',
      description: '',
      implementation: 'usb',
      status: 'available',
      inputFields: [],
    },
  ],
};

export const useControllerConfig = () => {
  const getConfigurationsByType = (type: keyof ControllerConfigMap): ControllerConfiguration[] => {
    return CONTROLLER_CONFIGURATIONS[type] || [];
  };

  const getConfigurationByImplementation = (
    type: keyof ControllerConfigMap,
    implementation: string,
  ): ControllerConfiguration | null => {
    const typeConfigs = CONTROLLER_CONFIGURATIONS[type] || [];
    return typeConfigs.find((config) => config.implementation === implementation) || null;
  };

  const validateParameters = (
    _type: keyof ControllerConfigMap,
    implementation: string,
    _parameters: { [key: string]: any },
  ): { isValid: boolean; errors: string[] } => {
    return implementation
      ? { isValid: true, errors: [] }
      : { isValid: false, errors: ['No implementation'] };
  };

  return {
    getConfigurationsByType,
    getConfigurationByImplementation,
    validateParameters,
  };
};

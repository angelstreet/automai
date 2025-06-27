import { Box, Typography, Alert, Divider } from '@mui/material';
import React from 'react';

import { DeviceFormData } from '../../../types/controller/Controller_Types';

import { ControllerTypeSection } from './DeviceManagement_ControllerTypeSection';

interface ControllerConfigurationStepProps {
  formData: DeviceFormData;
  selectedModel: DeviceModel | null;
  onUpdate: (updates: Partial<DeviceFormData>) => void;
  errors?: { [key: string]: string };
}

export const ControllerConfigurationStep: React.FC<ControllerConfigurationStepProps> = ({
  formData,
  selectedModel,
  onUpdate,
  errors = {},
}) => {
  if (!selectedModel) {
    return (
      <Box sx={{ pt: 1 }}>
        <Alert severity="warning">
          Please select a device model first to configure controllers.
        </Alert>
      </Box>
    );
  }

  const handleControllerConfigUpdate = (
    controllerType: string,
    implementation: string,
    parameters: { [key: string]: any },
  ) => {
    const updatedConfigs = {
      ...formData.controllerConfigs,
      [controllerType]: {
        implementation,
        parameters,
      },
    };
    onUpdate({ controllerConfigs: updatedConfigs });
  };

  // Get active controllers from the model
  const getActiveControllers = () => {
    const activeControllers: Array<{ type: string; value: string }> = [];

    Object.entries(selectedModel.controllers).forEach(([type, value]) => {
      if (value && value !== '') {
        activeControllers.push({ type, value });
      }
    });

    return activeControllers;
  };

  const activeControllers = getActiveControllers();

  if (activeControllers.length === 0) {
    return (
      <Box sx={{ pt: 1 }}>
        <Typography variant="h6" gutterBottom>
          Controller Configuration
        </Typography>
        <Alert severity="info">
          The selected model "{selectedModel.name}" does not have any controllers configured. You
          can still create the device, but no controller functionality will be available.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ pt: 1 }}>
      {activeControllers.map(({ type, value }, index) => (
        <React.Fragment key={type}>
          <ControllerTypeSection
            controllerType={type}
            controllerImplementation={value}
            currentConfig={
              formData.controllerConfigs[type] || { implementation: '', parameters: {} }
            }
            onConfigUpdate={(implementation, parameters) =>
              handleControllerConfigUpdate(type, implementation, parameters)
            }
            errors={errors}
          />

          {/* Add divider between sections except for the last one */}
          {index < activeControllers.length - 1 && <Divider sx={{ my: 3 }} />}
        </React.Fragment>
      ))}
    </Box>
  );
};

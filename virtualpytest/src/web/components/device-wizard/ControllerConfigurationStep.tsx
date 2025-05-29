import React from 'react';
import {
  Box,
  Typography,
  Alert,
  FormHelperText,
  Divider,
} from '@mui/material';
import { Model } from '../../services/deviceModelService';
import { DeviceFormData } from '../../types/controllerConfig.types';
import { ControllerTypeSection } from './ControllerTypeSection';

interface ControllerConfigurationStepProps {
  formData: DeviceFormData;
  selectedModel: Model | null;
  onUpdate: (updates: Partial<DeviceFormData>) => void;
  errors?: { [key: string]: string };
}

export const ControllerConfigurationStep: React.FC<ControllerConfigurationStepProps> = ({
  formData,
  selectedModel,
  onUpdate,
  errors = {}
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
    parameters: { [key: string]: any }
  ) => {
    const updatedConfigs = {
      ...formData.controllerConfigs,
      [controllerType]: {
        implementation,
        parameters
      }
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
          The selected model "{selectedModel.name}" does not have any controllers configured. 
          You can still create the device, but no controller functionality will be available.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ pt: 1 }}>
      <Typography variant="h6" gutterBottom>
        Controller Configuration
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure the controllers for your selected model "{selectedModel.name}". 
        Each controller requires specific connection parameters.
      </Typography>

      {activeControllers.map(({ type, value }, index) => (
        <React.Fragment key={type}>
          <ControllerTypeSection
            controllerType={type}
            controllerImplementation={value}
            currentConfig={formData.controllerConfigs[type] || { implementation: '', parameters: {} }}
            onConfigUpdate={(implementation, parameters) => 
              handleControllerConfigUpdate(type, implementation, parameters)
            }
            errors={errors}
          />
          
          {/* Add divider between sections except for the last one */}
          {index < activeControllers.length - 1 && (
            <Divider sx={{ my: 3 }} />
          )}
        </React.Fragment>
      ))}

      <FormHelperText sx={{ mt: 3, fontSize: '0.875rem' }}>
        <strong>Next:</strong> Review your configuration and create the device.
      </FormHelperText>
    </Box>
  );
}; 
import React from 'react';
import {
  Box,
  TextField,
  Typography,
  FormHelperText,
} from '@mui/material';
import { DeviceFormData } from '../../types/controllerConfig.types';

interface BasicInfoStepProps {
  formData: DeviceFormData;
  onUpdate: (updates: Partial<DeviceFormData>) => void;
  errors?: { [key: string]: string };
}

export const BasicInfoStep: React.FC<BasicInfoStepProps> = ({
  formData,
  onUpdate,
  errors = {}
}) => {
  const handleInputChange = (field: keyof DeviceFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    onUpdate({ [field]: event.target.value });
  };

  return (
    <Box sx={{ pt: 1 }}>
      <Typography variant="h6" gutterBottom>
        Device Information
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Provide basic information about your device. This will help identify and organize your devices.
      </Typography>

      <TextField
        autoFocus
        margin="dense"
        label="Device Name"
        fullWidth
        variant="outlined"
        value={formData.name}
        onChange={handleInputChange('name')}
        sx={{ mb: 2 }}
        size="small"
        placeholder="e.g., Samsung Smart TV Living Room"
        required
        error={!!errors.name}
        helperText={errors.name || 'Choose a descriptive name to easily identify this device'}
      />

      <TextField
        margin="dense"
        label="Description"
        fullWidth
        variant="outlined"
        value={formData.description}
        onChange={handleInputChange('description')}
        sx={{ mb: 2 }}
        size="small"
        placeholder="Optional device description or notes"
        multiline
        rows={3}
        error={!!errors.description}
        helperText={errors.description || 'Add any additional notes about this device (optional)'}
      />

      <FormHelperText sx={{ mt: 2, fontSize: '0.875rem' }}>
        <strong>Next:</strong> You'll select a device model which will determine the available controllers and their configuration requirements.
      </FormHelperText>
    </Box>
  );
}; 
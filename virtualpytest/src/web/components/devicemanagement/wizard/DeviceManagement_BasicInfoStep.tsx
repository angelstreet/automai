import { Box, TextField } from '@mui/material';
import React from 'react';

import { DeviceFormData } from '../../../types/common/Common_BaseTypes';

interface BasicInfoStepProps {
  formData: DeviceFormData;
  onUpdate: (updates: Partial<DeviceFormData>) => void;
  errors?: { [key: string]: string };
}

export const BasicInfoStep: React.FC<BasicInfoStepProps> = ({
  formData,
  onUpdate,
  errors = {},
}) => {
  const handleInputChange =
    (field: keyof DeviceFormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
      onUpdate({ [field]: event.target.value });
    };

  return (
    <Box sx={{ pt: 1 }}>
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
    </Box>
  );
};

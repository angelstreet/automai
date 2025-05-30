import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Alert,
} from '@mui/material';
import { 
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { Model } from '../../services/deviceModelService';
import { DeviceFormData } from '../../types/controllerConfig.types';
import { ControllerConfigService } from '../../services/controllerConfigService';

interface ReviewStepProps {
  formData: DeviceFormData;
  selectedModel: Model | null;
  errors?: { [key: string]: string };
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  formData,
  selectedModel,
  errors = {}
}) => {
  const hasErrors = Object.keys(errors).length > 0;

  const renderControllerSummary = (controllerType: string, config: any) => {
    const controllerConfig = ControllerConfigService.getConfigurationByImplementation(
      controllerType as any,
      config.implementation
    );

    if (!controllerConfig) {
      return (
        <Paper sx={{ p: 2, border: 1, borderColor: 'error.main' }}>
          <Typography color="error">Invalid controller configuration</Typography>
        </Paper>
      );
    }

    const requiredFields = controllerConfig.inputFields.filter(field => field.required);
    const configuredFields = Object.keys(config.parameters).filter(
      key => config.parameters[key] !== '' && config.parameters[key] !== null && config.parameters[key] !== undefined
    );
    const missingRequired = requiredFields.filter(
      field => !configuredFields.includes(field.name) || !config.parameters[field.name]
    );

    return (
      <Paper sx={{ 
        p: 2, 
        border: 1, 
        borderColor: missingRequired.length > 0 ? 'warning.main' : 'success.main'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          {missingRequired.length > 0 ? (
            <WarningIcon color="warning" />
          ) : (
            <CheckIcon color="success" />
          )}
          <Typography variant="h6">
            {controllerType.charAt(0).toUpperCase() + controllerType.slice(1)} Controller
          </Typography>
          <Chip 
            label={controllerConfig.name} 
            size="small" 
            color={missingRequired.length > 0 ? 'warning' : 'success'}
          />
        </Box>

        {missingRequired.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Missing required fields: {missingRequired.map(f => f.label).join(', ')}
          </Alert>
        )}

        <Typography variant="subtitle2" gutterBottom>
          Configuration Parameters:
        </Typography>
        <List dense>
          {controllerConfig.inputFields.map((field) => {
            const value = config.parameters[field.name];
            const hasValue = value !== '' && value !== null && value !== undefined;
            
            return (
              <ListItem key={field.name} sx={{ py: 0.5 }}>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" component="span">
                        {field.label}
                      </Typography>
                      {field.required && (
                        <Chip 
                          label="Required" 
                          size="small" 
                          color={hasValue ? 'success' : 'error'}
                          variant="outlined"
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    hasValue ? (
                      field.type === 'password' ? 
                        '••••••••' : 
                        String(value)
                    ) : (
                      <Typography component="span" color="text.secondary" fontStyle="italic">
                        Not configured
                      </Typography>
                    )
                  }
                />
              </ListItem>
            );
          })}
        </List>
      </Paper>
    );
  };

  return (
    <Box sx={{ pt: 1 }}>
      <Typography variant="h6" gutterBottom>
        Review Configuration
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Review your device configuration before creating the device. Make sure all required fields are filled.
      </Typography>

      {hasErrors && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Please fix the errors in the previous steps before creating the device.
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Basic Information */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Device Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Name:</Typography>
                <Typography variant="body2" color="text.secondary">
                  {formData.name || 'Not specified'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Model:</Typography>
                <Typography variant="body2" color="text.secondary">
                  {formData.model || 'Not selected'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Description:</Typography>
                <Typography variant="body2" color="text.secondary">
                  {formData.description || 'No description provided'}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Model Information */}
        {selectedModel && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Model Details
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Types:</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {selectedModel.types.map((type) => (
                      <Chip key={type} label={type} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                    ))}
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Version:</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedModel.version || 'Not specified'}
                  </Typography>
                </Grid>
                {selectedModel.description && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2">Description:</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedModel.description}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>
          </Grid>
        )}

        {/* Controllers Configuration */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            Controllers Configuration
          </Typography>
          {Object.keys(formData.controllerConfigs).length === 0 ? (
            <Alert severity="info">
              No controllers configured. The device will be created without controller functionality.
            </Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {Object.entries(formData.controllerConfigs).map(([controllerType, config]) => (
                <div key={controllerType}>
                  {renderControllerSummary(controllerType, config)}
                </div>
              ))}
            </Box>
          )}
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      <Alert severity={hasErrors ? 'error' : 'success'} sx={{ mt: 2 }}>
        {hasErrors ? (
          <Typography>
            <strong>Configuration incomplete:</strong> Please go back and fix the errors before creating the device.
          </Typography>
        ) : (
          <Typography>
            <strong>Ready to create:</strong> Your device configuration is complete and ready for creation.
          </Typography>
        )}
      </Alert>
    </Box>
  );
}; 
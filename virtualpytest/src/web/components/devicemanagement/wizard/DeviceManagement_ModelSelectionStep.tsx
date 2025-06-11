import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Chip,
  FormHelperText,
} from '@mui/material';
import { DeviceModel, DeviceFormData } from '../../../types/common/Common_BaseTypes';

interface ModelSelectionStepProps {
  formData: DeviceFormData;
  onUpdate: (updates: Partial<DeviceFormData>) => void;
  onModelSelected: (model: DeviceModel | null) => void;
  errors?: { [key: string]: string };
}

export const ModelSelectionStep: React.FC<ModelSelectionStepProps> = ({
  formData,
  onUpdate,
  onModelSelected,
  errors = {}
}) => {
  const [deviceModels, setDeviceModels] = useState<DeviceModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [selectedModelDetails, setSelectedModelDetails] = useState<DeviceModel | null>(null);

  // Fetch device models using server API
  useEffect(() => {
    const fetchModels = async () => {
      setLoadingModels(true);
      setModelsError(null);
      try {
        console.log('[@component:ModelSelectionStep] Fetching device models');
        
        const response = await fetch('/server/devicemodel/getAllModels');
        if (!response.ok) {
          throw new Error(`Failed to fetch device models: ${response.status} ${response.statusText}`);
        }
        
        const models = await response.json();
        setDeviceModels(models || []);
        console.log(`[@component:ModelSelectionStep] Loaded ${models?.length || 0} device models`);
      } catch (error) {
        console.error('[@component:ModelSelectionStep] Error fetching device models:', error);
        setModelsError('Failed to load device models');
        setDeviceModels([]);
      } finally {
        setLoadingModels(false);
      }
    };

    fetchModels();
  }, []); // Only fetch on mount

  // Update selected model details when model changes
  useEffect(() => {
    if (formData.model && deviceModels.length > 0) {
      const selectedModel = deviceModels.find(model => model.name === formData.model);
      setSelectedModelDetails(selectedModel || null);
      onModelSelected(selectedModel || null);
    } else {
      setSelectedModelDetails(null);
      onModelSelected(null);
    }
  }, [formData.model, deviceModels, onModelSelected]);

  const handleModelChange = (event: any) => {
    const modelName = event.target.value;
    onUpdate({ model: modelName });
    
    // Reset controller configurations when model changes
    onUpdate({ controllerConfigs: {} });
  };

  const getControllerDisplayValue = (controllers: DeviceModel['controllers']) => {
    const activeControllers = Object.entries(controllers)
      .filter(([_, value]) => value && value !== '')
      .map(([type, value]) => ({ type, value }));
    
    return activeControllers;
  };

  return (
    <Box sx={{ pt: 1 }}>

      {modelsError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {modelsError}
        </Alert>
      )}

      {loadingModels ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
          <CircularProgress size={24} />
          <Typography variant="body2" sx={{ ml: 2 }}>
            Loading device models...
          </Typography>
        </Box>
      ) : (
        <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
          <InputLabel size="small">Device Model</InputLabel>
          <Select
            size="small"
            value={formData.model}
            onChange={handleModelChange}
            label="Device Model"
            error={!!errors.model}
          >
            <MenuItem value="">
              <em>Select a device model</em>
            </MenuItem>
            {deviceModels.map((model) => (
              <MenuItem key={model.id} value={model.name}>
                <Box>
                  <Typography variant="body2" component="span">
                    {model.name}
                  </Typography>
                  {model.description && (
                    <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                      - {model.description}
                    </Typography>
                  )}
                </Box>
              </MenuItem>
            ))}
          </Select>
          {errors.model && (
            <FormHelperText error>{errors.model}</FormHelperText>
          )}
        </FormControl>
      )}

      {/* Display selected model details */}
      {selectedModelDetails && (
        <Box sx={{ mt: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Selected Model: {selectedModelDetails.name}
          </Typography>
          
          {selectedModelDetails.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {selectedModelDetails.description}
            </Typography>
          )}

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Supported Types:
          </Typography>
          <Box sx={{ mb: 2 }}>
            {selectedModelDetails.types.map((type) => (
              <Chip key={type} label={type} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
            ))}
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Available Controllers:
          </Typography>
          <Box>
            {getControllerDisplayValue(selectedModelDetails.controllers).map(({ type, value }) => (
              <Chip
                key={type}
                label={`${type.toUpperCase()}: ${value}`}
                size="small"
                variant="outlined"
                sx={{ mr: 0.5, mb: 0.5 }}
              />
            ))}
          </Box>

          {selectedModelDetails.version && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Version: {selectedModelDetails.version}
            </Typography>
          )}
        </Box>
      )}

    </Box>
  );
}; 
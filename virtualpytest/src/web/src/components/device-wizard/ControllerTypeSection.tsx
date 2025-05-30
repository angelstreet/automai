import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Chip,
  FormHelperText,
} from '@mui/material';
import { 
  Settings as SettingsIcon,
  SportsEsports as RemoteIcon,
  Tv as AVIcon,
  Wifi as NetworkIcon,
  Power as PowerIcon,
} from '@mui/icons-material';
import { ControllerConfigService } from '../../services/controllerConfigService';
import { ControllerConfiguration } from '../../types/controllerConfig.types';
import { DynamicControllerForm } from './DynamicControllerForm';

interface ControllerTypeSectionProps {
  controllerType: string;
  controllerImplementation: string;
  currentConfig: {
    implementation: string;
    parameters: { [key: string]: any };
  };
  onConfigUpdate: (implementation: string, parameters: { [key: string]: any }) => void;
  errors?: { [key: string]: string };
}

export const ControllerTypeSection: React.FC<ControllerTypeSectionProps> = ({
  controllerType,
  controllerImplementation,
  currentConfig,
  onConfigUpdate,
  errors = {}
}) => {
  const [availableConfigs, setAvailableConfigs] = useState<ControllerConfiguration[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<ControllerConfiguration | null>(null);

  // Load available configurations for this controller type
  useEffect(() => {
    const configs = ControllerConfigService.getConfigurationsByType(
      controllerType as 'remote' | 'av' | 'network' | 'power'
    );
    
    // Remove status filtering - show all controllers regardless of status
    setAvailableConfigs(configs);

    // Auto-select if there's a matching implementation or only one option
    if (controllerImplementation && configs.length > 0) {
      const matchingConfig = configs.find(config => 
        config.implementation === controllerImplementation
      );
      if (matchingConfig) {
        setSelectedConfig(matchingConfig);
        
        // Initialize with default values if no current config
        if (!currentConfig.implementation) {
          const defaultParams: { [key: string]: any } = {};
          matchingConfig.inputFields.forEach(field => {
            if (field.defaultValue !== undefined) {
              defaultParams[field.name] = field.defaultValue;
            }
          });
          onConfigUpdate(matchingConfig.implementation, defaultParams);
        }
      }
    } else if (configs.length === 1) {
      // Auto-select if only one option
      const config = configs[0];
      setSelectedConfig(config);
      
      if (!currentConfig.implementation) {
        const defaultParams: { [key: string]: any } = {};
        config.inputFields.forEach(field => {
          if (field.defaultValue !== undefined) {
            defaultParams[field.name] = field.defaultValue;
          }
        });
        onConfigUpdate(config.implementation, defaultParams);
      }
    }
  }, [controllerType, controllerImplementation, currentConfig.implementation, onConfigUpdate]);

  const handleImplementationChange = (event: any) => {
    const implementation = event.target.value;
    const config = availableConfigs.find(c => c.implementation === implementation);
    
    if (config) {
      setSelectedConfig(config);
      
      // Initialize with default values
      const defaultParams: { [key: string]: any } = {};
      config.inputFields.forEach(field => {
        if (field.defaultValue !== undefined) {
          defaultParams[field.name] = field.defaultValue;
        }
      });
      
      onConfigUpdate(implementation, defaultParams);
    }
  };

  const handleParametersChange = (parameters: { [key: string]: any }) => {
    if (selectedConfig) {
      onConfigUpdate(selectedConfig.implementation, parameters);
    }
  };

  // Get icon for controller type
  const getControllerIcon = () => {
    switch (controllerType) {
      case 'remote':
        return <RemoteIcon sx={{ fontSize: 20 }} />;
      case 'av':
        return <AVIcon sx={{ fontSize: 20 }} />;
      case 'network':
        return <NetworkIcon sx={{ fontSize: 20 }} />;
      case 'power':
        return <PowerIcon sx={{ fontSize: 20 }} />;
      default:
        return <SettingsIcon sx={{ fontSize: 20 }} />;
    }
  };

  // Format controller type display name
  const getControllerTypeDisplayName = () => {
    switch (controllerType) {
      case 'remote':
        return 'Remote Controller';
      case 'av':
        return 'Audio/Video Controller';
      case 'network':
        return 'Network Controller';
      case 'power':
        return 'Power Controller';
      default:
        return `${controllerType.charAt(0).toUpperCase() + controllerType.slice(1)} Controller`;
    }
  };

  if (availableConfigs.length === 0) {
    return (
      <Paper sx={{ p: 2, border: 1, borderColor: 'warning.main' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          {getControllerIcon()}
          <Typography variant="subtitle1" color="text.secondary">
            {getControllerTypeDisplayName()}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          No implementations found for this controller type.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2, border: 1, borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        {getControllerIcon()}
        <Typography variant="subtitle1">
          {getControllerTypeDisplayName()}
        </Typography>
      </Box>

      {availableConfigs.length > 1 ? (
        <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
          <InputLabel size="small">Implementation</InputLabel>
          <Select
            size="small"
            value={currentConfig.implementation || ''}
            onChange={handleImplementationChange}
            label="Implementation"
            error={!!errors[`${controllerType}_implementation`]}
          >
            <MenuItem value="">
              <em>Select implementation</em>
            </MenuItem>
            {availableConfigs.map((config) => (
              <MenuItem key={config.id} value={config.implementation}>
                <Box>
                  <Typography variant="body2" component="span">
                    {config.name}
                  </Typography>
                  <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                    - {config.description}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
          {errors[`${controllerType}_implementation`] && (
            <FormHelperText error>{errors[`${controllerType}_implementation`]}</FormHelperText>
          )}
        </FormControl>
      ) : (
        <Box sx={{ mb: 2, p: 1.5, border: 1, borderColor: 'primary.main', borderRadius: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
            {availableConfigs[0].name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {availableConfigs[0].description}
          </Typography>
        </Box>
      )}

      {selectedConfig && (
        <DynamicControllerForm
          configuration={selectedConfig}
          parameters={currentConfig.parameters}
          onParametersChange={handleParametersChange}
          errors={errors}
          fieldPrefix={`${controllerType}_`}
        />
      )}
    </Paper>
  );
}; 
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { 
  ArrowBack as BackIcon,
  ArrowForward as NextIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { Model } from '../services/deviceModelService';
import { DeviceFormData } from '../types/controllerConfig.types';
import { ControllerConfigService } from '../services/controllerConfigService';

// Import wizard step components
import { BasicInfoStep } from './device-wizard/BasicInfoStep';
import { ModelSelectionStep } from './device-wizard/ModelSelectionStep';
import { ControllerConfigurationStep } from './device-wizard/ControllerConfigurationStep';
import { ReviewStep } from './device-wizard/ReviewStep';

interface Device {
  id: string;
  name: string;
  description: string;
  model: string;
  created_at: string;
  updated_at: string;
}

interface CreateDeviceDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (device: Omit<Device, 'id' | 'created_at' | 'updated_at'>) => void;
  error?: string | null;
}

const CreateDeviceDialog: React.FC<CreateDeviceDialogProps> = ({
  open,
  onClose,
  onSubmit,
  error,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Wizard state
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  // Form data
  const [formData, setFormData] = useState<DeviceFormData>({
    name: '',
    description: '',
    model: '',
    controllerConfigs: {}
  });

  const steps = [
    {
      label: 'Basic Information',
      description: 'Device name and description',
    },
    {
      label: 'Select Model',
      description: 'Choose device model',
    },
    {
      label: 'Configure Controllers',
      description: 'Set up controller connections',
    },
    {
      label: 'Review & Create',
      description: 'Review configuration',
    },
  ];

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setActiveStep(0);
      setFormData({
        name: '',
        description: '',
        model: '',
        controllerConfigs: {}
      });
      setSelectedModel(null);
      setFormErrors({});
      setIsSubmitting(false);
    }
  }, [open]);

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const handleFormDataUpdate = (updates: Partial<DeviceFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    
    // Clear related errors when data is updated
    const updatedErrors = { ...formErrors };
    Object.keys(updates).forEach(key => {
      delete updatedErrors[key];
    });
    setFormErrors(updatedErrors);
  };

  const validateStep = (step: number): boolean => {
    const errors: { [key: string]: string } = {};

    switch (step) {
      case 0: // Basic Information
        if (!formData.name.trim()) {
          errors.name = 'Device name is required';
        }
        break;

      case 1: // Model Selection
        if (!formData.model) {
          errors.model = 'Please select a device model';
        }
        break;

      case 2: // Controller Configuration
        // Validate each controller configuration
        Object.entries(formData.controllerConfigs).forEach(([controllerType, config]) => {
          if (config.implementation) {
            const validation = ControllerConfigService.validateParameters(
              controllerType as any,
              config.implementation,
              config.parameters
            );
            
            if (!validation.isValid) {
              validation.errors.forEach((errorMsg, index) => {
                errors[`${controllerType}_param_${index}`] = errorMsg;
              });
            }
          }
        });
        break;

      case 3: // Review
        // Final validation - all previous steps
        if (!formData.name.trim()) errors.name = 'Device name is required';
        if (!formData.model) errors.model = 'Device model is required';
        break;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      if (activeStep < steps.length - 1) {
        setActiveStep(activeStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
      // Clear validation errors when going back
      setFormErrors({});
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(activeStep)) {
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Convert our form data to the expected format with controller configurations
      const deviceData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        model: formData.model,
        controllerConfigs: formData.controllerConfigs, // Include controller configurations
      };

      console.log('[@component:CreateDeviceDialog] Creating device with data:', deviceData);
      console.log('[@component:CreateDeviceDialog] Controller configs detail:', JSON.stringify(formData.controllerConfigs, null, 2));
      await onSubmit(deviceData as any);
      
    } catch (err) {
      console.error('[@component:CreateDeviceDialog] Error creating device:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <BasicInfoStep
            formData={formData}
            onUpdate={handleFormDataUpdate}
            errors={formErrors}
          />
        );
      case 1:
        return (
          <ModelSelectionStep
            formData={formData}
            onUpdate={handleFormDataUpdate}
            onModelSelected={setSelectedModel}
            errors={formErrors}
          />
        );
      case 2:
        return (
          <ControllerConfigurationStep
            formData={formData}
            selectedModel={selectedModel}
            onUpdate={handleFormDataUpdate}
            errors={formErrors}
          />
        );
      case 3:
        return (
          <ReviewStep
            formData={formData}
            selectedModel={selectedModel}
            errors={formErrors}
          />
        );
      default:
        return null;
    }
  };

  const isStepComplete = (step: number): boolean => {
    switch (step) {
      case 0:
        return !!formData.name.trim();
      case 1:
        return !!formData.model;
      case 2:
        return Object.keys(formData.controllerConfigs).length > 0 || 
               Boolean(selectedModel && Object.values(selectedModel.controllers).every(c => !c || c === ''));
      case 3:
        return Object.keys(formErrors).length === 0;
      default:
        return false;
    }
  };

  const canProceed = isStepComplete(activeStep);

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="lg" 
      fullWidth
      fullScreen={isMobile}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h5">Add New Device</Typography>
      
      </DialogTitle>

      <DialogContent sx={{ pt: 1, mb: 0.5 }}>
        <Box sx={{ width: '100%' }}>
          {/* Stepper */}
          <Stepper 
            activeStep={activeStep} 
            orientation={isMobile ? 'vertical' : 'horizontal'}
            sx={{ mb: 0 }}
          >
            {steps.map((step, index) => (
              <Step key={step.label} completed={isStepComplete(index)}>
                <StepLabel>
                  <Typography variant="subtitle2">{step.label}</Typography>
              
                </StepLabel>
                {isMobile && (
                  <StepContent>
                    {index === activeStep && renderStepContent(activeStep)}
                  </StepContent>
                )}
              </Step>
            ))}
          </Stepper>

          {/* Step Content for non-mobile */}
          {!isMobile && (
            <Box sx={{ mt: 1.5, mb: 1.5, minHeight: 200 }}>
              {renderStepContent(activeStep)}
            </Box>
          )}

          {/* Validation Errors Display */}
          {Object.keys(formErrors).length > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Please review the following issues:
              </Typography>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {Object.values(formErrors).map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </Alert>
          )}

          {/* Error Display */}
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
        <Button onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        
        {activeStep > 0 && (
          <Button
            onClick={handleBack}
            disabled={isSubmitting}
            startIcon={<BackIcon />}
          >
            Back
          </Button>
        )}

        {activeStep < steps.length - 1 ? (
          <Button
            onClick={handleNext}
            variant="contained"
            disabled={!canProceed}
            endIcon={<NextIcon />}
          >
            Next
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.name.trim() || !formData.model || isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={16} /> : <CheckIcon />}
          >
            {isSubmitting ? 'Creating...' : 'Create Device'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CreateDeviceDialog; 
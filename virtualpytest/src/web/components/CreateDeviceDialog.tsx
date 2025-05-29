import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import { deviceModelApi } from '../services/deviceModelService';

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
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    model: '',
  });
  
  const [deviceModels, setDeviceModels] = useState<any[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  // Fetch device models when dialog opens
  useEffect(() => {
    const fetchModels = async () => {
      if (!open) return;
      
      setLoadingModels(true);
      setModelsError(null);
      try {
        console.log('[@component:CreateDeviceDialog] Fetching device models');
        const models = await deviceModelApi.getAllDeviceModels();
        setDeviceModels(models);
        console.log(`[@component:CreateDeviceDialog] Loaded ${models.length} device models`);
      } catch (error) {
        console.error('[@component:CreateDeviceDialog] Error fetching device models:', error);
        setModelsError('Failed to load device models');
        setDeviceModels([]);
      } finally {
        setLoadingModels(false);
      }
    };

    fetchModels();
  }, [open]);

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      model: '',
    });
    onClose();
  };

  const handleSubmit = () => {
    onSubmit(formData);
  };

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [field]: event.target.value,
    });
  };

  const handleModelChange = (event: any) => {
    setFormData({
      ...formData,
      model: event.target.value,
    });
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>Add New Device</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Box sx={{ pt: 0.5 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            variant="outlined"
            value={formData.name}
            onChange={handleInputChange('name')}
            sx={{ mb: 1.5 }}
            size="small"
            placeholder="e.g., Test Device 1"
            required
          />

          <TextField
            margin="dense"
            label="Description"
            fullWidth
            variant="outlined"
            value={formData.description}
            onChange={handleInputChange('description')}
            sx={{ mb: 1.5 }}
            size="small"
            placeholder="Optional device description"
            multiline
            rows={2}
          />

          {/* Device Model Selection */}
          <Typography variant="subtitle2" sx={{ mb: 1, mt: 2, fontWeight: 'bold' }}>
            Device Model (Optional)
          </Typography>
          
          {modelsError && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {modelsError}
            </Alert>
          )}

          {loadingModels ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <FormControl fullWidth margin="dense" sx={{ mb: 1.5 }}>
              <InputLabel size="small">Model</InputLabel>
              <Select
                size="small"
                value={formData.model}
                onChange={handleModelChange}
                label="Model"
              >
                <MenuItem value="">
                  <em>No model selected</em>
                </MenuItem>
                {deviceModels.map((model) => (
                  <MenuItem key={model.id} value={model.name}>
                    {model.name}
                    {model.description && (
                      <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                        - {model.description}
                      </Typography>
                    )}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} color="inherit">
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={!formData.name.trim()}
        >
          Add Device
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateDeviceDialog; 
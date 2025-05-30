import React, { useState } from 'react';
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
  Chip,
  OutlinedInput,
  SelectChangeEvent,
  Checkbox,
  ListItemText,
  Grid,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useControllers } from '../../hooks/useControllers';

interface Model {
  id: string;
  name: string;
  types: string[];
  controllers: {
    remote: string;
    av: string;
    network: string;
    power: string;
  };
  version: string;
  description: string;
}

interface CreateModelDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (model: Omit<Model, 'id'>) => void;
  error?: string | null;
}

const modelTypes = [
  'Android Phone',
  'Android TV',
  'Android Tablet',
  'iOs Phone',
  'iOs Tablet',
  'Fire TV',
  'Nvidia Shield',
  'Apple TV',
  'STB',
  'Linux',
  'Windows',
  'Tizen TV',
  'LG TV',
];

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const CreateModelDialog: React.FC<CreateModelDialogProps> = ({
  open,
  onClose,
  onSubmit,
  error,
}) => {
  const { controllerTypes, loading: controllersLoading, error: controllersError } = useControllers();
  
  const [formData, setFormData] = useState({
    name: '',
    types: [] as string[],
    controllers: {
      remote: '',
      av: '',
      network: '',
      power: '',
    },
    version: '',
    description: '',
  });

  const handleClose = () => {
    setFormData({
      name: '',
      types: [],
      controllers: {
        remote: '',
        av: '',
        network: '',
        power: '',
      },
      version: '',
      description: '',
    });
    onClose();
  };

  const handleSubmit = () => {
    onSubmit(formData);
  };

  const handleTypeChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setFormData({
      ...formData,
      types: typeof value === 'string' ? value.split(',') : value,
    });
  };

  const handleControllerChange = (controllerType: string) => (event: SelectChangeEvent<string>) => {
    setFormData({
      ...formData,
      controllers: {
        ...formData.controllers,
        [controllerType]: event.target.value,
      },
    });
  };

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [field]: event.target.value,
    });
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>Add New Device Model</DialogTitle>
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
            placeholder="e.g., Samsung Galaxy S21"
            required
          />

          <FormControl fullWidth margin="dense" sx={{ mb: 1.5 }}>
            <InputLabel size="small">Types *</InputLabel>
            <Select
              multiple
              size="small"
              value={formData.types}
              onChange={handleTypeChange}
              input={<OutlinedInput label="Types *" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </Box>
              )}
              MenuProps={MenuProps}
            >
              {modelTypes.map((type) => (
                <MenuItem key={type} value={type}>
                  <Checkbox checked={formData.types.indexOf(type) > -1} />
                  <ListItemText primary={type} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Controllers Section */}
          <Typography variant="subtitle2" sx={{ mb: 1, mt: 2, fontWeight: 'bold' }}>
            Controllers (Optional)
          </Typography>
          
          {controllersError && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Unable to load controllers: {controllersError}
            </Alert>
          )}

          {controllersLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <Grid container spacing={2}>
              {/* Remote Controller */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Remote Controller</InputLabel>
                  <Select
                    value={formData.controllers.remote}
                    onChange={handleControllerChange('remote')}
                    label="Remote Controller"
                  >
                    <MenuItem value="">None</MenuItem>
                    {controllerTypes?.remote
                      ?.filter(controller => controller.status === 'available')
                      .map((controller) => (
                        <MenuItem key={controller.id} value={controller.id}>
                          {controller.name}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Audio/Video Controller */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Audio/Video Controller</InputLabel>
                  <Select
                    value={formData.controllers.av}
                    onChange={handleControllerChange('av')}
                    label="Audio/Video Controller"
                  >
                    <MenuItem value="">None</MenuItem>
                    {controllerTypes?.av
                      ?.filter(controller => controller.status === 'available')
                      .map((controller) => (
                        <MenuItem key={controller.id} value={controller.id}>
                          {controller.name}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Network Controller */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Network Controller</InputLabel>
                  <Select
                    value={formData.controllers.network}
                    onChange={handleControllerChange('network')}
                    label="Network Controller"
                  >
                    <MenuItem value="">None</MenuItem>
                    {controllerTypes?.network
                      ?.filter(controller => controller.status === 'available')
                      .map((controller) => (
                        <MenuItem key={controller.id} value={controller.id}>
                          {controller.name}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Power Controller */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Power Controller</InputLabel>
                  <Select
                    value={formData.controllers.power}
                    onChange={handleControllerChange('power')}
                    label="Power Controller"
                  >
                    <MenuItem value="">None</MenuItem>
                    {controllerTypes?.power
                      ?.filter(controller => controller.status === 'available')
                      .map((controller) => (
                        <MenuItem key={controller.id} value={controller.id}>
                          {controller.name}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          )}

          <TextField
            margin="dense"
            label="Version"
            fullWidth
            variant="outlined"
            value={formData.version}
            onChange={handleInputChange('version')}
            sx={{ mb: 1.5, mt: 2 }}
            size="small"
            placeholder="e.g., 12.0, Android 11"
          />

          <TextField
            margin="dense"
            label="Description"
            fullWidth
            variant="outlined"
            value={formData.description}
            onChange={handleInputChange('description')}
            size="small"
            placeholder="Additional specifications or notes"
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ pt: 1, pb: 2 }}>
        <Button onClick={handleClose} size="small">
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" size="small">
          Add Model
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateModelDialog; 
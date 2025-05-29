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
} from '@mui/material';

interface Model {
  id: string;
  name: string;
  types: string[];
  controllers: string[];
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

const controllerTypes = [
  'Audio Video Controller',
  'Power Controller',
  'Remote Controller',
  'Network Controller',
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
  const [formData, setFormData] = useState({
    name: '',
    types: [] as string[],
    controllers: [] as string[],
    version: '',
    description: '',
  });

  const handleClose = () => {
    setFormData({
      name: '',
      types: [],
      controllers: [],
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

  const handleControllerChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setFormData({
      ...formData,
      controllers: typeof value === 'string' ? value.split(',') : value,
    });
  };

  const handleInputChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [field]: event.target.value,
    });
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
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

          <FormControl fullWidth margin="dense" sx={{ mb: 1.5 }}>
            <InputLabel size="small">Controllers</InputLabel>
            <Select
              multiple
              size="small"
              value={formData.controllers}
              onChange={handleControllerChange}
              input={<OutlinedInput label="Controllers" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => (
                    <Chip key={value} label={value} size="small" color="primary" variant="outlined" />
                  ))}
                </Box>
              )}
              MenuProps={MenuProps}
            >
              {controllerTypes.map((controller) => (
                <MenuItem key={controller} value={controller}>
                  <Checkbox checked={formData.controllers.indexOf(controller) > -1} />
                  <ListItemText primary={controller} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            margin="dense"
            label="Version"
            fullWidth
            variant="outlined"
            value={formData.version}
            onChange={handleInputChange('version')}
            sx={{ mb: 1.5 }}
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
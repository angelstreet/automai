import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  DevicesOther as DeviceIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  IconButton,
  Alert,
  Chip,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  OutlinedInput,
  SelectChangeEvent,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import React, { useState, useEffect } from 'react';
import { CreateModelDialog } from '../components/models/Models_CreateDialog';
import { DeviceModel, DeviceModelCreatePayload } from '../types';

const modelTypes = [
  'Android Mobile',
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

const Models: React.FC = () => {
  const [models, setModels] = useState<DeviceModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ 
    name: '', 
    types: [] as string[], 
    controllers: {
      remote: '',
      av: '',
      network: '',
      power: '',
    },
    version: '', 
    description: '' 
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load device models on component mount only
  useEffect(() => {
    loadDeviceModels();
  }, []);

  const loadDeviceModels = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/server/devicemodel/get-devicemodels');
      if (!response.ok) {
        throw new Error(`Failed to fetch device models: ${response.status} ${response.statusText}`);
      }
      
      const modelsData = await response.json();
      setModels(modelsData || []);
      console.log('[@component:Models] Successfully loaded device models:', modelsData?.length || 0);
    } catch (err) {
      console.error('[@component:Models] Error loading device models:', err);
      setError(err instanceof Error ? err.message : 'Failed to load device models');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (model: DeviceModel) => {
    setEditingId(model.id);
    setEditForm({
      name: model.name,
      types: model.types,
      controllers: {
        remote: model.controllers.remote || '',
        av: model.controllers.av || '',
        network: model.controllers.network || '',
        power: model.controllers.power || '',
      },
      version: model.version,
      description: model.description,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    
    if (!editForm.name.trim() || editForm.types.length === 0) {
      setError('Name and at least one Type are required');
      return;
    }

    // Check for duplicate names (excluding current item)
    const isDuplicate = models.some(
      (m) => m.id !== editingId && m.name.toLowerCase() === editForm.name.toLowerCase().trim()
    );
    
    if (isDuplicate) {
      setError('A model with this name already exists');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch(`/server/devicemodel/update-devicemodel/${editingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editForm.name.trim(),
          types: editForm.types,
          controllers: editForm.controllers,
          version: editForm.version.trim(),
          description: editForm.description.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update device model: ${response.status}`);
      }

      const result = await response.json();
      const updatedModel: DeviceModel = result.model;

      // Update local state
      setModels(models.map(m => m.id === editingId ? updatedModel : m));
      setEditingId(null);
      setSuccessMessage('Device model updated successfully');
      console.log('[@component:Models] Successfully updated device model:', updatedModel.name);
    } catch (err) {
      console.error('[@component:Models] Error updating device model:', err);
      setError(err instanceof Error ? err.message : 'Failed to update device model');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({ 
      name: '', 
      types: [], 
      controllers: {
        remote: '',
        av: '',
        network: '',
        power: '',
      }, 
      version: '', 
      description: '' 
    });
    setError(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this device model?')) {
      return;
    }

    try {
      setError(null);
      
      const response = await fetch(`/server/devicemodel/delete-devicemodel/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete device model: ${response.status}`);
      }

      // Update local state
      setModels(models.filter(m => m.id !== id));
      setSuccessMessage('Device model deleted successfully');
      console.log('[@component:Models] Successfully deleted device model');
    } catch (err) {
      console.error('[@component:Models] Error deleting device model:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete device model');
    }
  };

  const handleAddNew = async (newModelData: Omit<DeviceModel, 'id'>) => {
    if (!newModelData.name.trim() || newModelData.types.length === 0) {
      setError('Name and at least one Type are required');
      return;
    }

    // Check for duplicate names
    const isDuplicate = models.some(
      (m) => m.name.toLowerCase() === newModelData.name.toLowerCase().trim()
    );
    
    if (isDuplicate) {
      setError('A model with this name already exists');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch('/server/devicemodel/create-devicemodel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newModelData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to create device model: ${response.status}`);
      }

      const result = await response.json();
      const createdModel: DeviceModel = result.model;

      // Update local state
      setModels([...models, createdModel]);
      setOpenDialog(false);
      setSuccessMessage('Device model created successfully');
      console.log('[@component:Models] Successfully created device model:', createdModel.name);
    } catch (err) {
      console.error('[@component:Models] Error creating device model:', err);
      setError(err instanceof Error ? err.message : 'Failed to create device model');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setError(null);
  };

  const handleTypeChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setEditForm({
      ...editForm,
      types: typeof value === 'string' ? value.split(',') : value,
    });
  };

  // Helper function to get controller display names
  const getControllerDisplayValue = (controllers: DeviceModel['controllers']) => {
    const activeControllers = Object.entries(controllers)
      .filter(([_, value]) => value && value !== '')
      .map(([type, value]) => ({ type, value }));
    
    return activeControllers;
  };

  // Loading state component
  const LoadingState = () => (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        py: 8,
        textAlign: 'center'
      }}
    >
      <CircularProgress size={40} sx={{ mb: 2 }} />
      <Typography variant="h6" color="text.secondary">
        Loading Device Models...
      </Typography>
    </Box>
  );

  // Empty state component
  const EmptyState = () => (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        py: 8,
        textAlign: 'center'
      }}
    >
      <DeviceIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
      <Typography variant="h6" color="text.secondary" gutterBottom>
        No Models Created
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400 }}>
        Create your first device model to define hardware specifications and capabilities for your test automation.
      </Typography>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => setOpenDialog(true)}
        disabled={submitting}
      >
        Create Your First Model
      </Button>
    </Box>
  );

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Device Models
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Manage device models and their specifications for test automation.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          size="small"
          disabled={submitting || loading}
        >
          {submitting ? 'Creating...' : 'Add Model'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card sx={{ boxShadow: 1 }}>
        <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
          {loading ? (
            <LoadingState />
          ) : models.length === 0 ? (
            <EmptyState />
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ boxShadow: 'none' }}>
              <Table 
                size="small" 
                sx={{ 
                  '& .MuiTableCell-root': { py: 0.5, px: 1 },
                  '& .MuiTableRow-root:hover': {
                    backgroundColor: (theme) => 
                      theme.palette.mode === 'dark' 
                        ? 'rgba(255, 255, 255, 0.08) !important' 
                        : 'rgba(0, 0, 0, 0.04) !important'
                  }
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Name</strong></TableCell>
                    <TableCell><strong>Types</strong></TableCell>
                    <TableCell><strong>Controllers</strong></TableCell>
                    <TableCell><strong>Version</strong></TableCell>
                    <TableCell><strong>Description</strong></TableCell>
                    <TableCell align="center"><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {models.map((model) => (
                    <TableRow key={model.id}>
                      <TableCell>
                        {editingId === model.id ? (
                          <TextField
                            size="small"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            fullWidth
                            variant="outlined"
                            sx={{ '& .MuiInputBase-root': { height: '32px' } }}
                          />
                        ) : (
                          model.name
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === model.id ? (
                          <FormControl size="small" fullWidth>
                            <Select
                              multiple
                              value={editForm.types}
                              onChange={handleTypeChange}
                              input={<OutlinedInput />}
                              renderValue={(selected) => (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                  {selected.map((value) => (
                                    <Chip key={value} label={value} size="small" />
                                  ))}
                                </Box>
                              )}
                              MenuProps={MenuProps}
                              sx={{ '& .MuiInputBase-root': { minHeight: '32px' } }}
                            >
                              {modelTypes.map((type) => (
                                <MenuItem key={type} value={type}>
                                  <Checkbox checked={editForm.types.indexOf(type) > -1} />
                                  <ListItemText primary={type} />
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        ) : (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {model.types.map((type) => (
                              <Chip key={type} label={type} size="small" variant="outlined" />
                            ))}
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === model.id ? (
                          <Typography variant="body2" color="text.secondary">
                            Edit controllers in create dialog
                          </Typography>
                        ) : (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {getControllerDisplayValue(model.controllers).length > 0 ? (
                              getControllerDisplayValue(model.controllers).map(({ type, value }) => (
                                <Chip 
                                  key={type} 
                                  label={`${type}: ${value}`} 
                                  size="small" 
                                  color="primary" 
                                  variant="outlined" 
                                />
                              ))
                            ) : (
                              <Typography variant="body2" color="text.secondary">No controllers</Typography>
                            )}
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === model.id ? (
                          <TextField
                            size="small"
                            value={editForm.version}
                            onChange={(e) => setEditForm({ ...editForm, version: e.target.value })}
                            fullWidth
                            variant="outlined"
                            placeholder="e.g., 12.0"
                            sx={{ '& .MuiInputBase-root': { height: '32px' } }}
                          />
                        ) : (
                          model.version || 'N/A'
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === model.id ? (
                          <TextField
                            size="small"
                            value={editForm.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            fullWidth
                            variant="outlined"
                            sx={{ '& .MuiInputBase-root': { height: '32px' } }}
                          />
                        ) : (
                          model.description || 'N/A'
                        )}
                      </TableCell>
                      <TableCell align="center">
                        {editingId === model.id ? (
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={handleSaveEdit}
                              sx={{ p: 0.5 }}
                              disabled={submitting}
                            >
                              {submitting ? <CircularProgress size={16} /> : <SaveIcon fontSize="small" />}
                            </IconButton>
                            <IconButton
                              size="small"
                              color="secondary"
                              onClick={handleCancelEdit}
                              sx={{ p: 0.5 }}
                              disabled={submitting}
                            >
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        ) : (
                          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleEdit(model)}
                              sx={{ p: 0.5 }}
                              disabled={submitting}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(model.id)}
                              sx={{ p: 0.5 }}
                              disabled={submitting}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Create Model Dialog */}
      <CreateModelDialog
        open={openDialog}
        onClose={handleCloseDialog}
        onSubmit={handleAddNew}
        error={error}
      />

      {/* Success Message Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage(null)}
        message={successMessage}
      />
    </Box>
  );
};

export default Models; 
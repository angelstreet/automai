import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Memory as ModelIcon,
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  OutlinedInput,
  SelectChangeEvent,
  Checkbox,
  ListItemText,
  Grid,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import React, { useState } from 'react';
import { CreateModelDialog } from '../components/model';
import { useDeviceModels } from '../hooks/useDeviceModels';
import { Model } from '../types/model.types';

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

const Models: React.FC = () => {
  const {
    models,
    isLoading,
    error,
    createModel,
    updateModel,
    deleteModel,
    isCreating,
    isUpdating,
    isDeleting,
    createError,
    updateError,
    deleteError,
  } = useDeviceModels();

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
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleEdit = (model: Model) => {
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
      setLocalError('Name and at least one Type are required');
      return;
    }

    // Check for duplicate names (excluding current item)
    const isDuplicate = models.some(
      (m) => m.id !== editingId && m.name.toLowerCase() === editForm.name.toLowerCase().trim()
    );
    
    if (isDuplicate) {
      setLocalError('A model with this name already exists');
      return;
    }

    try {
      await updateModel({
        id: editingId,
        model: {
          name: editForm.name.trim(),
          types: editForm.types,
          controllers: editForm.controllers,
          version: editForm.version.trim(),
          description: editForm.description.trim(),
        }
      });
      
      setEditingId(null);
      setLocalError(null);
      setSuccessMessage('Device model updated successfully');
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Failed to update device model');
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
    setLocalError(null);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteModel(id);
      setSuccessMessage('Device model deleted successfully');
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Failed to delete device model');
    }
  };

  const handleAddNew = async (newModelData: Omit<Model, 'id'>) => {
    if (!newModelData.name.trim() || newModelData.types.length === 0) {
      setLocalError('Name and at least one Type are required');
      return;
    }

    // Check for duplicate names
    const isDuplicate = models.some(
      (m) => m.name.toLowerCase() === newModelData.name.toLowerCase().trim()
    );
    
    if (isDuplicate) {
      setLocalError('A model with this name already exists');
      return;
    }

    try {
      await createModel({
        name: newModelData.name.trim(),
        types: newModelData.types,
        controllers: newModelData.controllers,
        version: newModelData.version.trim(),
        description: newModelData.description.trim(),
      });
      
      setOpenDialog(false);
      setLocalError(null);
      setSuccessMessage('Device model created successfully');
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Failed to create device model');
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setLocalError(null);
  };

  const handleTypeChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setEditForm({
      ...editForm,
      types: typeof value === 'string' ? value.split(',') : value,
    });
  };

  // Helper function to get controller display names
  const getControllerDisplayValue = (controllers: Model['controllers']) => {
    const activeControllers = Object.entries(controllers)
      .filter(([_, value]) => value && value !== '')
      .map(([type, value]) => ({ type, value }));
    
    return activeControllers;
  };

  // Get the current error to display
  const displayError = localError || createError || updateError || deleteError || (error ? 'Failed to load device models' : null);

  // Loading state
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Loading device models...
        </Typography>
      </Box>
    );
  }

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
      <ModelIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
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
        disabled={isCreating}
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
          disabled={isCreating}
        >
          {isCreating ? 'Creating...' : 'Add Model'}
        </Button>
      </Box>

      {displayError && (
        <Alert severity="error" sx={{ mb: 1 }} onClose={() => setLocalError(null)}>
          {displayError}
        </Alert>
      )}

      <Card sx={{ boxShadow: 1 }}>
        <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
          {models.length === 0 ? (
            <EmptyState />
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ boxShadow: 'none' }}>
              <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.5, px: 1 } }}>
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
                    <TableRow key={model.id} sx={{ '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.08)' } }}>
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
                              disabled={isUpdating}
                            >
                              <SaveIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="secondary"
                              onClick={handleCancelEdit}
                              sx={{ p: 0.5 }}
                              disabled={isUpdating}
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
                              disabled={isUpdating || isDeleting}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(model.id)}
                              sx={{ p: 0.5 }}
                              disabled={isUpdating || isDeleting}
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
        error={localError}
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